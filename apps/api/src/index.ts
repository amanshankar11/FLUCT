import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { Queue } from 'bullmq';
import pg from 'pg';
import { z } from 'zod';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
// const redisConnection = {
//   host: redisUrl.hostname,
//   port: Number(redisUrl.port || 6379),
//   username: redisUrl.username || undefined,
//   password: redisUrl.password || undefined
// };
const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined
};
const queue = new Queue('checks', { connection: redisConnection });
const app = express();
const jwtSecret = process.env.JWT_SECRET;
const passwordMailer=process.env.SMTP_HOST?nodemailer.createTransport({
  host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT??587),secure:Number(process.env.SMTP_PORT)===465,
  auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined
}):null;

if (!jwtSecret) throw new Error('JWT_SECRET is required');

app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

type AuthRequest = express.Request & { userId?: string; authType?: 'session'|'apiKey' };

function createToken(user: { id: string; name: string; email: string }) {
  return jwt.sign({ name: user.name, email: user.email }, jwtSecret!, { subject: user.id, expiresIn: '7d' });
}

function requireSession(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, jwtSecret!) as jwt.JwtPayload;
    if (!payload.sub) throw new Error('Invalid token');
    req.userId = payload.sub;
    req.authType = 'session';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

async function requireAuth(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):null;
  if(!token)return res.status(401).json({error:'Authentication required'});
  if(!token.startsWith('fluct_'))return requireSession(req,res,next);
  try{
    const hash=createHash('sha256').update(token).digest('hex');
    const result=await pool.query(`SELECT id,user_id FROM api_keys WHERE key_hash=$1 AND revoked_at IS NULL`,[hash]);
    if(!result.rowCount)return res.status(401).json({error:'Invalid or revoked API key'});
    req.userId=result.rows[0].user_id;req.authType='apiKey';
    await pool.query(`UPDATE api_keys SET last_used_at=now() WHERE id=$1 AND (last_used_at IS NULL OR last_used_at<now()-interval '5 minutes')`,[result.rows[0].id]);
    next();
  }catch(error){next(error);}
}

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72)
});

