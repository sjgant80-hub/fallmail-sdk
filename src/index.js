// fallmail SDK · sovereign single-file library · MIT · AI-Native Solutions
// Extracted from fallmail/index.html · 11700 bytes of source logic
// Public-safe: no primes/glyphs/dyad references

import * as FallID from 'https://sjgant80-hub.github.io/fallid/fallid.js';
import FallLink from 'https://sjgant80-hub.github.io/falllink/falllink.js';
import { FallPod } from 'https://sjgant80-hub.github.io/fallpod/fallpod.js';
import * as FallStore from 'https://sjgant80-hub.github.io/fallstore/fallstore.js';
import { FallMail } from './fallmail.js';
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2400); };
// --- init estate stack ---
const state = { folder: 'inbox', selectedId: null, composeAttachments: [], messages: [] };
let mail, link;
async function boot() {
  const id = await FallID.getOrCreate();
  $('#my-did').textContent = id.did;
  $('#my-did').title = 'Click to copy · ' + id.did;
  $('#my-did').onclick = () => { navigator.clipboard.writeText(id.did); toast('DID copied'); };
  $('#pill-id').classList.add('on');
  const pod = new FallPod({ ownerDid: id.did, encryptionSeed: id.did });
  await pod.ready();
  link = new FallLink({ ownId: id.did });
  try { link.startBroadcast(); $('#pill-link').classList.add('on'); }
  catch (e) { console.warn('FallLink broadcast unavailable', e); }
  link.on('peer', () => refreshPeers());
  link.on('connect', () => refreshPeers());
  link.on('disconnect', () => refreshPeers());
  $('#pill-store').classList.add('on');
  mail = new FallMail({ fallid: FallID, falllink: link, fallpod: pod, fallstore: FallStore });
  await mail.ready();
  mail.onMessage(m => {
    toast('New message: ' + (m.subject || '(no subject)'));
    refresh();
  });
  window.__fallmail = mail; window.__link = link; window.__id = FallID; window.__pod = pod;
  refresh(); refreshPeers();
  setInterval(refreshPeers, 3500);
}
function refreshPeers() {
  const peers = link ? link.getPeers().filter(p => p.state === 'open' || p.state === 'connected') : [];
  const el = $('#peers');
  if (!peers.length) { el.innerHTML = '<div class="peer" style="color:var(--dim);font-style:italic">no peers yet</div>'; return; }
  el.innerHTML = peers.map(p => `<div class="peer"><span class="dot"></span>${(p.remoteId || p.peerId).slice(0, 18)}…</div>`).join('');
}
async function refresh() {
  const [inbox, outbox, drafts, trash] = await Promise.all([mail.inbox(), mail.outbox(), mail.drafts(), mail.trash()]);
  $('#c-inbox').textContent = inbox.filter(m => !m.read).length || inbox.length;
  $('#c-outbox').textContent = outbox.length;
  $('#c-drafts').textContent = drafts.length;
  $('#c-trash').textContent = trash.length;
  state.cache = { inbox, outbox, drafts, trash };
  renderList();
}
function renderList() {
  const items = state.cache?.[state.folder] || [];
  state.messages = items;
  $('#list-title').textContent = { inbox: 'Inbox', outbox: 'Sent', drafts: 'Drafts', trash: 'Trash' }[state.folder];
  $('#list-count').textContent = items.length;
  const box = $('#list-items');
  if (!items.length) { box.innerHTML = `<div class="empty"><h3>Nothing here</h3><p>${state.folder === 'inbox' ? 'Waiting for peers.' : state.folder === 'drafts' ? 'No drafts saved.' : 'Empty.'}</p></div>`; renderPreview(null); return; }
  box.innerHTML = items.map(m => {
    const who = state.folder === 'outbox' ? ('to ' + (m.toDid || '').slice(0, 24) + '…') : ('from ' + (m.fromDid || '').slice(0, 24) + '…');
    const t = m.timestamp ? new Date(m.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (m.savedAt ? new Date(m.savedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
    const snip = (m.body || '').slice(0, 90).replace(/\n/g, ' ');
    const badges = [];
    if (m.verified === true) badges.push('<span class="badge enc">🔒 verified</span>');
    else if (state.folder === 'inbox') badges.push('<span class="badge warn">⚠ unverified</span>');
    return `<div class="msg-card${m.read ? '' : ' unread'}${state.selectedId === m.id ? ' on' : ''}" data-id="${m.id}">
      <div class="row"><div class="from">${who}</div><div class="time">${t}</div></div>
      <div class="subject">${escapeHtml(m.subject || '(no subject)')}</div>
      <div class="snippet">${escapeHtml(snip)}</div>
      <div class="badges">${badges.join('')}</div>
    </div>`;
  }).join('');
  box.querySelectorAll('.msg-card').forEach(el => el.onclick = () => { state.selectedId = el.dataset.id; renderList(); const m = state.messages.find(x => x.id === state.selectedId); if (m && state.folder === 'inbox' && !m.read) { mail.read(m.id).then(refresh); } renderPreview(m); });
}
function renderPreview(m) {
  const box = $('#preview');
  if (!m) { box.innerHTML = `<div class="preview-empty"><div class="glyph">✉</div><p>Select a message to read. Encrypted end-to-end · addressed to your DID.</p></div>`; return; }
  const attach = (m.attachments || []).map(a => `<div class="att-item"><div><div class="fname">${escapeHtml(a.name || 'attachment')}</div><div class="fmeta">${a.type || 'binary'} · ${fmtSize(a.size)} · <code>${(a.cid || '').slice(0, 22)}…</code></div></div><button data-cid="${a.cid}" data-name="${escapeHtml(a.name || 'file')}" class="dl">Download</button></div>`).join('');
  const status = m.verified ? `<div class="enc-status ok">🔒 signature verified · ECDH+AES-GCM</div>` : `<div class="enc-status warn">⚠ unverified signature</div>`;
  box.innerHTML = `
    <div class="preview-head">
      <h1>${escapeHtml(m.subject || '(no subject)')}</h1>
      <div class="preview-meta">
        <div class="kv"><span class="k">From</span><span class="v">${m.fromDid || 'you'}</span></div>
        <div class="kv"><span class="k">To</span><span class="v">${m.toDid || ''}</span></div>
        <div class="kv"><span class="k">Sent</span><span class="v">${m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</span></div>
      </div>
      ${state.folder === 'inbox' || state.folder === 'outbox' ? status : ''}
    </div>
    <div class="preview-body">${escapeHtml(m.body || '(empty)')}</div>
    ${attach ? `<div class="preview-attach"><h3>Attachments</h3>${attach}</div>` : ''}
    <div class="preview-actions">
      ${state.folder === 'inbox' ? `<button class="btn-reply" id="btn-reply">↩ Reply</button>` : ''}
      ${state.folder === 'drafts' ? `<button class="btn-reply" id="btn-resume">Resume</button>` : ''}
      ${state.folder !== 'trash' ? `<button class="btn-danger" id="btn-delete">Move to Trash</button>` : `<button class="btn-ghost" id="btn-restore">Restore</button>`}
    </div>`;
  box.querySelectorAll('.dl').forEach(b => b.onclick = async () => {
    try { const bytes = await mail.fetchAttachment(b.dataset.cid); const blob = new Blob([bytes]); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = b.dataset.name; a.click(); URL.revokeObjectURL(url); toast('Downloaded'); }
    catch (e) { toast('Attachment not found locally'); }
  });
  const rep = $('#btn-reply'); if (rep) rep.onclick = () => openCompose({ toDid: m.fromDid, subject: (m.subject || '').startsWith('Re: ') ? m.subject : 'Re: ' + (m.subject || ''), body: '\n\n---\nOn ' + new Date(m.timestamp).toLocaleString() + ', ' + m.fromDid + ' wrote:\n> ' + (m.body || '').replace(/\n/g, '\n> ') });
  const res = $('#btn-resume'); if (res) res.onclick = () => openCompose({ id: m.id, toDid: m.toDid, subject: m.subject, body: m.body, attachments: m.attachments || [] });
  const del = $('#btn-delete'); if (del) del.onclick = async () => { await mail.delete(m.id); toast('Moved to trash'); state.selectedId = null; refresh(); renderPreview(null); };
  const rst = $('#btn-restore'); if (rst) rst.onclick = async () => { await mail.restore(m.id); toast('Restored'); state.selectedId = null; refresh(); renderPreview(null); };
}
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtSize(b) { if (!b) return '0 B'; if (b < 1024) return b + ' B'; if (b < 1e6) return (b / 1024).toFixed(1) + ' KB'; return (b / 1e6).toFixed(2) + ' MB'; }
// --- folder switching ---
  f.classList.add('on');
  state.folder = f.dataset.folder;
  state.selectedId = null;
  renderList(); renderPreview(null);
});
// --- compose modal ---
function openCompose(preset = {}) {
  $('#c-to').value = preset.toDid || '';
  $('#c-subject').value = preset.subject || '';
  $('#c-body').value = preset.body || '';
  state.composeAttachments = preset.attachments || [];
  state.composeDraftId = preset.id || null;
  renderAttachChips();
  $('#compose-modal').classList.add('on');
  setTimeout(() => (preset.toDid ? $('#c-body') : $('#c-to')).focus(), 50);
}
function closeCompose() { $('#compose-modal').classList.remove('on'); $('#c-to').value = ''; $('#c-subject').value = ''; $('#c-body').value = ''; state.composeAttachments = []; state.composeDraftId = null; }
function renderAttachChips() {
  $('#c-attach-row').innerHTML = state.composeAttachments.map((a, i) => `<div class="attach-chip">${escapeHtml(a.name)} · ${fmtSize(a.size)} <span class="x" data-i="${i}">×</span></div>`).join('');
  $('#c-attach-row').querySelectorAll('.x').forEach(x => x.onclick = () => { state.composeAttachments.splice(+x.dataset.i, 1); renderAttachChips(); });
}
$('#compose-btn').onclick = () => openCompose();
$('#c-cancel').onclick = closeCompose;
$('#c-file').onchange = async (e) => {
  const files = [...e.target.files];
  for (const f of files) {
    try { const a = await mail.attach(f); state.composeAttachments.push(a); toast('Attached: ' + f.name); }
    catch (err) { toast('Attach failed: ' + err.message); }
  }
  e.target.value = ''; renderAttachChips();
};
$('#c-draft').onclick = async () => {
  const rec = await mail.saveDraft({ id: state.composeDraftId, toDid: $('#c-to').value.trim(), subject: $('#c-subject').value.trim(), body: $('#c-body').value, attachments: state.composeAttachments });
  toast('Draft saved'); closeCompose(); refresh();
};
$('#c-send').onclick = async () => {
  const to = $('#c-to').value.trim(); const subject = $('#c-subject').value.trim(); const body = $('#c-body').value;
  if (!to.startsWith('did:key:z')) { toast('Recipient must be a did:key'); return; }
  if (!body && !subject) { toast('Empty message'); return; }
  $('#c-send').disabled = true; $('#c-send').textContent = 'Encrypting…';
  try {
    const r = await mail.send(to, subject, body, state.composeAttachments);
    if (state.composeDraftId) await mail.deleteDraft(state.composeDraftId);
    toast(r.delivered ? 'Sent · delivered to ' + r.wire.toDid.slice(0, 18) + '…' : 'Sent · queued (offline)');
    closeCompose(); refresh();
  } catch (e) { toast('Send failed: ' + e.message); console.error(e); }
  finally { $('#c-send').disabled = false; $('#c-send').textContent = 'Encrypt & Send'; }
};
// --- test loopback (for demo) ---
window.__loopback = async () => {
  const did = await FallID.getDID();
  const r = await mail.send(did, 'Loopback test', 'This is a self-addressed encrypted message. If you can read this, encryption round-trips.');
  await mail._inject(r.wire);
  toast('Loopback delivered');
  refresh();
};
// PWA service worker
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
boot().catch(e => { console.error(e); toast('Boot failed: ' + e.message); });

// Named exports for the primary API surface
export { boot };
export { refreshPeers };
export { refresh };
export { renderList };
export { renderPreview };
export { escapeHtml };
export { fmtSize };
export { openCompose };
export { closeCompose };
export { renderAttachChips };


