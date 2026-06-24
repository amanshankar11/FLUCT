import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import './styles.css';
import { DashboardPro, ForgotPassword, MonitorDetails, Profile, PublicStatus, ResetPassword } from './advanced';

type User = { id: string; name: string; email: string };
type Monitor = { id:string;name:string;url:string;status:'pending'|'up'|'down';intervalSeconds:number;averageLatency?:number;uptime?:number;method?:string;headers?:Record<string,string>;body?:string|null;timeoutMs?:number;expectedStatus?:number;failureThreshold?:number;alertEmail?:string|null;enabled?:boolean };
type Check = { success:boolean;statusCode:number|null;latencyMs:number;error:string|null;checkedAt:string };
type Incident = { id:string;monitorId:string;startedAt:string;resolvedAt:string|null;cause:string|null;acknowledgedAt:string|null;acknowledgedBy:string|null;durationSeconds:number };
type Summary = { total:number;up:number;down:number;uptime:number|null;averageLatency:number|null };
const API = 'http://localhost:4000/api';

function getToken() { return localStorage.getItem('fluct_token'); }
function duration(seconds:number){if(seconds<60)return `${seconds}s`;if(seconds<3600)return `${Math.floor(seconds/60)}m`;return `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}m`}

async function api(path: string, options: RequestInit = {}) {
  const token = getToken();
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
}

