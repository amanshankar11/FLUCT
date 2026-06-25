// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
// import { COUNTRY_CODES } from "./countryCodes";

// type Monitor = {
//   id: string;
//   name: string;
//   url: string;
//   status: "pending" | "up" | "down";
//   intervalSeconds: number;
//   averageLatency?: number;
//   uptime?: number;
//   method?: string;
//   headers?: Record<string, string>;
//   body?: string | null;
//   timeoutMs?: number;
//   expectedStatus?: number;
//   failureThreshold?: number;
//   alertEmail?: string | null;
//   enabled?: boolean;
//   slaTarget?: number;
//   sslExpiresAt?: string | null;
//   publicEnabled?: boolean;
//   publicSlug?: string | null;
//   checkCount?: number;
// };
// type Check = {
//   success: boolean;
//   statusCode: number | null;
//   latencyMs: number;
//   error: string | null;
//   checkedAt: string;
// };
// type TimeRange = "1h" | "24h" | "7d";
// type Incident = {
//   id: string;
//   monitorId: string;
//   startedAt: string;
//   resolvedAt: string | null;
//   cause: string | null;
//   severity: "minor" | "major" | "critical";
//   acknowledgedAt: string | null;
//   acknowledgedBy: string | null;
//   durationSeconds: number;
// };
// type Summary = {
//   total: number;
//   up: number;
//   down: number;
//   uptime: number | null;
//   averageLatency: number | null;
// };
// type User = { id: string; name: string; email: string; phoneCountryCode?: string | null; phoneNumber?: string | null };
// type ApiKey = { id:string;name:string;keyPrefix:string;createdAt:string;lastUsedAt?:string|null };
// type MaintenanceWindow = { id:string;startsAt:string;endsAt:string;reason:string|null };
// const API = "http://localhost:4000/api";
// const auth = () => ({
//   Authorization: `Bearer ${localStorage.getItem("fluct_token")}`,
// });
// async function request(path: string, options: RequestInit = {}) {
//   return fetch(`${API}${path}`, {
//     ...options,
//     headers: {
//       ...auth(),
//       ...(options.body ? { "Content-Type": "application/json" } : {}),
//       ...options.headers,
//     },
//   });
// }
// function BrandMark(){return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M6 17h6l2.5-5 4.5 10 3-6h4"/></svg></span>}
// function Logo() {
//   return (
//     <>
//       <Link className="brand" to="/">
//         <BrandMark/> FLUCT
//       </Link>
//       {window.location.pathname === "/dashboard" && <AccountMenu />}
//     </>
//   );
// }
// function AccountMenu() {
//   const [open, setOpen] = useState(false),
//     [dark, setDark] = useState(localStorage.getItem("fluct_theme") === "dark");
//   const menuRef = useRef<HTMLDivElement>(null);
//   const user: User | null = JSON.parse(
//     localStorage.getItem("fluct_user") || "null",
//   );
//   const initial = user?.name?.trim().charAt(0).toUpperCase() || "U";
//   useEffect(() => {
//     if (!open) return;
//     function outside(event: MouseEvent) {
//       if (menuRef.current && !menuRef.current.contains(event.target as Node))
//         setOpen(false);
//     }
//     function escape(event: KeyboardEvent) {
//       if (event.key === "Escape") setOpen(false);
//     }
//     document.addEventListener("mousedown", outside);
//     document.addEventListener("keydown", escape);
//     return () => {
//       document.removeEventListener("mousedown", outside);
//       document.removeEventListener("keydown", escape);
//     };
//   }, [open]);
//   function theme() {
//     const next = !dark;
//     setDark(next);
//     localStorage.setItem("fluct_theme", next ? "dark" : "light");
//     document.documentElement.classList.toggle("dark", next);
//   }
//   function logout() {
//     localStorage.removeItem("fluct_token");
//     localStorage.removeItem("fluct_user");
//     window.location.assign("/login");
//   }
//   return (
//     <div className="avatar-menu" ref={menuRef}>
//       <button
//         className="avatar-trigger"
//         aria-label="Open user menu"
//         aria-expanded={open}
//         onClick={() => setOpen(!open)}
//       >
//         {initial}
//       </button>
//       {open && (
//         <div className="avatar-popover">
//           <div className="avatar-identity">
//             <span>{initial}</span>
//             <div>
//               <b>{user?.name}</b>
//               <small>{user?.email}</small>
//             </div>
//           </div>
//           <Link to="/profile">
//             <i>♙</i> Profile settings
//           </Link>
//           <button onClick={theme}>
//             <i>{dark ? "☀" : "☾"}</i> {dark ? "Light mode" : "Dark mode"}
//           </button>
//           <button className="avatar-logout" onClick={logout}>
//             <i>↪</i> Log out
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
// function time(value: string) {
//   return new Date(value).toLocaleString();
// }
// function duration(seconds: number) {
//   if (seconds < 60) return `${seconds}s`;
//   if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
//   return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
// }
// function LatencyBadge({ ms }: { ms: number | null | undefined }) {
//   if (ms === null || ms === undefined) return null;
//   const band = latencyBand(ms);
//   return <span className={`latency-badge ${band.tone}`}>{band.label}</span>;
// }
// function latencyBand(ms: number) {
//   return (
//     ms < 200
//       ? { label: "Fast", tone: "fast" }
//       : ms < 500
//         ? { label: "Average", tone: "average" }
//         : ms < 1000
//           ? { label: "Slow", tone: "slow" }
//           : { label: "Very slow", tone: "very-slow" }
//   );
// }

// export function DashboardPro({ logout }: { logout: () => void }) {
//   const [monitors, setMonitors] = useState<Monitor[]>([]),
//     [summary, setSummary] = useState<Summary>({
//       total: 0,
//       up: 0,
//       down: 0,
//       uptime: null,
//       averageLatency: null,
//     });
//   const [form, setForm] = useState({ name: "", url: "", intervalSeconds: 60 }),
//     [error, setError] = useState(""),
//     [query, setQuery] = useState(""),
//     [status, setStatus] = useState("all"),
//     [sort, setSort] = useState("newest");
//   const user: User | null = JSON.parse(
//     localStorage.getItem("fluct_user") || "null",
//   );
//   const [dark, setDark] = useState(
//     localStorage.getItem("fluct_theme") === "dark",
//   );
//   function toggleTheme() {
//     const next = !dark;
//     setDark(next);
//     localStorage.setItem("fluct_theme", next ? "dark" : "light");
//     document.documentElement.classList.toggle("dark", next);
//   }
//   useEffect(() => {
//     document.documentElement.classList.toggle("dark", dark);
//   }, []);
//   async function load() {
//     try {
//       const [m, s] = await Promise.all([
//         request("/monitors"),
//         request("/dashboard"),
//       ]);
//       if (m.status === 401) return logout();
//       setMonitors(await m.json());
//       setSummary(await s.json());
//       setError("");
//     } catch {
//       setError("Cannot reach the FLUCT API.");
//     }
//   }
//   useEffect(() => {
//     load();
//     const id = setInterval(load, 10000);
//     return () => clearInterval(id);
//   }, []);
//   const shown = useMemo(
//     () =>
//       monitors
//         .filter(
//           (m) =>
//             (status === "all" || (status === "paused" ? !m.enabled : m.enabled !== false && m.status === status)) &&
//             (m.name.toLowerCase().includes(query.toLowerCase()) ||
//               m.url.toLowerCase().includes(query.toLowerCase())),
//         )
//         .sort((a, b) =>
//           sort === "name"
//             ? a.name.localeCompare(b.name)
//             : sort === "latency"
//               ? (b.averageLatency ?? 0) - (a.averageLatency ?? 0)
//               : 0,
//         ),
//     [monitors, query, status, sort],
//   );
//   const warnings = useMemo(() => monitors.flatMap((monitor) => {
//     if (monitor.enabled === false) return [];
//     const result: { key:string; tone:"warning"|"critical"; title:string; detail:string; monitorId:string }[] = [];
//     const uptime = monitor.uptime == null ? null : Number(monitor.uptime);
//     const target = Number(monitor.slaTarget ?? 99.9);
//     if (uptime !== null && uptime < target) result.push({key:`sla-${monitor.id}`,tone:target-uptime>=1?"critical":"warning",title:`${monitor.name} is below SLA`,detail:`${uptime}% uptime against a ${target}% target`,monitorId:monitor.id});
//     if (monitor.sslExpiresAt) {
//       const days = Math.ceil((new Date(monitor.sslExpiresAt).getTime()-Date.now())/86400000);
//       if (days <= 30) result.push({key:`ssl-${monitor.id}`,tone:days<=14?"critical":"warning",title:`${monitor.name} certificate ${days<=0?"has expired":"expires soon"}`,detail:days<=0?"HTTPS may no longer be trusted":`${days} day${days===1?"":"s"} remaining`,monitorId:monitor.id});
//     }
//     return result;
//   }), [monitors]);
//   async function create(e: React.FormEvent) {
//     e.preventDefault();
//     const r = await request("/monitors", {
//       method: "POST",
//       body: JSON.stringify(form),
//     });
//     if (!r.ok) return setError("Enter a valid name and HTTP(S) URL.");
//     setForm({ name: "", url: "", intervalSeconds: 60 });
//     load();
//   }
//   async function remove(id: string) {
//     if (!confirm("Delete this monitor and all of its history?")) return;
//     await request(`/monitors/${id}`, { method: "DELETE" });
//     load();
//   }
//   async function toggleMonitor(monitor: Monitor) {
//     const response = await request(`/monitors/${monitor.id}`, { method: "PATCH", body: JSON.stringify({ enabled: monitor.enabled === false }) });
//     if (!response.ok) setError("Could not change monitor state.");
//     load();
//   }
//   return (
//     <main className="dashboard">
//       <header>
//         <Logo />
//         <nav className="dash-nav">
//           <Link to="/profile">Profile</Link>
//           <button onClick={toggleTheme}>{dark ? "☀ Light" : "☾ Dark"}</button>
//           <div className="account">
//             <span>
//               <b>{user?.name}</b>
//               <small>{user?.email}</small>
//             </span>
//             <button onClick={logout}>Log out</button>
//           </div>
//         </nav>
//       </header>
//       <section className="hero">
//         <p className="eyebrow">SYSTEM OVERVIEW</p>
//         <h1>
//           Know when your APIs
//           <br />
//           miss a beat.
//         </h1>
//         <p>
//           Fast endpoint monitoring with incident detection and recovery alerts.
//         </p>
//       </section>
//       {warnings.length > 0 && (
//         <section className="dashboard-warnings" aria-label="Monitoring warnings">
//           <div className="warning-heading"><span>!</span><div><b>Attention needed</b><small>{warnings.length} monitoring {warnings.length===1?"warning":"warnings"}</small></div></div>
//           <div className="warning-list">
//             {warnings.map((warning) => <Link className={`warning-item ${warning.tone}`} key={warning.key} to={`/monitors/${warning.monitorId}`}><span/><div><b>{warning.title}</b><small>{warning.detail}</small></div><i>→</i></Link>)}
//           </div>
//         </section>
//       )}
//       <section className="stats five">
//         <article>
//           <span>Total monitors</span>
//           <strong>{summary.total}</strong>
//         </article>
//         <article>
//           <span>Operational</span>
//           <strong className="green">{summary.up}</strong>
//         </article>
//         <article>
//           <span>Down</span>
//           <strong className="red">{summary.down}</strong>
//         </article>
//         <article>
//           <span>24h uptime</span>
//           <strong>
//             {summary.uptime ?? "—"}
//             {summary.uptime !== null && "%"}
//           </strong>
//         </article>
//         <article>
//           <span>Avg. latency</span>
//           <strong>
//             {summary.averageLatency ?? "—"}
//             {summary.averageLatency !== null && "ms"}
//             <LatencyBadge ms={summary.averageLatency} />
//           </strong>
//         </article>
//       </section>
//       <section className="grid">
//         <div>
//           <div className="title">
//             <h2>Monitors</h2>
//             <span>{shown.length} endpoints</span>
//           </div>
//           <div className="monitor-tools">
//             <input
//               placeholder="Search monitors…"
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//             />
//             <select value={status} onChange={(e) => setStatus(e.target.value)}>
//               <option value="all">All</option>
//               <option value="up">Up</option>
//               <option value="down">Down</option>
//               <option value="pending">Pending</option>
//               <option value="paused">Paused</option>
//             </select>
//             <select value={sort} onChange={(e) => setSort(e.target.value)}>
//               <option value="newest">Newest</option>
//               <option value="name">Name</option>
//               <option value="latency">Latency</option>
//             </select>
//           </div>
//           <div className="list">
//             {shown.length === 0 ? (
//               <div className="empty">No matching monitors.</div>
//             ) : (
//               shown.map((m) => (
//                 <article className="monitor" key={m.id}>
//                   <span className={`dot ${m.enabled === false ? "paused" : m.status}`} />
//                   <div>
//                     <Link to={`/monitors/${m.id}`}>
//                       <b>{m.name}</b>
//                     </Link>
//                     <small>{m.url}</small>
//                   </div>
//                   <span className="micro-metric">
//                     {m.uptime ?? "—"}% · {m.averageLatency ?? "—"}ms
//                     <LatencyBadge ms={m.averageLatency} />
//                   </span>
//                   <em className={m.enabled === false ? "paused" : m.status}>{m.enabled === false ? "paused" : m.status}</em>
//                   <div className="monitor-actions">
//                     <button className="monitor-toggle" onClick={() => toggleMonitor(m)}>{m.enabled === false ? "Resume" : "Pause"}</button>
//                     <button className="monitor-delete" aria-label={`Delete ${m.name}`} onClick={() => remove(m.id)}>×</button>
//                   </div>
//                 </article>
//               ))
//             )}
//           </div>
//         </div>
//         <aside>
//           <p className="eyebrow">NEW MONITOR</p>
//           <h2>Watch an endpoint</h2>
//           <form onSubmit={create}>
//             <label>
//               Name
//               <input
//                 required
//                 placeholder="Production API"
//                 value={form.name}
//                 onChange={(e) => setForm({ ...form, name: e.target.value })}
//               />
//             </label>
//             <label>
//               Endpoint URL
//               <input
//                 required
//                 type="url"
//                 placeholder="https://api.example.com/health"
//                 value={form.url}
//                 onChange={(e) => setForm({ ...form, url: e.target.value })}
//               />
//             </label>
//             <label>
//               Check interval
//               <select
//                 value={form.intervalSeconds}
//                 onChange={(e) =>
//                   setForm({ ...form, intervalSeconds: Number(e.target.value) })
//                 }
//               >
//                 <option value="30">30 seconds</option>
//                 <option value="60">1 minute</option>
//                 <option value="300">5 minutes</option>
//               </select>
//             </label>
//             {error && <p className="error">{error}</p>}
//             <button className="primary">Start monitoring</button>
//           </form>
//         </aside>
//       </section>
//     </main>
//   );
// }

