import { useState, useEffect, useCallback, useMemo } from "react";

const DEF_TEAM = {
  admin: { name: "Stan", role: "admin", password: "papagal", color: "#16A34A" },
  mara: { name: "Mara", role: "pm", password: "mara2024", color: "#2563EB", team: ["sonia", "denisa", "alexandra", "oana"] },
  carla: { name: "Carla", role: "pm", password: "carla2024", color: "#DB2777", team: ["dana", "mara_poze"] },
  sonia: { name: "Sonia", role: "member", password: "sonia2024", color: "#059669", pm: "mara" },
  denisa: { name: "Denisa", role: "member", password: "denisa2024", color: "#D97706", pm: "mara" },
  alexandra: { name: "Alexandra", role: "member", password: "alexandra2024", color: "#7C3AED", pm: "mara" },
  oana: { name: "Oana", role: "member", password: "oana2024", color: "#EA580C", pm: "mara" },
  dana: { name: "Dana", role: "member", password: "dana2024", color: "#DC2626", pm: "carla" },
  mara_poze: { name: "Mara Poze", role: "member", password: "marapoze2024", color: "#0891B2", pm: "carla" },
};
const DEF_SHOPS = ["Grandia", "Bonhaus", "Casa Ofertelor", "Gento", "MagDeal", "Reduceri Bune", "Apreciat"];
const STATUSES = ["To Do", "In Progress", "Review", "Done"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const PLATFORMS = ["Meta Ads", "TikTok Ads", "Google Ads", "Shopify", "Creativ", "UGC", "Foto Produs", "Altele"];
const TASK_TYPES = ["Ad Creation", "Product Launch", "Creative", "Copy", "Landing Page", "Tracking/Pixel", "Raportare", "General"];
const ROLES = ["admin", "pm", "member"];
const COLORS = ["#16A34A", "#2563EB", "#DB2777", "#059669", "#D97706", "#7C3AED", "#EA580C", "#DC2626", "#0891B2", "#6366F1", "#EC4899", "#14B8A6"];
const PC = { Low: "#94A3B8", Normal: "#2563EB", High: "#EA580C", Urgent: "#DC2626" };
const SC = { "To Do": "#94A3B8", "In Progress": "#2563EB", Review: "#D97706", Done: "#16A34A" };
const SI = { "To Do": "o", "In Progress": "~", Review: "?", Done: "*" };
const GR = "#0C7E3E";

function ls(k, d) { try { var v = localStorage.getItem("s6_" + k); return v ? JSON.parse(v) : d; } catch(e) { return d; } }
function ss(k, v) { localStorage.setItem("s6_" + k, JSON.stringify(v)); }
function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function ts() { return new Date().toISOString(); }
function ds(d) { var x = typeof d === "string" ? new Date(d) : d; return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
var TD = ds(new Date());
var TM = (function() { var d = new Date(); d.setDate(d.getDate() + 1); return ds(d); })();
var MN = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fd(i) { if (!i) return ""; var d = new Date(i); return d.getDate() + " " + MN[d.getMonth()]; }
function ff(i) { if (!i) return ""; var d = new Date(i); return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" }) + " " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }); }
function fr(i) { if (!i) return "-"; var df = Date.now() - new Date(i).getTime(); if (df < 60000) return "Acum"; if (df < 3600000) return Math.floor(df / 60000) + "m"; if (df < 86400000) return Math.floor(df / 3600000) + "h"; return fd(i); }
function isTd(i) { return i && ds(i) === TD; }
function isTm(i) { return i && ds(i) === TM; }
function isP(i) { return i && ds(i) < TD; }
function isF(i) { return i && ds(i) > TM; }
function isOv(t) { return isP(t.deadline) && t.status !== "Done"; }
function ft(s) { if (!s) return "0:00"; var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60; return (h ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(sc).padStart(2, "0"); }
function dl(i) { if (!i) return "Fara data"; if (isTd(i)) return "Azi"; if (isTm(i)) return "Maine"; if (isP(i)) return "Trecut"; return fd(i); }

function Ic({ d, size, color }) {
  return <svg width={size || 20} height={size || 20} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
}
var Icons = {
  tasks: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></>,
  kanban: <><rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="5" height="8" rx="1.5"/></>,
  dash: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  work: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></>,
  team: <><circle cx="9" cy="7" r="3"/><path d="M13 21v-2a4 4 0 00-8 0v2"/><circle cx="17" cy="10" r="2"/><path d="M21 21v-1.5a3 3 0 00-4-2.8"/></>,
  perf: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  log: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  shops: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  usrs: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></>,
  prod: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  out: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  play: <><polygon points="5 3 19 12 5 21 5 3"/></>,
  stop: <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
  edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  del: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
  link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
  x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  eyeX: <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></>,
  menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  ext: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
  back: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
};

var CSS = [
  "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
  "body{margin:0;background:#FAFAFA;font-family:system-ui,-apple-system,sans-serif}",
  "::selection{background:#0C7E3E22}",
  "input:focus,select:focus,textarea:focus{border-color:#0C7E3E !important;outline:none;box-shadow:0 0 0 3px #0C7E3E18}",
  "::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:10px}",
  "button{cursor:pointer;font-family:inherit}button:hover{opacity:0.9}",
  "a{text-decoration:none}",
  "@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}",
  "@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}",
].join("\n");

function Badge({ bg, color, children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: bg, color: color, whiteSpace: "nowrap" }}>{children}</span>;
}
function Av({ color, size, fs, children }) {
  return <div style={{ width: size || 32, height: size || 32, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs || 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{children}</div>;
}
function Card({ children, style }) {
  return <div style={{ background: "#fff", border: "1px solid hsl(214,18%,90%)", borderRadius: 10, padding: 16, animation: "fadeUp 0.2s ease", ...style }}>{children}</div>;
}

export default function App() {
  var [team, setTeam] = useState(ls("team", DEF_TEAM));
  var [user, setUser] = useState(ls("user", null));
  var [tasks, setTasks] = useState(ls("tasks", []));
  var [logs, setLogs] = useState(ls("logs", []));
  var [sessions, setSessions] = useState(ls("sessions", {}));
  var [shops, setShops] = useState(ls("shops", DEF_SHOPS));
  var [products, setProducts] = useState(ls("products", []));
  var [timers, setTimers] = useState(ls("timers", {}));
  var [page, setPage] = useState("dashboard");
  var [showAdd, setShowAdd] = useState(false);
  var [editTask, setEditTask] = useState(null);
  var [mobNav, setMobNav] = useState(false);
  var [isMob, setIsMob] = useState(typeof window !== "undefined" && window.innerWidth < 820);
  var [dateF, setDateF] = useState("all");
  var [statusF, setStatusF] = useState("all");
  var [prioF, setPrioF] = useState("all");
  var [assignF, setAssignF] = useState("all");
  var [shopF, setShopF] = useState("all");
  var [tick, setTick] = useState(0);
  var [dragId, setDragId] = useState(null);
  var [profUser, setProfUser] = useState(null);
  var [profRange, setProfRange] = useState("all");

  useEffect(function() { var h = function() { setIsMob(window.innerWidth < 820); }; window.addEventListener("resize", h); return function() { window.removeEventListener("resize", h); }; }, []);
  useEffect(function() { ss("team", team); }, [team]);
  useEffect(function() { ss("tasks", tasks); }, [tasks]);
  useEffect(function() { ss("logs", logs); }, [logs]);
  useEffect(function() { ss("sessions", sessions); }, [sessions]);
  useEffect(function() { ss("shops", shops); }, [shops]);
  useEffect(function() { ss("products", products); }, [products]);
  useEffect(function() { ss("timers", timers); }, [timers]);
  useEffect(function() { var iv = setInterval(function() { setTick(function(t) { return t + 1; }); }, 1000); return function() { clearInterval(iv); }; }, []);
  useEffect(function() { if (!user) return; var fn = function() { setSessions(function(p) { var n = Object.assign({}, p); n[user] = ts(); ss("sessions", n); return n; }); }; fn(); var iv = setInterval(fn, 30000); return function() { clearInterval(iv); }; }, [user]);

  var addLog = useCallback(function(a, d) { setLogs(function(p) { return [{ id: id(), user: user || "?", action: a, detail: d, time: ts() }].concat(p).slice(0, 500); }); }, [user]);

  var handleLogin = function(u, pw) { var t = team[u]; if (!t || t.password !== pw) return false; setUser(u); ss("user", u); addLog("LOGIN", t.name + " a intrat"); return true; };
  var handleLogout = function() { if (user) addLog("LOGOUT", (team[user] ? team[user].name : "") + " a iesit"); setUser(null); ss("user", null); setPage("dashboard"); };

  var visUsers = useMemo(function() { if (!user) return []; var m = team[user]; if (!m) return []; if (m.role === "admin") return Object.keys(team); if (m.role === "pm") return [user].concat(m.team || []); return [user]; }, [user, team]);
  var assUsers = useMemo(function() { if (!user) return []; var m = team[user]; if (!m) return []; if (m.role === "admin") return Object.keys(team).filter(function(k) { return k !== "admin"; }); if (m.role === "pm") return m.team || []; return [user]; }, [user, team]);
  var visTasks = useMemo(function() { return tasks.filter(function(t) { return visUsers.includes(t.assignee) || visUsers.includes(t.createdBy); }); }, [tasks, visUsers]);

  var filtered = useMemo(function() {
    return visTasks.filter(function(t) {
      if (statusF !== "all" && t.status !== statusF) return false;
      if (prioF !== "all" && t.priority !== prioF) return false;
      if (assignF !== "all" && t.assignee !== assignF) return false;
      if (shopF !== "all" && t.shop !== shopF) return false;
      if (dateF === "today" && !isTd(t.deadline)) return false;
      if (dateF === "tomorrow" && !isTm(t.deadline)) return false;
      if (dateF === "overdue" && !isOv(t)) return false;
      if (dateF === "upcoming" && !isF(t.deadline)) return false;
      if (dateF === "nodate" && t.deadline) return false;
      return true;
    });
  }, [visTasks, statusF, prioF, assignF, shopF, dateF]);

  var grouped = useMemo(function() {
    var s = filtered.slice().sort(function(a, b) { if (!a.deadline && !b.deadline) return 0; if (!a.deadline) return 1; if (!b.deadline) return -1; return a.deadline < b.deadline ? -1 : 1; });
    var g = {}; s.forEach(function(t) { var k = t.deadline ? ds(t.deadline) : "nodate"; if (!g[k]) g[k] = []; g[k].push(t); });
    return Object.keys(g).sort(function(a, b) { if (a === "nodate") return 1; if (b === "nodate") return -1; return a < b ? -1 : 1; }).map(function(k) { return { key: k, label: k === "nodate" ? "Fara deadline" : dl(k + "T00:00:00"), date: k, tasks: g[k] }; });
  }, [filtered]);

  var stats = useMemo(function() {
    var s = { total: visTasks.length, today: 0, overdue: 0, inProg: 0, done: 0, review: 0 };
    visTasks.forEach(function(t) { if (isTd(t.deadline)) s.today++; if (isOv(t)) s.overdue++; if (t.status === "In Progress") s.inProg++; if (t.status === "Done") s.done++; if (t.status === "Review") s.review++; });
    return s;
  }, [visTasks]);

  var getPerf = useCallback(function(u) {
    var ut = tasks.filter(function(t) { return t.assignee === u; }); var tot = ut.length;
    if (!tot) return { score: 0, done: 0, total: 0, active: 0, overdue: 0, review: 0, avgTime: 0 };
    var dn = ut.filter(function(t) { return t.status === "Done"; }).length;
    var ac = ut.filter(function(t) { return t.status === "In Progress"; }).length;
    var rv = ut.filter(function(t) { return t.status === "Review"; }).length;
    var od = ut.filter(function(t) { return isOv(t); }).length;
    var tT = 0; ut.filter(function(t) { return t.status === "Done"; }).forEach(function(t) { var tm = timers[t.id]; if (tm) tT += tm.total; });
    var avg = dn ? Math.round(tT / dn) : 0;
    var sc = Math.max(0, Math.min(100, Math.round(((dn * 3 + ac + rv * 0.5) / (tot * 3)) * 100 - od * 12)));
    return { score: sc, done: dn, total: tot, active: ac, overdue: od, review: rv, avgTime: avg };
  }, [tasks, timers]);

  var getTS = function(tid) { var tm = timers[tid]; if (!tm) return 0; if (tm.running && tm.startedAt) return tm.total + Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000); return tm.total; };

  var togTimer = function(tid) {
    setTimers(function(p) {
      var tm = p[tid] || { running: false, total: 0, startedAt: null };
      var n = Object.assign({}, p);
      if (tm.running) {
        var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0;
        n[tid] = { running: false, total: tm.total + el, startedAt: null };
      } else {
        n[tid] = { running: true, total: tm.total, startedAt: ts() };
      }
      return n;
    });
    var t = tasks.find(function(x) { return x.id === tid; });
    var tm = timers[tid];
    addLog("TIMER", (tm && tm.running ? "Stop" : "Start") + " timer: " + (t ? t.title : ""));
  };

  var saveTask = function(t) {
    if (t.id) {
      setTasks(function(p) { return p.map(function(x) { return x.id === t.id ? Object.assign({}, t, { updatedAt: ts() }) : x; }); });
      addLog("EDIT", (team[user] ? team[user].name : "") + " a editat \"" + t.title + "\"");
    } else {
      var nt = Object.assign({}, t, { id: id(), createdBy: user, createdAt: ts(), updatedAt: ts() });
      setTasks(function(p) { return [nt].concat(p); });
      addLog("NEW", (team[user] ? team[user].name : "") + " -> \"" + t.title + "\" -> " + (team[t.assignee] ? team[t.assignee].name : ""));
    }
    setShowAdd(false); setEditTask(null);
  };

  var delTask = function(tid) { var t = tasks.find(function(x) { return x.id === tid; }); if (t) addLog("DELETE", (team[user] ? team[user].name : "") + " a sters \"" + t.title + "\""); setTasks(function(p) { return p.filter(function(x) { return x.id !== tid; }); }); };

  var dupTask = function(t) {
    var nt = Object.assign({}, t, { id: id(), title: t.title + " (copie)", status: "To Do", createdBy: user, createdAt: ts(), updatedAt: ts() });
    setTasks(function(p) { return [nt].concat(p); });
    addLog("DUPLICATE", (team[user] ? team[user].name : "") + " a duplicat \"" + t.title + "\"");
  };

  var chgSt = function(tid, st) {
    setTasks(function(p) { return p.map(function(x) { return x.id === tid ? Object.assign({}, x, { status: st, updatedAt: ts() }) : x; }); });
    var t = tasks.find(function(x) { return x.id === tid; }); if (t) addLog("STATUS", "\"" + t.title + "\" -> " + st);
    if (st === "Done") { var tm = timers[tid]; if (tm && tm.running) { var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0; setTimers(function(p) { var n = Object.assign({}, p); n[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null }; return n; }); } }
  };

  var handleDrop = function(st) { if (!dragId) return; chgSt(dragId, st); setDragId(null); };

  if (!user) return <LoginScreen team={team} onLogin={handleLogin} />;
  var me = team[user]; if (!me) { setUser(null); ss("user", null); return null; }
  var canCreate = me.role === "admin" || me.role === "pm";
  var isAdmin = me.role === "admin";

  if (profUser) {
    return (
      <div style={S.app}><style>{CSS}</style>
        <ProfileView pu={profUser} team={team} tasks={tasks} timers={timers} getTS={getTS} logs={logs} sessions={sessions} getPerf={getPerf} range={profRange} setRange={setProfRange} onBack={function() { setProfUser(null); }} isMob={isMob} />
      </div>
    );
  }

  var fProps = { stats: stats, dateF: dateF, setDateF: setDateF, statusF: statusF, setStatusF: setStatusF, prioF: prioF, setPrioF: setPrioF, assignF: assignF, setAssignF: setAssignF, shopF: shopF, setShopF: setShopF, visUsers: visUsers, shops: shops, count: filtered.length, team: team };

  var navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.dash, onlyAdmin: true },
    { id: "tasks", label: "Taskuri", icon: Icons.tasks, count: stats.total },
    { id: "kanban", label: "Kanban Board", icon: Icons.kanban },
    { id: "workload", label: "Workload", icon: Icons.work },
    { id: "team", label: "Echipa", icon: Icons.team },
    { id: "performance", label: "Performance", icon: Icons.perf },
    { id: "log", label: "Activity Log", icon: Icons.log },
    { id: "shops", label: "Magazine", icon: Icons.shops },
    { id: "products", label: "Produse", icon: Icons.prod },
  ];
  if (isAdmin) navItems.push({ id: "manage_users", label: "Manage Users", icon: Icons.usrs });

  return (
    <div style={S.app}><style>{CSS}</style>
      {isMob && mobNav && <div style={S.overlay} onClick={function() { setMobNav(false); }} />}
      <aside style={Object.assign({}, S.sidebar, isMob ? { position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 200, transform: mobNav ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.2s" } : {})}>
        <div style={S.logoArea}><span style={S.logoH}>HeyAds</span><span style={S.logoSub}>TASK MANAGER</span></div>
        {canCreate && <div style={{ padding: "0 16px", marginBottom: 4 }}><button style={S.newBtn} onClick={function() { setEditTask(null); setShowAdd(true); setMobNav(false); }}><Ic d={Icons.plus} size={16} color="#fff" /> New Task</button></div>}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {navItems.filter(function(n) { return !n.onlyAdmin || isAdmin; }).map(function(n) {
            return (
              <div key={n.id} style={S.navItem(page === n.id)} onClick={function() { setPage(n.id); setMobNav(false); }}>
                <Ic d={n.icon} size={18} color={page === n.id ? "#4ADE80" : "#7A8BA0"} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.count != null && <span style={S.navBadge}>{n.count}</span>}
              </div>
            );
          })}
        </nav>
        <div style={S.sidebarUser}><Av color={me.color} size={32}>{me.name[0]}</Av><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#D1D9E6" }}>{me.name}</div><div style={{ fontSize: 10, color: "#7A8BA0", textTransform: "capitalize" }}>{me.role === "pm" ? "Project Manager" : me.role}</div></div></div>
        <div style={{ padding: "0 16px 16px" }}><button style={S.logoutBtn} onClick={handleLogout}><Ic d={Icons.out} size={15} color="#7A8BA0" /> Sign out</button></div>
      </aside>

      <main style={S.main}>
        <header style={S.topbar}>
          {isMob && <button style={S.menuBtn} onClick={function() { setMobNav(true); }}><Ic d={Icons.menu} size={22} color="#475569" /></button>}
          <h1 style={S.pageTitle}>{(navItems.find(function(n) { return n.id === page; }) || {}).label || ""}</h1>
          <div style={{ flex: 1 }} />
          {(page === "tasks" || page === "kanban") && canCreate && <button style={S.primBtn} onClick={function() { setEditTask(null); setShowAdd(true); }}><Ic d={Icons.plus} size={15} color="#fff" /> New Task</button>}
        </header>
        <div style={S.content}>
          {page === "dashboard" && <DashPage stats={stats} tasks={visTasks} team={team} visUsers={visUsers} sessions={sessions} timers={timers} getTS={getTS} getPerf={getPerf} isMob={isMob} onClickUser={setProfUser} />}
          {page === "tasks" && <TasksPage fProps={fProps} grouped={grouped} filtered={filtered} user={user} team={team} onEdit={function(t) { setEditTask(t); setShowAdd(true); }} onDel={delTask} onDup={dupTask} onChgSt={chgSt} isMob={isMob} timers={timers} getTS={getTS} togTimer={togTimer} />}
          {page === "kanban" && <KanbanPage fProps={fProps} tasks={filtered} user={user} team={team} onEdit={function(t) { setEditTask(t); setShowAdd(true); }} onDel={delTask} onDup={dupTask} onChgSt={chgSt} dragId={dragId} setDragId={setDragId} handleDrop={handleDrop} isMob={isMob} timers={timers} getTS={getTS} togTimer={togTimer} />}
          {page === "workload" && <WorkPage users={visUsers} team={team} tasks={visTasks} getPerf={getPerf} timers={timers} getTS={getTS} isMob={isMob} onClickUser={setProfUser} />}
          {page === "team" && <TeamPage users={visUsers} team={team} sessions={sessions} getPerf={getPerf} isMob={isMob} onClickUser={setProfUser} />}
          {page === "performance" && <PerfPage users={visUsers} team={team} getPerf={getPerf} isMob={isMob} />}
          {page === "log" && <LogPage logs={logs} visUsers={visUsers} isMob={isMob} />}
          {page === "shops" && <ListPage title="Magazine" items={shops} setItems={setShops} ph="Magazin nou..." />}
          {page === "products" && <ProdsPage products={products} setProducts={setProducts} />}
          {page === "manage_users" && <UsersPage team={team} setTeam={setTeam} addLog={addLog} />}
        </div>
      </main>
      {showAdd && <TaskModal task={editTask} team={team} assUsers={assUsers} shops={shops} products={products} onSave={saveTask} onClose={function() { setShowAdd(false); setEditTask(null); }} />}
    </div>
  );
}

/* ═══ LOGIN ═══ */
function LoginScreen({ team, onLogin }) {
  var [u, setU] = useState(""); var [p, setP] = useState(""); var [show, setShow] = useState(false); var [err, setErr] = useState("");
  var go = function() { if (!onLogin(u.toLowerCase().trim(), p)) setErr("Username sau parola gresita"); };
  return (
    <div style={S.loginWrap}><style>{CSS}</style><div style={S.loginCard}>
      <div style={{ textAlign: "center", marginBottom: 28 }}><div style={{ fontSize: 28, fontWeight: 800, color: "#4ADE80", letterSpacing: 1 }}>HeyAds</div><div style={{ fontSize: 11, color: "#94A3B8", letterSpacing: 2, marginTop: 4, textTransform: "uppercase" }}>Task Manager</div></div>
      <label style={S.label}>Username</label><input style={S.input} value={u} onChange={function(e) { setU(e.target.value); setErr(""); }} onKeyDown={function(e) { if (e.key === "Enter") go(); }} placeholder="ex: mara, carla, admin" />
      <label style={Object.assign({}, S.label, { marginTop: 14 })}>Parola</label>
      <div style={{ position: "relative" }}><input style={Object.assign({}, S.input, { paddingRight: 42 })} type={show ? "text" : "password"} value={p} onChange={function(e) { setP(e.target.value); setErr(""); }} onKeyDown={function(e) { if (e.key === "Enter") go(); }} placeholder="Introdu parola" /><button type="button" style={S.eyeBtn} onClick={function() { setShow(!show); }}><Ic d={show ? Icons.eyeX : Icons.eye} size={16} color="#94A3B8" /></button></div>
      {err && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 10, textAlign: "center" }}>{err}</div>}
      <button style={Object.assign({}, S.primBtn, { width: "100%", marginTop: 20, padding: "12px 0", fontSize: 14 })} onClick={go}>Intra in platforma</button>
    </div></div>
  );
}

/* ═══ FILTERS ═══ */
function FiltersBar({ stats, dateF, setDateF, statusF, setStatusF, prioF, setPrioF, assignF, setAssignF, shopF, setShopF, visUsers, shops, count, team, noStatus }) {
  var chips = [{ id: "all", l: "Toate" }, { id: "today", l: "Azi", n: stats.today }, { id: "tomorrow", l: "Maine" }, { id: "overdue", l: "Intarziate", n: stats.overdue }, { id: "upcoming", l: "Viitoare" }, { id: "nodate", l: "Fara data" }];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {chips.map(function(c) { return <button key={c.id} onClick={function() { setDateF(c.id); }} style={Object.assign({}, S.chip, { background: dateF === c.id ? GR : "#F1F5F9", color: dateF === c.id ? "#fff" : "#475569", fontWeight: dateF === c.id ? 600 : 400 })}>{c.l}{c.n > 0 && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>({c.n})</span>}</button>; })}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {!noStatus && <select style={S.fSel} value={statusF} onChange={function(e) { setStatusF(e.target.value); }}><option value="all">Status: Toate</option>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>}
        <select style={S.fSel} value={prioF} onChange={function(e) { setPrioF(e.target.value); }}><option value="all">Prioritate: Toate</option>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select>
        <select style={S.fSel} value={assignF} onChange={function(e) { setAssignF(e.target.value); }}><option value="all">Persoana: Toti</option>{visUsers.filter(function(u) { return u !== "admin"; }).map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name || u}</option>; })}</select>
        <select style={S.fSel} value={shopF} onChange={function(e) { setShopF(e.target.value); }}><option value="all">Magazin: Toate</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>{count} taskuri</span>
      </div>
    </div>
  );
}

