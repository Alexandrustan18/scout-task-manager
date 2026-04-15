import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ═══ SUPABASE ═══
var supabase = createClient(
  "https://ploucecgizjwyumzmhmo.supabase.co",
  "sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh"
);

// Cloud save/load helpers
async function cloudLoad(key, fallback) {
  try {
    var { data, error } = await supabase.from("app_data").select("data").eq("id", key).single();
    if (error || !data) return fallback;
    return data.data || fallback;
  } catch (e) { return fallback; }
}

async function cloudSave(key, value) {
  try {
    await supabase.from("app_data").upsert({ id: key, data: value, updated_at: new Date().toISOString() });
  } catch (e) { console.error("Save error:", key, e); }
}

// Debounce saves to avoid spamming
var saveTimers = {};
function debouncedSave(key, value, delay) {
  if (saveTimers[key]) clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(function() { cloudSave(key, value); }, delay || 800);
}

var DEF_TEAM = {
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
var DEF_SHOPS = ["Grandia", "Bonhaus", "Casa Ofertelor", "Gento", "MagDeal", "Reduceri Bune", "Apreciat"];
var STATUSES = ["To Do", "In Progress", "Review", "Done"];
var PRIORITIES = ["Low", "Normal", "High", "Urgent"];
var PLATFORMS = ["Meta Ads", "TikTok Ads", "Google Ads", "Shopify", "Creativ", "UGC", "Foto Produs", "Altele"];
var DEF_TASK_TYPES = ["Ad Creation", "Product Launch", "Creative", "Copy", "Landing Page", "Tracking/Pixel", "Raportare", "General"];
var DEF_DEPARTMENTS = ["AD", "PRODUCT LAUNCH", "CREATIVE VIDEO", "UGC", "FOTO PRODUS", "COPY", "TRACKING"];
var RECUR_OPTS = ["Zilnic", "Saptamanal", "Lunar"];
var ROLES = ["admin", "pm", "member"];
var COLORS = ["#16A34A", "#2563EB", "#DB2777", "#059669", "#D97706", "#7C3AED", "#EA580C", "#DC2626", "#0891B2", "#6366F1", "#EC4899", "#14B8A6"];
var PC = { Low: "#94A3B8", Normal: "#2563EB", High: "#EA580C", Urgent: "#DC2626" };
var SC = { "To Do": "#94A3B8", "In Progress": "#2563EB", Review: "#D97706", Done: "#16A34A" };
// Feature 8: status background colors for task cards
var SBG = { "To Do": "#F8FAFC", "In Progress": "#EFF6FF", Review: "#FFFBEB", Done: "#ECFDF5" };
var SI = { "To Do": "o", "In Progress": "~", Review: "?", Done: "*" };
var GR = "#0C7E3E";

var DEF_TEMPLATES = [
  { id: "tpl_1", name: "Product Launch", description: "Standard product launch workflow", subtasks: ["Cercetare competitor", "Creare listing produs", "Fotografii produs", "Creare ad copy (PAS + UGC + Storytime)", "Setup Meta Ads campaign", "Setup TikTok Ads campaign", "QA landing page", "Go Live + Monitor"] },
  { id: "tpl_2", name: "Store Setup", description: "New Shopify store configuration", subtasks: ["Creare cont Shopify", "Configurare tema + branding", "Import produse", "Setup tracking (Meta Pixel + CAPI + TikTok)", "Configurare checkout + payment", "Setup email flows", "QA complet", "Launch"] },
  { id: "tpl_3", name: "UGC Campaign", description: "UGC content creation flow", subtasks: ["Brief creativ", "Selectie creatori", "Trimitere produse", "Review continut primit", "Editare video", "Upload + catalogare", "Lansare ads"] },
  { id: "tpl_4", name: "Creative Testing", description: "Ad creative testing workflow", subtasks: ["Analiza competitori", "Creare 5 variante copy", "Creare 3 variante vizual", "Setup A/B test", "Monitor 48h", "Analiza rezultate", "Scale winner"] },
];

function gid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function ts() { return new Date().toISOString(); }
function ds(d) { var x = typeof d === "string" ? new Date(d) : d; return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
var TD = ds(new Date());
var TM = (function() { var d = new Date(); d.setDate(d.getDate() + 1); return ds(d); })();
var YESTERDAY = (function() { var d = new Date(); d.setDate(d.getDate() - 1); return ds(d); })();
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
function hDiff(a, b) { if (!a || !b) return 0; return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 3600000); }

function canAccess(role, section) {
  if (role === "admin") return true;
  if (role === "pm") return !["manage_users", "log"].includes(section);
  if (role === "member") return ["tasks", "kanban", "calendar"].includes(section);
  return false;
}

function Ic({ d, size, color }) { return <svg width={size || 20} height={size || 20} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>; }
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
  cal: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  tpl: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></>,
  target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  sheet: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></>,
  bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  comment: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
  check: <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
  dept: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></>,
  filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  recur: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>,
  download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  dep: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  heat: <><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></>,
  digest: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></>,
  sla: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
};

var CSS = "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{margin:0;background:#FAFAFA;font-family:system-ui,-apple-system,sans-serif}::selection{background:#0C7E3E22}input:focus,select:focus,textarea:focus{border-color:#0C7E3E !important;outline:none;box-shadow:0 0 0 3px #0C7E3E18}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:10px}button{cursor:pointer;font-family:inherit}button:hover{opacity:0.9}a{text-decoration:none}@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}@keyframes toastIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}@keyframes toastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-20px)}}";

