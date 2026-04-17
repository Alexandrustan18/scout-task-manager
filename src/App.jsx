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
var DEF_PLATFORMS = ["Meta Ads", "TikTok Ads", "Google Ads", "Shopify", "Creativ", "UGC", "Foto Produs", "Altele"];
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
var _globalUserXP = {}; // shared ref for Av component to read levels

// ═══ LEVEL SYSTEM GLOBALS ═══
var LEVEL_THRESHOLDS = [0, 50, 120, 210, 320, 450, 600, 780, 980, 1200, 1450, 1730, 2040, 2380, 2750, 3150, 3600, 4100, 4650, 5250, 5900, 6600, 7350, 8150, 9000, 9900, 10850, 11850, 12900, 14000, 15200, 16500, 17900, 19400, 21000, 22700, 24500, 26400, 28400, 30500, 32700, 35000, 37400, 39900, 42500, 45200, 48000, 50900, 53900, 57000];
var LEVEL_TITLES = ["Recrut", "Incepator", "Novice", "Ucenic", "Apprentice", "Junior", "Cadet", "Operator", "Specialist", "Avansat", "Profesionist", "Expert", "Veteran", "Senior", "Elite", "Master", "Grandmaster", "Champion", "Hero", "Legend", "Mythic", "Immortal", "Titan", "Overlord", "Supreme", "Ascendant", "Celestial", "Transcendent", "Omniscient", "Apex", "Ethereal", "Quantum", "Cosmic", "Stellar", "Galactic", "Universal", "Infinite", "Eternal", "Divine", "Absolute", "Omega", "Alpha Supreme", "Ultra", "Mega", "Giga", "Tera", "Peta", "Exa", "Zetta", "GOAT"];
function getLevel(xp) { var lvl = 0; for (var i = 0; i < LEVEL_THRESHOLDS.length; i++) { if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1; else break; } return Math.min(lvl, 50); }
function getLevelTitle(lvl) { return LEVEL_TITLES[Math.min(Math.max(lvl - 1, 0), LEVEL_TITLES.length - 1)]; }
function getLevelProgress(xp) { var lvl = getLevel(xp); if (lvl >= 50) return 100; var current = LEVEL_THRESHOLDS[lvl - 1] || 0; var next = LEVEL_THRESHOLDS[lvl] || current + 100; return Math.round(((xp - current) / (next - current)) * 100); }
function getLevelColor(lvl) { if (lvl >= 40) return "#7C3AED"; if (lvl >= 30) return "#EAB308"; if (lvl >= 20) return "#3B82F6"; if (lvl >= 10) return "#10B981"; return "#94A3B8"; }

// FEATURE 10: Achievements definitions
var TIERS = { bronze: { color: "#CD7F32", bg: "#FEF3C7", name: "Bronze" }, silver: { color: "#94A3B8", bg: "#F1F5F9", name: "Silver" }, gold: { color: "#EAB308", bg: "#FEFCE8", name: "Gold" }, platinum: { color: "#7C3AED", bg: "#F3E8FF", name: "Platinum" } };

var ACHIEVEMENTS = [
  // GENERAL - all roles
  { id: "first_task", name: "Prima Sarcina", title: "Recrut", desc: "Primul task completat", icon: "🎯", threshold: 1, type: "done_count", tier: "bronze", role: "all" },
  { id: "ten_done", name: "Productiv", title: "Muncitor", desc: "10 taskuri completate", icon: "⚡", threshold: 10, type: "done_count", tier: "bronze", role: "all" },
  { id: "fifty_done", name: "Masina de Lucru", title: "Veteran", desc: "50 taskuri completate", icon: "🔥", threshold: 50, type: "done_count", tier: "silver", role: "all" },
  { id: "hundred_done", name: "Century Club", title: "Elite", desc: "100 taskuri completate", icon: "💯", threshold: 100, type: "done_count", tier: "gold", role: "all" },
  { id: "five_hundred_done", name: "Legend", title: "Legenda", desc: "500 taskuri completate", icon: "👑", threshold: 500, type: "done_count", tier: "platinum", role: "all" },

  // STREAKS
  { id: "streak_3", name: "Warming Up", title: "Consistent", desc: "3 zile consecutive cu target atins", icon: "📅", threshold: 3, type: "streak", tier: "bronze", role: "all" },
  { id: "streak_7", name: "Saptamana Perfecta", title: "Unstoppable", desc: "7 zile consecutive cu target", icon: "🏆", threshold: 7, type: "streak", tier: "silver", role: "all" },
  { id: "streak_14", name: "Two Week Storm", title: "Storm", desc: "14 zile consecutive", icon: "⚡", threshold: 14, type: "streak", tier: "gold", role: "all" },
  { id: "streak_30", name: "Month of Fire", title: "Inferno", desc: "30 zile consecutive - record!", icon: "🔥", threshold: 30, type: "streak", tier: "platinum", role: "all" },

  // QUALITY
  { id: "no_overdue", name: "Zero Intarzieri", title: "Punctual", desc: "Niciun task overdue in prezent", icon: "✅", threshold: 0, type: "no_overdue", tier: "silver", role: "all" },
  { id: "speed_demon", name: "Speed Demon", title: "Quick Draw", desc: "Task completat in sub 1h", icon: "💨", threshold: 3600, type: "fast_complete", tier: "bronze", role: "all" },
  { id: "perfectionist", name: "Perfectionist", title: "Perfect", desc: "20 taskuri done fara overdue", icon: "💎", threshold: 20, type: "perfect_count", tier: "gold", role: "all" },
  { id: "early_bird", name: "Early Bird", title: "Matinal", desc: "Login inainte de 9:00 - 5 ori", icon: "🌅", threshold: 5, type: "early_login", tier: "bronze", role: "all" },
  { id: "night_owl", name: "Night Owl", title: "Nocturn", desc: "Taskuri finalizate dupa 20:00 - 10 ori", icon: "🦉", threshold: 10, type: "late_done", tier: "bronze", role: "all" },

  // ROLE-SPECIFIC - MEMBERS (creative work)
  { id: "foto_ninja_10", name: "Foto Ninja", title: "Ninja Fotograf", desc: "10 taskuri Foto Produs completate", icon: "📸", threshold: 10, type: "type_count:Foto Produs", tier: "silver", role: "member" },
  { id: "foto_master_50", name: "Foto Master", title: "Maestrul Lentilei", desc: "50 taskuri Foto Produs", icon: "🎨", threshold: 50, type: "type_count:Foto Produs", tier: "gold", role: "member" },
  { id: "product_launcher", name: "Product Launcher", title: "Launcher", desc: "25 Product Launch completate", icon: "🚀", threshold: 25, type: "type_count:Product Launch", tier: "silver", role: "member" },
  { id: "creative_genius", name: "Creative Genius", title: "Geniu Creativ", desc: "30 Creative/Copy taskuri", icon: "💡", threshold: 30, type: "creative_count", tier: "gold", role: "member" },
  { id: "target_smasher", name: "Target Smasher", title: "Destructorul", desc: "Depasit targetul cu 50% - 5 zile", icon: "💥", threshold: 5, type: "target_overshoot", tier: "gold", role: "member" },

  // ROLE-SPECIFIC - PM
  { id: "pm_organizer", name: "Organizator", title: "Organizator", desc: "50 taskuri create in echipa", icon: "📋", threshold: 50, type: "created_count", tier: "silver", role: "pm" },
  { id: "pm_commander", name: "Commander", title: "Comandantul", desc: "200 taskuri create", icon: "🎖️", threshold: 200, type: "created_count", tier: "gold", role: "pm" },
  { id: "pm_mentor", name: "Mentor", title: "Mentor", desc: "Toata echipa cu target atins 1 zi", icon: "🧙", threshold: 1, type: "team_target", tier: "gold", role: "pm" },
  { id: "pm_efficiency", name: "Efficiency Expert", title: "Eficientul", desc: "Echipa - 0 overdue 7 zile", icon: "⚙️", threshold: 7, type: "team_clean", tier: "platinum", role: "pm" },

  // COMPETITIVE
  { id: "mvp_day", name: "MVP al Zilei", title: "MVP", desc: "Cel mai activ din echipa intr-o zi", icon: "🥇", threshold: 1, type: "mvp_day", tier: "gold", role: "all" },
  { id: "top_week", name: "Top Performer", title: "Top Gun", desc: "Top 1 saptamana", icon: "🏅", threshold: 1, type: "top_week", tier: "gold", role: "all" },
  { id: "comeback", name: "Comeback King", title: "Comeback", desc: "Target atins dupa 3 zile sub target", icon: "🔄", threshold: 1, type: "comeback", tier: "silver", role: "all" },
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
function isOnLeave(leaves, userId, date) {
  if (!leaves || !userId) return false;
  var userLeaves = leaves[userId] || [];
  var d = date ? (typeof date === "string" ? date : ds(date)) : TD;
  return userLeaves.includes(d);
}

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

var CSS = "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{margin:0;background:#FAFAFA;font-family:system-ui,-apple-system,sans-serif}::selection{background:#0C7E3E22}input:focus,select:focus,textarea:focus{border-color:#0C7E3E !important;outline:none;box-shadow:0 0 0 3px #0C7E3E18}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:10px}button{cursor:pointer;font-family:inherit}button:hover{opacity:0.9}a{text-decoration:none}@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}@keyframes toastIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}@keyframes toastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-20px)}}@keyframes badgePop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}@keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}@keyframes celebratePulse{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(16,185,129,0.4)}50%{transform:scale(1.05);box-shadow:0 0 20px 10px rgba(16,185,129,0.1)}100%{transform:scale(1);box-shadow:0 0 0 0 rgba(16,185,129,0)}}@keyframes targetBurst{0%{transform:scale(0.8);opacity:0}50%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}thead.sticky-header th{position:sticky;top:0;z-index:10;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,0.05)}";

function Badge({ bg, color, children }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: bg, color: color, whiteSpace: "nowrap" }}>{children}</span>; }
function Av({ color, size, fs, children, level, userId }) { var s = size || 32; var lvl = level || (userId && _globalUserXP[userId] ? getLevel(_globalUserXP[userId]) : 0); var showBadge = lvl > 0 && s >= 16; return <div style={{ width: s, height: s, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs || 13, fontWeight: 700, color: "#fff", flexShrink: 0, position: "relative" }}>{children}{showBadge && <div style={{ position: "absolute", bottom: s > 28 ? -4 : -3, right: s > 28 ? -4 : -3, background: getLevelColor(lvl), color: "#fff", fontSize: s > 28 ? 8 : 7, fontWeight: 800, padding: s > 28 ? "1px 4px" : "0px 3px", borderRadius: 4, border: s > 28 ? "1.5px solid #fff" : "1px solid #fff", lineHeight: 1.3, minWidth: s > 28 ? 14 : 10, textAlign: "center" }}>{lvl}</div>}</div>; }
function Card({ children, style, onClick, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp }) { return <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onMouseDown={onMouseDown} onMouseUp={onMouseUp} style={{ background: "#fff", border: "1px solid hsl(214,18%,90%)", borderRadius: 10, padding: 16, animation: "fadeUp 0.2s", ...style }}>{children}</div>; }

