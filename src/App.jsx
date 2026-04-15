import React, { useState, useEffect, useMemo, useRef } from 'react';

// ============================================================
// S.C.O.U.T AI - HeyAds Task Manager v7
// ============================================================

const COLORS = {
  primary: '#0C7E3E', primaryLight: '#e8f5ee', primaryDark: '#095e2e',
  sidebar: '#1a1a2e', sidebarHover: '#16213e', sidebarActive: '#0f3460',
  white: '#ffffff', bg: '#f4f6f9', text: '#2d3436', textLight: '#636e72',
  border: '#e0e0e0', danger: '#e74c3c', dangerLight: '#ffeaea',
  warning: '#f39c12', warningLight: '#fff8e1', info: '#3498db', infoLight: '#e3f2fd',
  success: '#0C7E3E', successLight: '#e8f5ee',
};

const AVATARS = [
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'eagle', emoji: '🦅', label: 'Eagle' },
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'fox', emoji: '🦊', label: 'Fox' },
  { id: 'bear', emoji: '🐻', label: 'Bear' },
];

const ROLES = { ADMIN: 'admin', PM: 'project_manager', MEMBER: 'member' };
const ROLE_LABELS = { [ROLES.ADMIN]: 'Admin', [ROLES.PM]: 'Project Manager', [ROLES.MEMBER]: 'Member' };
const TASK_STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const DEFAULT_STORES = ['Grandia', 'Bonhaus', 'Casa Ofertelor', 'Gento', 'MagDeal', 'Reduceri Bune', 'Apreciat'];

