'use strict';
const API = '';
let currentLeads = [];
let filteredLeads = [];
let selectedIndices = new Set();
let searchCount = 0;
let emailsSentCount = 0;
let searchHistory = [];
try { searchHistory = JSON.parse(localStorage.getItem('oc_history') || '[]'); } catch(e) { searchHistory = []; }
let sortState = { col: null, dir: 1 };
let systemReady = false;

// ─── INIT ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  checkStatus();
  // Show input clear button when typing
  const inp = document.getElementById('query-input');
  inp.addEventListener('input', () => {
    document.getElementById('clear-input-btn').style.display = inp.value ? 'block' : 'none';
  });
  inp.addEventListener('keydown', e => { 
    if (e.key === 'Enter') {
      e.preventDefault();
      handleResearch(); 
    }
  });
  // char count for email textarea
  document.getElementById('email-body').addEventListener('input', function () {
    document.getElementById('char-count').textContent = this.value.length + ' chars';
  });
  loadSavedStats();
});

// ─── STATUS CHECK ───────────────────────────────────────
async function checkStatus() {
  try {
    const res = await fetch(`${API}/api/status`);
    const data = await res.json();
    applyStatus(data);
  } catch {
    applyStatus({ groq: false, tavily: false, gmail: false });
  }
}

function applyStatus(s) {
  setPill('pill-groq',   s.groq,   'Groq AI');
  setPill('pill-tavily', s.tavily, 'Tavily Search');
  setPill('pill-gmail',  s.gmail,  'Gmail');

  const ready = s.groq && s.tavily;
  systemReady = ready;
  const badge = document.getElementById('system-badge');
  const badgeText = document.getElementById('system-badge-text');
  badge.className = 'system-badge ' + (ready ? 'ready' : s.groq || s.tavily ? 'partial' : 'offline');
  badgeText.textContent = ready ? 'System Ready' : !s.groq ? 'Groq key missing' : 'Tavily key missing';

  if (!ready) {
    document.getElementById('setup-banner').style.display = 'block';
  }
}

function setPill(id, ok, label) {
  const el = document.getElementById(id);
  el.className = 'status-pill ' + (ok ? 'ok' : 'err');
  el.querySelector('.pill-dot').nextSibling.textContent = label;
}

async function recheckStatus() {
  document.getElementById('system-badge-text').textContent = 'Checking...';
  await checkStatus();
  showToast('Status refreshed', 'info');
}

// ─── SIDEBAR ────────────────────────────────────────────
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const main = document.querySelector('.main');
  const isMobile = window.innerWidth <= 900;
  if (isMobile) {
    sb.classList.toggle('visible');
  } else {
    sb.classList.toggle('hidden');
    main.classList.toggle('expanded');
  }
}

// ─── QUICK SEARCH ────────────────────────────────────────
function quickSearch(query) {
  document.getElementById('query-input').value = query;
  document.getElementById('clear-input-btn').style.display = 'block';
  handleResearch();
}

function clearInput() {
  document.getElementById('query-input').value = '';
  document.getElementById('clear-input-btn').style.display = 'none';
  document.getElementById('query-input').focus();
}

// ─── RESEARCH ───────────────────────────────────────────
async function handleResearch() {
  const query = document.getElementById('query-input').value.trim();
  if (!query) { showToast('Please enter a search query', 'error'); return; }
  
  if (!systemReady) {
    showToast('❌ Please configure Groq and Tavily API keys first', 'error');
    openSetupModal();
    return;
  }

  const btn = document.getElementById('btn-research');
  setLoading(btn, true);
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('results-section').style.display = 'none';
  showFlow('plan');

  try {
    await sleep(350); showFlow('search');

    const res = await fetch(`${API}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    showFlow('process');
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`); }

    const data = await res.json();
    currentLeads = data.leads || [];
    filteredLeads = [...currentLeads];
    searchCount++;

    showFlow('output');
    await sleep(400);

    // Save history
    addToHistory(query, currentLeads.length);
    updateFooterStats();
    renderTable(filteredLeads);
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('results-query').textContent = `for "${query}"`;
    document.getElementById('btn-export').disabled = currentLeads.length === 0;
    document.getElementById('btn-email').disabled = currentLeads.length === 0;
    showToast(`✅ Found ${currentLeads.length} leads`, 'success');

  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('flow-tracker').style.display = 'none';
  } finally {
    setLoading(btn, false);
    setTimeout(() => { document.getElementById('flow-tracker').style.display = 'none'; }, 2500);
  }
}