function Ic({ d, size, color }) { return <svg width={size || 20} height={size || 20} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>; }
var Icons = {
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  upload: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
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
  var [dateF, setDateF] = useState("today");
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
  var [platforms, setPlatforms] = useState(DEF_PLATFORMS);
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
  var [leaves, setLeaves] = useState({});
  var [leaveRequests, setLeaveRequests] = useState([]);
  var [branding, setBranding] = useState({ title: "HeyAds", subtitle: "TASK MANAGER", logo: "", favicon: "" });
  // Pipeline Builder rules
  var [pipelineRules, setPipelineRules] = useState([]);
  // Sound & celebration settings
  var [soundEnabled, setSoundEnabled] = useState(function() { try { return localStorage.getItem("s7_sound") !== "off"; } catch(e) { return true; } });
  var [celebration, setCelebration] = useState(null);
  // Undo stack - last 10 actions
  var [undoStack, setUndoStack] = useState([]);
  // User XP & Levels
  var [userXP, setUserXP] = useState({});
  // Monthly bonus reward
  var [monthlyBonus, setMonthlyBonus] = useState({ amount: 0, currency: "RON", enabled: false });
  var [expandedGroups, setExpandedGroups] = useState(function() {
    try { var saved = localStorage.getItem("s7_nav_groups"); if (saved) return JSON.parse(saved); } catch(e) {}
    return { "Operational": true, "Echipa": true, "Comunicare": false, "Configurare": false };
  });

  useEffect(function() {
    async function loadAll() {
      var [t, tk, lg, se, sh, pr, tm, tpl, tgt, sht, nf, tt, dp, lt, rc, stH, pa, at, ach, dc, lh, ann, sl, lv, brd, plf, plr, uxp, mb, lr] = await Promise.all([
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
        cloudLoad("leaves", {}),
        cloudLoad("leaveRequests", []),
        cloudLoad("branding", { title: "HeyAds", subtitle: "TASK MANAGER", logo: "", favicon: "" }),
        cloudLoad("platforms", DEF_PLATFORMS),
        cloudLoad("pipelineRules", []),
        cloudLoad("userXP", {}),
        cloudLoad("monthlyBonus", { amount: 0, currency: "RON", enabled: false }),
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
      if (plf && plf.length > 0) setPlatforms(plf); else { setPlatforms(DEF_PLATFORMS); cloudSave("platforms", DEF_PLATFORMS); }
      setPipelineRules(plr || []);
      setUserXP(uxp || {});
      if (mb) setMonthlyBonus(mb);
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
      setLeaves(lv || {});
      setLeaveRequests(lr || []);
      if (brd) setBranding(brd);
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

  // Auto-stop timers that are running on hidden/invalid tasks
  useEffect(function() {
    if (loading || tasks.length === 0) return;
    var needsUpdate = false;
    var newTimers = Object.assign({}, timers);
    Object.keys(timers).forEach(function(tid) {
      var tm = timers[tid];
      if (!tm || !tm.running) return;
      var t = tasks.find(function(x) { return x.id === tid; });
      // Stop if task doesn't exist, is a campaign parent, or not In Progress
      if (!t || t._campaignParent === true || t.status !== "In Progress") {
        var el = tm.startedAt ? Math.floor((Date.now() - new Date(tm.startedAt).getTime()) / 1000) : 0;
        newTimers[tid] = { running: false, total: (tm.total || 0) + el, startedAt: null };
        needsUpdate = true;
      }
    });
    if (needsUpdate) setTimers(newTimers);
  }, [tasks, loading]);
  useEffect(function() { if (!loading) debouncedSave("templates", templates, 1000); }, [templates]);
  useEffect(function() { if (!loading) debouncedSave("targets", targets, 1000); }, [targets]);
  useEffect(function() { if (!loading) debouncedSave("sheets", sheets, 1000); }, [sheets]);
  useEffect(function() { if (!loading) debouncedSave("notifs", notifications, 2000); }, [notifications]);
  useEffect(function() { if (!loading) debouncedSave("taskTypes", taskTypes, 1000); }, [taskTypes]);
  useEffect(function() { if (!loading) debouncedSave("departments", departments, 1000); }, [departments]);
  useEffect(function() { if (!loading) debouncedSave("platforms", platforms, 1000); }, [platforms]);
  useEffect(function() { if (!loading) debouncedSave("pipelineRules", pipelineRules, 1000); }, [pipelineRules]);
  useEffect(function() { if (!loading) debouncedSave("userXP", userXP, 1000); _globalUserXP = userXP || {}; }, [userXP]);
  useEffect(function() { if (!loading) debouncedSave("monthlyBonus", monthlyBonus, 1000); }, [monthlyBonus]);
  useEffect(function() { try { localStorage.setItem("s7_sound", soundEnabled ? "on" : "off"); } catch(e) {} }, [soundEnabled]);
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
  useEffect(function() { if (!loading) debouncedSave("leaves", leaves, 1000); }, [leaves]);
  useEffect(function() { if (!loading) debouncedSave("leaveRequests", leaveRequests, 1000); }, [leaveRequests]);
  useEffect(function() { if (!loading) debouncedSave("branding", branding, 1000); }, [branding]);
  useEffect(function() { try { localStorage.setItem("s7_nav_groups", JSON.stringify(expandedGroups)); } catch(e) {} }, [expandedGroups]);
  // Apply favicon dynamically
  useEffect(function() {
    if (!branding || !branding.favicon) return;
    var existing = document.querySelector("link[rel='icon']");
    if (existing) existing.href = branding.favicon;
    else {
      var link = document.createElement("link"); link.rel = "icon"; link.href = branding.favicon;
      document.head.appendChild(link);
    }
    if (branding.title) document.title = branding.title;
  }, [branding]);

  // Auto-backup: daily snapshot of all tasks
  var [taskBackups, setTaskBackups] = useState([]);
  useEffect(function() {
    cloudLoad("taskBackups", []).then(function(d) { setTaskBackups(d || []); });
  }, []);
  useEffect(function() { if (!loading) debouncedSave("taskBackups", taskBackups, 3000); }, [taskBackups]);
  // Auto snapshot every 30 min when tasks change, keeping max 50 snapshots
  var lastBackupRef = useRef(0);
  useEffect(function() {
    if (loading || tasks.length === 0) return;
    var now = Date.now();
    if (now - lastBackupRef.current < 30 * 60 * 1000) return; // 30 min cooldown
    lastBackupRef.current = now;
    setTaskBackups(function(prev) {
      var snapshot = { id: gid(), at: ts(), count: tasks.length, by: user || "system", tasks: JSON.parse(JSON.stringify(tasks)) };
      var next = [snapshot].concat(prev).slice(0, 50);
      return next;
    });
  }, [tasks, loading]);

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
    if (!team[forUser]) return;
    var userRole = team[forUser].role || "member";
    var userTasks = tasks.filter(function(t) { return t.assignee === forUser && !t._campaignParent; });
    var doneTasks = userTasks.filter(function(t) { return t.status === "Done"; });
    var doneCount = doneTasks.length;
    var existing = achievements[forUser] || [];
    var newOnes = [];

    // Compute streak
    var streakCount = 0;
    var userTargets = (targets || []).filter(function(t) { return t.userId === forUser && t.active !== false; });
    if (userTargets.length > 0) {
      for (var sd = 0; sd < 60; sd++) {
        var sdt = new Date(); sdt.setDate(sdt.getDate() - sd);
        var sdow = sdt.getDay();
        if (sdow === 0 || sdow === 6) continue;
        if (isOnLeave(leaves, forUser, ds(sdt))) continue;
        var tgt = userTargets[0];
        var doneDay = userTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === ds(sdt); }).length;
        if (doneDay >= (tgt.target || 0)) streakCount++;
        else break;
      }
    }

    // Created count (for PM)
    var createdCount = tasks.filter(function(t) { return t.createdBy === forUser; }).length;

    // Fast complete - any task done in < 1h
    var hasFastComplete = doneTasks.some(function(t) {
      var tm = timers[t.id];
      return tm && tm.total > 0 && tm.total < 3600;
    });

    // Type-specific counts
    var typeCount = {};
    doneTasks.forEach(function(t) {
      var tp = t.taskType || "General";
      typeCount[tp] = (typeCount[tp] || 0) + 1;
    });
    var creativeCount = (typeCount["Creative"] || 0) + (typeCount["Copy"] || 0);

    // Overdue count
    var currentOverdue = userTasks.filter(function(t) { return isOv(t); }).length;

    // Perfect count (done without overdue)
    var perfectCount = doneTasks.filter(function(t) { return !t.deadline || new Date(t.updatedAt || 0) <= new Date(t.deadline + "T23:59:59"); }).length;

    // Early logins (before 9:00)
    var earlyLogins = 0;
    if (loginHistory && loginHistory.length) {
      var userLogins = loginHistory.filter(function(l) { return l.user === forUser; });
      var daysSeen = {};
      userLogins.forEach(function(l) {
        var dt = new Date(l.at);
        var dayKey = ds(dt);
        if (daysSeen[dayKey]) return;
        if (dt.getHours() < 9) { earlyLogins++; daysSeen[dayKey] = true; }
      });
    }

    // Late done (after 20:00)
    var lateDone = doneTasks.filter(function(t) {
      if (!t.updatedAt) return false;
      var dt = new Date(t.updatedAt);
      return dt.getHours() >= 20;
    }).length;

    // Team target (PM only)
    var teamTargetMet = false;
    if (userRole === "pm" && team[forUser].team) {
      var teamMembers = team[forUser].team;
      teamTargetMet = teamMembers.length > 0 && teamMembers.every(function(m) {
        var mTgts = (targets || []).filter(function(t) { return t.userId === m && t.active !== false; });
        if (mTgts.length === 0) return false;
        var mTgt = mTgts[0];
        var mDone = tasks.filter(function(t) { return t.assignee === m && t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD && !t._campaignParent; }).length;
        return mDone >= (mTgt.target || 0);
      });
    }

    // Team clean (PM - 7 days no overdue across team)
    var teamClean7 = false;
    if (userRole === "pm" && team[forUser].team) {
      var teamMembers2 = team[forUser].team;
      var cleanDays = 0;
      for (var cd = 0; cd < 7; cd++) {
        var cdt = new Date(); cdt.setDate(cdt.getDate() - cd);
        var cdStr = ds(cdt);
        var hadOverdueThatDay = tasks.some(function(t) {
          return teamMembers2.includes(t.assignee) && t.deadline === cdStr && t.status !== "Done" && !t._campaignParent;
        });
        if (!hadOverdueThatDay) cleanDays++; else break;
      }
      teamClean7 = cleanDays >= 7;
    }

    ACHIEVEMENTS.forEach(function(ach) {
      if (existing.includes(ach.id)) return;
      if (ach.role !== "all" && ach.role !== userRole) return;

      var earned = false;
      if (ach.type === "done_count" && doneCount >= ach.threshold) earned = true;
      else if (ach.type === "no_overdue" && currentOverdue === 0 && doneCount > 0) earned = true;
      else if (ach.type === "fast_complete" && hasFastComplete) earned = true;
      else if (ach.type === "streak" && streakCount >= ach.threshold) earned = true;
      else if (ach.type === "perfect_count" && perfectCount >= ach.threshold) earned = true;
      else if (ach.type === "early_login" && earlyLogins >= ach.threshold) earned = true;
      else if (ach.type === "late_done" && lateDone >= ach.threshold) earned = true;
      else if (ach.type === "created_count" && createdCount >= ach.threshold) earned = true;
      else if (ach.type === "creative_count" && creativeCount >= ach.threshold) earned = true;
      else if (ach.type === "team_target" && teamTargetMet) earned = true;
      else if (ach.type === "team_clean" && teamClean7) earned = true;
      else if (ach.type && ach.type.indexOf("type_count:") === 0) {
        var wanted = ach.type.replace("type_count:", "");
        if ((typeCount[wanted] || 0) >= ach.threshold) earned = true;
      }

      if (earned) newOnes.push(ach);
    });

    if (newOnes.length > 0) {
      setAchievements(function(p) { var n = Object.assign({}, p); n[forUser] = (n[forUser] || []).concat(newOnes.map(function(a) { return a.id; })); return n; });
      if (forUser === user) setAchievementPopup(newOnes[0]);
    }
  }, [tasks, achievements, user, team, timers, targets, leaves, loginHistory]);

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

  // Sound effects
  var playSound = function(type) {
    if (!soundEnabled) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.08;
      if (type === "done") { osc.frequency.value = 880; osc.type = "sine"; gain.gain.setValueAtTime(0.08, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3); }
      else if (type === "notify") { osc.frequency.value = 660; osc.type = "sine"; gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15); }
      else if (type === "target") { osc.frequency.value = 523; osc.type = "sine"; gain.gain.setValueAtTime(0.08, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5); var osc2 = ctx.createOscillator(); var g2 = ctx.createGain(); osc2.connect(g2); g2.connect(ctx.destination); osc2.frequency.value = 784; osc2.type = "sine"; g2.gain.setValueAtTime(0.08, ctx.currentTime + 0.15); g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); osc2.start(ctx.currentTime + 0.15); osc2.stop(ctx.currentTime + 0.5); }
      else if (type === "levelup") { var notes = [523, 659, 784, 1047]; notes.forEach(function(freq, i) { var o = ctx.createOscillator(); var g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = freq; o.type = "sine"; g.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.12); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3); o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.3); }); }
    } catch(e) {}
  };

  // Celebration confetti
  var triggerCelebration = function(type) {
    setCelebration({ type: type, id: gid() });
    if (type === "done") playSound("done");
    if (type === "target") playSound("target");
    setTimeout(function() { setCelebration(null); }, 2000);
  };

  // Pipeline rules executor
  var executePipelineRules = function(task, newStatus) {
    if (newStatus !== "Done" || !pipelineRules || pipelineRules.length === 0) return;
    pipelineRules.forEach(function(rule) {
      if (!rule.active) return;
      var match = true;
      if (rule.triggerStatus && rule.triggerStatus !== newStatus) match = false;
      if (rule.triggerAssignee && rule.triggerAssignee !== task.assignee) match = false;
      if (rule.triggerTaskType && rule.triggerTaskType !== task.taskType) match = false;
      if (rule.triggerShop && rule.triggerShop !== task.shop) match = false;
      if (rule.triggerDepartment && rule.triggerDepartment !== task.department) match = false;
      if (!match) return;
      // Check if pipeline task already exists for this source
      var exists = tasks.find(function(t) { return t._pipelineRuleId === rule.id && t.dependsOn && t.dependsOn.includes(task.id); });
      if (exists) return;
      var newDeadline = TD;
      if (rule.deadlineOffset) { var d = new Date(); d.setDate(d.getDate() + (parseInt(rule.deadlineOffset) || 1)); newDeadline = ds(d); }
      var pipeTask = { id: gid(), title: (rule.newTitlePrefix || "") + task.title + (rule.newTitleSuffix || ""), description: rule.newDescription || task.description || "", assignee: rule.targetAssignee || task.assignee, status: "To Do", priority: rule.newPriority || task.priority, platform: rule.newPlatform || task.platform || "", taskType: rule.newTaskType || task.taskType || "", department: rule.newDepartment || task.department || "", shop: task.shop, product: task.product || "", productName: task.productName || "", deadline: newDeadline, links: (task.links || []).slice(), subtasks: [], comments: [], tags: [], dependsOn: [task.id], campaignItems: [], createdBy: "system", createdAt: ts(), updatedAt: ts(), _campaignParentId: task._campaignParentId || "", _fromPipeline: task.id, _pipelineRuleId: rule.id };
      setTasks(function(p) { return [pipeTask].concat(p); });
      setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[pipeTask.id] = [{ status: "To Do", at: ts() }]; return n; });
      addNotif("pipeline", "Pipeline: \"" + pipeTask.title + "\"", pipeTask.id, rule.targetAssignee);
      addLog("PIPELINE", "Rule \"" + rule.name + "\": " + task.title + " -> " + pipeTask.title);
    });
  };

  // ═══ UNDO SYSTEM ═══
  var pushUndo = function(action, data) {
    setUndoStack(function(p) { return [{ id: gid(), action: action, data: data, time: ts() }].concat(p).slice(0, 10); });
  };
  var performUndo = function() {
    if (undoStack.length === 0) return;
    var last = undoStack[0];
    if (last.action === "DELETE_TASK" && last.data) {
      setTasks(function(p) { return [last.data].concat(p); });
      addLog("UNDO", "Restaurat task: \"" + last.data.title + "\"");
    } else if (last.action === "STATUS_CHANGE" && last.data) {
      setTasks(function(p) { return p.map(function(t) { return t.id === last.data.taskId ? Object.assign({}, t, { status: last.data.oldStatus, updatedAt: ts() }) : t; }); });
      addLog("UNDO", "Status revenit: \"" + last.data.title + "\" -> " + last.data.oldStatus);
    } else if (last.action === "EDIT_TASK" && last.data) {
      setTasks(function(p) { return p.map(function(t) { return t.id === last.data.id ? last.data : t; }); });
      addLog("UNDO", "Edit revenit: \"" + last.data.title + "\"");
    }
    setUndoStack(function(p) { return p.slice(1); });
    playSound("notify");
  };

  // ═══ XP & LEVEL SYSTEM ═══
  var XP_PER_TASK = { "Ad Creation": 15, "Product Launch": 20, "Creative": 12, "Copy": 10, "Landing Page": 18, "Tracking/Pixel": 15, "Foto Produs": 12, "Raportare": 8, "General": 10 };
  var XP_BONUS = { fast: 5, streak_day: 10, no_overdue: 15, target_hit: 25 };

  var awardXP = function(userId, amount, reason) {
    if (!userId || amount <= 0) return;
    var oldXP = (userXP || {})[userId] || 0;
    var newXP = oldXP + amount;
    var oldLevel = getLevel(oldXP);
    var newLevel = getLevel(newXP);
    setUserXP(function(p) { var n = Object.assign({}, p); n[userId] = newXP; return n; });
    if (newLevel > oldLevel && userId === user) {
      playSound("levelup");
      setCelebration({ type: "levelup", id: gid(), level: newLevel, title: getLevelTitle(newLevel) });
      setTimeout(function() { setCelebration(null); }, 3000);
    }
  };

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
    return tasks.filter(function(t) {
      // Only hide tasks explicitly marked as campaign parents
      if (t._campaignParent === true) return false;
      // For pipeline tasks, only check assignee (not createdBy) so previous assignee doesn't see them
      if (t._fromPipeline) return visUsers.includes(t.assignee);
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
      if (dateF === "today" && !(isTd(t.deadline) || (t.createdAt && isTd(t.createdAt)))) return false;
      if (dateF === "yesterday") {
        var yDate = new Date(); yDate.setDate(yDate.getDate() - 1); var yStr = ds(yDate);
        var matchDl = t.deadline === yStr;
        var matchCr = t.createdAt && ds(t.createdAt) === yStr;
        if (!matchDl && !matchCr) return false;
      }
      if (dateF === "tomorrow" && !isTm(t.deadline)) return false;
      if (dateF === "overdue" && !isOv(t)) return false;
      if (dateF === "upcoming" && !isF(t.deadline)) return false;
      if (dateF === "nodate" && t.deadline) return false;
      return true;
    });
  }, [visTasks, statusF, prioF, assignF, shopF, dateF, tagFilter]);

  var stats = useMemo(function() {
    // Stats use filtered tasks (respect date filter), total uses visTasks
    var s = { total: filtered.length, today: 0, overdue: 0, inProg: 0, done: 0, review: 0 };
    filtered.forEach(function(t) { if (isTd(t.deadline)) s.today++; if (isOv(t)) s.overdue++; if (t.status === "In Progress") s.inProg++; if (t.status === "Done") s.done++; if (t.status === "Review") s.review++; });
    return s;
  }, [filtered]);

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

  var delTask = function(tid) { var t = tasks.find(function(x) { return x.id === tid; }); if (t) { pushUndo("DELETE_TASK", Object.assign({}, t)); addLog("DELETE", "Sters \"" + t.title + "\""); } setTasks(function(p) { return p.filter(function(x) { return x.id !== tid; }); }); };
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
    if (prevTask) { pushUndo("STATUS_CHANGE", { taskId: tid, title: prevTask.title, oldStatus: prevTask.status }); addLog("STATUS", "\"" + prevTask.title + "\" -> " + st); }
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
      triggerCelebration("done");
      // Award XP
      var taskXP = XP_PER_TASK[prevTask.taskType] || XP_PER_TASK["General"] || 10;
      var tm2 = timers[tid]; if (tm2 && tm2.total > 0 && tm2.total < 1800) taskXP += XP_BONUS.fast; // fast bonus under 30min
      awardXP(prevTask.assignee, taskXP, "Task Done: " + prevTask.title);
      setTimeout(function() { checkAchievements(prevTask.assignee); }, 500);
      // Execute custom pipeline rules
      executePipelineRules(prevTask, st);
      // Check if target was just hit
      var myTargetCheck = (targets || []).find(function(tg) { return tg.userId === prevTask.assignee && tg.active !== false; });
      if (myTargetCheck) {
        var doneCountCheck = tasks.filter(function(tx) { return tx.assignee === prevTask.assignee && tx.status === "Done" && tx.updatedAt && ds(tx.updatedAt) === TD && !tx._campaignParent; }).length + 1;
        if (doneCountCheck === myTargetCheck.target) { setTimeout(function() { triggerCelebration("target"); }, 800); }
      }
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
        var pipeTask = { id: gid(), title: prevTask.title + " - Foto Produs", description: pipeDesc, assignee: prevTask._pipelineNext, status: "To Do", priority: prevTask.priority, platform: prevTask.platform || "", taskType: "Foto Produs", department: "FOTO PRODUS", shop: prevTask.shop, product: prevTask.product || "", productName: prevTask.productName || "", deadline: TD, links: pipeLinks, subtasks: [], comments: [], tags: [], dependsOn: [prevTask.id], campaignItems: [], createdBy: prevTask.createdBy || "admin", createdAt: ts(), updatedAt: ts(), _campaignParentId: prevTask._campaignParentId || "", _fromPipeline: prevTask.id };
        setTasks(function(p) { return [pipeTask].concat(p); });
        setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[pipeTask.id] = [{ status: "To Do", at: ts() }]; return n; });
        addNotif("pipeline", "Task pipeline: \"" + pipeTask.title + "\"", pipeTask.id, prevTask._pipelineNext);
      }
      // Secondary pipeline: Mara Poze Done -> Carla (Ads task, deadline next day)
      if (prevTask.assignee === "mara_poze" && prevTask._fromPipeline) {
        // Check if Ads task already exists for this parent (prevent duplicates)
        var existingAds = tasks.find(function(x) { return x._adsPipeline === true && x.dependsOn && x.dependsOn.includes(prevTask.id); });
        if (!existingAds) {
          // Original title is "X - Foto Produs", strip it to get product name
          var cleanTitle = (prevTask.title || "").replace(/ - Foto Produs$/, "");
          // Smart deadline calc:
          // - "Work day" ends at 06:00 next morning. If Mara finishes between 00:00-06:00, counts as previous day.
          // - Carla's deadline = next business day (Mon-Fri) after Mara's "effective" finish day
          // - Fri finish -> Monday (skip weekend)
          // - Sat finish -> Monday
          // - Sun finish -> Monday
          var now = new Date();
          var effectiveDate = new Date(now);
          if (now.getHours() < 6) {
            // Before 6 AM = previous day's work
            effectiveDate.setDate(effectiveDate.getDate() - 1);
          }
          var adsDate = new Date(effectiveDate);
          adsDate.setDate(adsDate.getDate() + 1); // default: next day
          var dow = adsDate.getDay(); // 0=Sun, 6=Sat
          if (dow === 0) { // Sunday -> Monday
            adsDate.setDate(adsDate.getDate() + 1);
          } else if (dow === 6) { // Saturday -> Monday
            adsDate.setDate(adsDate.getDate() + 2);
          }
          var adsDeadline = ds(adsDate);
          var adsLinks = (prevTask.links || []).slice();
          var adsTask = { id: gid(), title: cleanTitle + " - Ads", description: "Pune ads pentru acest produs. Foto produs gata.\n\n" + (prevTask.description || ""), assignee: "carla", status: "To Do", priority: prevTask.priority, platform: "Meta Ads", taskType: "Ad Creation", department: "AD", shop: prevTask.shop, product: prevTask.product || "", productName: prevTask.productName || "", deadline: adsDeadline, links: adsLinks, subtasks: [], comments: [], tags: [], dependsOn: [prevTask.id], campaignItems: [], createdBy: prevTask.createdBy || "admin", createdAt: ts(), updatedAt: ts(), _campaignParentId: prevTask._campaignParentId || "", _fromPipeline: prevTask.id, _adsPipeline: true };
          setTasks(function(p) { return [adsTask].concat(p); });
          setStatusHistory(function(prev) { var n = Object.assign({}, prev); n[adsTask.id] = [{ status: "To Do", at: ts() }]; return n; });
          addNotif("pipeline", "Task Ads pregatit: \"" + adsTask.title + "\"", adsTask.id, "carla");
          addLog("PIPELINE", "Mara Poze -> Carla: " + adsTask.title + " (deadline: " + adsDeadline + ")");
        }
      }
    }

    // Rollback: if Mara Poze changes status FROM Done back to something else, remove the Ads task (only if still To Do)
    if (prevTask && prevTask.assignee === "mara_poze" && prevTask.status === "Done" && st !== "Done") {
      var adsToRemove = tasks.find(function(x) { return x._adsPipeline === true && x.dependsOn && x.dependsOn.includes(prevTask.id) && x.status === "To Do"; });
      if (adsToRemove) {
        setTasks(function(p) { return p.filter(function(x) { return x.id !== adsToRemove.id; }); });
        addLog("PIPELINE", "Rollback Ads: " + adsToRemove.title + " sters (Mara Poze a schimbat statusul)");
        addNotif("pipeline_rollback", "Taskul Ads \"" + adsToRemove.title + "\" a fost sters - foto produs nu mai e finalizat", adsToRemove.id, "carla");
      }
    }
  };

  var handleDrop = function(st) { if (!dragId) return; chgSt(dragId, st); setDragId(null); };
  var bulkChgSt = function(ns) { selectedTasks.forEach(function(tid) { chgSt(tid, ns); }); setSelectedTasks([]); setBulkMode(false); };
  var bulkChgAssign = function(na) { setTasks(function(p) { return p.map(function(x) { return selectedTasks.includes(x.id) ? Object.assign({}, x, { assignee: na, updatedAt: ts() }) : x; }); }); addLog("BULK", "Bulk assign " + selectedTasks.length); setSelectedTasks([]); setBulkMode(false); };
  var bulkChgPrio = function(np) { setTasks(function(p) { return p.map(function(x) { return selectedTasks.includes(x.id) ? Object.assign({}, x, { priority: np, updatedAt: ts() }) : x; }); }); setSelectedTasks([]); setBulkMode(false); };
  var bulkChgDeadline = function(nd) { setTasks(function(p) { return p.map(function(x) { return selectedTasks.includes(x.id) ? Object.assign({}, x, { deadline: nd, updatedAt: ts() }) : x; }); }); addLog("BULK", "Bulk deadline " + selectedTasks.length + " -> " + nd); setSelectedTasks([]); setBulkMode(false); };
  var bulkChgShop = function(ns) { setTasks(function(p) { return p.map(function(x) { return selectedTasks.includes(x.id) ? Object.assign({}, x, { shop: ns, updatedAt: ts() }) : x; }); }); addLog("BULK", "Bulk shop " + selectedTasks.length + " -> " + ns); setSelectedTasks([]); setBulkMode(false); };
  var bulkDel = function() {
    if (!window.confirm("Sterge " + selectedTasks.length + " taskuri? Actiune ireversibila!")) return;
    var n = selectedTasks.length;
    setTasks(function(p) { return p.filter(function(x) { return !selectedTasks.includes(x.id); }); });
    addLog("BULK_DELETE", "Sterse " + n + " taskuri in bulk");
    setSelectedTasks([]); setBulkMode(false);
  };
  var bulkDup = function() {
    var copies = selectedTasks.map(function(tid) { var t = tasks.find(function(x) { return x.id === tid; }); if (!t) return null; return Object.assign({}, t, { id: gid(), title: t.title + " (copie)", status: "To Do", createdAt: ts(), updatedAt: ts(), comments: [], _finalizedCount: 0 }); }).filter(Boolean);
    setTasks(function(p) { return copies.concat(p); });
    addLog("BULK", "Duplicate " + copies.length + " taskuri");
    setSelectedTasks([]); setBulkMode(false);
  };
  var selectAllFiltered = function() { setSelectedTasks(filtered.map(function(t) { return t.id; })); };
  var toggleSel = function(tid) { setSelectedTasks(function(p) { return p.includes(tid) ? p.filter(function(x) { return x !== tid; }) : p.concat([tid]); }); };

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

  var fProps = { stats: stats, dateF: dateF, setDateF: setDateF, statusF: statusF, setStatusF: setStatusF, prioF: prioF, setPrioF: setPrioF, assignF: assignF, setAssignF: setAssignF, shopF: shopF, setShopF: setShopF, visUsers: visUsers, shops: shops, count: filtered.length, team: team, departments: departments, deptFilter: deptFilter, setDeptFilter: setDeptFilter, platformFilter: platformFilter, setPlatformFilter: setPlatformFilter, allTags: allTags, tagFilter: tagFilter, setTagFilter: setTagFilter, platforms: platforms };

  var navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.dash },
    { id: "tasks", label: "Taskuri", icon: Icons.tasks, count: stats.total },
    { id: "kanban", label: "Kanban Board", icon: Icons.kanban },
    { id: "targets", label: "Targets", icon: Icons.target },
    { id: "templates", label: "Templates", icon: Icons.tpl },
    { id: "recurring", label: "Recurring", icon: Icons.recur },
    { id: "leaves", label: "Concedii", icon: Icons.cal },
    { id: "workload", label: "Workload", icon: Icons.work },
    { id: "performance", label: "Performance", icon: Icons.perf },
    { id: "digest", label: "Weekly Digest", icon: Icons.digest },
    { id: "achievements", label: "Achievements", icon: Icons.trophy },
    { id: "wallfame", label: "Wall of Fame", icon: Icons.challenge },
    { id: "brandstats", label: "Brand Analytics", icon: Icons.shops },
    { id: "league", label: "Liga Saptamanii", icon: Icons.trophy },
    { id: "leagueMonthly", label: "Liga Lunara", icon: Icons.challenge },
    { id: "announce", label: "Announcements", icon: Icons.announce },
    { id: "backups", label: "Backup Taskuri", icon: Icons.history },
    { id: "departments", label: "Departamente", icon: Icons.dept },
    { id: "shops", label: "Magazine", icon: Icons.shops },
    { id: "products", label: "Produse", icon: Icons.prod },
    { id: "sheets", label: "Sheets", icon: Icons.sheet },
    { id: "manage_users", label: "Manage Users", icon: Icons.usrs },
    { id: "branding", label: "Branding", icon: Icons.settings },
    { id: "config", label: "Configurare Rapida", icon: Icons.filter },
    { id: "pipeline", label: "Pipeline Builder", icon: Icons.dep },
  ];

  var navGroups = [
    { solo: true, items: ["dashboard", "tasks", "kanban"] },
    { label: "Operational", items: ["targets", "templates", "recurring", "leaves"] },
    { label: "Echipa", items: ["workload", "performance", "league", "leagueMonthly", "digest", "achievements", "wallfame", "brandstats"] },
    { label: "Comunicare", items: ["announce"] },
    { label: "Configurare", items: ["departments", "shops", "products", "sheets", "manage_users", "branding", "config", "pipeline", "backups"] },
  ];

  var accessibleNav = navItems.filter(function(n) {
    if (me.role === "admin") return true;
    if (me.access && me.access.length > 0) return me.access.includes(n.id);
    if (me.role === "pm") return !["manage_users", "log", "birdseye", "loginhistory", "anomalies", "backups", "branding"].includes(n.id);
    if (me.role === "member") return ["tasks", "kanban", "achievements", "announce"].includes(n.id);
    return false;
  });

  var accessibleIds = accessibleNav.map(function(n) { return n.id; });

  return (
    <div style={S.app}><style>{CSS}</style>
      <ToastBanner toasts={toasts} onDismiss={dismissToast} />
      {celebration && <ConfettiOverlay type={celebration.type} key={celebration.id} />}
      {achievementPopup && <AchievementPopup achievement={achievementPopup} onClose={function() { setAchievementPopup(null); }} />}
      {isMob && mobNav && <div style={S.overlay} onClick={function() { setMobNav(false); }} />}
      <aside style={Object.assign({}, S.sidebar, isMob ? { position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 200, transform: mobNav ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.2s" } : {})}>
        <div style={S.logoArea}>
          {branding.logo ? <img src={branding.logo} alt="Logo" style={{ maxWidth: "100%", maxHeight: 48, marginBottom: 4, objectFit: "contain" }} /> : <span style={S.logoH}>{branding.title || "HeyAds"}</span>}
          {branding.subtitle && <span style={S.logoSub}>{branding.subtitle}</span>}
        </div>
        {canCreate && <div style={{ padding: "0 16px", marginBottom: 4 }}><button style={S.newBtn} onClick={function() { setEditTask(null); setShowAdd(true); setMobNav(false); }}><Ic d={Icons.plus} size={16} color="#fff" /> New Task</button></div>}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {navGroups.map(function(g, gi) {
            var groupItems = g.items.map(function(id) { return navItems.find(function(x) { return x.id === id; }); }).filter(function(n) { return n && accessibleIds.includes(n.id); });
            if (groupItems.length === 0) return null;
            var renderItem = function(n) {
              var myActiveCount = n.id === "tasks" ? tasks.filter(function(t) { return t.assignee === user && t.status !== "Done" && !t._campaignParent; }).length : null;
              return <div key={n.id} style={S.navItem(page === n.id)} onClick={function() { setPage(n.id); setMobNav(false); }}>
                <Ic d={n.icon} size={18} color={page === n.id ? "#4ADE80" : "#7A8BA0"} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.id === "tasks" && myActiveCount > 0 && <span style={{ fontSize: 11, background: "#16A34A", color: "#fff", padding: "2px 8px", borderRadius: 12, fontWeight: 700, minWidth: 20, textAlign: "center", boxShadow: "0 1px 4px rgba(22,163,74,0.4)", animation: myActiveCount > 0 ? "pulse 2s infinite" : "none" }}>{myActiveCount}</span>}
                {n.id !== "tasks" && n.count != null && <span style={S.navBadge}>{n.count}</span>}
                {n.id === "anomalies" && anomalies.length > 0 && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} />}
                {n.id === "announce" && announcements.filter(function(a) { return !a.readBy || !a.readBy.includes(user); }).length > 0 && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563EB" }} />}
              </div>;
            };
            if (g.solo) return <div key={gi}>{groupItems.map(renderItem)}</div>;
            var expanded = expandedGroups[g.label];
            var hasActive = groupItems.some(function(n) { return n.id === page; });
            return <div key={gi} style={{ marginTop: 10 }}>
              <div onClick={function() { setExpandedGroups(function(p) { var n = Object.assign({}, p); n[g.label] = !n[g.label]; return n; }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", cursor: "pointer", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: hasActive ? "#4ADE80" : "#4A5A70", textTransform: "uppercase", userSelect: "none" }}>
                <span style={{ fontSize: 7, transition: "transform 0.15s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", opacity: 0.6 }}>▶</span>
                <span style={{ flex: 1 }}>{g.label}</span>
                {!expanded && hasActive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80" }} />}
              </div>
              {expanded && <div>{groupItems.map(renderItem)}</div>}
            </div>;
          })}
        </nav>
        <div style={S.sidebarUser}><Av color={me.color} size={32} userId={user}>{me.name[0]}</Av><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#D1D9E6" }}>{me.name}</div><div style={{ fontSize: 10, color: "#7A8BA0" }}>{me.role === "pm" ? "PM" : me.role}{user !== "admin" ? " | Lv." + getLevel((_globalUserXP[user]) || 0) + " " + getLevelTitle(getLevel((_globalUserXP[user]) || 0)) : ""}</div></div></div>
        <div style={{ padding: "0 16px 16px" }}><button style={S.logoutBtn} onClick={handleLogout}><Ic d={Icons.out} size={15} color="#7A8BA0" /> Sign out</button></div>
      </aside>
      <main style={S.main}>
        <header style={S.topbar}>
          {isMob && <button style={S.menuBtn} onClick={function() { setMobNav(true); }}><Ic d={Icons.menu} size={22} color="#475569" /></button>}
          <h1 style={S.pageTitle}>{(accessibleNav.find(function(n) { return n.id === page; }) || {}).label || ""}</h1>
          <div style={{ flex: 1 }} />
          {page === "tasks" && canCreate && <button style={Object.assign({}, S.chip, { background: bulkMode ? "#DC2626" : "#F1F5F9", color: bulkMode ? "#fff" : "#475569", marginRight: 8 })} onClick={function() { setBulkMode(!bulkMode); setSelectedTasks([]); }}><Ic d={Icons.check} size={14} color={bulkMode ? "#fff" : "#475569"} /> {bulkMode ? "Exit Bulk" : "Bulk"}</button>}
          {undoStack.length > 0 && <button style={Object.assign({}, S.iconBtn, { background: "#FEF3C7", borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 })} onClick={performUndo} title={"Undo: " + undoStack[0].action}><span style={{ fontSize: 14 }}>↩</span><span style={{ fontSize: 10, color: "#D97706", fontWeight: 600 }}>Undo</span></button>}
          <button style={Object.assign({}, S.iconBtn, { opacity: soundEnabled ? 1 : 0.4 })} onClick={function() { setSoundEnabled(!soundEnabled); if (!soundEnabled) playSound("done"); }} title={soundEnabled ? "Sunet ON" : "Sunet OFF"}><span style={{ fontSize: 16 }}>{soundEnabled ? "🔊" : "🔇"}</span></button>
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
          {bulkMode && selectedTasks.length > 0 && <Card style={{ marginBottom: 16, background: GR + "08", borderLeft: "3px solid " + GR, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: GR }}>{selectedTasks.length} selectate</span>
                <button style={Object.assign({}, S.cancelBtn, { padding: "5px 12px", fontSize: 11 })} onClick={selectAllFiltered}>Selecteaza toate ({filtered.length})</button>
                <button style={Object.assign({}, S.cancelBtn, { padding: "5px 12px", fontSize: 11 })} onClick={function() { setSelectedTasks([]); }}>Deselecteaza</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #2563EB", background: "#EFF6FF", color: "#2563EB", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }} onClick={bulkDup}><Ic d={Icons.copy} size={12} color="#2563EB" /> Duplica</button>
                <button style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #DC2626", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }} onClick={bulkDel}><Ic d={Icons.del} size={12} color="#DC2626" /> Sterge</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr 1fr" : "repeat(5, 1fr)", gap: 8 }}>
              <div><div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Status</div><select style={Object.assign({}, S.fSel, { width: "100%" })} onChange={function(e) { if (e.target.value) bulkChgSt(e.target.value); e.target.value = ""; }}><option value="">Schimba...</option>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div>
              <div><div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Asignat</div><select style={Object.assign({}, S.fSel, { width: "100%" })} onChange={function(e) { if (e.target.value) bulkChgAssign(e.target.value); e.target.value = ""; }}><option value="">Schimba...</option>{assUsers.map(function(u2) { return <option key={u2} value={u2}>{(team[u2] || {}).name}</option>; })}</select></div>
              <div><div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Prioritate</div><select style={Object.assign({}, S.fSel, { width: "100%" })} onChange={function(e) { if (e.target.value) bulkChgPrio(e.target.value); e.target.value = ""; }}><option value="">Schimba...</option>{PRIORITIES.map(function(p2) { return <option key={p2} value={p2}>{p2}</option>; })}</select></div>
              <div><div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Magazin</div><select style={Object.assign({}, S.fSel, { width: "100%" })} onChange={function(e) { if (e.target.value) bulkChgShop(e.target.value); e.target.value = ""; }}><option value="">Schimba...</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div>
              <div><div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Deadline</div><input type="date" style={Object.assign({}, S.fSel, { width: "100%" })} onChange={function(e) { if (e.target.value) bulkChgDeadline(e.target.value); e.target.value = ""; }} /></div>
            </div>
          </Card>}
          {page === "dashboard" && me.role === "member" && <MemberDashboard me={me} user={user} allTasks={tasks} timers={timers} targets={targets} getPerf={getPerf} team={team} leaves={leaves} isMob={isMob} achievements={achievements} visUsers={visUsers} setPage={setPage} monthlyBonus={monthlyBonus} />}
          {page === "dashboard" && me.role === "pm" && <PMDashboard me={me} user={user} allTasks={tasks} timers={timers} targets={targets} getPerf={getPerf} team={team} leaves={leaves} isMob={isMob} achievements={achievements} visUsers={visUsers} setPage={setPage} monthlyBonus={monthlyBonus} />}
          {page === "dashboard" && me.role === "admin" && <DashPage stats={stats} tasks={visTasks} team={team} visUsers={visUsers} sessions={sessions} timers={timers} getTS={getTS} getPerf={getPerf} isMob={isMob} onClickUser={setProfUser} targets={targets} loginTrack={loginTrack} allTasks={tasks} slaBreaches={slaBreaches} me={me} anomalies={anomalies} dailyChallenge={dailyChallenge} announcements={announcements} user={user} setAnnouncements={setAnnouncements} leaves={leaves} setPage={setPage} achievements={achievements} monthlyBonus={monthlyBonus} />}
          {page === "birdseye" && <BirdsEyePage tasks={tasks} team={team} timers={timers} getTS={getTS} isMob={isMob} sessions={sessions} anomalies={anomalies} />}
          {page === "tasks" && <TasksPage fProps={fProps} grouped={grouped} filtered={filtered} user={user} team={team} onEdit={function(t) { setEditTask(t); setShowAdd(true); }} onView={setViewTask} onDel={delTask} onDup={dupTask} onChgSt={chgSt} isMob={isMob} timers={timers} getTS={getTS} togTimer={togTimer} bulkMode={bulkMode} selectedTasks={selectedTasks} toggleSel={toggleSel} canEdit={canEdit} canDelete={canDelete} onExplode={explodeCampaign} tasks={tasks} />}
          {page === "kanban" && <KanbanPage fProps={fProps} tasks={filtered} user={user} team={team} onView={setViewTask} onEdit={function(t) { setEditTask(t); setShowAdd(true); }} onDel={delTask} onDup={dupTask} onChgSt={chgSt} dragId={dragId} setDragId={setDragId} handleDrop={handleDrop} isMob={isMob} timers={timers} getTS={getTS} togTimer={togTimer} />}
          {page === "calendar" && <CalendarPage tasks={visTasks} user={user} team={team} calDate={calDate} setCalDate={setCalDate} onView={setViewTask} isMob={isMob} me={me} />}
          {page === "targets" && <TargetsPage targets={targets} setTargets={setTargets} team={team} tasks={tasks} timers={timers} canEdit={canCreate} visUsers={visUsers} taskTypes={taskTypes} departments={departments} leaves={leaves} />}
          {page === "templates" && <TemplatesPage templates={templates} setTemplates={setTemplates} canEdit={canCreate} isAdmin={isAdmin} shops={shops} onCreateFromTpl={function(tpl) { setEditTask({ title: tpl.name, description: tpl.description, shop: tpl.shop || "", subtasks: tpl.subtasks.map(function(s) { return { id: gid(), text: s, done: false }; }) }); setShowAdd(true); }} />}
          {page === "recurring" && <RecurringPage recurringTasks={recurringTasks} setRecurringTasks={setRecurringTasks} team={team} assUsers={assUsers} shops={shops} departments={departments} canEdit={canCreate} />}
          {page === "leaves" && <LeavesPage leaves={leaves} setLeaves={setLeaves} leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} team={team} user={user} visUsers={visUsers} me={me} addLog={addLog} addNotif={addNotif} />}
          {page === "branding" && <BrandingPage branding={branding} setBranding={setBranding} addLog={addLog} />}
          {page === "config" && <ConfigPage taskTypes={taskTypes} setTaskTypes={setTaskTypes} platforms={platforms} setPlatforms={setPlatforms} departments={departments} setDepartments={setDepartments} shops={shops} setShops={setShops} addLog={addLog} />}
          {page === "pipeline" && <PipelinePage pipelineRules={pipelineRules} setPipelineRules={setPipelineRules} team={team} assUsers={assUsers} shops={shops} taskTypes={taskTypes} departments={departments} platforms={platforms} addLog={addLog} />}
          {page === "league" && <LeaguePage allTasks={tasks} team={team} user={user} me={me} timers={timers} targets={targets} achievements={achievements} visUsers={visUsers} isMob={isMob} monthlyBonus={monthlyBonus} setMonthlyBonus={setMonthlyBonus} userXP={userXP} />}
          {page === "leagueMonthly" && <MonthlyLeaguePage allTasks={tasks} team={team} user={user} me={me} targets={targets} achievements={achievements} visUsers={visUsers} isMob={isMob} monthlyBonus={monthlyBonus} setMonthlyBonus={setMonthlyBonus} userXP={userXP} />}
          {page === "workload" && <WorkPage users={visUsers} team={team} tasks={visTasks} getPerf={getPerf} timers={timers} getTS={getTS} isMob={isMob} onClickUser={setProfUser} />}
          {page === "team" && <TeamPage users={visUsers} team={team} sessions={sessions} getPerf={getPerf} isMob={isMob} onClickUser={setProfUser} />}
          {page === "performance" && <PerfPage users={visUsers} team={team} getPerf={getPerf} isMob={isMob} />}
          {page === "digest" && <DigestPage team={team} tasks={tasks} timers={timers} getPerf={getPerf} visUsers={visUsers} isMob={isMob} />}
          {page === "achievements" && <AchievementsPage achievements={achievements} team={team} visUsers={visUsers} tasks={tasks} isMob={isMob} userXP={userXP} />}
          {page === "wallfame" && <WallOfFamePage tasks={tasks} team={team} timers={timers} visUsers={visUsers} isMob={isMob} userXP={userXP} achievements={achievements} monthlyBonus={monthlyBonus} />}
          {page === "brandstats" && <BrandStatsPage tasks={tasks} team={team} shops={shops} timers={timers} isMob={isMob} />}
          {page === "announce" && <AnnouncePage announcements={announcements} setAnnouncements={setAnnouncements} isAdmin={isAdmin} user={user} team={team} />}
          {page === "challenge" && <ChallengePage dailyChallenge={dailyChallenge} setDailyChallenge={setDailyChallenge} isAdmin={isAdmin} team={team} tasks={tasks} user={user} visUsers={visUsers} />}
          {page === "anomalies" && <AnomaliesPage anomalies={anomalies} team={team} tasks={tasks} isMob={isMob} />}
          {page === "log" && <LogPage logs={logs} visUsers={visUsers} isMob={isMob} />}
          {page === "backups" && <BackupPage taskBackups={taskBackups} setTaskBackups={setTaskBackups} tasks={tasks} setTasks={setTasks} team={team} user={user} isAdmin={isAdmin} addLog={addLog} />}
          {page === "loginhistory" && <LoginHistoryPage loginHistory={loginHistory} team={team} isMob={isMob} />}
          {page === "departments" && <DeptPage departments={departments} setDepartments={setDepartments} tasks={tasks} team={team} visUsers={visUsers} isMob={isMob} canEdit={canCreate} />}
          {page === "shops" && <ShopsBordPage shops={shops} setShops={setShops} tasks={tasks} team={team} isMob={isMob} canEdit={canCreate} slas={slas} />}
          {page === "products" && <ProdsPage products={products} setProducts={setProducts} shops={shops} productAudit={productAudit} setProductAudit={setProductAudit} user={user} team={team} />}
          {page === "sheets" && <SheetsPage sheets={sheets} setSheets={setSheets} shops={shops} />}
          {page === "manage_users" && <UsersPage team={team} setTeam={setTeam} addLog={addLog} />}
        </div>
      </main>
      {showAdd && <TaskModal task={editTask} team={team} assUsers={assUsers} shops={shops} products={products} onSave={saveTask} onClose={function() { setShowAdd(false); setEditTask(null); localStorage.removeItem("scout_task_draft"); }} taskTypes={taskTypes} departments={departments} allTasks={tasks} allTags={allTags} taskEditors={taskEditors} user={user} setTaskEditors={setTaskEditors} leaves={leaves} platforms={platforms} />}
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

function FiltersBar({ stats, dateF, setDateF, statusF, setStatusF, prioF, setPrioF, assignF, setAssignF, shopF, setShopF, visUsers, shops, count, team, noStatus, departments, deptFilter, setDeptFilter, platformFilter, setPlatformFilter, allTags, tagFilter, setTagFilter, platforms }) {
  var chips = [{ id: "all", l: "Toate" }, { id: "today", l: "Azi", n: stats.today }, { id: "yesterday", l: "Ieri" }, { id: "tomorrow", l: "Maine" }, { id: "overdue", l: "Intarziate", n: stats.overdue }, { id: "upcoming", l: "Viitoare" }, { id: "nodate", l: "Fara data" }];
  return <div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{chips.map(function(c) { return <button key={c.id} onClick={function() { setDateF(c.id); }} style={Object.assign({}, S.chip, { background: dateF === c.id ? GR : "#F1F5F9", color: dateF === c.id ? "#fff" : "#475569", fontWeight: dateF === c.id ? 600 : 400 })}>{c.l}{c.n > 0 && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>({c.n})</span>}</button>; })}</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
      {!noStatus && <select style={S.fSel} value={statusF} onChange={function(e) { setStatusF(e.target.value); }}><option value="all">Status: Toate</option>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>}
      <select style={S.fSel} value={prioF} onChange={function(e) { setPrioF(e.target.value); }}><option value="all">Prioritate: Toate</option>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select>
      <select style={S.fSel} value={assignF} onChange={function(e) { setAssignF(e.target.value); }}><option value="all">Persoana: Toti</option>{visUsers.filter(function(u) { return u !== "admin"; }).map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name || u}</option>; })}</select>
      <select style={S.fSel} value={shopF} onChange={function(e) { setShopF(e.target.value); }}><option value="all">Magazin: Toate</option>{shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>
      {departments && <select style={S.fSel} value={deptFilter || "all"} onChange={function(e) { if (setDeptFilter) setDeptFilter(e.target.value); }}><option value="all">Dept: Toate</option>{departments.map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select>}
      <select style={S.fSel} value={platformFilter || "all"} onChange={function(e) { if (setPlatformFilter) setPlatformFilter(e.target.value); }}><option value="all">Platforma: Toate</option>{(platforms || DEF_PLATFORMS).map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select>
      {allTags && allTags.length > 0 && <select style={S.fSel} value={tagFilter || "all"} onChange={function(e) { if (setTagFilter) setTagFilter(e.target.value); }}><option value="all">Tag: Toate</option>{allTags.map(function(t) { return <option key={t} value={t}>#{t}</option>; })}</select>}
      <span style={{ fontSize: 12, color: "#94A3B8" }}>{count} taskuri</span>
    </div>
  </div>;
}

function PMDashboard({ me, user, allTasks, timers, targets, getPerf, team, leaves, isMob, achievements, visUsers, setPage, monthlyBonus }) {
  var [tab, setTab] = useState("personal"); // personal | team
  var [pmKpiModal, setPmKpiModal] = useState(null);
  var [pmEditMode, setPmEditMode] = useState(false);
  var [pmDragId, setPmDragId] = useState(null);
  var [pmLayout, setPmLayout] = useState(function() {
    try { var s = localStorage.getItem("s7_pm_layout"); if (s) return JSON.parse(s); } catch(e) {}
    return [
      { id: "podium", visible: true },
      { id: "tabs", visible: true }
    ];
  });
  useEffect(function() { try { localStorage.setItem("s7_pm_layout", JSON.stringify(pmLayout)); } catch(e) {} }, [pmLayout]);

  var pmMoveBlock = function(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    setPmLayout(function(p) {
      var arr = p.slice();
      var f = arr.findIndex(function(b) { return b.id === fromId; });
      var t = arr.findIndex(function(b) { return b.id === toId; });
      if (f < 0 || t < 0) return p;
      var item = arr.splice(f, 1)[0];
      arr.splice(t, 0, item);
      return arr;
    });
  };
  var pmToggleVisibility = function(id) {
    setPmLayout(function(p) { return p.map(function(b) { return b.id === id ? Object.assign({}, b, { visible: !b.visible }) : b; }); });
  };
  var pmResetLayout = function() {
    if (!window.confirm("Reset layout dashboard?")) return;
    setPmLayout([{ id: "podium", visible: true }, { id: "tabs", visible: true }]);
  };
  var pmBlockLabels = { podium: "Liga Saptamanii - Podium", tabs: "Tab-uri Personal/Echipa" };

  // === TEAM DATA ===
  var teamUsers = (me.team || []).filter(function(u) { return team[u]; });
  var teamTasks = allTasks.filter(function(t) { return teamUsers.includes(t.assignee) && !t._campaignParent; });
  var teamDoneToday = teamTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD; }).length;
  var teamActive = teamTasks.filter(function(t) { return t.status !== "Done"; });
  var teamOverdue = teamTasks.filter(function(t) { return t.status !== "Done" && isOv(t); });
  var teamInProg = teamTasks.filter(function(t) { return t.status === "In Progress"; });

  // Yesterday
  var yStr = ds(new Date(Date.now() - 86400000));
  var teamYDone = teamTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === yStr; }).length;
  var teamDelta = teamYDone > 0 ? Math.round(((teamDoneToday - teamYDone) / teamYDone) * 100) : (teamDoneToday > 0 ? 100 : 0);

  // 7-day team trend
  var teamTrend = [];
  for (var i = 6; i >= 0; i--) {
    var dt = new Date(); dt.setDate(dt.getDate() - i);
    var dStr = ds(dt);
    var done = teamTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === dStr; }).length;
    teamTrend.push({ date: dStr, label: dt.getDate() + " " + MN[dt.getMonth()].substring(0, 3), done: done, dow: dt.getDay() });
  }
  var maxTrend = Math.max.apply(null, teamTrend.map(function(d) { return d.done; }).concat([1]));

  // Per-user performance in team
  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  var userPerf = teamUsers.map(function(u) {
    var uTasks = teamTasks.filter(function(t) { return t.assignee === u; });
    var uDoneWeek = uTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && new Date(t.updatedAt) >= weekAgo; }).length;
    var uDoneToday = uTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD; }).length;
    var uActive = uTasks.filter(function(t) { return t.status !== "Done"; }).length;
    var uOverdue = uTasks.filter(function(t) { return t.status !== "Done" && isOv(t); }).length;
    var uTarget = targets.find(function(tg) { return tg.userId === u && tg.active !== false; });
    var perf = getPerf(u);
    return { user: u, name: (team[u] || {}).name || u, color: (team[u] || {}).color || "#94A3B8", doneWeek: uDoneWeek, doneToday: uDoneToday, active: uActive, overdue: uOverdue, target: uTarget, perf: perf, onLeave: isOnLeave(leaves, u, TD) };
  }).sort(function(a, b) { return b.doneWeek - a.doneWeek; });
  var maxUserPerf = Math.max.apply(null, userPerf.map(function(p) { return p.doneWeek; }).concat([1]));

  // Blockers in team
  var now = Date.now();
  var teamBlockers = teamTasks.filter(function(t) {
    if (t.status === "Done") return false;
    var lastUpdate = new Date(t.updatedAt || t.createdAt).getTime();
    return (now - lastUpdate) / 3600000 > 48;
  }).slice(0, 5);

  // Target aggregate for team
  var teamTargetTotal = 0, teamTargetDone = 0;
  userPerf.forEach(function(up) {
    if (up.onLeave || !up.target) return;
    teamTargetTotal += up.target.target || 0;
    teamTargetDone += up.doneToday;
  });
  var teamTargetPct = teamTargetTotal > 0 ? Math.min(100, (teamTargetDone / teamTargetTotal) * 100) : 0;

  return <div>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: "#1E293B" }}>Salut, {me.name}!</h2>
        <div style={{ fontSize: 12, color: "#64748B" }}>Dashboard PM - {teamUsers.length} persoane in echipa</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {pmEditMode && <button onClick={pmResetLayout} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", color: "#64748B", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>↻ Reset</button>}
        <button onClick={function() { setPmEditMode(!pmEditMode); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid " + (pmEditMode ? GR : "#CBD5E1"), background: pmEditMode ? GR : "#fff", color: pmEditMode ? "#fff" : "#475569", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          {pmEditMode ? "✓ Gata" : "✎ Customizeaza"}
        </button>
      </div>
    </div>

    {pmEditMode && <Card style={{ marginBottom: 14, background: "#EFF6FF", borderLeft: "3px solid #2563EB" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF", marginBottom: 6 }}>Mod customizare activat</div>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>Trage blocurile de manerul (☰) ca sa le reordonezi.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {pmLayout.map(function(b) {
          return <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: b.visible ? "#fff" : "#F1F5F9", border: "1px solid " + (b.visible ? "#2563EB40" : "#CBD5E1"), fontSize: 11, cursor: "pointer" }}>
            <input type="checkbox" checked={b.visible} onChange={function() { pmToggleVisibility(b.id); }} />
            <span style={{ color: b.visible ? "#1E293B" : "#94A3B8", fontWeight: 600 }}>{pmBlockLabels[b.id] || b.id}</span>
          </label>;
        })}
      </div>
    </Card>}

    {(function() {
      var renderPmBlock = function(id) {
        if (id === "podium") return <PodiumCompact leaderboard={calcPMLeaderboard(allTasks, team, Object.keys(team))} onNavigate={!pmEditMode && setPage ? function() { setPage("leagueMonthly"); } : null} monthlyBonus={monthlyBonus} title={"Liga PM-ilor"} subtitle={"Scor: taskuri create + taskuri echipa done + taskuri proprii done"} />;
        if (id === "tabs") return <div>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: 4, background: "#F1F5F9", borderRadius: 10, width: "fit-content" }}>
            <button onClick={function() { setTab("personal"); }} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: tab === "personal" ? "#fff" : "transparent", color: tab === "personal" ? "#1E293B" : "#64748B", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: tab === "personal" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>Personal</button>
            <button onClick={function() { setTab("team"); }} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: tab === "team" ? "#fff" : "transparent", color: tab === "team" ? "#1E293B" : "#64748B", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: tab === "team" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
              Echipa mea
              {teamOverdue.length > 0 && <span style={{ background: "#DC2626", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>{teamOverdue.length}</span>}
            </button>
          </div>
          {tab === "personal" && <MemberDashboard me={me} user={user} allTasks={allTasks} timers={timers} targets={targets} getPerf={getPerf} team={team} leaves={leaves} isMob={isMob} achievements={achievements} hideHeader={true} visUsers={visUsers} setPage={setPage} monthlyBonus={monthlyBonus} />}
          {tab === "team" && <div>
            {pmKpiModal && <TaskDetailModal title={pmKpiModal.title} color={pmKpiModal.color} tasks={pmKpiModal.tasks} team={team} onClose={function() { setPmKpiModal(null); }} setPage={setPage} />}
            {/* Team hero KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              <Card onClick={function() { setPmKpiModal({ title: "Done azi - echipa", color: GR, tasks: allTasks.filter(function(t) { return teamUsers.includes(t.assignee) && t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD && !t._campaignParent; }) }); }} style={{ borderLeft: "3px solid " + GR, padding: 14, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={function(e) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={function(e) { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
                <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Done azi echipa</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: GR }}>{teamDoneToday}</div>
            <div style={{ fontSize: 11, color: teamDelta >= 0 ? GR : "#DC2626", fontWeight: 700 }}>{teamDelta >= 0 ? "+" : ""}{teamDelta}%</div>
          </div>
          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>vs ieri ({teamYDone})</div>
        </Card>
        <Card onClick={function() { setPmKpiModal({ title: "Active - echipa", color: "#2563EB", tasks: teamActive }); }} style={{ borderLeft: "3px solid #2563EB", padding: 14, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={function(e) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={function(e) { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
          <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Active</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#2563EB" }}>{teamActive.length}</div>
          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{teamInProg.length} in progres</div>
        </Card>
        <Card onClick={function() { if (teamOverdue.length > 0) setPmKpiModal({ title: "Intarziate - echipa", color: "#DC2626", tasks: teamOverdue }); }} style={{ borderLeft: "3px solid " + (teamOverdue.length > 0 ? "#DC2626" : "#94A3B8"), padding: 14, cursor: teamOverdue.length > 0 ? "pointer" : "default", transition: "all 0.15s" }} onMouseEnter={function(e) { if (teamOverdue.length > 0) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; } }} onMouseLeave={function(e) { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
          <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Intarziate</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: teamOverdue.length > 0 ? "#DC2626" : "#94A3B8" }}>{teamOverdue.length}</div>
          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{teamOverdue.length > 0 ? "Necesita atentie" : "Totul la zi"}</div>
        </Card>
        <Card onClick={function() { if (teamBlockers.length > 0) setPmKpiModal({ title: "Blocaje - echipa", color: "#7C3AED", tasks: teamBlockers }); }} style={{ borderLeft: "3px solid #7C3AED", padding: 14, cursor: teamBlockers.length > 0 ? "pointer" : "default", transition: "all 0.15s" }} onMouseEnter={function(e) { if (teamBlockers.length > 0) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; } }} onMouseLeave={function(e) { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
          <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Blocaje &gt;48h</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: teamBlockers.length > 0 ? "#7C3AED" : "#94A3B8" }}>{teamBlockers.length}</div>
          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>Fara miscare</div>
        </Card>
      </div>

      {/* Team target aggregate */}
      {teamTargetTotal > 0 && <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>Target echipa azi</div>
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>Suma target-urilor userilor activi (exclude concediu)</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: teamTargetPct >= 100 ? GR : "#475569" }}>{teamTargetDone}/{teamTargetTotal}</div>
        </div>
        <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: teamTargetPct + "%", background: teamTargetPct >= 100 ? GR : teamTargetPct >= 50 ? "#D97706" : "#DC2626", transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 11, color: teamTargetPct >= 100 ? GR : "#64748B", marginTop: 6, fontWeight: 600 }}>{teamTargetPct >= 100 ? "✓ Target echipa atins!" : "Mai sunt " + (teamTargetTotal - teamTargetDone) + " taskuri pentru target"}</div>
      </Card>}

      {/* Team 7-day trend */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Productivitate echipa - 7 zile</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>Total: <b style={{ color: GR }}>{teamTrend.reduce(function(a, d) { return a + d.done; }, 0)}</b> taskuri finalizate</div>
        <svg viewBox="0 0 700 220" style={{ width: "100%", height: "auto" }}>
          {[0, 0.25, 0.5, 0.75, 1].map(function(r, i) { return <line key={i} x1="40" y1={30 + 150 * r} x2="680" y2={30 + 150 * r} stroke="#F1F5F9" strokeWidth="1" />; })}
          {[0, 0.5, 1].map(function(r, i) { return <text key={i} x="32" y={30 + 150 * (1 - r) + 4} fontSize="10" fill="#94A3B8" textAnchor="end">{Math.round(maxTrend * r)}</text>; })}
          {teamTrend.map(function(d, i) {
            var barW = (640 / teamTrend.length) * 0.6;
            var xBase = 50 + i * (640 / teamTrend.length) + (640 / teamTrend.length - barW) / 2;
            var hDone = (d.done / maxTrend) * 150;
            var isWeekend = d.dow === 0 || d.dow === 6;
            var isToday = d.date === TD;
            return <g key={i}>
              <rect x={xBase} y={180 - hDone} width={barW} height={Math.max(hDone, 2)} fill={isToday ? GR : isWeekend ? "#CBD5E1" : "#60A5FA"} opacity="0.95" rx="4" />
              <text x={xBase + barW / 2} y="200" fontSize="10" fill={isWeekend ? "#CBD5E1" : "#64748B"} textAnchor="middle" fontWeight={isToday ? "700" : "400"}>{d.label}</text>
              {d.done > 0 && <text x={xBase + barW / 2} y={180 - hDone - 4} fontSize="10" fill={isToday ? GR : "#475569"} textAnchor="middle" fontWeight="700">{d.done}</text>}
            </g>;
          })}
        </svg>
      </Card>

      {/* Per-user cards */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Performanta per membru</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>Sortat dupa taskuri finalizate ultimele 7 zile</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {userPerf.map(function(up, i) {
            var targetPct = up.target && up.target.target > 0 ? Math.min(100, (up.doneToday / up.target.target) * 100) : 0;
            var perfColor = up.perf.score >= 70 ? GR : up.perf.score >= 40 ? "#D97706" : "#DC2626";
            return <Card key={up.user} style={{ padding: 14, borderLeft: "3px solid " + (up.onLeave ? "#D97706" : perfColor) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Av color={up.color} size={36} fs={14} userId={up.user}>{up.name[0]}</Av>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{up.name}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8" }}>{up.onLeave ? "🏖 Concediu azi" : "#" + (i + 1) + " saptamana"}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: perfColor }}>{up.perf.score}%</div>
              </div>

              {/* Mini stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
                <div style={{ padding: "6px 8px", background: "#F0FDF4", borderRadius: 5, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: GR }}>{up.doneWeek}</div>
                  <div style={{ fontSize: 9, color: "#64748B", fontWeight: 600 }}>7 zile</div>
                </div>
                <div style={{ padding: "6px 8px", background: "#EFF6FF", borderRadius: 5, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#2563EB" }}>{up.active}</div>
                  <div style={{ fontSize: 9, color: "#64748B", fontWeight: 600 }}>Active</div>
                </div>
                <div style={{ padding: "6px 8px", background: up.overdue > 0 ? "#FEF2F2" : "#F8FAFC", borderRadius: 5, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: up.overdue > 0 ? "#DC2626" : "#94A3B8" }}>{up.overdue}</div>
                  <div style={{ fontSize: 9, color: "#64748B", fontWeight: 600 }}>Intarziate</div>
                </div>
              </div>

              {/* Target */}
              {up.target && !up.onLeave && <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#64748B", fontWeight: 600 }}>Target azi</span>
                  <span style={{ fontWeight: 700, color: targetPct >= 100 ? GR : "#475569" }}>{up.doneToday}/{up.target.target}</span>
                </div>
                <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: targetPct + "%", background: targetPct >= 100 ? GR : targetPct >= 50 ? "#D97706" : "#DC2626" }} />
                </div>
              </div>}

            </Card>;
          })}
        </div>
      </div>

      {/* Blockers */}
      {teamBlockers.length > 0 && <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Blocaje in echipa</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>Taskuri fara miscare peste 48h</div>
        {teamBlockers.map(function(t) {
          var hours = Math.floor((Date.now() - new Date(t.updatedAt || t.createdAt).getTime()) / 3600000);
          var days = Math.floor(hours / 24);
          var a = team[t.assignee] || {};
          return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, borderRadius: 5, background: "#FFFBEB", borderLeft: "2px solid #D97706" }}>
            {a.color && <Av color={a.color} size={20} fs={9}>{(a.name || "?")[0]}</Av>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
              <div style={{ fontSize: 9, color: "#94A3B8" }}>{a.name || "?"} | {t.status}</div>
            </div>
            <span style={{ fontSize: 10, color: "#D97706", fontWeight: 700, flexShrink: 0 }}>{days > 0 ? days + "z" : hours + "h"}</span>
          </div>;
        })}
      </Card>}
    </div>}
        </div>;
        return null;
      };

      return pmLayout.filter(function(b) { return b.visible; }).map(function(b) {
        var content = renderPmBlock(b.id);
        if (!content) return null;
        if (!pmEditMode) return <div key={b.id} style={{ marginBottom: 16 }}>{content}</div>;
        var isDragTarget = pmDragId && pmDragId !== b.id;
        return <div key={b.id} draggable={true}
          onDragStart={function(e) { setPmDragId(b.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", b.id); }}
          onDragEnd={function() { setPmDragId(null); }}
          onDragOver={function(e) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
          onDrop={function(e) { e.preventDefault(); var from = e.dataTransfer.getData("text/plain") || pmDragId; pmMoveBlock(from, b.id); setPmDragId(null); }}
          style={{ marginBottom: 16, border: "2px dashed " + (isDragTarget ? "#2563EB" : "#CBD5E1"), borderRadius: 10, padding: 10, background: isDragTarget ? "#EFF6FF" : "#F8FAFC", cursor: "move", position: "relative", opacity: pmDragId === b.id ? 0.5 : 1, transition: "all 0.15s" }}>
          <div style={{ position: "absolute", top: 8, right: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "#64748B", background: "#fff", padding: "3px 8px", borderRadius: 6, border: "1px solid #CBD5E1", zIndex: 1 }}>
            <span style={{ cursor: "move" }}>☰</span>
            <span>{pmBlockLabels[b.id]}</span>
          </div>
          {content}
        </div>;
      });
    })()}
  </div>;
}