const passwordSchema = z.string().min(8).max(72);
const resetHash = (token: string) => createHash('sha256').update(token).digest('hex');

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const data = credentialsSchema.extend({ name: z.string().trim().min(2).max(80) }).parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const result = await pool.query(
      'INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email',
      [data.name, data.email, passwordHash]
    );
    const user = result.rows[0];
    await pool.query(`UPDATE monitors SET user_id=$1
      WHERE user_id IS NULL AND (SELECT count(*) FROM users)=1`, [user.id]);
    res.status(201).json({ token: createToken(user), user });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const data = credentialsSchema.parse(req.body);
    const result = await pool.query('SELECT id,name,email,password_hash FROM users WHERE email=$1', [data.email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    res.json({ token: createToken(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) { next(error); }
});

app.post('/api/auth/forgot-password', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email().transform(value => value.toLowerCase()) }).parse(req.body);
    const result = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    let resetToken: string | undefined;
    if (result.rowCount) {
      resetToken = randomBytes(32).toString('hex');
      await pool.query(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
        VALUES($1,$2,now()+interval '30 minutes')`, [result.rows[0].id, resetHash(resetToken)]);
      const resetUrl=`${process.env.WEB_ORIGIN??'http://localhost:5173'}/reset-password?token=${resetToken}`;
      if(passwordMailer){
        await passwordMailer.sendMail({from:process.env.ALERT_FROM??'FLUCT <no-reply@fluct.local>',to:email,subject:'Reset your FLUCT password',text:`A password reset was requested for your FLUCT account.\n\nReset it here: ${resetUrl}\n\nThis link expires in 30 minutes and can only be used once. If you did not request this, ignore this email.`});
      }else console.log(`FLUCT password reset: ${resetUrl}`);
    }
    res.json({ message: 'If that account exists, a reset link has been sent to its email address.', ...(process.env.NODE_ENV !== 'production' && resetToken ? { resetToken } : {}) });
  } catch (error) { next(error); }
});

app.post('/api/auth/reset-password', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const data = z.object({ token: z.string().min(20), password: passwordSchema }).parse(req.body);
    await client.query('BEGIN');
    const result = await client.query(`SELECT id,user_id FROM password_reset_tokens
      WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE`, [resetHash(data.token)]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'This reset link is invalid or expired' }); }
    await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(data.password, 12), result.rows[0].user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE id=$1', [result.rows[0].id]);
    await client.query('COMMIT');
    res.json({ message: 'Password updated successfully' });
  } catch (error) { await client.query('ROLLBACK').catch(()=>undefined); next(error); }
  finally { client.release(); }
});

app.get('/api/auth/me', requireSession, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query('SELECT id,name,email,phone_country_code AS "phoneCountryCode",phone_number AS "phoneNumber" FROM users WHERE id=$1', [req.userId]);
    if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

app.patch('/api/auth/me', requireSession, async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().email().transform(v=>v.toLowerCase()),
      phoneCountryCode: z.string().regex(/^\+\d{1,4}$/).nullable().optional(),
      phoneNumber: z.string().trim().regex(/^[0-9 ()-]{4,24}$/).nullable().optional()
    }).parse(req.body);
    const phoneNumber=data.phoneNumber||null;
    const phoneCountryCode=phoneNumber?(data.phoneCountryCode||null):null;
    if(phoneNumber&&!phoneCountryCode)return res.status(400).json({error:'Select a country code for the phone number'});
    const result = await pool.query(`UPDATE users SET name=$1,email=$2,phone_country_code=$3,phone_number=$4 WHERE id=$5
      RETURNING id,name,email,phone_country_code AS "phoneCountryCode",phone_number AS "phoneNumber"`, [data.name,data.email,phoneCountryCode,phoneNumber,req.userId]);
    res.json({ user: result.rows[0], token: createToken(result.rows[0]) });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    next(error);
  }
});

app.post('/api/auth/change-password', requireSession, async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({ currentPassword: z.string(), newPassword: passwordSchema }).parse(req.body);
    const result = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.userId]);
    if (!result.rowCount || !(await bcrypt.compare(data.currentPassword,result.rows[0].password_hash))) return res.status(400).json({ error: 'Current password is incorrect' });
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(data.newPassword,12),req.userId]);
    res.json({ message: 'Password changed' });
  } catch (error) { next(error); }
});

app.delete('/api/auth/me', requireSession, async (req: AuthRequest, res, next) => {
  try {
    const data=z.object({currentPassword:z.string().min(1)}).parse(req.body);
    const result=await pool.query('SELECT password_hash FROM users WHERE id=$1',[req.userId]);
    if(!result.rowCount||!(await bcrypt.compare(data.currentPassword,result.rows[0].password_hash))) return res.status(400).json({error:'Current password is incorrect'});
    const monitors=await pool.query('SELECT id FROM monitors WHERE user_id=$1',[req.userId]);
    await pool.query('DELETE FROM users WHERE id=$1',[req.userId]);
    await Promise.allSettled(monitors.rows.map(row=>queue.removeJobScheduler(`monitor:${row.id}`)));
    res.status(204).end();
  } catch(error){next(error);}
});

app.get('/api/auth/api-keys', requireSession, async (req: AuthRequest,res,next)=>{
  try{
    const result=await pool.query(`SELECT id,name,key_prefix AS "keyPrefix",last_used_at AS "lastUsedAt",created_at AS "createdAt"
      FROM api_keys WHERE user_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC`,[req.userId]);
    res.json(result.rows);
  }catch(error){next(error);}
});

app.post('/api/auth/api-keys', requireSession, async (req: AuthRequest,res,next)=>{
  try{
    const {name}=z.object({name:z.string().trim().min(2).max(60)}).parse(req.body);
    const count=await pool.query('SELECT count(*)::int AS count FROM api_keys WHERE user_id=$1 AND revoked_at IS NULL',[req.userId]);
    if(count.rows[0].count>=10)return res.status(400).json({error:'Revoke an existing key before creating another (10 key limit)'});
    const secret=`fluct_${randomBytes(32).toString('base64url')}`;
    const keyPrefix=`${secret.slice(0,14)}…`;
    const keyHash=createHash('sha256').update(secret).digest('hex');
    const result=await pool.query(`INSERT INTO api_keys(user_id,name,key_prefix,key_hash) VALUES($1,$2,$3,$4)
      RETURNING id,name,key_prefix AS "keyPrefix",created_at AS "createdAt"`,[req.userId,name,keyPrefix,keyHash]);
    res.status(201).json({...result.rows[0],key:secret});
  }catch(error){next(error);}
});

app.delete('/api/auth/api-keys/:id', requireSession, async (req: AuthRequest,res,next)=>{
  try{
    const id=z.string().uuid().parse(req.params.id);
    const result=await pool.query('UPDATE api_keys SET revoked_at=now() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL',[id,req.userId]);
    res.status(result.rowCount?204:404).end();
  }catch(error){next(error);}
});

const monitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().refine((url) => ['http:', 'https:'].includes(new URL(url).protocol), 'HTTP(S) URL required'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).default('GET'),
  headers: z.record(z.string()).default({}),
  body: z.string().max(100000).nullable().optional(),
  intervalSeconds: z.number().int().min(10).max(86400).default(60),
  timeoutMs: z.number().int().min(100).max(60000).default(10000),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  failureThreshold: z.number().int().min(1).max(10).default(2),
  alertEmail: z.string().email().nullable().optional(),
  enabled: z.boolean().default(true),
  slaTarget: z.number().min(0).max(100).default(99.9),
  publicEnabled: z.boolean().default(false)
});

function publicSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'monitor';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

async function scheduleMonitor(id: string, intervalSeconds: number) {
  await queue.upsertJobScheduler(`monitor:${id}`, { every: intervalSeconds * 1000 }, { name: 'check', data: { monitorId: id } });
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/monitors', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(`SELECT id, name, url, method, interval_seconds AS "intervalSeconds",
      timeout_ms AS "timeoutMs", expected_status AS "expectedStatus", failure_threshold AS "failureThreshold",
      alert_email AS "alertEmail",enabled,last_status AS status,created_at AS "createdAt",
      sla_target::float AS "slaTarget",ssl_expires_at AS "sslExpiresAt",public_enabled AS "publicEnabled",public_slug AS "publicSlug",
      (SELECT round(avg(c.latency_ms))::int FROM checks c WHERE c.monitor_id=monitors.id AND c.checked_at>now()-interval '24 hours') AS "averageLatency",
      (SELECT round(100.0*avg(c.success::int),2) FROM checks c WHERE c.monitor_id=monitors.id AND c.checked_at>now()-interval '24 hours') AS "uptime"
      FROM monitors WHERE user_id=$1 ORDER BY created_at DESC`, [req.userId]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.post('/api/monitors', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = monitorSchema.parse(req.body);
    const result = await pool.query(`INSERT INTO monitors
      (user_id,name,url,method,request_headers,request_body,interval_seconds,timeout_ms,expected_status,failure_threshold,alert_email,enabled,sla_target,public_enabled,public_slug)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [req.userId,data.name,data.url,data.method,data.headers,data.body??null,data.intervalSeconds,data.timeoutMs,data.expectedStatus,data.failureThreshold,data.alertEmail??null,data.enabled,data.slaTarget,data.publicEnabled,publicSlug(data.name)]);
    if (data.enabled) await scheduleMonitor(result.rows[0].id, data.intervalSeconds);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

app.get('/api/monitors/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(`SELECT m.id,m.name,m.url,m.method,m.request_headers AS headers,m.request_body AS body,
      m.interval_seconds AS "intervalSeconds",m.timeout_ms AS "timeoutMs",m.expected_status AS "expectedStatus",
      m.failure_threshold AS "failureThreshold",m.alert_email AS "alertEmail",m.enabled,m.last_status AS status,
      m.sla_target::float AS "slaTarget",m.ssl_expires_at AS "sslExpiresAt",m.public_enabled AS "publicEnabled",m.public_slug AS "publicSlug",
      m.created_at AS "createdAt", count(c.id)::int AS "checkCount",
      round(avg(c.latency_ms))::int AS "averageLatency",round(100.0*avg(c.success::int),2) AS uptime
      FROM monitors m LEFT JOIN checks c ON c.monitor_id=m.id WHERE m.id=$1 AND m.user_id=$2 GROUP BY m.id`, [req.params.id,req.userId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Monitor not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

app.patch('/api/monitors/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const current = await pool.query('SELECT * FROM monitors WHERE id=$1 AND user_id=$2', [req.params.id,req.userId]);
    if (!current.rowCount) return res.status(404).json({ error: 'Monitor not found' });
    const row=current.rows[0];
    const data=monitorSchema.parse({name:row.name,url:row.url,method:row.method,headers:row.request_headers,body:row.request_body,intervalSeconds:row.interval_seconds,timeoutMs:row.timeout_ms,expectedStatus:row.expected_status,failureThreshold:row.failure_threshold,alertEmail:row.alert_email,enabled:row.enabled,slaTarget:Number(row.sla_target),publicEnabled:row.public_enabled,...req.body});
    const result = await pool.query(`UPDATE monitors SET name=$1,url=$2,method=$3,request_headers=$4,request_body=$5,
      interval_seconds=$6,timeout_ms=$7,expected_status=$8,failure_threshold=$9,alert_email=$10,enabled=$11,
      sla_target=$12,public_enabled=$13,public_slug=coalesce(public_slug,$14),updated_at=now()
      WHERE id=$15 AND user_id=$16 RETURNING *`,[data.name,data.url,data.method,data.headers,data.body??null,data.intervalSeconds,data.timeoutMs,data.expectedStatus,data.failureThreshold,data.alertEmail??null,data.enabled,data.slaTarget,data.publicEnabled,publicSlug(data.name),req.params.id,req.userId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Monitor not found' });
    if (data.enabled) await scheduleMonitor(String(req.params.id),data.intervalSeconds); else await queue.removeJobScheduler(`monitor:${req.params.id}`);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

app.delete('/api/monitors/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query('DELETE FROM monitors WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    if (result.rowCount) await queue.removeJobScheduler(`monitor:${req.params.id}`);
    res.status(result.rowCount ? 204 : 404).end();
  } catch (error) { next(error); }
});

app.get('/api/monitors/:id/checks', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const ranges: Record<string,string> = { '1h':'1 hour', '24h':'24 hours', '7d':'7 days' };
    const interval = ranges[String(req.query.range)] ?? ranges['1h'];
    const result = await pool.query(`WITH ranked AS (
      SELECT c.success,c.status_code,c.latency_ms,c.error,c.checked_at,
        row_number() OVER (ORDER BY c.checked_at) AS row_number,
        count(*) OVER () AS total
      FROM checks c JOIN monitors m ON m.id=c.monitor_id
      WHERE c.monitor_id=$1 AND m.user_id=$2 AND c.checked_at >= now()-$3::interval
    )
    SELECT success,status_code AS "statusCode",latency_ms AS "latencyMs",error,checked_at AS "checkedAt"
    FROM ranked WHERE total<=600 OR row_number=1 OR row_number=total
      OR mod(row_number-1,greatest(1,ceil(total/600.0)::int))=0
    ORDER BY checked_at`, [req.params.id, req.userId, interval]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.get('/api/monitors/:id/checks.csv', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result=await pool.query(`SELECT c.checked_at,c.success,c.status_code,c.latency_ms,c.error FROM checks c
      JOIN monitors m ON m.id=c.monitor_id WHERE c.monitor_id=$1 AND m.user_id=$2 ORDER BY c.checked_at DESC LIMIT 10000`,[req.params.id,req.userId]);
    const cell=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;
    const csv=['checked_at,success,status_code,latency_ms,error',...result.rows.map(row=>[row.checked_at.toISOString(),row.success,row.status_code,row.latency_ms,row.error].map(cell).join(','))].join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="fluct-checks-${req.params.id}.csv"`);res.send(csv);
  } catch(error){next(error);}
});