// ─── TABLE ──────────────────────────────────────────────
function renderTable(leads) {
  const body = document.getElementById('leads-body');
  document.getElementById('results-count').textContent = leads.length;
  selectedIndices.clear();
  updateBulkBar();

  if (leads.length === 0) {
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-3)">No leads match your filter</td></tr>`;
    return;
  }

  body.innerHTML = leads.map((lead, i) => {
    const orig = currentLeads.indexOf(lead); // track original index
    return `<tr data-oi="${orig}" onclick="rowClick(${orig},event)">
      <td><input type="checkbox" onchange="toggleSel(${orig})" id="ck-${orig}" ${selectedIndices.has(orig)?'checked':''}></td>
      <td style="color:var(--text-3);font-family:var(--mono);font-size:.75rem">${i+1}</td>
      <td style="font-weight:600;color:var(--text-1)">${esc(lead.name||'—')}</td>
      <td>${lead.email&&lead.email!=='N/A'?`<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>`:'<span class="no-val">—</span>'}</td>
      <td>${lead.phone&&lead.phone!=='N/A'?esc(lead.phone):'<span class="no-val">—</span>'}</td>
      <td>${lead.website&&lead.website!=='N/A'?`<a href="${esc(lead.website)}" target="_blank">${trunc(lead.website,28)}</a>`:'<span class="no-val">—</span>'}</td>
      <td style="font-size:.78rem">${esc(lead.address||'—')}</td>
      <td><button class="action-btn" onclick="openDetail(${orig});event.stopPropagation()">👁</button></td>
    </tr>`;
  }).join('');
}

function filterLeads(val) {
  const q = val.toLowerCase().trim();
  filteredLeads = q ? currentLeads.filter(l =>
    (l.name||'').toLowerCase().includes(q) ||
    (l.email||'').toLowerCase().includes(q) ||
    (l.phone||'').toLowerCase().includes(q) ||
    (l.website||'').toLowerCase().includes(q) ||
    (l.address||'').toLowerCase().includes(q)
  ) : [...currentLeads];
  renderTable(filteredLeads);
}

function sortBy(col) {
  if (sortState.col === col) sortState.dir *= -1;
  else { sortState.col = col; sortState.dir = 1; }
  filteredLeads.sort((a, b) => {
    const av = (a[col]||'').toLowerCase(), bv = (b[col]||'').toLowerCase();
    return av < bv ? -sortState.dir : av > bv ? sortState.dir : 0;
  });
  renderTable(filteredLeads);
}

// ─── SELECTION ──────────────────────────────────────────
function toggleSel(origIdx) {
  selectedIndices.has(origIdx) ? selectedIndices.delete(origIdx) : selectedIndices.add(origIdx);
  highlightRows();
  updateBulkBar();
}