function MemberDashboard({ me, user, allTasks, timers, targets, getPerf, team, leaves, isMob, achievements, hideHeader, visUsers, setPage, monthlyBonus }) {
  var [kpiModal, setKpiModal] = useState(null);
  var myTasks = allTasks.filter(function(t) { return t.assignee === user && !t._campaignParent; });
  var todayDone = myTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD; }).length;
  var activeTasks = myTasks.filter(function(t) { return t.status !== "Done"; });
  var overdueTasks = myTasks.filter(function(t) { return t.status !== "Done" && isOv(t); });
  var todoCount = myTasks.filter(function(t) { return t.status === "To Do"; }).length;
  var inProgCount = myTasks.filter(function(t) { return t.status === "In Progress"; }).length;
  var reviewCount = myTasks.filter(function(t) { return t.status === "Review"; }).length;

  // Yesterday comparison
  var yStr = ds(new Date(Date.now() - 86400000));
  var yDone = myTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === yStr; }).length;
  var deltaPct = yDone > 0 ? Math.round(((todayDone - yDone) / yDone) * 100) : (todayDone > 0 ? 100 : 0);

  // 7-day trend
  var trendData = [];
  for (var i = 6; i >= 0; i--) {
    var dt = new Date(); dt.setDate(dt.getDate() - i);
    var dStr = ds(dt);
    var done = myTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === dStr; }).length;
    var onLeave = isOnLeave(leaves, user, dStr);
    trendData.push({ date: dStr, label: dt.getDate() + " " + MN[dt.getMonth()].substring(0, 3), done: done, dow: dt.getDay(), onLeave: onLeave });
  }
  var maxTrend = Math.max.apply(null, trendData.map(function(d) { return d.done; }).concat([1]));
  var weekTotal = trendData.reduce(function(acc, d) { return acc + d.done; }, 0);

  // Target progress
  var myTargets = targets.filter(function(t) { return t.userId === user && t.active !== false; });

  // Avg time per task (finalized with timers)
  var finishedWithTime = myTasks.filter(function(t) { return t.status === "Done" && timers[t.id] && timers[t.id].total > 0; });
  var avgTime = finishedWithTime.length > 0 ? Math.round(finishedWithTime.reduce(function(acc, t) { return acc + timers[t.id].total; }, 0) / finishedWithTime.length) : 0;
  var totalTimeWorked = Object.keys(timers).reduce(function(acc, tid) { var t = myTasks.find(function(x) { return x.id === tid; }); if (!t) return acc; return acc + (timers[tid].total || 0); }, 0);

  // Streak: consecutive days with target met
  var streak = 0;
  if (myTargets.length > 0) {
    for (var s = 0; s < 30; s++) {
      var sdt = new Date(); sdt.setDate(sdt.getDate() - s);
      var sdow = sdt.getDay();
      var sdStr = ds(sdt);
      var onLeaveS = isOnLeave(leaves, user, sdStr);
      // Skip weekends and leave days (they don't break streak)
      if (sdow === 0 || sdow === 6 || onLeaveS) continue;
      var tgtMain = myTargets[0];
      var targetNum = tgtMain.target || 0;
      var doneThatDay = myTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === sdStr; }).length;
      if (doneThatDay >= targetNum) streak++;
      else break;
    }
  }

  // Achievements count
  var myAch = (achievements && achievements[user]) ? achievements[user] : [];
  var totalAchievements = 8; // matches existing system

  var perf = getPerf(user);

  return <div>
    {!hideHeader && <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: "#1E293B" }}>Salut, {me.name}!</h2>
      <div style={{ fontSize: 12, color: "#64748B" }}>Uite cum merge ziua ta</div>
    </div>}

    {/* Hero KPI row */}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
      <Card onClick={function() { setKpiModal({ title: "Taskuri finalizate azi", color: GR, tasks: myTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD; }) }); }} style={{ borderLeft: "3px solid " + GR, padding: 14, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={function(e) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={function(e) { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Done azi</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: GR }}>{todayDone}</div>
          <div style={{ fontSize: 11, color: deltaPct >= 0 ? GR : "#DC2626", fontWeight: 700 }}>{deltaPct >= 0 ? "+" : ""}{deltaPct}%</div>
        </div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>vs ieri ({yDone})</div>
      </Card>
      <Card onClick={function() { setKpiModal({ title: "Taskuri active", color: "#2563EB", tasks: activeTasks }); }} style={{ borderLeft: "3px solid #2563EB", padding: 14, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={function(e) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={function(e) { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Active</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#2563EB" }}>{activeTasks.length}</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{inProgCount} in progres | {todoCount} to do{reviewCount > 0 ? " | " + reviewCount + " review" : ""}</div>
      </Card>
      <Card onClick={function() { if (overdueTasks.length > 0) setKpiModal({ title: "Taskuri intarziate", color: "#DC2626", tasks: overdueTasks }); }} style={{ borderLeft: "3px solid " + (overdueTasks.length > 0 ? "#DC2626" : "#94A3B8"), padding: 14, cursor: overdueTasks.length > 0 ? "pointer" : "default", transition: "all 0.15s" }} onMouseEnter={function(e) { if (overdueTasks.length > 0) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; } }} onMouseLeave={function(e) { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Intarziate</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: overdueTasks.length > 0 ? "#DC2626" : "#94A3B8" }}>{overdueTasks.length}</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{overdueTasks.length > 0 ? "Atentie - deadline depasit" : "Totul la zi"}</div>
      </Card>
      <Card style={{ borderLeft: "3px solid #D97706", padding: 14 }}>
        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Streak</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#D97706" }}>{streak}</div>
          <span style={{ fontSize: 14 }}>🔥</span>
        </div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>zile consecutive cu target</div>
      </Card>
    </div>
    {kpiModal && <TaskDetailModal title={kpiModal.title} color={kpiModal.color} tasks={kpiModal.tasks} team={team} onClose={function() { setKpiModal(null); }} setPage={setPage} />}

    {/* Podium - hidden when rendered as sub-tab of PM dashboard */}
    {!hideHeader && <PodiumCompact leaderboard={calcMemberLeaderboard(allTasks, team, targets, Object.keys(team))} onNavigate={setPage ? function() { setPage("leagueMonthly"); } : null} monthlyBonus={monthlyBonus} title={"Liga Membrilor"} subtitle={"Taskuri finalizate luna aceasta"} />}

    {/* Target progress */}
    {myTargets.length > 0 && <Card style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 14 }}>Target-urile tale</div>
      {myTargets.map(function(tgt) {
        var normM = tgt.metric;
        if (normM && normM !== "all" && !normM.startsWith("type:") && !normM.startsWith("dept:") && !normM.startsWith("plat:")) normM = "type:" + normM;
        var tgtDoneToday = myTasks.filter(function(t) {
          if (t.status !== "Done" || !t.updatedAt || ds(t.updatedAt) !== TD) return false;
          if (!normM || normM === "all") return true;
          if (normM.startsWith("type:") && t.taskType === normM.replace("type:", "")) return true;
          if (normM.startsWith("dept:") && t.department === normM.replace("dept:", "")) return true;
          if (normM.startsWith("plat:") && t.platform === normM.replace("plat:", "")) return true;
          return false;
        }).length;
        var pct = tgt.target > 0 ? Math.min(100, (tgtDoneToday / tgt.target) * 100) : 0;
        var rem = Math.max(0, tgt.target - tgtDoneToday);
        var mLabel = normM === "all" ? "Toate" : (normM || "").replace(/^(type:|dept:|plat:)/, "");
        return <div key={tgt.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: "#475569", fontWeight: 600 }}>{mLabel}</span>
            <span style={{ fontWeight: 700, color: pct >= 100 ? GR : "#475569" }}>{tgtDoneToday}/{tgt.target}</span>
          </div>
          <div style={{ height: 10, background: "#F1F5F9", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: pct >= 100 ? GR : pct >= 50 ? "#D97706" : "#DC2626", transition: "width 0.4s" }} />
          </div>
          <div style={{ fontSize: 10, color: pct >= 100 ? GR : "#64748B", marginTop: 4, fontWeight: 600 }}>{pct >= 100 ? "✓ Target atins! Felicitari!" : "Mai ai " + rem + " pana la target"}</div>
        </div>;
      })}
    </Card>}

    {/* 7-day trend + Avg time */}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "2fr 1fr", gap: 12, marginBottom: 16 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>Productivitatea ta - 7 zile</div>
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>Total saptamana: <b style={{ color: GR }}>{weekTotal}</b> taskuri finalizate</div>
          </div>
        </div>
        <svg viewBox="0 0 700 220" style={{ width: "100%", height: "auto" }}>
          {[0, 0.25, 0.5, 0.75, 1].map(function(r, i) { return <line key={i} x1="40" y1={30 + 150 * r} x2="680" y2={30 + 150 * r} stroke="#F1F5F9" strokeWidth="1" />; })}
          {[0, 0.5, 1].map(function(r, i) { return <text key={i} x="32" y={30 + 150 * (1 - r) + 4} fontSize="10" fill="#94A3B8" textAnchor="end">{Math.round(maxTrend * r)}</text>; })}
          {trendData.map(function(d, i) {
            var barW = (640 / trendData.length) * 0.6;
            var xBase = 50 + i * (640 / trendData.length) + (640 / trendData.length - barW) / 2;
            var hDone = (d.done / maxTrend) * 150;
            var isWeekend = d.dow === 0 || d.dow === 6;
            var isToday = d.date === TD;
            var color = d.onLeave ? "#D97706" : isWeekend ? "#CBD5E1" : isToday ? GR : "#60A5FA";
            return <g key={i}>
              <rect x={xBase} y={180 - hDone} width={barW} height={Math.max(hDone, 2)} fill={color} opacity={d.onLeave ? 0.6 : 0.95} rx="4" />
              {d.onLeave && <text x={xBase + barW / 2} y={180 - hDone - 18} fontSize="9" fill="#D97706" textAnchor="middle" fontWeight="700">🏖</text>}
              <text x={xBase + barW / 2} y="200" fontSize="10" fill={isWeekend ? "#CBD5E1" : "#64748B"} textAnchor="middle" fontWeight={isToday ? "700" : "400"}>{d.label}</text>
              {d.done > 0 && <text x={xBase + barW / 2} y={180 - hDone - 4} fontSize="10" fill={isToday ? GR : "#475569"} textAnchor="middle" fontWeight="700">{d.done}</text>}
            </g>;
          })}
        </svg>
        <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: GR, borderRadius: 2 }} /><span style={{ color: "#64748B" }}>Azi</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#60A5FA", borderRadius: 2 }} /><span style={{ color: "#64748B" }}>Zile de lucru</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#D97706", borderRadius: 2, opacity: 0.6 }} /><span style={{ color: "#64748B" }}>Concediu</span></div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>Timp pe task</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>Din timerele taskurilor tale</div>
        <div style={{ padding: "14px 0", textAlign: "center", borderBottom: "1px solid #F1F5F9", marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Medie</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#7C3AED", fontVariantNumeric: "tabular-nums" }}>{avgTime > 0 ? ft(avgTime) : "-"}</div>
          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>pe task finalizat</div>
        </div>
        <div style={{ padding: "8px 0", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Total lucrat</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", fontVariantNumeric: "tabular-nums" }}>{totalTimeWorked > 0 ? ft(totalTimeWorked) : "-"}</div>
          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{finishedWithTime.length} taskuri cronometrate</div>
        </div>
      </Card>
    </div>

    {/* Performance gauge + Achievements */}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 2fr", gap: 12, marginBottom: 16 }}>
      {/* Performance gauge */}
      <Card style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>Performance</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>Scorul tau general</div>
        <svg viewBox="0 0 200 130" style={{ width: "100%", maxWidth: 200 }}>
          <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="#F1F5F9" strokeWidth="18" strokeLinecap="round" />
          {(function() {
            var angle = (perf.score / 100) * 180;
            var endX = 100 - 80 * Math.cos((angle * Math.PI) / 180);
            var endY = 110 - 80 * Math.sin((angle * Math.PI) / 180);
            var largeArc = angle > 180 ? 1 : 0;
            var col = perf.score >= 70 ? GR : perf.score >= 40 ? "#D97706" : "#DC2626";
            return <path d={"M 20 110 A 80 80 0 " + largeArc + " 1 " + endX + " " + endY} fill="none" stroke={col} strokeWidth="18" strokeLinecap="round" />;
          })()}
          <text x="100" y="98" textAnchor="middle" fontSize="32" fontWeight="800" fill={perf.score >= 70 ? GR : perf.score >= 40 ? "#D97706" : "#DC2626"}>{perf.score}</text>
          <text x="100" y="115" textAnchor="middle" fontSize="11" fill="#94A3B8">%</text>
        </svg>
        <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>{perf.score >= 70 ? "Excelent! Continua asa!" : perf.score >= 40 ? "Bine, dar mai e loc" : "Concentreaza-te"}</div>
      </Card>

      {/* Achievements */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>Achievements & Titluri</div>
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>Deblocate: <b>{myAch.length}</b> / {ACHIEVEMENTS.filter(function(a) { return a.role === "all" || a.role === me.role; }).length}</div>
          </div>
          {(function() {
            var userAchObjs = myAch.map(function(id) { return ACHIEVEMENTS.find(function(a) { return a.id === id; }); }).filter(Boolean);
            var topAch = userAchObjs.sort(function(a, b) { var order = { platinum: 4, gold: 3, silver: 2, bronze: 1 }; return (order[b.tier] || 0) - (order[a.tier] || 0); })[0];
            if (!topAch) return null;
            var tier = TIERS[topAch.tier];
            return <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: tier.bg, border: "1px solid " + tier.color + "50" }}>
              <span style={{ fontSize: 10, color: tier.color, fontWeight: 700 }}>Titlu: {topAch.title}</span>
            </div>;
          })()}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 8 }}>
          {ACHIEVEMENTS.filter(function(a) { return a.role === "all" || a.role === me.role; }).map(function(a) {
            var unlocked = myAch.includes(a.id);
            var tier = TIERS[a.tier] || TIERS.bronze;
            return <div key={a.id} title={a.desc} style={{ padding: "10px 6px", borderRadius: 8, background: unlocked ? tier.bg : "#F8FAFC", textAlign: "center", opacity: unlocked ? 1 : 0.35, border: "1px solid " + (unlocked ? tier.color + "40" : "#E2E8F0"), position: "relative" }}>
              {unlocked && <div style={{ position: "absolute", top: 2, right: 4, fontSize: 8, fontWeight: 700, color: tier.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{tier.name}</div>}
              <div style={{ fontSize: 22, marginBottom: 2, filter: unlocked ? "none" : "grayscale(1)" }}>{a.icon}</div>
              <div style={{ fontSize: 9, color: unlocked ? tier.color : "#94A3B8", fontWeight: 700, lineHeight: 1.2 }}>{a.name}</div>
            </div>;
          })}
        </div>
      </Card>
    </div>

    {/* Your tasks teaser */}
    {activeTasks.length > 0 && <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>Taskurile tale active ({activeTasks.length})</div>
      </div>
      {activeTasks.slice(0, 5).map(function(t) {
        var ov = isOv(t);
        var running = timers[t.id] && timers[t.id].running;
        return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, background: running ? "#FEF2F2" : ov ? "#FEF2F2" : "#F8FAFC", borderLeft: "3px solid " + (running ? "#DC2626" : ov ? "#DC2626" : t.status === "In Progress" ? "#2563EB" : "#94A3B8"), marginBottom: 4 }}>
          {running && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite", flexShrink: 0 }} />}
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
          {t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}
          <Badge bg={SBG[t.status]} color={SC[t.status]}>{t.status}</Badge>
          {ov && <Badge bg="#FEF2F2" color="#DC2626">Intarziat</Badge>}
          {running && <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{ft((timers[t.id].total || 0) + (timers[t.id].startedAt ? Math.floor((Date.now() - new Date(timers[t.id].startedAt).getTime()) / 1000) : 0))}</span>}
        </div>;
      })}
      {activeTasks.length > 5 && <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 6 }}>...si inca {activeTasks.length - 5} taskuri. Vezi toate in pagina Taskuri.</div>}
    </Card>}
  </div>;
}

function TaskDetailModal({ title, color, tasks, team, onClose, setPage }) {
  return <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
    <div onClick={function(e) { e.stopPropagation(); }} style={{ background: "#fff", borderRadius: 12, maxWidth: 720, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "4px solid " + color, borderRadius: "12px 12px 0 0" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1E293B" }}>{title}</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{tasks.length} taskuri</div>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "#F1F5F9", width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d={Icons.x} size={14} color="#64748B" /></button>
      </div>
      <div style={{ overflowY: "auto", padding: "12px 20px", flex: 1 }}>
        {tasks.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Nu sunt taskuri.</div> : tasks.map(function(t) {
          var a = team[t.assignee] || {};
          var days = t.updatedAt ? Math.floor((Date.now() - new Date(t.updatedAt).getTime()) / 86400000) : 0;
          return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "#F8FAFC", marginBottom: 6, borderLeft: "3px solid " + color }}>
            {a.color && <Av color={a.color} size={26} fs={11}>{(a.name || "?")[0]}</Av>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>{a.name || "?"}</span>
                {t.shop && <span style={{ color: GR, fontWeight: 600 }}>{t.shop}</span>}
                <Badge bg={SBG[t.status] || "#F1F5F9"} color={SC[t.status] || "#64748B"}>{t.status}</Badge>
                {t.deadline && <span style={{ color: isOv(t) ? "#DC2626" : "#94A3B8" }}>Deadline: {fd(t.deadline)}</span>}
                {days > 0 && t.status !== "Done" && <span style={{ color: "#94A3B8" }}>(acum {days}z)</span>}
              </div>
            </div>
          </div>;
        })}
      </div>
      {setPage && <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button style={S.cancelBtn} onClick={onClose}>Inchide</button>
        <button style={S.primBtn} onClick={function() { setPage("tasks"); onClose(); }}>Vezi in Taskuri</button>
      </div>}
    </div>
  </div>;
}

function AdminInsights({ allTasks, team, visUsers, timers, isMob, setPage }) {
  var [detailModal, setDetailModal] = useState(null);
  // === 7-day productivity trend ===
  var trendData = [];
  for (var i = 6; i >= 0; i--) {
    var dt = new Date(); dt.setDate(dt.getDate() - i);
    var dStr = ds(dt);
    var done = allTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === dStr && !t._campaignParent; }).length;
    var created = allTasks.filter(function(t) { return t.createdAt && ds(t.createdAt) === dStr && !t._campaignParent; }).length;
    trendData.push({ date: dStr, label: dt.getDate() + " " + MN[dt.getMonth()].substring(0, 3), done: done, created: created, dow: dt.getDay() });
  }
  var maxTrend = Math.max.apply(null, trendData.map(function(d) { return Math.max(d.done, d.created); }).concat([1]));

  // === Platform breakdown ===
  var platformCount = {};
  allTasks.forEach(function(t) { if (t.status !== "Done" && !t._campaignParent) { var p = t.platform || "Alta"; platformCount[p] = (platformCount[p] || 0) + 1; } });
  var platformData = Object.keys(platformCount).map(function(k) { return { label: k, value: platformCount[k] }; }).sort(function(a, b) { return b.value - a.value; }).slice(0, 6);
  var totalPlatform = platformData.reduce(function(acc, p) { return acc + p.value; }, 0);

  // === Shop performance (Done last 7 days) ===
  var shopStats = {};
  allTasks.forEach(function(t) {
    if (!t.shop || t._campaignParent) return;
    if (!shopStats[t.shop]) shopStats[t.shop] = { done: 0, total: 0, active: 0 };
    shopStats[t.shop].total++;
    if (t.status === "Done") { var daysAgo = Math.floor((Date.now() - new Date(t.updatedAt || t.createdAt).getTime()) / 86400000); if (daysAgo <= 7) shopStats[t.shop].done++; }
    else shopStats[t.shop].active++;
  });
  var shopData = Object.keys(shopStats).map(function(k) { return { label: k, done: shopStats[k].done, active: shopStats[k].active }; }).sort(function(a, b) { return (b.done + b.active) - (a.done + a.active); }).slice(0, 8);
  var maxShop = Math.max.apply(null, shopData.map(function(s) { return s.done + s.active; }).concat([1]));

  // === Top performers this week ===
  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  var perfData = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) {
    var userDone = allTasks.filter(function(t) { return t.assignee === u && t.status === "Done" && t.updatedAt && new Date(t.updatedAt) >= weekAgo && !t._campaignParent; }).length;
    return { user: u, name: (team[u] || {}).name || u, color: (team[u] || {}).color || "#94A3B8", done: userDone };
  }).sort(function(a, b) { return b.done - a.done; });
  var maxPerf = Math.max.apply(null, perfData.map(function(p) { return p.done; }).concat([1]));

  // === Blockers (stuck > 48h in same status) ===
  var now = Date.now();
  var blockers = allTasks.filter(function(t) {
    if (t.status === "Done" || t._campaignParent) return false;
    var lastUpdate = new Date(t.updatedAt || t.createdAt).getTime();
    var hoursStuck = (now - lastUpdate) / 3600000;
    return hoursStuck > 48;
  }).sort(function(a, b) { return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime(); }).slice(0, 5);

  // === Overdue alert ===
  var overdueAll = allTasks.filter(function(t) { return t.status !== "Done" && !t._campaignParent && isP(t.deadline); });
  var urgentAll = allTasks.filter(function(t) { return t.priority === "Urgent" && t.status !== "Done" && !t._campaignParent; });

  // === Avg time per type (from timers) ===
  var typeTimeMap = {};
  allTasks.forEach(function(t) {
    if (t.status !== "Done" || !t.taskType) return;
    var tm = timers[t.id]; if (!tm || !tm.total) return;
    if (!typeTimeMap[t.taskType]) typeTimeMap[t.taskType] = { total: 0, count: 0 };
    typeTimeMap[t.taskType].total += tm.total;
    typeTimeMap[t.taskType].count++;
  });
  var typeTimeData = Object.keys(typeTimeMap).map(function(k) { return { label: k, avg: Math.round(typeTimeMap[k].total / typeTimeMap[k].count) }; }).sort(function(a, b) { return b.avg - a.avg; }).slice(0, 5);

  // === Today vs Yesterday comparison ===
  var todayDone = allTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === TD && !t._campaignParent; }).length;
  var yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  var yDone = allTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === ds(yesterday) && !t._campaignParent; }).length;
  var deltaPct = yDone > 0 ? Math.round(((todayDone - yDone) / yDone) * 100) : (todayDone > 0 ? 100 : 0);

  var chartColors = { done: GR, created: "#2563EB", pending: "#94A3B8", urgent: "#DC2626", review: "#D97706" };

  return <div style={{ marginBottom: 24 }}>
    {detailModal && <TaskDetailModal title={detailModal.title} color={detailModal.color} tasks={detailModal.tasks} team={team} onClose={function() { setDetailModal(null); }} setPage={setPage} />}
    {/* Alert strip */}
    {(overdueAll.length > 0 || urgentAll.length > 0 || blockers.length > 0) && <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
      {overdueAll.length > 0 && <Card onClick={function() { setDetailModal({ title: "Taskuri intarziate", color: "#DC2626", tasks: overdueAll }); }} style={{ borderLeft: "3px solid #DC2626", background: "#FEF2F2", padding: 12, cursor: "pointer", transition: "transform 0.1s" }} onMouseDown={function(e) { e.currentTarget.style.transform = "scale(0.98)"; }} onMouseUp={function(e) { e.currentTarget.style.transform = "scale(1)"; }} onMouseLeave={function(e) { e.currentTarget.style.transform = "scale(1)"; }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>INTARZIATE</div>
          <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>Click pentru detalii ▶</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#DC2626" }}>{overdueAll.length}</div>
        <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Taskuri cu deadline depasit</div>
      </Card>}
      {urgentAll.length > 0 && <Card onClick={function() { setDetailModal({ title: "Taskuri urgente", color: "#EA580C", tasks: urgentAll }); }} style={{ borderLeft: "3px solid #EA580C", background: "#FFF7ED", padding: 12, cursor: "pointer", transition: "transform 0.1s" }} onMouseDown={function(e) { e.currentTarget.style.transform = "scale(0.98)"; }} onMouseUp={function(e) { e.currentTarget.style.transform = "scale(1)"; }} onMouseLeave={function(e) { e.currentTarget.style.transform = "scale(1)"; }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>URGENTE</div>
          <span style={{ fontSize: 10, color: "#EA580C", fontWeight: 600 }}>Click pentru detalii ▶</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#EA580C" }}>{urgentAll.length}</div>
        <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Prioritate urgenta, nefinalizate</div>
      </Card>}
      {blockers.length > 0 && <Card onClick={function() { setDetailModal({ title: "Blocaje (> 48h)", color: "#7C3AED", tasks: blockers }); }} style={{ borderLeft: "3px solid #7C3AED", background: "#F5F3FF", padding: 12, cursor: "pointer", transition: "transform 0.1s" }} onMouseDown={function(e) { e.currentTarget.style.transform = "scale(0.98)"; }} onMouseUp={function(e) { e.currentTarget.style.transform = "scale(1)"; }} onMouseLeave={function(e) { e.currentTarget.style.transform = "scale(1)"; }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>BLOCAJE</div>
          <span style={{ fontSize: 10, color: "#7C3AED", fontWeight: 600 }}>Click pentru detalii ▶</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#7C3AED" }}>{blockers.length}</div>
        <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Fara miscare &gt; 48h</div>
      </Card>}
    </div>}

    {/* Main grid: trend + platform */}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "2fr 1fr", gap: 12, marginBottom: 12 }}>
      {/* 7-day productivity trend */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>Productivitate ultimele 7 zile</div>
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>Done vs Creat pe zi</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: deltaPct >= 0 ? "#ECFDF5" : "#FEF2F2" }}>
            <span style={{ fontSize: 11, color: deltaPct >= 0 ? GR : "#DC2626", fontWeight: 700 }}>{deltaPct >= 0 ? "+" : ""}{deltaPct}%</span>
            <span style={{ fontSize: 9, color: "#94A3B8" }}>vs ieri</span>
          </div>
        </div>
        <svg viewBox="0 0 700 220" style={{ width: "100%", height: "auto" }}>
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(function(r, i) { return <line key={i} x1="40" y1={30 + 150 * r} x2="680" y2={30 + 150 * r} stroke="#F1F5F9" strokeWidth="1" />; })}
          {/* Y axis labels */}
          {[0, 0.5, 1].map(function(r, i) { return <text key={i} x="32" y={30 + 150 * (1 - r) + 4} fontSize="10" fill="#94A3B8" textAnchor="end">{Math.round(maxTrend * r)}</text>; })}
          {/* bars */}
          {trendData.map(function(d, i) {
            var barW = 640 / trendData.length / 3;
            var xBase = 50 + i * (640 / trendData.length) + (640 / trendData.length) / 6;
            var hDone = (d.done / maxTrend) * 150;
            var hCreated = (d.created / maxTrend) * 150;
            var isWeekend = d.dow === 0 || d.dow === 6;
            return <g key={i}>
              <rect x={xBase} y={180 - hCreated} width={barW} height={hCreated} fill={chartColors.created} opacity={isWeekend ? 0.4 : 0.85} rx="3" />
              <rect x={xBase + barW + 4} y={180 - hDone} width={barW} height={hDone} fill={chartColors.done} opacity={isWeekend ? 0.4 : 0.95} rx="3" />
              <text x={xBase + barW + 2} y="200" fontSize="10" fill={isWeekend ? "#CBD5E1" : "#64748B"} textAnchor="middle" fontWeight={d.date === TD ? "700" : "400"}>{d.label}</text>
              {d.done > 0 && <text x={xBase + barW + 4 + barW / 2} y={180 - hDone - 4} fontSize="9" fill={GR} textAnchor="middle" fontWeight="700">{d.done}</text>}
            </g>;
          })}
        </svg>
        <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: chartColors.created, borderRadius: 2 }} /><span style={{ color: "#64748B" }}>Creat</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: chartColors.done, borderRadius: 2 }} /><span style={{ color: "#64748B" }}>Done</span></div>
        </div>
      </Card>

      {/* Platform breakdown donut */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Platforma (active)</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>{totalPlatform} taskuri nefinalizate</div>
        {platformData.length > 0 ? <div>
          <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 160, display: "block", margin: "0 auto" }}>
            {(function() {
              var accumulated = 0;
              var palette = ["#2563EB", "#16A34A", "#D97706", "#7C3AED", "#DC2626", "#EC4899"];
              return platformData.map(function(p, i) {
                var frac = p.value / totalPlatform;
                var start = accumulated * 2 * Math.PI - Math.PI / 2;
                var end = (accumulated + frac) * 2 * Math.PI - Math.PI / 2;
                accumulated += frac;
                var r = 70, cx = 100, cy = 100;
                var x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
                var x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
                var largeArc = frac > 0.5 ? 1 : 0;
                return <path key={i} d={"M " + cx + " " + cy + " L " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + largeArc + " 1 " + x2 + " " + y2 + " Z"} fill={palette[i % palette.length]} opacity="0.9" />;
              });
            })()}
            <circle cx="100" cy="100" r="45" fill="#fff" />
            <text x="100" y="95" fontSize="22" fill="#1E293B" textAnchor="middle" fontWeight="800">{totalPlatform}</text>
            <text x="100" y="112" fontSize="10" fill="#94A3B8" textAnchor="middle">taskuri</text>
          </svg>
          <div style={{ marginTop: 10 }}>
            {platformData.map(function(p, i) {
              var palette = ["#2563EB", "#16A34A", "#D97706", "#7C3AED", "#DC2626", "#EC4899"];
              var pct = Math.round((p.value / totalPlatform) * 100);
              return <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "3px 0" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: palette[i % palette.length] }} />
                <span style={{ flex: 1, color: "#475569" }}>{p.label}</span>
                <span style={{ color: "#94A3B8" }}>{p.value}</span>
                <span style={{ color: "#1E293B", fontWeight: 700, minWidth: 32, textAlign: "right" }}>{pct}%</span>
              </div>;
            })}
          </div>
        </div> : <div style={{ textAlign: "center", padding: 30, color: "#94A3B8", fontSize: 12 }}>Nu sunt taskuri active</div>}
      </Card>
    </div>

    {/* Second row: performers + shops */}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
      {/* Top performers */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Top performeri - saptamana</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>Taskuri finalizate ultimele 7 zile</div>
        {perfData.slice(0, 7).map(function(p, i) {
          var pct = maxPerf > 0 ? (p.done / maxPerf) * 100 : 0;
          return <div key={p.user} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: i === 0 ? "#FDE047" : i === 1 ? "#E5E7EB" : i === 2 ? "#F97316" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: i < 3 ? "#fff" : "#94A3B8", flexShrink: 0 }}>{i + 1}</div>
            <Av color={p.color} size={22} fs={9}>{p.name[0]}</Av>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{p.name}</span>
                <span style={{ fontSize: 11, color: p.done > 0 ? GR : "#94A3B8", fontWeight: 700 }}>{p.done}</span>
              </div>
              <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: i === 0 ? GR : i < 3 ? "#60A5FA" : "#CBD5E1", borderRadius: 3, transition: "width 0.3s" }} />
              </div>
            </div>
          </div>;
        })}
      </Card>

      {/* Shop performance */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Magazine - activitate</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>Done (7zile) vs Active</div>
        {shopData.length > 0 ? shopData.map(function(s) {
          var total = s.done + s.active;
          var donePct = total > 0 ? (s.done / total) * 100 : 0;
          var widthTotal = total / maxShop * 100;
          return <div key={s.label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: "#475569", fontWeight: 600 }}>{s.label}</span>
              <span style={{ color: "#94A3B8" }}>{s.done} done / {s.active} active</span>
            </div>
            <div style={{ display: "flex", height: 10, borderRadius: 3, overflow: "hidden", width: widthTotal + "%", background: "#F1F5F9" }}>
              <div style={{ width: donePct + "%", background: GR }} />
              <div style={{ width: (100 - donePct) + "%", background: "#60A5FA", opacity: 0.6 }} />
            </div>
          </div>;
        }) : <div style={{ textAlign: "center", padding: 20, color: "#94A3B8", fontSize: 12 }}>Nu sunt magazine cu activitate</div>}
      </Card>
    </div>

    {/* Third row: time per type + blockers */}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
      {/* Avg time per type */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Timp mediu pe tip task</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>Pe baza timer-elor taskurilor finalizate</div>
        {typeTimeData.length > 0 ? typeTimeData.map(function(t) {
          var maxVal = typeTimeData[0].avg;
          var pct = (t.avg / maxVal) * 100;
          return <div key={t.label} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: "#475569", fontWeight: 600 }}>{t.label}</span>
              <span style={{ color: "#1E293B", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{ft(t.avg)}</span>
            </div>
            <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%", background: "#7C3AED", opacity: 0.75, borderRadius: 3 }} />
            </div>
          </div>;
        }) : <div style={{ textAlign: "center", padding: 20, color: "#94A3B8", fontSize: 12 }}>Nu sunt date de timer</div>}
      </Card>

      {/* Blockers */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Blocaje (nu s-au miscat &gt; 48h)</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>Taskuri ramase fara progres</div>
        {blockers.length > 0 ? blockers.map(function(t) {
          var hours = Math.floor((Date.now() - new Date(t.updatedAt || t.createdAt).getTime()) / 3600000);
          var days = Math.floor(hours / 24);
          var a = team[t.assignee] || {};
          return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, borderRadius: 5, background: "#FFFBEB", borderLeft: "2px solid #D97706" }}>
            {a.color && <Av color={a.color} size={20} fs={9}>{(a.name || "?")[0]}</Av>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
              <div style={{ fontSize: 9, color: "#94A3B8" }}>{a.name || "?"} | {t.status}</div>
            </div>
            <span style={{ fontSize: 10, color: "#D97706", fontWeight: 700, flexShrink: 0 }}>{days > 0 ? days + "z" : hours + "h"}</span>
          </div>;
        }) : <div style={{ textAlign: "center", padding: 20, color: GR, fontSize: 12, fontWeight: 600 }}>✓ Fara blocaje</div>}
      </Card>
    </div>
  </div>;
}

