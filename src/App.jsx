import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ═══ SUPABASE ═══
var supabase = createClient(
  "https://ploucecgizjwyumzmhmo.supabase.co",
  "sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh"
);

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
var SBG = { "To Do": "#F8FAFC", "In Progress": "#EFF6FF", Review: "#FFFBEB", Done: "#ECFDF5" };
var SI = { "To Do": "o", "In Progress": "~", Review: "?", Done: "*" };
var GR = "#0C7E3E";

// FEATURE 10: Achievements definitions
var ACHIEVEMENTS = [
  { id: "first_task", name: "Prima Sarcina", desc: "Primul task completat", icon: "🎯", threshold: 1, type: "done_count" },
  { id: "ten_done", name: "Productiv", desc: "10 taskuri completate", icon: "⚡", threshold: 10, type: "done_count" },
  { id: "fifty_done", name: "Masina de Lucru", desc: "50 taskuri completate", icon: "🔥", threshold: 50, type: "done_count" },
  { id: "hundred_done", name: "Legend", desc: "100 taskuri completate", icon: "👑", threshold: 100, type: "done_count" },
  { id: "streak_3", name: "Streak 3 Zile", desc: "3 zile consecutive cu taskuri done", icon: "📅", threshold: 3, type: "streak" },
  { id: "streak_7", name: "Saptamana Perfecta", desc: "7 zile consecutive active", icon: "🏆", threshold: 7, type: "streak" },
  { id: "no_overdue", name: "Zero Intarzieri", desc: "Niciun task overdue", icon: "✅", threshold: 0, type: "no_overdue" },
  { id: "speed_demon", name: "Speed Demon", desc: "Task completat in sub 1h", icon: "💨", threshold: 3600, type: "fast_complete" },
];

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

// FEATURE 3: Auto-priority based on deadline
function autoPriority(deadline, currentPriority) {
  if (!deadline) return currentPriority;
  var d = ds(deadline);
  if (d < TD) return "Urgent";
  if (d === TD) return currentPriority === "Low" ? "High" : currentPriority;
  if (d === TM) return currentPriority === "Low" ? "Normal" : currentPriority;
  return currentPriority;
}

// FEATURE 13: Permission check
function hasPerm(user, team, perm) {
  if (!user || !team[user]) return false;
  var m = team[user];
  if (m.role === "admin") return true;
  if (m.permissions && m.permissions[perm] !== undefined) return m.permissions[perm];
  // defaults by role
  var defaults = {
    pm: { can_create: true, can_edit: true, can_delete: true, can_change_status: true, can_view_all: true },
    member: { can_create: false, can_edit: false, can_delete: false, can_change_status: true, can_view_all: false },
  };
  return (defaults[m.role] || {})[perm] || false;
}

var CSS = "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{margin:0;background:#FAFAFA;font-family:system-ui,-apple-system,sans-serif}::selection{background:#0C7E3E22}input:focus,select:focus,textarea:focus{border-color:#0C7E3E !important;outline:none;box-shadow:0 0 0 3px #0C7E3E18}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:10px}button{cursor:pointer;font-family:inherit}button:hover{opacity:0.9}a{text-decoration:none}@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}@keyframes toastIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}@keyframes toastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-20px)}}@keyframes badgePop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}";