function rowClick(origIdx, e) {
  if (e.target.type === 'checkbox' || e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
  const cb = document.getElementById(`ck-${origIdx}`);
  if (cb) { cb.checked = !cb.checked; toggleSel(origIdx); }
}

function toggleSelectAll() {
  const all = selectedIndices.size === currentLeads.length;
  selectedIndices.clear();
  if (!all) currentLeads.forEach((_, i) => selectedIndices.add(i));
  document.querySelectorAll('[id^="ck-"]').forEach(cb => { cb.checked = !all; });
  document.getElementById('select-all').checked = !all;
  document.getElementById('select-all-th').checked = !all;
  highlightRows();
  updateBulkBar();
}

function deselectAll() {
  selectedIndices.clear();
  document.querySelectorAll('[id^="ck-"]').forEach(cb => { cb.checked = false; });
  document.getElementById('select-all').checked = false;
  document.getElementById('select-all-th').checked = false;
  highlightRows();
  updateBulkBar();
}

function highlightRows() {
  document.querySelectorAll('#leads-body tr').forEach(tr => {
    const oi = parseInt(tr.dataset.oi);
    tr.classList.toggle('selected', selectedIndices.has(oi));
  });
  const cnt = document.getElementById('selected-count');
  cnt.style.display = selectedIndices.size ? 'inline' : 'none';
  document.getElementById('sel-num').textContent = selectedIndices.size;
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  const n = selectedIndices.size;
  bar.style.display = n > 0 ? 'flex' : 'none';
  document.getElementById('bulk-count').textContent = n;
}

function getSelected() { return [...selectedIndices].map(i => currentLeads[i]).filter(Boolean); }

// ─── DETAIL MODAL ────────────────────────────────────────
function openDetail(idx) {
  const lead = currentLeads[idx];
  if (!lead) return;
  const body = document.getElementById('detail-body');
  const fields = [['Name', lead.name], ['Email', lead.email], ['Phone', lead.phone], ['Website', lead.website], ['Address', lead.address]];
  body.innerHTML = fields.map(([k, v]) =>
    `<div class="detail-field"><div class="detail-field__key">${k}</div><div class="detail-field__val">${v && v !== 'N/A' ? esc(v) : '<span class="no-val">—</span>'}</div></div>`
  ).join('');

  document.getElementById('detail-export-btn').onclick = () => { handleExport([lead]); closeDetail(); };
  document.getElementById('detail-email-btn').onclick = () => { closeDetail(); openEmailModal([lead]); };
  document.getElementById('detail-modal').style.display = 'flex';
}

function closeDetail() { document.getElementById('detail-modal').style.display = 'none'; }
function closeDetailIfBg(e) { if (e.target.id === 'detail-modal') closeDetail(); }

// ─── EXPORT ─────────────────────────────────────────────
async function handleExport(overrideLeads) {
  const leads = overrideLeads || (getSelected().length ? getSelected() : currentLeads);
  if (!leads.length) { showToast('No leads to export', 'error'); return; }
  const btn = document.getElementById('btn-export');
  setLoading(btn, true);
  try {
    const res = await fetch(`${API}/api/export`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads })
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `openclaw_${Date.now()}.xlsx` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📊 Exported ${leads.length} leads`, 'success');
  } catch (err) { showToast(`❌ ${err.message}`, 'error'); }
  finally { setLoading(btn, false); }
}

function exportSelected() { handleExport(getSelected()); }

// ─── EMAIL ──────────────────────────────────────────────
function handleEmail() {
  const leads = getSelected().length ? getSelected() : currentLeads;
  openEmailModal(leads);
}

function emailSelected() { openEmailModal(getSelected()); }

function openEmailModal(leads) {
  const withEmail = leads.filter(l => l.email && l.email !== 'N/A');
  if (!withEmail.length) { showToast('No leads with email addresses', 'error'); return; }
  document.getElementById('email-chips').innerHTML = withEmail.map(l => `<span class="email-chip">${esc(l.email)}</span>`).join('');
  document.getElementById('recipient-count').textContent = withEmail.length + ' recipients';
  document.getElementById('email-send-count').textContent = withEmail.length;
  document.getElementById('email-modal').style.display = 'flex';
  document.getElementById('email-modal').dataset.leads = JSON.stringify(withEmail);
}

function closeEmailModal() { document.getElementById('email-modal').style.display = 'none'; }
function closeEmailIfBg(e) { if (e.target.id === 'email-modal') closeEmailModal(); }

async function generateEmailWithAI() {
  const btn = document.getElementById('btn-ai-email');
  setLoading(btn, true);
  try {
    const res = await fetch(`${API}/api/generate-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: currentLeads.slice(0, 3) })
    });
    if (!res.ok) throw new Error('AI generation failed');
    const d = await res.json();
    document.getElementById('email-subject').value = d.subject || '';
    document.getElementById('email-body').value = d.body || '';
    document.getElementById('char-count').textContent = (d.body||'').length + ' chars';
    showToast('🤖 Email template generated', 'success');
  } catch (err) { showToast(`❌ ${err.message}`, 'error'); }
  finally { setLoading(btn, false); }
}