/* ═══ DASHBOARD ═══ */
function DashPage({ stats, tasks, team, visUsers, sessions, timers, getTS, getPerf, isMob, onClickUser }) {
  var activeTimers = tasks.filter(function(t) { return timers[t.id] && timers[t.id].running; });
  var ppl = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) {
    var ut = tasks.filter(function(t) { return t.assignee === u; });
    var lss = sessions[u]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000;
    var act = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; });
    return { key: u, name: team[u].name, color: team[u].color, role: team[u].role, online: on, lastSeen: lss, act: act, perf: getPerf(u), total: ut.length };
  });
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(6,1fr)", gap: 12, marginBottom: 24 }}>
        {[{ l: "Total", v: stats.total, c: "#475569" }, { l: "Azi", v: stats.today, c: "#2563EB" }, { l: "In Progress", v: stats.inProg, c: "#D97706" }, { l: "Review", v: stats.review, c: "#7C3AED" }, { l: "Intarziate", v: stats.overdue, c: "#DC2626" }, { l: "Done", v: stats.done, c: GR }].map(function(s) {
          return <Card key={s.l} style={{ borderTop: "3px solid " + s.c }}><div style={{ fontSize: 28, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{s.l}</div></Card>;
        })}
      </div>
      {activeTimers.length > 0 && <Card style={{ marginBottom: 20, borderLeft: "3px solid #DC2626" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite" }} /> Live Acum ({activeTimers.length})</h3>
        {activeTimers.map(function(t) { var a = team[t.assignee]; var secs = getTS(t.id); return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
            {a && <Av color={a.color} size={24} fs={10}>{a.name[0]}</Av>}<span style={{ fontSize: 12, color: "#64748B" }}>{a ? a.name : ""}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", flex: 1 }}>{t.title}</span>
            {t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}
            <span style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{ft(secs)}</span>
          </div>
        ); })}
      </Card>}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 12 }}>Echipa</h3>
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(320,1fr))", gap: 12 }}>
        {ppl.map(function(d) { return (
          <Card key={d.key} style={{ cursor: "pointer" }}>
            <div onClick={function() { onClickUser(d.key); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ position: "relative" }}><Av color={d.color} size={38}>{d.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: d.online ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 10, color: "#94A3B8" }}>{d.role === "pm" ? "PM" : "Member"} {d.online ? "- Online" : ""}</div></div>
                <div style={{ fontSize: 18, fontWeight: 700, color: d.perf.score >= 70 ? GR : d.perf.score >= 40 ? "#D97706" : "#DC2626" }}>{d.perf.score}%</div>
              </div>
              {d.act.length > 0 && <div style={{ marginBottom: 6 }}>{d.act.map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#DC2626", padding: "2px 0" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite" }} />{t.title} - {ft(getTS(t.id))}</div>; })}</div>}
              <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#94A3B8" }}><span>{d.total} taskuri</span><span>{d.perf.done} done</span>{d.perf.overdue > 0 && <span style={{ color: "#DC2626" }}>{d.perf.overdue} overdue</span>}</div>
            </div>
          </Card>
        ); })}
      </div>
    </div>
  );
}