const DEFAULT_TEMPLATES = [
  { id: 'tpl_1', name: 'Product Launch', description: 'Standard product launch workflow', subtasks: ['Cercetare competitor', 'Creare listing produs', 'Fotografii produs', 'Creare ad copy (PAS + UGC + Storytime)', 'Setup Meta Ads campaign', 'Setup TikTok Ads campaign', 'QA landing page', 'Go Live + Monitor'] },
  { id: 'tpl_2', name: 'Store Setup', description: 'New Shopify store configuration', subtasks: ['Creare cont Shopify', 'Configurare tema + branding', 'Import produse', 'Setup tracking (Meta Pixel + CAPI + TikTok)', 'Configurare checkout + payment', 'Setup email flows', 'QA complet', 'Launch'] },
  { id: 'tpl_3', name: 'UGC Campaign', description: 'UGC content creation flow', subtasks: ['Brief creativ', 'Selectie creatori', 'Trimitere produse', 'Review continut primit', 'Editare video', 'Upload + catalogare', 'Lansare ads'] },
  { id: 'tpl_4', name: 'Creative Testing', description: 'Ad creative testing workflow', subtasks: ['Analiza competitori', 'Creare 5 variante copy', 'Creare 3 variante vizual', 'Setup A/B test', 'Monitor 48h', 'Analiza rezultate', 'Scale winner'] },
];

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
const formatDate = (d) => { if (!d) return ''; return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
const formatDateTime = (d) => { if (!d) return ''; return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const formatTime = (seconds) => { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };
const isOverdue = (task) => { if (task.status === 'Done' || !task.dueDate) return false; return new Date(task.dueDate) < new Date(new Date().toDateString()); };
const isSameDay = (d1, d2) => { const a = new Date(d1); const b = new Date(d2); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

const canAccess = (role, section) => {
  if (role === ROLES.ADMIN) return true;
  if (role === ROLES.PM) return !['manageUsers', 'activityLog'].includes(section);
  if (role === ROLES.MEMBER) return !['dashboard', 'workload', 'performance', 'activityLog', 'stores', 'products', 'manageUsers', 'targets', 'sheets'].includes(section);
  return false;
};

const getInitialData = () => {
  const saved = localStorage.getItem('scout_ai_v7');
  if (saved) { try { return JSON.parse(saved); } catch (e) { /* ignore */ } }
  return {
    users: [
      { id: 'u1', name: 'Stan', email: 'stan@heyads.ro', role: ROLES.ADMIN, password: 'admin123', avatar: 'wolf', createdAt: '2024-01-01' },
      { id: 'u2', name: 'Dana', email: 'dana@heyads.ro', role: ROLES.MEMBER, password: 'dana123', avatar: 'eagle', createdAt: '2024-01-15' },
      { id: 'u3', name: 'Carla', email: 'carla@heyads.ro', role: ROLES.MEMBER, password: 'carla123', avatar: 'fox', createdAt: '2024-02-01' },
      { id: 'u4', name: 'Mihai', email: 'mihai@heyads.ro', role: ROLES.PM, password: 'mihai123', avatar: 'lion', createdAt: '2024-02-15' },
    ],
    tasks: [
      { id: 't1', title: 'Setup Meta Ads - Grandia', description: 'Configurare campanii Meta pentru Grandia Q2', status: 'In Progress', priority: 'High', assignee: 'u2', store: 'Grandia', product: '', dueDate: '2026-04-18', createdAt: '2026-04-10', createdBy: 'u1', subtasks: [{ id: 'st1', text: 'Research audienta', done: true }, { id: 'st2', text: 'Creare ad sets', done: false }, { id: 'st3', text: 'Upload creatives', done: false }], comments: [{ id: 'c1', userId: 'u1', text: 'Prioritate maxima pe campania asta', timestamp: '2026-04-10T10:00:00' }], timeEntries: [{ date: '2026-04-14', seconds: 3600 }], links: ['https://business.facebook.com'], timerActive: false, timerStart: null, timerAccumulated: 0 },
      { id: 't2', title: 'Product Launch Bonhaus - Set Lavete', description: 'Lansare produs nou', status: 'To Do', priority: 'Urgent', assignee: 'u3', store: 'Bonhaus', product: '', dueDate: '2026-04-16', createdAt: '2026-04-12', createdBy: 'u1', subtasks: [{ id: 'st4', text: 'Fotografii produs', done: false }, { id: 'st5', text: 'Creare listing', done: false }], comments: [], timeEntries: [], links: [], timerActive: false, timerStart: null, timerAccumulated: 0 },
    ],
    templates: DEFAULT_TEMPLATES,
    stores: DEFAULT_STORES,
    products: [
      { id: 'p1', name: 'Set 4 Lavete Microfibra', store: 'Bonhaus', sku: 'BH-001' },
      { id: 'p2', name: 'Parfum Camera Lavanda', store: 'Grandia', sku: 'GR-015' },
      { id: 'p3', name: 'Aspirator Robot X500', store: 'Casa Ofertelor', sku: 'CO-042' },
    ],
    targets: [
      { id: 'tgt1', userId: 'u2', type: 'daily', metric: 'Product Launch', target: 25, daysPerWeek: 5 },
      { id: 'tgt2', userId: 'u3', type: 'daily', metric: 'Product Launch Teste', target: 25, daysPerWeek: 5 },
    ],
    sheets: [
      { id: 'sh1', name: 'KPI Ads - Master', url: 'https://docs.google.com/spreadsheets/d/example1', store: 'All', description: 'KPI principal ads' },
      { id: 'sh2', name: 'Stock Grandia', url: 'https://docs.google.com/spreadsheets/d/example2', store: 'Grandia', description: 'Stock si reorder' },
    ],
    activityLog: [
      { id: 'a1', userId: 'u1', action: 'Creat task', detail: 'Setup Meta Ads - Grandia', timestamp: '2026-04-10T10:00:00' },
    ],
    notifications: [],
  };
};

// --- MODAL COMPONENTS (proper React components with hooks) ---

function TaskFormModal({ data, task, templateId, currentUser, onSave, onClose }) {
  const template = templateId ? data.templates.find(t => t.id === templateId) : null;
  const [form, setForm] = useState(task ? {
    title: task.title, description: task.description, status: task.status, priority: task.priority,
    assignee: task.assignee, store: task.store, product: task.product, dueDate: task.dueDate,
    subtasks: task.subtasks, links: task.links.join('\n'),
  } : {
    title: template ? template.name : '', description: template ? template.description : '',
    status: 'To Do', priority: 'Medium', assignee: '', store: '', product: '', dueDate: '',
    subtasks: template ? template.subtasks.map(st => ({ id: generateId(), text: st, done: false })) : [],
    links: '',
  });
  const [newSubtask, setNewSubtask] = useState('');

  const handleSave = () => {
    if (!form.title.trim()) return;
    const links = form.links.split('\n').map(l => l.trim()).filter(l => l);
    onSave({ ...form, links });
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalContent} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>{task ? 'Editeaza Task' : template ? `Creeaza din: ${template.name}` : 'Task Nou'}</div>
        <div style={S.formGroup}><label style={S.label}>Titlu</label><input style={S.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
        <div style={S.formGroup}><label style={S.label}>Descriere</label><textarea style={S.textarea} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Status</label><select style={{ ...S.select, width: '100%' }} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>{TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Prioritate</label><select style={{ ...S.select, width: '100%' }} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>{TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        </div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Asignat</label><select style={{ ...S.select, width: '100%' }} value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))}><option value="">Neasignat</option>{data.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Due Date</label><input style={S.input} type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
        </div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Magazin</label><select style={{ ...S.select, width: '100%' }} value={form.store} onChange={e => setForm(p => ({ ...p, store: e.target.value }))}><option value="">Fara magazin</option>{data.stores.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Produs</label><select style={{ ...S.select, width: '100%' }} value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))}><option value="">Fara produs</option>{data.products.filter(p => !form.store || p.store === form.store).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Subtaskuri / Checklist</label>
          {form.subtasks.map((st, i) => (
            <div key={st.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <input type="checkbox" checked={st.done} onChange={() => setForm(p => ({ ...p, subtasks: p.subtasks.map((s, j) => j === i ? { ...s, done: !s.done } : s) }))} />
              <input style={{ ...S.input, flex: 1 }} value={st.text} onChange={e => setForm(p => ({ ...p, subtasks: p.subtasks.map((s, j) => j === i ? { ...s, text: e.target.value } : s) }))} />
              <button style={S.btn('ghost', 'sm')} onClick={() => setForm(p => ({ ...p, subtasks: p.subtasks.filter((_, j) => j !== i) }))}>x</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input style={{ ...S.input, flex: 1 }} placeholder="Subtask nou..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSubtask.trim()) { setForm(p => ({ ...p, subtasks: [...p.subtasks, { id: generateId(), text: newSubtask.trim(), done: false }] })); setNewSubtask(''); } }} />
            <button style={S.btn('primary', 'sm')} onClick={() => { if (newSubtask.trim()) { setForm(p => ({ ...p, subtasks: [...p.subtasks, { id: generateId(), text: newSubtask.trim(), done: false }] })); setNewSubtask(''); } }}>+</button>
          </div>
        </div>
        <div style={S.formGroup}><label style={S.label}>Linkuri (unul pe rand)</label><textarea style={S.textarea} value={form.links} onChange={e => setForm(p => ({ ...p, links: e.target.value }))} placeholder="https://example.com" /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button style={S.btn('ghost')} onClick={onClose}>Anuleaza</button>
          <button style={S.btn('primary')} onClick={handleSave}>{task ? 'Salveaza' : 'Creeaza'}</button>
        </div>
      </div>
    </div>
  );
}

function ViewTaskModal({ task, data, currentUser, onUpdateTask, onEdit, onClose }) {
  const [commentText, setCommentText] = useState('');
  if (!task) return null;
  const assignee = data.users.find(u => u.id === task.assignee);
  const product = data.products.find(p => p.id === task.product);
  const totalTime = task.timeEntries.reduce((s, e) => s + e.seconds, 0) + (task.timerActive ? task.timerAccumulated : 0);
  const getEmoji = (av) => AVATARS.find(a => a.id === av)?.emoji || '👤';

  const addComment = () => {
    if (!commentText.trim()) return;
    onUpdateTask(task.id, { comments: [...task.comments, { id: generateId(), userId: currentUser.id, text: commentText.trim(), timestamp: new Date().toISOString() }] });
    setCommentText('');
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalContent, maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={S.modalTitle}>{task.title}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <span style={S.badge(task.status === 'Done' ? 'green' : task.status === 'In Progress' ? 'blue' : 'default')}>{task.status}</span>
              <span style={S.badge(task.priority === 'Urgent' ? 'red' : task.priority === 'High' ? 'yellow' : 'default')}>{task.priority}</span>
              {isOverdue(task) && <span style={S.badge('red')}>OVERDUE</span>}
            </div>
          </div>
          <button style={S.btn('ghost', 'sm')} onClick={onClose}>x</button>
        </div>
        {task.description && <div style={{ marginBottom: 12, fontSize: 13, color: COLORS.textLight }}>{task.description}</div>}
        <div style={{ ...S.grid2, marginBottom: 12, fontSize: 13 }}>
          <div><strong>Asignat:</strong> {assignee ? `${getEmoji(assignee.avatar)} ${assignee.name}` : 'Neasignat'}</div>
          <div><strong>Due:</strong> {formatDate(task.dueDate) || '-'}</div>
          <div><strong>Magazin:</strong> {task.store || '-'}</div>
          <div><strong>Produs:</strong> {product ? product.name : '-'}</div>
          <div><strong>Timp total:</strong> {formatTime(totalTime)}</div>
          <div><strong>Creat:</strong> {formatDate(task.createdAt)}</div>
        </div>
        {task.links.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Linkuri:</div>{task.links.map((link, i) => <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: COLORS.info, marginBottom: 2 }}>{link}</a>)}</div>}
        {task.subtasks.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Subtaskuri ({task.subtasks.filter(s => s.done).length}/{task.subtasks.length})</div>
            {task.subtasks.map(st => (
              <div key={st.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0', fontSize: 13 }}>
                <input type="checkbox" checked={st.done} onChange={() => onUpdateTask(task.id, { subtasks: task.subtasks.map(s => s.id === st.id ? { ...s, done: !s.done } : s) })} />
                <span style={{ textDecoration: st.done ? 'line-through' : 'none', color: st.done ? COLORS.textLight : COLORS.text }}>{st.text}</span>
              </div>
            ))}
          </div>
        )}
        {task.timeEntries.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Timp pe zile:</div>{task.timeEntries.map((entry, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span>{formatDate(entry.date)}</span><span style={{ fontWeight: 600 }}>{formatTime(entry.seconds)}</span></div>)}</div>}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Comentarii ({task.comments.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
            {task.comments.map(comment => {
              const commenter = data.users.find(u => u.id === comment.userId);
              const isMine = comment.userId === currentUser.id;
              return (
                <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: 10, color: COLORS.textLight, marginBottom: 2 }}>{commenter ? `${getEmoji(commenter.avatar)} ${commenter.name}` : 'Unknown'} | {formatDateTime(comment.timestamp)}</div>
                  <div style={{ padding: '8px 12px', borderRadius: 12, marginBottom: 2, maxWidth: '80%', background: isMine ? COLORS.primary : COLORS.bg, color: isMine ? '#fff' : COLORS.text, fontSize: 13 }}>{comment.text}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ ...S.input, flex: 1 }} placeholder="Scrie un comentariu..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} />
            <button style={S.btn('primary')} onClick={addComment}>Trimite</button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button style={S.btn('ghost')} onClick={onEdit}>Editeaza</button>
          <button style={S.btn('primary')} onClick={onClose}>Inchide</button>
        </div>
      </div>
    </div>
  );
}

function UserFormModal({ user, onSave, onClose }) {
  const [form, setForm] = useState(user ? { name: user.name, email: user.email, role: user.role, password: user.password, avatar: user.avatar } : { name: '', email: '', role: ROLES.MEMBER, password: '', avatar: 'wolf' });
  const handleSave = () => { if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return; onSave(form); };
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalContent} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>{user ? 'Editeaza User' : 'User Nou'}</div>
        <div style={S.formGroup}><label style={S.label}>Nume</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div style={S.formGroup}><label style={S.label}>Email</label><input style={S.input} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Rol</label><select style={{ ...S.select, width: '100%' }} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Parola</label><input style={S.input} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Avatar</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>{AVATARS.map(a => <div key={a.id} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: COLORS.primaryLight, cursor: 'pointer', border: form.avatar === a.id ? `3px solid ${COLORS.primary}` : '3px solid transparent' }} onClick={() => setForm(p => ({ ...p, avatar: a.id }))} title={a.label}>{a.emoji}</div>)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button style={S.btn('ghost')} onClick={onClose}>Anuleaza</button>
          <button style={S.btn('primary')} onClick={handleSave}>{user ? 'Salveaza' : 'Creeaza'}</button>
        </div>
      </div>
    </div>
  );
}

function TargetFormModal({ target, users, onSave, onClose }) {
  const [form, setForm] = useState(target ? { ...target } : { userId: '', type: 'daily', metric: '', target: 25, daysPerWeek: 5 });
  const handleSave = () => { if (!form.userId || !form.metric.trim()) return; onSave(form); };
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalContent} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>{target ? 'Editeaza Target' : 'Target Nou'}</div>
        <div style={S.formGroup}><label style={S.label}>User</label><select style={{ ...S.select, width: '100%' }} value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))}><option value="">Selecteaza</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        <div style={S.formGroup}><label style={S.label}>Metric (ex: Product Launch)</label><input style={S.input} value={form.metric} onChange={e => setForm(p => ({ ...p, metric: e.target.value }))} /></div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Target zilnic</label><input style={S.input} type="number" value={form.target} onChange={e => setForm(p => ({ ...p, target: parseInt(e.target.value) || 0 }))} /></div>
          <div style={S.formGroup}><label style={S.label}>Zile/saptamana</label><input style={S.input} type="number" min="1" max="7" value={form.daysPerWeek} onChange={e => setForm(p => ({ ...p, daysPerWeek: parseInt(e.target.value) || 5 }))} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button style={S.btn('ghost')} onClick={onClose}>Anuleaza</button>
          <button style={S.btn('primary')} onClick={handleSave}>{target ? 'Salveaza' : 'Creeaza'}</button>
        </div>
      </div>
    </div>
  );
}

function TemplateFormModal({ template, onSave, onClose }) {
  const [form, setForm] = useState(template ? { name: template.name, description: template.description, subtasks: [...template.subtasks] } : { name: '', description: '', subtasks: [] });
  const [newSt, setNewSt] = useState('');
  const handleSave = () => { if (!form.name.trim()) return; onSave(form); };
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalContent} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>{template ? 'Editeaza Template' : 'Template Nou'}</div>
        <div style={S.formGroup}><label style={S.label}>Nume</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div style={S.formGroup}><label style={S.label}>Descriere</label><textarea style={S.textarea} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
        <div style={S.formGroup}>
          <label style={S.label}>Subtaskuri predefinite</label>
          {form.subtasks.map((st, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
              <span style={{ color: COLORS.textLight, fontSize: 12, width: 20 }}>{i + 1}.</span>
              <input style={{ ...S.input, flex: 1 }} value={st} onChange={e => setForm(p => ({ ...p, subtasks: p.subtasks.map((s, j) => j === i ? e.target.value : s) }))} />
              <button style={S.btn('ghost', 'sm')} onClick={() => setForm(p => ({ ...p, subtasks: p.subtasks.filter((_, j) => j !== i) }))}>x</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input style={{ ...S.input, flex: 1 }} placeholder="Adauga subtask..." value={newSt} onChange={e => setNewSt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSt.trim()) { setForm(p => ({ ...p, subtasks: [...p.subtasks, newSt.trim()] })); setNewSt(''); } }} />
            <button style={S.btn('primary', 'sm')} onClick={() => { if (newSt.trim()) { setForm(p => ({ ...p, subtasks: [...p.subtasks, newSt.trim()] })); setNewSt(''); } }}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button style={S.btn('ghost')} onClick={onClose}>Anuleaza</button>
          <button style={S.btn('primary')} onClick={handleSave}>{template ? 'Salveaza' : 'Creeaza'}</button>
        </div>
      </div>
    </div>
  );
}