function Badge({ bg, color, children }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: bg, color: color, whiteSpace: "nowrap" }}>{children}</span>; }
function Av({ color, size, fs, children }) { return <div style={{ width: size || 32, height: size || 32, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs || 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{children}</div>; }
function Card({ children, style }) { return <div style={{ background: "#fff", border: "1px solid hsl(214,18%,90%)", borderRadius: 10, padding: 16, animation: "fadeUp 0.2s", ...style }}>{children}</div>; }

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
  digest: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></>,
  bird: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/><circle cx="12" cy="7" r="2"/></>,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></>,
  tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  announce: <><path d="M22 8.01V16a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h16"/><path d="M22 8L12 13 2 8"/></>,
  challenge: <><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  anomaly: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  history: <><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4"/><polyline points="3 3 3 7 7 7"/></>,
  export: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
};

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

// FEATURE 10: Achievement popup
function AchievementPopup({ achievement, onClose }) {
  useEffect(function() { var t = setTimeout(onClose, 4000); return function() { clearTimeout(t); }; }, []);
  return <div style={{ position: "fixed", bottom: 80, right: 20, zIndex: 9998, background: "linear-gradient(135deg, #0C7E3E, #16A34A)", borderRadius: 14, padding: "16px 20px", boxShadow: "0 8px 40px rgba(12,126,62,0.4)", animation: "badgePop 0.5s ease", display: "flex", alignItems: "center", gap: 14, maxWidth: 320 }}>
    <div style={{ fontSize: 36 }}>{achievement.icon}</div>
    <div><div style={{ fontSize: 11, color: "#BBF7D0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Achievement Deblocat!</div><div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{achievement.name}</div><div style={{ fontSize: 11, color: "#D1FAE5", marginTop: 2 }}>{achievement.desc}</div></div>
    <button style={{ border: "none", background: "none", padding: 4 }} onClick={onClose}><Ic d={Icons.x} size={14} color="#BBF7D0" /></button>
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
  var [taskTypes, setTaskTypes] = useState(DEF_TASK_TYPES);
  var [departments, setDepartments] = useState(DEF_DEPARTMENTS);
  var [toasts, setToasts] = useState([]);
  var [loginTrack, setLoginTrack] = useState({});
  var [deptFilter, setDeptFilter] = useState("all");
  var [platformFilter, setPlatformFilter] = useState("all");
  var [recurringTasks, setRecurringTasks] = useState([]);
  var [selectedTasks, setSelectedTasks] = useState([]);
  var [bulkMode, setBulkMode] = useState(false);
  var [statusHistory, setStatusHistory] = useState({});
  var [showFinalize, setShowFinalize] = useState(null);
  // FEATURE 2: Product audit trail
  var [productAudit, setProductAudit] = useState([]);
  // FEATURE 4: Tags
  var [allTags, setAllTags] = useState([]);
  var [tagFilter, setTagFilter] = useState("all");
  // FEATURE 6: Export state
  var [showExport, setShowExport] = useState(false);
  // FEATURE 7: Anomalies
  var [anomalies, setAnomalies] = useState([]);
  // FEATURE 10: Achievements
  var [achievements, setAchievements] = useState({});
  var [achievementPopup, setAchievementPopup] = useState(null);
  // FEATURE 11: Daily challenge
  var [dailyChallenge, setDailyChallenge] = useState(null);
  // FEATURE 12: Login history
  var [loginHistory, setLoginHistory] = useState([]);
  // FEATURE 14: Announcements
  var [announcements, setAnnouncements] = useState([]);
  var [showAnnounce, setShowAnnounce] = useState(false);
  // FEATURE 16: Conflict tracking
  var [taskEditors, setTaskEditors] = useState({});
  // FEATURE 9: Block edit after done - handled inline
  // FEATURE 15: Draft auto-save handled in TaskModal
  // Slas kept for backwards compat but removed from nav
  var [slas, setSlas] = useState({});

  useEffect(function() {
    async function loadAll() {
      var [t, tk, lg, se, sh, pr, tm, tpl, tgt, sht, nf, tt, dp, lt, rc, stH, pa, at, ach, dc, lh, ann, sl] = await Promise.all([
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
        cloudLoad("statusHistory", {}),
        cloudLoad("productAudit", []),
        cloudLoad("allTags", []),
        cloudLoad("achievements", {}),
        cloudLoad("dailyChallenge", null),
        cloudLoad("loginHistory", []),
        cloudLoad("announcements", []),
        cloudLoad("slas", {}),
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
      setStatusHistory(stH || {});
      setProductAudit(pa || []);
      setAllTags(at || []);
      setAchievements(ach || {});
      setDailyChallenge(dc || null);
      setLoginHistory(lh || []);
      setAnnouncements(ann || []);
      setSlas(sl || {});
      var savedUser = localStorage.getItem("s7_user");
      if (savedUser) { try { setUser(JSON.parse(savedUser)); } catch(e) {} }
      setLoading(false);
    }
    loadAll();
  }, []);

  // Realtime subscription
  useEffect(function() {
    var channel = supabase.channel("app_data_changes").on("postgres_changes", { event: "*", schema: "public", table: "app_data" }, function(payload) {
      if (payload.new && payload.new.id === "tasks" && payload.new.data) setTasks(payload.new.data);
      if (payload.new && payload.new.id === "taskEditors" && payload.new.data) setTaskEditors(payload.new.data);
      if (payload.new && payload.new.id === "announcements" && payload.new.data) setAnnouncements(payload.new.data);
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

  // Auto-saves
  useEffect(function() { if (!loading) debouncedSave("team", team, 1000); }, [team]);
  useEffect(function() { if (!loading && tasks.length > 0) debouncedSave("tasks", tasks, 500); }, [tasks]);
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
  useEffect(function() { if (!loading) debouncedSave("statusHistory", statusHistory, 1000); }, [statusHistory]);
  useEffect(function() { if (!loading) debouncedSave("productAudit", productAudit, 1000); }, [productAudit]);
  useEffect(function() { if (!loading) debouncedSave("allTags", allTags, 1000); }, [allTags]);
  useEffect(function() { if (!loading) debouncedSave("achievements", achievements, 1000); }, [achievements]);
  useEffect(function() { if (!loading) debouncedSave("dailyChallenge", dailyChallenge, 1000); }, [dailyChallenge]);
  useEffect(function() { if (!loading) debouncedSave("loginHistory", loginHistory, 2000); }, [loginHistory]);
  useEffect(function() { if (!loading) debouncedSave("announcements", announcements, 1000); }, [announcements]);
  useEffect(function() { if (!loading) debouncedSave("slas", slas, 1000); }, [slas]);

  // FEATURE 7: Anomaly detection - runs every 5min
  useEffect(function() {
    if (loading || !user) return;
    var detect = function() {
      var found = [];
      // Detect: tasks stuck In Progress > 48h
      tasks.forEach(function(t) {
        if (t.status === "In Progress" && t.updatedAt) {
          var h = hDiff(t.updatedAt, ts());
          if (h > 48) found.push({ type: "stuck_task", taskId: t.id, msg: "\"" + t.title + "\" - In Progress de " + h + "h", severity: h > 72 ? "high" : "medium" });
        }
      });
      // Detect: user with 0 tasks for 3+ days (only non-admin)
      Object.keys(team).forEach(function(u2) {
        if (team[u2].role === "admin") return;
        var userTasks = tasks.filter(function(t) { return t.assignee === u2 && t.status !== "Done"; });
        if (userTasks.length === 0) {
          found.push({ type: "idle_user", userId: u2, msg: (team[u2].name) + " - fara taskuri active", severity: "low" });
        }
      });
      // Detect: overdue spike (>30% tasks overdue)
      var total = tasks.filter(function(t) { return t.status !== "Done"; }).length;
      var ovd = tasks.filter(function(t) { return isOv(t); }).length;
      if (total > 0 && (ovd / total) > 0.3) {
        found.push({ type: "overdue_spike", msg: ovd + " taskuri intarziate (" + Math.round((ovd/total)*100) + "% din total activ)", severity: "high" });
      }
      setAnomalies(found);
    };
    detect();
    var iv = setInterval(detect, 300000);
    return function() { clearInterval(iv); };
  }, [loading, user, tasks, team]);

  // FEATURE 10: Achievement checker
  var checkAchievements = useCallback(function(forUser) {
    var userTasks = tasks.filter(function(t) { return t.assignee === forUser; });
    var doneCount = userTasks.filter(function(t) { return t.status === "Done"; }).length;
    var existing = achievements[forUser] || [];
    var newOnes = [];
    ACHIEVEMENTS.forEach(function(ach) {
      if (existing.includes(ach.id)) return;
      var earned = false;
      if (ach.type === "done_count" && doneCount >= ach.threshold) earned = true;
      if (ach.type === "no_overdue" && tasks.filter(function(t) { return t.assignee === forUser && isOv(t); }).length === 0 && doneCount > 0) earned = true;
      if (earned) newOnes.push(ach);
    });
    if (newOnes.length > 0) {
      setAchievements(function(p) { var n = Object.assign({}, p); n[forUser] = (n[forUser] || []).concat(newOnes.map(function(a) { return a.id; })); return n; });
      if (forUser === user) setAchievementPopup(newOnes[0]);
    }
  }, [tasks, achievements, user]);

  // Recurring tasks check
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
          var nt = { id: gid(), title: rt.title, description: rt.description || "", assignee: rt.assignee, status: "To Do", priority: rt.priority || "Normal", platform: rt.platform || "", taskType: rt.taskType || "", department: rt.department || "", shop: rt.shop || "", product: "", productName: "", deadline: today, links: [], subtasks: (rt.subtasks || []).map(function(s) { return { id: gid(), text: s, done: false }; }), comments: [], tags: [], createdBy: "system", createdAt: ts(), updatedAt: ts(), recurring: rt.id };
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

  // FEATURE 16: Track who's editing - broadcast self as editor
  useEffect(function() {
    if (!user || loading) return;
    var broadcastEditing = function(taskId) {
      if (!taskId) return;
      var updated = Object.assign({}, taskEditors);
      updated[taskId] = { userId: user, name: (team[user] || {}).name, at: ts() };
      debouncedSave("taskEditors", updated, 300);
    };
    // cleanup stale editors older than 2min
    var clean = setInterval(function() {
      var now = Date.now();
      var updated = {};
      Object.keys(taskEditors).forEach(function(tid) {
        var e = taskEditors[tid];
        if (e && (now - new Date(e.at).getTime()) < 120000) updated[tid] = e;
      });
      if (Object.keys(updated).length !== Object.keys(taskEditors).length) setTaskEditors(updated);
    }, 30000);
    return function() { clearInterval(clean); };
  }, [user, loading, taskEditors, team]);

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
    // FEATURE 12: Login history
    var entry = { id: gid(), userId: u, name: t.name, time: ts(), ip: "browser" };
    setLoginHistory(function(p) { return [entry].concat(p).slice(0, 200); });
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
  var assUsers = useMemo(function() { if (!user) return []; var m = team[user]; if (!m) return []; if (m.role === "admin") return Object.keys(team).filter(function(k) { return k !== "admin"; }); if (m.role === "pm") return [user].concat(m.team || []); return [user]; }, [user, team]);
  var visTasks = useMemo(function() {
    if (!user) return [];
    // Build set of parent IDs that have children
    var parentIds = new Set();
    tasks.forEach(function(t) { if (t._campaignParentId) parentIds.add(t._campaignParentId); });
    return tasks.filter(function(t) {
      if (t._campaignParent) return false;
      // Hide old-style parent tasks (have campaign items + are referenced as parent by children)
      if (t.campaignItems && t.campaignItems.length > 0 && parentIds.has(t.id)) return false;
      return visUsers.includes(t.assignee) || visUsers.includes(t.createdBy);
    });
  }, [tasks, visUsers, user]);

  var filtered = useMemo(function() {
    return visTasks.filter(function(t) {
      if (statusF !== "all" && t.status !== statusF) return false;
      if (prioF !== "all" && t.priority !== prioF) return false;
      if (assignF !== "all" && t.assignee !== assignF) return false;
      if (shopF !== "all" && t.shop !== shopF) return false;
      if (tagFilter !== "all" && !(t.tags || []).includes(tagFilter)) return false;
      if (dateF === "today" && !isTd(t.deadline)) return false;
      if (dateF === "tomorrow" && !isTm(t.deadline)) return false;
      if (dateF === "overdue" && !isOv(t)) return false;
      if (dateF === "upcoming" && !isF(t.deadline)) return false;
      if (dateF === "nodate" && t.deadline) return false;
      return true;
    });
  }, [visTasks, statusF, prioF, assignF, shopF, dateF, tagFilter]);

  var stats = useMemo(function() {
    var s = { total: visTasks.length, today: 0, overdue: 0, inProg: 0, done: 0, review: 0 };
    visTasks.forEach(function(t) { if (isTd(t.deadline)) s.today++; if (isOv(t)) s.overdue++; if (t.status === "In Progress") s.inProg++; if (t.status === "Done") s.done++; if (t.status === "Review") s.review++; });
    return s;
  }, [visTasks]);

  var grouped = useMemo(function() {
    var s = filtered.slice().sort(function(a, b) {
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
    if (t.id) {
      // FEATURE 9: block edit after Done for non-admin
      var existing = tasks.find(function(x) { return x.id === t.id; });
      if (existing && existing.status === "Done" && team[user] && team[user].role !== "admin") {
        addNotif("blocked", "Task Done nu poate fi editat. Contacteaza adminul.", t.id, user);
        return;
      }
      // FEATURE 3: auto-priority on edit
      var autoPrio = autoPriority(t.deadline, t.priority);
      setTasks(function(p) { return p.map(function(x) { return x.id === t.id ? Object.assign({}, t, { priority: autoPrio, updatedAt: ts() }) : x; }); });
      addLog("EDIT", (team[user] ? team[user].name : "") + " a editat \"" + t.title + "\"");
      // FEATURE 16: clear editor lock
      setTaskEditors(function(p) { var n = Object.assign({}, p); delete n[t.id]; return n; });
    } else {
      // FEATURE 3: auto-priority on create
      var autoPrio2 = autoPriority(t.deadline, t.priority);
      var assignees = t.assignees && t.assignees.length > 0 ? t.assignees : [t.assignee];
      if (t.campaignItems && t.campaignItems.length > 0 && !t._isCampaignChild) {
        // Auto-save campaign products to products list ONLY for Ad Creation tasks
        if (t.taskType === "Ad Creation" && t.campaignItems.length > 0) {
          setProducts(function(prevProds) {
            var updated = prevProds.slice();
            t.campaignItems.forEach(function(ci) {
              if (!ci.name || !ci.name.trim()) return;
              // Check if already exists (same name + same shop)
              var exists = updated.find(function(p) {
                return p.name.toLowerCase().trim() === ci.name.toLowerCase().trim() && p.store === (t.shop || "");
              });
              if (!exists) {
                updated.push({ id: gid(), name: ci.name.trim(), url: ci.link || "", store: t.shop || "", sku: "", _fromCampaign: true, addedAt: ts() });
              }
            });
            return updated;
          });
          addLog("PRODUCTS", "Auto-salvat " + t.campaignItems.length + " produse din campaign Ad Creation");
        }
        var parentId = gid();
        var parentTask = Object.assign({}, t, { id: parentId, priority: autoPrio2, createdBy: user, createdAt: ts(), updatedAt: ts(), _campaignParent: true });
        var childTasks = [];
        t.campaignItems.forEach(function(ci) {
          assignees.forEach(function(asg) {
            var childLinks = t.links ? t.links.slice() : []; if (ci.link) childLinks.push(ci.link);
            var child = { id: gid(), title: ci.name, description: t.description || "", assignee: asg, status: "To Do", priority: autoPrio2, platform: t.platform, taskType: t.taskType, department: t.department, shop: t.shop, product: "", productName: ci.name, deadline: t.deadline, links: childLinks, subtasks: [], comments: [], tags: t.tags || [], dependsOn: [], campaignItems: [], createdBy: user, createdAt: ts(), updatedAt: ts(), _campaignParentId: parentId, _pipelineNext: t._pipelineNext || "" };
            childTasks.push(child);
            setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[child.id] = [{ status: "To Do", at: ts() }]; return n; });
            if (asg !== user) addNotif("assigned", "Task nou: \"" + ci.name + "\"", child.id, asg);
          });
        });
        setTasks(function(p) { return [parentTask].concat(childTasks).concat(p); });
        addLog("CAMPAIGN", "Campaign \"" + t.title + "\" creat cu " + t.campaignItems.length + " produse");
        setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[parentId] = [{ status: "To Do", at: ts() }]; return n; });
      } else if (assignees.length > 1) {
        var newTasks = [];
        assignees.forEach(function(asg) {
          var nt = Object.assign({}, t, { id: gid(), priority: autoPrio2, assignee: asg, tags: t.tags || [], createdBy: user, createdAt: ts(), updatedAt: ts() });
          newTasks.push(nt);
          setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[nt.id] = [{ status: "To Do", at: ts() }]; return n; });
          if (asg !== user) addNotif("assigned", "Task nou: \"" + t.title + "\"", nt.id, asg);
        });
        setTasks(function(p) { return newTasks.concat(p); });
        addLog("NEW", "Multi-assign \"" + t.title + "\"");
      } else {
        var nt = Object.assign({}, t, { id: gid(), priority: autoPrio2, tags: t.tags || [], createdBy: user, createdAt: ts(), updatedAt: ts() });
        setTasks(function(p) { return [nt].concat(p); });
        addLog("NEW", (team[user] ? team[user].name : "") + " -> \"" + t.title + "\"");
        if (t.assignee && t.assignee !== user) addNotif("assigned", "Task nou: \"" + t.title + "\"", nt.id, t.assignee);
        setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[nt.id] = [{ status: "To Do", at: ts() }]; return n; });
      }
      // FEATURE 4: merge new tags into allTags
      if (t.tags && t.tags.length > 0) {
        setAllTags(function(p) { var merged = p.slice(); t.tags.forEach(function(tag) { if (!merged.includes(tag)) merged.push(tag); }); return merged; });
      }
    }
    setShowAdd(false); setEditTask(null);
    // clear draft
    localStorage.removeItem("scout_task_draft");
  };
  var explodeCampaign = function(t) {
    // Create individual child tasks from a campaign parent that has no children yet
    if (!t.campaignItems || t.campaignItems.length === 0) return;
    var parentId = t.id;
    var childTasks = [];
    t.campaignItems.forEach(function(ci) {
      var childLinks = t.links ? t.links.slice() : [];
      if (ci.link) childLinks = [ci.link];
      var child = { id: gid(), title: ci.name || t.title, description: t.description || "", assignee: t.assignee || "", status: "To Do", priority: t.priority, platform: t.platform, taskType: t.taskType, department: t.department, shop: t.shop, product: "", productName: ci.name, deadline: t.deadline, links: childLinks, subtasks: [], comments: [], tags: t.tags || [], dependsOn: [], campaignItems: [], createdBy: t.createdBy, createdAt: ts(), updatedAt: ts(), _campaignParentId: parentId, _pipelineNext: t._pipelineNext || "" };
      childTasks.push(child);
      setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[child.id] = [{ status: "To Do", at: ts() }]; return n; });
    });
    // Mark parent as _campaignParent so it gets hidden
    setTasks(function(p) {
      return p.map(function(x) { return x.id === parentId ? Object.assign({}, x, { _campaignParent: true }) : x; }).concat(childTasks);
    });
    addLog("EXPLODE", "Split: " + t.title + " -> " + childTasks.length + " taskuri");
  };

  var delTask = function(tid) { var t = tasks.find(function(x) { return x.id === tid; }); if (t) addLog("DELETE", "Sters \"" + t.title + "\""); setTasks(function(p) { return p.filter(function(x) { return x.id !== tid; }); }); };
  var dupTask = function(t) { var nt = Object.assign({}, t, { id: gid(), title: t.title + " (copie)", status: "To Do", createdBy: user, createdAt: ts(), updatedAt: ts(), subtasks: (t.subtasks || []).map(function(s) { return { id: gid(), text: s.text, done: false }; }) }); setTasks(function(p) { return [nt].concat(p); }); addLog("DUPLICATE", "Duplicat \"" + t.title + "\""); };

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
    if (st === "Done" && prevTask && prevTask.campaignItems && prevTask.campaignItems.length > 0 && !prevTask._finalized) {
      setShowFinalize(prevTask); return;
    }
    setTasks(function(p) { return p.map(function(x) { return x.id === tid ? Object.assign({}, x, { status: st, updatedAt: ts() }) : x; }); });
    if (prevTask) addLog("STATUS", "\"" + prevTask.title + "\" -> " + st);
    setStatusHistory(function(prev) { var n = Object.assign({}, prev); if (!n[tid]) n[tid] = []; n[tid] = n[tid].concat([{ status: st, at: ts() }]); return n; });

    // FEATURE 1: Notify on status change - notify assignee
    if (prevTask && prevTask.assignee && prevTask.assignee !== user) {
      addNotif("status_change", "\"" + prevTask.title + "\" -> " + st, tid, prevTask.assignee);
    }
    // Notify admin too
    if (prevTask && user !== "admin") {
      addNotif("status_change", (team[user] ? team[user].name : "?") + ": \"" + prevTask.title + "\" -> " + st, tid, "admin");
    }

    if (st === "In Progress") {
      setTimers(function(p) {
        var tm = p[tid] || { running: false, total: 0, startedAt: null };
        if (!tm.running) { var n = Object.assign({}, p); n[tid] = { running: true, total: tm.total, startedAt: ts() }; return n; }
        return p;
      });
    }
    if (st === "Done" || st === "To Do") {
      var tm = timers[tid];
      if (tm && tm.running) {
        var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0;
        setTimers(function(p) { var n = Object.assign({}, p); n[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null }; return n; });
        // FEATURE 10: check speed achievement
        if (st === "Done" && prevTask && el > 0 && (tm.total + el) < 3600) {
          setTimeout(function() { checkAchievements(prevTask.assignee); }, 500);
        }
      }
    }
    if (st === "Done" && prevTask) {
      setTimeout(function() { checkAchievements(prevTask.assignee); }, 500);
      // FEATURE 11: check daily challenge
      if (dailyChallenge && dailyChallenge.date === TD && !dailyChallenge.completedBy) {
        var userDoneToday = tasks.filter(function(t) { return t.assignee === (prevTask.assignee) && t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD; }).length + 1;
        if (userDoneToday >= (dailyChallenge.target || 5)) {
          setDailyChallenge(function(dc) { return dc ? Object.assign({}, dc, { completedBy: prevTask.assignee, completedAt: ts() }) : dc; });
          addNotif("challenge", (team[prevTask.assignee] || {}).name + " a completat Daily Challenge!", tid, "admin");
        }
      }
      // Pipeline
      if (prevTask._pipelineNext) {
        var lastComment = (prevTask.comments || []).slice(-1)[0];
        var pipeDesc = prevTask.description || "";
        if (lastComment) pipeDesc = pipeDesc + "\n\nObservatii: " + lastComment.text;
        var pipeLinks = prevTask._replacedLink ? [prevTask._replacedLink] : (prevTask.links || []).slice();
        var pipeTask = { id: gid(), title: prevTask.title + " - Foto Produs", description: pipeDesc, assignee: prevTask._pipelineNext, status: "To Do", priority: prevTask.priority, platform: prevTask.platform || "", taskType: "Foto Produs", department: "FOTO PRODUS", shop: prevTask.shop, product: prevTask.product || "", productName: prevTask.productName || "", deadline: prevTask.deadline, links: pipeLinks, subtasks: [], comments: [], tags: [], dependsOn: [prevTask.id], campaignItems: [], createdBy: prevTask.assignee, createdAt: ts(), updatedAt: ts(), _campaignParentId: prevTask._campaignParentId || "", _fromPipeline: prevTask.id };
        setTasks(function(p) { return [pipeTask].concat(p); });
        setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[pipeTask.id] = [{ status: "To Do", at: ts() }]; return n; });
        addNotif("pipeline", "Task pipeline: \"" + pipeTask.title + "\"", pipeTask.id, prevTask._pipelineNext);
      }
    }
  };

  var handleDrop = function(st) { if (!dragId) return; chgSt(dragId, st); setDragId(null); };
  var bulkChgSt = function(ns) { selectedTasks.forEach(function(tid) { chgSt(tid, ns); }); setSelectedTasks([]); setBulkMode(false); };
  var bulkChgAssign = function(na) { setTasks(function(p) { return p.map(function(x) { return selectedTasks.includes(x.id) ? Object.assign({}, x, { assignee: na, updatedAt: ts() }) : x; }); }); addLog("BULK", "Bulk assign " + selectedTasks.length); setSelectedTasks([]); setBulkMode(false); };
  var bulkChgPrio = function(np) { setTasks(function(p) { return p.map(function(x) { return selectedTasks.includes(x.id) ? Object.assign({}, x, { priority: np, updatedAt: ts() }) : x; }); }); setSelectedTasks([]); setBulkMode(false); };
  var toggleSel = function(tid) { setSelectedTasks(function(p) { return p.includes(tid) ? p.filter(function(x) { return x !== tid; }) : p.concat([tid]); }); };

  // FEATURE 6: Export all data
  var exportData = function() {
    var data = { exportedAt: ts(), tasks: tasks, team: team, logs: logs, products: products, shops: shops, targets: targets, achievements: achievements, announcements: announcements, loginHistory: loginHistory };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = "scout_backup_" + TD + ".json"; a.click();
    addLog("EXPORT", "Backup exportat de " + (team[user] ? team[user].name : "?"));
  };

  var myNotifs = useMemo(function() { if (!user) return []; var r = team[user] ? team[user].role : ""; return notifications.filter(function(n) { if (r === "admin") return true; return n.forUser === user; }); }, [notifications, user, team]);
  var unreadNotifs = useMemo(function() { return myNotifs.filter(function(n) { return !n.read; }); }, [myNotifs]);

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

  if (!user) return <LoginScreen team={team} onLogin={handleLogin} announcements={announcements} />;
  var me = team[user]; if (!me) { setUser(null); localStorage.removeItem("s7_user"); return null; }
  var canCreate = hasPerm(user, team, "can_create");
  var canEdit = hasPerm(user, team, "can_edit");
  var canDelete = hasPerm(user, team, "can_delete");
  var isAdmin = me.role === "admin";

  if (profUser) return <div style={S.app}><style>{CSS}</style><ToastBanner toasts={toasts} onDismiss={dismissToast} />{achievementPopup && <AchievementPopup achievement={achievementPopup} onClose={function() { setAchievementPopup(null); }} />}<ProfileView pu={profUser} team={team} tasks={tasks} timers={timers} getTS={getTS} logs={logs} sessions={sessions} getPerf={getPerf} range={profRange} setRange={setProfRange} onBack={function() { setProfUser(null); }} isMob={isMob} statusHistory={statusHistory} achievements={achievements} loginHistory={loginHistory} /></div>;

  var fProps = { stats: stats, dateF: dateF, setDateF: setDateF, statusF: statusF, setStatusF: setStatusF, prioF: prioF, setPrioF: setPrioF, assignF: assignF, setAssignF: setAssignF, shopF: shopF, setShopF: setShopF, visUsers: visUsers, shops: shops, count: filtered.length, team: team, departments: departments, deptFilter: deptFilter, setDeptFilter: setDeptFilter, platformFilter: platformFilter, setPlatformFilter: setPlatformFilter, allTags: allTags, tagFilter: tagFilter, setTagFilter: setTagFilter };

  var navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.dash },
    { id: "birdseye", label: "Bird's Eye", icon: Icons.bird },
    { id: "tasks", label: "Taskuri", icon: Icons.tasks, count: stats.total },
    { id: "kanban", label: "Kanban Board", icon: Icons.kanban },
    { id: "calendar", label: "Calendar", icon: Icons.cal },
    { id: "targets", label: "Targets", icon: Icons.target },
    { id: "templates", label: "Templates", icon: Icons.tpl },
    { id: "recurring", label: "Recurring", icon: Icons.recur },
    { id: "workload", label: "Workload", icon: Icons.work },
    { id: "team", label: "Echipa", icon: Icons.team },
    { id: "performance", label: "Performance", icon: Icons.perf },
    { id: "digest", label: "Weekly Digest", icon: Icons.digest },
    { id: "achievements", label: "Achievements", icon: Icons.trophy },
    { id: "announce", label: "Announcements", icon: Icons.announce },
    { id: "challenge", label: "Daily Challenge", icon: Icons.challenge },
    { id: "anomalies", label: "Anomalii", icon: Icons.anomaly },
    { id: "log", label: "Activity Log", icon: Icons.log },
    { id: "loginhistory", label: "Login History", icon: Icons.history },
    { id: "departments", label: "Departamente", icon: Icons.dept },
    { id: "shops", label: "Magazine", icon: Icons.shops },
    { id: "products", label: "Produse", icon: Icons.prod },
    { id: "sheets", label: "Sheets", icon: Icons.sheet },
    { id: "manage_users", label: "Manage Users", icon: Icons.usrs },
  ];

  var accessibleNav = navItems.filter(function(n) {
    if (me.role === "admin") return true;
    if (me.access && me.access.length > 0) return me.access.includes(n.id);
    if (me.role === "pm") return !["manage_users", "log", "birdseye", "loginhistory", "anomalies"].includes(n.id);
    if (me.role === "member") return ["tasks", "kanban", "calendar", "achievements", "challenge", "announce"].includes(n.id);
    return false;
  });

  return (
    <div style={S.app}><style>{CSS}</style>
      <ToastBanner toasts={toasts} onDismiss={dismissToast} />
      {achievementPopup && <AchievementPopup achievement={achievementPopup} onClose={function() { setAchievementPopup(null); }} />}
      {isMob && mobNav && <div style={S.overlay} onClick={function() { setMobNav(false); }} />}
      <aside style={Object.assign({}, S.sidebar, isMob ? { position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 200, transform: mobNav ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.2s" } : {})}>
        <div style={S.logoArea}><span style={S.logoH}>HeyAds</span><span style={S.logoSub}>Task Manager</span></div>
        {canCreate && <div style={{ padding: "0 16px", marginBottom: 4 }}><button style={S.newBtn} onClick={function() { setEditTask(null); setShowAdd(true); setMobNav(false); }}><Ic d={Icons.plus} size={16} color="#fff" /> New Task</button></div>}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {accessibleNav.map(function(n) { return <div key={n.id} style={S.navItem(page === n.id)} onClick={function() { setPage(n.id); setMobNav(false); }}><Ic d={n.icon} size={18} color={page === n.id ? "#4ADE80" : "#7A8BA0"} /><span style={{ flex: 1 }}>{n.label}</span>{n.count != null && <span style={S.navBadge}>{n.count}</span>}{n.id === "anomalies" && anomalies.length > 0 && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} />}{n.id === "announce" && announcements.filter(function(a) { return !a.readBy || !a.readBy.includes(user); }).length > 0 && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563EB" }} />}</div>; })}
        </nav>
        {/* FEATURE 6: Export button in sidebar */}
        {isAdmin && <div style={{ padding: "0 16px 8px" }}><button style={Object.assign({}, S.logoutBtn, { color: "#4ADE80", borderColor: GR + "40" })} onClick={exportData}><Ic d={Icons.export} size={15} color="#4ADE80" /> Export Backup</button></div>}
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
              {myNotifs.slice(0, 20).map(function(n) {
                var typeColors = { status_change: "#2563EB", assigned: GR, blocked: "#DC2626", pipeline: "#7C3AED", challenge: "#D97706", anomaly: "#EA580C" };
                var c = typeColors[n.type] || GR;
                return <div key={n.id} style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: n.read ? "#F8FAFC" : c + "12", border: "1px solid " + (n.read ? "#F1F5F9" : c + "30"), fontSize: 12 }} onClick={function() { setNotifications(function(p) { return p.map(function(nn) { return nn.id === n.id ? Object.assign({}, nn, { read: true }) : nn; }); }); setShowNotifs(false); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />{n.message}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{fr(n.time)}</div>
                </div>;
              })}
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
          {page === "dashboard" && <DashPage stats={stats} tasks={visTasks} team={team} visUsers={visUsers} sessions={sessions} timers={timers} getTS={getTS} getPerf={getPerf} isMob={isMob} onClickUser={setProfUser} targets={targets} loginTrack={loginTrack} allTasks={tasks} slaBreaches={slaBreaches} me={me} anomalies={anomalies} dailyChallenge={dailyChallenge} announcements={announcements} user={user} setAnnouncements={setAnnouncements} />}
          {page === "birdseye" && <BirdsEyePage tasks={tasks} team={team} timers={timers} getTS={getTS} isMob={isMob} sessions={sessions} anomalies={anomalies} />}
          {page === "tasks" && <TasksPage fProps={fProps} grouped={grouped} filtered={filtered} user={user} team={team} onEdit={function(t) { setEditTask(t); setShowAdd(true); }} onView={setViewTask} onDel={delTask} onDup={dupTask} onChgSt={chgSt} isMob={isMob} timers={timers} getTS={getTS} togTimer={togTimer} bulkMode={bulkMode} selectedTasks={selectedTasks} toggleSel={toggleSel} canEdit={canEdit} canDelete={canDelete} onExplode={explodeCampaign} tasks={tasks} />}
          {page === "kanban" && <KanbanPage fProps={fProps} tasks={filtered} user={user} team={team} onEdit={function(t) { setEditTask(t); setShowAdd(true); }} onDel={delTask} onDup={dupTask} onChgSt={chgSt} dragId={dragId} setDragId={setDragId} handleDrop={handleDrop} isMob={isMob} timers={timers} getTS={getTS} togTimer={togTimer} />}
          {page === "calendar" && <CalendarPage tasks={visTasks} user={user} team={team} calDate={calDate} setCalDate={setCalDate} onView={setViewTask} isMob={isMob} me={me} />}
          {page === "targets" && <TargetsPage targets={targets} setTargets={setTargets} team={team} tasks={tasks} timers={timers} canEdit={canCreate} visUsers={visUsers} taskTypes={taskTypes} departments={departments} />}
          {page === "templates" && <TemplatesPage templates={templates} setTemplates={setTemplates} canEdit={canCreate} isAdmin={isAdmin} shops={shops} onCreateFromTpl={function(tpl) { setEditTask({ title: tpl.name, description: tpl.description, shop: tpl.shop || "", subtasks: tpl.subtasks.map(function(s) { return { id: gid(), text: s, done: false }; }) }); setShowAdd(true); }} />}
          {page === "recurring" && <RecurringPage recurringTasks={recurringTasks} setRecurringTasks={setRecurringTasks} team={team} assUsers={assUsers} shops={shops} departments={departments} canEdit={canCreate} />}
          {page === "workload" && <WorkPage users={visUsers} team={team} tasks={visTasks} getPerf={getPerf} timers={timers} getTS={getTS} isMob={isMob} onClickUser={setProfUser} />}
          {page === "team" && <TeamPage users={visUsers} team={team} sessions={sessions} getPerf={getPerf} isMob={isMob} onClickUser={setProfUser} />}
          {page === "performance" && <PerfPage users={visUsers} team={team} getPerf={getPerf} isMob={isMob} />}
          {page === "digest" && <DigestPage team={team} tasks={tasks} timers={timers} getPerf={getPerf} visUsers={visUsers} isMob={isMob} />}
          {page === "achievements" && <AchievementsPage achievements={achievements} team={team} visUsers={visUsers} tasks={tasks} isMob={isMob} />}
          {page === "announce" && <AnnouncePage announcements={announcements} setAnnouncements={setAnnouncements} isAdmin={isAdmin} user={user} team={team} />}
          {page === "challenge" && <ChallengePage dailyChallenge={dailyChallenge} setDailyChallenge={setDailyChallenge} isAdmin={isAdmin} team={team} tasks={tasks} user={user} visUsers={visUsers} />}
          {page === "anomalies" && <AnomaliesPage anomalies={anomalies} team={team} tasks={tasks} isMob={isMob} />}
          {page === "log" && <LogPage logs={logs} visUsers={visUsers} isMob={isMob} />}
          {page === "loginhistory" && <LoginHistoryPage loginHistory={loginHistory} team={team} isMob={isMob} />}
          {page === "departments" && <DeptPage departments={departments} setDepartments={setDepartments} tasks={tasks} team={team} visUsers={visUsers} isMob={isMob} canEdit={canCreate} />}
          {page === "shops" && <ShopsBordPage shops={shops} setShops={setShops} tasks={tasks} team={team} isMob={isMob} canEdit={canCreate} slas={slas} />}
          {page === "products" && <ProdsPage products={products} setProducts={setProducts} shops={shops} productAudit={productAudit} setProductAudit={setProductAudit} user={user} team={team} />}
          {page === "sheets" && <SheetsPage sheets={sheets} setSheets={setSheets} shops={shops} />}
          {page === "manage_users" && <UsersPage team={team} setTeam={setTeam} addLog={addLog} />}
        </div>
      </main>
      {showAdd && <TaskModal task={editTask} team={team} assUsers={assUsers} shops={shops} products={products} onSave={saveTask} onClose={function() { setShowAdd(false); setEditTask(null); localStorage.removeItem("scout_task_draft"); }} taskTypes={taskTypes} departments={departments} allTasks={tasks} allTags={allTags} taskEditors={taskEditors} user={user} setTaskEditors={setTaskEditors} />}
      {viewTask && <ViewTaskModal task={viewTask} team={team} user={user} tasks={tasks} setTasks={setTasks} timers={timers} getTS={getTS} togTimer={togTimer} products={products} onClose={function() { setViewTask(null); }} onEdit={function() { setEditTask(viewTask); setViewTask(null); setShowAdd(true); }} statusHistory={statusHistory} isAdmin={isAdmin} />}
      {showFinalize && <CampaignFinalizeModal task={showFinalize} onFinalize={function(count) {
        var tid = showFinalize.id;
        setTasks(function(p) { return p.map(function(x) { return x.id === tid ? Object.assign({}, x, { status: "Done", updatedAt: ts(), _finalized: true, _finalizedCount: count }) : x; }); });
        addLog("CAMPAIGN", "\"" + showFinalize.title + "\" finalizat: " + count + " produse");
        addNotif("campaign", "Campaign \"" + showFinalize.title + "\" finalizat: " + count + " produse", tid);
        setStatusHistory(function(prev) { var n = Object.assign({}, prev); if (!n[tid]) n[tid] = []; n[tid] = n[tid].concat([{ status: "Done", at: ts() }]); return n; });
        var tm = timers[tid]; if (tm && tm.running) { var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0; setTimers(function(p2) { var n2 = Object.assign({}, p2); n2[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null }; return n2; }); }
        setShowFinalize(null);
      }} onClose={function() { setShowFinalize(null); }} />}
    </div>
  );
}

function LoginScreen({ team, onLogin, announcements }) {
  var [u, setU] = useState(""); var [p, setP] = useState(""); var [show, setShow] = useState(false); var [err, setErr] = useState("");
  var go = function() { if (!onLogin(u.toLowerCase().trim(), p)) setErr("Username sau parola gresita"); };
  var pubAnn = (announcements || []).filter(function(a) { return a.public; }).slice(0, 3);
  return <div style={S.loginWrap}><style>{CSS}</style><div style={S.loginCard}>
    <div style={{ textAlign: "center", marginBottom: 28 }}><div style={{ fontSize: 28, fontWeight: 800, color: "#4ADE80", letterSpacing: 1 }}>HeyAds</div><div style={{ fontSize: 11, color: "#94A3B8", letterSpacing: 2, marginTop: 4, textTransform: "uppercase" }}>Task Manager</div></div>
    {pubAnn.length > 0 && <div style={{ marginBottom: 16 }}>{pubAnn.map(function(a) { return <div key={a.id} style={{ padding: "8px 12px", borderRadius: 8, background: "#ECFDF5", border: "1px solid " + GR + "40", fontSize: 12, marginBottom: 6, color: GR }}><span style={{ fontWeight: 700 }}>📢 {a.title}:</span> {a.body}</div>; })}</div>}
    <label style={S.label}>Username</label><input style={S.input} value={u} onChange={function(e) { setU(e.target.value); setErr(""); }} onKeyDown={function(e) { if (e.key === "Enter") go(); }} placeholder="User" />
    <label style={Object.assign({}, S.label, { marginTop: 14 })}>Parola</label><div style={{ position: "relative" }}><input style={Object.assign({}, S.input, { paddingRight: 42 })} type={show ? "text" : "password"} value={p} onChange={function(e) { setP(e.target.value); setErr(""); }} onKeyDown={function(e) { if (e.key === "Enter") go(); }} placeholder="Introdu parola" /><button type="button" style={S.eyeBtn} onClick={function() { setShow(!show); }}><Ic d={show ? Icons.eyeX : Icons.eye} size={16} color="#94A3B8" /></button></div>
    {err && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 10, textAlign: "center" }}>{err}</div>}
    <button style={Object.assign({}, S.primBtn, { width: "100%", marginTop: 20, padding: "12px 0", fontSize: 14, justifyContent: "center" })} onClick={go}>Intra in platforma</button>
  </div></div>;
}

function FiltersBar({ stats, dateF, setDateF, statusF, setStatusF, prioF, setPrioF, assignF, setAssignF, shopF, setShopF, visUsers, shops, count, team, noStatus, departments, deptFilter, setDeptFilter, platformFilter, setPlatformFilter, allTags, tagFilter, setTagFilter }) {
  var chips = [{ id: "all", l: "Toate" }, { id: "today", l: "Azi", n: stats.today }, { id: "tomorrow", l: "Maine" }, { id: "overdue", l: "Intarziate", n: stats.overdue }, { id: "upcoming", l: "Viitoare" }, { id: "nodate", l: "Fara data" }];
  return <div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{chips.map(function(c) { return <button key={c.id} onClick={function() { setDateF(c.id); }} style={Object.assign({}, S.chip, { background: dateF === c.id ? GR : "#F1F5F9", color: dateF === c.id ? "#fff" : "#475569", fontWeight: dateF === c.id ? 600 : 400 })}>{c.l}{c.n > 0 && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>({c.n})</span>}</button>; })}</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
      {!noStatus && <select style={S.fSel} value={statusF} onChange={function(e) { setStatusF(e.target.value); }}><option value="all">Status: Toate</option>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>}
      <select style={S.fSel} value={prioF} onChange={function(e) { setPrioF(e.target.value); }}><option value="all">Prioritate: Toate</option>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select>
      <select style={S.fSel} value={assignF} onChange={function(e) { setAssignF(e.target.value); }}><option value="all">Persoana: Toti</option>{visUsers.filter(function(u) { return u !== "admin"; }).map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name || u}</option>; })}</select>
      <select style={S.fSel} value={shopF} onChange={function(e) { setShopF(e.target.value); }}><option value="all">Magazin: Toate</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
      {departments && <select style={S.fSel} value={deptFilter || "all"} onChange={function(e) { if (setDeptFilter) setDeptFilter(e.target.value); }}><option value="all">Dept: Toate</option>{departments.map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select>}
      <select style={S.fSel} value={platformFilter || "all"} onChange={function(e) { if (setPlatformFilter) setPlatformFilter(e.target.value); }}><option value="all">Platforma: Toate</option>{PLATFORMS.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select>
      {allTags && allTags.length > 0 && <select style={S.fSel} value={tagFilter || "all"} onChange={function(e) { if (setTagFilter) setTagFilter(e.target.value); }}><option value="all">Tag: Toate</option>{allTags.map(function(t) { return <option key={t} value={t}>#{t}</option>; })}</select>}
      <span style={{ fontSize: 12, color: "#94A3B8" }}>{count} taskuri</span>
    </div>
  </div>;
}

function DashPage({ stats, tasks, team, visUsers, sessions, timers, getTS, getPerf, isMob, onClickUser, targets, loginTrack, allTasks, slaBreaches, me, anomalies, dailyChallenge, announcements, user, setAnnouncements }) {
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
    rangeTasks.forEach(function(t) { if (t.status === "To Do") s.todo++; if (t.status === "In Progress") s.inProg++; if (t.status === "Review") s.review++; if (t.status === "Done") s.done++; if (isOv(t)) s.overdue++; });
    return s;
  }, [rangeTasks]);

  var activeTimers = tasks.filter(function(t) { return timers[t.id] && timers[t.id].running; });
  var unreadAnn = (announcements || []).filter(function(a) { return !a.readBy || !a.readBy.includes(user); });

  var ppl = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) {
    var ut = tasks.filter(function(t) { return t.assignee === u; });
    var rangeUt = rangeTasks.filter(function(t) { return t.assignee === u; });
    var lss = sessions[u]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000;
    var act = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; });
    var todayLogin = loginTrack && loginTrack[u] && loginTrack[u][TD];
    var userTargets = (targets || []).filter(function(tgt) { return tgt.userId === u; });
    var todayDone = allTasks.filter(function(t) { return t.assignee === u && t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD; }).length;
    var workingTasks = rangeUt.filter(function(t) { return t.status === "In Progress"; });
    var assignedTasks = rangeUt.filter(function(t) { return t.status !== "Done"; });
    return { key: u, name: team[u].name, color: team[u].color, role: team[u].role, online: on, act: act, perf: getPerf(u), total: ut.length, firstLogin: todayLogin ? todayLogin.first : null, lastLogin: todayLogin ? todayLogin.last : null, hasLoggedToday: !!todayLogin, assignedTasks: assignedTasks, workingTasks: workingTasks, doneTasks: rangeUt.filter(function(t) { return t.status === "Done"; }), userTargets: userTargets, todayDone: todayDone, rangeDone: rangeUt.filter(function(t) { return t.status === "Done"; }).length };
  });

  return <div>
    {/* Announcements banner */}
    {unreadAnn.length > 0 && <div style={{ marginBottom: 16 }}>{unreadAnn.slice(0, 3).map(function(a) { return <div key={a.id} style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 16 }}>📢</span><div style={{ flex: 1 }}><span style={{ fontWeight: 700, color: "#1E40AF" }}>{a.title}:</span> <span style={{ color: "#1E293B", fontSize: 12 }}>{a.body}</span></div><button style={{ border: "none", background: "none", fontSize: 11, color: "#94A3B8", cursor: "pointer" }} onClick={function() { setAnnouncements(function(p) { return p.map(function(x) { return x.id === a.id ? Object.assign({}, x, { readBy: (x.readBy || []).concat([user]) }) : x; }); }); }}>OK</button></div>; })}</div>}
    {/* Daily challenge banner */}
    {dailyChallenge && dailyChallenge.date === TD && <div style={{ marginBottom: 16, background: dailyChallenge.completedBy ? "#ECFDF5" : "#FFFBEB", border: "1px solid " + (dailyChallenge.completedBy ? GR : "#D97706") + "60", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18 }}>⚡</span><div style={{ flex: 1 }}><span style={{ fontWeight: 700, color: dailyChallenge.completedBy ? GR : "#D97706" }}>Daily Challenge:</span> <span style={{ fontSize: 12 }}>{dailyChallenge.title} ({dailyChallenge.target} taskuri Done)</span></div>{dailyChallenge.completedBy && <Badge bg="#ECFDF5" color={GR}>✓ {(team[dailyChallenge.completedBy] || {}).name}</Badge>}</div>}
    {/* Anomalies alert */}
    {anomalies && anomalies.filter(function(a) { return a.severity === "high"; }).length > 0 && me.role === "admin" && <Card style={{ marginBottom: 16, borderLeft: "3px solid #DC2626", background: "#FEF2F2" }}><h3 style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>Anomalii detectate ({anomalies.length})</h3>{anomalies.slice(0, 3).map(function(a, i) { return <div key={i} style={{ fontSize: 12, padding: "3px 0", color: a.severity === "high" ? "#DC2626" : "#D97706" }}>• {a.msg}</div>; })}</Card>}
    {/* SLA Breaches */}
    {slaBreaches && slaBreaches.length > 0 && me.role === "admin" && <Card style={{ marginBottom: 16, borderLeft: "3px solid #DC2626", background: "#FEF2F2" }}><h3 style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>SLA Breaches ({slaBreaches.length})</h3>{slaBreaches.slice(0, 5).map(function(b) { return <div key={b.task.id} style={{ fontSize: 12, padding: "4px 0", display: "flex", gap: 8 }}><span style={{ fontWeight: 600 }}>{b.task.title}</span><Badge bg="#FEF2F2" color="#DC2626">{b.task.shop}</Badge><span style={{ color: "#DC2626" }}>{b.hours}h / {b.max}h max</span></div>; })}</Card>}
    {/* Date range */}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
      {[{ id: "today", l: "Azi" }, { id: "yesterday", l: "Ieri" }, { id: "week", l: "7 zile" }, { id: "month", l: "30 zile" }, { id: "custom", l: "Custom" }].map(function(p) {
        return <button key={p.id} onClick={function() { setPreset(p.id); }} style={Object.assign({}, S.chip, { background: dashPreset === p.id ? GR : "#F1F5F9", color: dashPreset === p.id ? "#fff" : "#475569", fontWeight: dashPreset === p.id ? 600 : 400 })}>{p.l}</button>;
      })}
      <input type="date" style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 8px" })} value={dashFrom} onChange={function(e) { setDashFrom(e.target.value); setDashPreset("custom"); }} />
      <input type="date" style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 8px" })} value={dashTo} onChange={function(e) { setDashTo(e.target.value); setDashPreset("custom"); }} />
    </div>
    {function() {
      var allStats = { total: tasks.length, todo: 0, inProg: 0, review: 0, done: 0, overdue: 0 };
      tasks.forEach(function(t) { if (t.status === "To Do") allStats.todo++; if (t.status === "In Progress") allStats.inProg++; if (t.status === "Review") allStats.review++; if (t.status === "Done") allStats.done++; if (isOv(t)) allStats.overdue++; });
      return <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(6,1fr)", gap: 12, marginBottom: 24 }}>{[{ l: "Total", v: allStats.total, c: "#475569" }, { l: "To Do", v: allStats.todo, c: "#94A3B8" }, { l: "In Progress", v: allStats.inProg, c: "#2563EB" }, { l: "Review", v: allStats.review, c: "#D97706" }, { l: "Intarziate", v: allStats.overdue, c: "#DC2626" }, { l: "Done", v: allStats.done, c: GR }].map(function(s) { return <Card key={s.l} style={{ borderTop: "3px solid " + s.c }}><div style={{ fontSize: 28, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{s.l}</div></Card>; })}</div>;
    }()}
    {activeTimers.length > 0 && <Card style={{ marginBottom: 20, borderLeft: "3px solid #DC2626" }}><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite" }} /> Live ({activeTimers.length})</h3>{activeTimers.map(function(t) { var a = team[t.assignee]; return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>{a && <Av color={a.color} size={24} fs={10}>{a.name[0]}</Av>}<span style={{ fontSize: 12, color: "#64748B" }}>{a ? a.name : ""}</span><span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{t.title}</span>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}<span style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{ft(getTS(t.id))}</span></div>; })}</Card>}
    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Echipa</h3>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(380px,1fr))", gap: 12 }}>{ppl.map(function(d) {
      return <Card key={d.key} style={{ cursor: "pointer" }}>
        <div onClick={function() { onClickUser(d.key); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ position: "relative" }}><Av color={d.color} size={38}>{d.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: d.online ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 10, color: "#94A3B8" }}>{d.role === "pm" ? "PM" : "Member"}</div></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: d.perf.score >= 70 ? GR : d.perf.score >= 40 ? "#D97706" : "#DC2626" }}>{d.perf.score}%</div>
          </div>
          {me && me.role === "admin" && <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#94A3B8", marginBottom: 8, flexWrap: "wrap" }}>
            <Badge bg={d.hasLoggedToday ? "#ECFDF5" : "#FEF2F2"} color={d.hasLoggedToday ? GR : "#DC2626"}>{d.hasLoggedToday ? "Activ azi" : "Nu a intrat azi"}</Badge>
            {d.firstLogin && <span>Prima: {new Date(d.firstLogin).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>}
            {d.lastLogin && <span>Ultima: {new Date(d.lastLogin).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>}
          {me && me.role === "admin" && d.userTargets.length > 0 && d.userTargets.map(function(tgt) {
            var normM = tgt.metric;
            if (normM && normM !== "all" && !normM.startsWith("type:") && !normM.startsWith("dept:") && !normM.startsWith("plat:")) normM = "type:" + normM;
            var tgtDoneToday = allTasks.filter(function(t) {
              if (t.assignee !== d.key || t.status !== "Done" || !t.updatedAt || ds(t.updatedAt) !== TD) return false;
              if (!normM || normM === "all") return true;
              if (normM.startsWith("type:") && t.taskType === normM.replace("type:", "")) return true;
              if (normM.startsWith("dept:") && t.department === normM.replace("dept:", "")) return true;
              if (normM.startsWith("plat:") && t.platform === normM.replace("plat:", "")) return true;
              return false;
            }).reduce(function(acc, t) {
              // Campaign tasks count by number of finalized products, not 1 per task
              return acc + (t._finalizedCount && t._finalizedCount > 0 ? t._finalizedCount : 1);
            }, 0);
            var pct = tgt.target > 0 ? Math.min(100, (tgtDoneToday / tgt.target) * 100) : 0;
            var rem = Math.max(0, tgt.target - tgtDoneToday);
            var mLabel = normM === "all" ? "Toate" : (normM || "").replace(/^(type:|dept:|plat:)/, "");
            return <div key={tgt.id} style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: pct >= 100 ? "#ECFDF5" : rem > 0 ? "#FFF8F8" : "#F8FAFC", border: "1px solid " + (pct >= 100 ? GR + "30" : "#F1F5F9") }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: "#64748B", fontWeight: 600 }}>{mLabel}</span>
                <span style={{ fontWeight: 700, color: pct >= 100 ? GR : "#DC2626" }}>{tgtDoneToday}/{tgt.target}</span>
              </div>
              <div style={S.progBg}><div style={S.progBar(pct >= 100 ? GR : pct >= 50 ? "#D97706" : "#DC2626", pct)} /></div>
              {rem > 0 && <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, marginTop: 4 }}>Ramas azi: {rem}</div>}
              {pct >= 100 && <div style={{ fontSize: 11, color: GR, fontWeight: 700, marginTop: 4 }}>✓ Target atins!</div>}
            </div>;
          })}
          <div style={{ marginTop: 6, borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
            {/* Live timers first */}
            {d.act.map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 8px", marginBottom: 3, borderRadius: 5, background: "#FEF2F2", border: "1px solid #FECACA" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite", flexShrink: 0 }} /><span style={{ flex: 1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>{t.shop && <span style={{ fontSize: 9, color: GR, fontWeight: 600, flexShrink: 0 }}>{t.shop}</span>}<span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{ft(getTS(t.id))}</span></div>; })}
            {/* In Progress tasks (not timered) */}
            {d.workingTasks.filter(function(t) { return !timers[t.id] || !timers[t.id].running; }).slice(0, 3).map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 8px", marginBottom: 3, borderRadius: 5, background: "#EFF6FF" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563EB", flexShrink: 0 }} /><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>{t.shop && <span style={{ fontSize: 9, color: GR, flexShrink: 0 }}>{t.shop}</span>}</div>; })}
            {/* To Do tasks */}
            {d.assignedTasks.filter(function(t) { return t.status === "To Do"; }).slice(0, 2).map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "3px 8px", marginBottom: 2, borderRadius: 5, background: "#F8FAFC", opacity: 0.85 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#94A3B8", flexShrink: 0 }} /><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#64748B" }}>{t.title}</span>{t.shop && <span style={{ fontSize: 9, color: "#94A3B8", flexShrink: 0 }}>{t.shop}</span>}</div>; })}
            {/* Summary line */}
            {d.assignedTasks.length > 0 && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4, display: "flex", gap: 8 }}><span>{d.workingTasks.length > 0 ? d.workingTasks.length + " in lucru" : ""}</span><span>{d.assignedTasks.filter(function(t){return t.status==="To Do";}).length > 0 ? d.assignedTasks.filter(function(t){return t.status==="To Do";}).length + " to do" : ""}</span><span style={{ color: GR }}>{d.rangeDone > 0 ? d.rangeDone + " done" : ""}</span></div>}
            {me && me.role === "admin" && d.assignedTasks.length === 0 && <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>Fara taskuri active!</div>}
          </div>
        </div>
      </Card>;
    })}</div>
  </div>;
}