/* ═══ PROFILE ═══ */
function ProfileView({ pu, team, tasks, timers, getTS, logs, sessions, getPerf, range, setRange, onBack, isMob }) {
  var m = team[pu]; if (!m) return null;
  var ut = tasks.filter(function(t) { return t.assignee === pu; });
  var lss = sessions[pu]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000;
  var perf = getPerf(pu);
  var uLogs = logs.filter(function(l) { return l.user === pu; }).slice(0, 50);
  var actNow = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; });
  var filt = ut.filter(function(t) {
    if (range === "all") return true;
    if (range === "today") return isTd(t.deadline) || isTd(t.createdAt);
    if (range === "week") return new Date(t.createdAt || t.deadline || 0).getTime() > Date.now() - 7 * 86400000;
    if (range === "month") return new Date(t.createdAt || t.deadline || 0).getTime() > Date.now() - 30 * 86400000;
    return true;
  });
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: isMob ? 16 : 32 }}>
      <button style={Object.assign({}, S.cancelBtn, { marginBottom: 20, display: "flex", alignItems: "center", gap: 6 })} onClick={onBack}><Ic d={Icons.back} size={16} color="#64748B" /> Inapoi</button>
      <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}><Av color={m.color} size={56} fs={22}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2.5px solid #fff" }} /></div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 20, fontWeight: 700 }}>{m.name}</div><div style={{ fontSize: 12, color: "#94A3B8" }}>{m.role === "pm" ? "Project Manager" : m.role} | {on ? "Online" : "Offline - Last: " + fr(lss)}</div></div>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 700, color: perf.score >= 70 ? GR : perf.score >= 40 ? "#D97706" : "#DC2626" }}>{perf.score}%</div><div style={{ fontSize: 10, color: "#94A3B8" }}>Performance</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ l: "Done", v: perf.done, c: GR }, { l: "Active", v: perf.active, c: "#2563EB" }, { l: "Review", v: perf.review, c: "#D97706" }, { l: "Overdue", v: perf.overdue, c: "#DC2626" }].map(function(x) { return <div key={x.l} style={{ textAlign: "center", padding: "4px 12px", background: x.c + "12", borderRadius: 8 }}><div style={{ fontSize: 18, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 9, color: "#94A3B8" }}>{x.l}</div></div>; })}
        </div>
      </Card>
      {actNow.length > 0 && <Card style={{ marginBottom: 16, borderLeft: "3px solid #DC2626" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#DC2626" }}>Lucreaza acum</h3>
        {actNow.map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12 }}><span style={{ fontWeight: 600, color: "#1E293B" }}>{t.title}</span>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}<span style={{ marginLeft: "auto", fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{ft(getTS(t.id))}</span></div>; })}
      </Card>}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[{ id: "all", l: "Toate" }, { id: "today", l: "Azi" }, { id: "week", l: "7 zile" }, { id: "month", l: "30 zile" }].map(function(r) { return <button key={r.id} onClick={function() { setRange(r.id); }} style={Object.assign({}, S.chip, { background: range === r.id ? GR : "#F1F5F9", color: range === r.id ? "#fff" : "#475569", fontWeight: range === r.id ? 600 : 400 })}>{r.l}</button>; })}
      </div>
      <Card><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Taskuri ({filt.length})</h3>
        {filt.length === 0 ? <div style={{ color: "#94A3B8", padding: 16, textAlign: "center" }}>Niciun task.</div> :
          filt.map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F8FAFC", flexWrap: "wrap" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: SC[t.status], flexShrink: 0 }} /><span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{t.title}</span><Badge bg={SC[t.status] + "18"} color={SC[t.status]}>{t.status}</Badge>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}{t.deadline && <span style={{ fontSize: 11, color: isOv(t) ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}{getTS(t.id) > 0 && <span style={{ fontSize: 11, color: "#64748B", fontVariantNumeric: "tabular-nums" }}>{ft(getTS(t.id))}</span>}</div>; })}
      </Card>
      <Card style={{ marginTop: 16 }}><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Activitate Recenta</h3>
        {uLogs.length === 0 ? <div style={{ color: "#94A3B8", padding: 16, textAlign: "center" }}>Nicio activitate.</div> :
          uLogs.map(function(l) { return <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F8FAFC", fontSize: 12 }}><span style={{ color: "#CBD5E1", minWidth: 100 }}>{ff(l.time)}</span><span style={{ fontWeight: 600, color: "#64748B" }}>{l.action}</span><span style={{ color: "#94A3B8" }}>{l.detail}</span></div>; })}
      </Card>
    </div>
  );
}

/* ═══ TASK ROW ═══ */
function TRow({ t, user, team, onEdit, onDel, onDup, onChgSt, isMob, secs, running, togTimer }) {
  var me = team[user] || {}; var a = team[t.assignee] || {}; var ov = isOv(t);
  var can = me.role === "admin" || me.role === "pm" || t.assignee === user;
  return (
    <Card style={{ display: "flex", flexDirection: isMob ? "column" : "row", alignItems: isMob ? "stretch" : "center", gap: 10, marginBottom: 6, borderLeft: "3px solid " + (ov ? "#EF4444" : SC[t.status] || "#E2E8F0"), background: ov ? "#FFFBFB" : "#fff" }}>
      {can && <button style={Object.assign({}, S.stDot, { color: SC[t.status], background: SC[t.status] + "12", border: "1.5px solid " + SC[t.status] + "40" })} onClick={function() { var i = STATUSES.indexOf(t.status); onChgSt(t.id, STATUSES[(i + 1) % STATUSES.length]); }}>{SI[t.status]}</button>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{t.title}</span>
          <Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>
          {t.platform && <Badge bg="#F1F5F9" color="#475569">{t.platform}</Badge>}
          {t.taskType && <Badge bg="#F5F3FF" color="#7C3AED">{t.taskType}</Badge>}
          {ov && <Badge bg="#FEF2F2" color="#DC2626">INTARZIAT</Badge>}
        </div>
        {t.description && <div style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isMob ? "100%" : 400, marginBottom: 3 }}>{t.description}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94A3B8", flexWrap: "wrap" }}>
          {a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={16} fs={8}>{a.name[0]}</Av>{a.name}</span>}
          {t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}
          {t.productName && <Badge bg="#EFF6FF" color="#2563EB">{t.productName}</Badge>}
          {t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}
          {t.links && t.links.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Ic d={Icons.link} size={10} color="#94A3B8" />{t.links.length}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        {can && t.status !== "Done" && <button onClick={togTimer} style={Object.assign({}, S.timerBtn, { background: running ? "#FEF2F2" : "#F8FAFC", color: running ? "#DC2626" : GR, borderColor: running ? "#FECACA" : "#E2E8F0" })}><Ic d={running ? Icons.stop : Icons.play} size={12} color={running ? "#DC2626" : GR} />{secs > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{ft(secs)}</span>}</button>}
        {t.status === "Done" && secs > 0 && <span style={{ fontSize: 11, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{ft(secs)}</span>}
        <select style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 6px" })} value={t.status} onChange={function(e) { onChgSt(t.id, e.target.value); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
        <button style={S.iconBtn} onClick={function() { onDup(t); }} title="Duplica"><Ic d={Icons.copy} size={14} color="#94A3B8" /></button>
        <button style={S.iconBtn} onClick={function() { onEdit(t); }}><Ic d={Icons.edit} size={14} color="#94A3B8" /></button>
        {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) onDel(t.id); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
      </div>
    </Card>
  );
}

/* ═══ TASKS LIST ═══ */
function TasksPage({ fProps, grouped, filtered, user, team, onEdit, onDel, onDup, onChgSt, isMob, timers, getTS, togTimer }) {
  var st = fProps.stats;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
        {[{ l: "Total", v: st.total, c: "#475569", i: Icons.tasks }, { l: "Azi", v: st.today, c: "#2563EB", i: Icons.work }, { l: "In Progress", v: st.inProg, c: "#D97706", i: Icons.work }, { l: "Intarziate", v: st.overdue, c: "#DC2626", i: Icons.work }, { l: "Finalizate", v: st.done, c: GR, i: Icons.tasks }].map(function(s) {
          return <Card key={s.l} style={{ display: "flex", alignItems: "center", gap: 12, background: s.c + "08" }}><div style={{ width: 40, height: 40, borderRadius: 10, background: s.c + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d={s.i} size={20} color={s.c} /></div><div><div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, color: s.c + "99" }}>{s.l}</div></div></Card>;
        })}
      </div>
      <FiltersBar {...fProps} />
      {grouped.length === 0 ? <Card style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Niciun task gasit.</Card> :
        grouped.map(function(g) { return (
          <div key={g.key} style={{ marginBottom: 20 }}>
            <div style={S.groupHdr}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: g.date === "nodate" ? "#CBD5E1" : isP(g.date + "T00:00:00") ? "#EF4444" : isTd(g.date + "T00:00:00") ? "#16A34A" : isTm(g.date + "T00:00:00") ? "#2563EB" : "#94A3B8" }} />{g.label}</span><span style={S.countBadge}>{g.tasks.length}</span></div>
            {g.tasks.map(function(t) { return <TRow key={t.id} t={t} user={user} team={team} onEdit={onEdit} onDel={onDel} onDup={onDup} onChgSt={onChgSt} isMob={isMob} secs={getTS(t.id)} running={timers[t.id] && timers[t.id].running} togTimer={function() { togTimer(t.id); }} />; })}
          </div>
        ); })}
    </div>
  );
}

/* ═══ KANBAN ═══ */
function KanbanPage({ fProps, tasks, user, team, onEdit, onDel, onDup, onChgSt, dragId, setDragId, handleDrop, isMob, timers, getTS, togTimer }) {
  return (
    <div>
      <FiltersBar {...fProps} noStatus />
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(4,1fr)", gap: 14, alignItems: "start" }}>
        {STATUSES.map(function(st) { var col = tasks.filter(function(t) { return t.status === st; }); return (
          <div key={st} onDragOver={function(e) { e.preventDefault(); e.currentTarget.style.background = "#F0FDF4"; }} onDragLeave={function(e) { e.currentTarget.style.background = "#FAFBFC"; }} onDrop={function(e) { e.preventDefault(); e.currentTarget.style.background = "#FAFBFC"; handleDrop(st); }} style={{ background: "#FAFBFC", borderRadius: 12, padding: 12, minHeight: 200 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: SC[st] }} /><span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{st}</span></div><span style={S.countBadge}>{col.length}</span></div>
            {col.map(function(t) { var a = team[t.assignee] || {}; var ov = isOv(t); var me = team[user] || {}; var can = me.role === "admin" || me.role === "pm" || t.assignee === user; var secs = getTS(t.id); var run = timers[t.id] && timers[t.id].running;
              return (
                <Card key={t.id} style={{ padding: 12, cursor: can ? "grab" : "default", opacity: dragId === t.id ? 0.4 : 1, borderLeft: "3px solid " + (ov ? "#EF4444" : SC[st]), marginBottom: 8 }}>
                  <div draggable={can} onDragStart={function() { setDragId(t.id); }} onDragEnd={function() { setDragId(null); }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>{t.title}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}><Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}{ov && <Badge bg="#FEF2F2" color="#DC2626">INTARZIAT</Badge>}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#94A3B8" }}>{a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={18} fs={9}>{a.name[0]}</Av>{a.name}</span>}{t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
                      {can && st !== "Done" ? <button onClick={function() { togTimer(t.id); }} style={Object.assign({}, S.timerBtn, { fontSize: 10, padding: "2px 8px", background: run ? "#FEF2F2" : "#F8FAFC", color: run ? "#DC2626" : GR, borderColor: run ? "#FECACA" : "#E2E8F0" })}><Ic d={run ? Icons.stop : Icons.play} size={10} color={run ? "#DC2626" : GR} />{secs > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{ft(secs)}</span>}</button> : <span style={{ fontSize: 10 }}>{secs > 0 ? ft(secs) : ""}</span>}
                      <div style={{ display: "flex", gap: 2 }}><button style={S.iconBtn} onClick={function() { onDup(t); }}><Ic d={Icons.copy} size={12} color="#94A3B8" /></button><button style={S.iconBtn} onClick={function() { onEdit(t); }}><Ic d={Icons.edit} size={12} color="#94A3B8" /></button></div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ); })}
      </div>
    </div>
  );
}

/* ═══ WORKLOAD ═══ */
function WorkPage({ users, team, tasks, getPerf, timers, getTS, isMob, onClickUser }) {
  var data = users.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) {
    var ut = tasks.filter(function(t) { return t.assignee === u; }); var byS = {}; STATUSES.forEach(function(s) { byS[s] = ut.filter(function(t) { return t.status === s; }).length; });
    var od = ut.filter(function(t) { return isOv(t); }).length; var actT = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; }).length;
    var tT = 0; ut.forEach(function(t) { tT += getTS(t.id); });
    return { key: u, name: team[u].name, color: team[u].color, role: team[u].role, total: ut.length, byS: byS, od: od, actT: actT, tT: tT, perf: getPerf(u) };
  }).sort(function(a, b) { return b.total - a.total; });
  var mx = Math.max.apply(null, data.map(function(d) { return d.total; }).concat([1]));
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(340,1fr))", gap: 14 }}>
      {data.map(function(d) { return (
        <Card key={d.key} style={{ cursor: "pointer" }}>
          <div onClick={function() { onClickUser(d.key); }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Av color={d.color} size={42}>{d.name[0]}</Av><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{d.role === "pm" ? "PM" : "Member"}</div></div>{d.actT > 0 && <Badge bg="#FEF2F2" color="#DC2626"><span style={{ animation: "pulse 2s infinite" }}>{d.actT} active</span></Badge>}<div style={{ fontSize: 20, fontWeight: 700, color: d.perf.score >= 70 ? GR : d.perf.score >= 40 ? "#D97706" : "#DC2626" }}>{d.perf.score}%</div></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B", marginBottom: 4 }}><span>{d.total} taskuri</span><span>Tracked: {ft(d.tT)}</span></div>
            <div style={{ height: 8, borderRadius: 8, background: "#F1F5F9", overflow: "hidden", display: "flex", marginBottom: 10 }}>{STATUSES.map(function(s) { var w = (d.byS[s] / mx) * 100; return w > 0 ? <div key={s} style={{ width: w + "%", height: "100%", background: SC[s] }} /> : null; })}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, textAlign: "center", fontSize: 10 }}>
              {STATUSES.map(function(s) { return <div key={s} style={{ background: SC[s] + "12", borderRadius: 6, padding: "4px 2px" }}><div style={{ fontSize: 14, fontWeight: 700, color: SC[s] }}>{d.byS[s]}</div><div style={{ color: "#94A3B8" }}>{s === "In Progress" ? "Active" : s}</div></div>; })}
              <div style={{ background: d.od ? "#FEF2F2" : "#F8FAFC", borderRadius: 6, padding: "4px 2px" }}><div style={{ fontSize: 14, fontWeight: 700, color: d.od ? "#DC2626" : "#94A3B8" }}>{d.od}</div><div style={{ color: "#94A3B8" }}>Overdue</div></div>
            </div>
          </div>
        </Card>
      ); })}
    </div>
  );
}