function ProductFormModal({ product, stores, onSave, onClose }) {
  const [form, setForm] = useState(product ? { ...product } : { name: '', store: '', sku: '' });
  const handleSave = () => { if (!form.name.trim()) return; onSave(form); };
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalContent} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>{product ? 'Editeaza Produs' : 'Produs Nou'}</div>
        <div style={S.formGroup}><label style={S.label}>Nume</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Magazin</label><select style={{ ...S.select, width: '100%' }} value={form.store} onChange={e => setForm(p => ({ ...p, store: e.target.value }))}><option value="">Selecteaza</option>{stores.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>SKU</label><input style={S.input} value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button style={S.btn('ghost')} onClick={onClose}>Anuleaza</button>
          <button style={S.btn('primary')} onClick={handleSave}>{product ? 'Salveaza' : 'Creeaza'}</button>
        </div>
      </div>
    </div>
  );
}

function SheetFormModal({ sheet, stores, onSave, onClose }) {
  const [form, setForm] = useState(sheet ? { ...sheet } : { name: '', url: '', store: 'All', description: '' });
  const handleSave = () => { if (!form.name.trim() || !form.url.trim()) return; onSave(form); };
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalContent} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>{sheet ? 'Editeaza Sheet' : 'Sheet Nou'}</div>
        <div style={S.formGroup}><label style={S.label}>Nume</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div style={S.formGroup}><label style={S.label}>URL Google Sheet</label><input style={S.input} value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://docs.google.com/spreadsheets/d/..." /></div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Magazin</label><select style={{ ...S.select, width: '100%' }} value={form.store} onChange={e => setForm(p => ({ ...p, store: e.target.value }))}><option value="All">Toate</option>{stores.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Descriere</label><input style={S.input} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button style={S.btn('ghost')} onClick={onClose}>Anuleaza</button>
          <button style={S.btn('primary')} onClick={handleSave}>{sheet ? 'Salveaza' : 'Creeaza'}</button>
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---
const S = {
  app: { display: 'flex', height: '100vh', fontFamily: "'Segoe UI', -apple-system, sans-serif", background: COLORS.bg, color: COLORS.text, fontSize: 14 },
  sidebar: { width: 240, background: COLORS.sidebar, color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' },
  sidebarLogo: { padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 },
  sidebarNav: { flex: 1, padding: '8px 0' },
  sidebarItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', background: active ? COLORS.sidebarActive : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.7)', borderLeft: active ? `3px solid ${COLORS.primary}` : '3px solid transparent', transition: 'all 0.15s', fontSize: 13, fontWeight: active ? 600 : 400 }),
  sidebarSection: { padding: '12px 16px 4px', fontSize: 10, textTransform: 'uppercase', opacity: 0.4, letterSpacing: 1.5 },
  sidebarProfile: { padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 },
  topBarTitle: { fontSize: 18, fontWeight: 700 },
  content: { flex: 1, overflow: 'auto', padding: 24 },
  card: { background: COLORS.white, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 700 },
  btn: (variant = 'primary', size = 'md') => ({ padding: size === 'sm' ? '4px 10px' : size === 'lg' ? '10px 20px' : '6px 14px', borderRadius: 6, border: variant === 'ghost' ? `1px solid ${COLORS.border}` : 'none', cursor: 'pointer', fontWeight: 600, fontSize: size === 'sm' ? 12 : 13, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', background: variant === 'primary' ? COLORS.primary : variant === 'danger' ? COLORS.danger : variant === 'warning' ? COLORS.warning : variant === 'ghost' ? 'transparent' : COLORS.bg, color: variant === 'primary' || variant === 'danger' || variant === 'warning' ? '#fff' : COLORS.text }),
  input: { padding: '8px 12px', borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box' },
  select: { padding: '8px 12px', borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13, background: '#fff', outline: 'none', cursor: 'pointer' },
  badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: color === 'green' ? COLORS.successLight : color === 'red' ? COLORS.dangerLight : color === 'yellow' ? COLORS.warningLight : color === 'blue' ? COLORS.infoLight : COLORS.bg, color: color === 'green' ? COLORS.success : color === 'red' ? COLORS.danger : color === 'yellow' ? COLORS.warning : color === 'blue' ? COLORS.info : COLORS.textLight }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: `2px solid ${COLORS.border}`, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: COLORS.textLight },
  td: { padding: '10px 12px', borderBottom: `1px solid ${COLORS.border}` },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', borderRadius: 12, padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  formGroup: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: COLORS.textLight },
  textarea: { padding: '8px 12px', borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box', minHeight: 60, resize: 'vertical', fontFamily: 'inherit' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  flexCenter: { display: 'flex', alignItems: 'center', gap: 8 },
  statValue: { fontSize: 28, fontWeight: 800, color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 4, textTransform: 'uppercase' },
  avatarCircle: (size = 32) => ({ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, background: COLORS.primaryLight }),
  progressBar: { height: 8, borderRadius: 4, background: COLORS.bg, position: 'relative', overflow: 'hidden' },
  progressFill: (pct) => ({ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 4, background: pct >= 100 ? COLORS.primary : pct >= 70 ? COLORS.warning : COLORS.danger, transition: 'width 0.3s' }),
  tabBar: { display: 'flex', gap: 0, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 16 },
  tab: (active) => ({ padding: '8px 16px', cursor: 'pointer', fontWeight: active ? 700 : 400, color: active ? COLORS.primary : COLORS.textLight, borderBottom: active ? `2px solid ${COLORS.primary}` : '2px solid transparent', marginBottom: -2, fontSize: 13 }),
  kanbanCol: { flex: 1, minWidth: 240, background: COLORS.bg, borderRadius: 8, padding: 12 },
  kanbanCard: { background: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, border: `1px solid ${COLORS.border}`, cursor: 'grab', fontSize: 13 },
  loginContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.sidebar },
  loginBox: { background: '#fff', borderRadius: 12, padding: 40, width: 360, textAlign: 'center' },
  calDay: (isToday, hasTask) => ({ padding: 4, minHeight: 80, border: `1px solid ${COLORS.border}`, borderRadius: 4, background: isToday ? COLORS.primaryLight : '#fff', cursor: hasTask ? 'pointer' : 'default', fontSize: 11 }),
  notifBell: { position: 'relative', cursor: 'pointer', padding: 6 },
  notifBadge: { position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: '50%', background: COLORS.danger, color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [data, setData] = useState(getInitialData);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [taskFilter, setTaskFilter] = useState({ status: '', assignee: '', store: '', priority: '', search: '', dateFrom: '', dateTo: '', product: '' });
  const [taskTab, setTaskTab] = useState('active');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [userHistoryId, setUserHistoryId] = useState(null);
  const [userHistoryRange, setUserHistoryRange] = useState({ from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] });
  const timerRef = useRef(null);

  useEffect(() => { localStorage.setItem('scout_ai_v7', JSON.stringify(data)); }, [data]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setData(prev => {
        const has = prev.tasks.some(t => t.timerActive);
        if (!has) return prev;
        return { ...prev, tasks: prev.tasks.map(t => t.timerActive ? { ...t, timerAccumulated: t.timerAccumulated + 1 } : t) };
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const notifs = [];
    data.tasks.forEach(t => {
      if (isOverdue(t)) notifs.push({ id: `notif_overdue_${t.id}`, type: 'overdue', taskId: t.id, message: `Task "${t.title}" este overdue!`, timestamp: new Date().toISOString(), read: false });
    });
    setData(prev => ({ ...prev, notifications: [...prev.notifications.filter(n => !n.id.startsWith('notif_overdue_')), ...notifs] }));
  }, [data.tasks.length, currentUser]);

  const handleLogin = () => {
    const user = data.users.find(u => u.email === loginForm.email && u.password === loginForm.password);
    if (user) { setCurrentUser(user); setLoginError(''); setPage(user.role === ROLES.MEMBER ? 'tasks' : 'dashboard'); }
    else setLoginError('Email sau parola incorecta');
  };

  const handleLogout = () => { setCurrentUser(null); setLoginForm({ email: '', password: '' }); };

  const updateData = (key, updater) => setData(prev => ({ ...prev, [key]: typeof updater === 'function' ? updater(prev[key]) : updater }));

  const addLog = (action, detail) => {
    if (!currentUser) return;
    updateData('activityLog', logs => [{ id: generateId(), userId: currentUser.id, action, detail, timestamp: new Date().toISOString() }, ...logs]);
  };

  const addNotification = (type, message, taskId = null, targetUserId = null) => {
    updateData('notifications', ns => [{ id: generateId(), type, message, taskId, targetUserId, timestamp: new Date().toISOString(), read: false }, ...ns]);
  };

  const getEmoji = (av) => AVATARS.find(a => a.id === av)?.emoji || '👤';
  const getUserById = (id) => data.users.find(u => u.id === id);
  const userRole = currentUser?.role || ROLES.MEMBER;

  const updateTask = (taskId, updates) => updateData('tasks', tasks => tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));

  const createTask = (taskData) => {
    const newTask = { id: generateId(), title: taskData.title || '', description: taskData.description || '', status: taskData.status || 'To Do', priority: taskData.priority || 'Medium', assignee: taskData.assignee || '', store: taskData.store || '', product: taskData.product || '', dueDate: taskData.dueDate || '', createdAt: new Date().toISOString(), createdBy: currentUser.id, subtasks: taskData.subtasks || [], comments: [], timeEntries: [], links: taskData.links || [], timerActive: false, timerStart: null, timerAccumulated: 0 };
    updateData('tasks', tasks => [newTask, ...tasks]);
    addLog('Creat task', newTask.title);
    if (newTask.assignee && newTask.assignee !== currentUser.id) addNotification('assigned', `Ti s-a atribuit task: "${newTask.title}"`, newTask.id, newTask.assignee);
  };

  const deleteTask = (taskId) => {
    const task = data.tasks.find(t => t.id === taskId);
    updateData('tasks', tasks => tasks.filter(t => t.id !== taskId));
    if (task) addLog('Sters task', task.title);
  };

  const duplicateTask = (taskId) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    createTask({ ...task, title: `${task.title} (copy)`, subtasks: task.subtasks.map(st => ({ ...st, id: generateId(), done: false })) });
  };

  const toggleTimer = (taskId) => {
    updateData('tasks', tasks => tasks.map(t => {
      if (t.id !== taskId) return t;
      if (t.timerActive) {
        const today = new Date().toISOString().split('T')[0];
        const existing = t.timeEntries.find(e => e.date === today);
        const elapsed = t.timerAccumulated;
        const newEntries = existing ? t.timeEntries.map(e => e.date === today ? { ...e, seconds: e.seconds + elapsed } : e) : [...t.timeEntries, { date: today, seconds: elapsed }];
        return { ...t, timerActive: false, timerStart: null, timerAccumulated: 0, timeEntries: newEntries };
      }
      return { ...t, timerActive: true, timerStart: Date.now(), timerAccumulated: 0 };
    }));
  };

  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];
    let tasks = data.tasks;
    if (userRole === ROLES.MEMBER) tasks = tasks.filter(t => t.assignee === currentUser.id);
    if (taskTab === 'active') tasks = tasks.filter(t => t.status !== 'Done');
    if (taskTab === 'done') tasks = tasks.filter(t => t.status === 'Done');
    if (taskFilter.status) tasks = tasks.filter(t => t.status === taskFilter.status);
    if (taskFilter.assignee) tasks = tasks.filter(t => t.assignee === taskFilter.assignee);
    if (taskFilter.store) tasks = tasks.filter(t => t.store === taskFilter.store);
    if (taskFilter.priority) tasks = tasks.filter(t => t.priority === taskFilter.priority);
    if (taskFilter.product) tasks = tasks.filter(t => t.product === taskFilter.product);
    if (taskFilter.search) { const s = taskFilter.search.toLowerCase(); tasks = tasks.filter(t => t.title.toLowerCase().includes(s) || t.description.toLowerCase().includes(s)); }
    if (taskFilter.dateFrom) tasks = tasks.filter(t => t.dueDate >= taskFilter.dateFrom);
    if (taskFilter.dateTo) tasks = tasks.filter(t => t.dueDate <= taskFilter.dateTo);
    return tasks;
  }, [data.tasks, taskFilter, taskTab, userRole, currentUser]);

  const unreadNotifs = useMemo(() => {
    if (!currentUser) return [];
    return data.notifications.filter(n => !n.read && (!n.targetUserId || n.targetUserId === currentUser.id));
  }, [data.notifications, currentUser]);

  // LOGIN
  if (!currentUser) {
    return (
      <div style={S.loginContainer}>
        <div style={S.loginBox}>
          <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary, marginBottom: 4 }}>S.C.O.U.T AI</div>
          <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 28 }}>HeyAds Task Manager v7</div>
          {loginError && <div style={{ color: COLORS.danger, marginBottom: 12, fontSize: 13 }}>{loginError}</div>}
          <div style={S.formGroup}><input style={S.input} placeholder="Email" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
          <div style={S.formGroup}><input style={S.input} type="password" placeholder="Parola" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
          <button style={{ ...S.btn('primary', 'lg'), width: '100%', justifyContent: 'center' }} onClick={handleLogin}>Login</button>
        </div>
      </div>
    );
  }

  // NAV
  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', section: 'dashboard' },
    { id: 'tasks', icon: '📋', label: 'Taskuri', section: 'tasks' },
    { id: 'kanban', icon: '📌', label: 'Kanban Board', section: 'tasks' },
    { id: 'calendar', icon: '📅', label: 'Calendar', section: 'calendar' },
    { id: 'targets', icon: '🎯', label: 'Targets', section: 'targets' },
    { id: 'templates', icon: '📑', label: 'Templates', section: 'templates' },
    { id: 'products', icon: '📦', label: 'Produse', section: 'products' },
    { id: 'stores', icon: '🏪', label: 'Magazine', section: 'stores' },
    { id: 'sheets', icon: '📊', label: 'Sheets', section: 'sheets' },
    { id: 'workload', icon: '⚖️', label: 'Workload', section: 'workload' },
    { id: 'performance', icon: '🏆', label: 'Performance', section: 'performance' },
    { id: 'userHistory', icon: '🕐', label: 'Istoric Echipa', section: 'workload' },
    { id: 'activityLog', icon: '📜', label: 'Activity Log', section: 'activityLog' },
    { id: 'manageUsers', icon: '👥', label: 'Manage Users', section: 'manageUsers' },
  ];
  const accessibleNav = navItems.filter(item => canAccess(userRole, item.section));

  // PAGE RENDERERS
  const renderDashboard = () => {
    const total = data.tasks.length; const active = data.tasks.filter(t => t.status !== 'Done').length;
    const done = data.tasks.filter(t => t.status === 'Done').length; const overdue = data.tasks.filter(isOverdue).length;
    const totalTimeToday = data.tasks.reduce((sum, t) => { const e = t.timeEntries.find(e => isSameDay(e.date, new Date())); return sum + (e ? e.seconds : 0) + (t.timerActive ? t.timerAccumulated : 0); }, 0);
    const tasksByStore = {}; data.stores.forEach(s => { tasksByStore[s] = data.tasks.filter(t => t.store === s).length; });
    const tasksByStatus = {}; TASK_STATUSES.forEach(s => { tasksByStatus[s] = data.tasks.filter(t => t.status === s).length; });

    return (
      <div>
        <div style={S.grid4}>
          {[{ label: 'Total Taskuri', value: total, color: COLORS.primary }, { label: 'Active', value: active, color: COLORS.info }, { label: 'Finalizate', value: done, color: COLORS.success }, { label: 'Overdue', value: overdue, color: COLORS.danger }].map((s, i) => (
            <div key={i} style={S.card}><div style={{ ...S.statValue, color: s.color }}>{s.value}</div><div style={S.statLabel}>{s.label}</div></div>
          ))}
        </div>
        <div style={S.grid2}>
          <div style={S.card}><div style={S.cardTitle}>Per Status</div><div style={{ marginTop: 12 }}>{Object.entries(tasksByStatus).map(([status, count]) => (<div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><div style={{ width: 100, fontSize: 12 }}>{status}</div><div style={S.progressBar}><div style={S.progressFill(total ? (count / total) * 100 : 0)} /></div><div style={{ width: 30, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{count}</div></div>))}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Per Magazin</div><div style={{ marginTop: 12 }}>{Object.entries(tasksByStore).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([store, count]) => (<div key={store} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><div style={{ width: 120, fontSize: 12 }}>{store}</div><div style={S.progressBar}><div style={S.progressFill(total ? (count / total) * 100 : 0)} /></div><div style={{ width: 30, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{count}</div></div>))}</div></div>
        </div>
        <div style={S.card}><div style={S.cardTitle}>Timp lucrat azi</div><div style={{ ...S.statValue, fontSize: 24, marginTop: 8 }}>{formatTime(totalTimeToday)}</div></div>
        {overdue > 0 && <div style={{ ...S.card, borderLeft: `4px solid ${COLORS.danger}` }}><div style={{ ...S.cardTitle, color: COLORS.danger }}>Overdue ({overdue})</div><div style={{ marginTop: 8 }}>{data.tasks.filter(isOverdue).map(t => <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.border}` }}><span>{t.title}</span><span style={{ color: COLORS.danger, fontSize: 12 }}>Due: {formatDate(t.dueDate)} | {getUserById(t.assignee)?.name || '-'}</span></div>)}</div></div>}
      </div>
    );
  };

  const renderTasks = () => (
    <div>
      <div style={{ ...S.card, padding: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input style={{ ...S.input, width: 200 }} placeholder="Cauta task..." value={taskFilter.search} onChange={e => setTaskFilter(p => ({ ...p, search: e.target.value }))} />
          <select style={S.select} value={taskFilter.status} onChange={e => setTaskFilter(p => ({ ...p, status: e.target.value }))}><option value="">Toate statusurile</option>{TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
          {userRole !== ROLES.MEMBER && <select style={S.select} value={taskFilter.assignee} onChange={e => setTaskFilter(p => ({ ...p, assignee: e.target.value }))}><option value="">Toti userii</option>{data.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
          <select style={S.select} value={taskFilter.store} onChange={e => setTaskFilter(p => ({ ...p, store: e.target.value }))}><option value="">Toate magazinele</option>{data.stores.map(s => <option key={s} value={s}>{s}</option>)}</select>
          <select style={S.select} value={taskFilter.priority} onChange={e => setTaskFilter(p => ({ ...p, priority: e.target.value }))}><option value="">Toate prioritatile</option>{TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
          <select style={S.select} value={taskFilter.product} onChange={e => setTaskFilter(p => ({ ...p, product: e.target.value }))}><option value="">Toate produsele</option>{data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input style={{ ...S.input, width: 130 }} type="date" value={taskFilter.dateFrom} onChange={e => setTaskFilter(p => ({ ...p, dateFrom: e.target.value }))} />
          <input style={{ ...S.input, width: 130 }} type="date" value={taskFilter.dateTo} onChange={e => setTaskFilter(p => ({ ...p, dateTo: e.target.value }))} />
          {(userRole === ROLES.ADMIN || userRole === ROLES.PM) && <button style={S.btn('primary')} onClick={() => setModal({ type: 'createTask' })}>+ Task nou</button>}
        </div>
      </div>
      <div style={S.tabBar}>
        {['active', 'done', 'all'].map(tab => <div key={tab} style={S.tab(taskTab === tab)} onClick={() => setTaskTab(tab)}>{tab === 'active' ? 'Active' : tab === 'done' ? 'Finalizate' : 'Toate'}</div>)}
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Task</th><th style={S.th}>Status</th><th style={S.th}>Prioritate</th><th style={S.th}>Asignat</th><th style={S.th}>Magazin</th><th style={S.th}>Due</th><th style={S.th}>Subtaskuri</th><th style={S.th}>Timp</th><th style={S.th}>Actiuni</th></tr></thead>
          <tbody>
            {filteredTasks.map(task => {
              const assignee = getUserById(task.assignee);
              const totalTime = task.timeEntries.reduce((s, e) => s + e.seconds, 0) + (task.timerActive ? task.timerAccumulated : 0);
              const doneS = task.subtasks.filter(st => st.done).length;
              const sc = task.status === 'Done' ? 'green' : task.status === 'In Progress' ? 'blue' : task.status === 'In Review' ? 'yellow' : 'default';
              const pc = task.priority === 'Urgent' ? 'red' : task.priority === 'High' ? 'yellow' : task.priority === 'Medium' ? 'blue' : 'default';
              return (
                <tr key={task.id} style={{ background: isOverdue(task) ? COLORS.dangerLight : 'transparent' }}>
                  <td style={{ ...S.td, maxWidth: 200 }}><div style={{ fontWeight: 600, cursor: 'pointer', color: COLORS.primary }} onClick={() => { setSelectedTask(task.id); setModal({ type: 'viewTask' }); }}>{task.title}</div>{task.links.length > 0 && <span style={{ fontSize: 10, color: COLORS.textLight }}>🔗 {task.links.length}</span>}</td>
                  <td style={S.td}><span style={S.badge(sc)}>{task.status}</span></td>
                  <td style={S.td}><span style={S.badge(pc)}>{task.priority}</span></td>
                  <td style={S.td}>{assignee && <div style={S.flexCenter}><span style={S.avatarCircle(22)}>{getEmoji(assignee.avatar)}</span><span>{assignee.name}</span></div>}</td>
                  <td style={S.td}>{task.store || '-'}</td>
                  <td style={{ ...S.td, color: isOverdue(task) ? COLORS.danger : 'inherit', fontWeight: isOverdue(task) ? 700 : 400 }}>{formatDate(task.dueDate)}</td>
                  <td style={S.td}>{task.subtasks.length > 0 ? `${doneS}/${task.subtasks.length}` : '-'}</td>
                  <td style={S.td}><div style={S.flexCenter}><span>{formatTime(totalTime)}</span><button style={{ ...S.btn(task.timerActive ? 'danger' : 'primary', 'sm'), padding: '2px 8px' }} onClick={() => toggleTimer(task.id)}>{task.timerActive ? '⏹' : '▶'}</button></div></td>
                  <td style={S.td}><div style={{ display: 'flex', gap: 4 }}>
                    <button style={S.btn('ghost', 'sm')} onClick={() => { setSelectedTask(task.id); setModal({ type: 'editTask' }); }}>✏️</button>
                    <button style={S.btn('ghost', 'sm')} onClick={() => duplicateTask(task.id)}>📋</button>
                    {userRole === ROLES.ADMIN && <button style={S.btn('ghost', 'sm')} onClick={() => { if (window.confirm('Stergi?')) deleteTask(task.id); }}>🗑️</button>}
                  </div></td>
                </tr>
              );
            })}
            {filteredTasks.length === 0 && <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', color: COLORS.textLight, padding: 40 }}>Niciun task gasit</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderKanban = () => {
    let tasks = data.tasks;
    if (userRole === ROLES.MEMBER) tasks = tasks.filter(t => t.assignee === currentUser.id);
    const handleDrop = (status) => { if (!draggedTask) return; updateTask(draggedTask, { status }); addLog('Status schimbat', `${data.tasks.find(t => t.id === draggedTask)?.title} -> ${status}`); setDraggedTask(null); };
    return (
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', minHeight: 400 }}>
        {TASK_STATUSES.map(status => (
          <div key={status} style={S.kanbanCol} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(status)}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>{status}</span><span style={S.badge('default')}>{tasks.filter(t => t.status === status).length}</span></div>
            {tasks.filter(t => t.status === status).map(task => {
              const assignee = getUserById(task.assignee);
              return (
                <div key={task.id} style={{ ...S.kanbanCard, borderLeft: `3px solid ${task.priority === 'Urgent' ? COLORS.danger : task.priority === 'High' ? COLORS.warning : COLORS.primary}` }} draggable onDragStart={() => setDraggedTask(task.id)} onClick={() => { setSelectedTask(task.id); setModal({ type: 'viewTask' }); }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={S.badge(task.priority === 'Urgent' ? 'red' : task.priority === 'High' ? 'yellow' : 'default')}>{task.priority}</span>
                    {assignee && <span style={S.avatarCircle(20)}>{getEmoji(assignee.avatar)}</span>}
                  </div>
                  {task.store && <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>{task.store}</div>}
                  {isOverdue(task) && <div style={{ fontSize: 11, color: COLORS.danger, fontWeight: 600, marginTop: 4 }}>OVERDUE</div>}
                  {task.subtasks.length > 0 && <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>Subtaskuri: {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear(); const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month); const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    let tasks = data.tasks; if (userRole === ROLES.MEMBER) tasks = tasks.filter(t => t.assignee === currentUser.id);
    const days = []; for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null); for (let i = 1; i <= daysInMonth; i++) days.push(i);
    const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    return (
      <div>
        <div style={{ ...S.flexBetween, marginBottom: 16 }}>
          <button style={S.btn('ghost')} onClick={() => setCalendarDate(new Date(year, month - 1, 1))}>← Luna anterioara</button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{monthNames[month]} {year}</span>
          <button style={S.btn('ghost')} onClick={() => setCalendarDate(new Date(year, month + 1, 1))}>Luna urmatoare →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam', 'Dum'].map(d => <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, padding: 6, color: COLORS.textLight }}>{d}</div>)}
          {days.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasks.filter(t => t.dueDate === dateStr);
            const isToday2 = isSameDay(new Date(year, month, day), today);
            return (
              <div key={day} style={S.calDay(isToday2, dayTasks.length > 0)}>
                <div style={{ fontWeight: isToday2 ? 700 : 400, marginBottom: 2, fontSize: 12 }}>{day}</div>
                {dayTasks.slice(0, 3).map(t => <div key={t.id} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, marginBottom: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: t.status === 'Done' ? COLORS.successLight : isOverdue(t) ? COLORS.dangerLight : COLORS.infoLight, color: t.status === 'Done' ? COLORS.success : isOverdue(t) ? COLORS.danger : COLORS.info }} onClick={() => { setSelectedTask(t.id); setModal({ type: 'viewTask' }); }}>{t.title}</div>)}
                {dayTasks.length > 3 && <div style={{ fontSize: 10, color: COLORS.textLight }}>+{dayTasks.length - 3}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTargets = () => {
    const today = new Date(); const dayOfWeek = today.getDay();
    return (
      <div>
        <div style={S.flexBetween}><div style={S.cardTitle}>Targets Echipa</div>{(userRole === ROLES.ADMIN || userRole === ROLES.PM) && <button style={S.btn('primary')} onClick={() => setModal({ type: 'createTarget' })}>+ Target nou</button>}</div>
        <div style={{ marginTop: 16 }}>
          {data.targets.map(target => {
            const user = getUserById(target.userId); if (!user) return null;
            const todayStr = today.toISOString().split('T')[0];
            const tasksToday = data.tasks.filter(t => t.assignee === target.userId && (t.status === 'Done' || t.timeEntries.some(e => e.date === todayStr))).length;
            const pct = target.target > 0 ? (tasksToday / target.target) * 100 : 0;
            const remaining = Math.max(0, target.target - tasksToday);
            const weekStart = new Date(today); weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            const weeklyTarget = target.target * target.daysPerWeek;
            let weeklyDone = 0;
            for (let d = 0; d < 7; d++) { const cd = new Date(weekStart); cd.setDate(weekStart.getDate() + d); const ds = cd.toISOString().split('T')[0]; weeklyDone += data.tasks.filter(t => t.assignee === target.userId && t.timeEntries.some(e => e.date === ds)).length; }
            const weeklyPct = weeklyTarget > 0 ? (weeklyDone / weeklyTarget) * 100 : 0;
            return (
              <div key={target.id} style={{ ...S.card, borderLeft: `4px solid ${pct >= 100 ? COLORS.primary : pct >= 50 ? COLORS.warning : COLORS.danger}` }}>
                <div style={S.flexBetween}>
                  <div style={S.flexCenter}><span style={S.avatarCircle(28)}>{getEmoji(user.avatar)}</span><div><div style={{ fontWeight: 700 }}>{user.name}</div><div style={{ fontSize: 11, color: COLORS.textLight }}>{target.metric} | {target.target}/zi | {target.daysPerWeek} zile/sapt</div></div></div>
                  {(userRole === ROLES.ADMIN || userRole === ROLES.PM) && <div style={{ display: 'flex', gap: 4 }}><button style={S.btn('ghost', 'sm')} onClick={() => setModal({ type: 'editTarget', targetId: target.id })}>✏️</button><button style={S.btn('ghost', 'sm')} onClick={() => { if (window.confirm('Stergi?')) updateData('targets', ts => ts.filter(t => t.id !== target.id)); }}>🗑️</button></div>}
                </div>
                <div style={{ marginTop: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span>Azi: {tasksToday}/{target.target}</span><span style={{ fontWeight: 700, color: pct >= 100 ? COLORS.primary : COLORS.danger }}>{Math.round(pct)}%</span></div><div style={S.progressBar}><div style={S.progressFill(pct)} /></div></div>
                <div style={{ marginTop: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span>Saptamana: {weeklyDone}/{weeklyTarget}</span><span style={{ fontWeight: 700, color: weeklyPct >= 100 ? COLORS.primary : COLORS.danger }}>{Math.round(weeklyPct)}%</span></div><div style={S.progressBar}><div style={S.progressFill(weeklyPct)} /></div></div>
                {remaining > 0 && <div style={{ marginTop: 8, fontSize: 12, color: COLORS.danger, fontWeight: 600 }}>Ramas azi: {remaining}</div>}
              </div>
            );
          })}
          {data.targets.length === 0 && <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 40 }}>Niciun target setat</div>}
        </div>
      </div>
    );
  };

  const renderTemplates = () => (
    <div>
      <div style={S.flexBetween}><div style={S.cardTitle}>Task Templates</div>{(userRole === ROLES.ADMIN || userRole === ROLES.PM) && <button style={S.btn('primary')} onClick={() => setModal({ type: 'createTemplate' })}>+ Template nou</button>}</div>
      <div style={{ ...S.grid2, marginTop: 16 }}>
        {data.templates.map(tpl => (
          <div key={tpl.id} style={S.card}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{tpl.name}</div>
            <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 8 }}>{tpl.description}</div>
            <div style={{ fontSize: 12 }}>{tpl.subtasks.map((st, i) => <div key={i} style={{ padding: '2px 0' }}>☐ {st}</div>)}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <button style={S.btn('primary', 'sm')} onClick={() => setModal({ type: 'createTask', templateId: tpl.id })}>Creeaza task</button>
              {userRole === ROLES.ADMIN && <><button style={S.btn('ghost', 'sm')} onClick={() => setModal({ type: 'editTemplate', templateId: tpl.id })}>✏️</button><button style={S.btn('ghost', 'sm')} onClick={() => { if (window.confirm('Stergi?')) updateData('templates', ts => ts.filter(t => t.id !== tpl.id)); }}>🗑️</button></>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProducts = () => (
    <div>
      <div style={S.flexBetween}><div style={S.cardTitle}>Produse ({data.products.length})</div><button style={S.btn('primary')} onClick={() => setModal({ type: 'createProduct' })}>+ Adauga produs</button></div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Produs</th><th style={S.th}>Magazin</th><th style={S.th}>SKU</th><th style={S.th}>Taskuri</th><th style={S.th}>Timp</th><th style={S.th}>Actiuni</th></tr></thead>
          <tbody>{data.products.map(p => { const pt = data.tasks.filter(t => t.product === p.id); const tt = pt.reduce((s, t) => s + t.timeEntries.reduce((s2, e) => s2 + e.seconds, 0), 0); return (
            <tr key={p.id}><td style={{ ...S.td, fontWeight: 600 }}>{p.name}</td><td style={S.td}>{p.store}</td><td style={S.td}>{p.sku || '-'}</td><td style={S.td}><span style={S.badge(pt.length > 0 ? 'blue' : 'default')}>{pt.length}</span></td><td style={S.td}>{formatTime(tt)}</td><td style={S.td}><div style={{ display: 'flex', gap: 4 }}><button style={S.btn('ghost', 'sm')} onClick={() => setModal({ type: 'editProduct', productId: p.id })}>✏️</button><button style={S.btn('ghost', 'sm')} onClick={() => { if (window.confirm('Stergi?')) updateData('products', ps => ps.filter(pp => pp.id !== p.id)); }}>🗑️</button><button style={S.btn('ghost', 'sm')} onClick={() => { setTaskFilter(pf => ({ ...pf, product: p.id })); setPage('tasks'); }}>📋</button></div></td></tr>
          ); })}</tbody>
        </table>
      </div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.cardTitle}>Import produse (CSV)</div>
        <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4, marginBottom: 10 }}>Format: Nume,Magazin,SKU</div>
        <textarea id="csvImport" style={{ ...S.textarea, minHeight: 80 }} placeholder="Set Lavete,Bonhaus,BH-010" />
        <button style={{ ...S.btn('primary'), marginTop: 8 }} onClick={() => {
          const el = document.getElementById('csvImport'); const csv = el.value;
          const lines = csv.trim().split('\n').filter(l => l.trim());
          const newP = lines.map(l => { const [name, store, sku] = l.split(',').map(s => s.trim()); return { id: generateId(), name: name || 'Fara', store: store || '', sku: sku || '' }; });
          updateData('products', ps => [...ps, ...newP]); addLog('Import produse', `${newP.length} produse`); el.value = '';
        }}>Import</button>
      </div>
    </div>
  );

  const renderStores = () => (
    <div>
      <div style={S.flexBetween}><div style={S.cardTitle}>Magazine</div><button style={S.btn('primary')} onClick={() => { const n = prompt('Nume magazin:'); if (n?.trim()) { updateData('stores', ss => [...ss, n.trim()]); addLog('Magazin nou', n.trim()); } }}>+ Magazin nou</button></div>
      <div style={{ ...S.grid3, marginTop: 16 }}>
        {data.stores.map(store => { const st = data.tasks.filter(t => t.store === store); const a = st.filter(t => t.status !== 'Done').length; const d = st.filter(t => t.status === 'Done').length; const o = st.filter(isOverdue).length; const tt = st.reduce((s, t) => s + t.timeEntries.reduce((s2, e) => s2 + e.seconds, 0), 0); return (
          <div key={store} style={{ ...S.card, cursor: 'pointer' }} onClick={() => { setTaskFilter(p => ({ ...p, store })); setPage('tasks'); }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{store}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}><div>Active: <strong>{a}</strong></div><div>Done: <strong>{d}</strong></div><div style={{ color: o > 0 ? COLORS.danger : 'inherit' }}>Overdue: <strong>{o}</strong></div><div>Timp: <strong>{formatTime(tt)}</strong></div></div>
            <div style={{ marginTop: 8, ...S.progressBar }}><div style={S.progressFill(st.length > 0 ? (d / st.length) * 100 : 0)} /></div>
          </div>
        ); })}
      </div>
    </div>
  );

  const renderSheets = () => (
    <div>
      <div style={S.flexBetween}><div style={S.cardTitle}>Google Sheets</div><button style={S.btn('primary')} onClick={() => setModal({ type: 'createSheet' })}>+ Sheet nou</button></div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Nume</th><th style={S.th}>Magazin</th><th style={S.th}>Descriere</th><th style={S.th}>Actiuni</th></tr></thead>
          <tbody>{data.sheets.map(s => <tr key={s.id}><td style={{ ...S.td, fontWeight: 600 }}>{s.name}</td><td style={S.td}>{s.store}</td><td style={S.td}>{s.description}</td><td style={S.td}><div style={{ display: 'flex', gap: 4 }}><a href={s.url} target="_blank" rel="noopener noreferrer" style={S.btn('primary', 'sm')}>Deschide</a><button style={S.btn('ghost', 'sm')} onClick={() => setModal({ type: 'editSheet', sheetId: s.id })}>✏️</button><button style={S.btn('ghost', 'sm')} onClick={() => { if (window.confirm('Stergi?')) updateData('sheets', ss => ss.filter(x => x.id !== s.id)); }}>🗑️</button></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );

  const renderWorkload = () => (
    <div>
      <div style={S.cardTitle}>Workload Echipa</div>
      <div style={{ marginTop: 16 }}>
        {data.users.map(user => {
          const ut = data.tasks.filter(t => t.assignee === user.id); const at = ut.filter(t => t.status !== 'Done'); const od = ut.filter(isOverdue);
          const todayTime = ut.reduce((s, t) => { const e = t.timeEntries.find(e => isSameDay(e.date, new Date())); return s + (e ? e.seconds : 0) + (t.timerActive ? t.timerAccumulated : 0); }, 0);
          return (
            <div key={user.id} style={S.card}>
              <div style={S.flexBetween}>
                <div style={S.flexCenter}><span style={S.avatarCircle(32)}>{getEmoji(user.avatar)}</span><div><div style={{ fontWeight: 700 }}>{user.name}</div><div style={{ fontSize: 11, color: COLORS.textLight }}>{ROLE_LABELS[user.role]}</div></div></div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: COLORS.info }}>{at.length}</div><div style={{ fontSize: 10, color: COLORS.textLight }}>Active</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: COLORS.danger }}>{od.length}</div><div style={{ fontSize: 10, color: COLORS.textLight }}>Overdue</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: COLORS.primary }}>{formatTime(todayTime)}</div><div style={{ fontSize: 10, color: COLORS.textLight }}>Azi</div></div>
                </div>
                <button style={S.btn('ghost', 'sm')} onClick={() => { setUserHistoryId(user.id); setPage('userHistory'); }}>Istoric →</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderUserHistory = () => {
    const user = getUserById(userHistoryId); if (!user) return <div>Selecteaza un user</div>;
    const from = new Date(userHistoryRange.from); const to = new Date(userHistoryRange.to); to.setHours(23, 59, 59);
    const userTasks = data.tasks.filter(t => t.assignee === user.id);
    const days = []; const cur = new Date(from);
    while (cur <= to) {
      const ds = cur.toISOString().split('T')[0];
      const dayTasks = userTasks.filter(t => t.timeEntries.some(e => e.date === ds));
      const dayTime = userTasks.reduce((s, t) => { const e = t.timeEntries.find(e => e.date === ds); return s + (e ? e.seconds : 0); }, 0);
      days.push({ date: ds, tasks: dayTasks, totalTime: dayTime });
      cur.setDate(cur.getDate() + 1);
    }
    const totalTimeRange = days.reduce((s, d) => s + d.totalTime, 0);
    return (
      <div>
        <div style={S.flexBetween}>
          <div style={S.flexCenter}>
            <button style={S.btn('ghost', 'sm')} onClick={() => setPage('workload')}>← Inapoi</button>
            <span style={S.avatarCircle(32)}>{getEmoji(user.avatar)}</span>
            <div><div style={{ fontWeight: 700, fontSize: 16 }}>{user.name}</div><div style={{ fontSize: 11, color: COLORS.textLight }}>{ROLE_LABELS[user.role]}</div></div>
          </div>
          <div style={S.flexCenter}>
            <input style={{ ...S.input, width: 140 }} type="date" value={userHistoryRange.from} onChange={e => setUserHistoryRange(p => ({ ...p, from: e.target.value }))} />
            <span>-</span>
            <input style={{ ...S.input, width: 140 }} type="date" value={userHistoryRange.to} onChange={e => setUserHistoryRange(p => ({ ...p, to: e.target.value }))} />
            <button style={S.btn('ghost', 'sm')} onClick={() => { const t = new Date().toISOString().split('T')[0]; setUserHistoryRange({ from: t, to: t }); }}>Azi</button>
            <button style={S.btn('ghost', 'sm')} onClick={() => { const t = new Date(); t.setDate(t.getDate() - 1); const s = t.toISOString().split('T')[0]; setUserHistoryRange({ from: s, to: s }); }}>Ieri</button>
            <button style={S.btn('ghost', 'sm')} onClick={() => { const t = new Date(); const s = new Date(t); s.setDate(t.getDate() - 7); setUserHistoryRange({ from: s.toISOString().split('T')[0], to: t.toISOString().split('T')[0] }); }}>7 zile</button>
          </div>
        </div>
        <div style={{ ...S.grid4, marginTop: 16 }}>
          <div style={S.card}><div style={S.statValue}>{formatTime(totalTimeRange)}</div><div style={S.statLabel}>Timp total</div></div>
          <div style={S.card}><div style={S.statValue}>{userTasks.filter(t => t.status === 'Done').length}</div><div style={S.statLabel}>Finalizate</div></div>
          <div style={S.card}><div style={{ ...S.statValue, color: COLORS.danger }}>{userTasks.filter(isOverdue).length}</div><div style={S.statLabel}>Overdue</div></div>
          <div style={S.card}><div style={S.statValue}>{userTasks.filter(t => t.status !== 'Done').length}</div><div style={S.statLabel}>Active</div></div>
        </div>
        {days.map(day => (
          <div key={day.date} style={{ ...S.card, borderLeft: day.totalTime > 0 ? `4px solid ${COLORS.primary}` : `4px solid ${COLORS.border}` }}>
            <div style={S.flexBetween}><div style={{ fontWeight: 700 }}>{formatDate(day.date)}</div><div style={{ fontWeight: 700, color: COLORS.primary }}>{formatTime(day.totalTime)}</div></div>
            {day.tasks.length > 0 ? <div style={{ marginTop: 8, fontSize: 12 }}>{day.tasks.map(t => { const e = t.timeEntries.find(e => e.date === day.date); return <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${COLORS.border}` }}><div><span style={{ fontWeight: 600 }}>{t.title}</span><span style={{ ...S.badge(t.status === 'Done' ? 'green' : 'blue'), marginLeft: 6 }}>{t.status}</span>{t.store && <span style={{ marginLeft: 6, color: COLORS.textLight }}>| {t.store}</span>}</div><span style={{ fontWeight: 600 }}>{e ? formatTime(e.seconds) : '-'}</span></div>; })}</div> : <div style={{ marginTop: 8, fontSize: 12, color: COLORS.textLight }}>Nicio activitate</div>}
          </div>
        ))}
      </div>
    );
  };

  const renderPerformance = () => {
    const rankings = data.users.map(user => {
      const ut = data.tasks.filter(t => t.assignee === user.id); const completed = ut.filter(t => t.status === 'Done').length; const overdue = ut.filter(isOverdue).length;
      const totalTime = ut.reduce((s, t) => s + t.timeEntries.reduce((s2, e) => s2 + e.seconds, 0), 0);
      const score = completed * 10 - overdue * 5;
      return { user, completed, overdue, totalTime, score, active: ut.filter(t => t.status !== 'Done').length };
    }).sort((a, b) => b.score - a.score);
    return (
      <div>
        <div style={S.cardTitle}>Clasament Performance</div>
        <div style={{ marginTop: 16 }}>{rankings.map((r, i) => (
          <div key={r.user.id} style={{ ...S.card, borderLeft: `4px solid ${i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : COLORS.border}` }}>
            <div style={S.flexBetween}>
              <div style={S.flexCenter}><div style={{ fontSize: 20, fontWeight: 800, color: COLORS.textLight, width: 30 }}>#{i + 1}</div><span style={S.avatarCircle(32)}>{getEmoji(r.user.avatar)}</span><div><div style={{ fontWeight: 700 }}>{r.user.name}</div><div style={{ fontSize: 11, color: COLORS.textLight }}>{ROLE_LABELS[r.user.role]}</div></div></div>
              <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary }}>{Math.round(r.score)} pts</div>
            </div>
            <div style={{ ...S.grid4, marginTop: 10, fontSize: 12 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: COLORS.success }}>{r.completed}</div><div style={{ color: COLORS.textLight }}>Completate</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: COLORS.info }}>{r.active}</div><div style={{ color: COLORS.textLight }}>Active</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: COLORS.danger }}>{r.overdue}</div><div style={{ color: COLORS.textLight }}>Overdue</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700 }}>{formatTime(r.totalTime)}</div><div style={{ color: COLORS.textLight }}>Timp</div></div>
            </div>
          </div>
        ))}</div>
      </div>
    );
  };

  const renderActivityLog = () => (
    <div>
      <div style={S.cardTitle}>Activity Log</div>
      <div style={{ ...S.card, marginTop: 16 }}>
        {data.activityLog.slice(0, 100).map(log => { const user = getUserById(log.userId); return (
          <div key={log.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
            <span style={S.avatarCircle(24)}>{user ? getEmoji(user.avatar) : '👤'}</span>
            <div style={{ flex: 1 }}><span style={{ fontWeight: 600 }}>{user?.name || '?'}</span><span style={{ color: COLORS.textLight }}> {log.action}: </span><span>{log.detail}</span></div>
            <span style={{ fontSize: 11, color: COLORS.textLight, whiteSpace: 'nowrap' }}>{formatDateTime(log.timestamp)}</span>
          </div>
        ); })}
      </div>
    </div>
  );

  const renderManageUsers = () => (
    <div>
      <div style={S.flexBetween}><div style={S.cardTitle}>Manage Users</div><button style={S.btn('primary')} onClick={() => setModal({ type: 'createUser' })}>+ User nou</button></div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}></th><th style={S.th}>Nume</th><th style={S.th}>Email</th><th style={S.th}>Rol</th><th style={S.th}>Parola</th><th style={S.th}>Actiuni</th></tr></thead>
          <tbody>{data.users.map(u => (
            <tr key={u.id}><td style={S.td}><span style={S.avatarCircle(28)}>{getEmoji(u.avatar)}</span></td><td style={{ ...S.td, fontWeight: 600 }}>{u.name}</td><td style={S.td}>{u.email}</td><td style={S.td}><span style={S.badge(u.role === ROLES.ADMIN ? 'green' : u.role === ROLES.PM ? 'blue' : 'default')}>{ROLE_LABELS[u.role]}</span></td><td style={S.td}><span style={{ fontSize: 12, fontFamily: 'monospace', background: COLORS.bg, padding: '2px 6px', borderRadius: 4 }}>{u.password}</span></td><td style={S.td}><div style={{ display: 'flex', gap: 4 }}><button style={S.btn('primary', 'sm')} onClick={() => setModal({ type: 'editUser', userId: u.id })}>Editeaza</button>{u.id !== currentUser.id && <button style={S.btn('ghost', 'sm')} onClick={() => { if (window.confirm(`Stergi ${u.name}?`)) { updateData('users', us => us.filter(x => x.id !== u.id)); addLog('Sters user', u.name); } }}>🗑️</button>}</div></td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );

  const renderProfile = () => {
    const ut = data.tasks.filter(t => t.assignee === currentUser.id);
    return (
      <div>
        <div style={S.card}>
          <div style={S.flexCenter}><span style={S.avatarCircle(48)}>{getEmoji(currentUser.avatar)}</span><div><div style={{ fontWeight: 700, fontSize: 18 }}>{currentUser.name}</div><div style={{ color: COLORS.textLight }}>{currentUser.email} | {ROLE_LABELS[currentUser.role]}</div></div></div>
          <div style={{ marginTop: 16 }}><div style={S.label}>Schimba avatar</div><div style={{ display: 'flex', gap: 10, marginTop: 4 }}>{AVATARS.map(a => <div key={a.id} style={{ ...S.avatarCircle(40), cursor: 'pointer', border: currentUser.avatar === a.id ? `3px solid ${COLORS.primary}` : '3px solid transparent' }} onClick={() => { updateData('users', us => us.map(u => u.id === currentUser.id ? { ...u, avatar: a.id } : u)); setCurrentUser(p => ({ ...p, avatar: a.id })); }}>{a.emoji}</div>)}</div></div>
        </div>
        <div style={S.grid3}>
          <div style={S.card}><div style={S.statValue}>{ut.filter(t => t.status === 'Done').length}</div><div style={S.statLabel}>Completate</div></div>
          <div style={S.card}><div style={{ ...S.statValue, color: COLORS.info }}>{ut.filter(t => t.status !== 'Done').length}</div><div style={S.statLabel}>Active</div></div>
          <div style={S.card}><div style={{ ...S.statValue, color: COLORS.danger }}>{ut.filter(isOverdue).length}</div><div style={S.statLabel}>Overdue</div></div>
        </div>
      </div>
    );
  };

  // MODAL RENDERING
  const renderModal = () => {
    if (!modal) return null;
    const closeModal = () => { setModal(null); setSelectedTask(null); };

    if (modal.type === 'createTask' || modal.type === 'editTask') {
      const task = modal.type === 'editTask' ? data.tasks.find(t => t.id === selectedTask) : null;
      return <TaskFormModal key={modal.type + (selectedTask || '') + (modal.templateId || '')} data={data} task={task} templateId={modal.templateId} currentUser={currentUser} onClose={closeModal} onSave={(formData) => {
        if (task) { updateTask(selectedTask, formData); addLog('Editat task', formData.title); }
        else createTask(formData);
        closeModal();
      }} />;
    }
    if (modal.type === 'viewTask') {
      const task = data.tasks.find(t => t.id === selectedTask);
      return <ViewTaskModal key={'view' + selectedTask} task={task} data={data} currentUser={currentUser} onUpdateTask={updateTask} onEdit={() => setModal({ type: 'editTask' })} onClose={closeModal} />;
    }
    if (modal.type === 'createUser' || modal.type === 'editUser') {
      const user = modal.type === 'editUser' ? data.users.find(u => u.id === modal.userId) : null;
      return <UserFormModal key={modal.type + (modal.userId || '')} user={user} onClose={closeModal} onSave={(formData) => {
        if (user) { updateData('users', us => us.map(u => u.id === modal.userId ? { ...u, ...formData } : u)); if (modal.userId === currentUser.id) setCurrentUser(p => ({ ...p, ...formData })); addLog('Editat user', formData.name); }
        else { updateData('users', us => [...us, { id: generateId(), ...formData, createdAt: new Date().toISOString() }]); addLog('Creat user', formData.name); }
        closeModal();
      }} />;
    }
    if (modal.type === 'createTarget' || modal.type === 'editTarget') {
      const target = modal.type === 'editTarget' ? data.targets.find(t => t.id === modal.targetId) : null;
      return <TargetFormModal key={modal.type + (modal.targetId || '')} target={target} users={data.users} onClose={closeModal} onSave={(formData) => {
        if (target) updateData('targets', ts => ts.map(t => t.id === modal.targetId ? { ...t, ...formData } : t));
        else updateData('targets', ts => [...ts, { id: generateId(), ...formData }]);
        closeModal();
      }} />;
    }
    if (modal.type === 'createTemplate' || modal.type === 'editTemplate') {
      const tpl = modal.type === 'editTemplate' ? data.templates.find(t => t.id === modal.templateId) : null;
      return <TemplateFormModal key={modal.type + (modal.templateId || '')} template={tpl} onClose={closeModal} onSave={(formData) => {
        if (tpl) updateData('templates', ts => ts.map(t => t.id === modal.templateId ? { ...t, ...formData } : t));
        else updateData('templates', ts => [...ts, { id: generateId(), ...formData }]);
        closeModal();
      }} />;
    }
    if (modal.type === 'createProduct' || modal.type === 'editProduct') {
      const product = modal.type === 'editProduct' ? data.products.find(p => p.id === modal.productId) : null;
      return <ProductFormModal key={modal.type + (modal.productId || '')} product={product} stores={data.stores} onClose={closeModal} onSave={(formData) => {
        if (product) updateData('products', ps => ps.map(p => p.id === modal.productId ? { ...p, ...formData } : p));
        else updateData('products', ps => [...ps, { id: generateId(), ...formData }]);
        closeModal();
      }} />;
    }
    if (modal.type === 'createSheet' || modal.type === 'editSheet') {
      const sheet = modal.type === 'editSheet' ? data.sheets.find(s => s.id === modal.sheetId) : null;
      return <SheetFormModal key={modal.type + (modal.sheetId || '')} sheet={sheet} stores={data.stores} onClose={closeModal} onSave={(formData) => {
        if (sheet) updateData('sheets', ss => ss.map(s => s.id === modal.sheetId ? { ...s, ...formData } : s));
        else updateData('sheets', ss => [...ss, { id: generateId(), ...formData }]);
        closeModal();
      }} />;
    }
    return null;
  };

  const renderNotifPanel = () => {
    if (!showNotifPanel) return null;
    const myNotifs = data.notifications.filter(n => !n.targetUserId || n.targetUserId === currentUser.id).slice(0, 20);
    return (
      <div style={{ position: 'absolute', top: 50, right: 24, width: 360, background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 100, padding: 16, maxHeight: 400, overflowY: 'auto' }}>
        <div style={S.flexBetween}><div style={{ fontWeight: 700 }}>Notificari</div><button style={S.btn('ghost', 'sm')} onClick={() => updateData('notifications', ns => ns.map(n => ({ ...n, read: true })))}>Citite</button></div>
        <div style={{ marginTop: 10 }}>{myNotifs.map(n => (
          <div key={n.id} style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 6, cursor: 'pointer', background: n.read ? COLORS.bg : COLORS.primaryLight, border: `1px solid ${n.read ? COLORS.border : COLORS.primary}`, display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => { updateData('notifications', ns => ns.map(nn => nn.id === n.id ? { ...nn, read: true } : nn)); if (n.taskId) { setSelectedTask(n.taskId); setModal({ type: 'viewTask' }); setShowNotifPanel(false); } }}>
            <span style={{ fontSize: 16 }}>{n.type === 'overdue' ? '⚠️' : n.type === 'assigned' ? '📋' : '🔔'}</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13 }}>{n.message}</div><div style={{ fontSize: 10, color: COLORS.textLight }}>{formatDateTime(n.timestamp)}</div></div>
          </div>
        ))}{myNotifs.length === 0 && <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 20 }}>Nicio notificare</div>}</div>
      </div>
    );
  };

  const pageLabels = { dashboard: 'Dashboard', tasks: 'Taskuri', kanban: 'Kanban Board', calendar: 'Calendar', targets: 'Targets', templates: 'Templates', products: 'Produse', stores: 'Magazine', sheets: 'Google Sheets', workload: 'Workload', userHistory: 'Istoric User', performance: 'Performance', activityLog: 'Activity Log', manageUsers: 'Manage Users', profile: 'Profilul Meu' };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return renderDashboard();
      case 'tasks': return renderTasks();
      case 'kanban': return renderKanban();
      case 'calendar': return renderCalendar();
      case 'targets': return renderTargets();
      case 'templates': return renderTemplates();
      case 'products': return renderProducts();
      case 'stores': return renderStores();
      case 'sheets': return renderSheets();
      case 'workload': return renderWorkload();
      case 'userHistory': return renderUserHistory();
      case 'performance': return renderPerformance();
      case 'activityLog': return renderActivityLog();
      case 'manageUsers': return renderManageUsers();
      case 'profile': return renderProfile();
      default: return renderDashboard();
    }
  };

  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>S</div>
          <div><div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>S.C.O.U.T AI</div><div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>HeyAds v7</div></div>
        </div>
        <div style={S.sidebarNav}>
          <div style={S.sidebarSection}>Principal</div>
          {accessibleNav.slice(0, 4).map(item => <div key={item.id} style={S.sidebarItem(page === item.id)} onClick={() => setPage(item.id)}><span>{item.icon}</span><span>{item.label}</span></div>)}
          {accessibleNav.length > 4 && <div style={S.sidebarSection}>Management</div>}
          {accessibleNav.slice(4, 9).map(item => <div key={item.id} style={S.sidebarItem(page === item.id)} onClick={() => setPage(item.id)}><span>{item.icon}</span><span>{item.label}</span></div>)}
          {accessibleNav.length > 9 && <div style={S.sidebarSection}>Echipa</div>}
          {accessibleNav.slice(9).map(item => <div key={item.id} style={S.sidebarItem(page === item.id)} onClick={() => setPage(item.id)}><span>{item.icon}</span><span>{item.label}</span></div>)}
        </div>
        <div style={S.sidebarProfile} onClick={() => setPage('profile')}>
          <span style={S.avatarCircle(28)}>{getEmoji(currentUser.avatar)}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</div><div style={{ fontSize: 10, opacity: 0.6 }}>{ROLE_LABELS[currentUser.role]}</div></div>
          <span style={{ cursor: 'pointer', opacity: 0.6, fontSize: 12 }} onClick={(e) => { e.stopPropagation(); handleLogout(); }} title="Logout">⏻</span>
        </div>
      </div>
      <div style={S.main}>
        <div style={S.topBar}>
          <div style={S.topBarTitle}>{pageLabels[page] || 'S.C.O.U.T AI'}</div>
          <div style={{ ...S.flexCenter, position: 'relative' }}>
            <div style={S.notifBell} onClick={() => setShowNotifPanel(!showNotifPanel)}>
              <span style={{ fontSize: 18 }}>🔔</span>
              {unreadNotifs.length > 0 && <span style={S.notifBadge}>{unreadNotifs.length}</span>}
            </div>
            {renderNotifPanel()}
          </div>
        </div>
        <div style={S.content}>{renderPage()}</div>
      </div>
      {renderModal()}
    </div>
  );
}