function DashPage({ stats, tasks, team, visUsers, sessions, timers, getTS, getPerf, isMob, onClickUser, targets, loginTrack, allTasks, slaBreaches, me, anomalies, dailyChallenge, announcements, user, setAnnouncements, leaves, setPage, achievements, monthlyBonus }) {
  var [dashFrom, setDashFrom] = useState(TD);
  var [kpiModal, setKpiModal] = useState(null);
  var [dashTo, setDashTo] = useState(TD);
  var [dashPreset, setDashPreset] = useState("today");
  var [editMode, setEditMode] = useState(false);
  var [dragBlockId, setDragBlockId] = useState(null);
  var [dashLayout, setDashLayout] = useState(function() {
    try { var saved = localStorage.getItem("s7_dash_layout"); if (saved) return JSON.parse(saved); } catch(e) {}
    return [
      { id: "kpiRow", visible: true },
      { id: "live", visible: true },
      { id: "podium", visible: true },
      { id: "insights", visible: true },
      { id: "team", visible: true }
    ];
  });
  useEffect(function() { try { localStorage.setItem("s7_dash_layout", JSON.stringify(dashLayout)); } catch(e) {} }, [dashLayout]);

  var moveBlock = function(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    setDashLayout(function(prev) {
      var arr = prev.slice();
      var fromIdx = arr.findIndex(function(b) { return b.id === fromId; });
      var toIdx = arr.findIndex(function(b) { return b.id === toId; });
      if (fromIdx < 0 || toIdx < 0) return prev;
      var item = arr.splice(fromIdx, 1)[0];
      arr.splice(toIdx, 0, item);
      return arr;
    });
  };

  var toggleBlockVisibility = function(id) {
    setDashLayout(function(prev) { return prev.map(function(b) { return b.id === id ? Object.assign({}, b, { visible: !b.visible }) : b; }); });
  };

  var resetLayout = function() {
    if (!window.confirm("Resetezi dashboard-ul la ordinea default?")) return;
    setDashLayout([
      { id: "kpiRow", visible: true },
      { id: "live", visible: true },
      { id: "podium", visible: true },
      { id: "insights", visible: true },
      { id: "team", visible: true }
    ]);
  };

  var blockLabels = {
    kpiRow: "KPI Row (Total/To Do/...)",
    live: "Live Timers",
    podium: "Liga Saptamanii - Podium",
    insights: "Admin Insights (grafice, alerts)",
    team: "Cardurile Echipei"
  };

  var setPreset = function(p) {
    setDashPreset(p);
    if (p === "today") { setDashFrom(TD); setDashTo(TD); }
    else if (p === "yesterday") { setDashFrom(YESTERDAY); setDashTo(YESTERDAY); }
    else if (p === "week") { var d = new Date(); d.setDate(d.getDate() - 7); setDashFrom(ds(d)); setDashTo(TD); }
    else if (p === "month") { var d2 = new Date(); d2.setDate(d2.getDate() - 30); setDashFrom(ds(d2)); setDashTo(TD); }
  };

  var rangeTasks = useMemo(function() {
    return tasks.filter(function(t) {
      // Use createdAt primarily (when task was created), fallback to deadline
      var taskDate = null;
      if (t.createdAt) { taskDate = ds(t.createdAt); }
      else if (t.deadline) { taskDate = t.deadline; }
      if (!taskDate) return false;
      return taskDate >= dashFrom && taskDate <= dashTo;
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
    {/* SLA Breaches */}
    {slaBreaches && slaBreaches.length > 0 && me.role === "admin" && <Card style={{ marginBottom: 16, borderLeft: "3px solid #DC2626", background: "#FEF2F2" }}><h3 style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>SLA Breaches ({slaBreaches.length})</h3>{slaBreaches.slice(0, 5).map(function(b) { return <div key={b.task.id} style={{ fontSize: 12, padding: "4px 0", display: "flex", gap: 8 }}><span style={{ fontWeight: 600 }}>{b.task.title}</span><Badge bg="#FEF2F2" color="#DC2626">{b.task.shop}</Badge><span style={{ color: "#DC2626" }}>{b.hours}h / {b.max}h max</span></div>; })}</Card>}
    {/* Date range + Edit mode toggle */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {[{ id: "today", l: "Azi" }, { id: "yesterday", l: "Ieri" }, { id: "week", l: "7 zile" }, { id: "month", l: "30 zile" }, { id: "custom", l: "Custom" }].map(function(p) {
          return <button key={p.id} onClick={function() { setPreset(p.id); }} style={Object.assign({}, S.chip, { background: dashPreset === p.id ? GR : "#F1F5F9", color: dashPreset === p.id ? "#fff" : "#475569", fontWeight: dashPreset === p.id ? 600 : 400 })}>{p.l}</button>;
        })}
        <input type="date" style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 8px" })} value={dashFrom} onChange={function(e) { setDashFrom(e.target.value); setDashPreset("custom"); }} />
        <input type="date" style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 8px" })} value={dashTo} onChange={function(e) { setDashTo(e.target.value); setDashPreset("custom"); }} />
      </div>
      {me && me.role === "admin" && <div style={{ display: "flex", gap: 6 }}>
        {editMode && <button onClick={resetLayout} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", color: "#64748B", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>↻ Reset</button>}
        <button onClick={function() { setEditMode(!editMode); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid " + (editMode ? GR : "#CBD5E1"), background: editMode ? GR : "#fff", color: editMode ? "#fff" : "#475569", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          {editMode ? "✓ Gata" : "✎ Customizeaza"}
        </button>
      </div>}
    </div>

    {editMode && <Card style={{ marginBottom: 14, background: "#EFF6FF", borderLeft: "3px solid #2563EB" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF", marginBottom: 6 }}>Mod customizare activat</div>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>Trage blocurile de manerul (☰) ca sa le reordonezi. Foloseste checkbox-urile pentru a ascunde/afisa.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {dashLayout.map(function(b) {
          return <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: b.visible ? "#fff" : "#F1F5F9", border: "1px solid " + (b.visible ? "#2563EB40" : "#CBD5E1"), fontSize: 11, cursor: "pointer" }}>
            <input type="checkbox" checked={b.visible} onChange={function() { toggleBlockVisibility(b.id); }} />
            <span style={{ color: b.visible ? "#1E293B" : "#94A3B8", fontWeight: 600 }}>{blockLabels[b.id] || b.id}</span>
          </label>;
        })}
      </div>
    </Card>}

    {kpiModal && <TaskDetailModal title={kpiModal.title} color={kpiModal.color} tasks={kpiModal.tasks} team={team} onClose={function() { setKpiModal(null); }} setPage={setPage} />}

    {(function() {
      var renderBlock = function(id) {
        if (id === "kpiRow") return <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(6,1fr)", gap: 12 }}>{[
          { l: "Total", v: rangeStats.total, c: "#475569", filter: function(t) { return true; } },
          { l: "To Do", v: rangeStats.todo, c: "#94A3B8", filter: function(t) { return t.status === "To Do"; } },
          { l: "In Progress", v: rangeStats.inProg, c: "#2563EB", filter: function(t) { return t.status === "In Progress"; } },
          { l: "Review", v: rangeStats.review, c: "#D97706", filter: function(t) { return t.status === "Review"; } },
          { l: "Intarziate", v: rangeStats.overdue, c: "#DC2626", filter: function(t) { return isOv(t); } },
          { l: "Done", v: rangeStats.done, c: GR, filter: function(t) { return t.status === "Done"; } }
        ].map(function(s) {
          return <Card key={s.l} onClick={editMode ? undefined : function() { setKpiModal({ title: s.l + " (" + dashPreset + ")", color: s.c, tasks: rangeTasks.filter(s.filter) }); }} style={{ borderTop: "3px solid " + s.c, cursor: editMode ? "default" : "pointer", transition: "all 0.15s" }} onMouseEnter={function(e) { if (!editMode) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; } }} onMouseLeave={function(e) { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{s.l}</div>
          </Card>;
        })}</div>;
        if (id === "live") return activeTimers.length > 0 ? <Card style={{ borderLeft: "3px solid #DC2626" }}><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite" }} /> Live ({activeTimers.length})</h3>{activeTimers.map(function(t) { var a = team[t.assignee]; return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>{a && <Av color={a.color} size={24} fs={10} userId={t.assignee}>{a.name[0]}</Av>}<span style={{ fontSize: 12, color: "#64748B" }}>{a ? a.name : ""}</span><span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{t.title}</span>{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}<span style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{ft(getTS(t.id))}</span></div>; })}</Card> : null;
        if (id === "podium") return <div>
          <PodiumCompact leaderboard={calcMemberLeaderboard(allTasks, team, targets, Object.keys(team))} onNavigate={!editMode && setPage ? function() { setPage("leagueMonthly"); } : null} monthlyBonus={monthlyBonus} title={"Liga Membrilor"} subtitle={"Cine implementeaza cel mai mult"} />
          <PodiumCompact leaderboard={calcPMLeaderboard(allTasks, team, Object.keys(team))} onNavigate={!editMode && setPage ? function() { setPage("leagueMonthly"); } : null} title={"Liga PM-ilor"} subtitle={"Cine coordoneaza cel mai bine"} />
        </div>;
        if (id === "insights") return <AdminInsights allTasks={allTasks} team={team} visUsers={visUsers} timers={timers} isMob={isMob} setPage={setPage} />;
        if (id === "team") return <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Echipa</h3>
          <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(380px,1fr))", gap: 12 }}>{ppl.map(function(d) {
            return <Card key={d.key} style={{ cursor: "pointer" }}>
              <div onClick={function() { onClickUser(d.key); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ position: "relative" }}><Av color={d.color} size={38} userId={d.key}>{d.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: d.online ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 10, color: "#94A3B8" }}>{d.role === "pm" ? "PM" : "Member"}</div></div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: d.perf.score >= 70 ? GR : d.perf.score >= 40 ? "#D97706" : "#DC2626" }}>{d.perf.score}%</div>
                </div>
          {me && me.role === "admin" && <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#94A3B8", marginBottom: 8, flexWrap: "wrap" }}>
            {isOnLeave(leaves, d.key, TD) ? <Badge bg="#FFFBEB" color="#D97706">🏖 Concediu azi</Badge> : <Badge bg={d.hasLoggedToday ? "#ECFDF5" : "#FEF2F2"} color={d.hasLoggedToday ? GR : "#DC2626"}>{d.hasLoggedToday ? "Activ azi" : "Nu a intrat azi"}</Badge>}
            {d.firstLogin && <span>Prima: {new Date(d.firstLogin).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>}
            {d.lastLogin && <span>Ultima: {new Date(d.lastLogin).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>}
          {me && me.role === "admin" && !isOnLeave(leaves, d.key, TD) && d.userTargets.length > 0 && d.userTargets.map(function(tgt) {
            var normM = tgt.metric;
            if (normM && normM !== "all" && !normM.startsWith("type:") && !normM.startsWith("dept:") && !normM.startsWith("plat:")) normM = "type:" + normM;
            var tgtDoneToday = allTasks.filter(function(t) {
              if (t.assignee !== d.key || t.status !== "Done" || !t.updatedAt || ds(t.updatedAt) !== TD) return false;
              // Exclude campaign parents - their children count individually
              if (t._campaignParent === true) return false;
              if (t.campaignItems && t.campaignItems.length > 1) return false;
              if (!normM || normM === "all") return true;
              if (normM.startsWith("type:") && t.taskType === normM.replace("type:", "")) return true;
              if (normM.startsWith("dept:") && t.department === normM.replace("dept:", "")) return true;
              if (normM.startsWith("plat:") && t.platform === normM.replace("plat:", "")) return true;
              return false;
            }).reduce(function(acc, t) {
              // Count 1 per task - campaign parents are already excluded above
              return acc + 1;
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
            {me && me.role === "admin" && d.assignedTasks.length === 0 && <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, padding: "6px 10px", borderRadius: 6, background: d.rangeDone > 0 ? "#ECFDF5" : "#FEF2F2", color: d.rangeDone > 0 ? GR : "#DC2626", display: "flex", alignItems: "center", gap: 6 }}>{d.rangeDone > 0 ? <span>✓ Taskuri finalizate ({d.rangeDone})</span> : <span>⚠ Fara taskuri active</span>}</div>}
          </div>
        </div>
      </Card>;
    })}</div>
        </div>;
        return null;
      };

      // Render all blocks in saved order with drag & drop
      return dashLayout.filter(function(b) { return b.visible; }).map(function(b) {
        var content = renderBlock(b.id);
        if (!content) return null;
        if (!editMode) {
          return <div key={b.id} style={{ marginBottom: 20 }}>{content}</div>;
        }
        // Edit mode with drag handle
        var isDragTarget = dragBlockId && dragBlockId !== b.id;
        return <div key={b.id} draggable={true}
          onDragStart={function(e) { setDragBlockId(b.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", b.id); }}
          onDragEnd={function() { setDragBlockId(null); }}
          onDragOver={function(e) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
          onDrop={function(e) { e.preventDefault(); var fromId = e.dataTransfer.getData("text/plain") || dragBlockId; moveBlock(fromId, b.id); setDragBlockId(null); }}
          style={{ marginBottom: 20, border: "2px dashed " + (isDragTarget ? "#2563EB" : "#CBD5E1"), borderRadius: 10, padding: 10, background: isDragTarget ? "#EFF6FF" : "#F8FAFC", cursor: "move", position: "relative", opacity: dragBlockId === b.id ? 0.5 : 1, transition: "all 0.15s" }}>
          <div style={{ position: "absolute", top: 8, right: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "#64748B", background: "#fff", padding: "3px 8px", borderRadius: 6, border: "1px solid #CBD5E1", zIndex: 1 }}>
            <span style={{ cursor: "move" }}>☰</span>
            <span>{blockLabels[b.id]}</span>
          </div>
          {content}
        </div>;
      });
    })()}
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
          <div style={{ position: "relative" }}><Av color={m.color} size={36} userId={u}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div>
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
    {overdueTasks.length > 0 && <Card style={{ marginBottom: 16 }}><h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#DC2626" }}>Intarziate ({overdueTasks.length})</h3>{overdueTasks.slice(0, 10).map(function(t) { var a = team[t.assignee] || {}; var daysLate = Math.floor((Date.now() - new Date(t.deadline).getTime()) / 86400000); return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #FEF2F2", fontSize: 12 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", flexShrink: 0 }} /><span style={{ flex: 1, fontWeight: 500 }}>{t.title}</span>{a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color} size={16} fs={8} userId={t.assignee}>{a.name[0]}</Av>{a.name}</span>}<Badge bg="#FEF2F2" color="#DC2626">{daysLate}z intarziere</Badge>{t.shop && <Badge bg="#F1F5F9" color="#475569">{t.shop}</Badge>}</div>; })}</Card>}

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
    <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}><div style={{ position: "relative" }}><Av color={m.color} size={56} fs={22} userId={pu}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2.5px solid #fff" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 20, fontWeight: 700 }}>{m.name}</div><div style={{ fontSize: 12, color: "#94A3B8" }}>{m.role === "pm" ? "PM" : m.role} | {on ? "Online" : "Offline - " + fr(lss)}</div></div><div style={{ textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 700, color: perf.score >= 70 ? GR : perf.score >= 40 ? "#D97706" : "#DC2626" }}>{perf.score}%</div><div style={{ fontSize: 10, color: "#94A3B8" }}>Performance</div></div><div style={{ display: "flex", gap: 8 }}>{[{ l: "Done", v: perf.done, c: GR }, { l: "Active", v: perf.active, c: "#2563EB" }, { l: "Review", v: perf.review, c: "#D97706" }, { l: "Overdue", v: perf.overdue, c: "#DC2626" }].map(function(x) { return <div key={x.l} style={{ textAlign: "center", padding: "4px 12px", background: x.c + "12", borderRadius: 8 }}><div style={{ fontSize: 18, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 9, color: "#94A3B8" }}>{x.l}</div></div>; })}</div></Card>
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
  var me = team[user] || {}; var a = team[t.assignee] || {}; var ov = isOv(t); var canChangeStatus = me.role === "admin" || t.assignee === user; var can = canChangeStatus;
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
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94A3B8", flexWrap: "wrap" }}>{a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={16} fs={8} userId={t.assignee}>{a.name[0]}</Av>{a.name}</span>}{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}{t.productName && <Badge bg="#EFF6FF" color="#2563EB">{t.productName}</Badge>}{t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}{t.links && t.links.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Ic d={Icons.link} size={10} color="#94A3B8" /> {t.links.length}</span>}{totalS > 0 && <span><Ic d={Icons.check} size={10} color="#94A3B8" /> {doneS}/{totalS}</span>}</div>
    {t.description && <div style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isMob ? "100%" : 400, marginBottom: 3 }}>{t.description}</div>}
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
    {can && t.status === "To Do" && <button onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); onChgSt(t.id, "In Progress"); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "1.5px solid " + GR, background: GR, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}><Ic d={Icons.play} size={10} color="#fff" /> Start</button>}
    {can && t.status === "In Progress" && <button onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); onChgSt(t.id, "Done"); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "1.5px solid #2563EB", background: "#2563EB", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}><Ic d={Icons.check} size={10} color="#fff" /> Finish</button>}
    {can && <select style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 6px" })} value={t.status} onChange={function(e) { e.stopPropagation(); onChgSt(t.id, e.target.value); }} onClick={function(e) { e.stopPropagation(); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>}
    {secs > 0 && <span style={{ fontSize: 10, color: running ? "#DC2626" : "#94A3B8", fontVariantNumeric: "tabular-nums", fontWeight: running ? 700 : 400 }}>{ft(secs)}</span>}
    {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); onDup(t); }}><Ic d={Icons.copy} size={14} color="#94A3B8" /></button>}
    {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); onEdit(t); }}><Ic d={Icons.edit} size={14} color="#94A3B8" /></button>}
    {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); if (confirm("Stergi?")) onDel(t.id); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94A3B8", flexWrap: "wrap" }}>{a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={16} fs={8} userId={t.assignee}>{a.name[0]}</Av>{a.name}</span>}{t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}{t.productName && <Badge bg="#EFF6FF" color="#2563EB">{t.productName}</Badge>}{t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}{t.links && t.links.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Ic d={Icons.link} size={10} color="#94A3B8" /> {t.links.length}</span>}{totalS > 0 && <span><Ic d={Icons.check} size={10} color="#94A3B8" /> {doneS}/{totalS}</span>}</div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      {needsExplode && onExplode && <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1.5px solid " + GR, background: "#ECFDF5", color: GR, fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={function(e) { e.stopPropagation(); if (confirm("Creezi " + t.campaignItems.length + " taskuri individuale din acest campaign?")) onExplode(t); }}>⚡ Split {t.campaignItems.length}</button>}
      {can && t.status === "To Do" && <button onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); onChgSt(t.id, "In Progress"); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "1.5px solid " + GR, background: GR, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}><Ic d={Icons.play} size={10} color="#fff" /> Start</button>}
    {can && t.status === "In Progress" && <button onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); onChgSt(t.id, "Done"); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "1.5px solid #2563EB", background: "#2563EB", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}><Ic d={Icons.check} size={10} color="#fff" /> Finish</button>}
      {can && <select style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 6px" })} value={t.status} onChange={function(e) { e.stopPropagation(); onChgSt(t.id, e.target.value); }} onClick={function(e) { e.stopPropagation(); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select>}
      {secs > 0 && <span style={{ fontSize: 10, color: running ? "#DC2626" : "#94A3B8", fontVariantNumeric: "tabular-nums", fontWeight: running ? 700 : 400 }}>{ft(secs)}</span>}
      {(me.role === "admin" || me.role === "pm") && <button style={S.iconBtn} onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); onDup(t); }}><Ic d={Icons.copy} size={14} color="#94A3B8" /></button>}
      {canEditThis && <button style={S.iconBtn} onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); onEdit(t); }}><Ic d={Icons.edit} size={14} color="#94A3B8" /></button>}
      {(me.role === "admin" || canDelete) && <button style={S.iconBtn} onMouseDown={function(e) { e.stopPropagation(); }} onClick={function(e) { e.stopPropagation(); if (confirm("Stergi?")) onDel(t.id); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>}
    </div>
  </Card>;
}

function TasksPage({ fProps, grouped, filtered, user, team, onEdit, onView, onDel, onDup, onChgSt, isMob, timers, getTS, togTimer, bulkMode, selectedTasks, toggleSel, canEdit, canDelete, onExplode, tasks }) {
  var st = fProps.stats;
  var me = team[user] || {};
  var showTeamSection = me.role === "admin" || me.role === "pm";

  // Split filtered into mine vs team
  var mine = filtered.filter(function(t) { return t.assignee === user; });
  var teamOnly = filtered.filter(function(t) { return t.assignee !== user; });

  var groupBy = function(arr) {
    var groups = {};
    var sortAdminFirst = function(a) { return a.sort(function(x, y) { var xA = x.createdBy === "admin" ? 0 : 1; var yA = y.createdBy === "admin" ? 0 : 1; return xA - yA; }); };
    var urgent = arr.filter(function(t) { return t.priority === "Urgent" && t.status !== "Done"; });
    var rest = arr.filter(function(t) { return !(t.priority === "Urgent" && t.status !== "Done"); });
    groups["Urgent"] = sortAdminFirst(urgent);
    STATUSES.forEach(function(s) { groups[s] = sortAdminFirst(rest.filter(function(t) { return t.status === s; })); });
    return groups;
  };

  var mineGroups = useMemo(function() { return groupBy(mine); }, [mine]);
  var teamGroups = useMemo(function() { return groupBy(teamOnly); }, [teamOnly]);

  var renderSection = function(groups, title, color, icon) {
    var hasUrgent = groups["Urgent"] && groups["Urgent"].length > 0;
    var hasActive = hasUrgent || (groups["In Progress"] && groups["In Progress"].length > 0) || (groups["Review"] && groups["Review"].length > 0) || (groups["To Do"] && groups["To Do"].length > 0);
    var totalActive = (groups["Urgent"] || []).length + (groups["In Progress"] || []).length + (groups["Review"] || []).length + (groups["To Do"] || []).length;
    return <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid " + color + "20" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d={icon} size={16} color={color} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B" }}>{title}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{totalActive} taskuri active{groups["Done"] && groups["Done"].length > 0 ? " | " + groups["Done"].length + " finalizate" : ""}</div>
        </div>
      </div>
      {hasUrgent && <div style={{ marginBottom: 20 }}>
        <div style={Object.assign({}, S.groupHdr, { color: "#DC2626" })}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#DC2626", animation: "pulse 2s infinite" }} />URGENT</span><span style={S.countBadge}>{groups["Urgent"].length}</span></div>
        {groups["Urgent"].map(function(t) { return <TRow key={t.id} t={t} user={user} team={team} onEdit={onEdit} onView={onView} onDel={onDel} onDup={onDup} onChgSt={onChgSt} isMob={isMob} secs={getTS(t.id)} running={timers[t.id] && timers[t.id].running} togTimer={function() { togTimer(t.id); }} bulkMode={bulkMode} isSelected={selectedTasks && selectedTasks.includes(t.id)} toggleSel={toggleSel} canEdit={canEdit} canDelete={canDelete} onExplode={onExplode} allTasks={tasks} />; })}
      </div>}
      {["In Progress", "Review", "To Do"].map(function(status) {
        var sectionTasks = groups[status];
        if (!sectionTasks || sectionTasks.length === 0) return null;
        return <div key={status} style={{ marginBottom: 20 }}>
          <div style={Object.assign({}, S.groupHdr, { borderLeft: "3px solid " + SC[status], paddingLeft: 10 })}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: SC[status] }} />{status}</span><span style={S.countBadge}>{sectionTasks.length}</span></div>
          {sectionTasks.map(function(t) { return <TRow key={t.id} t={t} user={user} team={team} onEdit={onEdit} onView={onView} onDel={onDel} onDup={onDup} onChgSt={onChgSt} isMob={isMob} secs={getTS(t.id)} running={timers[t.id] && timers[t.id].running} togTimer={function() { togTimer(t.id); }} bulkMode={bulkMode} isSelected={selectedTasks && selectedTasks.includes(t.id)} toggleSel={toggleSel} canEdit={canEdit} canDelete={canDelete} onExplode={onExplode} allTasks={tasks} />; })}
        </div>;
      })}
      {!hasActive && <Card style={{ textAlign: "center", padding: 30, color: "#94A3B8", fontSize: 13 }}>Niciun task activ.</Card>}
      <DoneCollapse tasks={groups["Done"] || []} user={user} team={team} onEdit={onEdit} onView={onView} onDel={onDel} onDup={onDup} onChgSt={onChgSt} isMob={isMob} timers={timers} getTS={getTS} togTimer={togTimer} bulkMode={bulkMode} selectedTasks={selectedTasks} toggleSel={toggleSel} canEdit={canEdit} canDelete={canDelete} onExplode={onExplode} allTasks={tasks} />
    </div>;
  };

  return <div>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>{[{ l: "Total", v: st.total, c: "#475569", i: Icons.tasks }, { l: "Azi", v: st.today, c: "#2563EB", i: Icons.work }, { l: "In Progress", v: st.inProg, c: "#D97706", i: Icons.work }, { l: "Intarziate", v: st.overdue, c: "#DC2626", i: Icons.work }, { l: "Finalizate", v: st.done, c: GR, i: Icons.tasks }].map(function(s) { return <Card key={s.l} style={{ display: "flex", alignItems: "center", gap: 12, background: s.c + "08" }}><div style={{ width: 40, height: 40, borderRadius: 10, background: s.c + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d={s.i} size={20} color={s.c} /></div><div><div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, color: s.c + "99" }}>{s.l}</div></div></Card>; })}</div>
    <FiltersBar {...fProps} />
    {showTeamSection ? <div>
      <div style={{ marginBottom: 30 }}>
        {renderSection(mineGroups, "Taskurile mele", "#2563EB", Icons.work)}
      </div>
      <div style={{ marginTop: 40 }}>
        {renderSection(teamGroups, "Taskurile echipei", "#7C3AED", Icons.team)}
      </div>
    </div> : renderSection(mineGroups, "Taskurile mele", "#2563EB", Icons.work)}
  </div>;
}