function Badge({ bg, color, children }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: bg, color: color, whiteSpace: "nowrap" }}>{children}</span>; }
function Av({ color, size, fs, children }) { return <div style={{ width: size || 32, height: size || 32, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs || 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{children}</div>; }
function Card({ children, style }) { return <div style={{ background: "#fff", border: "1px solid hsl(214,18%,90%)", borderRadius: 10, padding: 16, animation: "fadeUp 0.2s", ...style }}>{children}</div>; }

// Feature 11: Toast notification component
function ToastBanner({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
    {toasts.map(function(t) {
      return <div key={t.id} style={{ background: "#fff", border: "2px solid " + GR, borderRadius: 10, padding: "12px 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", animation: "toastIn 0.3s ease", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: GR, animation: "pulse 2s infinite", flexShrink: 0 }} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{t.message}</div><div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{fr(t.time)}</div></div>
        <button style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }} onClick={function() { onDismiss(t.id); }}><Ic d={Icons.x} size={14} color="#94A3B8" /></button>
      </div>;
    })}
  </div>;
}

export default function App() {
  var [team, setTeam] = useState(DEF_TEAM);
  var [user, setUser] = useState(null);
  var [tasks, setTasks] = useState([]);
  var [logs, setLogs] = useState([]);
  var [sessions, setSessions] = useState({});
  var [shops, setShops] = useState(DEF_SHOPS);
  var [products, setProducts] = useState([]);
  var [timers, setTimers] = useState({});
  var [templates, setTemplates] = useState(DEF_TEMPLATES);
  var [targets, setTargets] = useState([]);
  var [sheets, setSheets] = useState([]);
  var [notifications, setNotifications] = useState([]);
  var [page, setPage] = useState("dashboard");
  var [showAdd, setShowAdd] = useState(false);
  var [editTask, setEditTask] = useState(null);
  var [viewTask, setViewTask] = useState(null);
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
  var [showNotifs, setShowNotifs] = useState(false);
  var [calDate, setCalDate] = useState(new Date());
  var [loading, setLoading] = useState(true);
  // Feature 6: custom task types
  var [taskTypes, setTaskTypes] = useState(DEF_TASK_TYPES);
  // Feature 12: departments
  var [departments, setDepartments] = useState(DEF_DEPARTMENTS);
  // Feature 11: toast notifications
  var [toasts, setToasts] = useState([]);
  // Feature 3: login tracking
  var [loginTrack, setLoginTrack] = useState({});
  // Feature 12/13: department/shop filter on dashboard
  var [deptFilter, setDeptFilter] = useState("all");
  var [platformFilter, setPlatformFilter] = useState("all");
  // v8: new states
  var [recurringTasks, setRecurringTasks] = useState([]);
  var [slas, setSlas] = useState({});
  var [selectedTasks, setSelectedTasks] = useState([]);
  var [bulkMode, setBulkMode] = useState(false);
  var [statusHistory, setStatusHistory] = useState({});
  // Feature 5: campaign finalize popup
  var [showFinalize, setShowFinalize] = useState(null);

  // Load all data from Supabase on mount
  useEffect(function() {
    async function loadAll() {
      var [t, tk, lg, se, sh, pr, tm, tpl, tgt, sht, nf, tt, dp, lt, rc, sl, stH] = await Promise.all([
        cloudLoad("team", DEF_TEAM),
        cloudLoad("tasks", []),
        cloudLoad("logs", []),
        cloudLoad("sessions", {}),
        cloudLoad("shops", DEF_SHOPS),
        cloudLoad("products", []),
        cloudLoad("timers", {}),
        cloudLoad("templates", DEF_TEMPLATES),
        cloudLoad("targets", []),
        cloudLoad("sheets", []),
        cloudLoad("notifs", []),
        cloudLoad("taskTypes", DEF_TASK_TYPES),
        cloudLoad("departments", DEF_DEPARTMENTS),
        cloudLoad("loginTrack", {}),
        cloudLoad("recurringTasks", []),
        cloudLoad("slas", {}),
        cloudLoad("statusHistory", {}),
      ]);
      if (t && Object.keys(t).length > 0) setTeam(t); else { setTeam(DEF_TEAM); cloudSave("team", DEF_TEAM); }
      setTasks(tk || []);
      setLogs(lg || []);
      setSessions(se || {});
      if (sh && sh.length > 0) setShops(sh); else { setShops(DEF_SHOPS); cloudSave("shops", DEF_SHOPS); }
      setProducts(pr || []);
      setTimers(tm || {});
      if (tpl && tpl.length > 0) setTemplates(tpl); else { setTemplates(DEF_TEMPLATES); cloudSave("templates", DEF_TEMPLATES); }
      setTargets(tgt || []);
      setSheets(sht || []);
      setNotifications(nf || []);
      if (tt && tt.length > 0) setTaskTypes(tt); else { setTaskTypes(DEF_TASK_TYPES); cloudSave("taskTypes", DEF_TASK_TYPES); }
      if (dp && dp.length > 0) setDepartments(dp); else { setDepartments(DEF_DEPARTMENTS); cloudSave("departments", DEF_DEPARTMENTS); }
      setLoginTrack(lt || {});
      setRecurringTasks(rc || []);
      setSlas(sl || {});
      setStatusHistory(stH || {});
      var savedUser = localStorage.getItem("s7_user");
      if (savedUser) { try { setUser(JSON.parse(savedUser)); } catch(e) {} }
      setLoading(false);
    }
    loadAll();
  }, []);

  // Feature 9: Supabase realtime subscription for tasks
  useEffect(function() {
    var channel = supabase.channel("app_data_changes").on("postgres_changes", { event: "*", schema: "public", table: "app_data" }, function(payload) {
      if (payload.new && payload.new.id === "tasks" && payload.new.data) {
        setTasks(payload.new.data);
      }
      if (payload.new && payload.new.id === "notifs" && payload.new.data) {
        setNotifications(function(prev) {
          var incoming = payload.new.data || [];
          if (incoming.length > prev.length) {
            var newOnes = incoming.slice(0, incoming.length - prev.length);
            newOnes.forEach(function(n) {
              setToasts(function(tp) { return tp.concat([n]).slice(-5); });
              setTimeout(function() { setToasts(function(tp) { return tp.filter(function(x) { return x.id !== n.id; }); }); }, 6000);
            });
          }
          return incoming;
        });
      }
    }).subscribe();
    return function() { supabase.removeChannel(channel); };
  }, []);

  useEffect(function() { var h = function() { setIsMob(window.innerWidth < 820); }; window.addEventListener("resize", h); return function() { window.removeEventListener("resize", h); }; }, []);

  // Auto-save to Supabase when data changes (debounced)
  useEffect(function() { if (!loading) debouncedSave("team", team, 1000); }, [team]);
  useEffect(function() { if (!loading) debouncedSave("tasks", tasks, 500); }, [tasks]);
  useEffect(function() { if (!loading) debouncedSave("logs", logs, 2000); }, [logs]);
  useEffect(function() { if (!loading) debouncedSave("sessions", sessions, 5000); }, [sessions]);
  useEffect(function() { if (!loading) debouncedSave("shops", shops, 1000); }, [shops]);
  useEffect(function() { if (!loading) debouncedSave("products", products, 1000); }, [products]);
  useEffect(function() { if (!loading) debouncedSave("timers", timers, 1000); }, [timers]);
  useEffect(function() { if (!loading) debouncedSave("templates", templates, 1000); }, [templates]);
  useEffect(function() { if (!loading) debouncedSave("targets", targets, 1000); }, [targets]);
  useEffect(function() { if (!loading) debouncedSave("sheets", sheets, 1000); }, [sheets]);
  useEffect(function() { if (!loading) debouncedSave("notifs", notifications, 2000); }, [notifications]);
  useEffect(function() { if (!loading) debouncedSave("taskTypes", taskTypes, 1000); }, [taskTypes]);
  useEffect(function() { if (!loading) debouncedSave("departments", departments, 1000); }, [departments]);
  useEffect(function() { if (!loading) debouncedSave("loginTrack", loginTrack, 2000); }, [loginTrack]);
  useEffect(function() { if (!loading) debouncedSave("recurringTasks", recurringTasks, 1000); }, [recurringTasks]);
  useEffect(function() { if (!loading) debouncedSave("slas", slas, 1000); }, [slas]);
  useEffect(function() { if (!loading) debouncedSave("statusHistory", statusHistory, 1000); }, [statusHistory]);

  // FEATURE 1: Recurring tasks - check every 60s
  useEffect(function() {
    if (loading || !user) return;
    var check = function() {
      var today = TD;
      recurringTasks.forEach(function(rt) {
        if (!rt.active) return;
        var shouldCreate = false;
        if (rt.frequency === "Zilnic" && rt.lastCreated !== today) shouldCreate = true;
        if (rt.frequency === "Saptamanal") { var dow = new Date().getDay(); if (dow === (rt.dayOfWeek || 1) && rt.lastCreated !== today) shouldCreate = true; }
        if (rt.frequency === "Lunar") { var dom = new Date().getDate(); if (dom === (rt.dayOfMonth || 1) && rt.lastCreated !== today) shouldCreate = true; }
        if (shouldCreate) {
          var nt = { id: gid(), title: rt.title, description: rt.description || "", assignee: rt.assignee, status: "To Do", priority: rt.priority || "Normal", platform: rt.platform || "", taskType: rt.taskType || "", department: rt.department || "", shop: rt.shop || "", product: "", productName: "", deadline: today, links: [], subtasks: (rt.subtasks || []).map(function(s) { return { id: gid(), text: s, done: false }; }), comments: [], createdBy: "system", createdAt: ts(), updatedAt: ts(), recurring: rt.id };
          setTasks(function(p) { return [nt].concat(p); });
          setRecurringTasks(function(p) { return p.map(function(x) { return x.id === rt.id ? Object.assign({}, x, { lastCreated: today }) : x; }); });
          addNotif("recurring", "Task recurent creat: \"" + rt.title + "\"", nt.id);
        }
      });
    };
    check();
    var iv = setInterval(check, 60000);
    return function() { clearInterval(iv); };
  }, [loading, user, recurringTasks]);

  // FEATURE 3: Deadline alerts - check every 5min, persist in localStorage
  useEffect(function() {
    if (loading || !user) return;
    var SK = "s7_alerted_" + user;
    var getA = function() { try { return JSON.parse(localStorage.getItem(SK) || "{}"); } catch(e) { return {}; } };
    var check = function() {
      var now = Date.now();
      var a = getA();
      var dirty = false;
      tasks.forEach(function(t) {
        if (t.status === "Done" || !t.deadline) return;
        var dl2 = new Date(t.deadline + "T23:59:59").getTime();
        var diff = dl2 - now;
        if (diff > 0 && diff <= 2 * 3600000 && !a[t.id + "_2h"]) {
          a[t.id + "_2h"] = 1; dirty = true;
          addNotif("deadline", "URGENT: \"" + t.title + "\" expira in 2 ore!", t.id, t.assignee);
        } else if (diff > 2 * 3600000 && diff <= 24 * 3600000 && !a[t.id + "_24h"]) {
          a[t.id + "_24h"] = 1; dirty = true;
          addNotif("deadline", "Reminder: \"" + t.title + "\" expira in 24 ore", t.id, t.assignee);
        }
      });
      if (dirty) { try { localStorage.setItem(SK, JSON.stringify(a)); } catch(e) {} }
    };
    var t1 = setTimeout(check, 15000);
    var iv = setInterval(check, 300000);
    return function() { clearTimeout(t1); clearInterval(iv); };
  }, [loading, user]);

  useEffect(function() { var iv = setInterval(function() { setTick(function(t) { return t + 1; }); }, 1000); return function() { clearInterval(iv); }; }, []);
  useEffect(function() { if (!user) return; var fn = function() { setSessions(function(p) { var n = Object.assign({}, p); n[user] = ts(); return n; }); }; fn(); var iv = setInterval(fn, 30000); return function() { clearInterval(iv); }; }, [user]);

  var addLog = useCallback(function(a, d) { setLogs(function(p) { return [{ id: gid(), user: user || "?", action: a, detail: d, time: ts() }].concat(p).slice(0, 500); }); }, [user]);
  var addNotif = function(type, message, taskId, forUser) {
    var notif = { id: gid(), type: type, taskId: taskId || null, message: message, time: ts(), read: false, forUser: forUser || null };
    setNotifications(function(p) { return [notif].concat(p); });
    setToasts(function(p) { return p.concat([notif]).slice(-5); });
    setTimeout(function() { setToasts(function(p) { return p.filter(function(x) { return x.id !== notif.id; }); }); }, 6000);
  };
  var dismissToast = function(id) { setToasts(function(p) { return p.filter(function(x) { return x.id !== id; }); }); };

  var handleLogin = function(u, pw) {
    var t = team[u];
    if (!t || t.password !== pw) return false;
    setUser(u);
    localStorage.setItem("s7_user", JSON.stringify(u));
    addLog("LOGIN", t.name + " a intrat");
    // Feature 3: track login times
    setLoginTrack(function(prev) {
      var n = Object.assign({}, prev);
      var today = TD;
      if (!n[u]) n[u] = {};
      if (!n[u][today]) n[u][today] = { first: ts(), last: ts() };
      else n[u][today].last = ts();
      return n;
    });
    if (t.role === "member") setPage("tasks");
    return true;
  };
  var handleLogout = function() { if (user) addLog("LOGOUT", (team[user] ? team[user].name : "") + " a iesit"); setUser(null); localStorage.removeItem("s7_user"); setPage("dashboard"); };

  var visUsers = useMemo(function() { if (!user) return []; var m = team[user]; if (!m) return []; if (m.role === "admin") return Object.keys(team); if (m.role === "pm") return [user].concat(m.team || []); return [user]; }, [user, team]);
  // FIX: PM self-assign - PMs can now assign tasks to themselves
  var assUsers = useMemo(function() { if (!user) return []; var m = team[user]; if (!m) return []; if (m.role === "admin") return Object.keys(team).filter(function(k) { return k !== "admin"; }); if (m.role === "pm") return [user].concat(m.team || []); return [user]; }, [user, team]);
  var visTasks = useMemo(function() { if (!user) return []; return tasks.filter(function(t) { return visUsers.includes(t.assignee) || visUsers.includes(t.createdBy); }); }, [tasks, visUsers, user]);

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

  // Feature 10: grouped and sorted by priority/status sections
  var grouped = useMemo(function() {
    var s = filtered.slice().sort(function(a, b) {
      // Urgent first, Done last
      var pOrder = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
      var sOrder = { "In Progress": 0, Review: 1, "To Do": 2, Done: 3 };
      if (sOrder[a.status] !== sOrder[b.status]) return sOrder[a.status] - sOrder[b.status];
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      if (!a.deadline && !b.deadline) return 0; if (!a.deadline) return 1; if (!b.deadline) return -1;
      return a.deadline < b.deadline ? -1 : 1;
    });
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
      if (tm.running) { var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0; n[tid] = { running: false, total: tm.total + el, startedAt: null }; }
      else { n[tid] = { running: true, total: tm.total, startedAt: ts() }; }
      return n;
    });
  };

  var saveTask = function(t) {
    if (t.id) { setTasks(function(p) { return p.map(function(x) { return x.id === t.id ? Object.assign({}, t, { updatedAt: ts() }) : x; }); }); addLog("EDIT", (team[user] ? team[user].name : "") + " a editat \"" + t.title + "\""); }
    else {
      // Feature 2: multi-assign - if assignees array has multiple, create one task per person
      var assignees = t.assignees && t.assignees.length > 0 ? t.assignees : [t.assignee];
      // Feature 3: campaign auto-split - if campaignItems, create individual tasks per item
      if (t.campaignItems && t.campaignItems.length > 0 && !t._isCampaignChild) {
        var parentId = gid();
        var parentTask = Object.assign({}, t, { id: parentId, createdBy: user, createdAt: ts(), updatedAt: ts(), _campaignParent: true });
        var childTasks = [];
        t.campaignItems.forEach(function(ci) {
          assignees.forEach(function(asg) {
            var childLinks = t.links ? t.links.slice() : []; if (ci.link) childLinks.push(ci.link);
            var child = { id: gid(), title: ci.name, description: t.description || "", assignee: asg, status: "To Do", priority: t.priority, platform: t.platform, taskType: t.taskType, department: t.department, shop: t.shop, product: "", productName: ci.name, deadline: t.deadline, links: childLinks, subtasks: [], comments: [], dependsOn: [], campaignItems: [], createdBy: user, createdAt: ts(), updatedAt: ts(), _campaignParentId: parentId, _pipelineNext: t._pipelineNext || "" };
            childTasks.push(child);
            setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[child.id] = [{ status: "To Do", at: ts() }]; return n; });
            if (asg !== user) addNotif("assigned", "Task nou: \"" + ci.name + "\"", child.id, asg);
          });
        });
        setTasks(function(p) { return [parentTask].concat(childTasks).concat(p); });
        addLog("CAMPAIGN", "Campaign \"" + t.title + "\" creat cu " + t.campaignItems.length + " produse x " + assignees.length + " persoane = " + childTasks.length + " taskuri");
        setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[parentId] = [{ status: "To Do", at: ts() }]; return n; });
      } else if (assignees.length > 1) {
        // Multi-assign without campaign: create copies
        var newTasks = [];
        assignees.forEach(function(asg) {
          var nt = Object.assign({}, t, { id: gid(), assignee: asg, createdBy: user, createdAt: ts(), updatedAt: ts() });
          newTasks.push(nt);
          setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[nt.id] = [{ status: "To Do", at: ts() }]; return n; });
          if (asg !== user) addNotif("assigned", "Task nou: \"" + t.title + "\"", nt.id, asg);
        });
        setTasks(function(p) { return newTasks.concat(p); });
        addLog("NEW", "Multi-assign \"" + t.title + "\" -> " + assignees.map(function(a) { return (team[a] || {}).name; }).join(", "));
      } else {
        var nt = Object.assign({}, t, { id: gid(), createdBy: user, createdAt: ts(), updatedAt: ts() });
        setTasks(function(p) { return [nt].concat(p); });
        addLog("NEW", (team[user] ? team[user].name : "") + " -> \"" + t.title + "\"");
        if (t.assignee && t.assignee !== user) addNotif("assigned", "Task nou: \"" + t.title + "\"", nt.id, t.assignee);
        setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[nt.id] = [{ status: "To Do", at: ts() }]; return n; });
      }
    }
    setShowAdd(false); setEditTask(null);
  };
  var delTask = function(tid) { var t = tasks.find(function(x) { return x.id === tid; }); if (t) addLog("DELETE", "Sters \"" + t.title + "\""); setTasks(function(p) { return p.filter(function(x) { return x.id !== tid; }); }); };
  var dupTask = function(t) { var nt = Object.assign({}, t, { id: gid(), title: t.title + " (copie)", status: "To Do", createdBy: user, createdAt: ts(), updatedAt: ts(), subtasks: (t.subtasks || []).map(function(s) { return { id: gid(), text: s.text, done: false }; }) }); setTasks(function(p) { return [nt].concat(p); }); addLog("DUPLICATE", "Duplicat \"" + t.title + "\""); };

  // Feature 5: check dependencies before status change
  var canChgDeps = function(tid, newSt) {
    var t = tasks.find(function(x) { return x.id === tid; });
    if (!t || !t.dependsOn || t.dependsOn.length === 0) return true;
    if (newSt === "To Do") return true;
    var ok = t.dependsOn.every(function(depId) { var dep = tasks.find(function(x) { return x.id === depId; }); return dep && dep.status === "Done"; });
    if (!ok) { addNotif("blocked", "\"" + t.title + "\" blocat - dependentele nu sunt Done", tid); return false; }
    return true;
  };

  var chgSt = function(tid, st) {
    if (!canChgDeps(tid, st)) return;
    var prevTask = tasks.find(function(x) { return x.id === tid; });
    // Feature 5: Campaign task - intercept Done to show finalize popup
    if (st === "Done" && prevTask && prevTask.campaignItems && prevTask.campaignItems.length > 0 && !prevTask._finalized) {
      setShowFinalize(prevTask);
      return;
    }
    setTasks(function(p) { return p.map(function(x) { return x.id === tid ? Object.assign({}, x, { status: st, updatedAt: ts() }) : x; }); });
    if (prevTask) addLog("STATUS", "\"" + prevTask.title + "\" -> " + st);
    // Feature 2: track status history
    setStatusHistory(function(prev) { var n = Object.assign({}, prev); if (!n[tid]) n[tid] = []; n[tid] = n[tid].concat([{ status: st, at: ts() }]); return n; });

    // Feature 7: autoplay timer
    if (st === "In Progress") {
      // Start timer automatically
      setTimers(function(p) {
        var tm = p[tid] || { running: false, total: 0, startedAt: null };
        if (!tm.running) {
          var n = Object.assign({}, p);
          n[tid] = { running: true, total: tm.total, startedAt: ts() };
          return n;
        }
        return p;
      });
    }
    if (st === "Done" || st === "To Do") {
      // Stop timer automatically
      var tm = timers[tid];
      if (tm && tm.running) {
        var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0;
        setTimers(function(p) { var n = Object.assign({}, p); n[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null }; return n; });
      }
    }
    // Feature 3: Pipeline - when Done, create task for next person in pipeline
    if (st === "Done" && prevTask && prevTask._pipelineNext) {
      var lastComment = (prevTask.comments || []).slice(-1)[0];
      var pipeDesc = prevTask.description || "";
      if (lastComment) pipeDesc = pipeDesc + "\n\nObservatii de la " + ((team[prevTask.assignee] || {}).name || "?") + ": " + lastComment.text;
      var pipeLinks = prevTask._replacedLink ? [prevTask._replacedLink] : (prevTask.links || []).slice();
      var pipeTask = { id: gid(), title: prevTask.title + " - Foto Produs", description: pipeDesc, assignee: prevTask._pipelineNext, status: "To Do", priority: prevTask.priority, platform: prevTask.platform || "", taskType: "Foto Produs", department: "FOTO PRODUS", shop: prevTask.shop, product: prevTask.product || "", productName: prevTask.productName || "", deadline: prevTask.deadline, links: pipeLinks, subtasks: [], comments: [], dependsOn: [prevTask.id], campaignItems: [], createdBy: prevTask.assignee, createdAt: ts(), updatedAt: ts(), _campaignParentId: prevTask._campaignParentId || "", _fromPipeline: prevTask.id, _replacedLink: prevTask._replacedLink || "", _replacedNote: prevTask._replacedNote || "", _replacedBy: prevTask._replacedBy || "", _originalLinks: prevTask._originalLinks || [] };
      setTasks(function(p) { return [pipeTask].concat(p); });
      setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[pipeTask.id] = [{ status: "To Do", at: ts() }]; return n; });
      addNotif("pipeline", "Task pipeline: \"" + pipeTask.title + "\" de la " + ((team[prevTask.assignee] || {}).name || "?"), pipeTask.id, prevTask._pipelineNext);
      addLog("PIPELINE", "\"" + prevTask.title + "\" Done -> creat \"" + pipeTask.title + "\" pentru " + ((team[prevTask._pipelineNext] || {}).name || "?"));
    }
  };

  var handleDrop = function(st) { if (!dragId) return; chgSt(dragId, st); setDragId(null); };

  // Feature 4: Bulk actions
  var bulkChgSt = function(ns) { selectedTasks.forEach(function(tid) { chgSt(tid, ns); }); setSelectedTasks([]); setBulkMode(false); };
  var bulkChgAssign = function(na) { setTasks(function(p) { return p.map(function(x) { return selectedTasks.includes(x.id) ? Object.assign({}, x, { assignee: na, updatedAt: ts() }) : x; }); }); addLog("BULK", "Bulk assign " + selectedTasks.length + " -> " + (team[na] || {}).name); setSelectedTasks([]); setBulkMode(false); };
  var bulkChgPrio = function(np) { setTasks(function(p) { return p.map(function(x) { return selectedTasks.includes(x.id) ? Object.assign({}, x, { priority: np, updatedAt: ts() }) : x; }); }); setSelectedTasks([]); setBulkMode(false); };
  var toggleSel = function(tid) { setSelectedTasks(function(p) { return p.includes(tid) ? p.filter(function(x) { return x !== tid; }) : p.concat([tid]); }); };

  // Notifications filtered per user: admin sees all, others see only theirs
  var myNotifs = useMemo(function() { if (!user) return []; var r = team[user] ? team[user].role : ""; return notifications.filter(function(n) { if (r === "admin") return true; return n.forUser === user; }); }, [notifications, user, team]);
  var unreadNotifs = useMemo(function() { return myNotifs.filter(function(n) { return !n.read; }); }, [myNotifs]);

  // Feature 9: SLA breach
  var slaBreaches = useMemo(function() {
    var b = [];
    tasks.forEach(function(t) {
      if (t.status === "Done" || !t.shop || !slas[t.shop]) return;
      var h = hDiff(t.createdAt, ts());
      if (h > slas[t.shop]) b.push({ task: t, hours: h, max: slas[t.shop] });
    });
    return b;
  }, [tasks, slas, tick]);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(216,22%,11%)", color: "#4ADE80", fontSize: 20, fontWeight: 700, fontFamily: "system-ui" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 8 }}>HeyAds</div><div style={{ fontSize: 12, color: "#7A8BA0" }}>Se incarca datele...</div></div></div>;

  if (!user) return <LoginScreen team={team} onLogin={handleLogin} />;
  var me = team[user]; if (!me) { setUser(null); localStorage.removeItem("s7_user"); return null; }
  var canCreate = me.role === "admin" || me.role === "pm";
  var isAdmin = me.role === "admin";

  if (profUser) return <div style={S.app}><style>{CSS}</style><ToastBanner toasts={toasts} onDismiss={dismissToast} /><ProfileView pu={profUser} team={team} tasks={tasks} timers={timers} getTS={getTS} logs={logs} sessions={sessions} getPerf={getPerf} range={profRange} setRange={setProfRange} onBack={function() { setProfUser(null); }} isMob={isMob} statusHistory={statusHistory} /></div>;

  var fProps = { stats: stats, dateF: dateF, setDateF: setDateF, statusF: statusF, setStatusF: setStatusF, prioF: prioF, setPrioF: setPrioF, assignF: assignF, setAssignF: setAssignF, shopF: shopF, setShopF: setShopF, visUsers: visUsers, shops: shops, count: filtered.length, team: team, departments: departments, deptFilter: deptFilter, setDeptFilter: setDeptFilter, platformFilter: platformFilter, setPlatformFilter: setPlatformFilter };

  var navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.dash, section: "dashboard" },
    { id: "tasks", label: "Taskuri", icon: Icons.tasks, count: stats.total, section: "tasks" },
    { id: "kanban", label: "Kanban Board", icon: Icons.kanban, section: "kanban" },
    { id: "calendar", label: "Calendar", icon: Icons.cal, section: "calendar" },
    { id: "heatmap", label: "Heatmap", icon: Icons.heat, section: "heatmap" },
    { id: "targets", label: "Targets", icon: Icons.target, section: "targets" },
    { id: "templates", label: "Templates", icon: Icons.tpl, section: "templates" },
    { id: "recurring", label: "Recurring", icon: Icons.recur, section: "recurring" },
    { id: "workload", label: "Workload", icon: Icons.work, section: "workload" },
    { id: "team", label: "Echipa", icon: Icons.team, section: "team" },
    { id: "performance", label: "Performance", icon: Icons.perf, section: "performance" },
    { id: "digest", label: "Weekly Digest", icon: Icons.digest, section: "digest" },
    { id: "sla", label: "SLA", icon: Icons.sla, section: "sla" },
    { id: "log", label: "Activity Log", icon: Icons.log, section: "log" },
    { id: "departments", label: "Departamente", icon: Icons.dept, section: "departments" },
    { id: "shops", label: "Magazine", icon: Icons.shops, section: "shops" },
    { id: "products", label: "Produse", icon: Icons.prod, section: "products" },
    { id: "sheets", label: "Sheets", icon: Icons.sheet, section: "sheets" },
    { id: "manage_users", label: "Manage Users", icon: Icons.usrs, section: "manage_users" },
  ];

  // Feature 1+4: Granular access control - admin sees all, others check team[user].access array
  var ALL_PAGES = ["dashboard","tasks","kanban","calendar","heatmap","targets","templates","recurring","workload","team","performance","digest","sla","log","departments","shops","products","sheets","manage_users"];
  var accessibleNav = navItems.filter(function(n) {
    if (me.role === "admin") return true;
    // If user has custom access array, use it
    if (me.access && me.access.length > 0) return me.access.includes(n.section);
    // Fallback: old role-based logic
    if (me.role === "pm") return !["manage_users", "log", "sla"].includes(n.section);
    if (me.role === "member") return ["tasks", "kanban", "calendar"].includes(n.section);
    return false;
  });

  return (
    <div style={S.app}><style>{CSS}</style>
      <ToastBanner toasts={toasts} onDismiss={dismissToast} />
      {isMob && mobNav && <div style={S.overlay} onClick={function() { setMobNav(false); }} />}
      <aside style={Object.assign({}, S.sidebar, isMob ? { position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 200, transform: mobNav ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.2s" } : {})}>
        <div style={S.logoArea}><span style={S.logoH}>HeyAds</span><span style={S.logoSub}>TASK MANAGER</span></div>
        {canCreate && <div style={{ padding: "0 16px", marginBottom: 4 }}><button style={S.newBtn} onClick={function() { setEditTask(null); setShowAdd(true); setMobNav(false); }}><Ic d={Icons.plus} size={16} color="#fff" /> New Task</button></div>}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {accessibleNav.map(function(n) { return <div key={n.id} style={S.navItem(page === n.id)} onClick={function() { setPage(n.id); setMobNav(false); }}><Ic d={n.icon} size={18} color={page === n.id ? "#4ADE80" : "#7A8BA0"} /><span style={{ flex: 1 }}>{n.label}</span>{n.count != null && <span style={S.navBadge}>{n.count}</span>}{n.id === "sla" && slaBreaches.length > 0 && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} />}</div>; })}
        </nav>
        <div style={S.sidebarUser}><Av color={me.color} size={32}>{me.name[0]}</Av><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#D1D9E6" }}>{me.name}</div><div style={{ fontSize: 10, color: "#7A8BA0", textTransform: "capitalize" }}>{me.role === "pm" ? "Project Manager" : me.role}</div></div></div>
        <div style={{ padding: "0 16px 16px" }}><button style={S.logoutBtn} onClick={handleLogout}><Ic d={Icons.out} size={15} color="#7A8BA0" /> Sign out</button></div>
      </aside>
      <main style={S.main}>
        <header style={S.topbar}>
          {isMob && <button style={S.menuBtn} onClick={function() { setMobNav(true); }}><Ic d={Icons.menu} size={22} color="#475569" /></button>}
          <h1 style={S.pageTitle}>{(accessibleNav.find(function(n) { return n.id === page; }) || {}).label || ""}</h1>
          <div style={{ flex: 1 }} />
          {page === "tasks" && canCreate && <button style={Object.assign({}, S.chip, { background: bulkMode ? "#DC2626" : "#F1F5F9", color: bulkMode ? "#fff" : "#475569", marginRight: 8 })} onClick={function() { setBulkMode(!bulkMode); setSelectedTasks([]); }}><Ic d={Icons.check} size={14} color={bulkMode ? "#fff" : "#475569"} /> {bulkMode ? "Exit Bulk" : "Bulk"}</button>}
          <div style={{ position: "relative" }}>
            <button style={S.iconBtn} onClick={function() { setShowNotifs(!showNotifs); }}><Ic d={Icons.bell} size={20} color="#475569" /></button>
            {unreadNotifs.length > 0 && <span style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, borderRadius: "50%", background: "#DC2626", color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{unreadNotifs.length}</span>}
            {showNotifs && <div style={{ position: "absolute", top: 36, right: 0, width: 340, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 100, padding: 12, maxHeight: 360, overflowY: "auto", border: "1px solid hsl(214,18%,90%)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontWeight: 700, fontSize: 13 }}>Notificari</span><button style={{ border: "none", background: "none", fontSize: 11, color: "#94A3B8", cursor: "pointer" }} onClick={function() { setNotifications(function(p) { return p.map(function(n) { return Object.assign({}, n, { read: true }); }); }); }}>Citite</button></div>
              {myNotifs.slice(0, 20).map(function(n) { return <div key={n.id} style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: n.read ? "#F8FAFC" : GR + "12", border: "1px solid " + (n.read ? "#F1F5F9" : GR + "30"), fontSize: 12 }} onClick={function() { setNotifications(function(p) { return p.map(function(nn) { return nn.id === n.id ? Object.assign({}, nn, { read: true }) : nn; }); }); setShowNotifs(false); }}><div>{n.message}</div><div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{fr(n.time)}</div></div>; })}
              {notifications.length === 0 && <div style={{ textAlign: "center", color: "#94A3B8", padding: 16, fontSize: 12 }}>Nicio notificare</div>}
            </div>}
          </div>
          {(page === "tasks" || page === "kanban") && canCreate && <button style={Object.assign({}, S.primBtn, { marginLeft: 8 })} onClick={function() { setEditTask(null); setShowAdd(true); }}><Ic d={Icons.plus} size={15} color="#fff" /> New Task</button>}
        </header>
        <div style={S.content}>
          {bulkMode && selectedTasks.length > 0 && <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: GR + "08" }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{selectedTasks.length} selectate</span>
            <select style={S.fSel} onChange={function(e) { if (e.target.value) bulkChgSt(e.target.value); e.target.value = ""; }}><option value="">Status...</option>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
            <select style={S.fSel} onChange={function(e) { if (e.target.value) bulkChgAssign(e.target.value); e.target.value = ""; }}><option value="">Assignee...</option>{assUsers.map(function(u2) { return <option key={u2} value={u2}>{(team[u2] || {}).name}</option>; })}</select>
            <select style={S.fSel} onChange={function(e) { if (e.target.value) bulkChgPrio(e.target.value); e.target.value = ""; }}><option value="">Prioritate...</option>{PRIORITIES.map(function(p2) { return <option key={p2} value={p2}>{p2}</option>; })}</select>
            <button style={S.cancelBtn} onClick={function() { setSelectedTasks([]); }}>Deselecteaza</button>
          </Card>}
          {page === "dashboard" && <DashPage stats={stats} tasks={visTasks} team={team} visUsers={visUsers} sessions={sessions} timers={timers} getTS={getTS} getPerf={getPerf} isMob={isMob} onClickUser={setProfUser} targets={targets} loginTrack={loginTrack} allTasks={tasks} slaBreaches={slaBreaches} me={me} />}
          {page === "tasks" && <TasksPage fProps={fProps} grouped={grouped} filtered={filtered} user={user} team={team} onEdit={function(t) { setEditTask(t); setShowAdd(true); }} onView={setViewTask} onDel={delTask} onDup={dupTask} onChgSt={chgSt} isMob={isMob} timers={timers} getTS={getTS} togTimer={togTimer} bulkMode={bulkMode} selectedTasks={selectedTasks} toggleSel={toggleSel} />}
          {page === "kanban" && <KanbanPage fProps={fProps} tasks={filtered} user={user} team={team} onEdit={function(t) { setEditTask(t); setShowAdd(true); }} onDel={delTask} onDup={dupTask} onChgSt={chgSt} dragId={dragId} setDragId={setDragId} handleDrop={handleDrop} isMob={isMob} timers={timers} getTS={getTS} togTimer={togTimer} />}
          {page === "calendar" && <CalendarPage tasks={visTasks} user={user} team={team} calDate={calDate} setCalDate={setCalDate} onView={setViewTask} isMob={isMob} me={me} />}
          {page === "heatmap" && <HeatmapPage tasks={tasks} team={team} visUsers={visUsers} isMob={isMob} />}
          {page === "targets" && <TargetsPage targets={targets} setTargets={setTargets} team={team} tasks={tasks} timers={timers} canEdit={canCreate} visUsers={visUsers} taskTypes={taskTypes} departments={departments} />}
          {page === "templates" && <TemplatesPage templates={templates} setTemplates={setTemplates} canEdit={canCreate} isAdmin={isAdmin} shops={shops} onCreateFromTpl={function(tpl) { setEditTask({ title: tpl.name, description: tpl.description, shop: tpl.shop || "", subtasks: tpl.subtasks.map(function(s) { return { id: gid(), text: s, done: false }; }) }); setShowAdd(true); }} />}
          {page === "recurring" && <RecurringPage recurringTasks={recurringTasks} setRecurringTasks={setRecurringTasks} team={team} assUsers={assUsers} shops={shops} departments={departments} canEdit={canCreate} />}
          {page === "workload" && <WorkPage users={visUsers} team={team} tasks={visTasks} getPerf={getPerf} timers={timers} getTS={getTS} isMob={isMob} onClickUser={setProfUser} />}
          {page === "team" && <TeamPage users={visUsers} team={team} sessions={sessions} getPerf={getPerf} isMob={isMob} onClickUser={setProfUser} />}
          {page === "performance" && <PerfPage users={visUsers} team={team} getPerf={getPerf} isMob={isMob} />}
          {page === "digest" && <DigestPage team={team} tasks={tasks} timers={timers} getPerf={getPerf} visUsers={visUsers} isMob={isMob} />}
          {page === "sla" && <SLAPage slas={slas} setSlas={setSlas} shops={shops} tasks={tasks} team={team} slaBreaches={slaBreaches} isMob={isMob} />}
          {page === "log" && <LogPage logs={logs} visUsers={visUsers} isMob={isMob} />}
          {page === "departments" && <DeptPage departments={departments} setDepartments={setDepartments} tasks={tasks} team={team} visUsers={visUsers} isMob={isMob} canEdit={canCreate} />}
          {page === "shops" && <ShopsBordPage shops={shops} setShops={setShops} tasks={tasks} team={team} isMob={isMob} canEdit={canCreate} slas={slas} />}
          {page === "products" && <ProdsPage products={products} setProducts={setProducts} shops={shops} />}
          {page === "sheets" && <SheetsPage sheets={sheets} setSheets={setSheets} shops={shops} />}
          {page === "manage_users" && <UsersPage team={team} setTeam={setTeam} addLog={addLog} />}
        </div>
      </main>
      {showAdd && <TaskModal task={editTask} team={team} assUsers={assUsers} shops={shops} products={products} onSave={saveTask} onClose={function() { setShowAdd(false); setEditTask(null); }} taskTypes={taskTypes} departments={departments} allTasks={tasks} />}
      {viewTask && <ViewTaskModal task={viewTask} team={team} user={user} tasks={tasks} setTasks={setTasks} timers={timers} getTS={getTS} togTimer={togTimer} products={products} onClose={function() { setViewTask(null); }} onEdit={function() { setEditTask(viewTask); setViewTask(null); setShowAdd(true); }} statusHistory={statusHistory} />}
      {/* Feature 5: Campaign finalize popup */}
      {showFinalize && <CampaignFinalizeModal task={showFinalize} onFinalize={function(count) {
        var tid = showFinalize.id;
        setTasks(function(p) { return p.map(function(x) { return x.id === tid ? Object.assign({}, x, { status: "Done", updatedAt: ts(), _finalized: true, _finalizedCount: count }) : x; }); });
        addLog("CAMPAIGN", "\"" + showFinalize.title + "\" finalizat: " + count + "/" + (showFinalize.campaignItems || []).length + " produse");
        addNotif("campaign", "Campaign \"" + showFinalize.title + "\" finalizat: " + count + " produse", tid);
        setStatusHistory(function(prev) { var n = Object.assign({}, prev); if (!n[tid]) n[tid] = []; n[tid] = n[tid].concat([{ status: "Done", at: ts() }]); return n; });
        // Stop timer
        var tm = timers[tid]; if (tm && tm.running) { var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0; setTimers(function(p2) { var n2 = Object.assign({}, p2); n2[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null }; return n2; }); }
        setShowFinalize(null);
      }} onClose={function() { setShowFinalize(null); }} />}
    </div>
  );
}