// function LatencyChart({ checks, range }: { checks: Check[]; range: TimeRange }) {
//   const values = checks;
//   const max = Math.max(...values.map((c) => c.latencyMs), 1);
//   const magnitude = 10 ** Math.floor(Math.log10(max));
//   const normalized = max / magnitude;
//   const niceFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
//   const chartMax = niceFactor * magnitude;
//   const yTicks = [chartMax, chartMax * .75, chartMax * .5, chartMax * .25, 0];
//   const durationMs = range === "1h" ? 3600000 : range === "24h" ? 86400000 : 604800000;
//   const end = Date.now();
//   const start = end - durationMs;
//   const points = values
//     .map((c) => `${Math.max(0,Math.min(100,((new Date(c.checkedAt).getTime()-start)/durationMs)*100))},${96-(c.latencyMs/chartMax)*92}`)
//     .join(" ");
//   const labels = Array.from({length:5},(_,index)=>new Date(start+(durationMs*index)/4));
//   const label = (date:Date) => range === "7d"
//     ? date.toLocaleDateString([], {month:"short",day:"numeric"})
//     : date.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
//   return (
//     <div className="latency-chart">
//       <div className="latency-plot">
//         <div className="latency-y-axis">{yTicks.map((tick,index)=><span key={index}>{Math.round(tick)} ms</span>)}</div>
//         {values.length ? (
//           <svg viewBox="0 0 100 100" preserveAspectRatio="none">
//             <polyline points={points} />
//           </svg>
//         ) : (
//           <p>No check data yet.</p>
//         )}
//       </div>
//       <div className="latency-axis">{labels.map((date,index)=><span key={index}>{label(date)}</span>)}</div>
//       <small>{values.length} sampled checks in this range</small>
//     </div>
//   );
// }