function DoneCollapse({ tasks, user, team, onEdit, onView, onDel, onDup, onChgSt, isMob, timers, getTS, togTimer, bulkMode, selectedTasks, toggleSel, canEdit, canDelete, onExplode, allTasks }) {
  var [open, setOpen] = useState(false);
  if (!tasks || tasks.length === 0) return null;
  return <div style={{ marginTop: 24 }}>
    <div onClick={function() { setOpen(!open); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: open ? GR + "12" : "#F8FAFC", borderRadius: 8, cursor: "pointer", border: "1px solid " + (open ? GR + "30" : "#E2E8F0"), transition: "all 0.15s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: GR }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: GR }}>Finalizate</span>
        <span style={{ fontSize: 11, color: "#64748B" }}>{tasks.length} task{tasks.length > 1 ? "uri" : ""}</span>
      </div>
      <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{open ? "Ascunde ▲" : "Vezi toate ▼"}</span>
    </div>
    {open && <div style={{ marginTop: 10, opacity: 0.85 }}>
      {tasks.map(function(t) { return <TRow key={t.id} t={t} user={user} team={team} onEdit={onEdit} onView={onView} onDel={onDel} onDup={onDup} onChgSt={onChgSt} isMob={isMob} secs={getTS(t.id)} running={timers[t.id] && timers[t.id].running} togTimer={function() { togTimer(t.id); }} bulkMode={bulkMode} isSelected={selectedTasks && selectedTasks.includes(t.id)} toggleSel={toggleSel} canEdit={canEdit} canDelete={canDelete} onExplode={onExplode} allTasks={allTasks} />; })}
    </div>}
  </div>;
}

function KanbanPage({ fProps, tasks, user, team, onView, onEdit, onDel, onDup, onChgSt, dragId, setDragId, handleDrop, isMob, timers, getTS, togTimer }) {
  var [dropTarget, setDropTarget] = useState(null);
  var dragIdRef = useRef(null);
  var me = team[user] || {};

  // PMs and Members only see their own tasks in Kanban (no status change on team)
  var visibleTasks = me.role === "admin" ? tasks : tasks.filter(function(t) { return t.assignee === user; });

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
        var col = visibleTasks.filter(function(t) { return t.status === st; });
        var isOver = dropTarget === st;
        return <div key={st}
          onDragOver={function(e) { e.preventDefault(); e.stopPropagation(); if (dropTarget !== st) setDropTarget(st); }}
          onDragLeave={function(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null); }}
          onDrop={function(e) { onDropCol(e, st); }}
          style={{ background: isOver ? SC[st] + "15" : "#FAFBFC", borderRadius: 12, padding: 12, minHeight: "calc(100vh - 280px)", border: "2px solid " + (isOver ? SC[st] : "transparent"), transition: "all 0.15s" }}>
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
              <Card onClick={function(e) { e.stopPropagation(); onView && onView(t); }} style={{ padding: 12, cursor: "pointer", borderLeft: "3px solid " + (ov ? "#EF4444" : SC[st]), background: SBG[st] }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t.title}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  <Badge bg={PC[t.priority] + "18"} color={PC[t.priority]}>{t.priority}</Badge>
                  {(t.tags || []).map(function(tag) { return <Badge key={tag} bg="#F0FDF4" color={GR}>#{tag}</Badge>; })}
                  {t.shop && <Badge bg="#ECFDF5" color={GR}>{t.shop}</Badge>}
                  {ov && <Badge bg="#FEF2F2" color="#DC2626">INTARZIAT</Badge>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#94A3B8" }}>
                  {a.name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Av color={a.color || "#94A3B8"} size={18} fs={9} userId={t.assignee}>{a.name[0]}</Av>{a.name}</span>}
                  {t.deadline && <span style={{ color: ov ? "#DC2626" : "#94A3B8" }}>{fd(t.deadline)}</span>}
                </div>
                {secs > 0 && <div style={{ marginTop: 6, fontSize: 10, color: run ? "#DC2626" : "#94A3B8", fontVariantNumeric: "tabular-nums", fontWeight: run ? 700 : 400 }}>{ft(secs)}</div>}
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
function AchievementsPage({ achievements, team, visUsers, tasks, isMob, userXP }) {
  try {
  var users = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; });
  return <div>
    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Achievements Echipa</h3>
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
      {users.map(function(u) {
        var m = team[u]; if (!m) return null;
        var userAch = (achievements[u] || []).map(function(id) { return ACHIEVEMENTS.find(function(a) { return a.id === id; }); }).filter(Boolean);
        var missing = ACHIEVEMENTS.filter(function(a) { return !(achievements[u] || []).includes(a.id); });
        var doneCount = tasks.filter(function(t) { return t.assignee === u && t.status === "Done"; }).length;
        var xp = (userXP || {})[u] || 0;
        var lvl = getLevel(xp);
        var lvlTitle = getLevelTitle(lvl);
        var lvlProg = getLevelProgress(xp);
        var lvlColor = getLevelColor(lvl);
        return <Card key={u}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ position: "relative" }}><Av color={m.color} size={36} userId={u}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: -4, right: -4, background: lvlColor, color: "#fff", fontSize: 8, fontWeight: 800, padding: "1px 4px", borderRadius: 4, border: "1.5px solid #fff" }}>{lvl}</div></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{m.name} <span style={{ fontSize: 10, color: lvlColor, fontWeight: 700 }}>Lv.{lvl} {lvlTitle}</span></div><div style={{ fontSize: 11, color: "#94A3B8" }}>{xp} XP | {userAch.length}/{ACHIEVEMENTS.length} achievements | {doneCount} done</div></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748B", marginBottom: 3 }}><span>Level {lvl}</span><span>{lvlProg}%</span></div><div style={S.progBg}><div style={S.progBar(lvlColor, lvlProg)} /></div></div>
          </div>
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
  } catch(err) { return <Card style={{ padding: 30, textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>Eroare Achievements</div><div style={{ fontSize: 12, color: "#64748B" }}>{err.message}</div></Card>; }
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

function TargetsPage({ targets, setTargets, team, tasks, timers, canEdit, visUsers, taskTypes, departments, leaves }) {
  var [showForm, setShowForm] = useState(false);
  var [editId, setEditId] = useState(null);
  var [editForm, setEditForm] = useState({});
  var [form, setForm] = useState({ userId: "", metric: "all", target: 25, daysPerWeek: 5 });
  var [histRanges, setHistRanges] = useState({}); // { [tgtId]: { from, to } }

  var metricOptions = [{ id: "all", l: "Toate taskurile" }].concat(
    (taskTypes || DEF_TASK_TYPES).map(function(t) { return { id: "type:" + t, l: "Tip: " + t }; }),
    (departments || DEF_DEPARTMENTS).map(function(d) { return { id: "dept:" + d, l: "Dept: " + d }; }),
    DEF_PLATFORMS.map(function(p) { return { id: "plat:" + p, l: "Platforma: " + p }; })
  );

  var normM = function(metric) {
    if (!metric || metric === "all") return "all";
    if (metric.startsWith("type:") || metric.startsWith("dept:") || metric.startsWith("plat:")) return metric;
    if ((taskTypes || DEF_TASK_TYPES).includes(metric)) return "type:" + metric;
    if ((departments || DEF_DEPARTMENTS).includes(metric)) return "dept:" + metric;
    if (DEF_PLATFORMS.includes(metric)) return "plat:" + metric;
    return "type:" + metric;
  };

  var calcDone = function(userId, metric) {
    var nm = normM(metric);
    return tasks.filter(function(t) {
      if (t.assignee !== userId || t.status !== "Done" || !t.updatedAt || ds(t.updatedAt) !== TD) return false;
      // Exclude campaign parents - their children count individually
      if (t._campaignParent === true) return false;
      if (t.campaignItems && t.campaignItems.length > 1) return false;
      if (nm === "all") return true;
      if (nm.startsWith("type:") && t.taskType === nm.replace("type:", "")) return true;
      if (nm.startsWith("dept:") && t.department === nm.replace("dept:", "")) return true;
      if (nm.startsWith("plat:") && t.platform === nm.replace("plat:", "")) return true;
      return false;
    }).reduce(function(acc) {
      return acc + 1;
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

      // Build history with custom range (default: last 14 days)
      var range = histRanges[tgt.id];
      var fromDate, toDate;
      if (range && range.from && range.to) {
        fromDate = new Date(range.from + "T00:00:00");
        toDate = new Date(range.to + "T00:00:00");
      } else {
        toDate = new Date(); toDate.setHours(0, 0, 0, 0);
        fromDate = new Date(toDate); fromDate.setDate(fromDate.getDate() - 13);
      }
      var daysSpan = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1);
      var histDays = []; var totalExpected = 0; var totalActual = 0;
      for (var d = 0; d < daysSpan; d++) {
        var dt = new Date(fromDate); dt.setDate(dt.getDate() + d); var dStr = ds(dt);
        var dayDone = tasks.filter(function(t2) {
          if (t2.assignee !== tgt.userId || t2.status !== "Done" || !t2.updatedAt || ds(t2.updatedAt) !== dStr) return false;
          if (t2._campaignParent === true) return false;
          if (t2.campaignItems && t2.campaignItems.length > 1) return false;
          if (nm === "all") return true;
          if (nm.startsWith("type:") && t2.taskType === nm.replace("type:", "")) return true;
          if (nm.startsWith("dept:") && t2.department === nm.replace("dept:", "")) return true;
          if (nm.startsWith("plat:") && t2.platform === nm.replace("plat:", "")) return true;
          return false;
        }).reduce(function(acc) { return acc + 1; }, 0);
        var dow = dt.getDay();
        var isWorkday = dow >= 1 && dow <= (tgt.daysPerWeek >= 6 ? 6 : 5);
        var onLeave = isOnLeave(leaves, tgt.userId, dStr);
        var expected = (isWorkday && !onLeave) ? tgt.target : 0;
        totalExpected += expected; totalActual += dayDone;
        histDays.push({ date: dStr, label: dt.getDate() + " " + MN[dt.getMonth()], done: dayDone, expected: expected, deficit: expected - dayDone, onLeave: onLeave });
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>Istoric:</span>
              <input type="date" value={(range && range.from) || ds(fromDate)} onChange={function(e) { setHistRanges(function(p) { var n = Object.assign({}, p); n[tgt.id] = { from: e.target.value, to: (p[tgt.id] && p[tgt.id].to) || ds(toDate) }; return n; }); }} style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 11, background: "#fff" }} />
              <span>-</span>
              <input type="date" value={(range && range.to) || ds(toDate)} onChange={function(e) { setHistRanges(function(p) { var n = Object.assign({}, p); n[tgt.id] = { from: (p[tgt.id] && p[tgt.id].from) || ds(fromDate), to: e.target.value }; return n; }); }} style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 11, background: "#fff" }} />
              {range && <button onClick={function() { setHistRanges(function(p) { var n = Object.assign({}, p); delete n[tgt.id]; return n; }); }} style={{ padding: "3px 10px", borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 10, background: "#fff", cursor: "pointer", color: "#64748B" }}>Reset (14z)</button>}
            </div>
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
              if (h.onLeave) {
                return [
                  <div key={h.date + "l"} style={{ padding: "3px 4px", background: isToday2 ? "#FEF3C7" : "#FFFBEB", fontWeight: isToday2 ? 700 : 400, borderRadius: 3 }}>{h.label}{isToday2 ? " (azi)" : ""}</div>,
                  <div key={h.date + "e"} style={{ padding: "3px 4px", textAlign: "center", background: "#FFFBEB", borderRadius: 3, color: "#D97706", fontSize: 10, fontWeight: 600 }}>Concediu</div>,
                  <div key={h.date + "d"} style={{ padding: "3px 4px", textAlign: "center", background: "#FFFBEB", borderRadius: 3, color: "#D97706" }}>-</div>,
                  <div key={h.date + "df"} style={{ padding: "3px 4px", textAlign: "center", borderRadius: 3, color: "#D97706", background: "#FFFBEB" }}>-</div>
                ];
              }
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
  return <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>{data.map(function(d) { return <Card key={d.key} style={{ cursor: "pointer" }}><div onClick={function() { onClickUser(d.key); }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Av color={d.color} size={42} userId={d.key}>{d.name[0]}</Av><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{d.role === "pm" ? "PM" : "Member"}</div></div>{d.actT > 0 && <Badge bg="#FEF2F2" color="#DC2626"><span style={{ animation: "pulse 2s infinite" }}>{d.actT} active</span></Badge>}<div style={{ fontSize: 20, fontWeight: 700, color: d.perf.score >= 70 ? GR : d.perf.score >= 40 ? "#D97706" : "#DC2626" }}>{d.perf.score}%</div></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B", marginBottom: 4 }}><span>{d.total} taskuri</span><span>Tracked: {ft(d.tT)}</span></div><div style={{ height: 8, borderRadius: 8, background: "#F1F5F9", overflow: "hidden", display: "flex", marginBottom: 10 }}>{STATUSES.map(function(s) { var w = (d.byS[s] / mx) * 100; return w > 0 ? <div key={s} style={{ width: w + "%", height: "100%", background: SC[s] }} /> : null; })}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, textAlign: "center", fontSize: 10 }}>{STATUSES.map(function(s) { return <div key={s} style={{ background: SC[s] + "12", borderRadius: 6, padding: "4px 2px" }}><div style={{ fontSize: 14, fontWeight: 700, color: SC[s] }}>{d.byS[s]}</div><div style={{ color: "#94A3B8" }}>{s === "In Progress" ? "Active" : s}</div></div>; })}<div style={{ background: d.od ? "#FEF2F2" : "#F8FAFC", borderRadius: 6, padding: "4px 2px" }}><div style={{ fontSize: 14, fontWeight: 700, color: d.od ? "#DC2626" : "#94A3B8" }}>{d.od}</div><div style={{ color: "#94A3B8" }}>Overdue</div></div></div></div></Card>; })}</div>;
}

function TeamPage({ users, team, sessions, getPerf, isMob, onClickUser }) {
  return <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>{users.map(function(u) { var m = team[u]; if (!m) return null; var p = getPerf(u); var lss = sessions[u]; var on = lss && (Date.now() - new Date(lss).getTime()) < 120000; return <Card key={u} style={{ cursor: "pointer" }}><div onClick={function() { onClickUser(u); }}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><div style={{ position: "relative" }}><Av color={m.color} size={42} userId={u}>{m.name[0]}</Av><div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", background: on ? "#16A34A" : "#CBD5E1", border: "2px solid #fff" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{m.role === "pm" ? "PM" : m.role === "admin" ? "Admin" : "Member"}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 11, fontWeight: 600, color: on ? "#16A34A" : "#94A3B8" }}>{on ? "Online" : "Offline"}</div><div style={{ fontSize: 10, color: "#CBD5E1" }}>Last: {fr(lss)}</div></div></div>{m.role !== "admin" && <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span style={{ color: "#64748B" }}>Performance</span><span style={{ fontWeight: 700, color: p.score >= 70 ? GR : p.score >= 40 ? "#D97706" : "#DC2626" }}>{p.score}%</span></div><div style={S.progBg}><div style={S.progBar(p.score >= 70 ? GR : p.score >= 40 ? "#D97706" : "#DC2626", p.score)} /></div></div>}</div></Card>; })}</div>;
}

function PerfPage({ users, team, getPerf, isMob }) {
  var data = users.filter(function(u) { return team[u] && team[u].role !== "admin"; }).map(function(u) { return Object.assign({ key: u }, team[u], getPerf(u)); }).sort(function(a, b) { return b.score - a.score; });
  return <Card><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Clasament Echipa</h3>{data.map(function(d, i) { return <div key={d.key} style={{ display: "flex", alignItems: isMob ? "flex-start" : "center", gap: 12, padding: "12px 0", borderBottom: i < data.length - 1 ? "1px solid #F1F5F9" : "none", flexDirection: isMob ? "column" : "row" }}><span style={{ fontSize: 16, width: 28, textAlign: "center", fontWeight: 700, color: i < 3 ? GR : "#94A3B8" }}>#{i + 1}</span><div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}><Av color={d.color} size={30} userId={d.key}>{d.name[0]}</Av><span style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</span></div><div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, width: "100%" }}><div style={Object.assign({}, S.progBg, { flex: 1 })}><div style={S.progBar(d.score >= 70 ? GR : d.score >= 40 ? "#D97706" : "#DC2626", d.score)} /></div><span style={{ fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "right", color: d.score >= 70 ? GR : d.score >= 40 ? "#D97706" : "#DC2626" }}>{d.score}%</span></div><div style={{ display: "flex", gap: 10, fontSize: 11, color: "#94A3B8" }}><span>{d.done}/{d.total}</span>{d.overdue > 0 && <span style={{ color: "#DC2626" }}>{d.overdue} ovd</span>}{d.avgTime > 0 && <span>avg {ft(d.avgTime)}</span>}</div></div>; })}</Card>;
}

function DigestPage({ team, tasks, timers, getPerf, visUsers, isMob }) {
  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); var weekAgoStr = ds(weekAgo);
  var users = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; });
  var digest = users.map(function(u) { var ut = tasks.filter(function(t) { return t.assignee === u; }); var weekDone = ut.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) >= weekAgoStr; }).length; var weekCreated = ut.filter(function(t) { return t.createdAt && ds(t.createdAt) >= weekAgoStr; }).length; var overdue = ut.filter(function(t) { return isOv(t); }).length; var perf = getPerf(u); var totalTime = 0; ut.forEach(function(t) { var tm = timers[t.id]; if (tm) totalTime += tm.total; }); return { key: u, name: team[u].name, color: team[u].color, weekDone: weekDone, weekCreated: weekCreated, overdue: overdue, perf: perf, totalTime: totalTime }; }).sort(function(a, b) { return b.weekDone - a.weekDone; });
  var copyDigest = function() { var text = "WEEKLY DIGEST - " + fd(weekAgoStr) + " -> " + fd(TD) + "\n\n"; digest.forEach(function(d) { text += d.name + ": " + d.weekDone + " done, " + d.overdue + " overdue, " + d.perf.score + "% perf, " + ft(d.totalTime) + " tracked\n"; }); navigator.clipboard.writeText(text); };
  return <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ fontSize: 15, fontWeight: 700 }}>Weekly Digest ({fd(weekAgoStr)} - {fd(TD)})</h3><button style={S.primBtn} onClick={copyDigest}><Ic d={Icons.copy} size={14} color="#fff" /> Copy</button></div><div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>{digest.map(function(d) { return <Card key={d.key} style={{ borderLeft: "3px solid " + d.color }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><Av color={d.color} size={36} userId={d.key}>{d.name[0]}</Av><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>Score: {d.perf.score}%</div></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, textAlign: "center" }}>{[{ l: "Done", v: d.weekDone, c: GR }, { l: "Noi", v: d.weekCreated, c: "#2563EB" }, { l: "Overdue", v: d.overdue, c: "#DC2626" }, { l: "Timp", v: ft(d.totalTime), c: "#64748B" }].map(function(x) { return <div key={x.l} style={{ background: x.c + "12", borderRadius: 6, padding: "6px 4px" }}><div style={{ fontSize: 16, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 9, color: "#94A3B8" }}>{x.l}</div></div>; })}</div></Card>; })}</div></div>;
}

function LogPage({ logs, visUsers, isMob }) {
  var vis = logs.filter(function(l) { return visUsers.includes(l.user); }); var aC = { LOGIN: { bg: "#ECFDF5", c: "#16A34A" }, LOGOUT: { bg: "#FEF2F2", c: "#DC2626" }, NEW: { bg: "#EFF6FF", c: "#2563EB" }, EDIT: { bg: "#FFFBEB", c: "#D97706" }, DELETE: { bg: "#FEF2F2", c: "#DC2626" }, STATUS: { bg: "#F5F3FF", c: "#7C3AED" }, TIMER: { bg: "#FFF7ED", c: "#EA580C" }, DUPLICATE: { bg: "#EFF6FF", c: "#2563EB" }, USER_ADD: { bg: "#ECFDF5", c: GR }, USER_DEL: { bg: "#FEF2F2", c: "#DC2626" }, EXPORT: { bg: "#ECFDF5", c: GR } };
  return <Card>{vis.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Nicio activitate.</div> : vis.slice(0, 150).map(function(l) { var cfg = aC[l.action] || { bg: "#F8FAFC", c: "#64748B" }; return <div key={l.id} style={{ display: "flex", alignItems: isMob ? "flex-start" : "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC", flexDirection: isMob ? "column" : "row" }}><span style={{ fontSize: 11, color: "#CBD5E1", minWidth: 120 }}>{ff(l.time)}</span><Badge bg={cfg.bg} color={cfg.c}>{l.action}</Badge><span style={{ fontSize: 12, color: "#64748B" }}>{l.detail}</span></div>; })}</Card>;
}

function BackupPage({ taskBackups, setTaskBackups, tasks, setTasks, team, user, isAdmin, addLog }) {
  var [selectedBackup, setSelectedBackup] = useState(null);
  var [dupePreview, setDupePreview] = useState(null);

  var findDuplicates = function() {
    // Group by title + assignee + shop
    var seen = {};
    var duplicates = [];
    tasks.forEach(function(t) {
      var key = (t.title || "") + "||" + (t.assignee || "") + "||" + (t.shop || "");
      if (!seen[key]) seen[key] = [];
      seen[key].push(t);
    });
    Object.keys(seen).forEach(function(k) {
      if (seen[k].length > 1) {
        // Keep the oldest, mark newer ones for deletion
        var sorted = seen[k].slice().sort(function(a, b) { return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1; });
        duplicates.push({ key: k, keep: sorted[0], remove: sorted.slice(1) });
      }
    });
    return duplicates;
  };

  var scanDuplicates = function() {
    var dupes = findDuplicates();
    if (dupes.length === 0) { alert("Nu sunt duplicate!"); return; }
    setDupePreview(dupes);
  };

  var removeDuplicates = function() {
    if (!dupePreview || dupePreview.length === 0) return;
    // Create safety backup first
    var safetySnap = { id: gid(), at: ts(), count: tasks.length, by: user, tasks: JSON.parse(JSON.stringify(tasks)), safety: true, note: "Pre-dedup: " + tasks.length + " taskuri" };
    setTaskBackups(function(prev) { return [safetySnap].concat(prev); });

    // Collect all IDs to remove
    var idsToRemove = new Set();
    var totalRemoved = 0;
    dupePreview.forEach(function(d) {
      d.remove.forEach(function(t) { idsToRemove.add(t.id); totalRemoved++; });
    });

    setTasks(function(prev) { return prev.filter(function(t) { return !idsToRemove.has(t.id); }); });
    addLog("DEDUP", "Sterse " + totalRemoved + " duplicate");
    alert("Sterse " + totalRemoved + " duplicate! Backup salvat in caz ca vrei sa refaci.");
    setDupePreview(null);
  };

  var createManualBackup = function() {
    var snapshot = { id: gid(), at: ts(), count: tasks.length, by: user || "manual", tasks: JSON.parse(JSON.stringify(tasks)), manual: true };
    setTaskBackups(function(prev) { return [snapshot].concat(prev); });
    addLog("BACKUP", "Snapshot manual creat (" + tasks.length + " taskuri)");
    alert("Backup creat: " + tasks.length + " taskuri salvate.");
  };

  var restoreBackup = function(backup) {
    var confirm1 = confirm("ATENTIE: Vrei sa restaurezi " + backup.count + " taskuri din " + ff(backup.at) + "?\n\nTaskurile CURENTE (" + tasks.length + ") vor fi INLOCUITE!");
    if (!confirm1) return;
    var confirm2 = confirm("Esti 100% sigur? Actiunea NU poate fi anulata!");
    if (!confirm2) return;
    // Create safety snapshot before restore
    var safetySnap = { id: gid(), at: ts(), count: tasks.length, by: user, tasks: JSON.parse(JSON.stringify(tasks)), safety: true, note: "Auto-snapshot inainte de restore" };
    setTaskBackups(function(prev) { return [safetySnap].concat(prev); });
    setTasks(backup.tasks);
    addLog("BACKUP", "RESTORE: " + backup.count + " taskuri din " + ff(backup.at));
    alert("Restaurat cu succes! " + backup.count + " taskuri.");
  };

  var deleteBackup = function(id) {
    if (!confirm("Stergi backup-ul?")) return;
    setTaskBackups(function(prev) { return prev.filter(function(b) { return b.id !== id; }); });
  };

  var downloadBackup = function(backup) {
    var json = JSON.stringify(backup, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "backup_tasks_" + backup.at.replace(/[:.]/g, "-") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) return <Card style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Acces restrictionat. Doar admin poate vedea backup-urile.</Card>;

  return <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Backup Taskuri</h3>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>Snapshot automat la fiecare 30 min | Ultimele 50 snapshots pastrate | {taskBackups.length} backups disponibile</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={Object.assign({}, S.primBtn, { background: "#D97706", borderColor: "#D97706" })} onClick={scanDuplicates}><Ic d={Icons.work} size={14} color="#fff" /> Scaneaza duplicate</button>
        <button style={S.primBtn} onClick={createManualBackup}><Ic d={Icons.plus} size={14} color="#fff" /> Creeaza backup acum</button>
      </div>
    </div>

    {dupePreview && <Card style={{ marginBottom: 16, borderLeft: "3px solid #D97706", background: "#FFFBEB" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#D97706", marginBottom: 4 }}>Duplicate gasite: {dupePreview.length} grupuri</div>
          <div style={{ fontSize: 12, color: "#64748B" }}>Se vor sterge {dupePreview.reduce(function(acc, d) { return acc + d.remove.length; }, 0)} taskuri. Cel mai vechi din fiecare grup este pastrat.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.cancelBtn} onClick={function() { setDupePreview(null); }}>Anuleaza</button>
          <button style={Object.assign({}, S.primBtn, { background: "#DC2626", borderColor: "#DC2626" })} onClick={removeDuplicates}>Sterge duplicatele</button>
        </div>
      </div>
      <div style={{ maxHeight: 300, overflowY: "auto", background: "#fff", borderRadius: 6, padding: 8 }}>
        {dupePreview.slice(0, 20).map(function(d, i) {
          var assignee = team[d.keep.assignee] || {};
          return <div key={i} style={{ padding: "6px 8px", borderBottom: "1px solid #F1F5F9", fontSize: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.keep.title} <span style={{ color: "#94A3B8", fontWeight: 400 }}>({assignee.name || d.keep.assignee})</span></div>
            <div style={{ color: "#64748B", fontSize: 11 }}>Pastrat: 1 | Sters: <b style={{ color: "#DC2626" }}>{d.remove.length}</b></div>
          </div>;
        })}
        {dupePreview.length > 20 && <div style={{ fontSize: 11, color: "#94A3B8", padding: 6, textAlign: "center" }}>...si inca {dupePreview.length - 20} grupuri</div>}
      </div>
    </Card>}

    <Card style={{ marginBottom: 16, padding: "14px 16px", borderLeft: "3px solid " + GR, background: "#F0FDF4" }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: GR }}>Status actual</div>
      <div style={{ fontSize: 12, color: "#475569" }}>Taskuri active in aplicatie: <b>{tasks.length}</b></div>
      {taskBackups.length > 0 && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Ultimul backup: {ff(taskBackups[0].at)} cu {taskBackups[0].count} taskuri</div>}
    </Card>

    {taskBackups.length === 0 && <Card style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Niciun backup inca. Se vor crea automat pe masura ce folosesti aplicatia.</Card>}

    {taskBackups.map(function(b) {
      var bTeam = team[b.by] || {};
      var isSelected = selectedBackup === b.id;
      var sample = b.tasks.slice(0, 5);
      return <Card key={b.id} style={{ marginBottom: 10, borderLeft: "3px solid " + (b.safety ? "#D97706" : b.manual ? "#2563EB" : GR) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{b.count} taskuri</span>
              {b.manual && <Badge bg="#EFF6FF" color="#2563EB">Manual</Badge>}
              {b.safety && <Badge bg="#FFFBEB" color="#D97706">Pre-restore</Badge>}
              {!b.manual && !b.safety && <Badge bg="#ECFDF5" color={GR}>Auto</Badge>}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>{ff(b.at)} | Creat de {bTeam.name || b.by}</div>
            {b.note && <div style={{ fontSize: 11, color: "#D97706", marginTop: 2, fontStyle: "italic" }}>{b.note}</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={Object.assign({}, S.chip, { fontSize: 11, background: "#F1F5F9", color: "#475569" })} onClick={function() { setSelectedBackup(isSelected ? null : b.id); }}>{isSelected ? "Ascunde" : "Detalii"}</button>
            <button style={Object.assign({}, S.chip, { fontSize: 11, background: "#EFF6FF", color: "#2563EB" })} onClick={function() { downloadBackup(b); }}>Download</button>
            <button style={Object.assign({}, S.chip, { fontSize: 11, background: "#ECFDF5", color: GR, fontWeight: 700 })} onClick={function() { restoreBackup(b); }}>Restore</button>
            <button style={S.iconBtn} onClick={function() { deleteBackup(b.id); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>
          </div>
        </div>
        {isSelected && <div style={{ marginTop: 12, padding: 10, background: "#F8FAFC", borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Primele {sample.length} taskuri din snapshot:</div>
          {sample.map(function(t, i) {
            return <div key={i} style={{ fontSize: 11, padding: "3px 0", borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ color: "#94A3B8" }}>{i + 1}.</span> <b>{t.title}</b> <span style={{ color: "#94A3B8" }}>({t.status})</span> <span style={{ color: "#94A3B8" }}>{(team[t.assignee] || {}).name || t.assignee}</span>
            </div>;
          })}
          {b.tasks.length > 5 && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>...si inca {b.tasks.length - 5} taskuri</div>}
        </div>}
      </Card>;
    })}
  </div>;
}

function BrandingPage({ branding, setBranding, addLog }) {
  var [form, setForm] = useState(Object.assign({ title: "HeyAds", subtitle: "TASK MANAGER", logo: "", favicon: "" }, branding || {}));
  var [savedMsg, setSavedMsg] = useState("");
  var fileInputLogo = useRef(null);
  var fileInputFav = useRef(null);

  var save = function() {
    setBranding(form);
    addLog("BRANDING", "Actualizat branding: " + form.title);
    setSavedMsg("Salvat!");
    setTimeout(function() { setSavedMsg(""); }, 2000);
  };

  var uploadFile = function(e, field) {
    var file = e.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Fisierul e prea mare. Maxim 2MB."); return; }
    var reader = new FileReader();
    reader.onload = function(ev) { setForm(function(p) { var n = Object.assign({}, p); n[field] = ev.target.result; return n; }); };
    reader.readAsDataURL(file);
  };

  var removeField = function(field) {
    setForm(function(p) { var n = Object.assign({}, p); n[field] = ""; return n; });
  };

  return <div style={{ maxWidth: 800 }}>
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Branding</h3>
      <div style={{ fontSize: 12, color: "#64748B" }}>Personalizeaza logo-ul, favicon-ul si numele afisat in aplicatie.</div>
    </div>

    {/* Title */}
    <Card style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Nume aplicatie</div>
      <div style={{ fontSize: 11, color: "#64748B", marginBottom: 10 }}>Afisat ca tab browser si in header cand nu exista logo.</div>
      <input type="text" value={form.title} onChange={function(e) { setForm(function(p) { var n = Object.assign({}, p); n.title = e.target.value; return n; }); }} placeholder="HeyAds" style={Object.assign({}, S.inp, { maxWidth: 400 })} />
    </Card>

    {/* Subtitle */}
    <Card style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Subtitlu</div>
      <div style={{ fontSize: 11, color: "#64748B", marginBottom: 10 }}>Text sub logo in sidebar (ex: "TASK MANAGER", "Internal Platform").</div>
      <input type="text" value={form.subtitle} onChange={function(e) { setForm(function(p) { var n = Object.assign({}, p); n.subtitle = e.target.value; return n; }); }} placeholder="TASK MANAGER" style={Object.assign({}, S.inp, { maxWidth: 400 })} />
    </Card>

    {/* Logo */}
    <Card style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Logo aplicatie</div>
      <div style={{ fontSize: 11, color: "#64748B", marginBottom: 14 }}>Afisat in sidebar. Recomandat: SVG sau PNG transparent, max 2MB.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 120, height: 120, border: "2px dashed #CBD5E1", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", overflow: "hidden" }}>
          {form.logo ? <img src={form.logo} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 10, color: "#94A3B8" }}>Fara logo</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input ref={fileInputLogo} type="file" accept="image/*" onChange={function(e) { uploadFile(e, "logo"); }} style={{ display: "none" }} />
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={function() { fileInputLogo.current && fileInputLogo.current.click(); }}><Ic d={Icons.upload} size={14} color="#475569" /> Incarca logo</button>
          {form.logo && <button style={Object.assign({}, S.cancelBtn, { color: "#DC2626" })} onClick={function() { removeField("logo"); }}><Ic d={Icons.del} size={13} color="#DC2626" /> Sterge</button>}
        </div>
      </div>
    </Card>

    {/* Favicon */}
    <Card style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Favicon</div>
      <div style={{ fontSize: 11, color: "#64748B", marginBottom: 14 }}>Icon pentru tab browser. Recomandat: ICO sau PNG 32x32 / 64x64, max 2MB.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 64, height: 64, border: "2px dashed #CBD5E1", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", overflow: "hidden" }}>
          {form.favicon ? <img src={form.favicon} alt="Favicon" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 9, color: "#94A3B8" }}>Gol</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input ref={fileInputFav} type="file" accept="image/*,.ico" onChange={function(e) { uploadFile(e, "favicon"); }} style={{ display: "none" }} />
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={function() { fileInputFav.current && fileInputFav.current.click(); }}><Ic d={Icons.upload} size={14} color="#475569" /> Incarca favicon</button>
          {form.favicon && <button style={Object.assign({}, S.cancelBtn, { color: "#DC2626" })} onClick={function() { removeField("favicon"); }}><Ic d={Icons.del} size={13} color="#DC2626" /> Sterge</button>}
        </div>
      </div>
    </Card>

    {/* Preview */}
    <Card style={{ marginBottom: 14, background: "hsl(216,22%,11%)", borderLeft: "3px solid " + GR }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#7A8BA0", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>Preview sidebar</div>
      <div style={{ padding: 16, textAlign: "center" }}>
        {form.logo ? <img src={form.logo} alt="Preview" style={{ maxHeight: 48, maxWidth: 180, objectFit: "contain", marginBottom: 4 }} /> : <div style={{ fontSize: 24, fontWeight: 800, color: "#4ADE80", letterSpacing: 1 }}>{form.title || "HeyAds"}</div>}
        {form.subtitle && <div style={{ fontSize: 10, color: "#7A8BA0", letterSpacing: 2, marginTop: 6, textTransform: "uppercase" }}>{form.subtitle}</div>}
      </div>
    </Card>

    {/* Actions */}
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button style={S.primBtn} onClick={save}>Salveaza modificarile</button>
      {savedMsg && <span style={{ fontSize: 12, color: GR, fontWeight: 700 }}>✓ {savedMsg}</span>}
    </div>
  </div>;
}

function calcMemberLeaderboard(allTasks, team, targets, users) {
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  var daysPassed = now.getDate();
  var competitors = users.filter(function(u) { return team[u] && team[u].role === "member"; });
  return competitors.map(function(u) {
    var userTasks = allTasks.filter(function(t) { return t.assignee === u && !t._campaignParent; });
    var thisMonth = userTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && new Date(t.updatedAt) >= monthStart && new Date(t.updatedAt) <= monthEnd; });
    var overdue = userTasks.filter(function(t) { return isOv(t); }).length;
    var userTargets = (targets || []).filter(function(tg) { return tg.userId === u && tg.active !== false; });
    var streakBonus = 0;
    if (userTargets.length > 0) {
      var tgt = userTargets[0];
      for (var d = 0; d < daysPassed; d++) {
        var dt = new Date(monthStart); dt.setDate(dt.getDate() + d);
        if (dt > now) break;
        if (dt.getDay() === 0 || dt.getDay() === 6) continue;
        var doneDay = userTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === ds(dt); }).length;
        if (doneDay >= (tgt.target || 0)) streakBonus += 3;
      }
    }
    var score = thisMonth.length * 10 - overdue * 5 + streakBonus;
    return { user: u, name: (team[u] || {}).name || u, color: (team[u] || {}).color || "#94A3B8", doneThis: thisMonth.length, overdue: overdue, score: Math.max(0, score), role: "member" };
  }).sort(function(a, b) { return b.score - a.score; });
}

function calcPMLeaderboard(allTasks, team, users) {
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  var competitors = users.filter(function(u) { return team[u] && team[u].role === "pm"; });
  return competitors.map(function(u) {
    var pmTeam = (team[u] || {}).team || [];
    // Tasks created by PM this month
    var createdThisMonth = allTasks.filter(function(t) { return t.createdBy === u && !t._campaignParent && t.createdAt && new Date(t.createdAt) >= monthStart && new Date(t.createdAt) <= monthEnd; }).length;
    // Tasks done by PM's team this month
    var teamDoneThisMonth = allTasks.filter(function(t) { return pmTeam.includes(t.assignee) && !t._campaignParent && t.status === "Done" && t.updatedAt && new Date(t.updatedAt) >= monthStart && new Date(t.updatedAt) <= monthEnd; }).length;
    // PM's own tasks done
    var ownDone = allTasks.filter(function(t) { return t.assignee === u && !t._campaignParent && t.status === "Done" && t.updatedAt && new Date(t.updatedAt) >= monthStart && new Date(t.updatedAt) <= monthEnd; }).length;
    // Team overdue
    var teamOverdue = allTasks.filter(function(t) { return pmTeam.includes(t.assignee) && !t._campaignParent && isOv(t); }).length;
    // Score: created tasks weight + team done weight + own done - team overdue penalty
    var score = createdThisMonth * 5 + teamDoneThisMonth * 8 + ownDone * 10 - teamOverdue * 3;
    return { user: u, name: (team[u] || {}).name || u, color: (team[u] || {}).color || "#94A3B8", created: createdThisMonth, teamDone: teamDoneThisMonth, ownDone: ownDone, teamOverdue: teamOverdue, doneThis: createdThisMonth, score: Math.max(0, score), role: "pm", teamSize: pmTeam.length };
  }).sort(function(a, b) { return b.score - a.score; });
}

// Backwards compat wrapper
function calcLeaderboard(allTasks, team, targets, achievements, users) {
  return calcMemberLeaderboard(allTasks, team, targets, users);
}

function PodiumCompact({ leaderboard, onNavigate, monthlyBonus, title, subtitle }) {
  if (leaderboard.length < 2) return null;
  var now = new Date();
  var monthNames = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  var monthLabel = monthNames[now.getMonth()];
  var hasBonus = monthlyBonus && monthlyBonus.enabled && monthlyBonus.amount > 0;
  var podiumTitle = title || ("Liga lunara - " + monthLabel);
  return <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #FFFBEB, #FFF 50%)", cursor: onNavigate ? "pointer" : "default" }} onClick={onNavigate}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasBonus ? 6 : 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", display: "flex", alignItems: "center", gap: 6 }}>{podiumTitle}</div>
      {onNavigate && <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Vezi tot ▶</span>}
    </div>
    {subtitle && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>{subtitle}</div>}
    {hasBonus && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "6px 12px", background: "#EAB30812", borderRadius: 8, border: "1px solid #EAB30825" }}>
      <span style={{ fontSize: 16 }}>💰</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#92400E" }}>Premiu locul 1: {monthlyBonus.amount} {monthlyBonus.currency}</span>
      <span style={{ fontSize: 11, color: "#92400E", opacity: 0.7 }}>| Se cumuleaza toata luna</span>
    </div>}
    <div style={{ display: "grid", gridTemplateColumns: leaderboard.length >= 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10, alignItems: "end" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 2 }}>🥈</div>
        <Av color={leaderboard[1].color} size={38} fs={14} userId={leaderboard[1].user}>{leaderboard[1].name[0]}</Av>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", marginTop: 4 }}>{leaderboard[1].name}</div>
        <div style={{ fontSize: 10, color: "#64748B" }}>{leaderboard[1].doneThis} taskuri</div>
        <div style={{ height: 40, background: "#E5E7EB", borderRadius: "6px 6px 0 0", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontWeight: 800, fontSize: 14 }}>2</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 30, marginBottom: 2 }}>👑</div>
        <Av color={leaderboard[0].color} size={48} fs={18} userId={leaderboard[0].user}>{leaderboard[0].name[0]}</Av>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1E293B", marginTop: 4 }}>{leaderboard[0].name}</div>
        <div style={{ fontSize: 11, color: "#D97706", fontWeight: 700 }}>{leaderboard[0].doneThis} taskuri</div>
        <div style={{ height: 60, background: "linear-gradient(180deg, #FDE047, #EAB308)", borderRadius: "6px 6px 0 0", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18, boxShadow: "0 3px 8px rgba(234,179,8,0.3)" }}>1</div>
      </div>
      {leaderboard.length >= 3 && <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 2 }}>🥉</div>
        <Av color={leaderboard[2].color} size={34} fs={13} userId={leaderboard[2].user}>{leaderboard[2].name[0]}</Av>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", marginTop: 4 }}>{leaderboard[2].name}</div>
        <div style={{ fontSize: 10, color: "#64748B" }}>{leaderboard[2].doneThis} taskuri</div>
        <div style={{ height: 28, background: "#F97316", borderRadius: "6px 6px 0 0", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>3</div>
      </div>}
    </div>
  </Card>;
}

function LeaguePage({ allTasks, team, user, me, timers, targets, achievements, visUsers, isMob, monthlyBonus, setMonthlyBonus, userXP }) {
  var [leagueTab, setLeagueTab] = useState(me.role === "pm" ? "pm" : "members");
  var now = new Date();
  var dow = now.getDay();
  var daysFromMon = dow === 0 ? 6 : dow - 1;
  var weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - daysFromMon); weekStart.setHours(0, 0, 0, 0);
  var weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);
  var lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  var lastWeekEnd = new Date(weekStart); lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); lastWeekEnd.setHours(23, 59, 59, 999);
  var weekLabel = weekStart.getDate() + " " + MN[weekStart.getMonth()].substring(0, 3) + " - " + weekEnd.getDate() + " " + MN[weekEnd.getMonth()].substring(0, 3);

  // MEMBER leaderboard (weekly)
  var members = visUsers.filter(function(u) { return team[u] && team[u].role === "member"; });
  var memberBoard = members.map(function(u) {
    var ut = allTasks.filter(function(t) { return t.assignee === u && !t._campaignParent; });
    var tw = ut.filter(function(t) { return t.status === "Done" && t.updatedAt && new Date(t.updatedAt) >= weekStart && new Date(t.updatedAt) <= weekEnd; });
    var lw = ut.filter(function(t) { return t.status === "Done" && t.updatedAt && new Date(t.updatedAt) >= lastWeekStart && new Date(t.updatedAt) <= lastWeekEnd; });
    var ov = ut.filter(function(t) { return isOv(t); }).length;
    var uTargets = (targets || []).filter(function(tg) { return tg.userId === u && tg.active !== false; });
    var sb = 0;
    if (uTargets.length > 0) { var tgt = uTargets[0]; for (var d = 0; d < 7; d++) { var dt = new Date(weekStart); dt.setDate(dt.getDate() + d); if (dt > now) break; var dd = ut.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === ds(dt); }).length; if (dd >= (tgt.target || 0)) sb += 5; } }
    var score = tw.length * 10 - ov * 5 + sb;
    var xp = (userXP || {})[u] || 0;
    return { user: u, name: (team[u] || {}).name || u, color: (team[u] || {}).color || "#94A3B8", doneThis: tw.length, doneLast: lw.length, delta: tw.length - lw.length, overdue: ov, score: Math.max(0, score), achCount: ((achievements || {})[u] || []).length, level: getLevel(xp), title: getLevelTitle(getLevel(xp)) };
  }).sort(function(a, b) { return b.score - a.score; });

  // PM leaderboard (weekly)
  var pms = visUsers.filter(function(u) { return team[u] && team[u].role === "pm"; });
  var pmBoard = pms.map(function(u) {
    var pmTeam = (team[u] || {}).team || [];
    var created = allTasks.filter(function(t) { return t.createdBy === u && !t._campaignParent && t.createdAt && new Date(t.createdAt) >= weekStart && new Date(t.createdAt) <= weekEnd; }).length;
    var teamDone = allTasks.filter(function(t) { return pmTeam.includes(t.assignee) && !t._campaignParent && t.status === "Done" && t.updatedAt && new Date(t.updatedAt) >= weekStart && new Date(t.updatedAt) <= weekEnd; }).length;
    var ownDone = allTasks.filter(function(t) { return t.assignee === u && !t._campaignParent && t.status === "Done" && t.updatedAt && new Date(t.updatedAt) >= weekStart && new Date(t.updatedAt) <= weekEnd; }).length;
    var teamOv = allTasks.filter(function(t) { return pmTeam.includes(t.assignee) && !t._campaignParent && isOv(t); }).length;
    var score = created * 5 + teamDone * 8 + ownDone * 10 - teamOv * 3;
    var xp = (userXP || {})[u] || 0;
    return { user: u, name: (team[u] || {}).name || u, color: (team[u] || {}).color || "#94A3B8", created: created, teamDone: teamDone, ownDone: ownDone, teamOverdue: teamOv, doneThis: created, score: Math.max(0, score), level: getLevel(xp), title: getLevelTitle(getLevel(xp)), teamSize: pmTeam.length };
  }).sort(function(a, b) { return b.score - a.score; });

  var currentBoard = leagueTab === "pm" ? pmBoard : memberBoard;
  var myPos = currentBoard.findIndex(function(p) { return p.user === user; });
  var myData = myPos >= 0 ? currentBoard[myPos] : null;
  var maxScore = currentBoard.length > 0 ? currentBoard[0].score : 1;

  return <div>
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: "#1E293B" }}>Liga Saptamanii</h2>
      <div style={{ fontSize: 12, color: "#64748B" }}>{weekLabel}. Competitia se reseteaza lunea dimineata.</div>
    </div>

    {/* Tab switcher */}
    <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: 4, background: "#F1F5F9", borderRadius: 10, width: "fit-content" }}>
      <button onClick={function() { setLeagueTab("members"); }} style={{ padding: "10px 22px", borderRadius: 7, border: "none", background: leagueTab === "members" ? "#fff" : "transparent", color: leagueTab === "members" ? "#1E293B" : "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: leagueTab === "members" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>Liga Membrilor ({memberBoard.length})</button>
      <button onClick={function() { setLeagueTab("pm"); }} style={{ padding: "10px 22px", borderRadius: 7, border: "none", background: leagueTab === "pm" ? "#fff" : "transparent", color: leagueTab === "pm" ? "#1E293B" : "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: leagueTab === "pm" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>Liga PM-ilor ({pmBoard.length})</button>
    </div>

    {/* My rank */}
    {myData && <Card style={{ marginBottom: 16, background: myData.color + "08", borderLeft: "4px solid " + myData.color }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: myData.color }}>#{myPos + 1}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Pozitia ta, {myData.name}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{myData.score} puncte | Lv.{myData.level} {myData.title}</div>
        </div>
        {myPos === 0 && <div style={{ fontSize: 28 }}>👑</div>}
      </div>
    </Card>}

    {/* Podium */}
    {currentBoard.length >= 2 && <Card style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 14 }}>Podium {leagueTab === "pm" ? "PM-ilor" : "Membrilor"}</div>
      <div style={{ display: "grid", gridTemplateColumns: currentBoard.length >= 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12, alignItems: "end" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🥈</div>
          <Av color={currentBoard[1].color} size={50} fs={18} userId={currentBoard[1].user}>{currentBoard[1].name[0]}</Av>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginTop: 6 }}>{currentBoard[1].name}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{currentBoard[1].score} pts</div>
          <div style={{ height: 60, background: "#E5E7EB", borderRadius: "8px 8px 0 0", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontWeight: 800, fontSize: 18 }}>2</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 4 }}>👑</div>
          <Av color={currentBoard[0].color} size={64} fs={24} userId={currentBoard[0].user}>{currentBoard[0].name[0]}</Av>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginTop: 6 }}>{currentBoard[0].name}</div>
          <div style={{ fontSize: 12, color: "#D97706", fontWeight: 700 }}>{currentBoard[0].score} pts</div>
          <div style={{ height: 90, background: "linear-gradient(180deg, #FDE047, #EAB308)", borderRadius: "8px 8px 0 0", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 24, boxShadow: "0 4px 12px rgba(234,179,8,0.3)" }}>1</div>
        </div>
        {currentBoard.length >= 3 && <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🥉</div>
          <Av color={currentBoard[2].color} size={44} fs={16} userId={currentBoard[2].user}>{currentBoard[2].name[0]}</Av>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginTop: 6 }}>{currentBoard[2].name}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{currentBoard[2].score} pts</div>
          <div style={{ height: 40, background: "#F97316", borderRadius: "8px 8px 0 0", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>3</div>
        </div>}
      </div>
    </Card>}

    {/* Full leaderboard */}
    <Card>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 14 }}>Clasament complet</div>
      {currentBoard.map(function(p, idx) {
        var isMe = p.user === user;
        var lvlColor = getLevelColor(p.level);
        var widthPct = maxScore > 0 ? (p.score / maxScore) * 100 : 0;
        return <div key={p.user} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 6, borderRadius: 8, background: isMe ? p.color + "10" : idx < 3 ? "#FEFCE880" : "#fff", border: "1px solid " + (isMe ? p.color + "40" : "#E2E8F0"), position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: widthPct + "%", background: idx === 0 ? "linear-gradient(90deg, #FDE04720, transparent)" : "transparent", zIndex: 0 }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <div style={{ width: 32, textAlign: "center", fontSize: 16, fontWeight: 800 }}>{idx < 3 ? ["🥇", "🥈", "🥉"][idx] : "#" + (idx + 1)}</div>
            <Av color={p.color} size={32} fs={12} userId={p.user}>{p.name[0]}</Av>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{p.name}</span>
                <span style={{ fontSize: 10, color: lvlColor, fontWeight: 700, background: lvlColor + "15", padding: "2px 8px", borderRadius: 4 }}>Lv.{p.level}</span>
                {isMe && <Badge bg={p.color + "15"} color={p.color}>TU</Badge>}
              </div>
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
                {leagueTab === "pm" ? (p.created + " create | " + p.teamDone + " echipa done | " + p.ownDone + " proprii | " + p.teamOverdue + " ov echipa") : (p.doneThis + " done | " + p.overdue + " overdue | " + p.achCount + " ach")}
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: 60 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: idx === 0 ? "#EAB308" : "#1E293B" }}>{p.score}</div>
              <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>scor</div>
            </div>
            {p.delta !== undefined && p.delta !== 0 && <div style={{ fontSize: 11, fontWeight: 700, color: p.delta > 0 ? GR : "#DC2626", minWidth: 40, textAlign: "right" }}>{p.delta > 0 ? "▲+" : "▼"}{p.delta}</div>}
          </div>
        </div>;
      })}
      {currentBoard.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Nu sunt participanti.</div>}
    </Card>

    {/* Scoring */}
    <Card style={{ marginTop: 16, background: "#F8FAFC" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Cum se calculeaza scorul:</div>
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", marginBottom: 4 }}>Membri (implementare)</div>
          <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.7 }}>
            <span style={{ display: "block" }}>+10 per task finalizat in saptamana</span>
            <span style={{ display: "block" }}>+5 per zi cu target atins</span>
            <span style={{ display: "block" }}>-5 per task intarziat</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 4 }}>PM (coordonare)</div>
          <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.7 }}>
            <span style={{ display: "block" }}>+5 per task creat catre echipa</span>
            <span style={{ display: "block" }}>+8 per task finalizat de echipa</span>
            <span style={{ display: "block" }}>+10 per task propriu finalizat</span>
            <span style={{ display: "block" }}>-3 per task intarziat in echipa</span>
          </div>
        </div>
      </div>
    </Card>
  </div>;
}