app.get('/api/monitors/:id/maintenance', requireAuth, async (req: AuthRequest, res, next) => {
  try { const result=await pool.query(`SELECT w.id,w.starts_at AS "startsAt",w.ends_at AS "endsAt",w.reason
    FROM maintenance_windows w JOIN monitors m ON m.id=w.monitor_id WHERE w.monitor_id=$1 AND m.user_id=$2 ORDER BY w.starts_at DESC`,[req.params.id,req.userId]);res.json(result.rows); }
  catch(error){next(error);}
});

app.post('/api/monitors/:id/maintenance', requireAuth, async (req: AuthRequest, res, next) => {
  try { const data=z.object({startsAt:z.string().datetime(),endsAt:z.string().datetime(),reason:z.string().trim().max(300).optional()}).refine(v=>new Date(v.endsAt)>new Date(v.startsAt),{message:'End must be after start'}).parse(req.body);
    const result=await pool.query(`INSERT INTO maintenance_windows(monitor_id,starts_at,ends_at,reason)
      SELECT m.id,$3,$4,$5 FROM monitors m WHERE m.id=$1 AND m.user_id=$2 RETURNING *`,[req.params.id,req.userId,data.startsAt,data.endsAt,data.reason??null]);
    if(!result.rowCount)return res.status(404).json({error:'Monitor not found'});res.status(201).json(result.rows[0]); }
  catch(error){next(error);}
});