// export function MonitorDetails() {
//   const navigate = useNavigate();
//   const { id } = useParams(),
//     [monitor, setMonitor] = useState<Monitor | null>(null),
//     [checks, setChecks] = useState<Check[]>([]),
//     [timeRange,setTimeRange] = useState<TimeRange>("1h"),
//     [incidents, setIncidents] = useState<Incident[]>([]),
//     [maintenance,setMaintenance]=useState<MaintenanceWindow[]>([]),
//     [maintenanceForm,setMaintenanceForm]=useState({startsAt:"",endsAt:"",reason:""}),
//     [message, setMessage] = useState(""),
//     [headers, setHeaders] = useState("{}"),
//     [noteInputs, setNoteInputs] = useState<Record<string, string>>({}),
//     [notes, setNotes] = useState<Record<string, any[]>>({});
//   async function load() {
//     const [m, c, i, w] = await Promise.all([
//       request(`/monitors/${id}`),
//       request(`/monitors/${id}/checks?range=${timeRange}`),
//       request("/incidents"),
//       request(`/monitors/${id}/maintenance`),
//     ]);
//     if (m.ok) {
//       const data = await m.json();
//       setMonitor(data);
//       setHeaders(JSON.stringify(data.headers || {}, null, 2));
//     }
//     if (c.ok) setChecks(await c.json());
//     if (i.ok)
//       setIncidents(
//         (await i.json()).filter((x: Incident) => x.monitorId === id),
//       );
//     if(w.ok)setMaintenance(await w.json());
//   }
//   async function refreshLiveData() {
//     if (document.hidden) return;
//     const [m, c, i] = await Promise.all([
//       request(`/monitors/${id}`),
//       request(`/monitors/${id}/checks?range=${timeRange}`),
//       request("/incidents"),
//     ]);
//     if (m.ok) {
//       const data = await m.json();
//       setMonitor((current) => current ? {
//         ...current,
//         status: data.status,
//         enabled: data.enabled,
//         uptime: data.uptime,
//         averageLatency: data.averageLatency,
//         checkCount: data.checkCount,
//         sslExpiresAt: data.sslExpiresAt,
//       } : data);
//     }
//     if (c.ok) setChecks(await c.json());
//     if (i.ok) setIncidents((await i.json()).filter((x: Incident) => x.monitorId === id));
//   }
//   useEffect(() => {
//     load();
//   }, [id]);
//   useEffect(() => {
//     refreshLiveData();
//     const timer = window.setInterval(refreshLiveData, 5000);
//     const onVisible = () => { if (!document.hidden) refreshLiveData(); };
//     document.addEventListener("visibilitychange", onVisible);
//     return () => {
//       window.clearInterval(timer);
//       document.removeEventListener("visibilitychange", onVisible);
//     };
//   }, [id,timeRange]);
//   if (!monitor)
//     return (
//       <div className="page-shell">
//         <p>Loading monitor…</p>
//       </div>
//     );
//   async function save(e: React.FormEvent) {
//     e.preventDefault();
//     try {
//       const parsed = JSON.parse(headers || "{}");
//       const r = await request(`/monitors/${id}`, {
//         method: "PATCH",
//         body: JSON.stringify({ ...monitor, headers: parsed }),
//       });
//       setMessage(
//         r.ok ? "Configuration saved." : "Could not save configuration.",
//       );
//       if (r.ok) load();
//     } catch {
//       setMessage("Headers must be valid JSON.");
//     }
//   }
//   async function action(incidentId: string, type: "acknowledge" | "resolve") {
//     await request(`/incidents/${incidentId}/${type}`, { method: "POST" });
//     load();
//   }
//   async function loadNotes(incidentId: string) {
//     const r = await request(`/incidents/${incidentId}/notes`);
//     if (r.ok) setNotes({ ...notes, [incidentId]: await r.json() });
//   }
//   async function addNote(incidentId: string) {
//     const value = noteInputs[incidentId]?.trim();
//     if (!value) return;
//     await request(`/incidents/${incidentId}/notes`, {
//       method: "POST",
//       body: JSON.stringify({ note: value }),
//     });
//     setNoteInputs({ ...noteInputs, [incidentId]: "" });
//     loadNotes(incidentId);
//   }
//   async function downloadCsv(){const response=await request(`/monitors/${id}/checks.csv`);if(!response.ok)return;const blob=await response.blob();const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`${(monitor?.name||"monitor").toLowerCase().replace(/[^a-z0-9]+/g,"-")}-checks.csv`;anchor.click();URL.revokeObjectURL(url)}
//   async function addMaintenance(event:React.FormEvent){event.preventDefault();const response=await request(`/monitors/${id}/maintenance`,{method:"POST",body:JSON.stringify({startsAt:new Date(maintenanceForm.startsAt).toISOString(),endsAt:new Date(maintenanceForm.endsAt).toISOString(),reason:maintenanceForm.reason})});if(response.ok){setMaintenanceForm({startsAt:"",endsAt:"",reason:""});load()}else setMessage("Could not schedule maintenance.")}
//   async function removeMaintenance(windowId:string){await request(`/maintenance/${windowId}`,{method:"DELETE"});load()}
//   async function toggleMonitoring(){if(!monitor)return;const response=await request(`/monitors/${id}`,{method:"PATCH",body:JSON.stringify({enabled:!monitor.enabled})});if(response.ok)load();else setMessage("Could not change monitor state.")}
//   return (
//     <main className="page-shell">
//       <header className="sub-header">
//         <Logo />
//         <div className="monitor-header-actions">
//           <button
//             type="button"
//             className="monitor-back"
//             aria-label="Go back to previous page"
//             title="Go back"
//             onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/dashboard")}
//           >
//             <svg viewBox="0 0 24 24" aria-hidden="true">
//               <path d="M19 12H5M11 18l-6-6 6-6" />
//             </svg>
//           </button>
//           <AccountMenu />
//         </div>
//       </header>
//       <section className="detail-head">
//         <div>
//           <p className="eyebrow">MONITOR DETAILS</p>
//           <h1>{monitor.name}</h1>
//           <a href={monitor.url} target="_blank" rel="noreferrer">
//             {monitor.url}
//           </a>
//         </div>
//         <div className="detail-state-actions">
//           <button className={`monitor-state-button ${monitor.enabled ? "pause" : "resume"}`} onClick={toggleMonitoring}>{monitor.enabled ? "Pause monitoring" : "Resume monitoring"}</button>
//           <div className={`status-pill ${monitor.enabled ? monitor.status : "paused"}`}>
//             ● {monitor.enabled ? monitor.status : "paused"}
//           </div>
//         </div>
//       </section>
//       <section className="detail-stats">
//         <article>
//           <span>Uptime</span>
//           <b>{monitor.uptime ?? "—"}%</b>
//         </article>
//         <article>
//           <span>Average latency</span>
//           <b>{monitor.averageLatency ?? "—"} ms <LatencyBadge ms={monitor.averageLatency} /></b>
//         </article>
//         <article>
//           <span>Total checks</span>
//           <b>{(monitor as any).checkCount ?? 0}</b>
//         </article>
//         <article>
//           <span>Current state</span>
//           <b>{monitor.enabled ? "Active" : "Paused"}</b>
//         </article>
//         <article>
//           <span>SLA target</span>
//           <b className={(monitor.uptime??100)>=(monitor.slaTarget??99.9)?"green":"red"}>{monitor.slaTarget??99.9}%</b>
//         </article>
//         <article>
//           <span>SSL certificate</span>
//           <b className={monitor.sslExpiresAt&&new Date(monitor.sslExpiresAt).getTime()-Date.now()<14*86400000?"red":""}>{monitor.sslExpiresAt?`${Math.max(0,Math.ceil((new Date(monitor.sslExpiresAt).getTime()-Date.now())/86400000))} days`:"—"}</b>
//         </article>
//       </section>
//       <section className="detail-grid">
//         <div className="panel wide">
//           <div className="chart-title-row"><div><h2>Latency</h2><small>Response time over selected period</small></div><div className="range-selector" aria-label="Latency chart time range">{(["1h","24h","7d"] as TimeRange[]).map(range=><button key={range} className={timeRange===range?"active":""} onClick={()=>setTimeRange(range)}>{range}</button>)}</div></div>
//           <LatencyChart checks={checks} range={timeRange} />
//         </div>
//         <div className="panel">
//           <h2>Configuration</h2>
//           <form className="config-form" onSubmit={save}>
//             <label>
//               Name
//               <input
//                 value={monitor.name}
//                 onChange={(e) =>
//                   setMonitor({ ...monitor, name: e.target.value })
//                 }
//               />
//             </label>
//             <label>
//               URL
//               <input
//                 value={monitor.url}
//                 onChange={(e) =>
//                   setMonitor({ ...monitor, url: e.target.value })
//                 }
//               />
//             </label>
//             <div className="form-row">
//               <label>
//                 Method
//                 <select
//                   value={monitor.method}
//                   onChange={(e) =>
//                     setMonitor({ ...monitor, method: e.target.value })
//                   }
//                 >
//                   {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map(
//                     (x) => (
//                       <option key={x}>{x}</option>
//                     ),
//                   )}
//                 </select>
//               </label>
//               <label>
//                 Expected status
//                 <input
//                   type="number"
//                   value={monitor.expectedStatus}
//                   onChange={(e) =>
//                     setMonitor({
//                       ...monitor,
//                       expectedStatus: Number(e.target.value),
//                     })
//                   }
//                 />
//               </label>
//             </div>
//             <div className="form-row">
//               <label>
//                 Interval (seconds)
//                 <input
//                   type="number"
//                   min="10"
//                   value={monitor.intervalSeconds}
//                   onChange={(e) =>
//                     setMonitor({
//                       ...monitor,
//                       intervalSeconds: Number(e.target.value),
//                     })
//                   }
//                 />
//               </label>
//               <label>
//                 Timeout (ms)
//                 <input
//                   type="number"
//                   value={monitor.timeoutMs}
//                   onChange={(e) =>
//                     setMonitor({
//                       ...monitor,
//                       timeoutMs: Number(e.target.value),
//                     })
//                   }
//                 />
//               </label>
//             </div>
//             <label>
//               Failure threshold
//               <input
//                 type="number"
//                 min="1"
//                 max="10"
//                 value={monitor.failureThreshold}
//                 onChange={(e) =>
//                   setMonitor({
//                     ...monitor,
//                     failureThreshold: Number(e.target.value),
//                   })
//                 }
//               />
//             </label>
//             <label>
//               SLA target (%)
//               <input type="number" min="0" max="100" step="0.01" value={monitor.slaTarget??99.9} onChange={(e)=>setMonitor({...monitor,slaTarget:Number(e.target.value)})}/>
//             </label>
//             <label>
//               Headers (JSON)
//               <textarea
//                 rows={4}
//                 value={headers}
//                 onChange={(e) => setHeaders(e.target.value)}
//               />
//             </label>
//             {!["GET", "HEAD"].includes(monitor.method || "GET") && (
//               <label>
//                 Request body
//                 <textarea
//                   rows={4}
//                   value={monitor.body || ""}
//                   onChange={(e) =>
//                     setMonitor({ ...monitor, body: e.target.value })
//                   }
//                 />
//               </label>
//             )}
//             <label className="toggle">
//               <input
//                 type="checkbox"
//                 checked={monitor.enabled}
//                 onChange={(e) =>
//                   setMonitor({ ...monitor, enabled: e.target.checked })
//                 }
//               />{" "}
//               Monitoring enabled
//             </label>
//             <label className="toggle">
//               <input type="checkbox" checked={monitor.publicEnabled??false} onChange={(e)=>setMonitor({...monitor,publicEnabled:e.target.checked})}/>{" "}
//               Public status page enabled
//             </label>
//             {monitor.publicEnabled&&monitor.publicSlug&&<a className="public-status-link" href={`/status/${monitor.publicSlug}`} target="_blank" rel="noreferrer">Open public status page ↗</a>}
//             {message && <p className="form-message">{message}</p>}
//             <button className="primary">Save configuration</button>
//           </form>
//         </div>
//         <div className="panel wide maintenance-panel">
//           <h2>Maintenance windows</h2>
//           <form className="maintenance-form" onSubmit={addMaintenance}><label>Starts<input required type="datetime-local" value={maintenanceForm.startsAt} onChange={(e)=>setMaintenanceForm({...maintenanceForm,startsAt:e.target.value})}/></label><label>Ends<input required type="datetime-local" value={maintenanceForm.endsAt} onChange={(e)=>setMaintenanceForm({...maintenanceForm,endsAt:e.target.value})}/></label><label>Reason<input placeholder="Database upgrade" value={maintenanceForm.reason} onChange={(e)=>setMaintenanceForm({...maintenanceForm,reason:e.target.value})}/></label><button className="primary">Schedule</button></form>
//           <div className="maintenance-list">{maintenance.length===0?<p className="muted">No maintenance windows scheduled.</p>:maintenance.map(w=><article key={w.id}><div><b>{w.reason||"Scheduled maintenance"}</b><small>{time(w.startsAt)} → {time(w.endsAt)}</small></div><button onClick={()=>removeMaintenance(w.id)}>Remove</button></article>)}</div>
//         </div>
//         <div className="panel wide">
//           <div className="panel-title-row">
//             <h2>Recent checks</h2>
//             <button className="export-csv" onClick={downloadCsv}>
//               <svg viewBox="0 0 24 24" aria-hidden="true">
//                 <path d="M4 4h12v12H4zM4 9h12M9 4v12M14 18h6M17 15l3 3-3 3" />
//               </svg>
//               Export CSV
//             </button>
//           </div>
//           <div className="table-wrap">
//             <table>
//               <thead>
//                 <tr>
//                   <th>Time</th>
//                   <th>Status</th>
//                   <th>HTTP</th>
//                   <th>Latency</th>
//                   <th>Error</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {checks
//                   .slice()
//                   .reverse()
//                   .slice(0, 20)
//                   .map((c, i) => (
//                     <tr key={i}>
//                       <td>{time(c.checkedAt)}</td>
//                       <td className={c.success ? "green" : "red"}>
//                         {c.success ? "Success" : "Failed"}
//                       </td>
//                       <td>{c.statusCode ?? "—"}</td>
//                       <td><span className={`latency-value ${latencyBand(c.latencyMs).tone}`}>{c.latencyMs} ms</span></td>
//                       <td>{c.error ?? "—"}</td>
//                     </tr>
//                   ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//         <div className="panel wide">
//           <h2>Incident timeline</h2>
//           {incidents.length === 0 ? (
//             <p className="muted">No incidents recorded.</p>
//           ) : (
//             <div className="incident-list">
//               {incidents.map((i) => (
//                 <article className={`incident-card ${i.severity || "major"}`} key={i.id}>
//                   <div className="incident-top">
//                     <div>
//                       <b>
//                         {i.resolvedAt ? "Resolved incident" : "Active incident"}
//                       </b>
//                       <span className={`severity-badge ${i.severity || "major"}`}>{i.severity || "major"}</span>
//                       <small>
//                         {time(i.startedAt)} · {duration(i.durationSeconds)}
//                       </small>
//                     </div>
//                     <span>{i.cause || "Check failure"}</span>
//                   </div>
//                   <div className="incident-actions">
//                     {!i.acknowledgedAt && (
//                       <button onClick={() => action(i.id, "acknowledge")}>
//                         Acknowledge
//                       </button>
//                     )}
//                     {!i.resolvedAt && (
//                       <button onClick={() => action(i.id, "resolve")}>
//                         Resolve manually
//                       </button>
//                     )}
//                     <button onClick={() => loadNotes(i.id)}>Show notes</button>
//                   </div>
//                   {notes[i.id] && (
//                     <div className="notes">
//                       {notes[i.id].map((n) => (
//                         <p key={n.id}>
//                           <b>{n.authorName || "Former user"}</b> {n.note}
//                           <small>{time(n.createdAt)}</small>
//                         </p>
//                       ))}
//                       <div>
//                         <input
//                           placeholder="Add investigation note…"
//                           value={noteInputs[i.id] || ""}
//                           onChange={(e) =>
//                             setNoteInputs({
//                               ...noteInputs,
//                               [i.id]: e.target.value,
//                             })
//                           }
//                         />
//                         <button onClick={() => addNote(i.id)}>Add note</button>
//                       </div>
//                     </div>
//                   )}
//                 </article>
//               ))}
//             </div>
//           )}
//         </div>
//       </section>
//     </main>
//   );
// }