function LeavesPage({ leaves, setLeaves, leaveRequests, setLeaveRequests, team, user, visUsers, me, addLog, addNotif }) {
  var [selectedUser, setSelectedUser] = useState(visUsers.filter(function(u) { return u !== "admin" && team[u] && team[u].role !== "admin"; })[0] || "");
  var [calMonth, setCalMonth] = useState(new Date());
  var [showRequestForm, setShowRequestForm] = useState(false);
  var [reqFrom, setReqFrom] = useState("");
  var [reqTo, setReqTo] = useState("");
  var [reqReason, setReqReason] = useState("");

  var canEditUser = function(uid) {
    if (!team[uid]) return false;
    if (me.role === "admin") return true;
    if (me.role === "pm") { return (me.team || []).includes(uid) || uid === user; }
    return uid === user;
  };

  var editableUsers = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin" && canEditUser(u); });

  // Members can only request, not directly add
  var canDirectEdit = me.role === "admin" || me.role === "pm";

  var toggleDate = function(dateStr) {
    if (!selectedUser || !canEditUser(selectedUser)) return;
    if (!canDirectEdit) return; // members use request system
    setLeaves(function(prev) {
      var copy = Object.assign({}, prev);
      var userLeaves = (copy[selectedUser] || []).slice();
      var idx = userLeaves.indexOf(dateStr);
      if (idx >= 0) { userLeaves.splice(idx, 1); addLog("LEAVE", "Scos concediu " + (team[selectedUser] || {}).name + " - " + dateStr); }
      else { userLeaves.push(dateStr); addLog("LEAVE", "Adaugat concediu " + (team[selectedUser] || {}).name + " - " + dateStr); }
      copy[selectedUser] = userLeaves.sort();
      return copy;
    });
  };

  // Submit leave request (for members)
  var submitRequest = function() {
    if (!reqFrom) return;
    var dates = [];
    var from = new Date(reqFrom + "T00:00:00");
    var to = reqTo ? new Date(reqTo + "T00:00:00") : from;
    for (var d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      var dow = d.getDay();
      if (dow !== 0 && dow !== 6) dates.push(ds(d));
    }
    if (dates.length === 0) return;
    var req = { id: gid(), userId: user, userName: (team[user] || {}).name, dates: dates, from: reqFrom, to: reqTo || reqFrom, reason: reqReason, status: "pending", createdAt: ts() };
    setLeaveRequests(function(p) { return [req].concat(p); });
    // Notify PM and admin
    var pmUser = (team[user] || {}).pm;
    if (pmUser) addNotif("leave_request", (team[user] || {}).name + " cere concediu " + reqFrom + " - " + (reqTo || reqFrom) + " (" + dates.length + " zile)", null, pmUser);
    addNotif("leave_request", (team[user] || {}).name + " cere concediu " + reqFrom + " - " + (reqTo || reqFrom) + " (" + dates.length + " zile)", null, "admin");
    addLog("LEAVE", "Cerere concediu: " + dates.length + " zile");
    setShowRequestForm(false); setReqFrom(""); setReqTo(""); setReqReason("");
  };

  // Approve/reject request
  var handleRequest = function(reqId, action) {
    var req = leaveRequests.find(function(r) { return r.id === reqId; });
    if (!req) return;
    setLeaveRequests(function(p) { return p.map(function(r) { return r.id === reqId ? Object.assign({}, r, { status: action, handledBy: user, handledAt: ts() }) : r; }); });
    if (action === "approved") {
      setLeaves(function(prev) {
        var copy = Object.assign({}, prev);
        var userLeaves = (copy[req.userId] || []).slice();
        req.dates.forEach(function(d) { if (!userLeaves.includes(d)) userLeaves.push(d); });
        copy[req.userId] = userLeaves.sort();
        return copy;
      });
      addNotif("leave_approved", "Concediu aprobat: " + req.from + " - " + req.to, null, req.userId);
      addLog("LEAVE", "Aprobat concediu " + (req.userName) + " " + req.from + " - " + req.to);
    } else {
      addNotif("leave_rejected", "Concediu respins: " + req.from + " - " + req.to, null, req.userId);
      addLog("LEAVE", "Respins concediu " + (req.userName) + " " + req.from + " - " + req.to);
    }
  };

  var y = calMonth.getFullYear(), m = calMonth.getMonth();
  var dim = new Date(y, m + 1, 0).getDate();
  var fd1 = new Date(y, m, 1).getDay();
  var offset = fd1 === 0 ? 6 : fd1 - 1;
  var cells = [];
  for (var i = 0; i < offset; i++) cells.push(null);
  for (var d2 = 1; d2 <= dim; d2++) cells.push(d2);
  var userLeaves = (leaves[selectedUser] || []);
  var todayOnLeave = editableUsers.filter(function(u2) { return isOnLeave(leaves, u2, TD); });
  var pendingRequests = (leaveRequests || []).filter(function(r) { return r.status === "pending"; });

  return <div>
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Concedii</h3>
      <div style={{ fontSize: 12, color: "#94A3B8" }}>{canDirectEdit ? "Click pe zi pentru a adauga / scoate concediu." : "Trimite o cerere de concediu pentru aprobare."} Zilele de concediu nu afecteaza targetul si performance-ul.</div>
    </div>

    {/* Pending requests alert for admin/pm */}
    {canDirectEdit && pendingRequests.length > 0 && <Card style={{ marginBottom: 16, borderLeft: "3px solid #D97706", background: "#FFFBEB" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#D97706", marginBottom: 10 }}>Cereri de concediu in asteptare ({pendingRequests.length})</div>
      {pendingRequests.map(function(req) {
        var reqUser = team[req.userId] || {};
        return <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fff", borderRadius: 8, marginBottom: 6, border: "1px solid #FDE68A" }}>
          <Av color={reqUser.color || "#94A3B8"} size={32} userId={req.userId}>{(reqUser.name || "?")[0]}</Av>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{reqUser.name || req.userId}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{req.from} - {req.to} ({req.dates.length} zile){req.reason ? " | " + req.reason : ""}</div>
            <div style={{ fontSize: 10, color: "#94A3B8" }}>Cerut: {ff(req.createdAt)}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={Object.assign({}, S.primBtn, { padding: "6px 14px", fontSize: 12 })} onClick={function() { handleRequest(req.id, "approved"); }}>Aproba</button>
            <button style={Object.assign({}, S.cancelBtn, { padding: "6px 14px", fontSize: 12, color: "#DC2626", borderColor: "#DC2626" })} onClick={function() { handleRequest(req.id, "rejected"); }}>Respinge</button>
          </div>
        </div>;
      })}
    </Card>}

    {todayOnLeave.length > 0 && <Card style={{ marginBottom: 16, borderLeft: "3px solid #D97706", background: "#FFFBEB" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#D97706", marginBottom: 6 }}>Azi in concediu</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{todayOnLeave.map(function(u2) { var t2 = team[u2] || {}; return <Badge key={u2} bg="#FEF3C7" color="#92400E">{t2.name}</Badge>; })}</div>
    </Card>}

    {/* Member: request button */}
    {!canDirectEdit && <div style={{ marginBottom: 16 }}>
      <button style={S.primBtn} onClick={function() { setShowRequestForm(!showRequestForm); }}>Cere concediu</button>
    </div>}
    {showRequestForm && <Card style={{ marginBottom: 16, borderLeft: "3px solid #2563EB" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", marginBottom: 10 }}>Cerere concediu</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div><label style={S.label}>De la</label><input type="date" style={S.input} value={reqFrom} onChange={function(e) { setReqFrom(e.target.value); }} /></div>
        <div><label style={S.label}>Pana la</label><input type="date" style={S.input} value={reqTo} onChange={function(e) { setReqTo(e.target.value); }} /></div>
      </div>
      <label style={S.label}>Motiv (optional)</label>
      <input style={S.input} value={reqReason} onChange={function(e) { setReqReason(e.target.value); }} placeholder="Ex: Concediu medical, personal, etc." />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button style={S.primBtn} onClick={submitRequest}>Trimite cererea</button><button style={S.cancelBtn} onClick={function() { setShowRequestForm(false); }}>Anuleaza</button></div>
    </Card>}

    {/* My requests history (for members) */}
    {!canDirectEdit && leaveRequests && leaveRequests.filter(function(r) { return r.userId === user; }).length > 0 && <Card style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Cererile mele</div>
      {leaveRequests.filter(function(r) { return r.userId === user; }).slice(0, 10).map(function(r) {
        var sc = r.status === "approved" ? "#10B981" : r.status === "rejected" ? "#DC2626" : "#D97706";
        var sl = r.status === "approved" ? "Aprobat" : r.status === "rejected" ? "Respins" : "In asteptare";
        return <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, borderRadius: 6, borderLeft: "3px solid " + sc, background: sc + "08" }}>
          <div style={{ flex: 1, fontSize: 12 }}><span style={{ fontWeight: 600 }}>{r.from} - {r.to}</span> ({r.dates.length} zile){r.reason ? " - " + r.reason : ""}</div>
          <Badge bg={sc + "18"} color={sc}>{sl}</Badge>
        </div>;
      })}
    </Card>}

    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 16 }}>
      <Card style={{ padding: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Selecteaza user</div>
        {editableUsers.map(function(u2) {
          var t2 = team[u2] || {};
          var count = (leaves[u2] || []).length;
          var isSel = selectedUser === u2;
          return <div key={u2} onClick={function() { setSelectedUser(u2); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: isSel ? GR + "15" : "transparent", marginBottom: 3, border: "1px solid " + (isSel ? GR + "30" : "transparent") }}>
            <Av color={t2.color} size={26} fs={11} userId={u2}>{(t2.name || "?")[0]}</Av>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: isSel ? 700 : 500, color: isSel ? GR : "#1E293B" }}>{t2.name}</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>{count} zile concediu</div>
            </div>
          </div>;
        })}
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button style={S.cancelBtn} onClick={function() { var n = new Date(calMonth); n.setMonth(n.getMonth() - 1); setCalMonth(n); }}>&lt;</button>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{MN[m]} {y}</div>
          <button style={S.cancelBtn} onClick={function() { var n = new Date(calMonth); n.setMonth(n.getMonth() + 1); setCalMonth(n); }}>&gt;</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {["L", "Ma", "Mi", "J", "V", "S", "D"].map(function(d3, i2) { return <div key={i2} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94A3B8", padding: 4 }}>{d3}</div>; })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map(function(cell, i3) {
            if (cell === null) return <div key={i3} style={{ padding: 8 }} />;
            var dStr = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(cell).padStart(2, "0");
            var isToday2 = dStr === TD;
            var isLeave = userLeaves.includes(dStr);
            var dt = new Date(y, m, cell);
            var dow = dt.getDay();
            var isWeekend = dow === 0 || dow === 6;
            return <div key={i3} onClick={function() { if (canDirectEdit) toggleDate(dStr); }} style={{ padding: "10px 0", textAlign: "center", cursor: canDirectEdit ? "pointer" : "default", borderRadius: 6, background: isLeave ? "#D97706" : isToday2 ? GR + "20" : isWeekend ? "#F8FAFC" : "#fff", color: isLeave ? "#fff" : isWeekend ? "#94A3B8" : "#1E293B", fontWeight: isLeave ? 700 : isToday2 ? 700 : 500, fontSize: 13, border: "1px solid " + (isLeave ? "#D97706" : isToday2 ? GR : "#E2E8F0") }}>{cell}</div>;
          })}
        </div>
        {selectedUser && <div style={{ marginTop: 14, padding: 10, background: "#F8FAFC", borderRadius: 6, fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: "#475569" }}>Concediu {(team[selectedUser] || {}).name}: {userLeaves.length} zile</div>
          {userLeaves.length > 0 ? <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{userLeaves.slice(0, 20).map(function(d4) { return <Badge key={d4} bg="#FEF3C7" color="#92400E">{d4}</Badge>; })}{userLeaves.length > 20 && <Badge bg="#F1F5F9" color="#64748B">+{userLeaves.length - 20}</Badge>}</div> : <div style={{ color: "#94A3B8" }}>Niciun concediu inca.</div>}
        </div>}
      </Card>
    </div>
  </div>;
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
          <Av color={m.color} size={36} userId={u}>{m.name[0]}</Av>
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
  var pages = ["dashboard", "tasks", "kanban", "targets", "templates", "recurring", "leaves", "workload", "performance", "digest", "achievements", "wallfame", "brandstats", "league", "leagueMonthly", "announce", "departments", "shops", "products", "sheets", "manage_users", "branding", "config", "pipeline", "backups"];
  var pageLabels = {
    dashboard: "Dashboard", tasks: "Taskuri", kanban: "Kanban Board",
    targets: "Targets", templates: "Templates", recurring: "Recurring",
    leaves: "Concedii", workload: "Workload", performance: "Performance",
    digest: "Weekly Digest", achievements: "Achievements", wallfame: "Wall of Fame",
    brandstats: "Brand Analytics", league: "Liga Saptamanii", leagueMonthly: "Liga Lunara",
    announce: "Announcements", departments: "Departamente", shops: "Magazine",
    products: "Produse", sheets: "Sheets", manage_users: "Manage Users",
    branding: "Branding", config: "Configurare Rapida", pipeline: "Pipeline Builder",
    backups: "Backup Taskuri"
  };
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
          {pageLabels[pg] || pg}
        </label>;
      })}
    </div>
  </div>;
}