function BrandMark(){return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M6 17h6l2.5-5 4.5 10 3-6h4"/></svg></span>}
function Logo() { return <Link className="brand" to="/"><BrandMark/> FLUCT</Link>; }

function FeatureSignal({ type }: { type: 'steady'|'incident'|'recovery' }) {
  const paths = {
    steady: 'M0 28 L14 28 L18 22 L22 34 L26 28 L48 28 L52 22 L56 34 L60 28 L82 28 L86 22 L90 34 L94 28 L120 28',
    incident: 'M0 28 L20 28 L24 22 L28 34 L32 28 L43 28 L48 24 L53 32 L58 5 L63 50 L68 14 L72 28',
    recovery: 'M0 28 L20 28 L24 22 L28 34 L32 28 L43 28 L48 24 L53 32 L58 5 L63 50 L68 14 L72 28'
  };
  return <div className={`feature-signal ${type}`} aria-hidden="true"><svg viewBox="0 0 120 56" preserveAspectRatio="none"><path className="signal-base" d="M0 28 L120 28"/><path className="signal-trace" d={paths[type]}/>{type==='recovery'&&<path className="recovery-settle" d="M72 28 L80 28 L84 22 L88 34 L92 28 L100 28 L104 22 L108 34 L112 28 L120 28"/>}</svg><span/><span/><span/></div>;
}

function HeroWave() {
  const wave = 'M0,40 C25,10 75,10 100,40 C125,70 175,70 200,40 C225,10 275,10 300,40 C325,70 375,70 400,40 C425,10 475,10 500,40 C525,70 575,70 600,40 C625,10 675,10 700,40 C725,70 775,70 800,40 C825,10 875,10 900,40 C925,70 975,70 1000,40 C1025,10 1075,10 1100,40 C1125,70 1175,70 1200,40 C1225,10 1275,10 1300,40 C1325,70 1375,70 1400,40 C1425,10 1475,10 1500,40 C1525,70 1575,70 1600,40 C1625,10 1675,10 1700,40 C1725,70 1775,70 1800,40 C1825,10 1875,10 1900,40 C1925,70 1975,70 2000,40';
  return <div className="hero-wave" aria-hidden="true"><svg className="hero-wave-primary" viewBox="0 0 2000 80" preserveAspectRatio="none"><path d={wave}/></svg><svg className="hero-wave-secondary" viewBox="0 0 2000 80" preserveAspectRatio="none"><path d={wave}/></svg></div>;
}

function Landing() {
  return <div className="landing">
    <nav><Logo/><div className="nav-links"><a href="#features">Features</a><Link to="/login">Log in</Link><Link className="nav-cta" to="/register">Start monitoring</Link></div></nav>
    <main className="landing-main">
      <section className="landing-hero"><HeroWave/>
        <div className="hero-copy"><p className="eyebrow">API UPTIME, WITHOUT THE NOISE</p><h1>Catch every<br/><span>fluctuation.</span></h1><p className="lead">Know the moment your API slows down, goes dark, or comes back online. FLUCT keeps watch so you don't have to.</p><div className="hero-actions"><Link className="button lime" to="/register">Monitor your first API <b>→</b></Link><Link className="button ghost" to="/login">Log in</Link></div><p className="fine">Free to start · Set up in under a minute</p></div>
        <div className="status-card"><div className="status-head"><span>Live status</span><em>● ALL SYSTEMS OPERATIONAL</em></div><div className="fake-monitor"><span className="big-dot"/><div><b>Production API</b><small>api.yourproduct.com</small></div><strong>200</strong><span>124 ms</span></div><div className="chart"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="chart-labels"><span>24 hours ago</span><span>Now</span></div></div>
      </section>
      <section className="trust"><span>BUILT FOR RELIABLE TEAMS</span><div><b>30s</b><small>Fast checks</small></div><div><b>24/7</b><small>Always watching</small></div><div><b>∞</b><small>History retained</small></div></section>
      <section id="features" className="features"><p className="eyebrow">EVERYTHING YOU NEED</p><h2>See trouble before<br/>your users do.</h2><div className="feature-grid"><article><i>01</i><FeatureSignal type="steady"/><h3>Continuous checks</h3><p>Test your endpoints automatically on the schedule you choose.</p></article><article><i>02</i><FeatureSignal type="incident"/><h3>Incident detection</h3><p>Confirm failures before opening an incident, reducing false alarms.</p></article><article><i>03</i><FeatureSignal type="recovery"/><h3>Recovery alerts</h3><p>Know when an endpoint returns, with latency and status context.</p></article></div></section>
    </main>
    <footer><Logo/><span>API monitoring that catches every fluctuation.</span><span>© 2026 FLUCT</span></footer>
  </div>;
}

function AuthPage({ mode }: { mode: 'login'|'register' }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) return setError(typeof data.error === 'string' ? data.error : 'Please check your details.');
      localStorage.setItem('fluct_token', data.token);
      localStorage.setItem('fluct_user', JSON.stringify(data.user));
      window.location.assign('/dashboard');
    } catch { setError('Cannot reach the FLUCT API.'); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><Link className="auth-back" to="/" aria-label="Back to landing page">← <span>Back to home</span></Link><section className="auth-aside"><Logo/><div><p className="eyebrow">STAY AHEAD OF DOWNTIME</p><h1>Your APIs.<br/>Always in sight.</h1><p>Continuous checks, clear incidents, and a calm place to understand system health.</p></div><small>© 2026 FLUCT</small></section><section className="auth-panel"><div className="auth-box"><p className="eyebrow">{isRegister ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</p><h2>{isRegister ? 'Start monitoring.' : 'Log in to FLUCT.'}</h2><p>{isRegister ? 'Create your workspace in a few seconds.' : 'Your monitors have been waiting for you.'}</p><form onSubmit={submit}>{isRegister && <label>Full name<input autoFocus required minLength={2} placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}<label>Email address<input autoFocus={!isRegister} required type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Password<input required type="password" minLength={8} placeholder="At least 8 characters" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>{!isRegister&&<Link className="forgot-link" to="/forgot-password">Forgot password?</Link>}{error&&<p className="error">{error}</p>}<button className="primary" disabled={loading}>{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}</button></form><p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to FLUCT?'} <Link to={isRegister?'/login':'/register'}>{isRegister?'Log in':'Create an account'}</Link></p></div></section></main>;
}

function Dashboard({ logout }: { logout: () => void }) {
  const [monitors,setMonitors]=useState<Monitor[]>([]);
  const [form,setForm]=useState({name:'',url:'',intervalSeconds:60});
  const [error,setError]=useState('');
  const user: User | null = JSON.parse(localStorage.getItem('fluct_user') || 'null');
  const load=async()=>{try{const r=await api('/monitors');if(r.status===401)return logout();if(!r.ok)throw new Error();setMonitors(await r.json());setError('')}catch{setError('Cannot reach the FLUCT API.')}};
  useEffect(()=>{load();const id=setInterval(load,10000);return()=>clearInterval(id)},[]);
  async function create(e:React.FormEvent){e.preventDefault();setError('');const r=await api('/monitors',{method:'POST',body:JSON.stringify(form)});if(!r.ok)return setError('Enter a valid name and HTTP(S) URL.');setForm({name:'',url:'',intervalSeconds:60});load()}
  async function remove(id:string){await api(`/monitors/${id}`,{method:'DELETE'});load()}
  const up=monitors.filter(m=>m.status==='up').length,down=monitors.filter(m=>m.status==='down').length;
  return <main className="dashboard"><header><Logo/><div className="account"><span><b>{user?.name}</b><small>{user?.email}</small></span><button onClick={logout}>Log out</button></div></header><section className="hero"><p className="eyebrow">SYSTEM OVERVIEW</p><h1>Know when your APIs<br/>miss a beat.</h1><p>Fast endpoint monitoring with incident detection and recovery alerts.</p></section><section className="stats"><article><span>Total monitors</span><strong>{monitors.length}</strong></article><article><span>Operational</span><strong className="green">{up}</strong></article><article><span>Down</span><strong className="red">{down}</strong></article></section><section className="grid"><div><div className="title"><h2>Monitors</h2><span>{monitors.length} endpoints</span></div><div className="list">{monitors.length===0?<div className="empty">No monitors yet. Add your first endpoint →</div>:monitors.map(m=><article className="monitor" key={m.id}><span className={`dot ${m.status}`}/><div><b>{m.name}</b><small>{m.url}</small></div><em className={m.status}>{m.status}</em><span className="interval">every {m.intervalSeconds}s</span><button onClick={()=>remove(m.id)}>×</button></article>)}</div></div><aside><p className="eyebrow">NEW MONITOR</p><h2>Watch an endpoint</h2><form onSubmit={create}><label>Name<input required placeholder="Production API" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Endpoint URL<input required type="url" placeholder="https://api.example.com/health" value={form.url} onChange={e=>setForm({...form,url:e.target.value})}/></label><label>Check interval<select value={form.intervalSeconds} onChange={e=>setForm({...form,intervalSeconds:Number(e.target.value)})}><option value="30">30 seconds</option><option value="60">1 minute</option><option value="300">5 minutes</option></select></label>{error&&<p className="error">{error}</p>}<button className="primary">Start monitoring</button></form></aside></section></main>;
}

function App(){
  const [authenticated,setAuthenticated]=useState(Boolean(getToken()));
  function logout(){localStorage.removeItem('fluct_token');localStorage.removeItem('fluct_user');setAuthenticated(false)}
  useEffect(()=>{const listener=()=>setAuthenticated(Boolean(getToken()));window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener)},[]);
  return <Routes><Route path="/" element={<Landing/>}/><Route path="/login" element={authenticated?<Navigate to="/dashboard"/>:<AuthPage mode="login"/>}/><Route path="/register" element={authenticated?<Navigate to="/dashboard"/>:<AuthPage mode="register"/>}/><Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/reset-password" element={<ResetPassword/>}/><Route path="/status/:slug" element={<PublicStatus/>}/><Route path="/dashboard" element={authenticated?<DashboardPro logout={logout}/>:<Navigate to="/login"/>}/><Route path="/monitors/:id" element={authenticated?<MonitorDetails/>:<Navigate to="/login"/>}/><Route path="/profile" element={authenticated?<Profile/>:<Navigate to="/login"/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>);