// export function Profile() {
//   const navigate=useNavigate();
//   const [user, setUser] = useState<User | null>(null),
//     [currentPassword, setCurrent] = useState(""),
//     [newPassword, setNew] = useState(""),
//     [confirmPassword,setConfirmPassword] = useState(""),
//     [deletePassword,setDeletePassword] = useState(""),
//     [deleting,setDeleting] = useState(false),
//     [apiKeys,setApiKeys] = useState<ApiKey[]>([]),
//     [keyName,setKeyName] = useState(""),
//     [revealedKey,setRevealedKey] = useState(""),
//     [keyCopied,setKeyCopied] = useState(false),
//     [message, setMessage] = useState("");
//   async function loadApiKeys(){const response=await request("/auth/api-keys");if(response.ok)setApiKeys(await response.json())}
//   useEffect(() => {
//     request("/auth/me")
//       .then((r) => r.json())
//       .then((data)=>setUser({...data,phoneCountryCode:data.phoneCountryCode||"+91"}));
//     loadApiKeys();
//   }, []);
//   if (!user) return <main className="page-shell">Loading…</main>;
//   async function save(e: React.FormEvent) {
//     e.preventDefault();
//     const r = await request("/auth/me", {
//         method: "PATCH",
//         body: JSON.stringify(user),
//       }),
//       d = await r.json();
//     if (r.ok) {
//       localStorage.setItem("fluct_user", JSON.stringify(d.user));
//       localStorage.setItem("fluct_token", d.token);
//       setMessage("Profile updated.");
//     } else setMessage(d.error);
//   }
//   async function password(e: React.FormEvent) {
//     e.preventDefault();
//     if(newPassword!==confirmPassword){setMessage("New passwords do not match.");return;}
//     const r = await request("/auth/change-password", {
//         method: "POST",
//         body: JSON.stringify({ currentPassword, newPassword }),
//       }),
//       d = await r.json();
//     setMessage(r.ok ? "Password changed." : d.error);
//     if (r.ok) {
//       setCurrent("");
//       setNew("");
//       setConfirmPassword("");
//     }
//   }
//   async function deleteAccount(e:React.FormEvent){
//     e.preventDefault();
//     if(!window.confirm("Permanently delete your FLUCT account, monitors, checks, and incidents? This cannot be undone."))return;
//     setDeleting(true);
//     const response=await request("/auth/me",{method:"DELETE",body:JSON.stringify({currentPassword:deletePassword})});
//     if(response.ok){localStorage.removeItem("fluct_token");localStorage.removeItem("fluct_user");window.location.assign("/");return;}
//     const data=await response.json();setMessage(data.error||"Could not delete account.");setDeleting(false);
//   }
//   async function createApiKey(e:React.FormEvent){e.preventDefault();const response=await request("/auth/api-keys",{method:"POST",body:JSON.stringify({name:keyName})});const data=await response.json();if(!response.ok){setMessage(data.error||"Could not create API key.");return}setKeyCopied(false);setRevealedKey(data.key);setKeyName("");setMessage("");loadApiKeys()}
//   async function revokeApiKey(key:ApiKey){if(!window.confirm(`Revoke the API key “${key.name}”? Applications using it will immediately stop working.`))return;const response=await request(`/auth/api-keys/${key.id}`,{method:"DELETE"});if(response.ok){if(revealedKey.startsWith(key.keyPrefix.replace("…","")))setRevealedKey("");loadApiKeys()}}
//   async function copyApiKey(){await navigator.clipboard.writeText(revealedKey);setKeyCopied(true)}
//   return (
//     <main className="page-shell">
//       <header className="sub-header">
//         <Logo />
//         <button type="button" className="monitor-back" aria-label="Go back to previous page" title="Go back" onClick={()=>window.history.length>1?navigate(-1):navigate("/dashboard")}>
//           <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
//         </button>
//       </header>
//       <section className="settings-page">
//         <p className="eyebrow">ACCOUNT SETTINGS</p>
//         <h1>Your profile</h1>
//         {message && <p className="form-message">{message}</p>}
//         <div className="settings-grid">
//           <form className="panel config-form" onSubmit={save}>
//             <h2>Personal details</h2>
//             <label>
//               Name
//               <input
//                 value={user.name}
//                 onChange={(e) => setUser({ ...user, name: e.target.value })}
//               />
//             </label>
//             <label>
//               Email
//               <input
//                 type="email"
//                 value={user.email}
//                 onChange={(e) => setUser({ ...user, email: e.target.value })}
//               />
//             </label>
//             <label>
//               Phone number
//               <div className="phone-field">
//                 <select aria-label="Phone country code" value={user.phoneCountryCode||""} onChange={(e)=>setUser({...user,phoneCountryCode:e.target.value||null})}>
//                   <option value="">Country code</option>
//                   {COUNTRY_CODES.map(([country,code])=><option key={country} value={code}>{country} ({code})</option>)}
//                 </select>
//                 <input inputMode="tel" placeholder="Phone number" value={user.phoneNumber||""} onChange={(e)=>setUser({...user,phoneNumber:e.target.value})}/>
//               </div>
//             </label>
//             <button className="primary">Save profile</button>
//           </form>
//           <form className="panel config-form" onSubmit={password}>
//             <h2>Change password</h2>
//             <label>
//               Current password
//               <input
//                 required
//                 type="password"
//                 value={currentPassword}
//                 onChange={(e) => setCurrent(e.target.value)}
//               />
//             </label>
//             <label>
//               New password
//               <input
//                 required
//                 type="password"
//                 minLength={8}
//                 value={newPassword}
//                 onChange={(e) => setNew(e.target.value)}
//               />
//             </label>
//             <label>
//               Confirm new password
//               <input required type="password" minLength={8} value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)}/>
//             </label>
//             <button className="primary">Change password</button>
//           </form>
//           <section className="panel api-keys-panel">
//             <div className="api-keys-heading"><div><p className="eyebrow">DEVELOPER ACCESS</p><h2>API keys</h2><p>Use a key to manage your FLUCT monitors from scripts, CI jobs, or another application.</p></div><span>{apiKeys.length}/10 active</span></div>
//             <form className="api-key-create" onSubmit={createApiKey}><label>Key name<input required minLength={2} maxLength={60} placeholder="CI deployment" value={keyName} onChange={(e)=>setKeyName(e.target.value)}/></label><button className="primary">Create API key</button></form>
//             <div className="api-example"><span>Example request</span><code>curl -H "Authorization: Bearer YOUR_API_KEY" {API}/monitors</code></div>
//             <div className="api-key-list">{apiKeys.length===0?<p className="muted">No API keys created yet.</p>:apiKeys.map(key=><article key={key.id}><div><b>{key.name}</b><code>{key.keyPrefix}</code><small>Created {time(key.createdAt)} · {key.lastUsedAt?`Last used ${time(key.lastUsedAt)}`:"Never used"}</small></div><button onClick={()=>revokeApiKey(key)}>Revoke</button></article>)}</div>
//           </section>
//           {revealedKey&&<div className="api-key-modal-backdrop" role="presentation"><section className="api-key-modal" role="dialog" aria-modal="true" aria-labelledby="api-key-created-title"><span className="key-success-icon">✓</span><p className="eyebrow">API KEY CREATED</p><h2 id="api-key-created-title">Copy this now, it won't be shown again.</h2><p>Store this key somewhere secure. FLUCT only stores its hash and cannot recover the full value after you close this window.</p><div className="modal-key-value"><code>{revealedKey}</code><button onClick={copyApiKey}>{keyCopied?"Copied ✓":"Copy key"}</button></div><div className="key-modal-warning"><b>Keep it secret</b><span>Anyone with this key can manage your monitors and incidents.</span></div><button className="key-modal-done" onClick={()=>{setRevealedKey("");setKeyCopied(false)}}>{keyCopied?"I’ve saved it":"I understand, close"}</button></section></div>}
//           <form className="panel danger-zone" onSubmit={deleteAccount}>
//             <div><p className="eyebrow">DANGER ZONE</p><h2>Delete account</h2><p>Permanently remove your account, monitors, checks, incidents, and saved settings.</p></div>
//             <label>Current password<input required type="password" value={deletePassword} onChange={(e)=>setDeletePassword(e.target.value)} placeholder="Confirm with your password"/></label>
//             <button className="delete-account" disabled={deleting}>{deleting?"Deleting…":"Delete my account"}</button>
//           </form>
//         </div>
//       </section>
//     </main>
//   );
// }