/* ═══ TEAM ═══ */
function TeamPage({ users, team, sessions, getPerf, isMob, onClickUser }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(300,1fr))", gap: 14 }}>
      {users.map(function(u) { var m = team[u]; if (!m) return null; var p = getPerf(u); var lss = sessions[u]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000;
        return (
          <Card key={u} style={{ cursor: "pointer" }}>
            <div onClick={function() { onClickUser(u); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><div style={{ position: "relative" }}><Av color={m.color} size={42}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{m.role === "pm" ? "PM" : m.role === "admin" ? "Admin" : "Member"}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 11, fontWeight: 600, color: on ? "#16A34A" : "#94A3B8" }}>{on ? "Online" : "Offline"}</div><div style={{ fontSize: 10, color: "#CBD5E1" }}>Last: {fr(lss)}</div></div></div>
              {m.role !== "admin" && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span style={{ color: "#64748B" }}>Performance</span><span style={{ fontWeight: 700, color: p.score >= 70 ? GR : p.score >= 40 ? "#D97706" : "#DC2626" }}>{p.score}%</span></div><div style={S.progBg}><div style={S.progBar(p.score >= 70 ? GR : p.score >= 40 ? "#D97706" : "#DC2626", p.score)} /></div></div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ═══ PERFORMANCE ═══ */
function PerfPage({ users, team, getPerf, isMob }) {
  var data = users.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) { return Object.assign({ key: u }, team[u], getPerf(u)); }).sort(function(a, b) { return b.score - a.score; });
  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Clasament Echipa</h3>
      {data.map(function(d, i) { return (
        <div key={d.key} style={{ display: "flex", alignItems: isMob ? "flex-start" : "center", gap: 12, padding: "12px 0", borderBottom: i < data.length - 1 ? "1px solid #F1F5F9" : "none", flexDirection: isMob ? "column" : "row" }}>
          <span style={{ fontSize: 16, width: 28, textAlign: "center", fontWeight: 700, color: i < 3 ? GR : "#94A3B8" }}>#{i + 1}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}><Av color={d.color} size={30}>{d.name[0]}</Av><span style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</span></div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, width: "100%" }}><div style={Object.assign({}, S.progBg, { flex: 1 })}><div style={S.progBar(d.score >= 70 ? GR : d.score >= 40 ? "#D97706" : "#DC2626", d.score)} /></div><span style={{ fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "right", color: d.score >= 70 ? GR : d.score >= 40 ? "#D97706" : "#DC2626" }}>{d.score}%</span></div>
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#94A3B8" }}><span>{d.done}/{d.total}</span>{d.overdue > 0 && <span style={{ color: "#DC2626" }}>{d.overdue} ovd</span>}{d.avgTime > 0 && <span>avg {ft(d.avgTime)}</span>}</div>
        </div>
      ); })}
    </Card>
  );
}

/* ═══ LOG ═══ */
function LogPage({ logs, visUsers, isMob }) {
  var vis = logs.filter(function(l) { return visUsers.includes(l.user); });
  var aC = { LOGIN: { bg: "#ECFDF5", c: "#16A34A" }, LOGOUT: { bg: "#FEF2F2", c: "#DC2626" }, NEW: { bg: "#EFF6FF", c: "#2563EB" }, EDIT: { bg: "#FFFBEB", c: "#D97706" }, DELETE: { bg: "#FEF2F2", c: "#DC2626" }, STATUS: { bg: "#F5F3FF", c: "#7C3AED" }, TIMER: { bg: "#FFF7ED", c: "#EA580C" }, DUPLICATE: { bg: "#EFF6FF", c: "#2563EB" }, USER_ADD: { bg: "#ECFDF5", c: GR }, USER_DEL: { bg: "#FEF2F2", c: "#DC2626" } };
  return (
    <Card>
      {vis.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Nicio activitate.</div> :
        vis.slice(0, 150).map(function(l) { var cfg = aC[l.action] || { bg: "#F8FAFC", c: "#64748B" }; return (
          <div key={l.id} style={{ display: "flex", alignItems: isMob ? "flex-start" : "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC", flexDirection: isMob ? "column" : "row" }}>
            <span style={{ fontSize: 11, color: "#CBD5E1", minWidth: 120 }}>{ff(l.time)}</span>
            <Badge bg={cfg.bg} color={cfg.c}>{l.action}</Badge>
            <span style={{ fontSize: 12, color: "#64748B" }}>{l.detail}</span>
          </div>
        ); })}
    </Card>
  );
}

/* ═══ LIST PAGE (shops) ═══ */
function ListPage({ title, items, setItems, ph }) {
  var [v, setV] = useState("");
  var add = function() { var s = v.trim(); if (s && !items.includes(s)) { setItems(function(p) { return p.concat([s]); }); setV(""); } };
  return (
    <div style={{ maxWidth: 500 }}><Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>Apar automat in dropdown la creare task.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={v} onChange={function(e) { setV(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") add(); }} placeholder={ph} /><button style={S.primBtn} onClick={add}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga</button></div>
      {items.map(function(s) { return <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F8FAFC", borderRadius: 8, marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span><button style={S.iconBtn} onClick={function() { setItems(function(p) { return p.filter(function(x) { return x !== s; }); }); }}><Ic d={Icons.x} size={14} color="#EF4444" /></button></div>; })}
    </Card></div>
  );
}

/* ═══ PRODUCTS ═══ */
function ProdsPage({ products, setProducts }) {
  var [name, setName] = useState(""); var [url, setUrl] = useState("");
  var add = function() { var n = name.trim(); if (n) { setProducts(function(p) { return p.concat([{ id: id(), name: n, url: url.trim() }]); }); setName(""); setUrl(""); } };
  return (
    <div style={{ maxWidth: 600 }}><Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Produse</h3>
      <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>Adauga produse cu link - echipa le identifica rapid la creare task.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input style={Object.assign({}, S.input, { flex: 1, minWidth: 150 })} value={name} onChange={function(e) { setName(e.target.value); }} placeholder="Nume produs" />
        <input style={Object.assign({}, S.input, { flex: 1, minWidth: 200 })} value={url} onChange={function(e) { setUrl(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") add(); }} placeholder="Link (Shopify, Drive, etc.)" />
        <button style={S.primBtn} onClick={add}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga</button>
      </div>
      {products.map(function(p) { return (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F8FAFC", borderRadius: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
          {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#2563EB" }}><Ic d={Icons.ext} size={12} color="#2563EB" />Link</a>}
          <div style={{ flex: 1 }} />
          <button style={S.iconBtn} onClick={function() { setProducts(function(pr) { return pr.filter(function(x) { return x.id !== p.id; }); }); }}><Ic d={Icons.x} size={14} color="#EF4444" /></button>
        </div>
      ); })}
    </Card></div>
  );
}

/* ═══ MANAGE USERS ═══ */
function UsersPage({ team, setTeam, addLog }) {
  var [name, setName] = useState(""); var [key, setKey] = useState(""); var [pw, setPw] = useState(""); var [role, setRole] = useState("member"); var [pm, setPm] = useState(""); var [color, setColor] = useState(COLORS[0]);
  var pms = Object.keys(team).filter(function(k) { return team[k].role === "pm"; });
  var go = function() {
    var k2 = key.trim().toLowerCase().replace(/\s+/g, "_"); if (!k2 || !name.trim() || team[k2]) return;
    var data = { name: name.trim(), role: role, password: pw || k2 + "2024", color: color };
    if (role === "member" && pm) {
      data.pm = pm;
      setTeam(function(prev) { var n = Object.assign({}, prev); if (n[pm] && n[pm].team) { n[pm] = Object.assign({}, n[pm], { team: n[pm].team.concat([k2]) }); } n[k2] = data; return n; });
    } else {
      setTeam(function(prev) { var n = Object.assign({}, prev); n[k2] = data; return n; });
    }
    addLog("USER_ADD", "Adaugat: " + name.trim());
    setName(""); setKey(""); setPw("");
  };
  var del = function(k2) { if (k2 === "admin") return; setTeam(function(prev) { var n = Object.assign({}, prev); delete n[k2]; Object.keys(n).forEach(function(k3) { if (n[k3].team) n[k3] = Object.assign({}, n[k3], { team: n[k3].team.filter(function(t) { return t !== k2; }) }); if (n[k3].pm === k2) n[k3] = Object.assign({}, n[k3], { pm: "" }); }); return n; }); addLog("USER_DEL", "Sters: " + k2); };
  return (
    <div style={{ maxWidth: 600 }}><Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Manage Users</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div><label style={S.label}>Nume</label><input style={S.input} value={name} onChange={function(e) { setName(e.target.value); if (!key) setKey(e.target.value.toLowerCase().replace(/\s+/g, "_")); }} placeholder="ex: Alex" /></div>
        <div><label style={S.label}>Username</label><input style={S.input} value={key} onChange={function(e) { setKey(e.target.value); }} placeholder="ex: alex" /></div>
        <div><label style={S.label}>Parola</label><input style={S.input} value={pw} onChange={function(e) { setPw(e.target.value); }} placeholder="default: key+2024" /></div>
        <div><label style={S.label}>Rol</label><select style={S.fSelF} value={role} onChange={function(e) { setRole(e.target.value); }}>{ROLES.map(function(r) { return <option key={r} value={r}>{r}</option>; })}</select></div>
        {role === "member" && <div><label style={S.label}>PM</label><select style={S.fSelF} value={pm} onChange={function(e) { setPm(e.target.value); }}><option value="">--</option>{pms.map(function(p) { return <option key={p} value={p}>{team[p].name}</option>; })}</select></div>}
        <div><label style={S.label}>Culoare</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{COLORS.map(function(c) { return <div key={c} onClick={function() { setColor(c); }} style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: color === c ? "2px solid #1E293B" : "2px solid transparent" }} />; })}</div></div>
      </div>
      <button style={S.primBtn} onClick={go}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga User</button>
      <div style={{ marginTop: 20 }}>
        {Object.entries(team).map(function(entry) { var k2 = entry[0]; var u = entry[1]; return (
          <div key={k2} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
            <Av color={u.color} size={28}>{u.name[0]}</Av><span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{u.name}</span><span style={{ fontSize: 11, color: "#94A3B8" }}>{u.role}</span><span style={{ fontSize: 10, color: "#CBD5E1" }}>{k2}</span>
            {k2 !== "admin" && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi " + u.name + "?")) del(k2); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
          </div>
        ); })}
      </div>
    </Card></div>
  );
}

/* ═══ TASK MODAL ═══ */
function TaskModal({ task, team, assUsers, shops, products, onSave, onClose }) {
  var [f, setF] = useState(task || { title: "", description: "", assignee: assUsers[0] || "", status: "To Do", priority: "Normal", platform: "", taskType: "", shop: "", product: "", productName: "", deadline: TD, links: [] });
  var [newLink, setNewLink] = useState("");
  var set = function(k, v) { setF(function(p) { var n = Object.assign({}, p); n[k] = v; return n; }); };
  var addLink = function() { var l = newLink.trim(); if (l) { set("links", (f.links || []).concat([l])); setNewLink(""); } };
  var remLink = function(i) { set("links", (f.links || []).filter(function(_, idx) { return idx !== i; })); };
  var selProd = function(pid) { var p = products.find(function(x) { return x.id === pid; }); if (p) { set("product", p.id); set("productName", p.name); if (p.url) { set("links", (f.links || []).concat([p.url])); } } };

  return (
    <div style={S.modalOv} onClick={onClose}><div style={S.modalBox} onClick={function(e) { e.stopPropagation(); }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 17, fontWeight: 700 }}>{task ? "Editeaza Task" : "Task Nou"}</h2><button style={S.iconBtn} onClick={onClose}><Ic d={Icons.x} size={18} color="#94A3B8" /></button></div>

      <label style={S.label}>Titlu *</label>
      <input style={S.input} value={f.title} onChange={function(e) { set("title", e.target.value); }} placeholder="Ce trebuie facut?" autoFocus />

      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Persoana</label><select style={S.fSelF} value={f.assignee} onChange={function(e) { set("assignee", e.target.value); }}>{assUsers.map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name || u}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Magazin</label><select style={S.fSelF} value={f.shop} onChange={function(e) { set("shop", e.target.value); }}><option value="">--</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div></div>

      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Platforma</label><select style={S.fSelF} value={f.platform} onChange={function(e) { set("platform", e.target.value); }}><option value="">--</option>{PLATFORMS.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Tip Task</label><select style={S.fSelF} value={f.taskType} onChange={function(e) { set("taskType", e.target.value); }}><option value="">--</option>{TASK_TYPES.map(function(t) { return <option key={t} value={t}>{t}</option>; })}</select></div></div>

      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Prioritate</label><select style={S.fSelF} value={f.priority} onChange={function(e) { set("priority", e.target.value); }}>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Status</label><select style={S.fSelF} value={f.status} onChange={function(e) { set("status", e.target.value); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Deadline</label><input style={S.fSelF} type="date" value={f.deadline} onChange={function(e) { set("deadline", e.target.value); }} /></div></div>

      {products.length > 0 && <div><label style={S.label}>Produs (din lista)</label><select style={S.fSelF} value={f.product || ""} onChange={function(e) { selProd(e.target.value); }}><option value="">-- Selecteaza --</option>{products.map(function(p) { return <option key={p.id} value={p.id}>{p.name}</option>; })}</select></div>}

      <label style={S.label}>Produs (manual)</label>
      <input style={S.input} value={f.productName || ""} onChange={function(e) { set("productName", e.target.value); }} placeholder="Nume produs" />

      <label style={S.label}>Linkuri (Drive, poze, URL)</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input style={Object.assign({}, S.input, { flex: 1 })} value={newLink} onChange={function(e) { setNewLink(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addLink(); }} placeholder="https://..." />
        <button style={S.primBtn} onClick={addLink}><Ic d={Icons.plus} size={14} color="#fff" /></button>
      </div>
      {(f.links || []).map(function(l, i) { return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12 }}>
          <Ic d={Icons.link} size={12} color="#2563EB" />
          <a href={l} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</a>
          <button style={S.iconBtn} onClick={function() { remLink(i); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button>
        </div>
      ); })}

      <label style={Object.assign({}, S.label, { marginTop: 12 })}>Descriere</label>
      <textarea style={S.ta} value={f.description} onChange={function(e) { set("description", e.target.value); }} placeholder="Detalii, note..." />

      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
        <button style={S.cancelBtn} onClick={onClose}>Anuleaza</button>
        <button style={S.primBtn} onClick={function() { if (f.title.trim()) onSave(f); }}>{task ? "Salveaza" : "Creeaza"}</button>
      </div>
    </div></div>
  );
}

/* ═══ STYLES ═══ */
var S = {
  app: { display: "flex", minHeight: "100vh", width: "100%", background: "#FAFAFA", color: "#1E293B", fontSize: 14, fontFamily: "system-ui,-apple-system,sans-serif" },
  sidebar: { width: 256, minHeight: "100vh", background: "hsl(216,22%,11%)", display: "flex", flexDirection: "column", flexShrink: 0 },
  logoArea: { padding: "24px 20px 20px", borderBottom: "1px solid hsl(216,18%,18%)" },
  logoH: { fontSize: 26, fontWeight: 800, color: "#4ADE80", letterSpacing: 0.5, display: "block" },
  logoSub: { fontSize: 10, color: "hsl(210,12%,50%)", letterSpacing: 2.5, textTransform: "uppercase", marginTop: 2, display: "block" },
  newBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: GR, color: "#fff", fontSize: 13, fontWeight: 600, marginTop: 12, marginBottom: 4 },
  navItem: function(a) { return { display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: a ? 600 : 400, color: a ? "#fff" : "hsl(210,14%,85%)", background: a ? "hsl(216,18%,16%)" : "transparent", borderLeft: a ? "3px solid #4ADE80" : "3px solid transparent", transition: "all 0.12s" }; },
  navBadge: { fontSize: 10, background: "hsl(216,18%,18%)", color: "hsl(210,12%,50%)", padding: "2px 8px", borderRadius: 10, fontWeight: 600 },
  sidebarUser: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: "1px solid hsl(216,18%,18%)" },
  logoutBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", borderRadius: 8, border: "1px solid hsl(216,18%,18%)", background: "transparent", color: "hsl(210,12%,50%)", fontSize: 12, fontWeight: 500 },
  main: { flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden" },
  topbar: { height: 56, background: "#fff", borderBottom: "1px solid hsl(214,18%,82%)", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 },
  pageTitle: { fontSize: 16, fontWeight: 600, color: "#1E293B" },
  menuBtn: { border: "none", background: "none", padding: 4 },
  content: { flex: 1, overflow: "auto", padding: 24 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 199 },
  primBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", background: GR, color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },
  cancelBtn: { padding: "9px 18px", borderRadius: 8, border: "1px solid hsl(214,18%,82%)", background: "#fff", color: "#64748B", fontSize: 13, fontWeight: 500 },
  iconBtn: { border: "none", background: "none", padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center" },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "hsl(215,16%,32%)", marginBottom: 5, marginTop: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid hsl(214,18%,82%)", background: "#fff", color: "#1E293B", fontSize: 13, outline: "none", fontFamily: "inherit" },
  ta: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid hsl(214,18%,82%)", background: "#fff", color: "#1E293B", fontSize: 13, outline: "none", resize: "vertical", minHeight: 70, fontFamily: "inherit" },
  fRow: { display: "flex", gap: 10, marginTop: 2 },
  fCol: { flex: 1, minWidth: 0 },
  fSelF: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid hsl(214,18%,82%)", background: "#fff", color: "#1E293B", fontSize: 13, outline: "none", fontFamily: "inherit" },
  fSel: { padding: "7px 10px", borderRadius: 8, border: "1px solid hsl(214,18%,82%)", background: "#fff", color: "#475569", fontSize: 12, outline: "none", fontFamily: "inherit" },
  chip: { padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontFamily: "inherit" },
  countBadge: { fontSize: 10, background: "hsl(210,16%,96%)", color: "hsl(215,16%,32%)", padding: "2px 10px", borderRadius: 6, fontWeight: 600 },
  stDot: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer", flexShrink: 0, fontFamily: "inherit", lineHeight: 1 },
  timerBtn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid hsl(214,18%,82%)", fontSize: 12, fontWeight: 500, fontFamily: "inherit" },
  progBg: { height: 6, borderRadius: 6, background: "hsl(210,16%,96%)", overflow: "hidden" },
  progBar: function(c, p) { return { height: "100%", borderRadius: 6, background: c, width: p + "%", transition: "width 0.5s" }; },
  groupHdr: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#475569" },
  modalOv: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16, backdropFilter: "blur(4px)" },
  modalBox: { background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 580, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", animation: "fadeUp 0.2s" },
  loginWrap: { minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(216,22%,11%)", padding: 20 },
  loginCard: { background: "#fff", borderRadius: 14, padding: 36, width: "100%", maxWidth: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.1)", animation: "fadeUp 0.4s" },
  eyeBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", padding: 4, display: "flex" },
};