// FEATURE 15: TaskModal with auto-save draft + FEATURE 16: conflict detection + FEATURE 4: tags
// Feature 6 + 12: Task modal with custom types and departments
function TaskModal({ task, team, assUsers, shops, products, onSave, onClose, taskTypes, departments, allTasks, allTags, taskEditors, user, setTaskEditors, leaves, platforms }) {
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
    {f.assignee && leaves && isOnLeave(leaves, f.assignee, f.deadline || TD) && <div style={{ fontSize: 11, color: "#D97706", background: "#FFFBEB", padding: "4px 8px", borderRadius: 4, marginTop: 4, border: "1px solid #FDE68A" }}>⚠️ {(team[f.assignee] || {}).name} este in concediu pe {f.deadline || "azi"}. Taskul nu se va contoriza la target.</div>}
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
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Platforma</label><select style={S.fSelF} value={f.platform} onChange={function(e) { set("platform", e.target.value); }}><option value="">--</option>{(platforms || DEF_PLATFORMS).map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Tip Task</label><select style={S.fSelF} value={f.taskType} onChange={function(e) { set("taskType", e.target.value); }}><option value="">--</option>{allTypes.map(function(t) { return <option key={t} value={t}>{t}</option>; })}</select><div style={{ display: "flex", gap: 4, marginTop: 4 }}><input style={Object.assign({}, S.input, { flex: 1, fontSize: 11, padding: "4px 8px" })} value={customType} onChange={function(e) { setCustomType(e.target.value); }} placeholder="Tip nou..." /><button style={Object.assign({}, S.primBtn, { fontSize: 10, padding: "4px 8px" })} onClick={function() { if (customType.trim()) { set("taskType", customType.trim()); setCustomType(""); } }}>+</button></div></div></div>
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Departament</label><select style={S.fSelF} value={f.department || ""} onChange={function(e) { set("department", e.target.value); }}><option value="">--</option>{(departments || DEF_DEPARTMENTS).map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Prioritate</label><select style={S.fSelF} value={f.priority} onChange={function(e) { set("priority", e.target.value); }}>{PRIORITIES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div></div>
    <div style={S.fRow}><div style={S.fCol}><label style={S.label}>Status</label><select style={S.fSelF} value={f.status} onChange={function(e) { set("status", e.target.value); }}>{STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div><div style={S.fCol}><label style={S.label}>Deadline</label><input style={S.fSelF} type="date" value={f.deadline} onChange={function(e) { set("deadline", e.target.value); }} /></div></div>
    {products.length > 0 && <div><label style={S.label}>Produs (lista)</label><select style={S.fSelF} value={f.product || ""} onChange={function(e) { selProd(e.target.value); }}><option value="">--</option>{products.map(function(p) { return <option key={p.id} value={p.id}>{p.name}{p.store ? " (" + p.store + ")" : ""}</option>; })}</select></div>}
    <label style={S.label}>Produs (manual)</label><input style={S.input} value={f.productName || ""} onChange={function(e) { set("productName", e.target.value); }} placeholder="Nume produs" />
    <label style={S.label}>Linkuri</label><div style={{ display: "flex", gap: 6, marginBottom: 8 }}><input style={Object.assign({}, S.input, { flex: 1 })} value={newLink} onChange={function(e) { setNewLink(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addLink(); }} placeholder="https://..." /><button style={S.primBtn} onClick={addLink}><Ic d={Icons.plus} size={14} color="#fff" /></button></div>{(f.links || []).map(function(l, i) { return <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12 }}><Ic d={Icons.link} size={12} color="#2563EB" /><a href={l} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</a><button style={S.iconBtn} onClick={function() { set("links", (f.links || []).filter(function(_, idx) { return idx !== i; })); }}><Ic d={Icons.x} size={12} color="#EF4444" /></button></div>; })}
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
    {t.links && t.links.length > 0 && !(t.links.length === 1 && t.productName && !t._replacedLink && ["dana", "carla", "mara_poze"].includes(t.assignee) && t._campaignParentId) && <div style={{ marginBottom: 14 }}><div style={{ fontWeight: 700, fontSize: 11, marginBottom: 8, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 5 }}><Ic d={Icons.link} size={11} color="#475569" />{t._replacedLink ? "Linkuri (" + t.links.length + ")" : "Linkuri (" + t.links.length + ")"}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{t.links.map(function(l, i) { var isReplaced = t._originalLinks && t._originalLinks.includes(l) && t._replacedLink && l !== t._replacedLink; var domain = ""; try { domain = new URL(l).hostname.replace("www.", ""); } catch(e) { domain = l.slice(0, 30); } return <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: isReplaced ? "#F8FAFC" : "#F0F9FF", border: "1px solid " + (isReplaced ? "#E2E8F0" : "#BFDBFE"), opacity: isReplaced ? 0.5 : 1 }}><Ic d={Icons.link} size={12} color={isReplaced ? "#94A3B8" : "#2563EB"} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, marginBottom: 1 }}>{domain}{isReplaced ? " (inlocuit)" : ""}</div><div style={{ fontSize: 11, color: isReplaced ? "#94A3B8" : "#1D4ED8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isReplaced ? "line-through" : "none" }}>{l}</div></div><a href={l} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, background: isReplaced ? "#F1F5F9" : "#2563EB", color: isReplaced ? "#94A3B8" : "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}><Ic d={Icons.ext} size={11} color={isReplaced ? "#94A3B8" : "#fff"} /> Deschide</a></div>; })}</div></div>}
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

// ═══════════════════════════════════════════════════════════════
// CONFETTI OVERLAY — Visual celebration on task Done / target hit
// ═══════════════════════════════════════════════════════════════
function ConfettiOverlay({ type }) {
  var colors = type === "target" ? ["#FFD700", "#FFA500", "#FF6347", "#4ADE80", "#3B82F6", "#A855F7"] : type === "levelup" ? ["#7C3AED", "#A855F7", "#C084FC", "#DDD6FE", "#EDE9FE", "#FFD700"] : ["#4ADE80", "#10B981", "#0C7E3E", "#6EE7B7", "#34D399"];
  var particles = [];
  var count = type === "target" ? 40 : type === "levelup" ? 50 : 20;
  for (var i = 0; i < count; i++) {
    particles.push({ id: i, left: Math.random() * 100, delay: Math.random() * 0.8, size: 4 + Math.random() * 8, color: colors[Math.floor(Math.random() * colors.length)], duration: 1.2 + Math.random() * 1.2, shape: Math.random() > 0.5 ? "circle" : "rect" });
  }
  return <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
    {particles.map(function(p) {
      return <div key={p.id} style={{ position: "absolute", left: p.left + "%", top: -20, width: p.size, height: p.shape === "circle" ? p.size : p.size * 1.5, borderRadius: p.shape === "circle" ? "50%" : 2, background: p.color, animation: "confettiFall " + p.duration + "s ease-in " + p.delay + "s forwards", opacity: 0.9, transform: "rotate(" + (Math.random() * 360) + "deg)" }} />;
    })}
    {type === "target" && <div style={{ position: "fixed", top: "40%", left: "50%", transform: "translate(-50%,-50%)", animation: "targetBurst 0.6s ease-out", textAlign: "center", pointerEvents: "none" }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#0C7E3E", textShadow: "0 2px 10px rgba(12,126,62,0.3)", background: "#fff", padding: "8px 24px", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}>TARGET ATINS!</div>
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// SPARKLINE — Mini 7-day trend chart for KPI cards
// ═══════════════════════════════════════════════════════════════
function Sparkline({ data, color, height }) {
  if (!data || data.length < 2) return null;
  var h = height || 30;
  var w = 80;
  var max = Math.max.apply(null, data);
  var min = Math.min.apply(null, data);
  var range = max - min || 1;
  var points = data.map(function(v, i) {
    var x = (i / (data.length - 1)) * w;
    var y = h - ((v - min) / range) * (h - 4) - 2;
    return x + "," + y;
  });
  var linePath = "M" + points.join(" L");
  var areaPath = linePath + " L" + w + "," + h + " L0," + h + " Z";
  return <svg width={w} height={h} viewBox={"0 0 " + w + " " + h} style={{ display: "block", opacity: 0.6 }}>
    <defs><linearGradient id={"spk_" + color.replace("#", "")} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
    <path d={areaPath} fill={"url(#spk_" + color.replace("#", "") + ")"} />
    <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx={data.length > 1 ? w : 0} cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2} r="2.5" fill={color} />
  </svg>;
}

// ═══════════════════════════════════════════════════════════════
// WALL OF FAME — All-time records, streaks, speed records
// ═══════════════════════════════════════════════════════════════
function WallOfFamePage({ tasks, team, timers, visUsers, isMob, userXP, achievements, monthlyBonus }) {
  try {
  var users = visUsers.filter(function(u) { return team[u] && team[u].role !== "admin"; });
  var doneTasks = tasks.filter(function(t) { return t.status === "Done" && !t._campaignParent; });

  // Records calculation
  var records = [];

  // 1. Most tasks done all-time
  var allTimeDone = users.map(function(u) {
    return { user: u, name: (team[u] || {}).name, color: (team[u] || {}).color, count: doneTasks.filter(function(t) { return t.assignee === u; }).length };
  }).sort(function(a, b) { return b.count - a.count; });
  if (allTimeDone[0] && allTimeDone[0].count > 0) records.push({ title: "Cele mai multe taskuri - All Time", icon: "👑", holder: allTimeDone[0], value: allTimeDone[0].count + " taskuri", color: "#EAB308" });

  // 2. Most tasks in a single day
  var dailyCounts = {};
  doneTasks.forEach(function(t) {
    if (!t.updatedAt) return;
    var key = t.assignee + "|" + ds(t.updatedAt);
    dailyCounts[key] = (dailyCounts[key] || 0) + 1;
  });
  var bestDay = { key: "", count: 0 };
  Object.keys(dailyCounts).forEach(function(k) { if (dailyCounts[k] > bestDay.count) bestDay = { key: k, count: dailyCounts[k] }; });
  if (bestDay.count > 0) {
    var parts = bestDay.key.split("|");
    var bdUser = team[parts[0]] || {};
    records.push({ title: "Record taskuri intr-o zi", icon: "🔥", holder: { name: bdUser.name, color: bdUser.color }, value: bestDay.count + " taskuri (" + fd(parts[1]) + ")", color: "#DC2626" });
  }

  // 3. Fastest task
  var fastest = { time: Infinity, task: null, user: "" };
  doneTasks.forEach(function(t) {
    var tm = timers[t.id];
    if (tm && tm.total > 0 && tm.total < fastest.time) { fastest = { time: tm.total, task: t, user: t.assignee }; }
  });
  if (fastest.task) {
    var fUser = team[fastest.user] || {};
    records.push({ title: "Cel mai rapid task", icon: "💨", holder: { name: fUser.name, color: fUser.color }, value: ft(fastest.time) + " - \"" + fastest.task.title.substring(0, 30) + "\"", color: "#3B82F6" });
  }

  // 4. Highest XP
  var xpRanking = users.map(function(u) { return { user: u, name: (team[u] || {}).name, color: (team[u] || {}).color, xp: (userXP || {})[u] || 0 }; }).sort(function(a, b) { return b.xp - a.xp; });
  if (xpRanking[0] && xpRanking[0].xp > 0) records.push({ title: "Cel mai mare XP", icon: "⭐", holder: xpRanking[0], value: xpRanking[0].xp + " XP (Level " + getLevel(xpRanking[0].xp) + ")", color: "#7C3AED" });

  // 5. Most achievements
  var achRanking = users.map(function(u) { return { user: u, name: (team[u] || {}).name, color: (team[u] || {}).color, count: ((achievements || {})[u] || []).length }; }).sort(function(a, b) { return b.count - a.count; });
  if (achRanking[0] && achRanking[0].count > 0) records.push({ title: "Cele mai multe achievements", icon: "🏆", holder: achRanking[0], value: achRanking[0].count + " achievements", color: "#10B981" });

  // 6. Most time tracked
  var timeRanking = users.map(function(u) {
    var total = 0;
    tasks.filter(function(t) { return t.assignee === u; }).forEach(function(t) { var tm = timers[t.id]; if (tm) total += tm.total || 0; });
    return { user: u, name: (team[u] || {}).name, color: (team[u] || {}).color, time: total };
  }).sort(function(a, b) { return b.time - a.time; });
  if (timeRanking[0] && timeRanking[0].time > 0) records.push({ title: "Cel mai mult timp tracked", icon: "⏱️", holder: timeRanking[0], value: ft(timeRanking[0].time), color: "#EA580C" });

  // 7. Best per task type
  var taskTypeLeaders = {};
  doneTasks.forEach(function(t) {
    var tp = t.taskType || "General";
    if (!taskTypeLeaders[tp]) taskTypeLeaders[tp] = {};
    taskTypeLeaders[tp][t.assignee] = (taskTypeLeaders[tp][t.assignee] || 0) + 1;
  });

  // Leaderboard table
  var leaderboard = users.map(function(u) {
    var xp = (userXP || {})[u] || 0;
    var lvl = getLevel(xp);
    var done = doneTasks.filter(function(t) { return t.assignee === u; }).length;
    var achCount = ((achievements || {})[u] || []).length;
    var totalTime = 0;
    tasks.filter(function(t) { return t.assignee === u; }).forEach(function(t) { var tm = timers[t.id]; if (tm) totalTime += tm.total || 0; });
    return { user: u, name: (team[u] || {}).name, color: (team[u] || {}).color, xp: xp, level: lvl, title: getLevelTitle(lvl), done: done, achCount: achCount, totalTime: totalTime };
  }).sort(function(a, b) { return b.xp - a.xp; });

  return <div>
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 4 }}>🏛️ Wall of Fame</h2>
      <div style={{ fontSize: 12, color: "#64748B" }}>Recorduri all-time, nivele si clasament permanent al echipei.</div>
    </div>

    {/* Monthly bonus banner */}
    {monthlyBonus && monthlyBonus.enabled && monthlyBonus.amount > 0 && leaderboard.length > 0 && <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #FEFCE8, #FEF3C7)", borderLeft: "4px solid #EAB308" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 40 }}>💰</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#EAB308", textTransform: "uppercase", letterSpacing: 1 }}>Premiu luna aceasta</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#1E293B" }}>{monthlyBonus.amount} {monthlyBonus.currency}</div>
          <div style={{ fontSize: 12, color: "#64748B" }}>Lider curent: <b>{leaderboard[0].name}</b> ({leaderboard[0].xp} XP, Level {leaderboard[0].level})</div>
        </div>
      </div>
    </Card>}

    {/* Records cards */}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginBottom: 24 }}>
      {records.map(function(r, i) {
        return <Card key={i} style={{ borderLeft: "4px solid " + r.color, background: r.color + "08" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 36 }}>{r.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{r.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Av color={r.holder.color || "#94A3B8"} size={24} fs={10}>{(r.holder.name || "?")[0]}</Av>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{r.holder.name}</span>
              </div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{r.value}</div>
            </div>
          </div>
        </Card>;
      })}
    </div>

    {/* Full leaderboard with levels */}
    <Card>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>Clasament All-Time</div>
      {leaderboard.map(function(p, idx) {
        var prog = getLevelProgress(p.xp);
        var lvlColor = getLevelColor(p.level);
        var medals = ["🥇", "🥈", "🥉"];
        return <div key={p.user} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 6, borderRadius: 10, background: idx < 3 ? lvlColor + "08" : "#F8FAFC", border: "1px solid " + (idx < 3 ? lvlColor + "30" : "#E2E8F0") }}>
          <div style={{ fontSize: 20, width: 30, textAlign: "center" }}>{idx < 3 ? medals[idx] : <span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 700 }}>#{idx + 1}</span>}</div>
          <div style={{ position: "relative" }}>
            <Av color={p.color} size={40} fs={15}>{p.name[0]}</Av>
            <div style={{ position: "absolute", bottom: -4, right: -4, background: lvlColor, color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, border: "2px solid #fff" }}>{p.level}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{p.name}</span>
              <span style={{ fontSize: 10, color: lvlColor, fontWeight: 700, background: lvlColor + "15", padding: "2px 8px", borderRadius: 4 }}>{p.title}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#64748B" }}>
              <span style={{ fontWeight: 700, color: lvlColor }}>{p.xp} XP</span>
              <span>{p.done} done</span>
              <span>{p.achCount} ach</span>
              <span>{ft(p.totalTime)} tracked</span>
            </div>
            <div style={{ height: 4, background: "#E2E8F0", borderRadius: 2, marginTop: 4, maxWidth: 200 }}>
              <div style={{ height: "100%", width: prog + "%", background: lvlColor, borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: lvlColor }}>Lv.{p.level}</div>
          </div>
        </div>;
      })}
    </Card>
  </div>;
  } catch(err) { return <Card style={{ padding: 30, textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>Eroare Wall of Fame</div><div style={{ fontSize: 12, color: "#64748B" }}>{err.message}</div></Card>; }
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY LEAGUE — Clasament lunar cu bonus, reset la 1 a lunii
// ═══════════════════════════════════════════════════════════════
function MonthlyLeaguePage({ allTasks, team, user, me, targets, achievements, visUsers, isMob, monthlyBonus, setMonthlyBonus, userXP }) {
  var [leagueTab, setLeagueTab] = useState(me.role === "pm" ? "pm" : "members");
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  var monthNames = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  var monthLabel = monthNames[now.getMonth()] + " " + now.getFullYear();
  var daysInMonth = monthEnd.getDate();
  var daysPassed = now.getDate();
  var daysRemaining = daysInMonth - daysPassed;

  // Member leaderboard
  var memberBoard = calcMemberLeaderboard(allTasks, team, targets, Object.keys(team)).map(function(p) {
    var xp = (userXP || {})[p.user] || 0;
    p.level = getLevel(xp); p.title = getLevelTitle(p.level); p.xp = xp;
    return p;
  });

  // PM leaderboard
  var pmBoard = calcPMLeaderboard(allTasks, team, Object.keys(team)).map(function(p) {
    var xp = (userXP || {})[p.user] || 0;
    p.level = getLevel(xp); p.title = getLevelTitle(p.level); p.xp = xp;
    return p;
  });

  var currentBoard = leagueTab === "pm" ? pmBoard : memberBoard;
  var myPos = currentBoard.findIndex(function(p) { return p.user === user; });
  var myData = myPos >= 0 ? currentBoard[myPos] : null;
  var maxScore = currentBoard.length > 0 ? currentBoard[0].score : 1;

  var renderLeaderboard = function(board, isPM) {
    return board.map(function(p, idx) {
      var isMe = p.user === user;
      var lvlColor = getLevelColor(p.level);
      var widthPct = maxScore > 0 ? (p.score / maxScore) * 100 : 0;
      var medals = ["🥇", "🥈", "🥉"];
      var isLeader = idx === 0 && monthlyBonus && monthlyBonus.enabled && monthlyBonus.amount > 0 && !isPM;
      return <div key={p.user} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 6, borderRadius: 10, background: isLeader ? "linear-gradient(135deg, #FEFCE810, #FEF3C720)" : isMe ? p.color + "08" : idx < 3 ? "#FEFCE880" : "#fff", border: "1px solid " + (isLeader ? "#EAB30840" : isMe ? p.color + "40" : "#E2E8F0"), position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: widthPct + "%", background: idx === 0 ? "linear-gradient(90deg, #EAB30810, transparent)" : "transparent", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ fontSize: 20, width: 30, textAlign: "center" }}>{idx < 3 ? medals[idx] : <span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 700 }}>#{idx + 1}</span>}</div>
          <Av color={p.color} size={36} fs={13} userId={p.user}>{p.name[0]}</Av>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{p.name}</span>
              <span style={{ fontSize: 10, color: lvlColor, fontWeight: 700, background: lvlColor + "15", padding: "2px 8px", borderRadius: 4 }}>Lv.{p.level} {p.title}</span>
              {isMe && <Badge bg={p.color + "15"} color={p.color}>TU</Badge>}
              {isLeader && <Badge bg="#FEF3C7" color="#92400E">+{monthlyBonus.amount} {monthlyBonus.currency}</Badge>}
            </div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
              {isPM ? (p.created + " create | " + p.teamDone + " echipa done | " + p.ownDone + " proprii | " + p.teamOverdue + " overdue echipa") : (p.doneThis + " done | " + p.overdue + " overdue")}
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 60 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: idx === 0 ? "#EAB308" : "#1E293B" }}>{p.score}</div>
            <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>puncte</div>
          </div>
        </div>
      </div>;
    });
  };

  return <div>
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 4 }}>Liga Lunara - {monthLabel}</h2>
      <div style={{ fontSize: 12, color: "#64748B" }}>Clasament lunar. Se reseteaza pe 1 a fiecarei luni. {daysRemaining} zile ramase.</div>
    </div>

    {/* Bonus Banner */}
    {monthlyBonus && monthlyBonus.enabled && monthlyBonus.amount > 0 && <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #FEFCE8, #FEF3C7 40%, #FFF 80%)", borderLeft: "4px solid #EAB308", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -10, fontSize: 100, opacity: 0.06 }}>💰</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 48 }}>🏆</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#EAB308", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Premiu Membrul #1 - {monthLabel}</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#1E293B" }}>{monthlyBonus.amount} {monthlyBonus.currency}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Membrul cu cel mai mare scor la sfarsitul lunii castiga bonusul.</div>
        </div>
        {memberBoard.length > 0 && <div style={{ textAlign: "center", padding: "12px 20px", background: "#EAB30815", borderRadius: 12, border: "1px solid #EAB30830" }}>
          <div style={{ fontSize: 11, color: "#92400E", fontWeight: 600, marginBottom: 4 }}>Lider curent</div>
          <Av color={memberBoard[0].color} size={44} fs={16} userId={memberBoard[0].user}>{memberBoard[0].name[0]}</Av>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1E293B", marginTop: 4 }}>{memberBoard[0].name}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{memberBoard[0].score} pts | Lv.{memberBoard[0].level}</div>
        </div>}
      </div>
    </Card>}

    {/* Month progress */}
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: "#475569" }}>Progres luna</span>
        <span style={{ color: "#64748B" }}>Ziua {daysPassed}/{daysInMonth}</span>
      </div>
      <div style={{ height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: Math.round((daysPassed / daysInMonth) * 100) + "%", background: "linear-gradient(90deg, #EAB308, #F59E0B)", borderRadius: 4 }} />
      </div>
    </Card>

    {/* Tab switcher: Members vs PMs */}
    <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: 4, background: "#F1F5F9", borderRadius: 10, width: "fit-content" }}>
      <button onClick={function() { setLeagueTab("members"); }} style={{ padding: "10px 22px", borderRadius: 7, border: "none", background: leagueTab === "members" ? "#fff" : "transparent", color: leagueTab === "members" ? "#1E293B" : "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: leagueTab === "members" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>Liga Membrilor ({memberBoard.length})</button>
      <button onClick={function() { setLeagueTab("pm"); }} style={{ padding: "10px 22px", borderRadius: 7, border: "none", background: leagueTab === "pm" ? "#fff" : "transparent", color: leagueTab === "pm" ? "#1E293B" : "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: leagueTab === "pm" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>Liga PM-ilor ({pmBoard.length})</button>
    </div>

    {/* My position */}
    {myData && <Card style={{ marginBottom: 16, background: myData.color + "08", borderLeft: "4px solid " + myData.color }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: myData.color }}>#{myPos + 1}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Pozitia ta, {myData.name}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{myData.score} puncte | Lv.{myData.level} {myData.title}</div>
        </div>
      </div>
    </Card>}

    {/* Leaderboard */}
    <Card>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>{leagueTab === "pm" ? "Clasament PM-ilor" : "Clasament Membrilor"} - {monthLabel}</div>
      {currentBoard.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>Nu sunt participanti.</div>}
      {renderLeaderboard(currentBoard, leagueTab === "pm")}
    </Card>

    {/* Admin bonus config */}
    {me.role === "admin" && <Card style={{ marginTop: 16, borderLeft: "3px solid #7C3AED" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", marginBottom: 10 }}>Seteaza Premiu Lunar (admin)</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={monthlyBonus.enabled} onChange={function(e) { setMonthlyBonus(Object.assign({}, monthlyBonus, { enabled: e.target.checked })); }} style={{ accentColor: "#7C3AED" }} /> Activ
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Suma:</label>
          <input type="number" min="0" step="10" value={monthlyBonus.amount} onChange={function(e) { setMonthlyBonus(Object.assign({}, monthlyBonus, { amount: parseInt(e.target.value) || 0 })); }} style={Object.assign({}, S.input, { width: 100, padding: "6px 10px", fontSize: 14, fontWeight: 700, textAlign: "center" })} />
        </div>
        <select value={monthlyBonus.currency} onChange={function(e) { setMonthlyBonus(Object.assign({}, monthlyBonus, { currency: e.target.value })); }} style={Object.assign({}, S.fSel, { padding: "6px 10px" })}>
          <option value="RON">RON</option><option value="EUR">EUR</option><option value="USD">USD</option>
        </select>
      </div>
    </Card>}

    {/* Scoring explanation */}
    <Card style={{ marginTop: 16, background: "#F8FAFC" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Cum se calculeaza scorul:</div>
      <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", marginBottom: 4 }}>Membri (implementare)</div>
          <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.7 }}>
            <span style={{ display: "block" }}>+10 per task finalizat</span>
            <span style={{ display: "block" }}>+3 per zi cu target atins</span>
            <span style={{ display: "block" }}>-5 per task intarziat</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 4 }}>PM (coordonare)</div>
          <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.7 }}>
            <span style={{ display: "block" }}>+5 per task creat catre echipa</span>
            <span style={{ display: "block" }}>+8 per task finalizat de echipa</span>
            <span style={{ display: "block" }}>+10 per task propriu finalizat</span>
            <span style={{ display: "block" }}>-3 per task intarziat in echipa</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>Clasamentul se reseteaza automat pe 1 a fiecarei luni.</div>
    </Card>
  </div>;
}