// FEATURE 8: Bird's Eye Admin Dashboard
function BirdsEyePage({ tasks, team, timers, getTS, isMob, sessions, anomalies }) {
  var users = Object.keys(team).filter(function(u) { return team[u].role !== "admin"; });
  var liveNow = tasks.filter(function(t) { return timers[t.id] && timers[t.id].running; });
  var overdueTasks = tasks.filter(function(t) { return isOv(t); }).sort(function(a, b) { return a.deadline < b.deadline ? -1 : 1; });
  var urgentTasks = tasks.filter(function(t) { return t.priority === "Urgent" && t.status !== "Done"; });
  var reviewTasks = tasks.filter(function(t) { return t.status === "Review"; });
  var noAssignee = tasks.filter(function(t) { return !t.assignee; });

  return <div>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
      {[
        { l: "LIVE", v: liveNow.length, c: "#DC2626" },
        { l: "URGENT", v: urgentTasks.length, c: "#EA580C" },
        { l: "OVERDUE", v: overdueTasks.length, c: "#DC2626" },
        { l: "REVIEW", v: reviewTasks.length, c: "#D97706" },
        { l: "ANOMALII", v: (anomalies || []).length, c: "#7C3AED" },
      ].map(function(s) { return <Card key={s.l} style={{ borderTop: "3px solid " + s.c, textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 800, color: s.c }}>{s.v}</div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1 }}>{s.l}</div></Card>; })}
    </div>

    {/* User status grid */}
    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Status Echipa (Real-time)</h3>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 8, marginBottom: 24 }}>
      {users.map(function(u) {
        var m = team[u];
        var ut = tasks.filter(function(t) { return t.assignee === u; });
        var lss = sessions[u]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000;
        var live = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; });
        var ovd = ut.filter(function(t) { return isOv(t); });
        var inProg = ut.filter(function(t) { return t.status === "In Progress"; });
        var done = ut.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD; });
        return <div key={u} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid " + (on ? GR + "40" : "#E2E8F0"), background: on ? "#F0FDF4" : "#F8FAFC", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}><Av color={m.color} size={36}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
            <div style={{ display: "flex", gap: 6, fontSize: 10, marginTop: 3 }}>
              {live.length > 0 && <Badge bg="#FEF2F2" color="#DC2626">{live.length} live</Badge>}
              {inProg.length > 0 && <Badge bg="#EFF6FF" color="#2563EB">{inProg.length} activ</Badge>}
              {done.length > 0 && <Badge bg="#ECFDF5" color={GR}>{done.length} done azi</Badge>}
              {ovd.length > 0 && <Badge bg="#FEF2F2" color="#DC2626">{ovd.length} ovd</Badge>}
            </div>
            {live.length > 0 && <div style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{live[0].title} - {ft(getTS(live[0].id))}</div>}
          </div>
        </div>;
      })}
    </div>

    {/* Overdue table */}
    {overdueTasks.length > 0 && <Card style={{ marginBottom: 16 }}><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#DC2626" }}>Intarziate ({overdueTasks.length})</h3>{overdueTasks.slice(0, 10).map(function(t) { var a = team[t.assignee] || {}; var daysLate = Math.floor((Date.now() - new Date(t.deadline).getTime()) / 86400000); return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #FEF2F2", fontSize: 12 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", flexShrink: 0 }} /><span style={{ flex: 1, fontWeight: 500 }}>{t.title}</span>{a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color} size={16} fs={8}>{a.name[0]}</Av>{a.name}</span>}<Badge bg="#FEF2F2" color="#DC2626">{daysLate}z intarziere</Badge>{t.shop && <Badge bg="#F1F5F9" color="#475569">{t.shop}</Badge>}</div>; })}</Card>}

    {/* Urgent tasks */}
    {urgentTasks.length > 0 && <Card style={{ marginBottom: 16 }}><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#EA580C" }}>Urgent ({urgentTasks.length})</h3>{urgentTasks.slice(0, 8).map(function(t) { var a = team[t.assignee] || {}; return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #FFF7ED", fontSize: 12 }}><span style={{ flex: 1, fontWeight: 500 }}>{t.title}</span>{a.name && <span>{a.name}</span>}<Badge bg="#FFF7ED" color="#EA580C">{t.status}</Badge>{t.shop && <span style={{ fontSize: 10, color: GR }}>{t.shop}</span>}</div>; })}</Card>}

    {/* Review tasks */}
    {reviewTasks.length > 0 && <Card><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#D97706" }}>Asteapta Review ({reviewTasks.length})</h3>{reviewTasks.map(function(t) { var a = team[t.assignee] || {}; return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #FFFBEB", fontSize: 12 }}><span style={{ flex: 1, fontWeight: 500 }}>{t.title}</span>{a.name && <span>{a.name}</span>}{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}</div>; })}</Card>}
  </div>;
}

function ProfileView({ pu, team, tasks, timers, getTS, logs, sessions, getPerf, range, setRange, onBack, isMob, statusHistory, achievements, loginHistory }) {
  var m = team[pu]; if (!m) return null;
  var ut = tasks.filter(function(t) { return t.assignee === pu; });
  var lss = sessions[pu]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000;
  var perf = getPerf(pu);
  var uLogs = logs.filter(function(l) { return l.user === pu; }).slice(0, 50);
  var actNow = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; });
  var userAch = (achievements[pu] || []).map(function(id) { return ACHIEVEMENTS.find(function(a) { return a.id === id; }); }).filter(Boolean);
  var userLoginHist = (loginHistory || []).filter(function(l) { return l.userId === pu; }).slice(0, 10);
  var filt = ut.filter(function(t) { if (range === "all") return true; if (range === "today") return isTd(t.deadline) || isTd(t.createdAt); if (range === "week") return new Date(t.createdAt || t.deadline || 0).getTime() > Date.now() - 7 * 86400000; if (range === "month") return new Date(t.createdAt || t.deadline || 0).getTime() > Date.now() - 30 * 86400000; return true; });
  return <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: isMob ? 16 : 32 }}>
    <button style={Object.assign({}, S.cancelBtn, { marginBottom: 20, display: "flex", alignItems: "center", gap: 6 })} onClick={onBack}><Ic d={Icons.back} size={16} color="#64748B" /> Inapoi</button>
    <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}><div style={{ position: "relative" }}><Av color={m.color} size={56} fs={22}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2.5px solid #fff" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 20, fontWeight: 700 }}>{m.name}</div><div style={{ fontSize: 12, color: "#94A3B8" }}>{m.role === "pm" ? "PM" : m.role} | {on ? "Online" : "Offline - " + fr(lss)}</div></div><div style={{ textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 700, color: perf.score >= 70 ? GR : perf.score >= 40 ? "#D97706" : "#DC2626" }}>{perf.score}%</div><div style={{ fontSize: 10, color: "#94A3B8" }}>Performance</div></div><div style={{ display: "flex", gap: 8 }}>{[{ l: "Done", v: perf.done, c: GR }, { l: "Active", v: perf.active, c: "#2563EB" }, { l: "Review", v: perf.review, c: "#D97706" }, { l: "Overdue", v: perf.overdue, c: "#DC2626" }].map(function(x) { return <div key={x.l} style={{ textAlign: "center", padding: "4px 12px", background: x.c + "12", borderRadius: 8 }}><div style={{ fontSize: 18, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 9, color: "#94A3B8" }}>{x.l}</div></div>; })}</div></Card>
    {/* Achievements */}
    {userAch.length > 0 && <Card style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Achievements ({userAch.length}/{ACHIEVEMENTS.length})</h3><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{userAch.map(function(a) { return <div key={a.id} title={a.desc} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 12px", background: "#F0FDF4", borderRadius: 10, border: "1px solid " + GR + "30" }}><span style={{ fontSize: 24 }}>{a.icon}</span><span style={{ fontSize: 10, fontWeight: 600, marginTop: 4, color: GR }}>{a.name}</span></div>; })}</div></Card>}
    {/* Login history */}
    {userLoginHist.length > 0 && <Card style={{ marginBottom: 16 }}><h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Ultimele login-uri</h3>{userLoginHist.map(function(l) { return <div key={l.id} style={{ display: "flex", gap: 10, fontSize: 11, padding: "4px 0", borderBottom: "1px solid #F8FAFC", color: "#64748B" }}><span style={{ minWidth: 140 }}>{ff(l.time)}</span><span>{l.name}</span></div>; })}</Card>}
    {actNow.length > 0 && <Card style={{ marginBottom: 16, borderLeft: "3px solid #DC2626" }}><h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#DC2626" }}>Lucreaza acum</h3>{actNow.map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12 }}><span style={{ fontWeight: 600 }}>{t.title}</span>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}<span style={{ marginLeft: "auto", fontWeight: 700, color: "#DC2626" }}>{ft(getTS(t.id))}</span></div>; })}</Card>}
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>{[{ id: "all", l: "Toate" }, { id: "today", l: "Azi" }, { id: "week", l: "7 zile" }, { id: "month", l: "30 zile" }].map(function(r) { return <button key={r.id} onClick={function() { setRange(r.id); }} style={Object.assign({}, S.chip, { background: range === r.id ? GR : "#F1F5F9", color: range === r.id ? "#fff" : "#475569", fontWeight: range === r.id ? 600 : 400 })}>{r.l}</button>; })}</div>
    <Card><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Taskuri ({filt.length})</h3>{filt.length === 0 ? <div style={{ color: "#94A3B8", padding: 16, textAlign: "center" }}>Niciun task.</div> : filt.map(function(t) { return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F8FAFC", flexWrap: "wrap", background: SBG[t.status], borderRadius: 6, paddingLeft: 8, marginBottom: 2 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: SC[t.status] }} /><span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{t.title}</span><Badge bg={SC[t.status] + "18"} color={SC[t.status]}>{t.status}</Badge>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}</div>; })}</Card>
    <Card style={{ marginTop: 16 }}><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Activitate</h3>{uLogs.length === 0 ? <div style={{ color: "#94A3B8", padding: 16, textAlign: "center" }}>Nicio activitate.</div> : uLogs.map(function(l) { return <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F8FAFC", fontSize: 12 }}><span style={{ color: "#CBD5E1", minWidth: 100 }}>{ff(l.time)}</span><span style={{ fontWeight: 600, color: "#64748B" }}>{l.action}</span><span style={{ color: "#94A3B8" }}>{l.detail}</span></div>; })}</Card>
  </div>;
}

function TRow({ t, user, team, onEdit, onView, onDel, onDup, onChgSt, isMob, secs, running, togTimer, bulkMode, isSelected, toggleSel, canEdit, canDelete, onExplode, allTasks }) {
  var me = team[user] || {}; var a = team[t.assignee] || {}; var ov = isOv(t); var can = me.role === "admin" || me.role === "pm" || t.assignee === user;
  var doneS = (t.subtasks || []).filter(function(s) { return s.done; }).length; var totalS = (t.subtasks || []).length;
  var isAdminTask = t.createdBy === "admin";
  var hasChildren = allTasks && allTasks.some(function(x) { return x._campaignParentId === t.id; });
  var needsExplode = t.campaignItems && t.campaignItems.length > 0 && !hasChildren && !t._campaignParent;
  // FEATURE 9: block edit badge
  var isDone = t.status === "Done";
  var canEditThis = (canEdit || me.role === "admin") && !(isDone && me.role !== "admin");
  if (isAdminTask) return <div style={{ marginBottom: 10, marginTop: 4 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, paddingLeft: 2 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: GR, animation: "pulse 2s infinite" }} /><span style={{ fontSize: 10, fontWeight: 700, color: GR, letterSpacing: 1, textTransform: "uppercase" }}>Task de la Stan</span></div><Card style={{ display: "flex", flexDirection: isMob ? "column" : "row", alignItems: isMob ? "stretch" : "center", gap: 10, marginBottom: 0, borderLeft: "5px solid " + GR, borderTop: "2px solid " + GR + "60", background: "linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)", boxShadow: "0 4px 16px rgba(12,126,62,0.18), 0 1px 4px rgba(12,126,62,0.1)" }}>
  {bulkMode && <input type="checkbox" checked={isSelected} onChange={function() { if (toggleSel) toggleSel(t.id); }} style={{ width: 18, height: 18, accentColor: GR }} />}
  {!bulkMode && can && <button style={Object.assign({}, S.stDot, { color: SC[t.status], background: SC[t.status] + "12", border: "1.5px solid " + SC[t.status] + "40" })} onClick={function() { var i = STATUSES.indexOf(t.status); onChgSt(t.id, STATUSES[(i + 1) % STATUSES.length]); }}>{SI[t.status]}</button>}
  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={function() { if (onView) onView(t); }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</span><Badge bg={GR} color="#fff">STAN</Badge><Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>{t.platform && <Badge bg="#F1F5F9" color="#475569">{t.platform}</Badge>}{t.taskType && <Badge bg="#F5F3FF" color="#7C3AED">{t.taskType}</Badge>}{t.department && <Badge bg="#FFF7ED" color="#EA580C">{t.department}</Badge>}{t.campaignItems && t.campaignItems.length > 0 && <Badge bg="#F0FDF4" color={GR}>{t.campaignItems.length} produse</Badge>}{t.recurring && <Badge bg="#ECFDF5" color={GR}><Ic d={Icons.recur} size={8} color={GR} /></Badge>}{ov && <Badge bg="#FEF2F2" color="#DC2626">INTARZIAT</Badge>}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94A3B8", flexWrap: "wrap" }}>{a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={16} fs={8}>{a.name[0]}</Av>{a.name}</span>}{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}{t.productName && <Badge bg="#EFF6FF" color="#2563EB">{t.productName}</Badge>}{t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}{t.links && t.links.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Ic d={Icons.link} size={10} color="#94A3B8" /> {t.links.length}</span>}{totalS > 0 && <span><Ic d={Icons.check} size={10} color="#94A3B8" /> {doneS}/{totalS}</span>}</div>
    {t.description && <div style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isMob ? "100%" : 400, marginBottom: 3 }}>{t.description}</div>}
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
    {can && t.status !== "Done" && <button onClick={togTimer} style={Object.assign({}, S.timerBtn, { background: running ? "#FEF2F2" : "#F8FAFC", color: running ? "#DC2626" : GR, borderColor: running ? "#FECACA" : "#E2E8F0" })}><Ic d={running ? Icons.stop : Icons.play} size={12} color={running ? "#DC2626" : GR} />{secs > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{ft(secs)}</span>}</button>}
    {t.status === "Done" && secs > 0 && <span style={{ fontSize: 11, color: "#94A3B8" }}>{ft(secs)}</span>}
    <select style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 6px" })} value={t.status} onChange={function(e) { onChgSt(t.id, e.target.value); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
    {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onClick={function() { onDup(t); }}><Ic d={Icons.copy} size={14} color="#94A3B8" /></button>}
    {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onClick={function() { onEdit(t); }}><Ic d={Icons.edit} size={14} color="#94A3B8" /></button>}
    {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) onDel(t.id); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
  </div>
</Card></div>;
  return <Card style={{ display: "flex", flexDirection: isMob ? "column" : "row", alignItems: isMob ? "stretch" : "center", gap: 10, marginBottom: 6, borderLeft: "3px solid " + (ov ? "#EF4444" : SC[t.status] || "#E2E8F0"), background: ov ? "#FFFBFB" : SBG[t.status] || "#fff", boxShadow: "none" }}>
    {bulkMode && <input type="checkbox" checked={isSelected} onChange={function() { if (toggleSel) toggleSel(t.id); }} style={{ width: 18, height: 18, accentColor: GR }} />}
    {!bulkMode && can && <button style={Object.assign({}, S.stDot, { color: SC[t.status], background: SC[t.status] + "12", border: "1.5px solid " + SC[t.status] + "40" })} onClick={function() { var i = STATUSES.indexOf(t.status); onChgSt(t.id, STATUSES[(i + 1) % STATUSES.length]); }}>{SI[t.status]}</button>}
    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={function() { if (onView) onView(t); }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</span>
        {t.createdBy === "admin" && <Badge bg="#0C7E3E" color="#fff">STAN</Badge>}
        <Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>
        {t.platform && <Badge bg="#F1F5F9" color="#475569">{t.platform}</Badge>}
        {t.taskType && <Badge bg="#F5F3FF" color="#7C3AED">{t.taskType}</Badge>}
        {t.department && <Badge bg="#FFF7ED" color="#EA580C">{t.department}</Badge>}
        {(t.tags || []).map(function(tag) { return <Badge key={tag} bg="#F0FDF4" color={GR}>#{tag}</Badge>; })}
        {t.campaignItems && t.campaignItems.length > 0 && <Badge bg="#F0FDF4" color={GR}>{t.campaignItems.length} prod</Badge>}
        {isDone && me.role !== "admin" && <Badge bg="#F8FAFC" color="#94A3B8"><Ic d={Icons.lock} size={8} color="#94A3B8" /> Blocat</Badge>}
        {ov && <Badge bg="#FEF2F2" color="#DC2626">INTARZIAT</Badge>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94A3B8", flexWrap: "wrap" }}>{a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={16} fs={8}>{a.name[0]}</Av>{a.name}</span>}{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}{t.productName && <Badge bg="#EFF6FF" color="#2563EB">{t.productName}</Badge>}{t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}{t.links && t.links.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Ic d={Icons.link} size={10} color="#94A3B8" /> {t.links.length}</span>}{totalS > 0 && <span><Ic d={Icons.check} size={10} color="#94A3B8" /> {doneS}/{totalS}</span>}</div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      {needsExplode && onExplode && <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1.5px solid " + GR, background: "#ECFDF5", color: GR, fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={function(e) { e.stopPropagation(); if (confirm("Creezi " + t.campaignItems.length + " taskuri individuale din acest campaign?")) onExplode(t); }}>⚡ Split {t.campaignItems.length}</button>}
      {can && t.status !== "Done" && <button onClick={togTimer} style={Object.assign({}, S.timerBtn, { background: running ? "#FEF2F2" : "#F8FAFC", color: running ? "#DC2626" : GR, borderColor: running ? "#FECACA" : "#E2E8F0" })}><Ic d={running ? Icons.stop : Icons.play} size={12} color={running ? "#DC2626" : GR} />{secs > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{ft(secs)}</span>}</button>}
      {t.status === "Done" && secs > 0 && <span style={{ fontSize: 11, color: "#94A3B8" }}>{ft(secs)}</span>}
      <select style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 6px" })} value={t.status} onChange={function(e) { onChgSt(t.id, e.target.value); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
      {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onClick={function() { onDup(t); }}><Ic d={Icons.copy} size={14} color="#94A3B8" /></button>}
      {canEditThis && <button style={S.iconBtn} onClick={function() { onEdit(t); }}><Ic d={Icons.edit} size={14} color="#94A3B8" /></button>}
      {(me.role === "admin" || canDelete) && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) onDel(t.id); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
    </div>
  </Card>;
}

function TasksPage({ fProps, grouped, filtered, user, team, onEdit, onView, onDel, onDup, onChgSt, isMob, timers, getTS, togTimer, bulkMode, selectedTasks, toggleSel, canEdit, canDelete, onExplode, tasks }) {
  var st = fProps.stats;
  var statusGroups = useMemo(function() {
    var groups = {};
    var sortAdminFirst = function(arr) { return arr.sort(function(a, b) { var aA = a.createdBy === "admin" ? 0 : 1; var bA = b.createdBy === "admin" ? 0 : 1; return aA - bA; }); };
    var urgent = filtered.filter(function(t) { return t.priority === "Urgent" && t.status !== "Done"; });
    var rest = filtered.filter(function(t) { return !(t.priority === "Urgent" && t.status !== "Done"); });
    groups["Urgent"] = sortAdminFirst(urgent);
    STATUSES.forEach(function(s) { groups[s] = sortAdminFirst(rest.filter(function(t) { return t.status === s; })); });
    return groups;
  }, [filtered]);

  return <div>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>{[{ l: "Total", v: st.total, c: "#475569", i: Icons.tasks }, { l: "Azi", v: st.today, c: "#2563EB", i: Icons.work }, { l: "In Progress", v: st.inProg, c: "#D97706", i: Icons.work }, { l: "Intarziate", v: st.overdue, c: "#DC2626", i: Icons.work }, { l: "Finalizate", v: st.done, c: GR, i: Icons.tasks }].map(function(s) { return <Card key={s.l} style={{ display: "flex", alignItems: "center", gap: 12, background: s.c + "08" }}><div style={{ width: 40, height: 40, borderRadius: 10, background: s.c + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d={s.i} size={20} color={s.c} /></div><div><div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, color: s.c + "99" }}>{s.l}</div></div></Card>; })}</div>
    <FiltersBar {...fProps} />
    {statusGroups["Urgent"].length > 0 && <div style={{ marginBottom: 20 }}>
      <div style={Object.assign({}, S.groupHdr, { color: "#DC2626" })}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite" }} />URGENT</span><span style={S.countBadge}>{statusGroups["Urgent"].length}</span></div>
      {statusGroups["Urgent"].map(function(t) { return <TRow key={t.id} t={t} user={user} team={team} onEdit={onEdit} onView={onView} onDel={onDel} onDup={onDup} onChgSt={onChgSt} isMob={isMob} secs={getTS(t.id)} running={timers[t.id] && timers[t.id].running} togTimer={function() { togTimer(t.id); }} bulkMode={bulkMode} isSelected={selectedTasks && selectedTasks.includes(t.id)} toggleSel={toggleSel} canEdit={canEdit} canDelete={canDelete} onExplode={onExplode} allTasks={tasks} />; })}
    </div>}
    {["In Progress", "Review", "To Do", "Done"].map(function(status) {
      var sectionTasks = statusGroups[status];
      if (!sectionTasks || sectionTasks.length === 0) return null;
      return <div key={status} style={{ marginBottom: 20 }}>
        <div style={Object.assign({}, S.groupHdr, { borderLeft: "3px solid " + SC[status], paddingLeft: 10 })}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: SC[status] }} />{status}</span><span style={S.countBadge}>{sectionTasks.length}</span></div>
        {sectionTasks.map(function(t) { return <TRow key={t.id} t={t} user={user} team={team} onEdit={onEdit} onView={onView} onDel={onDel} onDup={onDup} onChgSt={onChgSt} isMob={isMob} secs={getTS(t.id)} running={timers[t.id] && timers[t.id].running} togTimer={function() { togTimer(t.id); }} bulkMode={bulkMode} isSelected={selectedTasks && selectedTasks.includes(t.id)} toggleSel={toggleSel} canEdit={canEdit} canDelete={canDelete} onExplode={onExplode} allTasks={tasks} />; })}
      </div>;
    })}
    {filtered.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Niciun task.</Card>}
  </div>;
}

function KanbanPage({ fProps, tasks, user, team, onEdit, onDel, onDup, onChgSt, dragId, setDragId, handleDrop, isMob, timers, getTS, togTimer }) {
  var [dropTarget, setDropTarget] = useState(null);
  var dragIdRef = useRef(null);

  var onDragStartCard = function(e, tid) {
    dragIdRef.current = tid;
    setDragId(tid);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", tid);
  };
  var onDragEndCard = function() {
    dragIdRef.current = null;
    setDragId(null);
    setDropTarget(null);
  };
  var onDropCol = function(e, st) {
    e.preventDefault();
    e.stopPropagation();
    var tid = dragIdRef.current || e.dataTransfer.getData("text/plain");
    setDropTarget(null);
    if (tid) { onChgSt(tid, st); dragIdRef.current = null; setDragId(null); }
  };

  return <div>
    <FiltersBar {...fProps} noStatus />
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(4,1fr)", gap: 14, alignItems: "start" }}>
      {STATUSES.map(function(st) {
        var col = tasks.filter(function(t) { return t.status === st; });
        var isOver = dropTarget === st;
        return <div key={st}
          onDragOver={function(e) { e.preventDefault(); e.stopPropagation(); if (dropTarget !== st) setDropTarget(st); }}
          onDragLeave={function(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null); }}
          onDrop={function(e) { onDropCol(e, st); }}
          style={{ background: isOver ? SC[st] + "15" : "#FAFBFC", borderRadius: 12, padding: 12, minHeight: 500, border: "2px solid " + (isOver ? SC[st] : "transparent"), transition: "all 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: SC[st] }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{st}</span>
            </div>
            <span style={S.countBadge}>{col.length}</span>
          </div>
          {col.map(function(t) {
            var a = team[t.assignee] || {};
            var ov = isOv(t);
            var secs = getTS(t.id);
            var run = timers[t.id] && timers[t.id].running;
            var me2 = team[user] || {};
            var canEdit2 = me2.role === "admin" || me2.role === "pm" || t.assignee === user;
            return <div key={t.id}
              draggable={true}
              onDragStart={function(e) { onDragStartCard(e, t.id); }}
              onDragEnd={onDragEndCard}
              onDragOver={function(e) { e.preventDefault(); if (dropTarget !== st) setDropTarget(st); }}
              onDrop={function(e) { onDropCol(e, st); }}
              style={{ opacity: dragId === t.id ? 0.35 : 1, marginBottom: 8, transform: dragId === t.id ? "rotate(2deg)" : "none", transition: "opacity 0.15s, transform 0.15s" }}>
              <Card style={{ padding: 12, cursor: "grab", borderLeft: "3px solid " + (ov ? "#EF4444" : SC[st]), background: SBG[st] }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t.title}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  <Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>
                  {(t.tags || []).map(function(tag) { return <Badge key={tag} bg="#F0FDF4" color={GR}>#{tag}</Badge>; })}
                  {t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}
                  {ov && <Badge bg="#FEF2F2" color="#DC2626">INTARZIAT</Badge>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#94A3B8" }}>
                  {a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={18} fs={9}>{a.name[0]}</Av>{a.name}</span>}
                  {t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
                  {st !== "Done"
                    ? <button onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); togTimer(t.id); }} style={Object.assign({}, S.timerBtn, { fontSize: 10, padding: "2px 8px", background: run ? "#FEF2F2" : "#F8FAFC", color: run ? "#DC2626" : GR, borderColor: run ? "#FECACA" : "#E2E8F0" })}>
                        <Ic d={run ? Icons.stop : Icons.play} size={10} color={run ? "#DC2626" : GR} />
                        {secs > 0 && <span>{ft(secs)}</span>}
                      </button>
                    : <span style={{ fontSize: 10, color: "#94A3B8" }}>{secs > 0 ? ft(secs) : ""}</span>
                  }
                  <div style={{ display: "flex", gap: 2 }}>
                    {canEdit2 && <button onMouseDown={function(e) { e.stopPropagation(); }} style={S.iconBtn} onClick={function(e) { e.stopPropagation(); onDup(t); }}><Ic d={Icons.copy} size={12} color="#94A3B8" /></button>}
                    {canEdit2 && <button onMouseDown={function(e) { e.stopPropagation(); }} style={S.iconBtn} onClick={function(e) { e.stopPropagation(); onEdit(t); }}><Ic d={Icons.edit} size={12} color="#94A3B8" /></button>}
                  </div>
                </div>
              </Card>
            </div>;
          })}
        </div>;
      })}
    </div>
  </div>;
}

function CalendarPage({ tasks, user, team, calDate, setCalDate, onView, isMob, me }) {
  var y = calDate.getFullYear(), m = calDate.getMonth(); var dim = new Date(y, m + 1, 0).getDate(); var fd1 = new Date(y, m, 1).getDay(); var today = new Date();
  var myTasks = me.role === "member" ? tasks.filter(function(t) { return t.assignee === user; }) : tasks;
  var days = []; for (var i = 0; i < (fd1 === 0 ? 6 : fd1 - 1); i++) days.push(null); for (var i2 = 1; i2 <= dim; i2++) days.push(i2);
  var mNames = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  return <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><button style={S.cancelBtn} onClick={function() { setCalDate(new Date(y, m - 1, 1)); }}>Prev</button><span style={{ fontSize: 16, fontWeight: 700 }}>{mNames[m]} {y}</span><button style={S.cancelBtn} onClick={function() { setCalDate(new Date(y, m + 1, 1)); }}>Next</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>{["Lun", "Mar", "Mie", "Joi", "Vin", "Sam", "Dum"].map(function(d) { return <div key={d} style={{ textAlign: "center", fontWeight: 700, fontSize: 11, padding: 6, color: "#94A3B8" }}>{d}</div>; })}{days.map(function(day, i) { if (!day) return <div key={"e" + i} />; var dateStr = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0"); var dayTasks = myTasks.filter(function(t) { return t.deadline === dateStr; }); var isToday2 = today.getFullYear() === y && today.getMonth() === m && today.getDate() === day; return <div key={day} style={{ padding: 4, minHeight: isMob ? 50 : 80, border: "1px solid hsl(214,18%,90%)", borderRadius: 4, background: isToday2 ? GR + "12" : "#fff", fontSize: 11 }}><div style={{ fontWeight: isToday2 ? 700 : 400, marginBottom: 2, fontSize: 12, color: isToday2 ? GR : "#475569" }}>{day}</div>{dayTasks.slice(0, 3).map(function(t) { return <div key={t.id} style={{ fontSize: 10, padding: "1px 4px", borderRadius: 3, marginBottom: 1, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: t.status === "Done" ? GR + "18" : isOv(t) ? "#FEF2F2" : "#EFF6FF", color: t.status === "Done" ? GR : isOv(t) ? "#DC2626" : "#2563EB" }} onClick={function() { onView(t); }}>{t.title}</div>; })}{dayTasks.length > 3 && <div style={{ fontSize: 9, color: "#94A3B8" }}>+{dayTasks.length - 3}</div>}</div>; })}</div></div>;
}

// FEATURE 10: Achievements Page
function AchievementsPage({ achievements, team, visUsers, tasks, isMob }) {
  var users = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; });
  return <div>
    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Achievements Echipa</h3>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
      {users.map(function(u) {
        var m = team[u]; if (!m) return null;
        var userAch = (achievements[u] || []).map(function(id) { return ACHIEVEMENTS.find(function(a) { return a.id === id; }); }).filter(Boolean);
        var missing = ACHIEVEMENTS.filter(function(a) { return !(achievements[u] || []).includes(a.id); });
        var doneCount = tasks.filter(function(t) { return t.assignee === u && t.status === "Done"; }).length;
        return <Card key={u}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Av color={m.color} size={36}>{m.name[0]}</Av>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{userAch.length}/{ACHIEVEMENTS.length} achievements | {doneCount} taskuri done</div></div>
          </div>
          <div style={S.progBg}><div style={S.progBar(GR, (userAch.length / ACHIEVEMENTS.length) * 100)} /></div>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ACHIEVEMENTS.map(function(ach) {
              var earned = (achievements[u] || []).includes(ach.id);
              return <div key={ach.id} title={ach.desc + (earned ? " ✓" : " - Nu inca")} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 10px", borderRadius: 8, border: "1px solid " + (earned ? GR + "40" : "#E2E8F0"), background: earned ? "#F0FDF4" : "#F8FAFC", opacity: earned ? 1 : 0.4, transition: "all 0.2s" }}>
                <span style={{ fontSize: 20 }}>{ach.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600, marginTop: 3, color: earned ? GR : "#94A3B8", textAlign: "center", maxWidth: 60 }}>{ach.name}</span>
              </div>;
            })}
          </div>
        </Card>;
      })}
    </div>
  </div>;
}

// FEATURE 14: Announcement Board
function AnnouncePage({ announcements, setAnnouncements, isAdmin, user, team }) {
  var [showForm, setShowForm] = useState(false);
  var [form, setForm] = useState({ title: "", body: "", public: false, priority: "Normal" });
  var save = function() { if (!form.title.trim() || !form.body.trim()) return; var ann = Object.assign({}, form, { id: gid(), createdBy: user, createdAt: ts(), readBy: [user] }); setAnnouncements(function(p) { return [ann].concat(p); }); setShowForm(false); setForm({ title: "", body: "", public: false, priority: "Normal" }); };
  var markRead = function(id) { setAnnouncements(function(p) { return p.map(function(a) { return a.id === id ? Object.assign({}, a, { readBy: (a.readBy || []).concat([user]) }) : a; }); }); };
  var myUnread = announcements.filter(function(a) { return !a.readBy || !a.readBy.includes(user); });

  return <div style={{ maxWidth: 700 }}>
    {isAdmin && <div style={{ marginBottom: 16 }}>
      <button style={S.primBtn} onClick={function() { setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> Anunt nou</button>
    </div>}
    {showForm && <Card style={{ marginBottom: 16 }}>
      <label style={S.label}>Titlu</label><input style={S.input} value={form.title} onChange={function(e) { setForm(Object.assign({}, form, { title: e.target.value })); }} />
      <label style={S.label}>Mesaj</label><textarea style={S.ta} value={form.body} onChange={function(e) { setForm(Object.assign({}, form, { body: e.target.value })); }} />
      <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><input type="checkbox" checked={form.public} onChange={function(e) { setForm(Object.assign({}, form, { public: e.target.checked })); }} /> Vizibil pe login</label>
        <select style={S.fSel} value={form.priority} onChange={function(e) { setForm(Object.assign({}, form, { priority: e.target.value })); }}><option>Normal</option><option>Important</option><option>Urgent</option></select>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={save}>Publica</button><button style={S.cancelBtn} onClick={function() { setShowForm(false); }}>Anuleaza</button></div>
    </Card>}
    {myUnread.length > 0 && <div style={{ marginBottom: 16, padding: "8px 12px", background: "#EFF6FF", borderRadius: 8, fontSize: 12, color: "#1E40AF" }}>{myUnread.length} anunturi necitite</div>}
    {announcements.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 30 }}>Niciun anunt.</Card>}
    {announcements.map(function(a) {
      var isRead = a.readBy && a.readBy.includes(user);
      var author = team[a.createdBy] || {};
      var pColors = { Urgent: "#DC2626", Important: "#D97706", Normal: "#2563EB" };
      var pColor = pColors[a.priority] || "#2563EB";
      return <Card key={a.id} style={{ marginBottom: 10, borderLeft: "3px solid " + pColor, opacity: isRead ? 0.75 : 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{a.title}</span>
              <Badge bg={pColor + "18"} color={pColor}>{a.priority}</Badge>
              {a.public && <Badge bg="#F0FDF4" color={GR}>Login</Badge>}
              {!isRead && <Badge bg="#EFF6FF" color="#2563EB">Nou</Badge>}
            </div>
            <div style={{ fontSize: 13, color: "#1E293B", marginBottom: 8 }}>{a.body}</div>
            <div style={{ fontSize: 10, color: "#94A3B8" }}>{author.name || "?"} | {ff(a.createdAt)} | Citit de {(a.readBy || []).length}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {!isRead && <button style={S.primBtn} onClick={function() { markRead(a.id); }}>Citit</button>}
            {isAdmin && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) setAnnouncements(function(p) { return p.filter(function(x) { return x.id !== a.id; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
          </div>
        </div>
      </Card>;
    })}
  </div>;
}

// FEATURE 11: Daily Challenge
function ChallengePage({ dailyChallenge, setDailyChallenge, isAdmin, team, tasks, user, visUsers }) {
  var [form, setForm] = useState({ title: "", target: 5, description: "" });
  var todayDone = tasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD; });
  var save = function() { if (!form.title.trim()) return; setDailyChallenge(Object.assign({}, form, { id: gid(), date: TD, createdBy: user, createdAt: ts(), completedBy: null })); };
  var dc = dailyChallenge && dailyChallenge.date === TD ? dailyChallenge : null;

  return <div style={{ maxWidth: 700 }}>
    {dc ? <Card style={{ marginBottom: 20, borderLeft: "3px solid " + (dc.completedBy ? GR : "#D97706") }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 32 }}>⚡</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 18, fontWeight: 700 }}>{dc.title}</div><div style={{ fontSize: 12, color: "#64748B" }}>{dc.description || "Completeaza " + dc.target + " taskuri azi"}</div></div>
        {dc.completedBy && <Badge bg="#ECFDF5" color={GR}>✓ {(team[dc.completedBy] || {}).name}</Badge>}
      </div>
      <div style={{ fontSize: 13, marginBottom: 8 }}>Target: {dc.target} taskuri Done azi</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 8 }}>
        {visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) {
          var m = team[u]; if (!m) return null;
          var uDone = todayDone.filter(function(t) { return t.assignee === u; }).length;
          var pct = dc.target > 0 ? Math.min(100, (uDone / dc.target) * 100) : 0;
          return <div key={u} style={{ padding: "10px 12px", borderRadius: 8, background: pct >= 100 ? "#ECFDF5" : "#F8FAFC", border: "1px solid " + (pct >= 100 ? GR + "40" : "#E2E8F0") }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><Av color={m.color} size={22} fs={9}>{m.name[0]}</Av><span style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}><span>{uDone}/{dc.target}</span><span style={{ fontWeight: 700, color: pct >= 100 ? GR : "#94A3B8" }}>{Math.round(pct)}%</span></div>
            <div style={S.progBg}><div style={S.progBar(pct >= 100 ? GR : "#D97706", pct)} /></div>
          </div>;
        })}
      </div>
      {isAdmin && <button style={Object.assign({}, S.cancelBtn, { marginTop: 12, fontSize: 11 })} onClick={function() { setDailyChallenge(null); }}>Reset Challenge</button>}
    </Card> : <Card style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Niciun challenge azi.</Card>}
    {isAdmin && !dc && <Card><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Seteaza Daily Challenge</h3>
      <label style={S.label}>Titlu</label><input style={S.input} value={form.title} onChange={function(e) { setForm(Object.assign({}, form, { title: e.target.value })); }} placeholder="Ex: Ziua de foc - 10 Done!" />
      <label style={S.label}>Target (nr taskuri Done)</label><input style={S.input} type="number" min="1" value={form.target} onChange={function(e) { setForm(Object.assign({}, form, { target: parseInt(e.target.value) || 1 })); }} />
      <label style={S.label}>Descriere</label><input style={S.input} value={form.description} onChange={function(e) { setForm(Object.assign({}, form, { description: e.target.value })); }} placeholder="Optional" />
      <button style={Object.assign({}, S.primBtn, { marginTop: 12 })} onClick={save}><Ic d={Icons.challenge} size={14} color="#fff" /> Lanseaza Challenge</button>
    </Card>}
  </div>;
}

// FEATURE 7: Anomalies Page
function AnomaliesPage({ anomalies, team, tasks, isMob }) {
  var svColors = { high: "#DC2626", medium: "#D97706", low: "#94A3B8" };
  var typeLabels = { stuck_task: "Task Blocat", idle_user: "User Inactiv", overdue_spike: "Spike Intarzieri" };
  return <div style={{ maxWidth: 700 }}>
    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
      {[{ l: "Critical", c: "#DC2626", sv: "high" }, { l: "Mediu", c: "#D97706", sv: "medium" }, { l: "Scazut", c: "#94A3B8", sv: "low" }].map(function(b) {
        var n = anomalies.filter(function(a) { return a.severity === b.sv; }).length;
        return <Card key={b.l} style={{ borderTop: "3px solid " + b.c, flex: 1 }}><div style={{ fontSize: 24, fontWeight: 700, color: b.c }}>{n}</div><div style={{ fontSize: 10, color: "#94A3B8" }}>{b.l}</div></Card>;
      })}
    </div>
    {anomalies.length === 0 && <Card style={{ textAlign: "center", color: GR, padding: 30 }}>✓ Nicio anomalie detectata. Totul e in regula.</Card>}
    {anomalies.map(function(a, i) {
      var sc = svColors[a.severity] || "#94A3B8";
      return <Card key={i} style={{ marginBottom: 8, borderLeft: "3px solid " + sc }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: sc }}>{typeLabels[a.type] || a.type}</div>
            <div style={{ fontSize: 13, color: "#1E293B", marginTop: 2 }}>{a.msg}</div>
          </div>
          <Badge bg={sc + "18"} color={sc}>{a.severity}</Badge>
        </div>
      </Card>;
    })}
    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 12 }}>Detectate automat. Actualizat la fiecare 5 minute.</div>
  </div>;
}

// FEATURE 12: Login History Page
function LoginHistoryPage({ loginHistory, team, isMob }) {
  var [filterUser, setFilterUser] = useState("all");
  var vis = loginHistory.filter(function(l) { return filterUser === "all" || l.userId === filterUser; });
  var users = Object.keys(team).filter(function(u) { return team[u].role !== "admin"; });
  return <div style={{ maxWidth: 800 }}>
    <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
      <select style={S.fSel} value={filterUser} onChange={function(e) { setFilterUser(e.target.value); }}><option value="all">Toti userii</option>{users.map(function(u) { return <option key={u} value={u}>{team[u].name}</option>; })}</select>
      <span style={{ fontSize: 12, color: "#94A3B8" }}>{vis.length} intrari</span>
    </div>
    <Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8, fontSize: 11, fontWeight: 700, color: "#94A3B8", padding: "6px 0", borderBottom: "1px solid #F1F5F9", marginBottom: 8 }}>
        <span>User</span><span>Timp</span><span>Data</span>
      </div>
      {vis.slice(0, 100).map(function(l) {
        var m = team[l.userId] || {};
        return <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8, fontSize: 12, padding: "8px 0", borderBottom: "1px solid #F8FAFC", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{m.color && <Av color={m.color} size={20} fs={9}>{m.name ? m.name[0] : "?"}</Av>}{m.name || l.userId}</span>
          <span style={{ color: "#64748B" }}>{new Date(l.time).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>
          <span style={{ color: "#94A3B8" }}>{ff(l.time)}</span>
        </div>;
      })}
      {vis.length === 0 && <div style={{ textAlign: "center", color: "#94A3B8", padding: 20 }}>Niciun login inregistrat.</div>}
    </Card>
  </div>;
}

function TargetsPage({ targets, setTargets, team, tasks, timers, canEdit, visUsers, taskTypes, departments }) {
  var [showForm, setShowForm] = useState(false);
  var [editId, setEditId] = useState(null);
  var [editForm, setEditForm] = useState({});
  var [form, setForm] = useState({ userId: "", metric: "all", target: 25, daysPerWeek: 5 });

  var metricOptions = [{ id: "all", l: "Toate taskurile" }].concat(
    (taskTypes || DEF_TASK_TYPES).map(function(t) { return { id: "type:" + t, l: "Tip: " + t }; }),
    (departments || DEF_DEPARTMENTS).map(function(d) { return { id: "dept:" + d, l: "Dept: " + d }; }),
    PLATFORMS.map(function(p) { return { id: "plat:" + p, l: "Platforma: " + p }; })
  );

  var normM = function(metric) {
    if (!metric || metric === "all") return "all";
    if (metric.startsWith("type:") || metric.startsWith("dept:") || metric.startsWith("plat:")) return metric;
    if ((taskTypes || DEF_TASK_TYPES).includes(metric)) return "type:" + metric;
    if ((departments || DEF_DEPARTMENTS).includes(metric)) return "dept:" + metric;
    if (PLATFORMS.includes(metric)) return "plat:" + metric;
    return "type:" + metric;
  };

  var calcDone = function(userId, metric) {
    var nm = normM(metric);
    return tasks.filter(function(t) {
      if (t.assignee !== userId || t.status !== "Done" || !t.updatedAt || ds(t.updatedAt) !== TD) return false;
      if (nm === "all") return true;
      if (nm.startsWith("type:") && t.taskType === nm.replace("type:", "")) return true;
      if (nm.startsWith("dept:") && t.department === nm.replace("dept:", "")) return true;
      if (nm.startsWith("plat:") && t.platform === nm.replace("plat:", "")) return true;
      return false;
    }).reduce(function(acc, t) {
      // Campaign tasks: count finalized products, not 1 per task
      return acc + (t._finalizedCount && t._finalizedCount > 0 ? t._finalizedCount : 1);
    }, 0);
  };

  var save = function() {
    if (!form.userId || !form.metric) return;
    setTargets(function(p) { return p.concat([Object.assign({}, form, { id: gid() })]); });
    setShowForm(false);
    setForm({ userId: "", metric: "all", target: 25, daysPerWeek: 5 });
  };

  var saveEdit = function(id) {
    setTargets(function(p) { return p.map(function(x) { return x.id === id ? Object.assign({}, x, editForm) : x; }); });
    setEditId(null);
  };

  return <div style={{ maxWidth: 800 }}>
    {canEdit && <div style={{ marginBottom: 16 }}>
      <button style={S.primBtn} onClick={function() { setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> Target nou</button>
    </div>}

    {showForm && <Card style={{ marginBottom: 16 }}>
      <div style={S.fRow}>
        <div style={S.fCol}><label style={S.label}>User</label><select style={S.fSelF} value={form.userId} onChange={function(e) { setForm(Object.assign({}, form, { userId: e.target.value })); }}><option value="">--</option>{visUsers.filter(function(u) { return u !== "admin"; }).map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name}</option>; })}</select></div>
        <div style={S.fCol}><label style={S.label}>Metric</label><select style={S.fSelF} value={form.metric} onChange={function(e) { setForm(Object.assign({}, form, { metric: e.target.value })); }}>{metricOptions.map(function(o) { return <option key={o.id} value={o.id}>{o.l}</option>; })}</select></div>
      </div>
      <div style={S.fRow}>
        <div style={S.fCol}><label style={S.label}>Target zilnic</label><input style={S.input} type="number" min="1" value={form.target} onChange={function(e) { setForm(Object.assign({}, form, { target: parseInt(e.target.value) || 1 })); }} /></div>
        <div style={S.fCol}><label style={S.label}>Zile/sapt</label><input style={S.input} type="number" min="1" max="7" value={form.daysPerWeek} onChange={function(e) { setForm(Object.assign({}, form, { daysPerWeek: parseInt(e.target.value) || 5 })); }} /></div>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={save}>Salveaza</button><button style={S.cancelBtn} onClick={function() { setShowForm(false); }}>Anuleaza</button></div>
    </Card>}

    {targets.map(function(tgt) {
      var u = team[tgt.userId]; if (!u) return null;
      var nm = normM(tgt.metric);
      var todayDone = calcDone(tgt.userId, tgt.metric);
      var pct = tgt.target > 0 ? (todayDone / tgt.target) * 100 : 0;
      var rem = Math.max(0, tgt.target - todayDone);
      var metricLabel = (metricOptions.find(function(o) { return o.id === nm; }) || {}).l || tgt.metric;
      var isEd = editId === tgt.id;

      // Build 14-day history
      var histDays = []; var totalExpected = 0; var totalActual = 0;
      for (var d = 13; d >= 0; d--) {
        var dt = new Date(); dt.setDate(dt.getDate() - d); var dStr = ds(dt);
        var dayDone = tasks.filter(function(t2) {
          if (t2.assignee !== tgt.userId || t2.status !== "Done" || !t2.updatedAt || ds(t2.updatedAt) !== dStr) return false;
          if (nm === "all") return true;
          if (nm.startsWith("type:") && t2.taskType === nm.replace("type:", "")) return true;
          if (nm.startsWith("dept:") && t2.department === nm.replace("dept:", "")) return true;
          if (nm.startsWith("plat:") && t2.platform === nm.replace("plat:", "")) return true;
          return false;
        }).reduce(function(acc, t2) { return acc + (t2._finalizedCount && t2._finalizedCount > 0 ? t2._finalizedCount : 1); }, 0);
        var dow = dt.getDay();
        var isWorkday = dow >= 1 && dow <= (tgt.daysPerWeek >= 6 ? 6 : 5);
        var expected = isWorkday ? tgt.target : 0;
        totalExpected += expected; totalActual += dayDone;
        histDays.push({ date: dStr, label: dt.getDate() + " " + MN[dt.getMonth()], done: dayDone, expected: expected, deficit: expected - dayDone });
      }
      var totalDeficit = totalExpected - totalActual;
      var borderC = pct >= 100 ? GR : pct >= 50 ? "#D97706" : "#DC2626";

      return <Card key={tgt.id} style={{ marginBottom: 16, borderLeft: "3px solid " + (pct >= 100 ? GR : pct >= 50 ? "#D97706" : "#DC2626") }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Av color={u.color} size={32}>{u.name[0]}</Av>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{u.name}</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>{metricLabel} | {tgt.target}/zi | {tgt.daysPerWeek} zile/sapt</div>
          </div>
          {canEdit && <button style={Object.assign({}, S.chip, { fontSize: 10, background: isEd ? GR + "18" : "#F1F5F9", color: isEd ? GR : "#64748B" })} onClick={function() { setEditId(isEd ? null : tgt.id); setEditForm({ target: tgt.target, daysPerWeek: tgt.daysPerWeek, metric: tgt.metric }); }}>Edit</button>}
          {canEdit && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) setTargets(function(p) { return p.filter(function(x) { return x.id !== tgt.id; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
        </div>

        {isEd && <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", marginBottom: 12, border: "1px solid hsl(214,18%,90%)" }}>
          <div style={S.fRow}>
            <div style={S.fCol}><label style={S.label}>Target zilnic</label><input style={S.input} type="number" min="1" value={editForm.target} onChange={function(e) { setEditForm(Object.assign({}, editForm, { target: parseInt(e.target.value) || 1 })); }} /></div>
            <div style={S.fCol}><label style={S.label}>Zile/sapt</label><input style={S.input} type="number" min="1" max="7" value={editForm.daysPerWeek} onChange={function(e) { setEditForm(Object.assign({}, editForm, { daysPerWeek: parseInt(e.target.value) || 5 })); }} /></div>
          </div>
          <div style={S.fCol}><label style={S.label}>Metric</label><select style={S.fSelF} value={normM(editForm.metric)} onChange={function(e) { setEditForm(Object.assign({}, editForm, { metric: e.target.value })); }}>{metricOptions.map(function(o) { return <option key={o.id} value={o.id}>{o.l}</option>; })}</select></div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}><button style={S.primBtn} onClick={function() { saveEdit(tgt.id); }}>Salveaza</button><button style={S.cancelBtn} onClick={function() { setEditId(null); }}>Anuleaza</button></div>
        </div>}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span>Done azi: {todayDone}/{tgt.target}</span><span style={{ fontWeight: 700, color: pct >= 100 ? GR : "#DC2626" }}>{Math.round(pct)}%</span></div>
        <div style={S.progBg}><div style={S.progBar(pct >= 100 ? GR : pct >= 50 ? "#D97706" : "#DC2626", Math.min(pct, 100))} /></div>
        {rem > 0 && <div style={{ marginTop: 6, fontSize: 12, color: "#DC2626", fontWeight: 600 }}>Ramas azi: {rem}</div>}

        <div style={{ marginTop: 10, padding: 10, background: totalDeficit > 0 ? "#FEF2F2" : "#F0FDF4", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
            <span>Ultimele 14 zile</span>
            <span style={{ color: totalDeficit > 0 ? "#DC2626" : GR }}>Asteptat: {totalExpected} | Facut: {totalActual} | {totalDeficit > 0 ? "Deficit: " + totalDeficit : "Surplus: +" + Math.abs(totalDeficit)}</span>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px", gap: 2, fontSize: 11 }}>
            <div style={{ fontWeight: 600, color: "#94A3B8", padding: 4 }}>Zi</div>
            <div style={{ fontWeight: 600, color: "#94A3B8", padding: 4, textAlign: "center" }}>Target</div>
            <div style={{ fontWeight: 600, color: "#94A3B8", padding: 4, textAlign: "center" }}>Facut</div>
            <div style={{ fontWeight: 600, color: "#94A3B8", padding: 4, textAlign: "center" }}>+/-</div>
            {histDays.map(function(h) {
              var isToday2 = h.date === TD;
              return [
                <div key={h.date + "l"} style={{ padding: "3px 4px", background: isToday2 ? GR + "12" : "#F8FAFC", fontWeight: isToday2 ? 700 : 400, borderRadius: 3 }}>{h.label}{isToday2 ? " (azi)" : ""}</div>,
                <div key={h.date + "e"} style={{ padding: "3px 4px", textAlign: "center", background: "#F8FAFC", borderRadius: 3 }}>{h.expected || "-"}</div>,
                <div key={h.date + "d"} style={{ padding: "3px 4px", textAlign: "center", background: "#F8FAFC", borderRadius: 3, fontWeight: 600, color: h.expected > 0 ? (h.done >= h.expected ? GR : "#DC2626") : "#94A3B8" }}>{h.done || (h.expected > 0 ? "0" : "-")}</div>,
                <div key={h.date + "df"} style={{ padding: "3px 4px", textAlign: "center", borderRadius: 3, fontWeight: 600, color: h.deficit > 0 ? "#DC2626" : h.deficit < 0 ? GR : "#94A3B8", background: h.deficit > 0 ? "#FEF2F2" : h.deficit < 0 ? "#F0FDF4" : "#F8FAFC" }}>{h.expected > 0 ? (h.deficit > 0 ? "-" + h.deficit : h.deficit < 0 ? "+" + Math.abs(h.deficit) : "✓") : "-"}</div>
              ];
            })}
          </div>
        </div>
      </Card>;
    })}
    {targets.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 30 }}>Niciun target.</Card>}
  </div>;
}

function TemplatesPage({ templates, setTemplates, canEdit, isAdmin, shops, onCreateFromTpl }) {
  var [showForm, setShowForm] = useState(false); var [form, setForm] = useState({ name: "", description: "", subtasks: [], shop: "" }); var [newSt, setNewSt] = useState("");
  var save = function() { if (!form.name.trim()) return; setTemplates(function(p) { return p.concat([Object.assign({}, form, { id: gid() })]); }); setShowForm(false); setForm({ name: "", description: "", subtasks: [], shop: "" }); };
  return <div>{canEdit && <div style={{ marginBottom: 16 }}><button style={S.primBtn} onClick={function() { setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> Template nou</button></div>}{showForm && <Card style={{ marginBottom: 16, maxWidth: 500 }}><label style={S.label}>Nume</label><input style={S.input} value={form.name} onChange={function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }} /><label style={S.label}>Descriere</label><input style={S.input} value={form.description} onChange={function(e) { setForm(Object.assign({}, form, { description: e.target.value })); }} /><label style={S.label}>Magazin</label><select style={S.fSelF} value={form.shop} onChange={function(e) { setForm(Object.assign({}, form, { shop: e.target.value })); }}><option value="">Toate</option>{(shops || []).map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select><label style={S.label}>Subtaskuri</label>{form.subtasks.map(function(s, i) { return <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}><span style={{ fontSize: 11, color: "#94A3B8", width: 20 }}>{i + 1}.</span><span style={{ flex: 1, fontSize: 13 }}>{s}</span><button style={S.iconBtn} onClick={function() { setForm(Object.assign({}, form, { subtasks: form.subtasks.filter(function(_, j) { return j !== i; }) })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}<div style={{ display: "flex", gap: 6, marginTop: 4 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={newSt} onChange={function(e) { setNewSt(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter" && newSt.trim()) { setForm(Object.assign({}, form, { subtasks: form.subtasks.concat([newSt.trim()]) })); setNewSt(""); } }} placeholder="Subtask..." /><button style={S.primBtn} onClick={function() { if (newSt.trim()) { setForm(Object.assign({}, form, { subtasks: form.subtasks.concat([newSt.trim()]) })); setNewSt(""); } }}><Ic d={Icons.plus} size={14} color="#fff" /></button></div><div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={save}>Salveaza</button><button style={S.cancelBtn} onClick={function() { setShowForm(false); }}>Anuleaza</button></div></Card>}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>{templates.map(function(tpl) { return <Card key={tpl.id}><div style={{ fontWeight: 700, marginBottom: 4 }}>{tpl.name}</div><div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>{tpl.description}{tpl.shop ? " | " + tpl.shop : ""}</div><div style={{ fontSize: 12 }}>{tpl.subtasks.map(function(s, i) { return <div key={i} style={{ padding: "2px 0" }}>o {s}</div>; })}</div><div style={{ marginTop: 10, display: "flex", gap: 6 }}><button style={S.primBtn} onClick={function() { onCreateFromTpl(tpl); }}>Creeaza task</button>{isAdmin && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) setTemplates(function(p) { return p.filter(function(x) { return x.id !== tpl.id; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}</div></Card>; })}</div></div>;
}

function WorkPage({ users, team, tasks, getPerf, timers, getTS, isMob, onClickUser }) {
  var data = users.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) { var ut = tasks.filter(function(t) { return t.assignee === u; }); var byS = {}; STATUSES.forEach(function(s) { byS[s] = ut.filter(function(t) { return t.status === s; }).length; }); var od = ut.filter(function(t) { return isOv(t); }).length; var actT = ut.filter(function(t) { return timers[t.id] && timers[t.id].running; }).length; var tT = 0; ut.forEach(function(t) { tT += getTS(t.id); }); return { key: u, name: team[u].name, color: team[u].color, role: team[u].role, total: ut.length, byS: byS, od: od, actT: actT, tT: tT, perf: getPerf(u) }; }).sort(function(a, b) { return b.total - a.total; });
  var mx = Math.max.apply(null, data.map(function(d) { return d.total; }).concat([1]));
  return <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>{data.map(function(d) { return <Card key={d.key} style={{ cursor: "pointer" }}><div onClick={function() { onClickUser(d.key); }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Av color={d.color} size={42}>{d.name[0]}</Av><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{d.role === "pm" ? "PM" : "Member"}</div></div>{d.actT > 0 && <Badge bg="#FEF2F2" color="#DC2626"><span style={{ animation: "pulse 2s infinite" }}>{d.actT} active</span></Badge>}<div style={{ fontSize: 20, fontWeight: 700, color: d.perf.score >= 70 ? GR : d.perf.score >= 40 ? "#D97706" : "#DC2626" }}>{d.perf.score}%</div></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B", marginBottom: 4 }}><span>{d.total} taskuri</span><span>Tracked: {ft(d.tT)}</span></div><div style={{ height: 8, borderRadius: 8, background: "#F1F5F9", overflow: "hidden", display: "flex", marginBottom: 10 }}>{STATUSES.map(function(s) { var w = (d.byS[s] / mx) * 100; return w > 0 ? <div key={s} style={{ width: w + "%", height: "100%", background: SC[s] }} /> : null; })}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, textAlign: "center", fontSize: 10 }}>{STATUSES.map(function(s) { return <div key={s} style={{ background: SC[s] + "12", borderRadius: 6, padding: "4px 2px" }}><div style={{ fontSize: 14, fontWeight: 700, color: SC[s] }}>{d.byS[s]}</div><div style={{ color: "#94A3B8" }}>{s === "In Progress" ? "Active" : s}</div></div>; })}<div style={{ background: d.od ? "#FEF2F2" : "#F8FAFC", borderRadius: 6, padding: "4px 2px" }}><div style={{ fontSize: 14, fontWeight: 700, color: d.od ? "#DC2626" : "#94A3B8" }}>{d.od}</div><div style={{ color: "#94A3B8" }}>Overdue</div></div></div></div></Card>; })}</div>;
}

function TeamPage({ users, team, sessions, getPerf, isMob, onClickUser }) {
  return <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>{users.map(function(u) { var m = team[u]; if (!m) return null; var p = getPerf(u); var lss = sessions[u]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000; return <Card key={u} style={{ cursor: "pointer" }}><div onClick={function() { onClickUser(u); }}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><div style={{ position: "relative" }}><Av color={m.color} size={42}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{m.role === "pm" ? "PM" : m.role === "admin" ? "Admin" : "Member"}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 11, fontWeight: 600, color: on ? "#16A34A" : "#94A3B8" }}>{on ? "Online" : "Offline"}</div><div style={{ fontSize: 10, color: "#CBD5E1" }}>Last: {fr(lss)}</div></div></div>{m.role !== "admin" && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span style={{ color: "#64748B" }}>Performance</span><span style={{ fontWeight: 700, color: p.score >= 70 ? GR : p.score >= 40 ? "#D97706" : "#DC2626" }}>{p.score}%</span></div><div style={S.progBg}><div style={S.progBar(p.score >= 70 ? GR : p.score >= 40 ? "#D97706" : "#DC2626", p.score)} /></div></div>}</div></Card>; })}</div>;
}

function PerfPage({ users, team, getPerf, isMob }) {
  var data = users.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) { return Object.assign({ key: u }, team[u], getPerf(u)); }).sort(function(a, b) { return b.score - a.score; });
  return <Card><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Clasament Echipa</h3>{data.map(function(d, i) { return <div key={d.key} style={{ display: "flex", alignItems: isMob ? "flex-start" : "center", gap: 12, padding: "12px 0", borderBottom: i < data.length - 1 ? "1px solid #F1F5F9" : "none", flexDirection: isMob ? "column" : "row" }}><span style={{ fontSize: 16, width: 28, textAlign: "center", fontWeight: 700, color: i < 3 ? GR : "#94A3B8" }}>#{i + 1}</span><div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}><Av color={d.color} size={30}>{d.name[0]}</Av><span style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</span></div><div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, width: "100%" }}><div style={Object.assign({}, S.progBg, { flex: 1 })}><div style={S.progBar(d.score >= 70 ? GR : d.score >= 40 ? "#D97706" : "#DC2626", d.score)} /></div><span style={{ fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "right", color: d.score >= 70 ? GR : d.score >= 40 ? "#D97706" : "#DC2626" }}>{d.score}%</span></div><div style={{ display: "flex", gap: 10, fontSize: 11, color: "#94A3B8" }}><span>{d.done}/{d.total}</span>{d.overdue > 0 && <span style={{ color: "#DC2626" }}>{d.overdue} ovd</span>}{d.avgTime > 0 && <span>avg {ft(d.avgTime)}</span>}</div></div>; })}</Card>;
}

function DigestPage({ team, tasks, timers, getPerf, visUsers, isMob }) {
  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); var weekAgoStr = ds(weekAgo);
  var users = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; });
  var digest = users.map(function(u) { var ut = tasks.filter(function(t) { return t.assignee === u; }); var weekDone = ut.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) >= weekAgoStr; }).length; var weekCreated = ut.filter(function(t) { return t.createdAt && ds(t.createdAt) >= weekAgoStr; }).length; var overdue = ut.filter(function(t) { return isOv(t); }).length; var perf = getPerf(u); var totalTime = 0; ut.forEach(function(t) { var tm = timers[t.id]; if (tm) totalTime += tm.total; }); return { key: u, name: team[u].name, color: team[u].color, weekDone: weekDone, weekCreated: weekCreated, overdue: overdue, perf: perf, totalTime: totalTime }; }).sort(function(a, b) { return b.weekDone - a.weekDone; });
  var copyDigest = function() { var text = "WEEKLY DIGEST - " + fd(weekAgoStr) + " -> " + fd(TD) + "\n\n"; digest.forEach(function(d) { text += d.name + ": " + d.weekDone + " done, " + d.overdue + " overdue, " + d.perf.score + "% perf, " + ft(d.totalTime) + " tracked\n"; }); navigator.clipboard.writeText(text); };
  return <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ fontSize: 15, fontWeight: 700 }}>Weekly Digest ({fd(weekAgoStr)} - {fd(TD)})</h3><button style={S.primBtn} onClick={copyDigest}><Ic d={Icons.copy} size={14} color="#fff" /> Copy</button></div><div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>{digest.map(function(d) { return <Card key={d.key} style={{ borderLeft: "3px solid " + d.color }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><Av color={d.color} size={36}>{d.name[0]}</Av><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>Score: {d.perf.score}%</div></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, textAlign: "center" }}>{[{ l: "Done", v: d.weekDone, c: GR }, { l: "Noi", v: d.weekCreated, c: "#2563EB" }, { l: "Overdue", v: d.overdue, c: "#DC2626" }, { l: "Timp", v: ft(d.totalTime), c: "#64748B" }].map(function(x) { return <div key={x.l} style={{ background: x.c + "12", borderRadius: 6, padding: "6px 4px" }}><div style={{ fontSize: 16, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 9, color: "#94A3B8" }}>{x.l}</div></div>; })}</div></Card>; })}</div></div>;
}

function LogPage({ logs, visUsers, isMob }) {
  var vis = logs.filter(function(l) { return visUsers.includes(l.user); }); var aC = { LOGIN: { bg: "#ECFDF5", c: "#16A34A" }, LOGOUT: { bg: "#FEF2F2", c: "#DC2626" }, NEW: { bg: "#EFF6FF", c: "#2563EB" }, EDIT: { bg: "#FFFBEB", c: "#D97706" }, DELETE: { bg: "#FEF2F2", c: "#DC2626" }, STATUS: { bg: "#F5F3FF", c: "#7C3AED" }, TIMER: { bg: "#FFF7ED", c: "#EA580C" }, DUPLICATE: { bg: "#EFF6FF", c: "#2563EB" }, USER_ADD: { bg: "#ECFDF5", c: GR }, USER_DEL: { bg: "#FEF2F2", c: "#DC2626" }, EXPORT: { bg: "#ECFDF5", c: GR } };
  return <Card>{vis.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Nicio activitate.</div> : vis.slice(0, 150).map(function(l) { var cfg = aC[l.action] || { bg: "#F8FAFC", c: "#64748B" }; return <div key={l.id} style={{ display: "flex", alignItems: isMob ? "flex-start" : "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC", flexDirection: isMob ? "column" : "row" }}><span style={{ fontSize: 11, color: "#CBD5E1", minWidth: 120 }}>{ff(l.time)}</span><Badge bg={cfg.bg} color={cfg.c}>{l.action}</Badge><span style={{ fontSize: 12, color: "#64748B" }}>{l.detail}</span></div>; })}</Card>;
}

function RecurringPage({ recurringTasks, setRecurringTasks, team, assUsers, shops, departments, canEdit }) {
  var [showForm, setShowForm] = useState(false);
  var [form, setForm] = useState({ title: "", assignee: "", frequency: "Zilnic", priority: "Normal", platform: "", taskType: "", department: "", shop: "", subtasks: [], dayOfWeek: 1, dayOfMonth: 1, active: true });
  var [newSt, setNewSt] = useState("");
  var save = function() { if (!form.title.trim() || !form.assignee) return; setRecurringTasks(function(p) { return p.concat([Object.assign({}, form, { id: gid(), lastCreated: null })]); }); setShowForm(false); setForm({ title: "", assignee: "", frequency: "Zilnic", priority: "Normal", platform: "", taskType: "", department: "", shop: "", subtasks: [], dayOfWeek: 1, dayOfMonth: 1, active: true }); };
  return <div style={{ maxWidth: 700 }}>
    {canEdit && <div style={{ marginBottom: 16 }}><button style={S.primBtn} onClick={function() { setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> Recurring nou</button></div>}
    {showForm && <Card style={{ marginBottom: 16 }}>
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Titlu</label><input style={S.input} value={form.title} onChange={function(e) { setForm(Object.assign({}, form, { title: e.target.value })); }} /></div><div style={S.fCol}><label style={S.label}>Assignee</label><select style={S.fSelF} value={form.assignee} onChange={function(e) { setForm(Object.assign({}, form, { assignee: e.target.value })); }}><option value="">--</option>{assUsers.map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name}</option>; })}</select></div></div>
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Frecventa</label><select style={S.fSelF} value={form.frequency} onChange={function(e) { setForm(Object.assign({}, form, { frequency: e.target.value })); }}>{RECUR_OPTS.map(function(o) { return <option key={o} value={o}>{o}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Prioritate</label><select style={S.fSelF} value={form.priority} onChange={function(e) { setForm(Object.assign({}, form, { priority: e.target.value })); }}>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div></div>
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Magazin</label><select style={S.fSelF} value={form.shop} onChange={function(e) { setForm(Object.assign({}, form, { shop: e.target.value })); }}><option value="">--</option>{(shops || []).map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Departament</label><select style={S.fSelF} value={form.department} onChange={function(e) { setForm(Object.assign({}, form, { department: e.target.value })); }}><option value="">--</option>{(departments || []).map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select></div></div>
      {form.frequency === "Saptamanal" && <div><label style={S.label}>Ziua saptamanii</label><select style={S.fSelF} value={form.dayOfWeek} onChange={function(e) { setForm(Object.assign({}, form, { dayOfWeek: parseInt(e.target.value) })); }}>{["Luni", "Marti", "Miercuri", "Joi", "Vineri", "Sambata", "Duminica"].map(function(d, i) { return <option key={i} value={i + 1}>{d}</option>; })}</select></div>}
      {form.frequency === "Lunar" && <div><label style={S.label}>Ziua lunii</label><input style={S.input} type="number" min="1" max="28" value={form.dayOfMonth} onChange={function(e) { setForm(Object.assign({}, form, { dayOfMonth: parseInt(e.target.value) || 1 })); }} /></div>}
      <label style={S.label}>Subtaskuri</label>
      {form.subtasks.map(function(s, i) { return <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}><span style={{ fontSize: 11, color: "#94A3B8" }}>{i + 1}.</span><span style={{ flex: 1, fontSize: 13 }}>{s}</span><button style={S.iconBtn} onClick={function() { setForm(Object.assign({}, form, { subtasks: form.subtasks.filter(function(_, j) { return j !== i; }) })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={newSt} onChange={function(e) { setNewSt(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter" && newSt.trim()) { setForm(Object.assign({}, form, { subtasks: form.subtasks.concat([newSt.trim()]) })); setNewSt(""); } }} placeholder="Subtask..." /><button style={S.primBtn} onClick={function() { if (newSt.trim()) { setForm(Object.assign({}, form, { subtasks: form.subtasks.concat([newSt.trim()]) })); setNewSt(""); } }}><Ic d={Icons.plus} size={14} color="#fff" /></button></div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={save}>Salveaza</button><button style={S.cancelBtn} onClick={function() { setShowForm(false); }}>Anuleaza</button></div>
    </Card>}
    {recurringTasks.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 30 }}>Niciun task recurring.</Card>}
    {recurringTasks.map(function(rt) {
      var a = team[rt.assignee] || {}; return <Card key={rt.id} style={{ marginBottom: 8, borderLeft: "3px solid " + (rt.active ? GR : "#CBD5E1") }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{rt.title}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{rt.frequency} | {a.name || rt.assignee}{rt.shop ? " | " + rt.shop : ""}{rt.department ? " | " + rt.department : ""}</div>{rt.lastCreated && <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 2 }}>Ultima creare: {fd(rt.lastCreated)}</div>}</div>
          {canEdit && <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><input type="checkbox" checked={rt.active} onChange={function(e) { setRecurringTasks(function(p) { return p.map(function(x) { return x.id === rt.id ? Object.assign({}, x, { active: e.target.checked }) : x; }); }); }} /> Activ</label>}
          {canEdit && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) setRecurringTasks(function(p) { return p.filter(function(x) { return x.id !== rt.id; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
        </div>
      </Card>;
    })}
  </div>;
}

function DeptPage({ departments, setDepartments, tasks, team, visUsers, isMob, canEdit }) {
  var [newD, setNewD] = useState("");
  var add = function() { if (!newD.trim() || departments.includes(newD.trim().toUpperCase())) return; setDepartments(function(p) { return p.concat([newD.trim().toUpperCase()]); }); setNewD(""); };
  return <div>
    {canEdit && <div style={{ display: "flex", gap: 8, marginBottom: 20 }}><input style={Object.assign({}, S.input, { maxWidth: 280 })} value={newD} onChange={function(e) { setNewD(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") add(); }} placeholder="Departament nou..." /><button style={S.primBtn} onClick={add}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga</button></div>}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
      {departments.map(function(dept) {
        var deptTasks = tasks.filter(function(t) { return t.department === dept && visUsers.includes(t.assignee); });
        var active = deptTasks.filter(function(t) { return t.status !== "Done"; }).length;
        var done = deptTasks.filter(function(t) { return t.status === "Done"; }).length;
        var overdue = deptTasks.filter(function(t) { return isOv(t); }).length;
        var assignees = [...new Set(deptTasks.map(function(t) { return t.assignee; }))].filter(function(u) { return team[u]; });
        return <Card key={dept} style={{ borderLeft: "3px solid " + GR }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{dept}</div>
            {canEdit && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi departamentul?")) setDepartments(function(p) { return p.filter(function(d) { return d !== dept; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <Badge bg="#EFF6FF" color="#2563EB">{active} active</Badge>
            <Badge bg="#ECFDF5" color={GR}>{done} done</Badge>
            {overdue > 0 && <Badge bg="#FEF2F2" color="#DC2626">{overdue} overdue</Badge>}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {assignees.slice(0, 6).map(function(u) { var m = team[u]; return m ? <Av key={u} color={m.color} size={24} fs={10} title={m.name}>{m.name[0]}</Av> : null; })}
          </div>
        </Card>;
      })}
    </div>
  </div>;
}

function ShopsBordPage({ shops, setShops, tasks, team, isMob, canEdit, slas }) {
  var [newS, setNewS] = useState("");
  var add = function() { if (!newS.trim() || shops.includes(newS.trim())) return; setShops(function(p) { return p.concat([newS.trim()]); }); setNewS(""); };
  return <div>
    {canEdit && <div style={{ display: "flex", gap: 8, marginBottom: 20 }}><input style={Object.assign({}, S.input, { maxWidth: 280 })} value={newS} onChange={function(e) { setNewS(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") add(); }} placeholder="Magazin nou..." /><button style={S.primBtn} onClick={add}><Ic d={Icons.plus} size={14} color="#fff" /> Adauga</button></div>}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
      {shops.map(function(shop) {
        var st = tasks.filter(function(t) { return t.shop === shop; });
        var active = st.filter(function(t) { return t.status !== "Done"; }).length;
        var done = st.filter(function(t) { return t.status === "Done"; }).length;
        var overdue = st.filter(function(t) { return isOv(t); }).length;
        var inProg = st.filter(function(t) { return t.status === "In Progress"; }).length;
        var assignees = [...new Set(st.map(function(t) { return t.assignee; }))].filter(function(u) { return team[u]; });
        return <Card key={shop} style={{ borderLeft: "3px solid " + GR }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{shop}</div>
            {canEdit && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi magazinul?")) setShops(function(p) { return p.filter(function(s) { return s !== shop; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <Badge bg="#EFF6FF" color="#2563EB">{active} active</Badge>
            <Badge bg="#FFF7ED" color="#EA580C">{inProg} in lucru</Badge>
            <Badge bg="#ECFDF5" color={GR}>{done} done</Badge>
            {overdue > 0 && <Badge bg="#FEF2F2" color="#DC2626">{overdue} overdue</Badge>}
          </div>
          {slas && slas[shop] && <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>SLA: {slas[shop]}h</div>}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {assignees.slice(0, 6).map(function(u) { var m = team[u]; return m ? <Av key={u} color={m.color} size={24} fs={10} title={m.name}>{m.name[0]}</Av> : null; })}
          </div>
        </Card>;
      })}
    </div>
  </div>;
}

// FEATURE 2: Products with audit trail
function ProdsPage({ products, setProducts, shops, productAudit, setProductAudit, user, team }) {
  var [showForm, setShowForm] = useState(false);
  var [form, setForm] = useState({ name: "", shop: "", category: "", price: "", link: "", notes: "" });
  var [shopF, setShopF] = useState("all");
  var [showAudit, setShowAudit] = useState(false);
  var me = team[user] || {};
  var canEdit = me.role === "admin" || me.role === "pm";

  var save = function() {
    if (!form.name.trim()) return;
    var prod = Object.assign({}, form, { id: gid(), addedAt: ts(), addedBy: user });
    setProducts(function(p) { return p.concat([prod]); });
    // FEATURE 2: Audit log for ADD
    var auditEntry = { id: gid(), action: "ADD", productId: prod.id, productName: form.name, userId: user, userName: (team[user] || {}).name || user, time: ts() };
    setProductAudit(function(p) { return [auditEntry].concat(p); });
    setShowForm(false);
    setForm({ name: "", shop: "", category: "", price: "", link: "", notes: "" });
  };

  var delProd = function(pid) {
    var prod = products.find(function(p) { return p.id === pid; });
    if (!prod) return;
    // FEATURE 2: Audit log for DELETE
    var auditEntry = { id: gid(), action: "DELETE", productId: pid, productName: prod.name, userId: user, userName: (team[user] || {}).name || user, time: ts() };
    setProductAudit(function(p) { return [auditEntry].concat(p); });
    setProducts(function(p) { return p.filter(function(x) { return x.id !== pid; }); });
  };

  var vis = shopF === "all" ? products : products.filter(function(p) { return p.shop === shopF; });

  return <div style={{ maxWidth: 900 }}>
    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
      {canEdit && <button style={S.primBtn} onClick={function() { setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> Produs nou</button>}
      <button style={Object.assign({}, S.cancelBtn, { color: showAudit ? GR : "#64748B" })} onClick={function() { setShowAudit(!showAudit); }}><Ic d={Icons.history} size={14} color={showAudit ? GR : "#64748B"} /> {showAudit ? "Ascunde Audit" : "Audit Trail"} ({productAudit.length})</button>
      <select style={S.fSel} value={shopF} onChange={function(e) { setShopF(e.target.value); }}><option value="all">Toate magazinele</option>{(shops || []).map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
      <span style={{ fontSize: 12, color: "#94A3B8" }}>{vis.length} produse</span>
    </div>

    {showAudit && <Card style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Audit Trail Produse</h3>
      {productAudit.length === 0 && <div style={{ color: "#94A3B8", fontSize: 12, padding: "10px 0" }}>Niciun log.</div>}
      {productAudit.slice(0, 50).map(function(a) {
        var c = a.action === "ADD" ? GR : a.action === "DELETE" ? "#DC2626" : "#D97706";
        return <div key={a.id} style={{ display: "flex", gap: 10, fontSize: 11, padding: "6px 0", borderBottom: "1px solid #F8FAFC", alignItems: "center" }}>
          <Badge bg={c + "18"} color={c}>{a.action}</Badge>
          <span style={{ fontWeight: 600, flex: 1 }}>{a.productName}</span>
          <span style={{ color: "#64748B" }}>{a.userName}</span>
          <span style={{ color: "#94A3B8", minWidth: 120 }}>{ff(a.time)}</span>
        </div>;
      })}
    </Card>}

    {showForm && <Card style={{ marginBottom: 16, maxWidth: 500 }}>
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Nume produs</label><input style={S.input} value={form.name} onChange={function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }} /></div><div style={S.fCol}><label style={S.label}>Magazin</label><select style={S.fSelF} value={form.shop} onChange={function(e) { setForm(Object.assign({}, form, { shop: e.target.value })); }}><option value="">--</option>{(shops || []).map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div></div>
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Categorie</label><input style={S.input} value={form.category} onChange={function(e) { setForm(Object.assign({}, form, { category: e.target.value })); }} /></div><div style={S.fCol}><label style={S.label}>Pret</label><input style={S.input} value={form.price} onChange={function(e) { setForm(Object.assign({}, form, { price: e.target.value })); }} /></div></div>
      <label style={S.label}>Link</label><input style={S.input} value={form.link} onChange={function(e) { setForm(Object.assign({}, form, { link: e.target.value })); }} />
      <label style={S.label}>Note</label><textarea style={S.ta} value={form.notes} onChange={function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={save}>Salveaza</button><button style={S.cancelBtn} onClick={function() { setShowForm(false); }}>Anuleaza</button></div>
    </Card>}

    {vis.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 30 }}>Niciun produs.</Card>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
      {vis.map(function(p) {
        var adder = team[p.addedBy] || {};
        return <Card key={p.id}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {p.shop && <Badge bg="#ECFDF5" color={GR}>{p.shop}</Badge>}
                {p.category && <Badge bg="#F1F5F9" color="#475569">{p.category}</Badge>}
                {p.price && <Badge bg="#FFFBEB" color="#D97706">{p.price}</Badge>}
              </div>
              {p.notes && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>{p.notes}</div>}
              {p.link && <a href={p.link} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#2563EB", display: "flex", alignItems: "center", gap: 3 }}><Ic d={Icons.link} size={10} color="#2563EB" /> Link</a>}
              <div style={{ fontSize: 9, color: "#CBD5E1", marginTop: 4 }}>Adaugat de {adder.name || p.addedBy} - {fd(p.addedAt)}</div>
            </div>
            {canEdit && <button style={S.iconBtn} onClick={function() { if (confirm("Stergi produsul?")) delProd(p.id); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
          </div>
        </Card>;
      })}
    </div>
  </div>;
}

function SheetsPage({ sheets, setSheets, shops }) {
  var [showForm, setShowForm] = useState(false);
  var [form, setForm] = useState({ title: "", shop: "", url: "", type: "Google Sheets", notes: "" });
  var save = function() { if (!form.title.trim() || !form.url.trim()) return; setSheets(function(p) { return p.concat([Object.assign({}, form, { id: gid(), addedAt: ts() })]); }); setShowForm(false); setForm({ title: "", shop: "", url: "", type: "Google Sheets", notes: "" }); };
  return <div style={{ maxWidth: 700 }}>
    <div style={{ marginBottom: 16 }}><button style={S.primBtn} onClick={function() { setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> Sheet nou</button></div>
    {showForm && <Card style={{ marginBottom: 16 }}>
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Titlu</label><input style={S.input} value={form.title} onChange={function(e) { setForm(Object.assign({}, form, { title: e.target.value })); }} /></div><div style={S.fCol}><label style={S.label}>Magazin</label><select style={S.fSelF} value={form.shop} onChange={function(e) { setForm(Object.assign({}, form, { shop: e.target.value })); }}><option value="">--</option>{(shops || []).map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div></div>
      <label style={S.label}>URL</label><input style={S.input} value={form.url} onChange={function(e) { setForm(Object.assign({}, form, { url: e.target.value })); }} />
      <label style={S.label}>Note</label><textarea style={S.ta} value={form.notes} onChange={function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={save}>Salveaza</button><button style={S.cancelBtn} onClick={function() { setShowForm(false); }}>Anuleaza</button></div>
    </Card>}
    {sheets.length === 0 && <Card style={{ textAlign: "center", color: "#94A3B8", padding: 30 }}>Niciun sheet.</Card>}
    {sheets.map(function(sh) { return <Card key={sh.id} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{sh.title}</div>{sh.shop && <Badge bg="#ECFDF5" color={GR}>{sh.shop}</Badge>}{sh.notes && <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{sh.notes}</div>}</div><a href={sh.url} target="_blank" rel="noreferrer" style={S.primBtn}>Deschide</a><button style={S.iconBtn} onClick={function() { if (confirm("Stergi?")) setSheets(function(p) { return p.filter(function(x) { return x.id !== sh.id; }); }); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button></Card>; })}
  </div>;
}

// FEATURE 13: UsersPage with permission toggles
function UsersPage({ team, setTeam, addLog }) {
  var [editU, setEditU] = useState(null);
  var [newUser, setNewUser] = useState({ username: "", name: "", role: "member", password: "", color: COLORS[0], pm: "" });
  var [showAdd, setShowAdd] = useState(false);
  var addU = function() { if (!newUser.username.trim() || !newUser.name.trim() || !newUser.password.trim()) return; var key = newUser.username.toLowerCase().trim(); if (team[key]) return; setTeam(function(t) { var n = Object.assign({}, t); n[key] = { name: newUser.name, role: newUser.role, password: newUser.password, color: newUser.color, pm: newUser.pm || undefined, permissions: {} }; if (newUser.role === "pm") n[key].team = []; return n; }); addLog("USER_ADD", "User nou: " + newUser.name); setShowAdd(false); setNewUser({ username: "", name: "", role: "member", password: "", color: COLORS[0], pm: "" }); };
  var delU = function(u) { if (u === "admin") return; setTeam(function(t) { var n = Object.assign({}, t); delete n[u]; return n; }); addLog("USER_DEL", "User sters: " + u); };
  return <div style={{ maxWidth: 800 }}>
    <div style={{ marginBottom: 16 }}><button style={S.primBtn} onClick={function() { setShowAdd(!showAdd); }}><Ic d={Icons.plus} size={14} color="#fff" /> User nou</button></div>
    {showAdd && <Card style={{ marginBottom: 16, maxWidth: 500 }}>
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Username</label><input style={S.input} value={newUser.username} onChange={function(e) { setNewUser(Object.assign({}, newUser, { username: e.target.value })); }} /></div><div style={S.fCol}><label style={S.label}>Nume afisat</label><input style={S.input} value={newUser.name} onChange={function(e) { setNewUser(Object.assign({}, newUser, { name: e.target.value })); }} /></div></div>
      <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Parola</label><input style={S.input} value={newUser.password} onChange={function(e) { setNewUser(Object.assign({}, newUser, { password: e.target.value })); }} /></div><div style={S.fCol}><label style={S.label}>Rol</label><select style={S.fSelF} value={newUser.role} onChange={function(e) { setNewUser(Object.assign({}, newUser, { role: e.target.value })); }}>{ROLES.map(function(r) { return <option key={r} value={r}>{r}</option>; })}</select></div></div>
      <label style={S.label}>Culoare</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 12px" }}>{COLORS.map(function(c) { return <button key={c} onClick={function() { setNewUser(Object.assign({}, newUser, { color: c })); }} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: newUser.color === c ? "3px solid #1E293B" : "2px solid transparent" }} />; })}</div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}><button style={S.primBtn} onClick={addU}>Adauga</button><button style={S.cancelBtn} onClick={function() { setShowAdd(false); }}>Anuleaza</button></div>
    </Card>}
    {Object.keys(team).filter(function(u) { return u !== "admin"; }).map(function(u) {
      var m = team[u]; if (!m) return null; var isEd = editU === u;
      return <Card key={u} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Av color={m.color} size={36}>{m.name[0]}</Av>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{u} | {m.role}</div></div>
          <button style={S.iconBtn} onClick={function() { setEditU(isEd ? null : u); }}><Ic d={Icons.edit} size={16} color={isEd ? GR : "#94A3B8"} /></button>
          <button style={S.iconBtn} onClick={function() { if (confirm("Stergi user?")) delU(u); }}><Ic d={Icons.del} size={16} color="#EF4444" /></button>
        </div>
        {isEd && <EditUserInline u={u} m={m} team={team} setTeam={setTeam} />}
      </Card>;
    })}
  </div>;
}

// FEATURE 13: EditUserInline with permission toggles
function EditUserInline({ u, m, team, setTeam }) {
  var defPerms = { can_create: m.role === "pm", can_edit: m.role === "pm", can_delete: m.role === "pm", can_change_status: true, can_view_all: m.role === "pm" };
  var curPerms = m.permissions || {};
  var upd = function(field, val) { setTeam(function(t) { var n = Object.assign({}, t); n[u] = Object.assign({}, n[u], { [field]: val }); return n; }); };
  var updPerm = function(perm, val) { setTeam(function(t) { var n = Object.assign({}, t); n[u] = Object.assign({}, n[u], { permissions: Object.assign({}, n[u].permissions || {}, { [perm]: val }) }); return n; }); };
  var pages = ["dashboard", "tasks", "kanban", "calendar", "targets", "templates", "recurring", "workload", "team", "performance", "digest", "achievements", "announce", "challenge", "anomalies", "log", "loginhistory", "departments", "shops", "products", "sheets", "manage_users", "birdseye"];
  var curAccess = m.access || [];

  return <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
    <div style={S.fRow}>
      <div style={S.fCol}>
        <label style={S.label}>Parola</label>
        <input style={S.input} defaultValue={m.password} onChange={function(e) { upd("password", e.target.value); }} />
      </div>
      <div style={S.fCol}>
        <label style={S.label}>Rol</label>
        <select style={S.fSelF} value={m.role} onChange={function(e) { upd("role", e.target.value); }}>
          {ROLES.map(function(r) { return <option key={r} value={r}>{r}</option>; })}
        </select>
      </div>
    </div>
    <label style={S.label}>Culoare</label>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {COLORS.map(function(c) { return <button key={c} onClick={function() { upd("color", c); }} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: m.color === c ? "3px solid #1E293B" : "2px solid transparent" }} />; })}
    </div>
    {/* FEATURE 13: Action permissions */}
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Permisiuni actiuni</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
        {[
          { key: "can_create", label: "Poate crea taskuri" },
          { key: "can_edit", label: "Poate edita taskuri" },
          { key: "can_delete", label: "Poate sterge taskuri" },
          { key: "can_change_status", label: "Poate schimba status" },
          { key: "can_view_all", label: "Vede toate taskurile" },
        ].map(function(perm) {
          var cur = curPerms[perm.key] !== undefined ? curPerms[perm.key] : defPerms[perm.key];
          return <label key={perm.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", padding: "6px 8px", borderRadius: 6, background: cur ? "#ECFDF5" : "#FEF2F2", border: "1px solid " + (cur ? GR + "30" : "#FCA5A530") }}>
            <input type="checkbox" checked={cur} onChange={function(e) { updPerm(perm.key, e.target.checked); }} style={{ accentColor: GR }} />
            {perm.label}
          </label>;
        })}
      </div>
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Acces pagini</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4 }}>
      {pages.map(function(pg) {
        var hasAccess = curAccess.length === 0 ? true : curAccess.includes(pg);
        return <label key={pg} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
          <input type="checkbox" checked={hasAccess} onChange={function(e) {
            var newA = hasAccess ? curAccess.filter(function(p) { return p !== pg; }) : curAccess.concat([pg]);
            if (curAccess.length === 0 && !e.target.checked) { newA = pages.filter(function(p) { return p !== pg; }); }
            upd("access", newA);
          }} style={{ accentColor: GR }} />
          {pg}
        </label>;
      })}
    </div>
  </div>;
}

// FEATURE 15: TaskModal with auto-save draft + FEATURE 16: conflict detection + FEATURE 4: tags
// Feature 6 + 12: Task modal with custom types and departments
function TaskModal({ task, team, assUsers, shops, products, onSave, onClose, taskTypes, departments, allTasks, allTags, taskEditors, user, setTaskEditors }) {
  var [f, setF] = useState(task || { title: "", description: "", assignee: assUsers[0] || "", status: "To Do", priority: "Normal", platform: "", taskType: "", department: "", shop: "", product: "", productName: "", deadline: TD, links: [], subtasks: [], comments: [], dependsOn: [], campaignItems: [], assignees: [], tags: [], _pipelineNext: "" });
  var [newLink, setNewLink] = useState(""); var [newSub, setNewSub] = useState("");
  var [customType, setCustomType] = useState("");
  var [multiAssign, setMultiAssign] = useState(f.assignees && f.assignees.length > 0 ? f.assignees : []);
  var [newTag, setNewTag] = useState("");

  // Auto-save draft (new tasks only)
  useEffect(function() {
    if (!task || !task.id) { try { localStorage.setItem("scout_task_draft", JSON.stringify(f)); } catch(e) {} }
  }, [f]);

  // Conflict detection
  useEffect(function() {
    if (!task || !task.id) return;
    var editor = taskEditors && taskEditors[task.id];
    if (editor && editor.userId !== user) {
      var age = Date.now() - new Date(editor.at).getTime();
      if (age < 120000) {
        // show subtle warning in console, not blocking UI
        console.log("Conflict: " + editor.name + " is also editing this task");
      }
    }
    var updated = Object.assign({}, taskEditors || {}, { [task.id]: { userId: user, name: (team[user] || {}).name, at: new Date().toISOString() } });
    if (setTaskEditors) setTaskEditors(updated);
  }, []);

  var set = function(k, v) { setF(function(p) { var n = Object.assign({}, p); n[k] = v; return n; }); };
  var addLink = function() { var l = newLink.trim(); if (l) { set("links", (f.links || []).concat([l])); setNewLink(""); } };
  var selProd = function(pid) { var p = products.find(function(x) { return x.id === pid; }); if (p) { set("product", p.id); set("productName", p.name); if (p.url) set("links", (f.links || []).concat([p.url])); } };
  var addTag = function() { var t = newTag.trim().toLowerCase().replace(/\s+/g, "-"); if (t && !(f.tags || []).includes(t)) { set("tags", (f.tags || []).concat([t])); } setNewTag(""); };

  var allTypes = taskTypes || DEF_TASK_TYPES;

  return <div style={S.modalOv} onClick={onClose}><div style={S.modalBox} onClick={function(e) { e.stopPropagation(); }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 17, fontWeight: 700 }}>{task ? "Editeaza Task" : "Task Nou"}</h2><button style={S.iconBtn} onClick={onClose}><Ic d={Icons.x} size={18} color="#94A3B8" /></button></div>
    <label style={S.label}>Titlu *</label><input style={S.input} value={f.title} onChange={function(e) { set("title", e.target.value); }} placeholder="Ce trebuie facut?" autoFocus />
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Persoana</label><select style={S.fSelF} value={f.assignee} onChange={function(e) { set("assignee", e.target.value); }}>{assUsers.map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name || u}</option>; })}</select>
    <label style={Object.assign({}, S.label, { marginTop: 6 })}>Multi-assign (optional)</label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>{assUsers.map(function(u) { var active = multiAssign.includes(u); return <button key={u} type="button" onClick={function() { var na = active ? multiAssign.filter(function(x) { return x !== u; }) : multiAssign.concat([u]); setMultiAssign(na); set("assignees", na); }} style={Object.assign({}, S.chip, { background: active ? GR : "#F1F5F9", color: active ? "#fff" : "#475569", fontSize: 10, padding: "3px 8px" })}>{(team[u] || {}).name}</button>; })}</div>
    {multiAssign.length > 1 && <div style={{ fontSize: 10, color: GR }}>Se vor crea {multiAssign.length} taskuri separate.</div>}
    </div><div style={S.fCol}><label style={S.label}>Magazin</label><select style={S.fSelF} value={f.shop} onChange={function(e) { set("shop", e.target.value); }}><option value="">--</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
    {assUsers.includes("mara_poze") && <div>
    <label style={Object.assign({}, S.label, { marginTop: 6 })}>Pipeline: urmatorul (foto produs)</label>
    <select style={S.fSelF} value={f._pipelineNext || ""} onChange={function(e) { set("_pipelineNext", e.target.value); }}><option value="">Fara pipeline</option>{assUsers.map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name}</option>; })}</select>
    {f._pipelineNext && <div style={{ fontSize: 10, color: "#2563EB", marginTop: 2 }}>La Done, se creaza automat task pentru {(team[f._pipelineNext] || {}).name}.</div>}
    </div>}
    </div></div>
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Platforma</label><select style={S.fSelF} value={f.platform} onChange={function(e) { set("platform", e.target.value); }}><option value="">--</option>{PLATFORMS.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Tip Task</label><select style={S.fSelF} value={f.taskType} onChange={function(e) { set("taskType", e.target.value); }}><option value="">--</option>{allTypes.map(function(t) { return <option key={t} value={t}>{t}</option>; })}</select><div style={{ display: "flex", gap: 4, marginTop: 4 }}><input style={Object.assign({}, S.input, { flex: 1, fontSize: 11, padding: "4px 8px" })} value={customType} onChange={function(e) { setCustomType(e.target.value); }} placeholder="Tip nou..." /><button style={Object.assign({}, S.primBtn, { fontSize: 10, padding: "4px 8px" })} onClick={function() { if (customType.trim()) { set("taskType", customType.trim()); setCustomType(""); } }}>+</button></div></div></div>
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Departament</label><select style={S.fSelF} value={f.department || ""} onChange={function(e) { set("department", e.target.value); }}><option value="">--</option>{(departments || DEF_DEPARTMENTS).map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Prioritate</label><select style={S.fSelF} value={f.priority} onChange={function(e) { set("priority", e.target.value); }}>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div></div>
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Status</label><select style={S.fSelF} value={f.status} onChange={function(e) { set("status", e.target.value); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Deadline</label><input style={S.fSelF} type="date" value={f.deadline} onChange={function(e) { set("deadline", e.target.value); }} /></div></div>
    {products.length > 0 && <div><label style={S.label}>Produs (lista)</label><select style={S.fSelF} value={f.product || ""} onChange={function(e) { selProd(e.target.value); }}><option value="">--</option>{products.map(function(p) { return <option key={p.id} value={p.id}>{p.name}{p.store ? " (" + p.store + ")" : ""}</option>; })}</select></div>}
    <label style={S.label}>Produs (manual)</label><input style={S.input} value={f.productName || ""} onChange={function(e) { set("productName", e.target.value); }} placeholder="Nume produs" />
    <label style={S.label}>Linkuri</label><div style={{ display: "flex", gap: 6, marginBottom: 8 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={newLink} onChange={function(e) { setNewLink(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addLink(); }} placeholder="https://..." /><button style={S.primBtn} onClick={addLink}><Ic d={Icons.plus} size={14} color="#fff" /></button></div>{(f.links || []).map(function(l, i) { return <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12 }}><Ic d={Icons.link} size={12} color="#2563EB" /><a href={l} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</a><button style={S.iconBtn} onClick={function() { set("links", (f.links || []).filter(function(_, idx) { return idx !== i; })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}
    <label style={S.label}>Tags</label>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>{(f.tags || []).map(function(tag) { return <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 12, background: "#ECFDF5", color: GR, fontSize: 11, fontWeight: 600 }}>#{tag}<button style={{ border: "none", background: "none", cursor: "pointer", padding: 0, lineHeight: 1 }} onClick={function() { set("tags", (f.tags || []).filter(function(t) { return t !== tag; })); }}>×</button></span>; })}</div>
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}><input style={Object.assign({}, S.input, { flex: 1, fontSize: 12 })} value={newTag} onChange={function(e) { setNewTag(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Tag nou (Enter)" list="tag-sugg" /><datalist id="tag-sugg">{(allTags || []).map(function(t) { return <option key={t} value={t} />; })}</datalist><button style={Object.assign({}, S.primBtn, { padding: "4px 10px" })} onClick={addTag}>+</button></div>
    <label style={S.label}>Subtaskuri</label>{(f.subtasks || []).map(function(st, i) { return <div key={st.id || i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}><input type="checkbox" checked={st.done} onChange={function() { var ns = (f.subtasks || []).map(function(s, j) { return j === i ? Object.assign({}, s, { done: !s.done }) : s; }); set("subtasks", ns); }} /><input style={Object.assign({}, S.input, { flex: 1 })} value={st.text} onChange={function(e) { var ns = (f.subtasks || []).map(function(s, j) { return j === i ? Object.assign({}, s, { text: e.target.value }) : s; }); set("subtasks", ns); }} /><button style={S.iconBtn} onClick={function() { set("subtasks", (f.subtasks || []).filter(function(_, j) { return j !== i; })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}<div style={{ display: "flex", gap: 6, marginTop: 4 }}><input style={Object.assign({}, S.input, { flex: 1 })} placeholder="Subtask nou..." value={newSub} onChange={function(e) { setNewSub(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter" && newSub.trim()) { set("subtasks", (f.subtasks || []).concat([{ id: gid(), text: newSub.trim(), done: false }])); setNewSub(""); } }} /><button style={S.primBtn} onClick={function() { if (newSub.trim()) { set("subtasks", (f.subtasks || []).concat([{ id: gid(), text: newSub.trim(), done: false }])); setNewSub(""); } }}><Ic d={Icons.plus} size={14} color="#fff" /></button></div>
    <label style={S.label}>Produse Campaign (mega-task)</label>
    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>Adauga produse/items - la finalizare selectezi cate ai completat si se adauga la target.</div>
    {(f.campaignItems || []).map(function(ci, i) { return <div key={ci.id || i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3, padding: "4px 8px", background: "#F8FAFC", borderRadius: 6, flexWrap: "wrap" }}><span style={{ fontSize: 11, color: "#94A3B8", width: 22 }}>{i + 1}.</span><input style={Object.assign({}, S.input, { flex: 2, fontSize: 12, padding: "4px 8px", minWidth: 120 })} value={ci.name} onChange={function(e) { var nc = (f.campaignItems || []).map(function(x, j) { return j === i ? Object.assign({}, x, { name: e.target.value }) : x; }); set("campaignItems", nc); }} placeholder="Produs" /><input style={Object.assign({}, S.input, { flex: 3, fontSize: 11, padding: "4px 8px", minWidth: 140 })} value={ci.link || ""} onChange={function(e) { var nc = (f.campaignItems || []).map(function(x, j) { return j === i ? Object.assign({}, x, { link: e.target.value }) : x; }); set("campaignItems", nc); }} placeholder="Link produs..." /><button style={S.iconBtn} onClick={function() { set("campaignItems", (f.campaignItems || []).filter(function(_, j) { return j !== i; })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}
    <div style={{ display: "flex", gap: 6, marginTop: 4, marginBottom: 8 }}><input style={Object.assign({}, S.input, { flex: 1 })} id="campItemInput" placeholder="Nume produs / item..." onKeyDown={function(e) { if (e.key === "Enter" && e.target.value.trim()) { set("campaignItems", (f.campaignItems || []).concat([{ id: gid(), name: e.target.value.trim(), link: "" }])); e.target.value = ""; } }} /><button style={S.primBtn} onClick={function() { var el = document.getElementById("campItemInput"); if (el && el.value.trim()) { set("campaignItems", (f.campaignItems || []).concat([{ id: gid(), name: el.value.trim(), link: "" }])); el.value = ""; } }}><Ic d={Icons.plus} size={14} color="#fff" /></button></div>
    {(f.campaignItems || []).length > 0 && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>{(f.campaignItems || []).length} produse in campaign. La finalizare vei selecta cate ai completat.</div>}
    <label style={Object.assign({}, S.label, { marginTop: 12 })}>Descriere</label><textarea style={S.ta} value={f.description} onChange={function(e) { set("description", e.target.value); }} placeholder="Detalii..." />
    <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}><button style={S.cancelBtn} onClick={onClose}>Anuleaza</button><button style={S.primBtn} onClick={function() { if (f.title.trim()) { var toSave = Object.assign({}, f, { tags: f.tags || [] }); if (task) toSave.id = task.id; onSave(toSave); localStorage.removeItem("scout_task_draft"); } }}>{task ? "Salveaza" : "Creeaza"}</button></div>
  </div></div>;
}

function ViewTaskModal({ task, team, user, tasks, setTasks, timers, getTS, togTimer, products, onClose, onEdit, statusHistory, isAdmin }) {
  var [commentText, setCommentText] = useState(""); var t = tasks.find(function(x) { return x.id === task.id; }) || task; var a = team[t.assignee] || {}; var secs = getTS(t.id); var subtasks = t.subtasks || []; var comments = t.comments || []; var doneS = subtasks.filter(function(s) { return s.done; }).length;
  var addComment = function() { if (!commentText.trim()) return; setTasks(function(p) { return p.map(function(x) { return x.id === t.id ? Object.assign({}, x, { comments: (x.comments || []).concat([{ id: gid(), userId: user, text: commentText.trim(), time: ts() }]) }) : x; }); }); setCommentText(""); };
  var toggleSub = function(stId) { setTasks(function(p) { return p.map(function(x) { if (x.id !== t.id) return x; return Object.assign({}, x, { subtasks: (x.subtasks || []).map(function(s) { return s.id === stId ? Object.assign({}, s, { done: !s.done }) : s; }) }); }); }); };
  var hist = (statusHistory || {})[t.id] || [];
  var tis = {};
  for (var i2 = 0; i2 < hist.length; i2++) { var nx = hist[i2 + 1]; var dur = nx ? hDiff(hist[i2].at, nx.at) : (t.status !== "Done" ? hDiff(hist[i2].at, ts()) : 0); tis[hist[i2].status] = (tis[hist[i2].status] || 0) + Math.round(dur); }
  var deps = (t.dependsOn || []).map(function(depId) { return tasks.find(function(x) { return x.id === depId; }); }).filter(Boolean);
  var [showReplace, setShowReplace] = useState(false);
  var [replaceLink, setReplaceLink] = useState("");
  var [replaceNote, setReplaceNote] = useState("");
  var doReplace = function() {
    if (!replaceLink.trim()) return;
    setTasks(function(p) { return p.map(function(x) {
      if (x.id !== t.id) return x;
      var newLinks = (x.links || []).slice();
      return Object.assign({}, x, { _replacedLink: replaceLink.trim(), _replacedNote: replaceNote.trim(), _replacedBy: user, _originalLinks: x._originalLinks || newLinks.slice(), links: [replaceLink.trim()].concat(newLinks), updatedAt: ts() });
    }); });
    setShowReplace(false); setReplaceLink(""); setReplaceNote("");
  };

  return <div style={S.modalOv} onClick={onClose}><div style={Object.assign({}, S.modalBox, { maxWidth: 640 })} onClick={function(e) { e.stopPropagation(); }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}><div><h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{t.title}</h2><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Badge bg={SC[t.status] + "18"} color={SC[t.status]}>{t.status}</Badge><Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>{t.department && <Badge bg="#FFF7ED" color="#EA580C">{t.department}</Badge>}{(t.tags || []).map(function(tag) { return <Badge key={tag} bg="#ECFDF5" color={GR}>#{tag}</Badge>; })}{isOv(t) && <Badge bg="#FEF2F2" color="#DC2626">OVERDUE</Badge>}</div></div><button style={S.iconBtn} onClick={onClose}><Ic d={Icons.x} size={18} color="#94A3B8" /></button></div>
    {t.description && <div style={{ fontSize: 13, color: "#64748B", marginBottom: 12 }}>{t.description}</div>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginBottom: 16 }}><div><strong>Asignat:</strong> {a.name || "-"}</div><div><strong>Deadline:</strong> {t.deadline ? fd(t.deadline) : "-"}</div><div><strong>Magazin:</strong> {t.shop || "-"}</div><div><strong>Timp:</strong> {ft(secs)}</div>{t.platform && <div><strong>Platforma:</strong> {t.platform}</div>}{t.taskType && <div><strong>Tip:</strong> {t.taskType}</div>}{t.productName && <div><strong>Produs:</strong> {t.productName}</div>}{t.department && <div><strong>Departament:</strong> {t.department}</div>}<div><strong>Creat:</strong> {ff(t.createdAt)}</div>{t._finalizedCount != null && <div><strong>Finalizate:</strong> {t._finalizedCount}/{(t.campaignItems || []).length}</div>}</div>
    {t.productName && t.links && t.links.length > 0 && !t._replacedLink && ["dana", "carla", "mara_poze"].includes(t.assignee) && t._campaignParentId && <div style={{ marginBottom: 12, padding: "10px 14px", background: "#EFF6FF", borderRadius: 8, borderLeft: "3px solid #2563EB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>Link Produs</div>
        <a href={t.links[0]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#1D4ED8", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{t.links[0]}</a>
      </div>
      <a href={t.links[0]} target="_blank" rel="noopener noreferrer" style={Object.assign({}, S.primBtn, { background: "#2563EB", fontSize: 11, padding: "6px 12px", flexShrink: 0 })}><Ic d={Icons.ext} size={12} color="#fff" /> Deschide</a>
    </div>}
    {t._replacedLink && <div style={{ marginBottom: 12, padding: 10, background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid " + GR }}><div style={{ fontWeight: 600, fontSize: 12, color: GR, marginBottom: 4 }}>Link actualizat{t._replacedBy && team[t._replacedBy] ? " de " + team[t._replacedBy].name : ""}:</div><a href={t._replacedLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: GR, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Ic d={Icons.ext} size={12} color={GR} />{t._replacedLink}</a>{t._replacedNote && <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{t._replacedNote}</div>}</div>}
    {t.links && t.links.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontWeight: 700, fontSize: 11, marginBottom: 8, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 5 }}><Ic d={Icons.link} size={11} color="#475569" />{t._replacedLink ? "Linkuri (" + t.links.length + ")" : "Linkuri (" + t.links.length + ")"}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{t.links.map(function(l, i) { var isReplaced = t._originalLinks && t._originalLinks.includes(l) && t._replacedLink && l !== t._replacedLink; var domain = ""; try { domain = new URL(l).hostname.replace("www.", ""); } catch(e) { domain = l.slice(0, 30); } return <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: isReplaced ? "#F8FAFC" : "#F0F9FF", border: "1px solid " + (isReplaced ? "#E2E8F0" : "#BFDBFE"), opacity: isReplaced ? 0.5 : 1 }}><Ic d={Icons.link} size={12} color={isReplaced ? "#94A3B8" : "#2563EB"} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, marginBottom: 1 }}>{domain}{isReplaced ? " (inlocuit)" : ""}</div><div style={{ fontSize: 11, color: isReplaced ? "#94A3B8" : "#1D4ED8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isReplaced ? "line-through" : "none" }}>{l}</div></div><a href={l} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, background: isReplaced ? "#F1F5F9" : "#2563EB", color: isReplaced ? "#94A3B8" : "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}><Ic d={Icons.ext} size={11} color={isReplaced ? "#94A3B8" : "#fff"} /> Deschide</a></div>; })}</div></div>}
    {user === "dana" && t.assignee === user && t.status !== "Done" && <div style={{ marginBottom: 12 }}>{!showReplace && <button style={Object.assign({}, S.primBtn, { background: "#D97706", fontSize: 12 })} onClick={function() { setShowReplace(true); }}>Am schimbat produsul / Link nou</button>}{showReplace && <Card style={{ background: "#FFFBEB", borderLeft: "3px solid #D97706" }}><label style={S.label}>Link produs nou</label><input style={S.input} value={replaceLink} onChange={function(e) { setReplaceLink(e.target.value); }} placeholder="https://..." /><label style={S.label}>Observatie (optional)</label><input style={S.input} value={replaceNote} onChange={function(e) { setReplaceNote(e.target.value); }} placeholder="Ex: Nu am gasit, am schimbat cu..." /><div style={{ display: "flex", gap: 8, marginTop: 8 }}><button style={S.primBtn} onClick={doReplace}>Salveaza link nou</button><button style={S.cancelBtn} onClick={function() { setShowReplace(false); }}>Anuleaza</button></div></Card>}</div>}
    {t.campaignItems && t.campaignItems.length > 0 && <div style={{ marginBottom: 12, padding: 10, background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid " + GR }}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Campaign ({t.campaignItems.length} produse){t._finalizedCount != null && <span style={{ marginLeft: 8, color: GR }}>- {t._finalizedCount} finalizate</span>}</div>{t.campaignItems.map(function(ci, i) { return <div key={ci.id || i} style={{ fontSize: 12, padding: "5px 4px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #ECFDF5" }}><span style={{ color: "#94A3B8", width: 20, flexShrink: 0 }}>{i + 1}.</span><span style={{ flex: 1, fontWeight: 500 }}>{ci.name}</span>{ci.link && <a href={ci.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#2563EB", display: "flex", alignItems: "center", gap: 3, flexShrink: 0, padding: "2px 8px", background: "#EFF6FF", borderRadius: 4, fontWeight: 600 }}><Ic d={Icons.ext} size={9} color="#2563EB" /> Link</a>}</div>; })}</div>}
    {Object.keys(tis).length > 0 && <div style={{ marginBottom: 12, padding: 10, background: "#F8FAFC", borderRadius: 8 }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Timp per status:</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(tis).map(function(e) { return <Badge key={e[0]} bg={(SC[e[0]] || "#94A3B8") + "18"} color={SC[e[0]] || "#94A3B8"}>{e[0]}: {e[1]}h</Badge>; })}</div></div>}
    {deps.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Depinde de:</div>{deps.map(function(d) { return <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 0" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: SC[d.status] }} /><span>{d.title}</span><Badge bg={(SC[d.status] || "#94A3B8") + "18"} color={SC[d.status] || "#94A3B8"}>{d.status}</Badge></div>; })}</div>}
    {subtasks.length > 0 && <div style={{ marginBottom: 12, borderTop: "1px solid #F1F5F9", paddingTop: 12 }}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Subtaskuri ({doneS}/{subtasks.length})</div><div style={Object.assign({}, S.progBg, { marginBottom: 8 })}><div style={S.progBar(doneS === subtasks.length ? GR : "#D97706", subtasks.length > 0 ? (doneS / subtasks.length) * 100 : 0)} /></div>{subtasks.map(function(st) { return <div key={st.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 13, cursor: "pointer" }} onClick={function() { toggleSub(st.id); }}><span style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid " + (st.done ? GR : "#CBD5E1"), background: st.done ? GR : "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, flexShrink: 0 }}>{st.done ? "*" : ""}</span><span style={{ textDecoration: st.done ? "line-through" : "none", color: st.done ? "#94A3B8" : "#1E293B" }}>{st.text}</span></div>; })}</div>}
    <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 12 }}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Ic d={Icons.comment} size={14} color="#64748B" /> Comentarii ({comments.length})</div><div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>{comments.map(function(c) { var cu = team[c.userId] || {}; var isMine = c.userId === user; return <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 6 }}><div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 2 }}>{cu.name || "?"} | {fr(c.time)}</div><div style={{ padding: "6px 12px", borderRadius: 10, maxWidth: "80%", background: isMine ? GR : "#F1F5F9", color: isMine ? "#fff" : "#1E293B", fontSize: 13 }}>{c.text}</div></div>; })}</div><div style={{ display: "flex", gap: 6 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={commentText} onChange={function(e) { setCommentText(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addComment(); }} placeholder="Comentariu..." /><button style={S.primBtn} onClick={addComment}>Trimite</button></div></div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}><button style={S.cancelBtn} onClick={onEdit}>Editeaza</button><button style={S.primBtn} onClick={onClose}>Inchide</button></div>
  </div></div>;
}

function CampaignFinalizeModal({ task, onFinalize, onClose }) {
  var [count, setCount] = useState((task.campaignItems || []).length);
  var total = (task.campaignItems || []).length;
  return <div style={S.modalOv} onClick={onClose}><div style={Object.assign({}, S.modalBox, { maxWidth: 440 })} onClick={function(e) { e.stopPropagation(); }}>
    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Finalizeaza Campaign</h2>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{task.title}</div>
    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>{total} produse in campaign:</div>
    <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>{(task.campaignItems || []).map(function(ci, i) { return <div key={ci.id || i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 2, background: "#F8FAFC", fontSize: 12 }}><span style={{ color: "#94A3B8", width: 22 }}>{i + 1}.</span><span style={{ flex: 1 }}>{ci.name}</span></div>; })}</div>
    <label style={S.label}>Cate ai finalizat?</label>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}><input style={Object.assign({}, S.input, { width: 100, fontSize: 20, fontWeight: 700, textAlign: "center" })} type="number" min="0" max={total} value={count} onChange={function(e) { var v = parseInt(e.target.value) || 0; setCount(Math.min(v, total)); }} /><span style={{ fontSize: 14, color: "#64748B" }}>/ {total} produse</span></div>
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
