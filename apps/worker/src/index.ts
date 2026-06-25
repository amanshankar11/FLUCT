import dotenv from 'dotenv';
import tls from 'node:tls';
import http from 'node:http';
import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import pg from 'pg';
import { applyCheck } from '@pulsewatch/core';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined
};
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
}) : null;

async function sendAlert(email: string | null, subject: string, text: string) {
  if (!email) return;
  if (!mailer) return console.log(`[email preview] ${email}: ${subject}\n${text}`);
  await mailer.sendMail({ from: process.env.ALERT_FROM, to: email, subject, text });
}

function certificateExpiry(target: string): Promise<Date | null> {
  const url=new URL(target);if(url.protocol!=='https:')return Promise.resolve(null);
  return new Promise(resolve=>{const socket=tls.connect({host:url.hostname,port:Number(url.port||443),servername:url.hostname,rejectUnauthorized:false,timeout:5000},()=>{const cert=socket.getPeerCertificate();socket.end();resolve(cert.valid_to?new Date(cert.valid_to):null)});socket.on('error',()=>resolve(null));socket.on('timeout',()=>{socket.destroy();resolve(null)})});
}

function incidentSeverity(statusCode: number | null, error: string | null, failures: number, threshold: number) {
  if (statusCode === null || /timeout|aborted|fetch failed|network|enotfound|econn/i.test(error ?? '')) return 'critical';
  if (statusCode >= 500 || failures >= threshold * 2) return 'major';
  return 'minor';
}

new Worker('checks', async (job) => {
  const client = await pool.connect();
  let inTransaction = false;
  try {
    const { rows } = await client.query('SELECT * FROM monitors WHERE id=$1 AND enabled=true', [job.data.monitorId]);
    const monitor = rows[0];
    if (!monitor) return;
    const maintenance=await client.query(`SELECT 1 FROM maintenance_windows WHERE monitor_id=$1 AND now() BETWEEN starts_at AND ends_at LIMIT 1`,[monitor.id]);
    if(maintenance.rowCount)return;

    const started = performance.now();
    let success = false;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;
    try {
      const response = await fetch(monitor.url, {
        method: monitor.method,
        headers: monitor.request_headers ?? {},
        body: ['GET', 'HEAD'].includes(monitor.method) ? undefined : monitor.request_body ?? undefined,
        redirect: 'follow',
        signal: AbortSignal.timeout(monitor.timeout_ms)
      });
      statusCode = response.status;
      success = statusCode === monitor.expected_status;
      if (!success) errorMessage = `Expected ${monitor.expected_status}, received ${statusCode}`;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Request failed';
    }

    const latencyMs = Math.round(performance.now() - started);
    const sslExpiry=await certificateExpiry(monitor.url);
    const transition = applyCheck({
      lastStatus: monitor.last_status,
      consecutiveFailures: monitor.consecutive_failures,
      failureThreshold: monitor.failure_threshold
    }, success);
    const severity = incidentSeverity(statusCode, errorMessage, transition.consecutiveFailures, monitor.failure_threshold);

    await client.query('BEGIN');
    inTransaction = true;
    await client.query('INSERT INTO checks(monitor_id,success,status_code,latency_ms,error) VALUES($1,$2,$3,$4,$5)',
      [monitor.id, success, statusCode, latencyMs, errorMessage]);
    await client.query('UPDATE monitors SET last_status=$1,consecutive_failures=$2,ssl_expires_at=coalesce($3,ssl_expires_at),updated_at=now() WHERE id=$4',
      [transition.status, transition.consecutiveFailures, sslExpiry, monitor.id]);
    if (transition.event === 'opened') {
      await client.query('INSERT INTO incidents(monitor_id,cause,severity) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [monitor.id, errorMessage, severity]);
    } else if (transition.event === 'resolved') {
      await client.query('UPDATE incidents SET resolved_at=now() WHERE monitor_id=$1 AND resolved_at IS NULL', [monitor.id]);
    } else if (!success && transition.status === 'down') {
      await client.query(`UPDATE incidents SET severity=$2 WHERE monitor_id=$1 AND resolved_at IS NULL
        AND array_position(ARRAY['minor','major','critical'],severity) < array_position(ARRAY['minor','major','critical'],$2::text)`, [monitor.id, severity]);
    }
    await client.query('COMMIT');
    inTransaction = false;

    if (transition.event === 'opened') await sendAlert(monitor.alert_email, `DOWN: ${monitor.name}`, `${monitor.url} is down. ${errorMessage ?? ''}`);
    if (transition.event === 'resolved') await sendAlert(monitor.alert_email, `RECOVERED: ${monitor.name}`, `${monitor.url} recovered in ${latencyMs} ms.`);
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}, { connection: redisConnection, concurrency: 20 });

console.log('FLUCT check worker started');


const port = Number(process.env.PORT ?? 3000);
http.createServer((_, res) => res.end('ok')).listen(port, () => {
  console.log(`Worker HTTP server listening on port ${port}`);
});