// export function ForgotPassword() {
//   const [email, setEmail] = useState(""),
//     [result, setResult] = useState<any>(null);
//   async function submit(e: React.FormEvent) {
//     e.preventDefault();
//     const r = await request("/auth/forgot-password", {
//       method: "POST",
//       body: JSON.stringify({ email }),
//     });
//     setResult(await r.json());
//   }
//   return (
//     <main className="simple-auth">
//       <Logo />
//       <form className="auth-box" onSubmit={submit}>
//         <Link className="auth-back-inline" to="/login">← Back to login</Link>
//         <p className="eyebrow">PASSWORD RECOVERY</p>
//         <h2>Reset your password.</h2>
//         <p>Enter your account email to create a secure reset link.</p>
//         <label>
//           Email
//           <input
//             required
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//           />
//         </label>
//         <button className="primary" style={{ alignSelf: "center", width: "auto", padding: "15px 32px" }}>Create reset link</button>
//         {result && (
//           <div className="reset-result">
//             <p>{result.message}</p>
//           </div>
//         )}
//       </form>
//     </main>
//   );
// }

// export function ResetPassword() {
//   const [params] = useSearchParams(),
//     [password, setPassword] = useState(""),
//     [message, setMessage] = useState("");
//   async function submit(e: React.FormEvent) {
//     e.preventDefault();
//     const r = await request("/auth/reset-password", {
//         method: "POST",
//         body: JSON.stringify({ token: params.get("token"), password }),
//       }),
//       d = await r.json();
//     setMessage(r.ok ? "Password reset. You can now log in." : d.error);
//   }
//   return (
//     <main className="simple-auth">
//       <Logo />
//       <form className="auth-box" onSubmit={submit}>
//         <p className="eyebrow">CHOOSE A NEW PASSWORD</p>
//         <h2>Almost there.</h2>
//         <label>
//           New password
//           <input
//             type="password"
//             minLength={8}
//             required
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//           />
//         </label>
//         <button className="primary">Reset password</button>
//         {message && <p className="form-message">{message}</p>}
//         <Link className="auth-switch" to="/login">
//           Back to login
//         </Link>
//       </form>
//     </main>
//   );
// }

// export function PublicStatus(){
//   const {slug}=useParams();const [data,setData]=useState<any>(null),[missing,setMissing]=useState(false);
//   useEffect(()=>{fetch(`${API}/public/status/${slug}`).then(async r=>{if(!r.ok){setMissing(true);return}setData(await r.json())})},[slug]);
//   if(missing)return <main className="public-status"><Logo/><section><h1>Status page not found</h1><p>This page may be private or unavailable.</p></section></main>;
//   if(!data)return <main className="public-status"><Logo/><section><p>Loading status…</p></section></main>;
//   const operational=data.status==='up'&&!data.maintenance;
//   return <main className="public-status"><header><Logo/><span>Powered by FLUCT</span></header><section className="public-status-hero"><p className="eyebrow">LIVE SERVICE STATUS</p><h1>{data.name}</h1><div className={`public-state ${operational?'up':data.maintenance?'maintenance':'down'}`}>● {data.maintenance?'Scheduled maintenance':operational?'All systems operational':'Service disruption'}</div></section><section className="public-metrics"><article><span>30-day uptime</span><b>{data.uptime??'—'}%</b></article><article><span>Average latency</span><b>{data.averageLatency??'—'} ms</b></article><article><span>SLA target</span><b>{data.slaTarget}%</b></article><article><span>SSL expires</span><b>{data.sslExpiresAt?new Date(data.sslExpiresAt).toLocaleDateString():'—'}</b></article></section><section className="public-incidents"><h2>Recent incidents</h2>{data.incidents.length===0?<div className="public-clear">✓ No incidents reported in this period.</div>:data.incidents.map((i:any,index:number)=><article key={index}><span className={i.resolvedAt?'resolved':'active'}/><div><b>{i.resolvedAt?'Resolved incident':'Active incident'}</b><p>{i.cause||'Service interruption'}</p><small>{time(i.startedAt)}{i.resolvedAt?` — resolved ${time(i.resolvedAt)}`:''}</small></div></article>)}</section></main>
// }
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { COUNTRY_CODES } from "./countryCodes";