function BrandStatsPage({ tasks, team, shops, timers, isMob }) {
  var [selectedShop, setSelectedShop] = useState(shops[0] || "");
  var [dateRange, setDateRange] = useState("30");
  var [customFrom, setCustomFrom] = useState("");
  var [customTo, setCustomTo] = useState("");

  // Date filter
  var filterByDate = function(t) {
    if (!t.createdAt && !t.updatedAt) return true;
    var taskDate = t.updatedAt || t.createdAt;
    if (dateRange === "all") return true;
    if (dateRange === "today") return ds(taskDate) === TD;
    if (dateRange === "yesterday") { var y = new Date(); y.setDate(y.getDate() - 1); return ds(taskDate) === ds(y); }
    if (dateRange === "custom" && customFrom) {
      var d = ds(taskDate);
      if (d < customFrom) return false;
      if (customTo && d > customTo) return false;
      return true;
    }
    var daysAgo = parseInt(dateRange) || 30;
    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysAgo);
    return new Date(taskDate) >= cutoff;
  };

  var shopTasks = tasks.filter(function(t) { return t.shop === selectedShop && !t._campaignParent; });
  var filteredShopTasks = shopTasks.filter(filterByDate);
  var doneTasks = filteredShopTasks.filter(function(t) { return t.status === "Done"; });
  var activeTasks = filteredShopTasks.filter(function(t) { return t.status !== "Done"; });
  var overdueTasks = filteredShopTasks.filter(function(t) { return t.status !== "Done" && isP(t.deadline); });

  // Daily done trend
  var days = parseInt(dateRange) || 30;
  if (dateRange === "today" || dateRange === "yesterday") days = 1;
  if (dateRange === "all") days = 60;
  var dailyData = [];
  for (var dd = Math.min(days, 30) - 1; dd >= 0; dd--) {
    var dt = new Date(); dt.setDate(dt.getDate() - dd);
    var dStr = ds(dt);
    var dayDone = shopTasks.filter(function(t) { return t.status === "Done" && t.updatedAt && ds(t.updatedAt) === dStr; }).length;
    var dayCreated = shopTasks.filter(function(t) { return t.createdAt && ds(t.createdAt) === dStr; }).length;
    dailyData.push({ date: dStr, label: dt.getDate() + " " + MN[dt.getMonth()].substring(0, 3), done: dayDone, created: dayCreated });
  }
  var maxDaily = Math.max.apply(null, dailyData.map(function(d) { return Math.max(d.done, d.created); }).concat([1]));

  // Task type distribution
  var typeDistribution = {};
  filteredShopTasks.forEach(function(t) { var tp = t.taskType || "General"; typeDistribution[tp] = (typeDistribution[tp] || 0) + 1; });
  var typeData = Object.keys(typeDistribution).map(function(k) { return { label: k, count: typeDistribution[k] }; }).sort(function(a, b) { return b.count - a.count; });
  var totalType = typeData.reduce(function(acc, d) { return acc + d.count; }, 0);

  // Platform distribution
  var platDistribution = {};
  filteredShopTasks.forEach(function(t) { var p = t.platform || "Altele"; platDistribution[p] = (platDistribution[p] || 0) + 1; });
  var platData = Object.keys(platDistribution).map(function(k) { return { label: k, count: platDistribution[k] }; }).sort(function(a, b) { return b.count - a.count; });

  // Status breakdown
  var statusBreakdown = {};
  filteredShopTasks.forEach(function(t) { statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1; });

  // Top performers
  var performerMap = {};
  doneTasks.forEach(function(t) { performerMap[t.assignee] = (performerMap[t.assignee] || 0) + 1; });
  var performers = Object.keys(performerMap).map(function(u) { return { user: u, name: (team[u] || {}).name || u, color: (team[u] || {}).color || "#94A3B8", done: performerMap[u] }; }).sort(function(a, b) { return b.done - a.done; });
  var maxPerf = performers.length > 0 ? performers[0].done : 1;

  // Avg time
  var timedTasks = doneTasks.filter(function(t) { return timers[t.id] && timers[t.id].total > 0; });
  var avgTime = timedTasks.length > 0 ? Math.round(timedTasks.reduce(function(acc, t) { return acc + timers[t.id].total; }, 0) / timedTasks.length) : 0;
  var completionRate = filteredShopTasks.length > 0 ? Math.round((doneTasks.length / filteredShopTasks.length) * 100) : 0;
  var score = Math.max(0, Math.min(100, completionRate - (overdueTasks.length * 5)));
  var scoreColor = score >= 70 ? "#10B981" : score >= 40 ? "#D97706" : "#DC2626";
  var typeColors = ["#3B82F6", "#10B981", "#F59E0B", "#7C3AED", "#EC4899", "#06B6D4", "#EA580C", "#94A3B8"];

  // Per-shop summary (all shops)
  var shopSummary = shops.map(function(s) {
    var st = tasks.filter(function(t) { return t.shop === s && !t._campaignParent; });
    var stFiltered = st.filter(filterByDate);
    var sDone = stFiltered.filter(function(t) { return t.status === "Done"; }).length;
    var sActive = stFiltered.filter(function(t) { return t.status !== "Done"; }).length;
    return { shop: s, total: stFiltered.length, done: sDone, active: sActive };
  }).filter(function(s) { return s.total > 0; }).sort(function(a, b) { return b.total - a.total; });

  return <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", marginBottom: 4 }}>Brand Analytics</h2>
        <div style={{ fontSize: 12, color: "#64748B" }}>Performanta detaliata per magazin.</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select style={Object.assign({}, S.fSel, { fontSize: 13, padding: "8px 14px", fontWeight: 700 })} value={selectedShop} onChange={function(e) { setSelectedShop(e.target.value); }}>
          {shops.map(function(s) { return <option key={s} value={s}>{s}</option>; })}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ id: "today", l: "Azi" }, { id: "yesterday", l: "Ieri" }, { id: "7", l: "7z" }, { id: "14", l: "14z" }, { id: "30", l: "30z" }, { id: "all", l: "Tot" }, { id: "custom", l: "Custom" }].map(function(r) {
            return <button key={r.id} onClick={function() { setDateRange(r.id); }} style={Object.assign({}, S.chip, { background: dateRange === r.id ? GR : "#F1F5F9", color: dateRange === r.id ? "#fff" : "#475569", fontWeight: dateRange === r.id ? 600 : 400, fontSize: 11, padding: "5px 10px" })}>{r.l}</button>;
          })}
        </div>
        {dateRange === "custom" && <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input type="date" style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 8px" })} value={customFrom} onChange={function(e) { setCustomFrom(e.target.value); }} />
          <span style={{ color: "#94A3B8" }}>-</span>
          <input type="date" style={Object.assign({}, S.fSel, { fontSize: 11, padding: "4px 8px" })} value={customTo} onChange={function(e) { setCustomTo(e.target.value); }} />
        </div>}
      </div>
    </div>

    {/* KPIs */}
    <div style={{ display: "grid", gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(6,1fr)", gap: 10, marginBottom: 16 }}>
      {[
        { l: "Total", v: filteredShopTasks.length, c: "#475569" },
        { l: "Active", v: activeTasks.length, c: "#2563EB" },
        { l: "Done", v: doneTasks.length, c: "#10B981" },
        { l: "Overdue", v: overdueTasks.length, c: "#DC2626" },
        { l: "Score", v: score + "%", c: scoreColor },
        { l: "Timp Mediu", v: avgTime > 0 ? ft(avgTime) : "-", c: "#7C3AED" },
      ].map(function(s) {
        return <Card key={s.l} style={{ borderTop: "3px solid " + s.c, textAlign: "center", padding: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{s.l}</div>
        </Card>;
      })}
    </div>

    {/* Daily trend chart */}
    {dailyData.length > 1 && <Card style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Evolutie zilnica - {selectedShop}</div>
      <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>Done vs Creat</div>
      <svg viewBox="0 0 700 180" style={{ width: "100%", height: "auto" }}>
        {dailyData.map(function(d, i) {
          var barW = Math.min(30, (640 / dailyData.length) * 0.35);
          var xBase = 50 + i * (640 / dailyData.length);
          var hDone = (d.done / maxDaily) * 120;
          var hCreated = (d.created / maxDaily) * 120;
          var showLabel = dailyData.length <= 15 || i % Math.ceil(dailyData.length / 15) === 0;
          return <g key={i}>
            <rect x={xBase} y={140 - hCreated} width={barW} height={Math.max(hCreated, 1)} fill="#3B82F6" opacity="0.7" rx="2" />
            <rect x={xBase + barW + 2} y={140 - hDone} width={barW} height={Math.max(hDone, 1)} fill="#10B981" opacity="0.9" rx="2" />
            {showLabel && <text x={xBase + barW} y="158" fontSize="9" fill="#94A3B8" textAnchor="middle">{d.label}</text>}
            {d.done > 0 && <text x={xBase + barW + 2 + barW / 2} y={140 - hDone - 4} fontSize="9" fill="#10B981" textAnchor="middle" fontWeight="700">{d.done}</text>}
          </g>;
        })}
      </svg>
      <div style={{ display: "flex", gap: 14, fontSize: 10, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#3B82F6", borderRadius: 2 }} /><span style={{ color: "#64748B" }}>Creat</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#10B981", borderRadius: 2 }} /><span style={{ color: "#64748B" }}>Done</span></div>
      </div>
    </Card>}

    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
      {/* Task type breakdown */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Per Tip Task</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>{totalType} taskuri</div>
        {typeData.length > 0 ? typeData.map(function(d, i) {
          var pct = totalType > 0 ? Math.round((d.count / totalType) * 100) : 0;
          return <div key={d.label} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: "#475569", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: typeColors[i % typeColors.length] }} />{d.label}
              </span>
              <span style={{ color: "#94A3B8" }}>{d.count} ({pct}%)</span>
            </div>
            <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%", background: typeColors[i % typeColors.length], borderRadius: 3 }} />
            </div>
          </div>;
        }) : <div style={{ textAlign: "center", padding: 20, color: "#94A3B8", fontSize: 12 }}>Nu sunt taskuri.</div>}
      </Card>

      {/* Platform breakdown */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>Per Platforma</div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 14 }}>{filteredShopTasks.length} taskuri</div>
        {platData.length > 0 ? platData.map(function(d, i) {
          var pct = filteredShopTasks.length > 0 ? Math.round((d.count / filteredShopTasks.length) * 100) : 0;
          return <div key={d.label} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: "#475569", fontWeight: 600 }}>{d.label}</span>
              <span style={{ color: "#94A3B8" }}>{d.count} ({pct}%)</span>
            </div>
            <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%", background: typeColors[(i + 3) % typeColors.length], borderRadius: 3 }} />
            </div>
          </div>;
        }) : <div style={{ textAlign: "center", padding: 20, color: "#94A3B8", fontSize: 12 }}>Nu sunt date.</div>}
      </Card>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
      {/* Top performers */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 14 }}>Top Performeri - {selectedShop}</div>
        {performers.length > 0 ? performers.map(function(p, i) {
          var pct = maxPerf > 0 ? (p.done / maxPerf) * 100 : 0;
          return <div key={p.user} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? "#EAB308" : "#94A3B8", width: 20 }}>{i + 1}</span>
            <Av color={p.color} size={26} fs={10} userId={p.user}>{p.name[0]}</Av>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: "#1E293B" }}>{p.name}</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>{p.done}</span>
              </div>
              <div style={{ height: 5, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: i === 0 ? "#EAB308" : "#10B981", borderRadius: 3 }} />
              </div>
            </div>
          </div>;
        }) : <div style={{ textAlign: "center", padding: 20, color: "#94A3B8", fontSize: 12 }}>Nu sunt date.</div>}
      </Card>

      {/* Status + stats */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 14 }}>Status si Statistici</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {["To Do", "In Progress", "Review", "Done"].map(function(st) {
            return <div key={st} style={{ padding: "8px", background: (SC[st] || "#94A3B8") + "12", borderRadius: 6, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: SC[st] || "#94A3B8" }}>{statusBreakdown[st] || 0}</div>
              <div style={{ fontSize: 10, color: "#64748B" }}>{st}</div>
            </div>;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ padding: "10px", background: "#F0FDF4", borderRadius: 6, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#10B981" }}>{completionRate}%</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Rata completare</div>
          </div>
          <div style={{ padding: "10px", background: "#EFF6FF", borderRadius: 6, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#2563EB" }}>{performers.length}</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Oameni implicati</div>
          </div>
        </div>
      </Card>
    </div>

    {/* All shops comparison */}
    {shopSummary.length > 1 && <Card>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 14 }}>Comparatie toate magazinele</div>
      {shopSummary.map(function(s) {
        var maxS = shopSummary[0].total || 1;
        var donePct = s.total > 0 ? (s.done / s.total) * 100 : 0;
        return <div key={s.shop} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
            <span style={{ fontWeight: s.shop === selectedShop ? 700 : 500, color: s.shop === selectedShop ? GR : "#475569" }}>{s.shop}</span>
            <span style={{ color: "#94A3B8" }}>{s.done} done / {s.active} active</span>
          </div>
          <div style={{ display: "flex", height: 8, borderRadius: 3, overflow: "hidden", width: (s.total / maxS * 100) + "%", background: "#F1F5F9" }}>
            <div style={{ width: donePct + "%", background: "#10B981" }} />
            <div style={{ width: (100 - donePct) + "%", background: "#60A5FA", opacity: 0.5 }} />
          </div>
        </div>;
      })}
    </Card>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE BUILDER — Visual automation rule creator
// ═══════════════════════════════════════════════════════════════
function PipelinePage({ pipelineRules, setPipelineRules, team, assUsers, shops, taskTypes, departments, platforms, addLog }) {
  var [showForm, setShowForm] = useState(false);
  var [editId, setEditId] = useState(null);
  var [form, setForm] = useState({
    name: "", triggerAssignee: "", triggerTaskType: "", triggerDepartment: "", triggerShop: "", triggerStatus: "Done",
    targetAssignee: "", newTaskType: "", newDepartment: "", newPlatform: "", newPriority: "Normal",
    newTitlePrefix: "", newTitleSuffix: " - Next", newDescription: "", deadlineOffset: "1", active: true
  });

  var resetForm = function() {
    setForm({ name: "", triggerAssignee: "", triggerTaskType: "", triggerDepartment: "", triggerShop: "", triggerStatus: "Done", targetAssignee: "", newTaskType: "", newDepartment: "", newPlatform: "", newPriority: "Normal", newTitlePrefix: "", newTitleSuffix: " - Next", newDescription: "", deadlineOffset: "1", active: true });
    setEditId(null);
  };

  var save = function() {
    if (!form.name.trim() || !form.targetAssignee) return;
    if (editId) {
      setPipelineRules(function(p) { return p.map(function(r) { return r.id === editId ? Object.assign({}, form, { id: editId }) : r; }); });
      addLog("PIPELINE", "Regula editata: " + form.name);
    } else {
      setPipelineRules(function(p) { return p.concat([Object.assign({}, form, { id: gid() })]); });
      addLog("PIPELINE", "Regula noua: " + form.name);
    }
    setShowForm(false);
    resetForm();
  };

  var editRule = function(rule) {
    setForm(Object.assign({}, rule));
    setEditId(rule.id);
    setShowForm(true);
  };

  var deleteRule = function(id) {
    if (!window.confirm("Stergi regula?")) return;
    setPipelineRules(function(p) { return p.filter(function(r) { return r.id !== id; }); });
    addLog("PIPELINE", "Regula stearsa");
  };

  var toggleRule = function(id) {
    setPipelineRules(function(p) { return p.map(function(r) { return r.id === id ? Object.assign({}, r, { active: !r.active }) : r; }); });
  };

  var dupRule = function(rule) {
    setPipelineRules(function(p) { return p.concat([Object.assign({}, rule, { id: gid(), name: rule.name + " (copie)" })]); });
  };

  var set = function(k, v) { setForm(function(p) { var n = Object.assign({}, p); n[k] = v; return n; }); };

  return <div style={{ maxWidth: 900 }}>
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", marginBottom: 4 }}>Pipeline Builder</h2>
      <div style={{ fontSize: 12, color: "#64748B" }}>Creeaza reguli de automatizare: cand un task e finalizat, se creeaza automat alt task pentru urmatoarea persoana din pipeline. Fara cod, doar dropdown-uri.</div>
    </div>

    <button style={S.primBtn} onClick={function() { resetForm(); setShowForm(!showForm); }}><Ic d={Icons.plus} size={14} color="#fff" /> {showForm ? "Anuleaza" : "Regula noua"}</button>

    {showForm && <Card style={{ marginTop: 16, borderLeft: "3px solid #7C3AED" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#7C3AED", marginBottom: 14 }}>{editId ? "Editeaza regula" : "Regula noua"}</div>

      <label style={S.label}>Nume regula *</label>
      <input style={S.input} value={form.name} onChange={function(e) { set("name", e.target.value); }} placeholder="Ex: Dana Done -> Mara Poze Foto Produs" />

      {/* TRIGGER section */}
      <div style={{ marginTop: 16, padding: "14px 16px", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FCA5A530" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Cand se intampla (Trigger)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={S.label}>Status devine</label><select style={S.fSelF} value={form.triggerStatus} onChange={function(e) { set("triggerStatus", e.target.value); }}><option value="Done">Done</option><option value="Review">Review</option></select></div>
          <div><label style={S.label}>De la persoana (optional)</label><select style={S.fSelF} value={form.triggerAssignee} onChange={function(e) { set("triggerAssignee", e.target.value); }}><option value="">Oricine</option>{assUsers.map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name}</option>; })}</select></div>
          <div><label style={S.label}>Tip task (optional)</label><select style={S.fSelF} value={form.triggerTaskType} onChange={function(e) { set("triggerTaskType", e.target.value); }}><option value="">Orice tip</option>{(taskTypes || []).map(function(t) { return <option key={t} value={t}>{t}</option>; })}</select></div>
          <div><label style={S.label}>Magazin (optional)</label><select style={S.fSelF} value={form.triggerShop} onChange={function(e) { set("triggerShop", e.target.value); }}><option value="">Orice magazin</option>{(shops || []).map(function(s) { return <option key={s} value={s}>{s}</option>; })}</select></div>
          <div><label style={S.label}>Departament (optional)</label><select style={S.fSelF} value={form.triggerDepartment} onChange={function(e) { set("triggerDepartment", e.target.value); }}><option value="">Orice dept</option>{(departments || []).map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select></div>
        </div>
      </div>

      {/* Arrow */}
      <div style={{ textAlign: "center", padding: "10px 0", fontSize: 24, color: "#7C3AED" }}>⬇</div>

      {/* ACTION section */}
      <div style={{ padding: "14px 16px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #0C7E3E30" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0C7E3E", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Atunci creeaza task (Actiune)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={S.label}>Assignee nou *</label><select style={S.fSelF} value={form.targetAssignee} onChange={function(e) { set("targetAssignee", e.target.value); }}><option value="">-- Alege --</option>{assUsers.map(function(u) { return <option key={u} value={u}>{(team[u] || {}).name}</option>; })}</select></div>
          <div><label style={S.label}>Deadline (+zile)</label><input style={S.input} type="number" min="0" max="30" value={form.deadlineOffset} onChange={function(e) { set("deadlineOffset", e.target.value); }} /></div>
          <div><label style={S.label}>Tip task nou</label><select style={S.fSelF} value={form.newTaskType} onChange={function(e) { set("newTaskType", e.target.value); }}><option value="">Pastureaza original</option>{(taskTypes || []).map(function(t) { return <option key={t} value={t}>{t}</option>; })}</select></div>
          <div><label style={S.label}>Departament nou</label><select style={S.fSelF} value={form.newDepartment} onChange={function(e) { set("newDepartment", e.target.value); }}><option value="">Pastureaza original</option>{(departments || []).map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select></div>
          <div><label style={S.label}>Prioritate</label><select style={S.fSelF} value={form.newPriority} onChange={function(e) { set("newPriority", e.target.value); }}><option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option></select></div>
          <div><label style={S.label}>Platforma</label><select style={S.fSelF} value={form.newPlatform} onChange={function(e) { set("newPlatform", e.target.value); }}><option value="">Pastureaza original</option>{(platforms || []).map(function(p) { return <option key={p} value={p}>{p}</option>; })}</select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div><label style={S.label}>Prefix titlu</label><input style={S.input} value={form.newTitlePrefix} onChange={function(e) { set("newTitlePrefix", e.target.value); }} placeholder="Ex: [REVIEW] " /></div>
          <div><label style={S.label}>Sufix titlu</label><input style={S.input} value={form.newTitleSuffix} onChange={function(e) { set("newTitleSuffix", e.target.value); }} placeholder="Ex:  - Foto Produs" /></div>
        </div>
        <label style={S.label}>Descriere task nou (optional)</label>
        <textarea style={S.ta} value={form.newDescription} onChange={function(e) { set("newDescription", e.target.value); }} placeholder="Se adauga la taskul nou creat..." />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button style={S.primBtn} onClick={save}>{editId ? "Salveaza modificarile" : "Creeaza regula"}</button>
        <button style={S.cancelBtn} onClick={function() { setShowForm(false); resetForm(); }}>Anuleaza</button>
      </div>
    </Card>}

    {/* Existing rules */}
    <div style={{ marginTop: 20 }}>
      {pipelineRules.length === 0 && !showForm && <Card style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nicio regula de pipeline</div>
        <div style={{ fontSize: 12 }}>Creeaza prima regula pentru a automatiza flow-ul echipei.</div>
        <div style={{ fontSize: 12, marginTop: 12, color: "#64748B" }}>Exemplu: "Cand Dana termina un Ad Creation, creeaza automat un task Foto Produs pentru Mara Poze"</div>
      </Card>}

      {pipelineRules.map(function(rule) {
        var triggerUser = rule.triggerAssignee ? (team[rule.triggerAssignee] || {}).name : "Oricine";
        var targetUser = (team[rule.targetAssignee] || {}).name || "?";
        var triggerColor = rule.triggerAssignee ? (team[rule.triggerAssignee] || {}).color : "#94A3B8";
        var targetColor = (team[rule.targetAssignee] || {}).color || "#94A3B8";

        return <Card key={rule.id} style={{ marginBottom: 10, borderLeft: "3px solid " + (rule.active ? "#7C3AED" : "#CBD5E1"), opacity: rule.active ? 1 : 0.6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1E293B" }}>{rule.name}</span>
                {rule.active ? <Badge bg="#F0FDF4" color="#0C7E3E">Activa</Badge> : <Badge bg="#F1F5F9" color="#94A3B8">Inactiva</Badge>}
              </div>

              {/* Visual flow */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FCA5A530" }}>
                  <Av color={triggerColor} size={22} fs={9}>{triggerUser[0]}</Av>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>{triggerUser}</div>
                    <div style={{ fontSize: 9, color: "#64748B" }}>{rule.triggerTaskType || "Orice tip"} {rule.triggerShop ? "| " + rule.triggerShop : ""}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>Done</span>
                  <span style={{ fontSize: 16, color: "#7C3AED" }}>→</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#F0FDF4", borderRadius: 6, border: "1px solid #0C7E3E30" }}>
                  <Av color={targetColor} size={22} fs={9}>{targetUser[0]}</Av>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#0C7E3E" }}>{targetUser}</div>
                    <div style={{ fontSize: 9, color: "#64748B" }}>{rule.newTaskType || "Tip original"} | +{rule.deadlineOffset || 1}z</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              <button style={S.iconBtn} onClick={function() { toggleRule(rule.id); }} title={rule.active ? "Dezactiveaza" : "Activeaza"}><span style={{ fontSize: 16 }}>{rule.active ? "⏸" : "▶"}</span></button>
              <button style={S.iconBtn} onClick={function() { editRule(rule); }}><Ic d={Icons.edit} size={14} color="#64748B" /></button>
              <button style={S.iconBtn} onClick={function() { dupRule(rule); }}><Ic d={Icons.copy} size={14} color="#64748B" /></button>
              <button style={S.iconBtn} onClick={function() { deleteRule(rule.id); }}><Ic d={Icons.del} size={14} color="#EF4444" /></button>
            </div>
          </div>
        </Card>;
      })}
    </div>

    {pipelineRules.length > 0 && <div style={{ marginTop: 16, padding: "12px 16px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, color: "#64748B" }}>
      <span style={{ fontWeight: 700, color: "#475569" }}>Cum functioneaza:</span> Cand un task cu conditiile din Trigger trece in statusul specificat, platforma creeaza automat un task nou cu setarile din Actiune. Taskul nou mosteneste linkurile si magazinul taskului original.
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// CONFIG PAGE — Centralized settings for Task Types, Platforms,
// Departments, Shops. Drag to reorder, inline edit, add/remove.
// ═══════════════════════════════════════════════════════════════
function ConfigPage({ taskTypes, setTaskTypes, platforms, setPlatforms, departments, setDepartments, shops, setShops, addLog }) {
  var [activeTab, setActiveTab] = useState("taskTypes");
  var [newItem, setNewItem] = useState("");
  var [editIdx, setEditIdx] = useState(null);
  var [editVal, setEditVal] = useState("");
  var [dragIdx, setDragIdx] = useState(null);

  var tabs = [
    { id: "taskTypes", label: "Tip Task", icon: "", items: taskTypes, setItems: setTaskTypes, color: "#7C3AED" },
    { id: "platforms", label: "Platforme", icon: "", items: platforms, setItems: setPlatforms, color: "#2563EB" },
    { id: "departments", label: "Departamente", icon: "", items: departments, setItems: setDepartments, color: "#EA580C" },
    { id: "shops", label: "Magazine", icon: "", items: shops, setItems: setShops, color: "#0C7E3E" },
  ];

  var currentTab = tabs.find(function(t) { return t.id === activeTab; }) || tabs[0];
  var items = currentTab.items || [];
  var setItems = currentTab.setItems;
  var tabColor = currentTab.color;

  var addItem = function() {
    var val = newItem.trim();
    if (!val) return;
    if (activeTab === "departments") val = val.toUpperCase();
    if (items.includes(val)) { setNewItem(""); return; }
    setItems(function(p) { return p.concat([val]); });
    addLog("CONFIG", "Adaugat " + currentTab.label + ": " + val);
    setNewItem("");
  };

  var removeItem = function(idx) {
    var val = items[idx];
    if (!window.confirm("Stergi \"" + val + "\"?")) return;
    setItems(function(p) { return p.filter(function(_, i) { return i !== idx; }); });
    addLog("CONFIG", "Sters " + currentTab.label + ": " + val);
  };

  var startEdit = function(idx) {
    setEditIdx(idx);
    setEditVal(items[idx]);
  };

  var saveEdit = function() {
    if (editIdx === null) return;
    var val = editVal.trim();
    if (activeTab === "departments") val = val.toUpperCase();
    if (!val) return;
    var old = items[editIdx];
    setItems(function(p) { return p.map(function(x, i) { return i === editIdx ? val : x; }); });
    addLog("CONFIG", "Redenumit " + currentTab.label + ": " + old + " -> " + val);
    setEditIdx(null);
    setEditVal("");
  };

  var moveItem = function(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    setItems(function(p) {
      var arr = p.slice();
      var item = arr.splice(fromIdx, 1)[0];
      arr.splice(toIdx, 0, item);
      return arr;
    });
  };

  var resetToDefault = function() {
    if (!window.confirm("Resetezi " + currentTab.label + " la valorile default?")) return;
    var defaults = { taskTypes: ["Ad Creation", "Product Launch", "Creative", "Copy", "Landing Page", "Tracking/Pixel", "Raportare", "General"], platforms: ["Meta Ads", "TikTok Ads", "Google Ads", "Shopify", "Creativ", "UGC", "Foto Produs", "Altele"], departments: ["AD", "PRODUCT LAUNCH", "CREATIVE VIDEO", "UGC", "FOTO PRODUS", "COPY", "TRACKING"], shops: ["Grandia", "Bonhaus", "Casa Ofertelor", "Gento", "MagDeal", "Reduceri Bune", "Apreciat"] };
    setItems(defaults[activeTab] || []);
    addLog("CONFIG", "Reset " + currentTab.label + " la default");
  };

  return <div style={{ maxWidth: 900 }}>
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", marginBottom: 4 }}>Configurare Rapida</h2>
      <div style={{ fontSize: 12, color: "#64748B" }}>Editeaza tipurile de task, platformele, departamentele si magazinele. Modificarile se salveaza automat si se reflecta in toata platforma.</div>
    </div>

    {/* Tab switcher */}
    <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, background: "#F1F5F9", borderRadius: 10, flexWrap: "wrap" }}>
      {tabs.map(function(t) {
        var isActive = activeTab === t.id;
        return <button key={t.id} onClick={function() { setActiveTab(t.id); setEditIdx(null); setNewItem(""); }} style={{ padding: "10px 18px", borderRadius: 7, border: "none", background: isActive ? "#fff" : "transparent", color: isActive ? t.color : "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none", display: "flex", alignItems: "center", gap: 6 }}>
          <span>{t.icon}</span>
          {t.label}
          <span style={{ fontSize: 10, background: isActive ? t.color + "18" : "#E2E8F0", color: isActive ? t.color : "#94A3B8", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{(t.items || []).length}</span>
        </button>;
      })}
    </div>

    {/* Add new item */}
    <Card style={{ marginBottom: 16, borderLeft: "3px solid " + tabColor }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input style={Object.assign({}, S.input, { flex: 1, fontSize: 14 })} value={newItem} onChange={function(e) { setNewItem(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addItem(); }} placeholder={"Adauga " + currentTab.label.toLowerCase() + " nou..."} />
        <button style={Object.assign({}, S.primBtn, { padding: "10px 20px" })} onClick={addItem}>
          <Ic d={Icons.plus} size={14} color="#fff" /> Adauga
        </button>
        <button style={Object.assign({}, S.cancelBtn, { padding: "10px 14px", fontSize: 11 })} onClick={resetToDefault}>
          Reset Default
        </button>
      </div>
    </Card>

    {/* Items list */}
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{currentTab.icon} {currentTab.label} ({items.length})</div>
        <div style={{ fontSize: 11, color: "#94A3B8" }}>Trage ☰ pentru a reordona</div>
      </div>

      {items.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "#94A3B8", fontSize: 13 }}>Niciun element. Adauga unul mai sus.</div>}

      {items.map(function(item, idx) {
        var isEditing = editIdx === idx;
        var isDragTarget = dragIdx !== null && dragIdx !== idx;
        return <div key={idx}
          draggable={!isEditing}
          onDragStart={function(e) { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(idx)); }}
          onDragEnd={function() { setDragIdx(null); }}
          onDragOver={function(e) { e.preventDefault(); }}
          onDrop={function(e) { e.preventDefault(); var from = parseInt(e.dataTransfer.getData("text/plain")); moveItem(from, idx); setDragIdx(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 4, borderRadius: 8,
            background: dragIdx === idx ? tabColor + "10" : isEditing ? "#FFFBEB" : "#F8FAFC",
            border: "1px solid " + (isDragTarget ? tabColor + "40" : isEditing ? "#D97706" : "#E2E8F0"),
            opacity: dragIdx === idx ? 0.5 : 1, cursor: isEditing ? "default" : "grab", transition: "all 0.1s"
          }}>
          {/* Drag handle */}
          <span style={{ fontSize: 14, color: "#94A3B8", cursor: "grab", userSelect: "none", flexShrink: 0 }}>☰</span>

          {/* Index */}
          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, minWidth: 22, flexShrink: 0 }}>{idx + 1}.</span>

          {/* Color dot */}
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: tabColor, flexShrink: 0, opacity: 0.7 }} />

          {/* Content */}
          {isEditing ? <div style={{ flex: 1, display: "flex", gap: 6 }}>
            <input style={Object.assign({}, S.input, { flex: 1, fontSize: 13, padding: "6px 10px" })} value={editVal} onChange={function(e) { setEditVal(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditIdx(null); }} autoFocus />
            <button style={Object.assign({}, S.primBtn, { padding: "6px 12px", fontSize: 11 })} onClick={saveEdit}>OK</button>
            <button style={Object.assign({}, S.cancelBtn, { padding: "6px 12px", fontSize: 11 })} onClick={function() { setEditIdx(null); }}>X</button>
          </div> : <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{item}</div>}

          {/* Actions */}
          {!isEditing && <div style={{ display: "flex", gap: 4 }}>
            <button style={S.iconBtn} onClick={function() { startEdit(idx); }} title="Editeaza"><Ic d={Icons.edit} size={14} color="#64748B" /></button>
            <button style={S.iconBtn} onClick={function() { removeItem(idx); }} title="Sterge"><Ic d={Icons.del} size={14} color="#EF4444" /></button>
            {idx > 0 && <button style={S.iconBtn} onClick={function() { moveItem(idx, idx - 1); }} title="Muta sus"><span style={{ fontSize: 12, color: "#64748B" }}>▲</span></button>}
            {idx < items.length - 1 && <button style={S.iconBtn} onClick={function() { moveItem(idx, idx + 1); }} title="Muta jos"><span style={{ fontSize: 12, color: "#64748B" }}>▼</span></button>}
          </div>}
        </div>;
      })}
    </Card>

    {/* Info box */}
    <div style={{ marginTop: 16, padding: "12px 16px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #0C7E3E30", fontSize: 12, color: "#0C7E3E" }}>
      <span style={{ fontWeight: 700 }}>Unde se reflecta modificarile:</span> Formularul de creare task, filtrele din lista de taskuri, formularul de targets, recurring tasks, si toate raportarile din platforma.
    </div>
  </div>;
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