app.delete('/api/maintenance/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try { const result=await pool.query(`DELETE FROM maintenance_windows w USING monitors m
    WHERE w.monitor_id=m.id AND w.id=$1 AND m.user_id=$2`,[req.params.id,req.userId]);res.status(result.rowCount?204:404).end(); }
  catch(error){next(error);}
});

app.get('/api/public/status/:slug', async (req,res,next) => {
  try { const result=await pool.query(`SELECT m.name,m.last_status AS status,m.sla_target::float AS "slaTarget",m.ssl_expires_at AS "sslExpiresAt",
      round(100.0*avg(c.success::int),2) AS uptime,round(avg(c.latency_ms))::int AS "averageLatency",
      EXISTS(SELECT 1 FROM maintenance_windows w WHERE w.monitor_id=m.id AND now() BETWEEN w.starts_at AND w.ends_at) AS maintenance
      FROM monitors m LEFT JOIN checks c ON c.monitor_id=m.id AND c.checked_at>now()-interval '30 days'
      WHERE m.public_slug=$1 AND m.public_enabled=true GROUP BY m.id`,[req.params.slug]);
    if(!result.rowCount)return res.status(404).json({error:'Status page not found'});
    const incidents=await pool.query(`SELECT i.started_at AS "startedAt",i.resolved_at AS "resolvedAt",i.cause,i.severity FROM incidents i
      JOIN monitors m ON m.id=i.monitor_id WHERE m.public_slug=$1 AND m.public_enabled=true ORDER BY i.started_at DESC LIMIT 10`,[req.params.slug]);
    res.json({...result.rows[0],incidents:incidents.rows}); }
  catch(error){next(error);}
});

app.get('/api/incidents', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(`SELECT i.id,i.monitor_id AS "monitorId",i.started_at AS "startedAt",i.resolved_at AS "resolvedAt",i.cause,i.severity,
      i.acknowledged_at AS "acknowledgedAt",u.name AS "acknowledgedBy",
      extract(epoch FROM (coalesce(i.resolved_at,now())-i.started_at))::int AS "durationSeconds",
      m.name AS "monitorName", m.url FROM incidents i JOIN monitors m ON m.id=i.monitor_id LEFT JOIN users u ON u.id=i.acknowledged_by
      WHERE m.user_id=$1 ORDER BY i.started_at DESC LIMIT 100`, [req.userId]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.get('/api/incidents/:id/notes', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result=await pool.query(`SELECT n.id,n.note,n.created_at AS "createdAt",u.name AS "authorName"
      FROM incident_notes n JOIN incidents i ON i.id=n.incident_id JOIN monitors m ON m.id=i.monitor_id
      LEFT JOIN users u ON u.id=n.user_id WHERE n.incident_id=$1 AND m.user_id=$2 ORDER BY n.created_at`,[req.params.id,req.userId]);
    res.json(result.rows);
  } catch(error){next(error);}
});

app.post('/api/incidents/:id/notes', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const {note}=z.object({note:z.string().trim().min(1).max(2000)}).parse(req.body);
    const result=await pool.query(`INSERT INTO incident_notes(incident_id,user_id,note)
      SELECT i.id,$2,$3 FROM incidents i JOIN monitors m ON m.id=i.monitor_id WHERE i.id=$1 AND m.user_id=$2 RETURNING *`,[req.params.id,req.userId,note]);
    if(!result.rowCount)return res.status(404).json({error:'Incident not found'});res.status(201).json(result.rows[0]);
  }catch(error){next(error);}
});

app.post('/api/incidents/:id/acknowledge', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result=await pool.query(`UPDATE incidents i SET acknowledged_at=coalesce(i.acknowledged_at,now()),acknowledged_by=$2
      FROM monitors m WHERE i.monitor_id=m.id AND i.id=$1 AND m.user_id=$2 RETURNING i.*`,[req.params.id,req.userId]);
    if(!result.rowCount)return res.status(404).json({error:'Incident not found'});res.json(result.rows[0]);
  }catch(error){next(error);}
});

app.post('/api/incidents/:id/resolve', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result=await pool.query(`UPDATE incidents i SET resolved_at=coalesce(i.resolved_at,now())
      FROM monitors m WHERE i.monitor_id=m.id AND i.id=$1 AND m.user_id=$2 RETURNING i.*`,[req.params.id,req.userId]);
    if(!result.rowCount)return res.status(404).json({error:'Incident not found'});res.json(result.rows[0]);
  }catch(error){next(error);}
});

app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(`SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE enabled=true AND last_status='up')::int AS up,
      count(*) FILTER (WHERE enabled=true AND last_status='down')::int AS down,
      (SELECT round(100.0*avg(c.success::int),2) FROM checks c JOIN monitors cm ON cm.id=c.monitor_id WHERE cm.user_id=$1 AND c.checked_at>now()-interval '24 hours') AS uptime,
      (SELECT round(avg(c.latency_ms))::int FROM checks c JOIN monitors cm ON cm.id=c.monitor_id WHERE cm.user_id=$1 AND c.checked_at>now()-interval '24 hours') AS "averageLatency"
      FROM monitors WHERE user_id=$1`, [req.userId]);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, async () => {
  const { rows } = await pool.query('SELECT id, interval_seconds FROM monitors WHERE enabled=true');
  await Promise.all(rows.map((row) => scheduleMonitor(row.id, row.interval_seconds)));
  console.log(`FLUCT API listening on http://localhost:${port}`);
});