type Monitor = {
  id: string;
  name: string;
  url: string;
  status: "pending" | "up" | "down";
  intervalSeconds: number;
  averageLatency?: number;
  uptime?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  timeoutMs?: number;
  expectedStatus?: number;
  failureThreshold?: number;
  alertEmail?: string | null;
  enabled?: boolean;
  slaTarget?: number;
  sslExpiresAt?: string | null;
  publicEnabled?: boolean;
  publicSlug?: string | null;
  checkCount?: number;
};
type Check = {
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  checkedAt: string;
};
type TimeRange = "1h" | "24h" | "7d";
type Incident = {
  id: string;
  monitorId: string;
  startedAt: string;
  resolvedAt: string | null;
  cause: string | null;
  severity: "minor" | "major" | "critical";
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  durationSeconds: number;
};
type Summary = {
  total: number;
  up: number;
  down: number;
  uptime: number | null;
  averageLatency: number | null;
};
type User = { id: string; name: string; email: string; phoneCountryCode?: string | null; phoneNumber?: string | null };
type ApiKey = { id:string;name:string;keyPrefix:string;createdAt:string;lastUsedAt?:string|null };
type MaintenanceWindow = { id:string;startsAt:string;endsAt:string;reason:string|null };
const API = 'https://fluct-api2.onrender.com/api';
const auth = () => ({
  Authorization: `Bearer ${localStorage.getItem("fluct_token")}`,
});
async function request(path: string, options: RequestInit = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...auth(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
}
function BrandMark(){return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M6 17h6l2.5-5 4.5 10 3-6h4"/></svg></span>}
function Logo() {
  return (
    <>
      <Link className="brand" to="/">
        <BrandMark/> FLUCT
      </Link>
      {window.location.pathname === "/dashboard" && <AccountMenu />}
    </>
  );
}
function AccountMenu() {
  const [open, setOpen] = useState(false),
    [dark, setDark] = useState(localStorage.getItem("fluct_theme") === "dark");
  const menuRef = useRef<HTMLDivElement>(null);
  const user: User | null = JSON.parse(
    localStorage.getItem("fluct_user") || "null",
  );
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "U";
  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  function theme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("fluct_theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }
  function logout() {
    localStorage.removeItem("fluct_token");
    localStorage.removeItem("fluct_user");
    window.location.assign("/login");
  }
  return (
    <div className="avatar-menu" ref={menuRef}>
      <button
        className="avatar-trigger"
        aria-label="Open user menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {initial}
      </button>
      {open && (
        <div className="avatar-popover">
          <div className="avatar-identity">
            <span>{initial}</span>
            <div>
              <b>{user?.name}</b>
              <small>{user?.email}</small>
            </div>
          </div>
          <Link to="/profile">
            <i>♙</i> Profile settings
          </Link>
          <button onClick={theme}>
            <i>{dark ? "☀" : "☾"}</i> {dark ? "Light mode" : "Dark mode"}
          </button>
          <button className="avatar-logout" onClick={logout}>
            <i>↪</i> Log out
          </button>
        </div>
      )}
    </div>
  );
}
function time(value: string) {
  return new Date(value).toLocaleString();
}
function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
function LatencyBadge({ ms }: { ms: number | null | undefined }) {
  if (ms === null || ms === undefined) return null;
  const band = latencyBand(ms);
  return <span className={`latency-badge ${band.tone}`}>{band.label}</span>;
}
function latencyBand(ms: number) {
  return (
    ms < 200
      ? { label: "Fast", tone: "fast" }
      : ms < 500
        ? { label: "Average", tone: "average" }
        : ms < 1000
          ? { label: "Slow", tone: "slow" }
          : { label: "Very slow", tone: "very-slow" }
  );
}

export function DashboardPro({ logout }: { logout: () => void }) {
  const [monitors, setMonitors] = useState<Monitor[]>([]),
    [summary, setSummary] = useState<Summary>({
      total: 0,
      up: 0,
      down: 0,
      uptime: null,
      averageLatency: null,
    });
  const [form, setForm] = useState({ name: "", url: "", intervalSeconds: 60 }),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("newest");
  const user: User | null = JSON.parse(
    localStorage.getItem("fluct_user") || "null",
  );
  const [dark, setDark] = useState(
    localStorage.getItem("fluct_theme") === "dark",
  );
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("fluct_theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  async function load() {
    try {
      const [m, s] = await Promise.all([
        request("/monitors"),
        request("/dashboard"),
      ]);
      if (m.status === 401) return logout();
      setMonitors(await m.json());
      setSummary(await s.json());
      setError("");
    } catch {
      setError("Cannot reach the FLUCT API.");
    }
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);
  const shown = useMemo(
    () =>
      monitors
        .filter(
          (m) =>
            (status === "all" || (status === "paused" ? !m.enabled : m.enabled !== false && m.status === status)) &&
            (m.name.toLowerCase().includes(query.toLowerCase()) ||
              m.url.toLowerCase().includes(query.toLowerCase())),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "latency"
              ? (b.averageLatency ?? 0) - (a.averageLatency ?? 0)
              : 0,
        ),
    [monitors, query, status, sort],
  );
  const warnings = useMemo(() => monitors.flatMap((monitor) => {
    if (monitor.enabled === false) return [];
    const result: { key:string; tone:"warning"|"critical"; title:string; detail:string; monitorId:string }[] = [];
    const uptime = monitor.uptime == null ? null : Number(monitor.uptime);
    const target = Number(monitor.slaTarget ?? 99.9);
    if (uptime !== null && uptime < target) result.push({key:`sla-${monitor.id}`,tone:target-uptime>=1?"critical":"warning",title:`${monitor.name} is below SLA`,detail:`${uptime}% uptime against a ${target}% target`,monitorId:monitor.id});
    if (monitor.sslExpiresAt) {
      const days = Math.ceil((new Date(monitor.sslExpiresAt).getTime()-Date.now())/86400000);
      if (days <= 30) result.push({key:`ssl-${monitor.id}`,tone:days<=14?"critical":"warning",title:`${monitor.name} certificate ${days<=0?"has expired":"expires soon"}`,detail:days<=0?"HTTPS may no longer be trusted":`${days} day${days===1?"":"s"} remaining`,monitorId:monitor.id});
    }
    return result;
  }), [monitors]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await request("/monitors", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (!r.ok) return setError("Enter a valid name and HTTP(S) URL.");
    setForm({ name: "", url: "", intervalSeconds: 60 });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this monitor and all of its history?")) return;
    await request(`/monitors/${id}`, { method: "DELETE" });
    load();
  }
  async function toggleMonitor(monitor: Monitor) {
    const response = await request(`/monitors/${monitor.id}`, { method: "PATCH", body: JSON.stringify({ enabled: monitor.enabled === false }) });
    if (!response.ok) setError("Could not change monitor state.");
    load();
  }
  return (
    <main className="dashboard">
      <header>
        <Logo />
        <nav className="dash-nav">
          <Link to="/profile">Profile</Link>
          <button onClick={toggleTheme}>{dark ? "☀ Light" : "☾ Dark"}</button>
          <div className="account">
            <span>
              <b>{user?.name}</b>
              <small>{user?.email}</small>
            </span>
            <button onClick={logout}>Log out</button>
          </div>
        </nav>
      </header>
      <section className="hero">
        <p className="eyebrow">SYSTEM OVERVIEW</p>
        <h1>
          Know when your APIs
          <br />
          miss a beat.
        </h1>
        <p>
          Fast endpoint monitoring with incident detection and recovery alerts.
        </p>
      </section>
      {warnings.length > 0 && (
        <section className="dashboard-warnings" aria-label="Monitoring warnings">
          <div className="warning-heading"><span>!</span><div><b>Attention needed</b><small>{warnings.length} monitoring {warnings.length===1?"warning":"warnings"}</small></div></div>
          <div className="warning-list">
            {warnings.map((warning) => <Link className={`warning-item ${warning.tone}`} key={warning.key} to={`/monitors/${warning.monitorId}`}><span/><div><b>{warning.title}</b><small>{warning.detail}</small></div><i>→</i></Link>)}
          </div>
        </section>
      )}
      <section className="stats five">
        <article>
          <span>Total monitors</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>Operational</span>
          <strong className="green">{summary.up}</strong>
        </article>
        <article>
          <span>Down</span>
          <strong className="red">{summary.down}</strong>
        </article>
        <article>
          <span>24h uptime</span>
          <strong>
            {summary.uptime ?? "—"}
            {summary.uptime !== null && "%"}
          </strong>
        </article>
        <article>
          <span>Avg. latency</span>
          <strong>
            {summary.averageLatency ?? "—"}
            {summary.averageLatency !== null && "ms"}
            <LatencyBadge ms={summary.averageLatency} />
          </strong>
        </article>
      </section>
      <section className="grid">
        <div>
          <div className="title">
            <h2>Monitors</h2>
            <span>{shown.length} endpoints</span>
          </div>
          <div className="monitor-tools">
            <input
              placeholder="Search monitors…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
              <option value="pending">Pending</option>
              <option value="paused">Paused</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="name">Name</option>
              <option value="latency">Latency</option>
            </select>
          </div>
          <div className="list">
            {shown.length === 0 ? (
              <div className="empty">No matching monitors.</div>
            ) : (
              shown.map((m) => (
                <article className="monitor" key={m.id}>
                  <span className={`dot ${m.enabled === false ? "paused" : m.status}`} />
                  <div>
                    <Link to={`/monitors/${m.id}`}>
                      <b>{m.name}</b>
                    </Link>
                    <small>{m.url}</small>
                  </div>
                  <span className="micro-metric">
                    {m.uptime ?? "—"}% · {m.averageLatency ?? "—"}ms
                    <LatencyBadge ms={m.averageLatency} />
                  </span>
                  <em className={m.enabled === false ? "paused" : m.status}>{m.enabled === false ? "paused" : m.status}</em>
                  <div className="monitor-actions">
                    <button className="monitor-toggle" onClick={() => toggleMonitor(m)}>{m.enabled === false ? "Resume" : "Pause"}</button>
                    <button className="monitor-delete" aria-label={`Delete ${m.name}`} onClick={() => remove(m.id)}>×</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
        <aside>
          <p className="eyebrow">NEW MONITOR</p>
          <h2>Watch an endpoint</h2>
          <form onSubmit={create}>
            <label>
              Name
              <input
                required
                placeholder="Production API"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Endpoint URL
              <input
                required
                type="url"
                placeholder="https://api.example.com/health"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </label>
            <label>
              Check interval
              <select
                value={form.intervalSeconds}
                onChange={(e) =>
                  setForm({ ...form, intervalSeconds: Number(e.target.value) })
                }
              >
                <option value="30">30 seconds</option>
                <option value="60">1 minute</option>
                <option value="300">5 minutes</option>
              </select>
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary">Start monitoring</button>
          </form>
        </aside>
      </section>
    </main>
  );
}

function LatencyChart({ checks, range }: { checks: Check[]; range: TimeRange }) {
  const values = checks;
  const max = Math.max(...values.map((c) => c.latencyMs), 1);
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const niceFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const chartMax = niceFactor * magnitude;
  const yTicks = [chartMax, chartMax * .75, chartMax * .5, chartMax * .25, 0];
  const durationMs = range === "1h" ? 3600000 : range === "24h" ? 86400000 : 604800000;
  const end = Date.now();
  const start = end - durationMs;
  const points = values
    .map((c) => `${Math.max(0,Math.min(100,((new Date(c.checkedAt).getTime()-start)/durationMs)*100))},${96-(c.latencyMs/chartMax)*92}`)
    .join(" ");
  const labels = Array.from({length:5},(_,index)=>new Date(start+(durationMs*index)/4));
  const label = (date:Date) => range === "7d"
    ? date.toLocaleDateString([], {month:"short",day:"numeric"})
    : date.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  return (
    <div className="latency-chart">
      <div className="latency-plot">
        <div className="latency-y-axis">{yTicks.map((tick,index)=><span key={index}>{Math.round(tick)} ms</span>)}</div>
        {values.length ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={points} />
          </svg>
        ) : (
          <p>No check data yet.</p>
        )}
      </div>
      <div className="latency-axis">{labels.map((date,index)=><span key={index}>{label(date)}</span>)}</div>
      <small>{values.length} sampled checks in this range</small>
    </div>
  );
}

export function MonitorDetails() {
  const navigate = useNavigate();
  const { id } = useParams(),
    [monitor, setMonitor] = useState<Monitor | null>(null),
    [checks, setChecks] = useState<Check[]>([]),
    [timeRange,setTimeRange] = useState<TimeRange>("1h"),
    [incidents, setIncidents] = useState<Incident[]>([]),
    [maintenance,setMaintenance]=useState<MaintenanceWindow[]>([]),
    [maintenanceForm,setMaintenanceForm]=useState({startsAt:"",endsAt:"",reason:""}),
    [message, setMessage] = useState(""),
    [headers, setHeaders] = useState("{}"),
    [noteInputs, setNoteInputs] = useState<Record<string, string>>({}),
    [notes, setNotes] = useState<Record<string, any[]>>({});
  async function load() {
    const [m, c, i, w] = await Promise.all([
      request(`/monitors/${id}`),
      request(`/monitors/${id}/checks?range=${timeRange}`),
      request("/incidents"),
      request(`/monitors/${id}/maintenance`),
    ]);
    if (m.ok) {
      const data = await m.json();
      setMonitor(data);
      setHeaders(JSON.stringify(data.headers || {}, null, 2));
    }
    if (c.ok) setChecks(await c.json());
    if (i.ok)
      setIncidents(
        (await i.json()).filter((x: Incident) => x.monitorId === id),
      );
    if(w.ok)setMaintenance(await w.json());
  }
  async function refreshLiveData() {
    if (document.hidden) return;
    const [m, c, i] = await Promise.all([
      request(`/monitors/${id}`),
      request(`/monitors/${id}/checks?range=${timeRange}`),
      request("/incidents"),
    ]);
    if (m.ok) {
      const data = await m.json();
      setMonitor((current) => current ? {
        ...current,
        status: data.status,
        enabled: data.enabled,
        uptime: data.uptime,
        averageLatency: data.averageLatency,
        checkCount: data.checkCount,
        sslExpiresAt: data.sslExpiresAt,
      } : data);
    }
    if (c.ok) setChecks(await c.json());
    if (i.ok) setIncidents((await i.json()).filter((x: Incident) => x.monitorId === id));
  }
  useEffect(() => {
    load();
  }, [id]);
  useEffect(() => {
    refreshLiveData();
    const timer = window.setInterval(refreshLiveData, 5000);
    const onVisible = () => { if (!document.hidden) refreshLiveData(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id,timeRange]);
  if (!monitor)
    return (
      <div className="page-shell">
        <p>Loading monitor…</p>
      </div>
    );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const parsed = JSON.parse(headers || "{}");
      const r = await request(`/monitors/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...monitor, headers: parsed }),
      });
      setMessage(
        r.ok ? "Configuration saved." : "Could not save configuration.",
      );
      if (r.ok) load();
    } catch {
      setMessage("Headers must be valid JSON.");
    }
  }
  async function action(incidentId: string, type: "acknowledge" | "resolve") {
    await request(`/incidents/${incidentId}/${type}`, { method: "POST" });
    load();
  }
  async function loadNotes(incidentId: string) {
    const r = await request(`/incidents/${incidentId}/notes`);
    if (r.ok) setNotes({ ...notes, [incidentId]: await r.json() });
  }
  async function addNote(incidentId: string) {
    const value = noteInputs[incidentId]?.trim();
    if (!value) return;
    await request(`/incidents/${incidentId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note: value }),
    });
    setNoteInputs({ ...noteInputs, [incidentId]: "" });
    loadNotes(incidentId);
  }
  async function downloadCsv(){const response=await request(`/monitors/${id}/checks.csv`);if(!response.ok)return;const blob=await response.blob();const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`${(monitor?.name||"monitor").toLowerCase().replace(/[^a-z0-9]+/g,"-")}-checks.csv`;anchor.click();URL.revokeObjectURL(url)}
  async function addMaintenance(event:React.FormEvent){event.preventDefault();const response=await request(`/monitors/${id}/maintenance`,{method:"POST",body:JSON.stringify({startsAt:new Date(maintenanceForm.startsAt).toISOString(),endsAt:new Date(maintenanceForm.endsAt).toISOString(),reason:maintenanceForm.reason})});if(response.ok){setMaintenanceForm({startsAt:"",endsAt:"",reason:""});load()}else setMessage("Could not schedule maintenance.")}
  async function removeMaintenance(windowId:string){await request(`/maintenance/${windowId}`,{method:"DELETE"});load()}
  async function toggleMonitoring(){if(!monitor)return;const response=await request(`/monitors/${id}`,{method:"PATCH",body:JSON.stringify({enabled:!monitor.enabled})});if(response.ok)load();else setMessage("Could not change monitor state.")}
  return (
    <main className="page-shell">
      <header className="sub-header">
        <Logo />
        <div className="monitor-header-actions">
          <button
            type="button"
            className="monitor-back"
            aria-label="Go back to previous page"
            title="Go back"
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/dashboard")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </button>
          <AccountMenu />
        </div>
      </header>
      <section className="detail-head">
        <div>
          <p className="eyebrow">MONITOR DETAILS</p>
          <h1>{monitor.name}</h1>
          <a href={monitor.url} target="_blank" rel="noreferrer">
            {monitor.url}
          </a>
        </div>
        <div className="detail-state-actions">
          <button className={`monitor-state-button ${monitor.enabled ? "pause" : "resume"}`} onClick={toggleMonitoring}>{monitor.enabled ? "Pause monitoring" : "Resume monitoring"}</button>
          <div className={`status-pill ${monitor.enabled ? monitor.status : "paused"}`}>
            ● {monitor.enabled ? monitor.status : "paused"}
          </div>
        </div>
      </section>
      <section className="detail-stats">
        <article>
          <span>Uptime</span>
          <b>{monitor.uptime ?? "—"}%</b>
        </article>
        <article>
          <span>Average latency</span>
          <b>{monitor.averageLatency ?? "—"} ms <LatencyBadge ms={monitor.averageLatency} /></b>
        </article>
        <article>
          <span>Total checks</span>
          <b>{(monitor as any).checkCount ?? 0}</b>
        </article>
        <article>
          <span>Current state</span>
          <b>{monitor.enabled ? "Active" : "Paused"}</b>
        </article>
        <article>
          <span>SLA target</span>
          <b className={(monitor.uptime??100)>=(monitor.slaTarget??99.9)?"green":"red"}>{monitor.slaTarget??99.9}%</b>
        </article>
        <article>
          <span>SSL certificate</span>
          <b className={monitor.sslExpiresAt&&new Date(monitor.sslExpiresAt).getTime()-Date.now()<14*86400000?"red":""}>{monitor.sslExpiresAt?`${Math.max(0,Math.ceil((new Date(monitor.sslExpiresAt).getTime()-Date.now())/86400000))} days`:"—"}</b>
        </article>
      </section>
      <section className="detail-grid">
        <div className="panel wide">
          <div className="chart-title-row"><div><h2>Latency</h2><small>Response time over selected period</small></div><div className="range-selector" aria-label="Latency chart time range">{(["1h","24h","7d"] as TimeRange[]).map(range=><button key={range} className={timeRange===range?"active":""} onClick={()=>setTimeRange(range)}>{range}</button>)}</div></div>
          <LatencyChart checks={checks} range={timeRange} />
        </div>
        <div className="panel">
          <h2>Configuration</h2>
          <form className="config-form" onSubmit={save}>
            <label>
              Name
              <input
                value={monitor.name}
                onChange={(e) =>
                  setMonitor({ ...monitor, name: e.target.value })
                }
              />
            </label>
            <label>
              URL
              <input
                value={monitor.url}
                onChange={(e) =>
                  setMonitor({ ...monitor, url: e.target.value })
                }
              />
            </label>
            <div className="form-row">
              <label>
                Method
                <select
                  value={monitor.method}
                  onChange={(e) =>
                    setMonitor({ ...monitor, method: e.target.value })
                  }
                >
                  {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map(
                    (x) => (
                      <option key={x}>{x}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Expected status
                <input
                  type="number"
                  value={monitor.expectedStatus}
                  onChange={(e) =>
                    setMonitor({
                      ...monitor,
                      expectedStatus: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Interval (seconds)
                <input
                  type="number"
                  min="10"
                  value={monitor.intervalSeconds}
                  onChange={(e) =>
                    setMonitor({
                      ...monitor,
                      intervalSeconds: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Timeout (ms)
                <input
                  type="number"
                  value={monitor.timeoutMs}
                  onChange={(e) =>
                    setMonitor({
                      ...monitor,
                      timeoutMs: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label>
              Failure threshold
              <input
                type="number"
                min="1"
                max="10"
                value={monitor.failureThreshold}
                onChange={(e) =>
                  setMonitor({
                    ...monitor,
                    failureThreshold: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              SLA target (%)
              <input type="number" min="0" max="100" step="0.01" value={monitor.slaTarget??99.9} onChange={(e)=>setMonitor({...monitor,slaTarget:Number(e.target.value)})}/>
            </label>
            <label>
              Headers (JSON)
              <textarea
                rows={4}
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
              />
            </label>
            {!["GET", "HEAD"].includes(monitor.method || "GET") && (
              <label>
                Request body
                <textarea
                  rows={4}
                  value={monitor.body || ""}
                  onChange={(e) =>
                    setMonitor({ ...monitor, body: e.target.value })
                  }
                />
              </label>
            )}
            <label className="toggle">
              <input
                type="checkbox"
                checked={monitor.enabled}
                onChange={(e) =>
                  setMonitor({ ...monitor, enabled: e.target.checked })
                }
              />{" "}
              Monitoring enabled
            </label>
            <label className="toggle">
              <input type="checkbox" checked={monitor.publicEnabled??false} onChange={(e)=>setMonitor({...monitor,publicEnabled:e.target.checked})}/>{" "}
              Public status page enabled
            </label>
            {monitor.publicEnabled&&monitor.publicSlug&&<a className="public-status-link" href={`/status/${monitor.publicSlug}`} target="_blank" rel="noreferrer">Open public status page ↗</a>}
            {message && <p className="form-message">{message}</p>}
            <button className="primary">Save configuration</button>
          </form>
        </div>
        <div className="panel wide maintenance-panel">
          <h2>Maintenance windows</h2>
          <form className="maintenance-form" onSubmit={addMaintenance}><label>Starts<input required type="datetime-local" value={maintenanceForm.startsAt} onChange={(e)=>setMaintenanceForm({...maintenanceForm,startsAt:e.target.value})}/></label><label>Ends<input required type="datetime-local" value={maintenanceForm.endsAt} onChange={(e)=>setMaintenanceForm({...maintenanceForm,endsAt:e.target.value})}/></label><label>Reason<input placeholder="Database upgrade" value={maintenanceForm.reason} onChange={(e)=>setMaintenanceForm({...maintenanceForm,reason:e.target.value})}/></label><button className="primary">Schedule</button></form>
          <div className="maintenance-list">{maintenance.length===0?<p className="muted">No maintenance windows scheduled.</p>:maintenance.map(w=><article key={w.id}><div><b>{w.reason||"Scheduled maintenance"}</b><small>{time(w.startsAt)} → {time(w.endsAt)}</small></div><button onClick={()=>removeMaintenance(w.id)}>Remove</button></article>)}</div>
        </div>
        <div className="panel wide">
          <div className="panel-title-row">
            <h2>Recent checks</h2>
            <button className="export-csv" onClick={downloadCsv}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4h12v12H4zM4 9h12M9 4v12M14 18h6M17 15l3 3-3 3" />
              </svg>
              Export CSV
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>HTTP</th>
                  <th>Latency</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {checks
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((c, i) => (
                    <tr key={i}>
                      <td>{time(c.checkedAt)}</td>
                      <td className={c.success ? "green" : "red"}>
                        {c.success ? "Success" : "Failed"}
                      </td>
                      <td>{c.statusCode ?? "—"}</td>
                      <td><span className={`latency-value ${latencyBand(c.latencyMs).tone}`}>{c.latencyMs} ms</span></td>
                      <td>{c.error ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel wide">
          <h2>Incident timeline</h2>
          {incidents.length === 0 ? (
            <p className="muted">No incidents recorded.</p>
          ) : (
            <div className="incident-list">
              {incidents.map((i) => (
                <article className={`incident-card ${i.severity || "major"}`} key={i.id}>
                  <div className="incident-top">
                    <div>
                      <b>
                        {i.resolvedAt ? "Resolved incident" : "Active incident"}
                      </b>
                      <span className={`severity-badge ${i.severity || "major"}`}>{i.severity || "major"}</span>
                      <small>
                        {time(i.startedAt)} · {duration(i.durationSeconds)}
                      </small>
                    </div>
                    <span>{i.cause || "Check failure"}</span>
                  </div>
                  <div className="incident-actions">
                    {!i.acknowledgedAt && (
                      <button onClick={() => action(i.id, "acknowledge")}>
                        Acknowledge
                      </button>
                    )}
                    {!i.resolvedAt && (
                      <button onClick={() => action(i.id, "resolve")}>
                        Resolve manually
                      </button>
                    )}
                    <button onClick={() => loadNotes(i.id)}>Show notes</button>
                  </div>
                  {notes[i.id] && (
                    <div className="notes">
                      {notes[i.id].map((n) => (
                        <p key={n.id}>
                          <b>{n.authorName || "Former user"}</b> {n.note}
                          <small>{time(n.createdAt)}</small>
                        </p>
                      ))}
                      <div>
                        <input
                          placeholder="Add investigation note…"
                          value={noteInputs[i.id] || ""}
                          onChange={(e) =>
                            setNoteInputs({
                              ...noteInputs,
                              [i.id]: e.target.value,
                            })
                          }
                        />
                        <button onClick={() => addNote(i.id)}>Add note</button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export function Profile() {
  const navigate=useNavigate();
  const [user, setUser] = useState<User | null>(null),
    [currentPassword, setCurrent] = useState(""),
    [newPassword, setNew] = useState(""),
    [confirmPassword,setConfirmPassword] = useState(""),
    [deletePassword,setDeletePassword] = useState(""),
    [deleting,setDeleting] = useState(false),
    [apiKeys,setApiKeys] = useState<ApiKey[]>([]),
    [keyName,setKeyName] = useState(""),
    [revealedKey,setRevealedKey] = useState(""),
    [keyCopied,setKeyCopied] = useState(false),
    [message, setMessage] = useState("");
  async function loadApiKeys(){const response=await request("/auth/api-keys");if(response.ok)setApiKeys(await response.json())}
  useEffect(() => {
    request("/auth/me")
      .then((r) => r.json())
      .then((data)=>setUser({...data,phoneCountryCode:data.phoneCountryCode||"+91"}));
    loadApiKeys();
  }, []);
  if (!user) return <main className="page-shell">Loading…</main>;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await request("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(user),
      }),
      d = await r.json();
    if (r.ok) {
      localStorage.setItem("fluct_user", JSON.stringify(d.user));
      localStorage.setItem("fluct_token", d.token);
      setMessage("Profile updated.");
    } else setMessage(d.error);
  }
  async function password(e: React.FormEvent) {
    e.preventDefault();
    if(newPassword!==confirmPassword){setMessage("New passwords do not match.");return;}
    const r = await request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
      d = await r.json();
    setMessage(r.ok ? "Password changed." : d.error);
    if (r.ok) {
      setCurrent("");
      setNew("");
      setConfirmPassword("");
    }
  }
  async function deleteAccount(e:React.FormEvent){
    e.preventDefault();
    if(!window.confirm("Permanently delete your FLUCT account, monitors, checks, and incidents? This cannot be undone."))return;
    setDeleting(true);
    const response=await request("/auth/me",{method:"DELETE",body:JSON.stringify({currentPassword:deletePassword})});
    if(response.ok){localStorage.removeItem("fluct_token");localStorage.removeItem("fluct_user");window.location.assign("/");return;}
    const data=await response.json();setMessage(data.error||"Could not delete account.");setDeleting(false);
  }
  async function createApiKey(e:React.FormEvent){e.preventDefault();const response=await request("/auth/api-keys",{method:"POST",body:JSON.stringify({name:keyName})});const data=await response.json();if(!response.ok){setMessage(data.error||"Could not create API key.");return}setKeyCopied(false);setRevealedKey(data.key);setKeyName("");setMessage("");loadApiKeys()}
  async function revokeApiKey(key:ApiKey){if(!window.confirm(`Revoke the API key “${key.name}”? Applications using it will immediately stop working.`))return;const response=await request(`/auth/api-keys/${key.id}`,{method:"DELETE"});if(response.ok){if(revealedKey.startsWith(key.keyPrefix.replace("…","")))setRevealedKey("");loadApiKeys()}}
  async function copyApiKey(){await navigator.clipboard.writeText(revealedKey);setKeyCopied(true)}
  return (
    <main className="page-shell">
      <header className="sub-header">
        <Logo />
        <button type="button" className="monitor-back" aria-label="Go back to previous page" title="Go back" onClick={()=>window.history.length>1?navigate(-1):navigate("/dashboard")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
        </button>
      </header>
      <section className="settings-page">
        <p className="eyebrow">ACCOUNT SETTINGS</p>
        <h1>Your profile</h1>
        {message && <p className="form-message">{message}</p>}
        <div className="settings-grid">
          <form className="panel config-form" onSubmit={save}>
            <h2>Personal details</h2>
            <label>
              Name
              <input
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
              />
            </label>
            <label>
              Phone number
              <div className="phone-field">
                <select aria-label="Phone country code" value={user.phoneCountryCode||""} onChange={(e)=>setUser({...user,phoneCountryCode:e.target.value||null})}>
                  <option value="">Country code</option>
                  {COUNTRY_CODES.map(([country,code])=><option key={country} value={code}>{country} ({code})</option>)}
                </select>
                <input inputMode="tel" placeholder="Phone number" value={user.phoneNumber||""} onChange={(e)=>setUser({...user,phoneNumber:e.target.value})}/>
              </div>
            </label>
            <button className="primary">Save profile</button>
          </form>
          <form className="panel config-form" onSubmit={password}>
            <h2>Change password</h2>
            <label>
              Current password
              <input
                required
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </label>
            <label>
              New password
              <input
                required
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
              />
            </label>
            <label>
              Confirm new password
              <input required type="password" minLength={8} value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)}/>
            </label>
            <button className="primary">Change password</button>
          </form>
          <section className="panel api-keys-panel">
            <div className="api-keys-heading"><div><p className="eyebrow">DEVELOPER ACCESS</p><h2>API keys</h2><p>Use a key to manage your FLUCT monitors from scripts, CI jobs, or another application.</p></div><span>{apiKeys.length}/10 active</span></div>
            <form className="api-key-create" onSubmit={createApiKey}><label>Key name<input required minLength={2} maxLength={60} placeholder="CI deployment" value={keyName} onChange={(e)=>setKeyName(e.target.value)}/></label><button className="primary">Create API key</button></form>
            <div className="api-example"><span>Example request</span><code>curl -H "Authorization: Bearer YOUR_API_KEY" {API}/monitors</code></div>
            <div className="api-key-list">{apiKeys.length===0?<p className="muted">No API keys created yet.</p>:apiKeys.map(key=><article key={key.id}><div><b>{key.name}</b><code>{key.keyPrefix}</code><small>Created {time(key.createdAt)} · {key.lastUsedAt?`Last used ${time(key.lastUsedAt)}`:"Never used"}</small></div><button onClick={()=>revokeApiKey(key)}>Revoke</button></article>)}</div>
          </section>
          {revealedKey&&<div className="api-key-modal-backdrop" role="presentation"><section className="api-key-modal" role="dialog" aria-modal="true" aria-labelledby="api-key-created-title"><span className="key-success-icon">✓</span><p className="eyebrow">API KEY CREATED</p><h2 id="api-key-created-title">Copy this now, it won't be shown again.</h2><p>Store this key somewhere secure. FLUCT only stores its hash and cannot recover the full value after you close this window.</p><div className="modal-key-value"><code>{revealedKey}</code><button onClick={copyApiKey}>{keyCopied?"Copied ✓":"Copy key"}</button></div><div className="key-modal-warning"><b>Keep it secret</b><span>Anyone with this key can manage your monitors and incidents.</span></div><button className="key-modal-done" onClick={()=>{setRevealedKey("");setKeyCopied(false)}}>{keyCopied?"I’ve saved it":"I understand, close"}</button></section></div>}
          <form className="panel danger-zone" onSubmit={deleteAccount}>
            <div><p className="eyebrow">DANGER ZONE</p><h2>Delete account</h2><p>Permanently remove your account, monitors, checks, incidents, and saved settings.</p></div>
            <label>Current password<input required type="password" value={deletePassword} onChange={(e)=>setDeletePassword(e.target.value)} placeholder="Confirm with your password"/></label>
            <button className="delete-account" disabled={deleting}>{deleting?"Deleting…":"Delete my account"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState(""),
    [result, setResult] = useState<any>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setResult(await r.json());
  }
  return (
    <main className="simple-auth">
      <Logo />
      <form className="auth-box" onSubmit={submit}>
        <Link className="auth-back-inline" to="/login">← Back to login</Link>
        <p className="eyebrow">PASSWORD RECOVERY</p>
        <h2>Reset your password.</h2>
        <p>Enter your account email to create a secure reset link.</p>
        <label>
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="primary" style={{ alignSelf: "center", width: "60%", padding: "15px 32px", marginTop: "16px" }}>Create reset link</button>
        {result && (
          <div className="reset-result">
            <p>{result.message}</p>
          </div>
        )}
      </form>
    </main>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams(),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: params.get("token"), password }),
      }),
      d = await r.json();
    setMessage(r.ok ? "Password reset. You can now log in." : d.error);
  }
  return (
    <main className="simple-auth">
      <Logo />
      <form className="auth-box" onSubmit={submit}>
        <p className="eyebrow">CHOOSE A NEW PASSWORD</p>
        <h2>Almost there.</h2>
        <label>
          New password
          <input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="primary">Reset password</button>
        {message && <p className="form-message">{message}</p>}
        <Link className="auth-switch" to="/login">
          Back to login
        </Link>
      </form>
    </main>
  );
}

export function PublicStatus(){
  const {slug}=useParams();const [data,setData]=useState<any>(null),[missing,setMissing]=useState(false);
  useEffect(()=>{fetch(`${API}/public/status/${slug}`).then(async r=>{if(!r.ok){setMissing(true);return}setData(await r.json())})},[slug]);
  if(missing)return <main className="public-status"><Logo/><section><h1>Status page not found</h1><p>This page may be private or unavailable.</p></section></main>;
  if(!data)return <main className="public-status"><Logo/><section><p>Loading status…</p></section></main>;
  const operational=data.status==='up'&&!data.maintenance;
  return <main className="public-status"><header><Logo/><span>Powered by FLUCT</span></header><section className="public-status-hero"><p className="eyebrow">LIVE SERVICE STATUS</p><h1>{data.name}</h1><div className={`public-state ${operational?'up':data.maintenance?'maintenance':'down'}`}>● {data.maintenance?'Scheduled maintenance':operational?'All systems operational':'Service disruption'}</div></section><section className="public-metrics"><article><span>30-day uptime</span><b>{data.uptime??'—'}%</b></article><article><span>Average latency</span><b>{data.averageLatency??'—'} ms</b></article><article><span>SLA target</span><b>{data.slaTarget}%</b></article><article><span>SSL expires</span><b>{data.sslExpiresAt?new Date(data.sslExpiresAt).toLocaleDateString():'—'}</b></article></section><section className="public-incidents"><h2>Recent incidents</h2>{data.incidents.length===0?<div className="public-clear">✓ No incidents reported in this period.</div>:data.incidents.map((i:any,index:number)=><article key={index}><span className={i.resolvedAt?'resolved':'active'}/><div><b>{i.resolvedAt?'Resolved incident':'Active incident'}</b><p>{i.cause||'Service interruption'}</p><small>{time(i.startedAt)}{i.resolvedAt?` — resolved ${time(i.resolvedAt)}`:''}</small></div></article>)}</section></main>
}