function LoginScreen({ team, onLogin }) {
  var [u, setU] = useState(""); var [p, setP] = useState(""); var [show, setShow] = useState(false); var [err, setErr] = useState("");
  var go = function() { if (!onLogin(u.toLowerCase().trim(), p)) setErr("Username sau parola gresita"); };
  return <div style={S.loginWrap}><style>{CSS}</style><div style={S.loginCard}><div style={{ textAlign: "center", marginBottom: 28 }}><div style={{ fontSize: 28, fontWeight: 800, color: "#4ADE80", letterSpacing: 1 }}>HeyAds</div><div style={{ fontSize: 11, color: "#94A3B8", letterSpacing: 2, marginTop: 4, textTransform: "uppercase" }}>Task Manager</div></div><label style={S.label}>Username</label><input style={S.input} value={u} onChange={function(e) { setU(e.target.value); setErr(""); }} onKeyDown={function(e) { if (e.key === "Enter") go(); }} placeholder="User" /><label style={Object.assign({}, S.label, { marginTop: 14 })}>Parola</label><div style={{ position: "relative" }}><input style={Object.assign({}, S.input, { paddingRight: 42 })} type={show ? "text" : "password"} value={p} onChange={function(e) { setP(e.target.value); setErr(""); }} onKeyDown={function(e) { if (e.key === "Enter") go(); }} placeholder="Introdu parola" /><button type="button" style={S.eyeBtn} onClick={function() { setShow(!show); }}><Ic d={show ? Icons.eyeX : Icons.eye} size={16} color="#94A3B8" /></button></div>{err && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 10, textAlign: "center" }}>{err}</div>}<button style={Object.assign({}, S.primBtn, { width: "100%", marginTop: 20, padding: "12px 0", fontSize: 14, justifyContent: "center" })} onClick={go}>Intra in platforma</button></div></div>;
}