async function sendEmails() {
  const subject = document.getElementById('email-subject').value.trim();
  const body = document.getElementById('email-body').value.trim();
  if (!subject || !body) { showToast('Please fill in subject and message', 'error'); return; }
  const leads = JSON.parse(document.getElementById('email-modal').dataset.leads || '[]');
  const btn = document.getElementById('btn-send-emails');
  setLoading(btn, true);
  try {
    const res = await fetch(`${API}/api/email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads, subject, body })
    });
    if (!res.ok) throw new Error('Email send failed');
    const d = await res.json();
    emailsSentCount += d.sent || 0;
    updateFooterStats();
    closeEmailModal();
    showToast(`📧 Sent ${d.sent} emails successfully`, 'success');
  } catch (err) { showToast(`❌ ${err.message}`, 'error'); }
  finally { setLoading(btn, false); }
}

// ─── SETUP MODAL ─────────────────────────────────────────
function openSetupModal() { document.getElementById('setup-modal').style.display = 'flex'; }
function closeSetupModal() { document.getElementById('setup-modal').style.display = 'none'; }
function closeSetupIfBg(e) { if (e.target.id === 'setup-modal') closeSetupModal(); }

// ─── HISTORY ─────────────────────────────────────────────
function addToHistory(query, count) {
  searchHistory.unshift({ query, count, time: Date.now() });
  searchHistory = searchHistory.slice(0, 20);
  try { localStorage.setItem('oc_history', JSON.stringify(searchHistory)); } catch(e) {}
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById('history-list');
  if (!searchHistory.length) {
    el.innerHTML = '<div class="history-empty">No searches yet</div>';
    return;
  }
  el.innerHTML = searchHistory.map((h, i) => `
    <div class="history-item" onclick="quickSearch('${h.query.replace(/'/g,"\\'")}')">
      <div class="history-item__query">${esc(h.query)}</div>
      <div class="history-item__meta">${h.count} leads · ${timeAgo(h.time)}</div>
    </div>
  `).join('');
}

function clearHistory() {
  searchHistory = [];
  localStorage.removeItem('oc_history');
  renderHistory();
  showToast('History cleared', 'info');
}

function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

// ─── STATS ───────────────────────────────────────────────
function updateFooterStats() {
  document.getElementById('fs-searches').textContent = searchCount;
  document.getElementById('fs-total-leads').textContent = currentLeads.length;
  document.getElementById('fs-emails').textContent = emailsSentCount;
}

function loadSavedStats() {
  searchCount = parseInt(localStorage.getItem('oc_sc') || '0');
  emailsSentCount = parseInt(localStorage.getItem('oc_ec') || '0');
  updateFooterStats();
}

// ─── RESULTS HELPERS ─────────────────────────────────────
function clearResults() {
  currentLeads = []; filteredLeads = []; selectedIndices.clear();
  document.getElementById('results-section').style.display = 'none';
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('filter-input').value = '';
  document.getElementById('btn-export').disabled = true;
  document.getElementById('btn-email').disabled = true;
  updateBulkBar();
  showToast('Results cleared', 'info');
}

// ─── FLOW TRACKER ─────────────────────────────────────────
function showFlow(step) {
  const tracker = document.getElementById('flow-tracker');
  tracker.style.display = 'flex';
  const steps = ['plan', 'search', 'process', 'output'];
  const ci = steps.indexOf(step);
  steps.forEach((s, i) => {
    const el = document.getElementById(`flow-${s}`);
    el.className = 'flow-step' + (i < ci ? ' done' : i === ci ? ' active' : '');
  });
}

// ─── UTILITIES ──────────────────────────────────────────
function setLoading(btn, on) {
  on ? btn.classList.add('btn--loading') : btn.classList.remove('btn--loading');
  btn.disabled = on;
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.cssText += 'opacity:0;transform:translateX(30px);transition:all .3s'; }, 3200);
  setTimeout(() => t.remove(), 3600);
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

function trunc(s, n) {
  if (!s) return '';
  const c = s.replace(/^https?:\/\/(www\.)?/, '');
  return c.length > n ? c.slice(0, n) + '…' : c;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