function FiltersBar({ stats, dateF, setDateF, statusF, setStatusF, prioF, setPrioF, assignF, setAssignF, shopF, setShopF, visUsers, shops, count, team, noStatus, departments, deptFilter, setDeptFilter, platformFilter, setPlatformFilter }) {
  var chips = [{ id: "all", l: "Toate" }, { id: "today", l: "Azi", n: stats.today }, { id: "tomorrow", l: "Maine" }, { id: "overdue", l: "Intarziate", n: stats.overdue }, { id: "upcoming", l: "Viitoare" }, { id: "nodate", l: "Fara data" }];
  return <div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{chips.map(function(c) { return <button key={c.id} onClick={function() { setDateF(c.id); }} style={Object.assign({}, S.chip, { background: dateF === c.id ? GR : "#F1F5F9", color: dateF === c.id ? "#fff" : "#475569", fontWeight: dateF === c.id ? 600 : 400 })}>{c.l}{c.n > 0 && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>({c.n})</span>}</button>; })}</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>{!noStatus && <select style={S.fSel} value={statusF} onChange={function(e) { setStatusF(e.target.value); }}><option value="all">Status: Toate</option>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>}<select style={S.fSel} value={prioF} onChange={function(e) { setPrioF(e.target.value); }}><option value="all">Prioritate: Toate</option>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select><select style={S.fSel} value={assignF} onChange={function(e) { setAssignF(e.target.value); }}><option value="all">Persoana: Toti</option>{visUsers.filter(function(u) { return u !== "admin"; }).map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name || u}</option>; })}</select><select style={S.fSel} value={shopF} onChange={function(e) { setShopF(e.target.value); }}><option value="all">Magazin: Toate</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>{departments && <select style={S.fSel} value={deptFilter || "all"} onChange={function(e) { if (setDeptFilter) setDeptFilter(e.target.value); }}><option value="all">Dept: Toate</option>{departments.map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select>}<select style={S.fSel} value={platformFilter || "all"} onChange={function(e) { if (setPlatformFilter) setPlatformFilter(e.target.value); }}><option value="all">Platforma: Toate</option>{PLATFORMS.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select><span style={{ fontSize: 12, color: "#94A3B8" }}>{count} taskuri</span></div></div>;
}

// Feature 1, 2, 3, 4: Enhanced Dashboard
function DashPage({ stats, tasks, team, visUsers, sessions, timers, getTS, getPerf, isMob, onClickUser, targets, loginTrack, allTasks, slaBreaches, me }) {
  // Feature 1: date range selector
  var [dashFrom, setDashFrom] = useState(TD);
  var [dashTo, setDashTo] = useState(TD);
  var [dashPreset, setDashPreset] = useState("today");

  var setPreset = function(p) {
    setDashPreset(p);
    if (p === "today") { setDashFrom(TD); setDashTo(TD); }
    else if (p === "yesterday") { setDashFrom(YESTERDAY); setDashTo(YESTERDAY); }
    else if (p === "week") { var d = new Date(); d.setDate(d.getDate() - 7); setDashFrom(ds(d)); setDashTo(TD); }
    else if (p === "month") { var d2 = new Date(); d2.setDate(d2.getDate() - 30); setDashFrom(ds(d2)); setDashTo(TD); }
  };

  // Filter tasks by date range for dashboard
  var rangeTasks = useMemo(function() {
    return tasks.filter(function(t) {
      var taskDate = t.deadline || (t.createdAt ? ds(t.createdAt) : null);
      if (!taskDate) return false;
      var d = typeof taskDate === "string" && taskDate.length > 10 ? ds(taskDate) : taskDate;
      return d >= dashFrom && d <= dashTo;
    });
  }, [tasks, dashFrom, dashTo]);

  var rangeStats = useMemo(function() {
    var s = { total: rangeTasks.length, todo: 0, inProg: 0, review: 0, done: 0, overdue: 0 };
    rangeTasks.forEach(function(t) {
      if (t.status === "To Do") s.todo++;
      if (t.status === "In Progress") s.inProg++;
      if (t.status === "Review") s.review++;
      if (t.status === "Done") s.done++;
      if (isOv(t)) s.overdue++;
    });
    return s;
  }, [rangeTasks]);

  var activeTimers = tasks.filter(function(t) { return timers[t.id] && timers[t.id].running; });

  var ppl = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) {
    var ut = tasks.filter(function(t) { return t.assignee === u; });
    var rangeUt = rangeTasks.filter(function(t) { return t.assignee === u; });
    var lss = sessions[u]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000;
    var act = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; });
    // Feature 3: login KPIs
    var todayLogin = loginTrack && loginTrack[u] && loginTrack[u][TD];
    var firstLogin = todayLogin ? todayLogin.first : null;
    var lastLogin = todayLogin ? todayLogin.last : null;
    var hasLoggedToday = !!todayLogin;
    // Feature 4: tasks breakdown for each user
    var assignedTasks = rangeUt.filter(function(t) { return t.status !== "Done"; });
    var workingTasks = rangeUt.filter(function(t) { return t.status === "In Progress"; });
    var doneTasks = rangeUt.filter(function(t) { return t.status === "Done"; });
    // Feature 2: daily target progress
    var userTargets = (targets || []).filter(function(tgt) { return tgt.userId === u; });
    var todayDone = allTasks.filter(function(t) { return t.assignee === u && t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD; }).length;

    return { key: u, name: team[u].name, color: team[u].color, role: team[u].role, online: on, act: act, perf: getPerf(u), total: ut.length, firstLogin: firstLogin, lastLogin: lastLogin, hasLoggedToday: hasLoggedToday, assignedTasks: assignedTasks, workingTasks: workingTasks, doneTasks: doneTasks, userTargets: userTargets, todayDone: todayDone, rangeDone: rangeUt.filter(function(t) { return t.status === "Done"; }).length, rangeTotal: rangeUt.length };
  });

  return <div>
    {/* Feature 1: Date range selector */}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
      {[{ id: "today", l: "Azi" }, { id: "yesterday", l: "Ieri" }, { id: "week", l: "7 zile" }, { id: "month", l: "30 zile" }, { id: "custom", l: "Custom" }].map(function(p) {
        return <button key={p.id} onClick={function() { setPreset(p.id); }} style={Object.assign({}, S.chip, { background: dashPreset === p.id ? GR : "#F1F5F9", color: dashPreset === p.id ? "#fff" : "#475569", fontWeight: dashPreset === p.id ? 600 : 400 })}>{p.l}</button>;
      })}
      <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 8 }}>De la:</span>
      <input type="date" style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 8px" })} value={dashFrom} onChange={function(e) { setDashFrom(e.target.value); setDashPreset("custom"); }} />
      <span style={{ fontSize: 11, color: "#94A3B8" }}>Pana la:</span>
      <input type="date" style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 8px" })} value={dashTo} onChange={function(e) { setDashTo(e.target.value); setDashPreset("custom"); }} />
    </div>

    {/* SLA Breaches alert */}
    {slaBreaches && slaBreaches.length > 0 && me && me.role === "admin" && <Card style={{ marginBottom: 16, borderLeft: "3px solid #DC2626", background: "#FEF2F2" }}><h3 style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>SLA Breaches ({slaBreaches.length})</h3>{slaBreaches.slice(0, 5).map(function(b) { return <div key={b.task.id} style={{ fontSize: 12, padding: "4px 0", display: "flex", gap: 8 }}><span style={{ fontWeight: 600 }}>{b.task.title}</span><Badge bg="#FEF2F2" color="#DC2626">{b.task.shop}</Badge><span style={{ color: "#DC2626" }}>{b.hours}h / {b.max}h max</span></div>; })}</Card>}

    {/* KPIs for selected period */}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(6,1fr)", gap: 12, marginBottom: 24 }}>{[{ l: "Total", v: rangeStats.total, c: "#475569" }, { l: "To Do", v: rangeStats.todo, c: "#94A3B8" }, { l: "In Progress", v: rangeStats.inProg, c: "#2563EB" }, { l: "Review", v: rangeStats.review, c: "#D97706" }, { l: "Intarziate", v: rangeStats.overdue, c: "#DC2626" }, { l: "Done", v: rangeStats.done, c: GR }].map(function(s) { return <Card key={s.l} style={{ borderTop: "3px solid " + s.c }}><div style={{ fontSize: 28, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{s.l}</div></Card>; })}</div>

    {activeTimers.length > 0 && <Card style={{ marginBottom: 20, borderLeft: "3px solid #DC2626" }}><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite" }} /> Live ({activeTimers.length})</h3>{activeTimers.map(function(t) { var a = team[t.assignee]; return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>{a && <Av color={a.color} size={24} fs={10}>{a.name[0]}</Av>}<span style={{ fontSize: 12, color: "#64748B" }}>{a ? a.name : ""}</span><span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{t.title}</span>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}<span style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{ft(getTS(t.id))}</span></div>; })}</Card>}

    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Echipa</h3>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(380,1fr))", gap: 12 }}>{ppl.map(function(d) {
      return <Card key={d.key} style={{ cursor: "pointer" }}>
        <div onClick={function() { onClickUser(d.key); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ position: "relative" }}><Av color={d.color} size={38}>{d.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: d.online ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>{d.role === "pm" ? "PM" : "Member"}</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: d.perf.score >= 70 ? GR : d.perf.score >= 40 ? "#D97706" : "#DC2626" }}>{d.perf.score}%</div>
          </div>

          {/* Feature 3: Login KPIs - only admin sees these */}
          {me && me.role === "admin" && <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#94A3B8", marginBottom: 8, flexWrap: "wrap" }}>
            <Badge bg={d.hasLoggedToday ? "#ECFDF5" : "#FEF2F2"} color={d.hasLoggedToday ? GR : "#DC2626"}>{d.hasLoggedToday ? "Activ azi" : "Nu a intrat azi"}</Badge>
            {d.firstLogin && <span>Prima logare: {new Date(d.firstLogin).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>}
            {d.lastLogin && <span>Ultima: {new Date(d.lastLogin).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>}

          {/* Feature 2: Daily target progress */}
          {d.userTargets.length > 0 && d.userTargets.map(function(tgt) {
            var pct = tgt.target > 0 ? Math.min(100, (d.todayDone / tgt.target) * 100) : 0;
            return <div key={tgt.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: "#64748B" }}>Target: {tgt.metric}</span>
                <span style={{ fontWeight: 700, color: pct >= 100 ? GR : "#DC2626" }}>{d.todayDone}/{tgt.target}</span>
              </div>
              <div style={S.progBg}><div style={S.progBar(pct >= 100 ? GR : pct >= 50 ? "#D97706" : "#DC2626", pct)} /></div>
            </div>;
          })}

          {d.act.length > 0 && <div style={{ marginBottom: 6 }}>{d.act.map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#DC2626", padding: "2px 0" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite" }} />{t.title} - {ft(getTS(t.id))}</div>; })}</div>}

          {/* Feature 4: Tasks breakdown under each name */}
          <div style={{ marginTop: 6, borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Taskuri atribuite ({d.assignedTasks.length}) | In lucru ({d.workingTasks.length}) | Done ({d.rangeDone})</div>
            {d.workingTasks.length > 0 && <div style={{ marginBottom: 4 }}>{d.workingTasks.slice(0, 5).map(function(t) {
              return <div key={t.id} style={{ fontSize: 11, padding: "2px 8px", marginBottom: 2, borderRadius: 4, background: SBG["In Progress"], display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: SC["In Progress"] }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                {t.shop && <span style={{ fontSize: 9, color: GR }}>{t.shop}</span>}
              </div>;
            })}</div>}
            {d.assignedTasks.filter(function(t) { return t.status !== "In Progress"; }).length > 0 && <div>{d.assignedTasks.filter(function(t) { return t.status !== "In Progress"; }).slice(0, 3).map(function(t) {
              return <div key={t.id} style={{ fontSize: 11, padding: "2px 8px", marginBottom: 2, borderRadius: 4, background: SBG[t.status] || "#F8FAFC", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: SC[t.status] }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                <Badge bg={SC[t.status] + "18"} color={SC[t.status]}>{t.status}</Badge>
              </div>;
            })}</div>}
            {d.assignedTasks.length > 8 && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>+{d.assignedTasks.length - 8} altele</div>}
            {me && me.role === "admin" && d.assignedTasks.length === 0 && d.workingTasks.length === 0 && <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>Fara taskuri active - atribuie taskuri noi!</div>}
          </div>
        </div>
      </Card>;
    })}</div>
  </div>;
}

function ProfileView({ pu, team, tasks, timers, getTS, logs, sessions, getPerf, range, setRange, onBack, isMob, statusHistory }) {
  var m = team[pu]; if (!m) return null; var ut = tasks.filter(function(t) { return t.assignee === pu; }); var lss = sessions[pu]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000; var perf = getPerf(pu); var uLogs = logs.filter(function(l) { return l.user === pu; }).slice(0, 50); var actNow = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; });
  var filt = ut.filter(function(t) { if (range === "all") return true; if (range === "today") return isTd(t.deadline) || isTd(t.createdAt); if (range === "week") return new Date(t.createdAt || t.deadline || 0).getTime() > Date.now() - 7 * 86400000; if (range === "month") return new Date(t.createdAt || t.deadline || 0).getTime() > Date.now() - 30 * 86400000; return true; });
  // Feature 2: compute time in each status per task
  var getTimeInStatus = function(tid) {
    var hist = (statusHistory || {})[tid] || [];
    var tis = {};
    for (var i2 = 0; i2 < hist.length; i2++) { var nx = hist[i2 + 1]; var dur = nx ? hDiff(hist[i2].at, nx.at) : 0; tis[hist[i2].status] = (tis[hist[i2].status] || 0) + Math.round(dur); }
    return tis;
  };
  return <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: isMob ? 16 : 32 }}>
    <button style={Object.assign({}, S.cancelBtn, { marginBottom: 20, display: "flex", alignItems: "center", gap: 6 })} onClick={onBack}><Ic d={Icons.back} size={16} color="#64748B" /> Inapoi</button>
    <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}><div style={{ position: "relative" }}><Av color={m.color} size={56} fs={22}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2.5px solid #fff" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 20, fontWeight: 700 }}>{m.name}</div><div style={{ fontSize: 12, color: "#94A3B8" }}>{m.role === "pm" ? "PM" : m.role} | {on ? "Online" : "Offline - " + fr(lss)}</div></div><div style={{ textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 700, color: perf.score >= 70 ? GR : perf.score >= 40 ? "#D97706" : "#DC2626" }}>{perf.score}%</div><div style={{ fontSize: 10, color: "#94A3B8" }}>Performance</div></div><div style={{ display: "flex", gap: 8 }}>{[{ l: "Done", v: perf.done, c: GR }, { l: "Active", v: perf.active, c: "#2563EB" }, { l: "Review", v: perf.review, c: "#D97706" }, { l: "Overdue", v: perf.overdue, c: "#DC2626" }].map(function(x) { return <div key={x.l} style={{ textAlign: "center", padding: "4px 12px", background: x.c + "12", borderRadius: 8 }}><div style={{ fontSize: 18, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 9, color: "#94A3B8" }}>{x.l}</div></div>; })}</div></Card>
    {actNow.length > 0 && <Card style={{ marginBottom: 16, borderLeft: "3px solid #DC2626" }}><h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#DC2626" }}>Lucreaza acum</h3>{actNow.map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12 }}><span style={{ fontWeight: 600 }}>{t.title}</span>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}<span style={{ marginLeft: "auto", fontWeight: 700, color: "#DC2626" }}>{ft(getTS(t.id))}</span></div>; })}</Card>}
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>{[{ id: "all", l: "Toate" }, { id: "today", l: "Azi" }, { id: "week", l: "7 zile" }, { id: "month", l: "30 zile" }].map(function(r) { return <button key={r.id} onClick={function() { setRange(r.id); }} style={Object.assign({}, S.chip, { background: range === r.id ? GR : "#F1F5F9", color: range === r.id ? "#fff" : "#475569", fontWeight: range === r.id ? 600 : 400 })}>{r.l}</button>; })}</div>
    <Card><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Taskuri ({filt.length})</h3>{filt.length === 0 ? <div style={{ color: "#94A3B8", padding: 16, textAlign: "center" }}>Niciun task.</div> : filt.map(function(t) { var tis = getTimeInStatus(t.id); return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F8FAFC", flexWrap: "wrap", background: SBG[t.status], borderRadius: 6, paddingLeft: 8, marginBottom: 2 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: SC[t.status] }} /><span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{t.title}</span><Badge bg={SC[t.status] + "18"} color={SC[t.status]}>{t.status}</Badge>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}{Object.keys(tis).length > 0 && <span style={{ fontSize: 10, color: "#64748B" }}>{Object.entries(tis).map(function(e) { return e[0] + ":" + e[1] + "h"; }).join(" | ")}</span>}</div>; })}</Card>
    <Card style={{ marginTop: 16 }}><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Activitate</h3>{uLogs.length === 0 ? <div style={{ color: "#94A3B8", padding: 16, textAlign: "center" }}>Nicio activitate.</div> : uLogs.map(function(l) { return <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F8FAFC", fontSize: 12 }}><span style={{ color: "#CBD5E1", minWidth: 100 }}>{ff(l.time)}</span><span style={{ fontWeight: 600, color: "#64748B" }}>{l.action}</span><span style={{ color: "#94A3B8" }}>{l.detail}</span></div>; })}</Card>
  </div>;
}

// Feature 8: Status-colored task row
function TRow({ t, user, team, onEdit, onView, onDel, onDup, onChgSt, isMob, secs, running, togTimer, bulkMode, isSelected, toggleSel }) {
  var me = team[user] || {}; var a = team[t.assignee] || {}; var ov = isOv(t); var can = me.role === "admin" || me.role === "pm" || t.assignee === user;
  var doneS = (t.subtasks || []).filter(function(s) { return s.done; }).length; var totalS = (t.subtasks || []).length;
  return <Card style={{ display: "flex", flexDirection: isMob ? "column" : "row", alignItems: isMob ? "stretch" : "center", gap: 10, marginBottom: 6, borderLeft: "3px solid " + (ov ? "#EF4444" : SC[t.status] || "#E2E8F0"), background: ov ? "#FFFBFB" : SBG[t.status] || "#fff" }}>
    {bulkMode && <input type="checkbox" checked={isSelected} onChange={function() { if (toggleSel) toggleSel(t.id); }} style={{ width: 18, height: 18, accentColor: GR }} />}
    {!bulkMode && can && <button style={Object.assign({}, S.stDot, { color: SC[t.status], background: SC[t.status] + "12", border: "1.5px solid " + SC[t.status] + "40" })} onClick={function() { var i = STATUSES.indexOf(t.status); onChgSt(t.id, STATUSES[(i + 1) % STATUSES.length]); }}>{SI[t.status]}</button>}
    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={function() { if (onView) onView(t); }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</span><Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>{t.platform && <Badge bg="#F1F5F9" color="#475569">{t.platform}</Badge>}{t.taskType && <Badge bg="#F5F3FF" color="#7C3AED">{t.taskType}</Badge>}{t.department && <Badge bg="#FFF7ED" color="#EA580C">{t.department}</Badge>}{t.dependsOn && t.dependsOn.length > 0 && <Badge bg="#EFF6FF" color="#2563EB"><Ic d={Icons.dep} size={8} color="#2563EB" /> {t.dependsOn.length} dep</Badge>}{t.campaignItems && t.campaignItems.length > 0 && <Badge bg="#F0FDF4" color={GR}>{t.campaignItems.length} produse</Badge>}{t.recurring && <Badge bg="#ECFDF5" color={GR}><Ic d={Icons.recur} size={8} color={GR} /></Badge>}{ov && <Badge bg="#FEF2F2" color="#DC2626">INTARZIAT</Badge>}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94A3B8", flexWrap: "wrap" }}>{a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={16} fs={8}>{a.name[0]}</Av>{a.name}</span>}{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}{t.productName && <Badge bg="#EFF6FF" color="#2563EB">{t.productName}</Badge>}{t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}{t.links && t.links.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Ic d={Icons.link} size={10} color="#94A3B8" /> {t.links.length}</span>}{totalS > 0 && <span><Ic d={Icons.check} size={10} color="#94A3B8" /> {doneS}/{totalS}</span>}</div>
      {t.description && <div style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isMob ? "100%" : 400, marginBottom: 3 }}>{t.description}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      {can && t.status !== "Done" && <button onClick={togTimer} style={Object.assign({}, S.timerBtn, { background: running ? "#FEF2F2" : "#F8FAFC", color: running ? "#DC2626" : GR, borderColor: running ? "#FECACA" : "#E2E8F0" })}><Ic d={running ? Icons.stop : Icons.play} size={12} color={running ? "#DC2626" : GR} />{secs > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{ft(secs)}</span>}</button>}
      {t.status === "Done" && secs > 0 && <span style={{ fontSize: 11, color: "#94A3B8" }}>{ft(secs)}</span>}
      <select style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 6px" })} value={t.status} onChange={function(e) { onChgSt(t.id, e.target.value); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
      <button style={S.iconBtn} onClick={function() { onDup(t); }}><Ic d={Icons.copy} size={14} color="#94A3B8" /></button>
      <button style={S.iconBtn} onClick={function() { onEdit(t); }}><Ic d={Icons.edit} size={14} color="#94A3B8" /></button>
      {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) onDel(t.id); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
    </div>
  </Card>;
}

// Feature 10: Tasks page with status sections
function TasksPage({ fProps, grouped, filtered, user, team, onEdit, onView, onDel, onDup, onChgSt, isMob, timers, getTS, togTimer, bulkMode, selectedTasks, toggleSel }) {
  var st = fProps.stats;

  // Feature 10: group by status sections
  var statusGroups = useMemo(function() {
    var groups = {};
    var order = ["Urgent_active", "In Progress", "Review", "To Do", "Done"];
    // Separate urgent tasks
    var urgent = filtered.filter(function(t) { return t.priority === "Urgent" && t.status !== "Done"; });
    var rest = filtered.filter(function(t) { return !(t.priority === "Urgent" && t.status !== "Done"); });
    groups["Urgent"] = urgent;
    STATUSES.forEach(function(s) { groups[s] = rest.filter(function(t) { return t.status === s; }); });
    return groups;
  }, [filtered]);

  return <div>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>{[{ l: "Total", v: st.total, c: "#475569", i: Icons.tasks }, { l: "Azi", v: st.today, c: "#2563EB", i: Icons.work }, { l: "In Progress", v: st.inProg, c: "#D97706", i: Icons.work }, { l: "Intarziate", v: st.overdue, c: "#DC2626", i: Icons.work }, { l: "Finalizate", v: st.done, c: GR, i: Icons.tasks }].map(function(s) { return <Card key={s.l} style={{ display: "flex", alignItems: "center", gap: 12, background: s.c + "08" }}><div style={{ width: 40, height: 40, borderRadius: 10, background: s.c + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d={s.i} size={20} color={s.c} /></div><div><div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, color: s.c + "99" }}>{s.l}</div></div></Card>; })}</div>
    <FiltersBar {...fProps} />

    {/* Feature 10: Status-delimited sections */}
    {statusGroups["Urgent"].length > 0 && <div style={{ marginBottom: 20 }}>
      <div style={Object.assign({}, S.groupHdr, { color: "#DC2626" })}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite" }} />URGENT</span><span style={S.countBadge}>{statusGroups["Urgent"].length}</span></div>
      {statusGroups["Urgent"].map(function(t) { return <TRow key={t.id} t={t} user={user} team={team} onEdit={onEdit} onView={onView} onDel={onDel} onDup={onDup} onChgSt={onChgSt} isMob={isMob} secs={getTS(t.id)} running={timers[t.id] && timers[t.id].running} togTimer={function() { togTimer(t.id); }} bulkMode={bulkMode} isSelected={selectedTasks && selectedTasks.includes(t.id)} toggleSel={toggleSel} />; })}
    </div>}

    {["In Progress", "Review", "To Do", "Done"].map(function(status) {
      var sectionTasks = statusGroups[status];
      if (!sectionTasks || sectionTasks.length === 0) return null;
      return <div key={status} style={{ marginBottom: 20 }}>
        <div style={Object.assign({}, S.groupHdr, { borderLeft: "3px solid " + SC[status], paddingLeft: 10 })}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: SC[status] }} />{status}</span><span style={S.countBadge}>{sectionTasks.length}</span></div>
        {sectionTasks.map(function(t) { return <TRow key={t.id} t={t} user={user} team={team} onEdit={onEdit} onView={onView} onDel={onDel} onDup={onDup} onChgSt={onChgSt} isMob={isMob} secs={getTS(t.id)} running={timers[t.id] && timers[t.id].running} togTimer={function() { togTimer(t.id); }} bulkMode={bulkMode} isSelected={selectedTasks && selectedTasks.includes(t.id)} toggleSel={toggleSel} />; })}
      </div>;
    })}

    {filtered.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Niciun task.</Card>}
  </div>;
}

function KanbanPage({ fProps, tasks, user, team, onEdit, onDel, onDup, onChgSt, dragId, setDragId, handleDrop, isMob, timers, getTS, togTimer }) {
  return <div><FiltersBar {...fProps} noStatus /><div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(4,1fr)", gap: 14, alignItems: "start" }}>{STATUSES.map(function(st) { var col = tasks.filter(function(t) { return t.status === st; }); return <div key={st} onDragOver={function(e) { e.preventDefault(); }} onDrop={function(e) { e.preventDefault(); handleDrop(st); }} style={{ background: "#FAFBFC", borderRadius: 12, padding: 12, minHeight: 200 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: SC[st] }} /><span style={{ fontSize: 13, fontWeight: 700 }}>{st}</span></div><span style={S.countBadge}>{col.length}</span></div>{col.map(function(t) { var a = team[t.assignee] || {}; var ov = isOv(t); var me = team[user] || {}; var can = me.role === "admin" || me.role === "pm" || t.assignee === user; var secs = getTS(t.id); var run = timers[t.id] && timers[t.id].running; return <Card key={t.id} style={{ padding: 12, cursor: can ? "grab" : "default", opacity: dragId === t.id ? 0.4 : 1, borderLeft: "3px solid " + (ov ? "#EF4444" : SC[st]), marginBottom: 8, background: SBG[st] }}><div draggable={can} onDragStart={function() { setDragId(t.id); }} onDragEnd={function() { setDragId(null); }}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t.title}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}><Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}{t.department && <Badge bg="#FFF7ED" color="#EA580C">{t.department}</Badge>}{ov && <Badge bg="#FEF2F2" color="#DC2626">INTARZIAT</Badge>}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#94A3B8" }}>{a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={18} fs={9}>{a.name[0]}</Av>{a.name}</span>}{t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>{can && st !== "Done" ? <button onClick={function() { togTimer(t.id); }} style={Object.assign({}, S.timerBtn, { fontSize: 10, padding: "2px 8px", background: run ? "#FEF2F2" : "#F8FAFC", color: run ? "#DC2626" : GR, borderColor: run ? "#FECACA" : "#E2E8F0" })}><Ic d={run ? Icons.stop : Icons.play} size={10} color={run ? "#DC2626" : GR} />{secs > 0 && <span>{ft(secs)}</span>}</button> : <span style={{ fontSize: 10 }}>{secs > 0 ? ft(secs) : ""}</span>}<div style={{ display: "flex", gap: 2 }}><button style={S.iconBtn} onClick={function() { onDup(t); }}><Ic d={Icons.copy} size={12} color="#94A3B8" /></button><button style={S.iconBtn} onClick={function() { onEdit(t); }}><Ic d={Icons.edit} size={12} color="#94A3B8" /></button></div></div></div></Card>; })}</div>; })}</div></div>;
}

function CalendarPage({ tasks, user, team, calDate, setCalDate, onView, isMob, me }) {
  var y = calDate.getFullYear(), m = calDate.getMonth(); var dim = new Date(y, m + 1, 0).getDate(); var fd1 = new Date(y, m, 1).getDay(); var today = new Date();
  var myTasks = me.role === "member" ? tasks.filter(function(t) { return t.assignee === user; }) : tasks;
  var days = []; for (var i = 0; i < (fd1 === 0 ? 6 : fd1 - 1); i++) days.push(null); for (var i2 = 1; i2 <= dim; i2++) days.push(i2);
  var mNames = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  return <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><button style={S.cancelBtn} onClick={function() { setCalDate(new Date(y, m - 1, 1)); }}>Prev</button><span style={{ fontSize: 16, fontWeight: 700 }}>{mNames[m]} {y}</span><button style={S.cancelBtn} onClick={function() { setCalDate(new Date(y, m + 1, 1)); }}>Next</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>{["Lun", "Mar", "Mie", "Joi", "Vin", "Sam", "Dum"].map(function(d) { return <div key={d} style={{ textAlign: "center", fontWeight: 700, fontSize: 11, padding: 6, color: "#94A3B8" }}>{d}</div>; })}{days.map(function(day, i) { if (!day) return <div key={"e" + i} />; var dateStr = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0"); var dayTasks = myTasks.filter(function(t) { return t.deadline === dateStr; }); var isToday2 = today.getFullYear() === y && today.getMonth() === m && today.getDate() === day; return <div key={day} style={{ padding: 4, minHeight: isMob ? 50 : 80, border: "1px solid hsl(214,18%,90%)", borderRadius: 4, background: isToday2 ? GR + "12" : "#fff", fontSize: 11 }}><div style={{ fontWeight: isToday2 ? 700 : 400, marginBottom: 2, fontSize: 12, color: isToday2 ? GR : "#475569" }}>{day}</div>{dayTasks.slice(0, 3).map(function(t) { return <div key={t.id} style={{ fontSize: 10, padding: "1px 4px", borderRadius: 3, marginBottom: 1, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: t.status === "Done" ? GR + "18" : isOv(t) ? "#FEF2F2" : "#EFF6FF", color: t.status === "Done" ? GR : isOv(t) ? "#DC2626" : "#2563EB" }} onClick={function() { onView(t); }}>{t.title}</div>; })}{dayTasks.length > 3 && <div style={{ fontSize: 9, color: "#94A3B8" }}>+{dayTasks.length - 3}</div>}</div>; })}</div></div>;
}

// Feature 5: Enhanced Targets with dropdown connection and auto-count
function TargetsPage({ targets, setTargets, team, tasks, timers, canEdit, visUsers, taskTypes, departments }) {
  var [showForm, setShowForm] = useState(false);
  var [form, setForm] = useState({ userId: "", metric: "all", target: 25, daysPerWeek: 5 });
  var metricOptions = [{ id: "all", l: "Toate taskurile" }].concat(
    (taskTypes || DEF_TASK_TYPES).map(function(t) { return { id: "type:" + t, l: "Tip: " + t }; }),
    (departments || DEF_DEPARTMENTS).map(function(d) { return { id: "dept:" + d, l: "Dept: " + d }; }),
    PLATFORMS.map(function(p) { return { id: "plat:" + p, l: "Platforma: " + p }; })
  );

  var save = function() { if (!form.userId || !form.metric) return; setTargets(function(p) { return p.concat([Object.assign({}, form, { id: gid() })]); }); setShowForm(false); setForm({ userId: "", metric: "all", target: 25, daysPerWeek: 5 }); };

  return <div style={{ maxWidth: 700 }}>{canEdit && <div style={{ marginBottom: 16 }}><button style={S.primBtn} onClick={function() { setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> Target nou</button></div>}{showForm && <Card style={{ marginBottom: 16 }}><div style={S.fRow}><div style={S.fCol}><label style={S.label}>User</label><select style={S.fSelF} value={form.userId} onChange={function(e) { setForm(Object.assign({}, form, { userId: e.target.value })); }}><option value="">--</option>{visUsers.filter(function(u) { return u !== "admin"; }).map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Metric (dropdown)</label><select style={S.fSelF} value={form.metric} onChange={function(e) { setForm(Object.assign({}, form, { metric: e.target.value })); }}>{metricOptions.map(function(o) { return <option key={o.id} value={o.id}>{o.l}</option>; })}</select></div></div><div style={S.fRow}><div style={S.fCol}><label style={S.label}>Target zilnic</label><input style={S.input} type="number" value={form.target} onChange={function(e) { setForm(Object.assign({}, form, { target: parseInt(e.target.value) || 0 })); }} /></div><div style={S.fCol}><label style={S.label}>Zile/sapt</label><input style={S.input} type="number" min="1" max="7" value={form.daysPerWeek} onChange={function(e) { setForm(Object.assign({}, form, { daysPerWeek: parseInt(e.target.value) || 5 })); }} /></div></div><div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={save}>Salveaza</button><button style={S.cancelBtn} onClick={function() { setShowForm(false); }}>Anuleaza</button></div></Card>}{targets.map(function(tgt) {
    var u = team[tgt.userId]; if (!u) return null;
    // Feature 5: auto-count based on metric dropdown
    var todayDone = tasks.filter(function(t) {
      if (t.assignee !== tgt.userId) return false;
      if (t.status !== "Done") return false;
      if (!t.updatedAt || ds(t.updatedAt) !== TD) return false;
      if (tgt.metric === "all") return true;
      if (tgt.metric.startsWith("type:") && t.taskType === tgt.metric.replace("type:", "")) return true;
      if (tgt.metric.startsWith("dept:") && t.department === tgt.metric.replace("dept:", "")) return true;
      if (tgt.metric.startsWith("plat:") && t.platform === tgt.metric.replace("plat:", "")) return true;
      return false;
    }).length;
    var pct = tgt.target > 0 ? (todayDone / tgt.target) * 100 : 0;
    var rem = Math.max(0, tgt.target - todayDone);
    var metricLabel = (metricOptions.find(function(o) { return o.id === tgt.metric; }) || {}).l || tgt.metric;
    return <Card key={tgt.id} style={{ marginBottom: 12, borderLeft: "3px solid " + (pct >= 100 ? GR : pct >= 50 ? "#D97706" : "#DC2626") }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><Av color={u.color} size={32}>{u.name[0]}</Av><div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{u.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{metricLabel} | {tgt.target}/zi | {tgt.daysPerWeek} zile/sapt</div></div>{canEdit && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) setTargets(function(p) { return p.filter(function(x) { return x.id !== tgt.id; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}</div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span>Done azi: {todayDone}/{tgt.target}</span><span style={{ fontWeight: 700, color: pct >= 100 ? GR : "#DC2626" }}>{Math.round(pct)}%</span></div><div style={S.progBg}><div style={S.progBar(pct >= 100 ? GR : pct >= 50 ? "#D97706" : "#DC2626", Math.min(pct, 100))} /></div>{rem > 0 && <div style={{ marginTop: 6, fontSize: 12, color: "#DC2626", fontWeight: 600 }}>Ramas: {rem}</div>}</Card>;
  })}{targets.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 30 }}>Niciun target.</Card>}</div>;
}

function TemplatesPage({ templates, setTemplates, canEdit, isAdmin, shops, onCreateFromTpl }) {
  var [showForm, setShowForm] = useState(false); var [form, setForm] = useState({ name: "", description: "", subtasks: [], shop: "" }); var [newSt, setNewSt] = useState("");
  var save = function() { if (!form.name.trim()) return; setTemplates(function(p) { return p.concat([Object.assign({}, form, { id: gid() })]); }); setShowForm(false); setForm({ name: "", description: "", subtasks: [], shop: "" }); };
  return <div>{canEdit && <div style={{ marginBottom: 16 }}><button style={S.primBtn} onClick={function() { setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> Template nou</button></div>}{showForm && <Card style={{ marginBottom: 16, maxWidth: 500 }}><label style={S.label}>Nume</label><input style={S.input} value={form.name} onChange={function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }} /><label style={S.label}>Descriere</label><input style={S.input} value={form.description} onChange={function(e) { setForm(Object.assign({}, form, { description: e.target.value })); }} /><label style={S.label}>Magazin (optional - auto-fill)</label><select style={S.fSelF} value={form.shop} onChange={function(e) { setForm(Object.assign({}, form, { shop: e.target.value })); }}><option value="">Toate</option>{(shops || []).map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select><label style={S.label}>Subtaskuri</label>{form.subtasks.map(function(s, i) { return <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}><span style={{ fontSize: 11, color: "#94A3B8", width: 20 }}>{i + 1}.</span><span style={{ flex: 1, fontSize: 13 }}>{s}</span><button style={S.iconBtn} onClick={function() { setForm(Object.assign({}, form, { subtasks: form.subtasks.filter(function(_, j) { return j !== i; }) })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}<div style={{ display: "flex", gap: 6, marginTop: 4 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={newSt} onChange={function(e) { setNewSt(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter" && newSt.trim()) { setForm(Object.assign({}, form, { subtasks: form.subtasks.concat([newSt.trim()]) })); setNewSt(""); } }} placeholder="Subtask..." /><button style={S.primBtn} onClick={function() { if (newSt.trim()) { setForm(Object.assign({}, form, { subtasks: form.subtasks.concat([newSt.trim()]) })); setNewSt(""); } }}><Ic d={Icons.plus} size={14} color="#fff" /></button></div><div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={save}>Salveaza</button><button style={S.cancelBtn} onClick={function() { setShowForm(false); }}>Anuleaza</button></div></Card>}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300,1fr))", gap: 14 }}>{templates.map(function(tpl) { return <Card key={tpl.id}><div style={{ fontWeight: 700, marginBottom: 4 }}>{tpl.name}</div><div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>{tpl.description}{tpl.shop ? " | " + tpl.shop : ""}</div><div style={{ fontSize: 12 }}>{tpl.subtasks.map(function(s, i) { return <div key={i} style={{ padding: "2px 0" }}>o {s}</div>; })}</div><div style={{ marginTop: 10, display: "flex", gap: 6 }}><button style={S.primBtn} onClick={function() { onCreateFromTpl(tpl); }}>Creeaza task</button>{isAdmin && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) setTemplates(function(p) { return p.filter(function(x) { return x.id !== tpl.id; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}</div></Card>; })}</div></div>;
}

function SheetsPage({ sheets, setSheets, shops }) {
  var [form, setForm] = useState({ name: "", url: "", store: "All", description: "" });
  var save = function() { if (!form.name.trim() || !form.url.trim()) return; setSheets(function(p) { return p.concat([Object.assign({}, form, { id: gid() })]); }); setForm({ name: "", url: "", store: "All", description: "" }); };
  return <div style={{ maxWidth: 700 }}><Card style={{ marginBottom: 16 }}><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Adauga Sheet</h3><div style={S.fRow}><div style={S.fCol}><label style={S.label}>Nume</label><input style={S.input} value={form.name} onChange={function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }} /></div><div style={S.fCol}><label style={S.label}>Magazin</label><select style={S.fSelF} value={form.store} onChange={function(e) { setForm(Object.assign({}, form, { store: e.target.value })); }}><option value="All">Toate</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div></div><label style={S.label}>URL</label><input style={S.input} value={form.url} onChange={function(e) { setForm(Object.assign({}, form, { url: e.target.value })); }} placeholder="https://docs.google.com/..." /><label style={S.label}>Descriere</label><input style={S.input} value={form.description} onChange={function(e) { setForm(Object.assign({}, form, { description: e.target.value })); }} /><button style={Object.assign({}, S.primBtn, { marginTop: 12 })} onClick={save}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga</button></Card>{sheets.map(function(s) { return <Card key={s.id} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{s.store} | {s.description}</div></div><a href={s.url} target="_blank" rel="noopener noreferrer" style={Object.assign({}, S.primBtn, { fontSize: 11, padding: "4px 12px" })}>Deschide</a><button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) setSheets(function(p) { return p.filter(function(x) { return x.id !== s.id; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button></Card>; })}{sheets.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 30 }}>Niciun sheet.</Card>}</div>;
}

function ViewTaskModal({ task, team, user, tasks, setTasks, timers, getTS, togTimer, products, onClose, onEdit, statusHistory }) {
  var [commentText, setCommentText] = useState(""); var t = tasks.find(function(x) { return x.id === task.id; }) || task; var a = team[t.assignee] || {}; var secs = getTS(t.id); var subtasks = t.subtasks || []; var comments = t.comments || []; var doneS = subtasks.filter(function(s) { return s.done; }).length;
  var addComment = function() { if (!commentText.trim()) return; setTasks(function(p) { return p.map(function(x) { return x.id === t.id ? Object.assign({}, x, { comments: (x.comments || []).concat([{ id: gid(), userId: user, text: commentText.trim(), time: ts() }]) }) : x; }); }); setCommentText(""); };
  var toggleSub = function(stId) { setTasks(function(p) { return p.map(function(x) { if (x.id !== t.id) return x; return Object.assign({}, x, { subtasks: (x.subtasks || []).map(function(s) { return s.id === stId ? Object.assign({}, s, { done: !s.done }) : s; }) }); }); }); };
  // Feature 2: time per status
  var hist = (statusHistory || {})[t.id] || [];
  var tis = {};
  for (var i2 = 0; i2 < hist.length; i2++) { var nx = hist[i2 + 1]; var dur = nx ? hDiff(hist[i2].at, nx.at) : (t.status !== "Done" ? hDiff(hist[i2].at, ts()) : 0); tis[hist[i2].status] = (tis[hist[i2].status] || 0) + Math.round(dur); }
  // Feature 5: deps
  var deps = (t.dependsOn || []).map(function(depId) { return tasks.find(function(x) { return x.id === depId; }); }).filter(Boolean);
  // Feature: product replacement
  var [showReplace, setShowReplace] = useState(false);
  var [replaceLink, setReplaceLink] = useState("");
  var [replaceNote, setReplaceNote] = useState("");
  var doReplace = function() {
    if (!replaceLink.trim()) return;
    setTasks(function(p) { return p.map(function(x) {
      if (x.id !== t.id) return x;
      var newLinks = (x.links || []).slice();
      return Object.assign({}, x, {
        _replacedLink: replaceLink.trim(),
        _replacedNote: replaceNote.trim(),
        _replacedBy: user,
        _originalLinks: x._originalLinks || newLinks.slice(),
        links: [replaceLink.trim()].concat(newLinks),
        updatedAt: ts()
      });
    }); });
    setShowReplace(false); setReplaceLink(""); setReplaceNote("");
  };

  return <div style={S.modalOv} onClick={onClose}><div style={Object.assign({}, S.modalBox, { maxWidth: 640 })} onClick={function(e) { e.stopPropagation(); }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}><div><h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{t.title}</h2><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Badge bg={SC[t.status] + "18"} color={SC[t.status]}>{t.status}</Badge><Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>{t.department && <Badge bg="#FFF7ED" color="#EA580C">{t.department}</Badge>}{isOv(t) && <Badge bg="#FEF2F2" color="#DC2626">OVERDUE</Badge>}</div></div><button style={S.iconBtn} onClick={onClose}><Ic d={Icons.x} size={18} color="#94A3B8" /></button></div>
    {t.description && <div style={{ fontSize: 13, color: "#64748B", marginBottom: 12 }}>{t.description}</div>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginBottom: 16 }}><div><strong>Asignat:</strong> {a.name || "-"}</div><div><strong>Deadline:</strong> {t.deadline ? fd(t.deadline) : "-"}</div><div><strong>Magazin:</strong> {t.shop || "-"}</div><div><strong>Timp:</strong> {ft(secs)}</div>{t.platform && <div><strong>Platforma:</strong> {t.platform}</div>}{t.taskType && <div><strong>Tip:</strong> {t.taskType}</div>}{t.productName && <div><strong>Produs:</strong> {t.productName}</div>}{t.department && <div><strong>Departament:</strong> {t.department}</div>}<div><strong>Creat:</strong> {ff(t.createdAt)}</div>{t._finalizedCount != null && <div><strong>Finalizate:</strong> {t._finalizedCount}/{(t.campaignItems || []).length}</div>}</div>
    {/* Replacement link - highlighted */}
    {t._replacedLink && <div style={{ marginBottom: 12, padding: 10, background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid " + GR }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: GR, marginBottom: 4 }}>Link actualizat{t._replacedBy && team[t._replacedBy] ? " de " + team[t._replacedBy].name : ""}:</div>
      <a href={t._replacedLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: GR, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Ic d={Icons.ext} size={12} color={GR} />{t._replacedLink}</a>
      {t._replacedNote && <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{t._replacedNote}</div>}
    </div>}
    {/* Original links */}
    {t.links && t.links.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t._replacedLink ? "Linkuri (inclusiv original):" : "Linkuri:"}</div>{t.links.map(function(l, i) { var isReplaced = t._originalLinks && t._originalLinks.includes(l) && t._replacedLink && l !== t._replacedLink; return <a key={i} href={l} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: isReplaced ? "#94A3B8" : "#2563EB", marginBottom: 2, textDecoration: isReplaced ? "line-through" : "none" }}><Ic d={Icons.ext} size={10} color={isReplaced ? "#94A3B8" : "#2563EB"} />{l}{isReplaced && <span style={{ fontSize: 9, color: "#DC2626", marginLeft: 4 }}>(inlocuit)</span>}</a>; })}</div>}
    {/* Replace product button */}
    {t.assignee === user && t.status !== "Done" && <div style={{ marginBottom: 12 }}>
      {!showReplace && <button style={Object.assign({}, S.primBtn, { background: "#D97706", fontSize: 12 })} onClick={function() { setShowReplace(true); }}>Am schimbat produsul / Link nou</button>}
      {showReplace && <Card style={{ background: "#FFFBEB", borderLeft: "3px solid #D97706" }}>
        <label style={S.label}>Link produs nou</label>
        <input style={S.input} value={replaceLink} onChange={function(e) { setReplaceLink(e.target.value); }} placeholder="https://..." />
        <label style={S.label}>Observatie (optional)</label>
        <input style={S.input} value={replaceNote} onChange={function(e) { setReplaceNote(e.target.value); }} placeholder="Ex: Nu am gasit, am schimbat cu..." />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button style={S.primBtn} onClick={doReplace}>Salveaza link nou</button><button style={S.cancelBtn} onClick={function() { setShowReplace(false); }}>Anuleaza</button></div>
      </Card>}
    </div>}
    {t.campaignItems && t.campaignItems.length > 0 && <div style={{ marginBottom: 12, padding: 10, background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid " + GR }}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Campaign ({t.campaignItems.length} produse){t._finalizedCount != null && <span style={{ marginLeft: 8, color: GR }}>- {t._finalizedCount} finalizate</span>}</div>{t.campaignItems.map(function(ci, i) { return <div key={ci.id || i} style={{ fontSize: 12, padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#94A3B8", width: 20 }}>{i + 1}.</span><span>{ci.name}</span></div>; })}</div>}
    {Object.keys(tis).length > 0 && <div style={{ marginBottom: 12, padding: 10, background: "#F8FAFC", borderRadius: 8 }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Timp per status:</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(tis).map(function(e) { return <Badge key={e[0]} bg={(SC[e[0]] || "#94A3B8") + "18"} color={SC[e[0]] || "#94A3B8"}>{e[0]}: {e[1]}h</Badge>; })}</div></div>}
    {deps.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Depinde de:</div>{deps.map(function(d) { return <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 0" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: SC[d.status] }} /><span>{d.title}</span><Badge bg={(SC[d.status] || "#94A3B8") + "18"} color={SC[d.status] || "#94A3B8"}>{d.status}</Badge></div>; })}</div>}
    {subtasks.length > 0 && <div style={{ marginBottom: 12, borderTop: "1px solid #F1F5F9", paddingTop: 12 }}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Subtaskuri ({doneS}/{subtasks.length})</div><div style={Object.assign({}, S.progBg, { marginBottom: 8 })}><div style={S.progBar(doneS === subtasks.length ? GR : "#D97706", subtasks.length > 0 ? (doneS / subtasks.length) * 100 : 0)} /></div>{subtasks.map(function(st) { return <div key={st.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 13, cursor: "pointer" }} onClick={function() { toggleSub(st.id); }}><span style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid " + (st.done ? GR : "#CBD5E1"), background: st.done ? GR : "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, flexShrink: 0 }}>{st.done ? "*" : ""}</span><span style={{ textDecoration: st.done ? "line-through" : "none", color: st.done ? "#94A3B8" : "#1E293B" }}>{st.text}</span></div>; })}</div>}
    <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 12 }}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Ic d={Icons.comment} size={14} color="#64748B" /> Comentarii ({comments.length})</div><div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>{comments.map(function(c) { var cu = team[c.userId] || {}; var isMine = c.userId === user; return <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 6 }}><div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 2 }}>{cu.name || "?"} | {fr(c.time)}</div><div style={{ padding: "6px 12px", borderRadius: 10, maxWidth: "80%", background: isMine ? GR : "#F1F5F9", color: isMine ? "#fff" : "#1E293B", fontSize: 13 }}>{c.text}</div></div>; })}</div><div style={{ display: "flex", gap: 6 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={commentText} onChange={function(e) { setCommentText(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addComment(); }} placeholder="Comentariu..." /><button style={S.primBtn} onClick={addComment}>Trimite</button></div></div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}><button style={S.cancelBtn} onClick={onEdit}>Editeaza</button><button style={S.primBtn} onClick={onClose}>Inchide</button></div>
  </div></div>;
}

function WorkPage({ users, team, tasks, getPerf, timers, getTS, isMob, onClickUser }) {
  var data = users.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) { var ut = tasks.filter(function(t) { return t.assignee === u; }); var byS = {}; STATUSES.forEach(function(s) { byS[s] = ut.filter(function(t) { return t.status === s; }).length; }); var od = ut.filter(function(t) { return isOv(t); }).length; var actT = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; }).length; var tT = 0; ut.forEach(function(t) { tT += getTS(t.id); }); return { key: u, name: team[u].name, color: team[u].color, role: team[u].role, total: ut.length, byS: byS, od: od, actT: actT, tT: tT, perf: getPerf(u) }; }).sort(function(a, b) { return b.total - a.total; });
  var mx = Math.max.apply(null, data.map(function(d) { return d.total; }).concat([1]));
  return <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(340,1fr))", gap: 14 }}>{data.map(function(d) { return <Card key={d.key} style={{ cursor: "pointer" }}><div onClick={function() { onClickUser(d.key); }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Av color={d.color} size={42}>{d.name[0]}</Av><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{d.role === "pm" ? "PM" : "Member"}</div></div>{d.actT > 0 && <Badge bg="#FEF2F2" color="#DC2626"><span style={{ animation: "pulse 2s infinite" }}>{d.actT} active</span></Badge>}<div style={{ fontSize: 20, fontWeight: 700, color: d.perf.score >= 70 ? GR : d.perf.score >= 40 ? "#D97706" : "#DC2626" }}>{d.perf.score}%</div></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B", marginBottom: 4 }}><span>{d.total} taskuri</span><span>Tracked: {ft(d.tT)}</span></div><div style={{ height: 8, borderRadius: 8, background: "#F1F5F9", overflow: "hidden", display: "flex", marginBottom: 10 }}>{STATUSES.map(function(s) { var w = (d.byS[s] / mx) * 100; return w > 0 ? <div key={s} style={{ width: w + "%", height: "100%", background: SC[s] }} /> : null; })}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, textAlign: "center", fontSize: 10 }}>{STATUSES.map(function(s) { return <div key={s} style={{ background: SC[s] + "12", borderRadius: 6, padding: "4px 2px" }}><div style={{ fontSize: 14, fontWeight: 700, color: SC[s] }}>{d.byS[s]}</div><div style={{ color: "#94A3B8" }}>{s === "In Progress" ? "Active" : s}</div></div>; })}<div style={{ background: d.od ? "#FEF2F2" : "#F8FAFC", borderRadius: 6, padding: "4px 2px" }}><div style={{ fontSize: 14, fontWeight: 700, color: d.od ? "#DC2626" : "#94A3B8" }}>{d.od}</div><div style={{ color: "#94A3B8" }}>Overdue</div></div></div></div></Card>; })}</div>;
}

function TeamPage({ users, team, sessions, getPerf, isMob, onClickUser }) {
  return <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(300,1fr))", gap: 14 }}>{users.map(function(u) { var m = team[u]; if (!m) return null; var p = getPerf(u); var lss = sessions[u]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000; return <Card key={u} style={{ cursor: "pointer" }}><div onClick={function() { onClickUser(u); }}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><div style={{ position: "relative" }}><Av color={m.color} size={42}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{m.role === "pm" ? "PM" : m.role === "admin" ? "Admin" : "Member"}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 11, fontWeight: 600, color: on ? "#16A34A" : "#94A3B8" }}>{on ? "Online" : "Offline"}</div><div style={{ fontSize: 10, color: "#CBD5E1" }}>Last: {fr(lss)}</div></div></div>{m.role !== "admin" && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span style={{ color: "#64748B" }}>Performance</span><span style={{ fontWeight: 700, color: p.score >= 70 ? GR : p.score >= 40 ? "#D97706" : "#DC2626" }}>{p.score}%</span></div><div style={S.progBg}><div style={S.progBar(p.score >= 70 ? GR : p.score >= 40 ? "#D97706" : "#DC2626", p.score)} /></div></div>}</div></Card>; })}</div>;
}

function PerfPage({ users, team, getPerf, isMob }) {
  var data = users.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) { return Object.assign({ key: u }, team[u], getPerf(u)); }).sort(function(a, b) { return b.score - a.score; });
  return <Card><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Clasament Echipa</h3>{data.map(function(d, i) { return <div key={d.key} style={{ display: "flex", alignItems: isMob ? "flex-start" : "center", gap: 12, padding: "12px 0", borderBottom: i < data.length - 1 ? "1px solid #F1F5F9" : "none", flexDirection: isMob ? "column" : "row" }}><span style={{ fontSize: 16, width: 28, textAlign: "center", fontWeight: 700, color: i < 3 ? GR : "#94A3B8" }}>#{i + 1}</span><div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}><Av color={d.color} size={30}>{d.name[0]}</Av><span style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</span></div><div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, width: "100%" }}><div style={Object.assign({}, S.progBg, { flex: 1 })}><div style={S.progBar(d.score >= 70 ? GR : d.score >= 40 ? "#D97706" : "#DC2626", d.score)} /></div><span style={{ fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "right", color: d.score >= 70 ? GR : d.score >= 40 ? "#D97706" : "#DC2626" }}>{d.score}%</span></div><div style={{ display: "flex", gap: 10, fontSize: 11, color: "#94A3B8" }}><span>{d.done}/{d.total}</span>{d.overdue > 0 && <span style={{ color: "#DC2626" }}>{d.overdue} ovd</span>}{d.avgTime > 0 && <span>avg {ft(d.avgTime)}</span>}</div></div>; })}</Card>;
}

function LogPage({ logs, visUsers, isMob }) {
  var vis = logs.filter(function(l) { return visUsers.includes(l.user); }); var aC = { LOGIN: { bg: "#ECFDF5", c: "#16A34A" }, LOGOUT: { bg: "#FEF2F2", c: "#DC2626" }, NEW: { bg: "#EFF6FF", c: "#2563EB" }, EDIT: { bg: "#FFFBEB", c: "#D97706" }, DELETE: { bg: "#FEF2F2", c: "#DC2626" }, STATUS: { bg: "#F5F3FF", c: "#7C3AED" }, TIMER: { bg: "#FFF7ED", c: "#EA580C" }, DUPLICATE: { bg: "#EFF6FF", c: "#2563EB" }, USER_ADD: { bg: "#ECFDF5", c: GR }, USER_DEL: { bg: "#FEF2F2", c: "#DC2626" } };
  return <Card>{vis.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Nicio activitate.</div> : vis.slice(0, 150).map(function(l) { var cfg = aC[l.action] || { bg: "#F8FAFC", c: "#64748B" }; return <div key={l.id} style={{ display: "flex", alignItems: isMob ? "flex-start" : "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC", flexDirection: isMob ? "column" : "row" }}><span style={{ fontSize: 11, color: "#CBD5E1", minWidth: 120 }}>{ff(l.time)}</span><Badge bg={cfg.bg} color={cfg.c}>{l.action}</Badge><span style={{ fontSize: 12, color: "#64748B" }}>{l.detail}</span></div>; })}</Card>;
}

// Feature 12: Departments page
function DeptPage({ departments, setDepartments, tasks, team, visUsers, isMob, canEdit }) {
  var [newDept, setNewDept] = useState("");
  var [selDept, setSelDept] = useState(null);
  var [platFilter, setPlatFilter] = useState("all");

  var addDept = function() { var d = newDept.trim().toUpperCase(); if (d && !departments.includes(d)) { setDepartments(function(p) { return p.concat([d]); }); setNewDept(""); } };

  var deptTasks = useMemo(function() {
    if (!selDept) return [];
    return tasks.filter(function(t) {
      if (t.department !== selDept) return false;
      if (platFilter !== "all" && t.platform !== platFilter) return false;
      return true;
    });
  }, [tasks, selDept, platFilter]);

  // Who works on this dept
  var deptUsers = useMemo(function() {
    if (!selDept) return [];
    var userMap = {};
    deptTasks.forEach(function(t) {
      if (t.assignee && team[t.assignee]) {
        if (!userMap[t.assignee]) userMap[t.assignee] = { total: 0, done: 0, active: 0 };
        userMap[t.assignee].total++;
        if (t.status === "Done") userMap[t.assignee].done++;
        if (t.status === "In Progress") userMap[t.assignee].active++;
      }
    });
    return Object.keys(userMap).map(function(u) { return Object.assign({ key: u, name: team[u].name, color: team[u].color }, userMap[u]); });
  }, [deptTasks, team]);

  return <div>
    {canEdit && <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input style={Object.assign({}, S.input, { flex: 1, maxWidth: 300 })} value={newDept} onChange={function(e) { setNewDept(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addDept(); }} placeholder="Departament nou..." />
      <button style={S.primBtn} onClick={addDept}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga</button>
    </div>}

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
      {departments.map(function(d) {
        var count = tasks.filter(function(t) { return t.department === d; }).length;
        return <div key={d} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={function() { setSelDept(selDept === d ? null : d); }} style={Object.assign({}, S.chip, { background: selDept === d ? GR : "#F1F5F9", color: selDept === d ? "#fff" : "#475569", fontWeight: selDept === d ? 700 : 400, padding: "8px 16px" })}>{d} ({count})</button>
          {canEdit && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi " + d + "?")) setDepartments(function(p) { return p.filter(function(x) { return x !== d; }); }); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button>}
        </div>;
      })}
    </div>

    {selDept && <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{selDept}</h3>
        <select style={S.fSel} value={platFilter} onChange={function(e) { setPlatFilter(e.target.value); }}>
          <option value="all">Platforma: Toate</option>
          {PLATFORMS.map(function(p) { return <option key={p} value={p}>{p}</option>; })}
        </select>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>{deptTasks.length} taskuri</span>
      </div>

      {deptUsers.length > 0 && <Card style={{ marginBottom: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Echipa pe {selDept}</h4>
        <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(200,1fr))", gap: 8 }}>
          {deptUsers.map(function(u) {
            return <div key={u.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, background: "#F8FAFC", borderRadius: 8 }}>
              <Av color={u.color} size={28}>{u.name[0]}</Av>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 10, color: "#94A3B8" }}>{u.total} taskuri | {u.done} done | {u.active} active</div></div>
            </div>;
          })}
        </div>
      </Card>}

      {deptTasks.map(function(t) {
        var a = team[t.assignee] || {};
        return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: SBG[t.status] || "#F8FAFC", borderLeft: "3px solid " + (SC[t.status] || "#E2E8F0") }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: SC[t.status] }} />
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{t.title}</span>
          {a.name && <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color} size={16} fs={8}>{a.name[0]}</Av>{a.name}</span>}
          <Badge bg={SC[t.status] + "18"} color={SC[t.status]}>{t.status}</Badge>
          {t.platform && <Badge bg="#F1F5F9" color="#475569">{t.platform}</Badge>}
          {t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}
          {t.deadline && <span style={{ fontSize: 10, color: isOv(t) ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}
        </div>;
      })}
      {deptTasks.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 20 }}>Niciun task in {selDept}.</Card>}
    </div>}
  </div>;
}

// Feature 13: Shops borderou page
function ShopsBordPage({ shops, setShops, tasks, team, isMob, canEdit, slas }) {
  var [newShop, setNewShop] = useState("");
  var [selShop, setSelShop] = useState(null);

  var addShop = function() { var s = newShop.trim(); if (s && !shops.includes(s)) { setShops(function(p) { return p.concat([s]); }); setNewShop(""); } };

  var shopTasks = useMemo(function() {
    if (!selShop) return [];
    return tasks.filter(function(t) { return t.shop === selShop; }).sort(function(a, b) {
      // Sort: urgent/active first, done last
      var sOrder = { "In Progress": 0, Review: 1, "To Do": 2, Done: 3 };
      return (sOrder[a.status] || 2) - (sOrder[b.status] || 2);
    });
  }, [tasks, selShop]);

  // Stats per shop
  var shopStats = useMemo(function() {
    if (!selShop) return {};
    var s = { total: shopTasks.length, done: 0, active: 0, urgent: 0, overdue: 0 };
    shopTasks.forEach(function(t) {
      if (t.status === "Done") s.done++;
      if (t.status === "In Progress") s.active++;
      if (t.priority === "Urgent" && t.status !== "Done") s.urgent++;
      if (isOv(t)) s.overdue++;
    });
    return s;
  }, [shopTasks]);

  // Group by date for borderou
  var byDate = useMemo(function() {
    var groups = {};
    shopTasks.forEach(function(t) {
      var d = t.updatedAt ? ds(t.updatedAt) : (t.createdAt ? ds(t.createdAt) : "unknown");
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });
    return Object.keys(groups).sort(function(a, b) { return b < a ? -1 : 1; }).map(function(d) { return { date: d, tasks: groups[d] }; });
  }, [shopTasks]);

  return <div>
    {canEdit && <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input style={Object.assign({}, S.input, { flex: 1, maxWidth: 300 })} value={newShop} onChange={function(e) { setNewShop(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addShop(); }} placeholder="Magazin nou..." />
      <button style={S.primBtn} onClick={addShop}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga</button>
    </div>}

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
      {shops.map(function(s) {
        var count = tasks.filter(function(t) { return t.shop === s; }).length;
        var urgent = tasks.filter(function(t) { return t.shop === s && t.priority === "Urgent" && t.status !== "Done"; }).length;
        var overdue = tasks.filter(function(t) { return t.shop === s && isOv(t); }).length;
        return <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={function() { setSelShop(selShop === s ? null : s); }} style={Object.assign({}, S.chip, { background: selShop === s ? GR : "#F1F5F9", color: selShop === s ? "#fff" : "#475569", fontWeight: selShop === s ? 700 : 400, padding: "8px 14px", position: "relative" })}>
            {s} ({count})
            {(urgent > 0 || overdue > 0) && <span style={{ marginLeft: 4, fontSize: 9, color: selShop === s ? "#fff" : "#DC2626" }}>{urgent > 0 ? urgent + " urg" : ""}{overdue > 0 ? " " + overdue + " ovd" : ""}</span>}
          </button>
          {canEdit && <button style={S.iconBtn} onClick={function() { setShops(function(p) { return p.filter(function(x) { return x !== s; }); }); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button>}
        </div>;
      })}
    </div>

    {selShop && <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Borderou: {selShop}{slas && slas[selShop] ? " (SLA: " + slas[selShop] + "h)" : ""}</h3>
        <button style={S.primBtn} onClick={function() {
          var text = "BORDEROU: " + selShop + "\nGenerat: " + ff(ts()) + "\nTotal: " + shopStats.total + " | Active: " + shopStats.active + " | Urgent: " + shopStats.urgent + " | Done: " + shopStats.done + "\n\n";
          byDate.forEach(function(g) { text += "--- " + g.date + " ---\n"; g.tasks.forEach(function(t) { var a = team[t.assignee] || {}; text += "[" + t.status + "] " + t.title + " | " + (a.name || "?") + (t.platform ? " | " + t.platform : "") + "\n"; }); text += "\n"; });
          var blob = new Blob([text], { type: "text/plain" }); var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href = url; a.download = "borderou_" + selShop + "_" + TD + ".txt"; a.click();
        }}><Ic d={Icons.download} size={14} color="#fff" /> Export</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
        {[{ l: "Total", v: shopStats.total, c: "#475569" }, { l: "Active", v: shopStats.active, c: "#2563EB" }, { l: "Urgent", v: shopStats.urgent, c: "#DC2626" }, { l: "Overdue", v: shopStats.overdue, c: "#EA580C" }, { l: "Done", v: shopStats.done, c: GR }].map(function(s) {
          return <Card key={s.l} style={{ borderTop: "2px solid " + s.c, padding: 12 }}><div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 10, color: "#94A3B8" }}>{s.l}</div></Card>;
        })}
      </div>

      {/* Borderou by date */}
      {byDate.map(function(group) {
        var dateLabel = group.date === TD ? "Azi" : group.date === YESTERDAY ? "Ieri" : fd(group.date + "T00:00:00");
        return <div key={group.date} style={{ marginBottom: 16 }}>
          <div style={S.groupHdr}><span>{dateLabel} ({group.date})</span><span style={S.countBadge}>{group.tasks.length}</span></div>
          {group.tasks.map(function(t) {
            var a = team[t.assignee] || {};
            return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 3, borderRadius: 8, background: SBG[t.status] || "#F8FAFC", borderLeft: "3px solid " + (SC[t.status] || "#E2E8F0"), flexWrap: "wrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: SC[t.status] }} />
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 120 }}>{t.title}</span>
              {a.name && <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color} size={16} fs={8}>{a.name[0]}</Av>{a.name}</span>}
              <Badge bg={SC[t.status] + "18"} color={SC[t.status]}>{t.status}</Badge>
              {t.priority === "Urgent" && <Badge bg="#FEF2F2" color="#DC2626">URGENT</Badge>}
              {t.platform && <Badge bg="#F1F5F9" color="#475569">{t.platform}</Badge>}
              {t.taskType && <Badge bg="#F5F3FF" color="#7C3AED">{t.taskType}</Badge>}
              {t.deadline && <span style={{ fontSize: 10, color: isOv(t) ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}
            </div>;
          })}
        </div>;
      })}
      {shopTasks.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 20 }}>Niciun task pentru {selShop}.</Card>}
    </div>}
  </div>;
}

function ProdsPage({ products, setProducts, shops }) {
  var [name, setName] = useState(""); var [url, setUrl] = useState(""); var [store, setStore] = useState(""); var [sku, setSku] = useState("");
  var add = function() { var n = name.trim(); if (n) { setProducts(function(p) { return p.concat([{ id: gid(), name: n, url: url.trim(), store: store, sku: sku.trim() }]); }); setName(""); setUrl(""); setSku(""); } };
  return <div style={{ maxWidth: 700 }}><Card><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Produse</h3><p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>Produse cu link si SKU.</p><div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}><input style={Object.assign({}, S.input, { flex: 1, minWidth: 150 })} value={name} onChange={function(e) { setName(e.target.value); }} placeholder="Nume produs" /><select style={Object.assign({}, S.fSel, { minWidth: 120 })} value={store} onChange={function(e) { setStore(e.target.value); }}><option value="">Magazin</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select><input style={Object.assign({}, S.input, { width: 100 })} value={sku} onChange={function(e) { setSku(e.target.value); }} placeholder="SKU" /></div><div style={{ display: "flex", gap: 8, marginBottom: 16 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={url} onChange={function(e) { setUrl(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") add(); }} placeholder="Link" /><button style={S.primBtn} onClick={add}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga</button></div><div style={{ marginBottom: 16 }}><label style={S.label}>Import CSV (Nume,Magazin,SKU)</label><textarea id="csvImp" style={S.ta} placeholder="Laveta,Bonhaus,BH-01" /><button style={Object.assign({}, S.primBtn, { marginTop: 6, fontSize: 11 })} onClick={function() { var el = document.getElementById("csvImp"); var lines = el.value.trim().split("\n").filter(function(l) { return l.trim(); }); var np = lines.map(function(l) { var p = l.split(",").map(function(s) { return s.trim(); }); return { id: gid(), name: p[0] || "?", store: p[1] || "", sku: p[2] || "", url: "" }; }); setProducts(function(p) { return p.concat(np); }); el.value = ""; }}>Import</button></div>{products.map(function(p) { return <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F8FAFC", borderRadius: 8, marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.name}</span>{p.store && <Badge bg="#ECFDF5" color={GR}>{p.store}</Badge>}{p.sku && <span style={{ fontSize: 10, color: "#94A3B8" }}>{p.sku}</span>}{p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#2563EB" }}>Link</a>}<button style={S.iconBtn} onClick={function() { setProducts(function(pr) { return pr.filter(function(x) { return x.id !== p.id; }); }); }}><Ic d={Icons.x} size={14} color="#EF4444" /></button></div>; })}</Card></div>;
}

function UsersPage({ team, setTeam, addLog }) {
  var [name, setName] = useState(""); var [key, setKey] = useState(""); var [pw, setPw] = useState(""); var [role, setRole] = useState("member"); var [pm, setPm] = useState(""); var [color, setColor] = useState(COLORS[0]); var [editKey, setEditKey] = useState(null);
  var pms = Object.keys(team).filter(function(k) { return team[k].role === "pm"; });
  var go = function() { var k2 = key.trim().toLowerCase().replace(/\s+/g, "_"); if (!k2 || !name.trim() || team[k2]) return; var data = { name: name.trim(), role: role, password: pw || k2 + "2024", color: color }; if (role === "member" && pm) { data.pm = pm; setTeam(function(prev) { var n = Object.assign({}, prev); if (n[pm] && n[pm].team) n[pm] = Object.assign({}, n[pm], { team: n[pm].team.concat([k2]) }); n[k2] = data; return n; }); } else { setTeam(function(prev) { var n = Object.assign({}, prev); n[k2] = data; return n; }); } addLog("USER_ADD", "Adaugat: " + name.trim()); setName(""); setKey(""); setPw(""); };
  var del = function(k2) { if (k2 === "admin") return; setTeam(function(prev) { var n = Object.assign({}, prev); delete n[k2]; Object.keys(n).forEach(function(k3) { if (n[k3].team) n[k3] = Object.assign({}, n[k3], { team: n[k3].team.filter(function(t) { return t !== k2; }) }); if (n[k3].pm === k2) n[k3] = Object.assign({}, n[k3], { pm: "" }); }); return n; }); addLog("USER_DEL", "Sters: " + k2); };
  return <div style={{ maxWidth: 700 }}><Card><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Manage Users</h3><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}><div><label style={S.label}>Nume</label><input style={S.input} value={name} onChange={function(e) { setName(e.target.value); if (!key) setKey(e.target.value.toLowerCase().replace(/\s+/g, "_")); }} placeholder="ex: Alex" /></div><div><label style={S.label}>Username</label><input style={S.input} value={key} onChange={function(e) { setKey(e.target.value); }} placeholder="ex: alex" /></div><div><label style={S.label}>Parola</label><input style={S.input} value={pw} onChange={function(e) { setPw(e.target.value); }} placeholder="default: key+2024" /></div><div><label style={S.label}>Rol</label><select style={S.fSelF} value={role} onChange={function(e) { setRole(e.target.value); }}>{ROLES.map(function(r) { return <option key={r} value={r}>{r}</option>; })}</select></div>{role === "member" && <div><label style={S.label}>PM</label><select style={S.fSelF} value={pm} onChange={function(e) { setPm(e.target.value); }}><option value="">--</option>{pms.map(function(p) { return <option key={p} value={p}>{team[p].name}</option>; })}</select></div>}<div><label style={S.label}>Culoare</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{COLORS.map(function(c) { return <div key={c} onClick={function() { setColor(c); }} style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: color === c ? "2px solid #1E293B" : "2px solid transparent" }} />; })}</div></div></div><button style={S.primBtn} onClick={go}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga User</button><div style={{ marginTop: 20 }}>{Object.entries(team).map(function(entry) { var k2 = entry[0]; var u = entry[1]; return <div key={k2} style={{ padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Av color={u.color} size={28}>{u.name[0]}</Av><span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{u.name}</span><span style={{ fontSize: 11, color: "#94A3B8" }}>{u.role}</span><span style={{ fontSize: 10, color: "#CBD5E1", fontFamily: "monospace" }}>{u.password}</span><button style={S.iconBtn} onClick={function() { setEditKey(editKey === k2 ? null : k2); }}><Ic d={Icons.edit} size={14} color="#94A3B8" /></button>{k2 !== "admin" && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi " + u.name + "?")) del(k2); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}</div>{editKey === k2 && <EditUserInline user={u} onSave={function(updates) { setTeam(function(prev) { var n = Object.assign({}, prev); n[k2] = Object.assign({}, n[k2], updates); return n; }); setEditKey(null); addLog("EDIT", "Editat: " + k2); }} onCancel={function() { setEditKey(null); }} />}</div>; })}</div></Card></div>;
}

function EditUserInline({ user, onSave, onCancel }) {
  var ALL_PAGES = ["dashboard","tasks","kanban","calendar","heatmap","targets","templates","recurring","workload","team","performance","digest","sla","log","departments","shops","products","sheets"];
  var DASH_WIDGETS = ["kpis","live_timers","team_cards","sla_breaches","login_kpis"];
  var DASH_LABELS = { kpis: "KPI-uri", live_timers: "Live Timers", team_cards: "Carduri Echipa", sla_breaches: "SLA Breaches", login_kpis: "Login Info" };
  var PAGE_LABELS = { dashboard: "Dashboard", tasks: "Taskuri", kanban: "Kanban", calendar: "Calendar", heatmap: "Heatmap", targets: "Targets", templates: "Templates", recurring: "Recurring", workload: "Workload", team: "Echipa", performance: "Performance", digest: "Digest", sla: "SLA", log: "Activity Log", departments: "Departamente", shops: "Magazine", products: "Produse", sheets: "Sheets" };
  var [name, setName] = useState(user.name); var [pw, setPw] = useState(user.password); var [role, setRole] = useState(user.role); var [color, setColor] = useState(user.color);
  var [access, setAccess] = useState(user.access || ALL_PAGES);
  var [dashWidgets, setDashWidgets] = useState(user.dashWidgets || DASH_WIDGETS);
  var toggleAccess = function(pg) { setAccess(function(prev) { return prev.includes(pg) ? prev.filter(function(x) { return x !== pg; }) : prev.concat([pg]); }); };
  var toggleWidget = function(w) { setDashWidgets(function(prev) { return prev.includes(w) ? prev.filter(function(x) { return x !== w; }) : prev.concat([w]); }); };
  return <div style={{ marginTop: 8, padding: 12, background: "#F8FAFC", borderRadius: 8 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={S.label}>Nume</label><input style={S.input} value={name} onChange={function(e) { setName(e.target.value); }} /></div><div><label style={S.label}>Parola</label><input style={S.input} value={pw} onChange={function(e) { setPw(e.target.value); }} /></div><div><label style={S.label}>Rol</label><select style={S.fSelF} value={role} onChange={function(e) { setRole(e.target.value); }}>{ROLES.map(function(r) { return <option key={r} value={r}>{r}</option>; })}</select></div><div><label style={S.label}>Culoare</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{COLORS.map(function(c) { return <div key={c} onClick={function() { setColor(c); }} style={{ width: 20, height: 20, borderRadius: 4, background: c, cursor: "pointer", border: color === c ? "2px solid #1E293B" : "2px solid transparent" }} />; })}</div></div></div>
  <label style={Object.assign({}, S.label, { marginTop: 14 })}>Acces Pagini</label>
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>{ALL_PAGES.map(function(pg) { var active = access.includes(pg); return <button key={pg} onClick={function() { toggleAccess(pg); }} style={Object.assign({}, S.chip, { background: active ? GR : "#F1F5F9", color: active ? "#fff" : "#94A3B8", fontSize: 10, padding: "4px 10px" })}>{PAGE_LABELS[pg] || pg}</button>; })}<button style={Object.assign({}, S.chip, { background: "#EFF6FF", color: "#2563EB", fontSize: 10, padding: "4px 10px" })} onClick={function() { setAccess(ALL_PAGES.slice()); }}>Toate</button><button style={Object.assign({}, S.chip, { background: "#FEF2F2", color: "#DC2626", fontSize: 10, padding: "4px 10px" })} onClick={function() { setAccess(["dashboard", "tasks"]); }}>Minimal</button></div>
  <label style={S.label}>Widgets Dashboard</label>
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>{DASH_WIDGETS.map(function(w) { var active = dashWidgets.includes(w); return <button key={w} onClick={function() { toggleWidget(w); }} style={Object.assign({}, S.chip, { background: active ? GR : "#F1F5F9", color: active ? "#fff" : "#94A3B8", fontSize: 10, padding: "4px 10px" })}>{DASH_LABELS[w] || w}</button>; })}</div>
  <div style={{ display: "flex", gap: 8, marginTop: 10 }}><button style={S.primBtn} onClick={function() { onSave({ name: name, password: pw, role: role, color: color, access: access, dashWidgets: dashWidgets }); }}>Salveaza</button><button style={S.cancelBtn} onClick={onCancel}>Anuleaza</button></div></div>;
}

// Feature 6 + 12: Task modal with custom types and departments
function TaskModal({ task, team, assUsers, shops, products, onSave, onClose, taskTypes, departments, allTasks }) {
  var [f, setF] = useState(task || { title: "", description: "", assignee: assUsers[0] || "", status: "To Do", priority: "Normal", platform: "", taskType: "", department: "", shop: "", product: "", productName: "", deadline: TD, links: [], subtasks: [], comments: [], dependsOn: [], campaignItems: [], assignees: [], _pipelineNext: "" });
  var [newLink, setNewLink] = useState(""); var [newSub, setNewSub] = useState("");
  // Feature 6: custom task type input
  var [customType, setCustomType] = useState("");
  var [multiAssign, setMultiAssign] = useState(f.assignees && f.assignees.length > 0 ? f.assignees : []);
  var [showCustomType, setShowCustomType] = useState(false);

  var set = function(k, v) { setF(function(p) { var n = Object.assign({}, p); n[k] = v; return n; }); };
  var addLink = function() { var l = newLink.trim(); if (l) { set("links", (f.links || []).concat([l])); setNewLink(""); } };
  var selProd = function(pid) { var p = products.find(function(x) { return x.id === pid; }); if (p) { set("product", p.id); set("productName", p.name); if (p.url) set("links", (f.links || []).concat([p.url])); } };

  var allTypes = taskTypes || DEF_TASK_TYPES;

  return <div style={S.modalOv} onClick={onClose}><div style={S.modalBox} onClick={function(e) { e.stopPropagation(); }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 17, fontWeight: 700 }}>{task ? "Editeaza Task" : "Task Nou"}</h2><button style={S.iconBtn} onClick={onClose}><Ic d={Icons.x} size={18} color="#94A3B8" /></button></div>
    <label style={S.label}>Titlu *</label><input style={S.input} value={f.title} onChange={function(e) { set("title", e.target.value); }} placeholder="Ce trebuie facut?" autoFocus />
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Persoana</label><select style={S.fSelF} value={f.assignee} onChange={function(e) { set("assignee", e.target.value); }}>{assUsers.map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name || u}</option>; })}</select>
    <label style={Object.assign({}, S.label, { marginTop: 6 })}>Multi-assign (optional)</label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>{assUsers.map(function(u) { var active = multiAssign.includes(u); return <button key={u} type="button" onClick={function() { var na = active ? multiAssign.filter(function(x) { return x !== u; }) : multiAssign.concat([u]); setMultiAssign(na); set("assignees", na); }} style={Object.assign({}, S.chip, { background: active ? GR : "#F1F5F9", color: active ? "#fff" : "#475569", fontSize: 10, padding: "3px 8px" })}>{(team[u] || {}).name}</button>; })}</div>
    {multiAssign.length > 1 && <div style={{ fontSize: 10, color: GR }}>Se vor crea {multiAssign.length} taskuri separate.</div>}
    </div><div style={S.fCol}><label style={S.label}>Magazin</label><select style={S.fSelF} value={f.shop} onChange={function(e) { set("shop", e.target.value); }}><option value="">--</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
    <label style={Object.assign({}, S.label, { marginTop: 6 })}>Pipeline: urmatorul (foto produs)</label>
    <select style={S.fSelF} value={f._pipelineNext || ""} onChange={function(e) { set("_pipelineNext", e.target.value); }}><option value="">Fara pipeline</option>{assUsers.map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name}</option>; })}</select>
    {f._pipelineNext && <div style={{ fontSize: 10, color: "#2563EB", marginTop: 2 }}>La Done, se creaza automat task pentru {(team[f._pipelineNext] || {}).name}.</div>}
    </div></div>
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Platforma</label><select style={S.fSelF} value={f.platform} onChange={function(e) { set("platform", e.target.value); }}><option value="">--</option>{PLATFORMS.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Tip Task</label><select style={S.fSelF} value={f.taskType} onChange={function(e) { set("taskType", e.target.value); }}><option value="">--</option>{allTypes.map(function(t) { return <option key={t} value={t}>{t}</option>; })}</select>{/* Feature 6: add custom type inline */}<div style={{ display: "flex", gap: 4, marginTop: 4 }}><input style={Object.assign({}, S.input, { flex: 1, fontSize: 11, padding: "4px 8px" })} value={customType} onChange={function(e) { setCustomType(e.target.value); }} placeholder="Tip nou..." /><button style={Object.assign({}, S.primBtn, { fontSize: 10, padding: "4px 8px" })} onClick={function() { if (customType.trim()) { set("taskType", customType.trim()); setCustomType(""); } }}>+</button></div></div></div>
    {/* Feature 12: Department dropdown */}
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Departament</label><select style={S.fSelF} value={f.department || ""} onChange={function(e) { set("department", e.target.value); }}><option value="">--</option>{(departments || DEF_DEPARTMENTS).map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Prioritate</label><select style={S.fSelF} value={f.priority} onChange={function(e) { set("priority", e.target.value); }}>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div></div>
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Status</label><select style={S.fSelF} value={f.status} onChange={function(e) { set("status", e.target.value); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Deadline</label><input style={S.fSelF} type="date" value={f.deadline} onChange={function(e) { set("deadline", e.target.value); }} /></div></div>
    {products.length > 0 && <div><label style={S.label}>Produs (lista)</label><select style={S.fSelF} value={f.product || ""} onChange={function(e) { selProd(e.target.value); }}><option value="">--</option>{products.map(function(p) { return <option key={p.id} value={p.id}>{p.name}{p.store ? " (" + p.store + ")" : ""}</option>; })}</select></div>}
    <label style={S.label}>Produs (manual)</label><input style={S.input} value={f.productName || ""} onChange={function(e) { set("productName", e.target.value); }} placeholder="Nume produs" />
    {/* Feature 5: Dependencies */}
    <label style={S.label}>Depinde de (task blocker)</label>
    <select style={S.fSelF} value="" onChange={function(e) { if (e.target.value && !(f.dependsOn || []).includes(e.target.value)) set("dependsOn", (f.dependsOn || []).concat([e.target.value])); e.target.value = ""; }}><option value="">Selecteaza task...</option>{(allTasks || []).filter(function(x) { return x.id !== (f.id || "") && (assUsers.includes(x.assignee) || assUsers.includes(x.createdBy)); }).slice(0, 50).map(function(x) { return <option key={x.id} value={x.id}>{x.title} [{x.status}]</option>; })}</select>
    {(f.dependsOn || []).length > 0 && <div style={{ marginTop: 4, marginBottom: 8 }}>{(f.dependsOn || []).map(function(depId) { var dep = (allTasks || []).find(function(x) { return x.id === depId; }); return <div key={depId} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "2px 0" }}><Ic d={Icons.dep} size={12} color="#2563EB" /><span>{dep ? dep.title : depId}</span>{dep && <Badge bg={(SC[dep.status] || "#94A3B8") + "18"} color={SC[dep.status] || "#94A3B8"}>{dep.status}</Badge>}<button style={S.iconBtn} onClick={function() { set("dependsOn", (f.dependsOn || []).filter(function(x) { return x !== depId; })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}</div>}
    <label style={S.label}>Linkuri</label><div style={{ display: "flex", gap: 6, marginBottom: 8 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={newLink} onChange={function(e) { setNewLink(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addLink(); }} placeholder="https://..." /><button style={S.primBtn} onClick={addLink}><Ic d={Icons.plus} size={14} color="#fff" /></button></div>{(f.links || []).map(function(l, i) { return <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12 }}><Ic d={Icons.link} size={12} color="#2563EB" /><a href={l} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</a><button style={S.iconBtn} onClick={function() { set("links", (f.links || []).filter(function(_, idx) { return idx !== i; })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}
    <label style={S.label}>Subtaskuri</label>{(f.subtasks || []).map(function(st, i) { return <div key={st.id || i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}><input type="checkbox" checked={st.done} onChange={function() { var ns = (f.subtasks || []).map(function(s, j) { return j === i ? Object.assign({}, s, { done: !s.done }) : s; }); set("subtasks", ns); }} /><input style={Object.assign({}, S.input, { flex: 1 })} value={st.text} onChange={function(e) { var ns = (f.subtasks || []).map(function(s, j) { return j === i ? Object.assign({}, s, { text: e.target.value }) : s; }); set("subtasks", ns); }} /><button style={S.iconBtn} onClick={function() { set("subtasks", (f.subtasks || []).filter(function(_, j) { return j !== i; })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}<div style={{ display: "flex", gap: 6, marginTop: 4 }}><input style={Object.assign({}, S.input, { flex: 1 })} placeholder="Subtask nou..." value={newSub} onChange={function(e) { setNewSub(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter" && newSub.trim()) { set("subtasks", (f.subtasks || []).concat([{ id: gid(), text: newSub.trim(), done: false }])); setNewSub(""); } }} /><button style={S.primBtn} onClick={function() { if (newSub.trim()) { set("subtasks", (f.subtasks || []).concat([{ id: gid(), text: newSub.trim(), done: false }])); setNewSub(""); } }}><Ic d={Icons.plus} size={14} color="#fff" /></button></div>
    {/* Feature 5: Campaign Items (mega-task) */}
    <label style={S.label}>Produse Campaign (mega-task)</label>
    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>Adauga produse/items - la finalizare selectezi cate ai completat si se adauga la target.</div>
    {(f.campaignItems || []).map(function(ci, i) { return <div key={ci.id || i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3, padding: "4px 8px", background: "#F8FAFC", borderRadius: 6, flexWrap: "wrap" }}><span style={{ fontSize: 11, color: "#94A3B8", width: 22 }}>{i + 1}.</span><input style={Object.assign({}, S.input, { flex: 2, fontSize: 12, padding: "4px 8px", minWidth: 120 })} value={ci.name} onChange={function(e) { var nc = (f.campaignItems || []).map(function(x, j) { return j === i ? Object.assign({}, x, { name: e.target.value }) : x; }); set("campaignItems", nc); }} placeholder="Produs" /><input style={Object.assign({}, S.input, { flex: 3, fontSize: 11, padding: "4px 8px", minWidth: 140 })} value={ci.link || ""} onChange={function(e) { var nc = (f.campaignItems || []).map(function(x, j) { return j === i ? Object.assign({}, x, { link: e.target.value }) : x; }); set("campaignItems", nc); }} placeholder="Link produs..." /><button style={S.iconBtn} onClick={function() { set("campaignItems", (f.campaignItems || []).filter(function(_, j) { return j !== i; })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}
    <div style={{ display: "flex", gap: 6, marginTop: 4, marginBottom: 8 }}><input style={Object.assign({}, S.input, { flex: 1 })} id="campItemInput" placeholder="Nume produs / item..." onKeyDown={function(e) { if (e.key === "Enter" && e.target.value.trim()) { set("campaignItems", (f.campaignItems || []).concat([{ id: gid(), name: e.target.value.trim(), link: "" }])); e.target.value = ""; } }} /><button style={S.primBtn} onClick={function() { var el = document.getElementById("campItemInput"); if (el && el.value.trim()) { set("campaignItems", (f.campaignItems || []).concat([{ id: gid(), name: el.value.trim(), link: "" }])); el.value = ""; } }}><Ic d={Icons.plus} size={14} color="#fff" /></button></div>
    {(f.campaignItems || []).length > 0 && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>{(f.campaignItems || []).length} produse in campaign. La finalizare vei selecta cate ai completat.</div>}
    <label style={Object.assign({}, S.label, { marginTop: 12 })}>Descriere</label><textarea style={S.ta} value={f.description} onChange={function(e) { set("description", e.target.value); }} placeholder="Detalii..." />
    <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}><button style={S.cancelBtn} onClick={onClose}>Anuleaza</button><button style={S.primBtn} onClick={function() { if (f.title.trim()) onSave(f); }}>{task ? "Salveaza" : "Creeaza"}</button></div>
  </div></div>;
}

// ═══ FEATURE 1: RECURRING TASKS PAGE ═══
function RecurringPage({ recurringTasks, setRecurringTasks, team, assUsers, shops, departments, canEdit }) {
  var [showForm, setShowForm] = useState(false);
  var [form, setForm] = useState({ title: "", description: "", assignee: assUsers[0] || "", priority: "Normal", frequency: "Zilnic", dayOfWeek: 1, dayOfMonth: 1, shop: "", department: "", subtasks: [], active: true });
  var save = function() { if (!form.title.trim()) return; setRecurringTasks(function(p) { return p.concat([Object.assign({}, form, { id: gid(), lastCreated: "" })]); }); setShowForm(false); setForm({ title: "", description: "", assignee: assUsers[0] || "", priority: "Normal", frequency: "Zilnic", dayOfWeek: 1, dayOfMonth: 1, shop: "", department: "", subtasks: [], active: true }); };
  return <div style={{ maxWidth: 700 }}>
    {canEdit && <button style={Object.assign({}, S.primBtn, { marginBottom: 16 })} onClick={function() { setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> Recurring nou</button>}
    {showForm && <Card style={{ marginBottom: 16 }}>
      <label style={S.label}>Titlu</label><input style={S.input} value={form.title} onChange={function(e) { setForm(Object.assign({}, form, { title: e.target.value })); }} />
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Persoana</label><select style={S.fSelF} value={form.assignee} onChange={function(e) { setForm(Object.assign({}, form, { assignee: e.target.value })); }}>{assUsers.map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Frecventa</label><select style={S.fSelF} value={form.frequency} onChange={function(e) { setForm(Object.assign({}, form, { frequency: e.target.value })); }}>{RECUR_OPTS.map(function(r) { return <option key={r} value={r}>{r}</option>; })}</select></div></div>
      {form.frequency === "Saptamanal" && <div><label style={S.label}>Zi din saptamana (1=Luni)</label><input style={S.input} type="number" min="1" max="7" value={form.dayOfWeek} onChange={function(e) { setForm(Object.assign({}, form, { dayOfWeek: parseInt(e.target.value) || 1 })); }} /></div>}
      {form.frequency === "Lunar" && <div><label style={S.label}>Zi din luna</label><input style={S.input} type="number" min="1" max="31" value={form.dayOfMonth} onChange={function(e) { setForm(Object.assign({}, form, { dayOfMonth: parseInt(e.target.value) || 1 })); }} /></div>}
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Prioritate</label><select style={S.fSelF} value={form.priority} onChange={function(e) { setForm(Object.assign({}, form, { priority: e.target.value })); }}>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Magazin</label><select style={S.fSelF} value={form.shop} onChange={function(e) { setForm(Object.assign({}, form, { shop: e.target.value })); }}><option value="">--</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div></div>
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Departament</label><select style={S.fSelF} value={form.department} onChange={function(e) { setForm(Object.assign({}, form, { department: e.target.value })); }}><option value="">--</option>{(departments || []).map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select></div></div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={save}>Salveaza</button><button style={S.cancelBtn} onClick={function() { setShowForm(false); }}>Anuleaza</button></div>
    </Card>}
    {recurringTasks.map(function(rt) { var u = team[rt.assignee]; return <Card key={rt.id} style={{ marginBottom: 8, borderLeft: "3px solid " + (rt.active ? GR : "#CBD5E1"), opacity: rt.active ? 1 : 0.6 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Ic d={Icons.recur} size={18} color={rt.active ? GR : "#94A3B8"} /><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{rt.title}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{rt.frequency} | {u ? u.name : "?"} | {rt.shop || "Toate"} | {rt.priority} | Last: {rt.lastCreated || "niciodata"}</div></div><button style={Object.assign({}, S.chip, { background: rt.active ? GR : "#F1F5F9", color: rt.active ? "#fff" : "#475569" })} onClick={function() { setRecurringTasks(function(p) { return p.map(function(x) { return x.id === rt.id ? Object.assign({}, x, { active: !x.active }) : x; }); }); }}>{rt.active ? "Activ" : "Inactiv"}</button>{canEdit && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) setRecurringTasks(function(p) { return p.filter(function(x) { return x.id !== rt.id; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}</div></Card>; })}
    {recurringTasks.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 30 }}>Niciun task recurent configurat.</Card>}
  </div>;
}

// ═══ FEATURE 7: HEATMAP ═══
function HeatmapPage({ tasks, team, visUsers, isMob }) {
  var today = new Date(); var weeks = 12;
  var days = []; for (var i = weeks * 7 - 1; i >= 0; i--) { var d = new Date(today); d.setDate(d.getDate() - i); days.push(ds(d)); }
  var tasksByDay = {}; tasks.forEach(function(t) { if (t.status === "Done" && t.updatedAt) { var d2 = ds(t.updatedAt); if (!tasksByDay[d2]) tasksByDay[d2] = 0; tasksByDay[d2]++; } });
  var mx = Math.max.apply(null, Object.values(tasksByDay).concat([1]));
  var getColor = function(count) { if (!count) return "#F1F5F9"; var intensity = count / mx; if (intensity > 0.75) return GR; if (intensity > 0.5) return "#16A34A"; if (intensity > 0.25) return "#4ADE80"; return "#BBF7D0"; };
  return <div>
    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Activitate - ultimele {weeks} saptamani</h3>
    <Card><div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>{["L", "M", "M", "J", "V", "S", "D"].map(function(d2, i2) { return <div key={i2} style={{ fontSize: 10, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>{d2}</div>; })}{days.map(function(d2) { var count = tasksByDay[d2] || 0; return <div key={d2} title={d2 + ": " + count + " done"} style={{ width: "100%", paddingBottom: "100%", borderRadius: 3, background: getColor(count), cursor: "pointer", position: "relative" }}><span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: count > mx * 0.5 ? "#fff" : "#94A3B8" }}>{count || ""}</span></div>; })}</div>
    <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", fontSize: 11, color: "#94A3B8" }}><span>Mai putin</span>{[0, 0.25, 0.5, 0.75, 1].map(function(v, i2) { return <div key={i2} style={{ width: 14, height: 14, borderRadius: 3, background: getColor(Math.round(v * mx)) }} />; })}<span>Mai mult</span></div></Card>
  </div>;
}

// ═══ FEATURE 6: WEEKLY DIGEST ═══
function DigestPage({ team, tasks, timers, getPerf, visUsers, isMob }) {
  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); var weekAgoStr = ds(weekAgo);
  var users = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; });
  var digest = users.map(function(u) {
    var ut = tasks.filter(function(t) { return t.assignee === u; });
    var weekDone = ut.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) >= weekAgoStr; }).length;
    var weekCreated = ut.filter(function(t) { return t.createdAt && ds(t.createdAt) >= weekAgoStr; }).length;
    var overdue = ut.filter(function(t) { return isOv(t); }).length;
    var perf = getPerf(u);
    var totalTime = 0; ut.forEach(function(t) { var tm = timers[t.id]; if (tm) totalTime += tm.total; });
    return { key: u, name: team[u].name, color: team[u].color, weekDone: weekDone, weekCreated: weekCreated, overdue: overdue, perf: perf, totalTime: totalTime };
  }).sort(function(a, b) { return b.weekDone - a.weekDone; });
  var copyDigest = function() {
    var text = "WEEKLY DIGEST - " + fd(weekAgoStr) + " -> " + fd(TD) + "\n\n";
    digest.forEach(function(d) { text += d.name + ": " + d.weekDone + " done, " + d.overdue + " overdue, " + d.perf.score + "% perf, " + ft(d.totalTime) + " tracked\n"; });
    navigator.clipboard.writeText(text);
  };
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700 }}>Weekly Digest ({fd(weekAgoStr)} - {fd(TD)})</h3>
      <button style={S.primBtn} onClick={copyDigest}><Ic d={Icons.copy} size={14} color="#fff" /> Copy</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(320,1fr))", gap: 12 }}>
      {digest.map(function(d) { return <Card key={d.key} style={{ borderLeft: "3px solid " + d.color }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><Av color={d.color} size={36}>{d.name[0]}</Av><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>Score: {d.perf.score}%</div></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, textAlign: "center" }}>{[{ l: "Done", v: d.weekDone, c: GR }, { l: "Noi", v: d.weekCreated, c: "#2563EB" }, { l: "Overdue", v: d.overdue, c: "#DC2626" }, { l: "Timp", v: ft(d.totalTime), c: "#64748B" }].map(function(x) { return <div key={x.l} style={{ background: x.c + "12", borderRadius: 6, padding: "6px 4px" }}><div style={{ fontSize: 16, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 9, color: "#94A3B8" }}>{x.l}</div></div>; })}</div></Card>; })}
    </div>
  </div>;
}

// ═══ FEATURE 9: SLA PAGE ═══
function SLAPage({ slas, setSlas, shops, tasks, team, slaBreaches, isMob }) {
  var [editShop, setEditShop] = useState(""); var [editHours, setEditHours] = useState(48);
  var saveSla = function() { if (!editShop) return; setSlas(function(p) { var n = Object.assign({}, p); n[editShop] = editHours; return n; }); setEditShop(""); };
  return <div style={{ maxWidth: 700 }}>
    <Card style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>SLA per Magazin (ore maxime per task)</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <select style={S.fSelF} value={editShop} onChange={function(e) { setEditShop(e.target.value); }}><option value="">Magazin...</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
        <input style={Object.assign({}, S.input, { width: 80 })} type="number" value={editHours} onChange={function(e) { setEditHours(parseInt(e.target.value) || 48); }} />
        <span style={{ fontSize: 11, color: "#94A3B8" }}>ore</span>
        <button style={S.primBtn} onClick={saveSla}>Set</button>
      </div>
      {Object.keys(slas).length > 0 && Object.entries(slas).map(function(entry) { return <div key={entry[0]} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}><span style={{ flex: 1, fontWeight: 600 }}>{entry[0]}</span><span style={{ fontSize: 13 }}>{entry[1]}h max</span><button style={S.iconBtn} onClick={function() { setSlas(function(p) { var n = Object.assign({}, p); delete n[entry[0]]; return n; }); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}
      {Object.keys(slas).length === 0 && <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", padding: 12 }}>Niciun SLA configurat. Selecteaza un magazin si seteaza ore maxime.</div>}
    </Card>
    {slaBreaches.length > 0 && <Card style={{ borderLeft: "3px solid #DC2626" }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#DC2626", marginBottom: 12 }}>Breaches ({slaBreaches.length})</h3>
      {slaBreaches.map(function(b) { var a = team[b.task.assignee] || {}; return <div key={b.task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F1F5F9", fontSize: 12 }}><span style={{ fontWeight: 600, flex: 1 }}>{b.task.title}</span>{a.name && <span>{a.name}</span>}<Badge bg="#FEF2F2" color="#DC2626">{b.task.shop}</Badge><span style={{ color: "#DC2626", fontWeight: 700 }}>{b.hours}h / {b.max}h</span></div>; })}
    </Card>}
    {slaBreaches.length === 0 && <Card style={{ textAlign: "center", color: GR, padding: 20 }}>Niciun SLA breach. Totul e in regula.</Card>}
  </div>;
}

// ═══ FEATURE 5: CAMPAIGN FINALIZE MODAL ═══
function CampaignFinalizeModal({ task, onFinalize, onClose }) {
  var [count, setCount] = useState((task.campaignItems || []).length);
  var total = (task.campaignItems || []).length;
  return <div style={S.modalOv} onClick={onClose}><div style={Object.assign({}, S.modalBox, { maxWidth: 440 })} onClick={function(e) { e.stopPropagation(); }}>
    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Finalizeaza Campaign</h2>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{task.title}</div>
    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>{total} produse in campaign:</div>
    <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>{(task.campaignItems || []).map(function(ci, i) { return <div key={ci.id || i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 2, background: "#F8FAFC", fontSize: 12 }}><span style={{ color: "#94A3B8", width: 22 }}>{i + 1}.</span><span style={{ flex: 1 }}>{ci.name}</span></div>; })}</div>
    <label style={S.label}>Cate ai finalizat?</label>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <input style={Object.assign({}, S.input, { width: 100, fontSize: 20, fontWeight: 700, textAlign: "center" })} type="number" min="0" max={total} value={count} onChange={function(e) { var v = parseInt(e.target.value) || 0; setCount(Math.min(v, total)); }} />
      <span style={{ fontSize: 14, color: "#64748B" }}>/ {total} produse</span>
    </div>
    <div style={S.progBg}><div style={S.progBar(count >= total ? GR : count >= total / 2 ? "#D97706" : "#DC2626", total > 0 ? (count / total) * 100 : 0)} /></div>
    <div style={{ fontSize: 12, color: "#64748B", marginTop: 8, marginBottom: 16 }}>{count} produse se adauga la targetul zilnic. {total - count > 0 ? (total - count) + " ramase." : "Toate finalizate!"}</div>
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button style={S.cancelBtn} onClick={onClose}>Anuleaza</button><button style={S.primBtn} onClick={function() { onFinalize(count); }}>Finalizeaza ({count})</button></div>
  </div></div>;
}

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
