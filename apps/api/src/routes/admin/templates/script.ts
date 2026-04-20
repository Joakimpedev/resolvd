export const SCRIPT = String.raw`
// ─── State ─────────────────────────────────────────────────────
const state = { users: [], companies: [], tags: [], posts: [], courses: [], requests: [], tasks: [], solutions: [] };

// ─── Utilities ─────────────────────────────────────────────────
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }
function fmtDate(iso){ if(!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('no-NO') + ' ' + d.toTimeString().slice(0,5); }

// Hash a tag name to one of N tasteful colors (stable — same tag always same color)
const TAG_PALETTE = [
  { bg:'#EBF0E1', fg:'#3F5A1F' },
  { bg:'#E6EEF3', fg:'#1F4A66' },
  { bg:'#F4E7D8', fg:'#6E4919' },
  { bg:'#EFE3ED', fg:'#5A2857' },
  { bg:'#E1EEE9', fg:'#1F5A4A' },
  { bg:'#F3E6DF', fg:'#7A3F28' },
];
function tagColor(name){
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}
function tagChipHtml(tag, removable, dataAttrs){
  const c = tagColor(tag.name);
  const close = removable ? '<span class="chip-close" data-remove-tag="' + tag.id + '">×</span>' : '';
  const attrs = dataAttrs || '';
  return '<span class="chip chip-tag" style="background:' + c.bg + ';color:' + c.fg + '" ' + attrs + '>' + esc(tag.name) + close + '</span>';
}
function companyChipHtml(co, removable){
  const close = removable ? '<span class="chip-close" data-remove-company="' + co.id + '">×</span>' : '';
  return '<span class="chip chip-company">' + esc(co.name) + close + '</span>';
}

async function api(path, opts){
  const r = await fetch(path, { credentials: 'include', headers: {'Content-Type':'application/json'}, ...opts });
  if (!r.ok) {
    let msg = 'Feil';
    try { const j = await r.json(); msg = typeof j.error === 'string' ? j.error : JSON.stringify(j.error); } catch(e){}
    throw new Error(msg);
  }
  return r.json();
}

// ─── Load / render ─────────────────────────────────────────────
async function load(){
  try {
    const d = await api('/admin/overview');
    Object.assign(state, d);
    renderAll();
  } catch (e) {
    alert('Kunne ikke laste. ' + e.message);
  }
}

function renderAll(){
  renderUsers();
  renderCompanies();
  renderTags();
  renderArticles();
  renderCourses();
  renderTasks();
  renderRequests();
  renderSolutions();
}

function fmtNok(ore){
  if (ore == null) return '<span class="small-muted">—</span>';
  const kr = ore / 100;
  return kr.toLocaleString('no-NO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' kr';
}
function statusBadgeTask(s){
  const map = { NY: 'neutral', I_ARBEID: 'green', FERDIG: 'neutral' };
  const label = { NY: 'Ny', I_ARBEID: 'I arbeid', FERDIG: 'Ferdig' };
  return '<span class="badge ' + (map[s] || 'neutral') + '">' + (label[s] || s) + '</span>';
}
function statusBadgeReq(s){
  const map = { OPEN: 'green', PROMOTED: 'neutral', RESOLVED: 'neutral' };
  const label = { OPEN: 'Åpen', PROMOTED: 'Promotert', RESOLVED: 'Løst' };
  return '<span class="badge ' + (map[s] || 'neutral') + '">' + (label[s] || s) + '</span>';
}

function renderUsers(){
  document.getElementById('userCount').textContent = state.users.length;
  const q = (document.getElementById('userSearch').value || '').toLowerCase();
  const users = state.users.filter(u =>
    !q || [u.name, u.email, u.company?.name || '', u.role].join(' ').toLowerCase().includes(q)
  );
  const roleBadge = { ADMIN:'admin', OWNER:'green', EMPLOYEE:'neutral' };
  document.querySelector('#userTable tbody').innerHTML = users.length ? users.map(u =>
    '<tr>' +
    '<td>' + esc(u.name) + '</td>' +
    '<td><code>' + esc(u.email) + '</code></td>' +
    '<td>' + (u.plaintextPassword ? '<code>' + esc(u.plaintextPassword) + '</code>' : '<span class="small-muted">—</span>') + '</td>' +
    '<td><span class="badge ' + roleBadge[u.role] + '">' + u.role + '</span></td>' +
    '<td>' + esc(u.company?.name || '—') + '</td>' +
    '<td>' + (u.tags.length ? u.tags.map(t => tagChipHtml(t)).join('') : '<span class="small-muted">—</span>') + '</td>' +
    '<td><button class="btn secondary sm" data-edit-user="' + u.id + '">Rediger</button></td>' +
    '</tr>'
  ).join('') : '<tr><td colspan="7" class="empty">Ingen brukere</td></tr>';
}

function renderCompanies(){
  document.getElementById('compCount').textContent = state.companies.length;
  document.querySelector('#compTable tbody').innerHTML = state.companies.length ? state.companies.map(co =>
    '<tr>' +
    '<td>' + companyChipHtml(co) + '</td>' +
    '<td>' + co.userCount + '</td>' +
    '<td>' + fmtDate(co.createdAt) + '</td>' +
    '<td class="actions">' +
      '<button class="btn secondary sm" data-edit-company="' + co.id + '">Rediger</button>' +
      '<button class="btn danger sm" data-delete-company="' + co.id + '">Slett</button>' +
    '</td></tr>'
  ).join('') : '<tr><td colspan="4" class="empty">Ingen bedrifter</td></tr>';
}

function renderTags(){
  document.getElementById('tagCount').textContent = state.tags.length;
  document.querySelector('#tagTable tbody').innerHTML = state.tags.length ? state.tags.map(t =>
    '<tr>' +
    '<td>' + tagChipHtml(t) + '</td>' +
    '<td>' + t.userCount + '</td>' +
    '<td>' + t.postCount + '</td>' +
    '<td>' + t.courseCount + '</td>' +
    '<td class="actions">' +
      '<button class="btn secondary sm" data-edit-tag="' + t.id + '">Rediger</button>' +
      '<button class="btn danger sm" data-delete-tag="' + t.id + '">Slett</button>' +
    '</td></tr>'
  ).join('') : '<tr><td colspan="5" class="empty">Ingen tags. Opprett en via + Tag.</td></tr>';
}

function renderArticles(){
  const articles = state.posts.filter(p => p.kind === 'ARTICLE');
  document.getElementById('articleCount').textContent = articles.length;
  const q = (document.getElementById('articleSearch').value || '').toLowerCase();
  const list = articles.filter(p => !q || [p.title, p.category || ''].join(' ').toLowerCase().includes(q));
  document.querySelector('#articleTable tbody').innerHTML = list.length ? list.map(p =>
    '<tr>' +
    '<td><details class="inline"><summary>' + esc(p.title) + '</summary>' +
    '<div class="body">' + esc(p.body) + '</div></details></td>' +
    '<td>' + esc(p.category || '—') + '</td>' +
    '<td>' + scopeBadgesHtml(p) + '</td>' +
    '<td>' + fmtDate(p.publishedAt) + '</td>' +
    '<td class="actions">' +
      '<button class="btn secondary sm" data-edit-article="' + p.id + '">Rediger</button>' +
      '<button class="btn danger sm" data-delete-post="' + p.id + '">Slett</button>' +
    '</td></tr>'
  ).join('') : '<tr><td colspan="5" class="empty">Ingen artikler. Opprett en via + Artikkel.</td></tr>';
}

function renderCourses(){
  document.getElementById('courseCount').textContent = state.courses.length;
  document.querySelector('#courseTable tbody').innerHTML = state.courses.length ? state.courses.map(co =>
    '<tr>' +
    '<td>' + esc(co.title) + '</td>' +
    '<td>' + co.moduleCount + '</td>' +
    '<td>' + scopeBadgesHtml(co) + '</td>' +
    '<td class="actions">' +
      '<button class="btn secondary sm" data-edit-course="' + co.id + '">Rediger</button>' +
      '<button class="btn danger sm" data-delete-course="' + co.id + '">Slett</button>' +
    '</td></tr>'
  ).join('') : '<tr><td colspan="4" class="empty">Ingen kurs. Opprett ett via + Kurs.</td></tr>';
}

function renderRequests(){
  document.getElementById('reqCount').textContent = state.requests.length;
  document.querySelector('#reqTable tbody').innerHTML = state.requests.length ? state.requests.map(r =>
    '<tr><td><details class="inline"><summary>' + esc(r.title) + '</summary><div class="body">' + esc(r.description) + '</div></details></td>' +
    '<td>' + esc(r.company) + '</td>' +
    '<td>' + esc(r.createdBy) + '</td>' +
    '<td>' + r.commentCount + '</td>' +
    '<td>' + statusBadgeReq(r.status) + '</td>' +
    '<td>' + fmtDate(r.updatedAt) + '</td>' +
    '<td class="actions">' +
      '<button class="btn secondary sm" data-open-request="' + r.id + '">Tråd</button> ' +
      (r.status === 'OPEN' ? '<button class="btn sm" data-promote-request="' + r.id + '">Promoter</button> ' : '') +
      (r.status === 'OPEN' ? '<button class="btn secondary sm" data-resolve-request="' + r.id + '">Lukk</button>' :
        r.status === 'RESOLVED' ? '<button class="btn secondary sm" data-reopen-request="' + r.id + '">Åpne</button>' : '') +
    '</td></tr>'
  ).join('') : '<tr><td colspan="7" class="empty">Ingen forespørsler</td></tr>';
}

function renderTasks(){
  document.getElementById('taskCount').textContent = state.tasks.length;
  document.querySelector('#taskTable tbody').innerHTML = state.tasks.length ? state.tasks.map(t =>
    '<tr>' +
    '<td><details class="inline"><summary>' + esc(t.title) + '</summary>' +
      '<div class="body"><pre style="white-space:pre-wrap;font-family:inherit">' + esc(t.descriptionMd || '(ingen beskrivelse)') + '</pre></div>' +
    '</details></td>' +
    '<td>' + esc(t.company?.name || '—') + '</td>' +
    '<td>' + (t.assignees && t.assignees.length ?
      t.assignees.map(a => '<span class="chip chip-company">' + esc(a.avatarInitial || '?') + ' ' + esc(a.name) + '</span>').join('') :
      '<span class="small-muted">—</span>') + '</td>' +
    '<td>' + fmtNok(t.priceOre) + '</td>' +
    '<td>' + statusBadgeTask(t.status) + '</td>' +
    '<td>' + (t.events?.length || 0) + '</td>' +
    '<td>' + fmtDate(t.updatedAt) + '</td>' +
    '<td class="actions">' +
      '<button class="btn secondary sm" data-edit-task="' + t.id + '">Rediger</button> ' +
      '<button class="btn danger sm" data-delete-task="' + t.id + '">Slett</button>' +
    '</td></tr>'
  ).join('') : '<tr><td colspan="8" class="empty">Ingen oppgaver. Opprett én via + Ny oppgave.</td></tr>';
}

function renderSolutions(){
  document.getElementById('solCount').textContent = state.solutions.length;
  document.querySelector('#solTable tbody').innerHTML = state.solutions.length ? state.solutions.map(s =>
    '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.company) + '</td>' +
    '<td><span class="badge ' + (s.status === 'ACTIVE' ? 'green' : 'neutral') + '">' + s.status + '</span></td>' +
    '<td>' + esc(s.subtitle || '—') + '</td>' +
    '<td><button class="btn danger sm" data-delete-solution="' + s.id + '">Slett</button></td></tr>'
  ).join('') : '<tr><td colspan="5" class="empty">Ingen løsninger</td></tr>';
}

function scopeBadgesHtml(entity){
  if (entity.everyone) return '<span class="badge neutral">Alle</span>';
  const parts = [];
  (entity.companies || []).forEach(co => parts.push(companyChipHtml(co)));
  (entity.tags || []).forEach(t => parts.push(tagChipHtml(t)));
  return parts.length ? parts.join('') : '<span class="small-muted">—</span>';
}

// ─── Modal shell ───────────────────────────────────────────────
const overlay = document.getElementById('overlay');
const modalBox = document.getElementById('modalBox');

function openModal(html, sizeLg){
  modalBox.className = 'modal' + (sizeLg ? ' lg' : '');
  modalBox.innerHTML = '<button class="modal-close" data-close>×</button>' + html;
  overlay.classList.add('open');
}
function closeModal(){ overlay.classList.remove('open'); modalBox.innerHTML = ''; }

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
  if (e.target.dataset.close !== undefined) closeModal();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal(); });

// ─── Chip picker ──────────────────────────────────────────────
/** Attaches chip picker behavior to a container with class "chip-picker".
 *  options: [{id,name}], selected: Set<id>, onChange: (selectedIds) => void
 *  renderChip: (item, removable) => HTML
 */
function initChipPicker(containerId, options, initialSelectedIds, renderChip){
  const container = document.getElementById(containerId);
  const dropdownId = containerId + '-drop';
  const selected = new Set(initialSelectedIds);
  function render(){
    const selectedItems = options.filter(o => selected.has(o.id));
    const availableItems = options.filter(o => !selected.has(o.id));
    container.innerHTML =
      '<div class="chip-picker-dropdown" style="width:100%">' +
      '<div class="chip-picker" data-chip-root>' +
        selectedItems.map(o => renderChip(o, true)).join('') +
        '<input type="text" placeholder="' + (selected.size ? '' : 'Legg til...') + '">' +
      '</div>' +
      '<div class="chip-picker-options" id="' + dropdownId + '">' +
        (availableItems.length ? availableItems.map(o =>
          '<div class="chip-picker-option" data-pick-id="' + o.id + '">' + esc(o.name) + '</div>'
        ).join('') : '<div class="chip-picker-option" style="color:var(--muted);cursor:default">Ingen flere valg</div>') +
      '</div></div>';
    const input = container.querySelector('input');
    const dropdown = container.querySelector('#' + dropdownId);
    input.addEventListener('focus', () => dropdown.classList.add('open'));
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      dropdown.querySelectorAll('.chip-picker-option').forEach(el => {
        const id = el.getAttribute('data-pick-id');
        if (!id) return;
        const opt = options.find(o => o.id === id);
        el.style.display = opt && opt.name.toLowerCase().includes(q) ? 'block' : 'none';
      });
    });
    dropdown.addEventListener('mousedown', (e) => {
      const id = e.target.getAttribute && e.target.getAttribute('data-pick-id');
      if (id) {
        selected.add(id);
        container._selected = selected;
        render();
      }
    });
    input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 120));
    container.querySelectorAll('.chip-close').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagId = el.getAttribute('data-remove-tag') || el.getAttribute('data-remove-company');
        if (tagId) { selected.delete(tagId); container._selected = selected; render(); }
      });
    });
  }
  container._selected = selected;
  container._getSelectedIds = () => Array.from(container._selected);
  render();
  return container;
}

// ─── Scope picker helper (used in article, lesson, course modals) ──
function renderScopePicker(prefix, initial){
  return '<div class="toggle-row">' +
    '<input type="checkbox" id="' + prefix + '-everyone" ' + (initial.everyone ? 'checked' : '') + '>' +
    '<label for="' + prefix + '-everyone">Vis til alle brukere</label>' +
    '<span class="hint">overstyrer filtrene under</span>' +
    '</div>' +
    '<div class="scope-filters" id="' + prefix + '-filters">' +
    '<label>Begrens til bedrifter (valgfri)</label>' +
    '<div id="' + prefix + '-companies"></div>' +
    '<label>Begrens til tags (valgfri)</label>' +
    '<div id="' + prefix + '-tags"></div>' +
    '<p class="small-muted" style="margin-top:8px">Når begge er satt: brukere må være i en av bedriftene OG ha en av tagsene.</p>' +
    '</div>';
}

function initScopePicker(prefix, initial){
  initChipPicker(prefix + '-companies', state.companies.map(c => ({id:c.id, name:c.name})), initial.companyIds || [],
    (o, rm) => companyChipHtml(o, rm));
  initChipPicker(prefix + '-tags', state.tags.map(t => ({id:t.id, name:t.name})), initial.tagIds || [],
    (o, rm) => tagChipHtml(o, rm));

  const everyoneEl = document.getElementById(prefix + '-everyone');
  const filtersEl  = document.getElementById(prefix + '-filters');
  const sync = () => filtersEl.classList.toggle('disabled', everyoneEl.checked);
  everyoneEl.addEventListener('change', sync);
  sync();
}
function readScopePicker(prefix){
  return {
    everyone: document.getElementById(prefix + '-everyone').checked,
    companyIds: document.getElementById(prefix + '-companies')._getSelectedIds(),
    tagIds:     document.getElementById(prefix + '-tags')._getSelectedIds(),
  };
}

// ─── Company modal ─────────────────────────────────────────────
function openCompanyModal(id){
  const existing = id ? state.companies.find(c => c.id === id) : null;
  openModal(
    '<h3>' + (existing ? 'Rediger bedrift' : 'Ny bedrift') + '</h3>' +
    '<div class="subtitle">Bedrifter er grupper. Brukere tilhører én bedrift.</div>' +
    '<form id="companyForm">' +
    '<label>Navn</label><input name="name" required maxlength="200" value="' + esc(existing?.name || '') + '">' +
    '<div class="msg" id="companyMsg"></div>' +
    '<footer>' +
      '<button type="button" class="btn secondary" data-close>Avbryt</button>' +
      '<button type="submit" class="btn">' + (existing ? 'Lagre' : 'Opprett') + '</button>' +
    '</footer></form>'
  );
  document.getElementById('companyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { name: e.target.name.value.trim() };
    try {
      await api(id ? '/admin/companies/' + id : '/admin/companies', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
      closeModal(); await load();
    } catch (err) { document.getElementById('companyMsg').textContent = 'Feil: ' + err.message; }
  });
}

// ─── User modal ────────────────────────────────────────────────
function openUserModal(id){
  const existing = id ? state.users.find(u => u.id === id) : null;
  const companyOpts = state.companies.map(c => '<option value="' + c.id + '"' + (existing?.company?.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
  openModal(
    '<h3>' + (existing ? 'Rediger bruker' : 'Ny bruker') + '</h3>' +
    '<form id="userForm">' +
    '<div class="row">' +
      '<div><label>Navn</label><input name="name" required maxlength="100" value="' + esc(existing?.name || '') + '"></div>' +
      '<div><label>Avatar (1–2 tegn)</label><input name="avatarInitial" maxlength="2" required value="' + esc(existing?.avatarInitial || '') + '"></div>' +
    '</div>' +
    (existing ? '' :
      '<label>E-post</label><input name="email" type="email" required>' +
      '<label>Midlertidig passord (min 8 tegn)</label><input name="password" type="text" required minlength="8">'
    ) +
    '<div class="row">' +
      '<div><label>Bedrift</label><select name="companyId" required>' +
        (existing ? '' : '<option value="">Velg...</option>') + companyOpts +
      '</select></div>' +
      '<div><label>Rolle</label><select name="role">' +
        ['OWNER','EMPLOYEE','ADMIN'].filter(r => !!existing || r !== 'ADMIN').map(r =>
          '<option value="' + r + '"' + ((existing?.role || 'EMPLOYEE') === r ? ' selected' : '') + '>' + r + '</option>'
        ).join('') +
      '</select></div>' +
    '</div>' +
    '<label>Tags</label><div id="userTagsPicker"></div>' +
    (existing ? '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">' +
      '<button type="button" class="btn secondary sm" id="resetPwBtn">Nullstill passord</button> ' +
      '<button type="button" class="btn danger sm" id="deleteUserBtn">Slett bruker</button>' +
    '</div>' : '') +
    '<div class="msg" id="userMsg"></div>' +
    '<footer>' +
      '<button type="button" class="btn secondary" data-close>Avbryt</button>' +
      '<button type="submit" class="btn">' + (existing ? 'Lagre' : 'Opprett') + '</button>' +
    '</footer></form>'
  );

  initChipPicker('userTagsPicker', state.tags.map(t => ({id:t.id, name:t.name})),
    existing?.tags.map(t => t.id) || [], (o, rm) => tagChipHtml(o, rm));

  if (existing) {
    document.getElementById('resetPwBtn').addEventListener('click', async () => {
      const p = prompt('Nytt passord for ' + existing.email + ' (min 8 tegn):');
      if (!p) return;
      if (p.length < 8) { alert('Minimum 8 tegn'); return; }
      try { await api('/admin/users/' + existing.id + '/reset-password', { method: 'POST', body: JSON.stringify({ newPassword: p }) }); alert('Passord oppdatert.'); await load(); closeModal(); }
      catch (err) { alert('Feil: ' + err.message); }
    });
    document.getElementById('deleteUserBtn').addEventListener('click', async () => {
      if (!confirm('Slette ' + existing.email + '? Dette kan ikke angres.')) return;
      try { await api('/admin/users/' + existing.id, { method: 'DELETE' }); closeModal(); await load(); }
      catch (err) { alert('Feil: ' + err.message); }
    });
  }

  document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const tagIds = document.getElementById('userTagsPicker')._getSelectedIds();
    try {
      if (existing) {
        await api('/admin/users/' + existing.id, { method: 'PATCH', body: JSON.stringify({
          name: f.name.value.trim(),
          avatarInitial: f.avatarInitial.value.trim(),
          companyId: f.companyId.value,
          role: f.role.value,
        })});
        await api('/admin/users/' + existing.id + '/tags', { method: 'PUT', body: JSON.stringify({ tagIds }) });
      } else {
        await api('/admin/users', { method: 'POST', body: JSON.stringify({
          email: f.email.value.trim().toLowerCase(),
          password: f.password.value,
          name: f.name.value.trim(),
          avatarInitial: f.avatarInitial.value.trim(),
          companyId: f.companyId.value,
          role: f.role.value,
          tagIds,
        })});
      }
      closeModal(); await load();
    } catch (err) { document.getElementById('userMsg').textContent = 'Feil: ' + err.message; }
  });
}

// ─── Tag modal ─────────────────────────────────────────────────
function openTagModal(id){
  const existing = id ? state.tags.find(t => t.id === id) : null;
  openModal(
    '<h3>' + (existing ? 'Rediger tag' : 'Ny tag') + '</h3>' +
    '<form id="tagForm">' +
    '<label>Navn</label><input name="name" required maxlength="100" value="' + esc(existing?.name || '') + '">' +
    '<div class="msg" id="tagMsg"></div>' +
    '<footer>' +
      '<button type="button" class="btn secondary" data-close>Avbryt</button>' +
      '<button type="submit" class="btn">' + (existing ? 'Lagre' : 'Opprett') + '</button>' +
    '</footer></form>'
  );
  document.getElementById('tagForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(id ? '/admin/tags/' + id : '/admin/tags', { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ name: e.target.name.value.trim() }) });
      closeModal(); await load();
    } catch (err) { document.getElementById('tagMsg').textContent = 'Feil: ' + err.message; }
  });
}

// ─── Article modal (create + edit) ─────────────────────────────
async function openArticleModal(id){
  let existing = null;
  if (id) {
    try { const r = await api('/admin/posts/' + id); existing = r.post; } catch(e) { alert('Kunne ikke laste artikkel'); return; }
  }
  const categories = ['Ny løsning','Kundehistorie','Prompt-bibliotek','Bransje-tips','Nyheter'];
  const catOpts = categories.map(c => '<option value="' + esc(c) + '"' + (existing?.category === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('');
  const initial = {
    everyone: existing?.everyone || false,
    companyIds: (existing?.companies || []).map(c => c.id),
    tagIds:     (existing?.tags      || []).map(t => t.id),
  };

  openModal(
    '<h3>' + (existing ? 'Rediger artikkel' : 'Ny artikkel') + '</h3>' +
    '<form id="articleForm">' +
    '<label>Tittel</label><input name="title" required maxlength="200" value="' + esc(existing?.title || '') + '">' +
    '<div class="row">' +
      '<div><label>Kategori</label><select name="category"><option value="">—</option>' + catOpts + '</select></div>' +
      '<div><label>Lesetid (minutter)</label><input name="readingMinutes" type="number" min="1" max="60" value="' + (existing?.readingMinutes ?? 3) + '"></div>' +
    '</div>' +
    renderScopePicker('art', initial) +
    '<label style="display:flex;justify-content:space-between;align-items:center">Innhold (markdown støttes)' +
      '<label class="btn secondary sm" style="cursor:pointer;margin:0;text-transform:none;font-weight:500;letter-spacing:0;color:var(--accent)">' +
        'Importer .md fil' +
        '<input type="file" accept=".md,.markdown,text/markdown,text/plain" data-md-import style="display:none">' +
      '</label>' +
    '</label>' +
    '<textarea name="body" required>' + esc(existing?.body || '') + '</textarea>' +
    '<div class="toggle-row">' +
      '<input type="checkbox" id="art-publishNow" ' + (existing ? (existing.publishedAt ? 'checked' : '') : 'checked') + '>' +
      '<label for="art-publishNow">Publisert</label>' +
    '</div>' +
    '<div class="msg" id="articleMsg"></div>' +
    '<footer>' +
      '<button type="button" class="btn secondary" data-close>Avbryt</button>' +
      '<button type="submit" class="btn">' + (existing ? 'Lagre' : 'Opprett') + '</button>' +
    '</footer></form>',
    true
  );
  initScopePicker('art', initial);

  document.getElementById('articleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const scope = readScopePicker('art');
    const body = {
      kind: 'ARTICLE',
      title: f.title.value.trim(),
      body: f.body.value,
      category: f.category.value || null,
      readingMinutes: Number(f.readingMinutes.value) || null,
      publishNow: document.getElementById('art-publishNow').checked,
      everyone: scope.everyone,
      companyIds: scope.companyIds,
      tagIds: scope.tagIds,
    };
    try {
      await api(id ? '/admin/posts/' + id : '/admin/posts', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      closeModal(); await load();
    } catch (err) { document.getElementById('articleMsg').textContent = 'Feil: ' + err.message; }
  });
}

// ─── Course modal (create + edit, with inline module/lesson editor) ──
async function openCourseModal(id){
  let full = null;
  if (id) { try { const r = await api('/admin/courses/' + id); full = r.course; } catch(e){ alert('Kunne ikke laste kurs'); return; } }

  const initial = {
    everyone: full?.everyone || false,
    companyIds: (full?.companies || []).map(c => c.id),
    tagIds:     (full?.tags || []).map(t => t.id),
  };

  const modulesHtml = full ? (full.modules || []).map(m =>
    '<div class="module-block">' +
    '<div class="module-header">' +
      '<strong>#' + m.order + ' — ' + esc(m.title) + '</strong>' +
      '<span class="actions">' +
        '<button type="button" class="btn secondary sm" data-edit-module="' + m.id + '" data-course="' + full.id + '">Rediger</button> ' +
        '<button type="button" class="btn danger sm" data-delete-module="' + m.id + '" data-course="' + full.id + '">Slett</button>' +
      '</span>' +
    '</div>' +
    (m.lessons.length ? m.lessons.map(l =>
      '<div class="lesson-row">' +
        '<span>#' + (l.moduleOrder || '?') + ' — ' + esc(l.title) + (l.readingMinutes ? ' <span class="small-muted">· ' + l.readingMinutes + ' min</span>' : '') + '</span>' +
        '<span class="actions">' +
          '<button type="button" class="btn secondary sm" data-edit-lesson="' + l.id + '">Rediger</button> ' +
          '<button type="button" class="btn danger sm" data-delete-lesson="' + l.id + '">Slett</button>' +
        '</span>' +
      '</div>'
    ).join('') : '<div class="small-muted" style="padding:4px 8px">Ingen leksjoner i denne modulen.</div>') +
    '<div style="margin-top:8px"><button type="button" class="btn secondary sm" data-new-lesson-module="' + m.id + '">+ Ny leksjon</button></div>' +
    '</div>'
  ).join('') : '';

  openModal(
    '<h3>' + (full ? 'Rediger kurs' : 'Nytt kurs') + '</h3>' +
    '<form id="courseForm">' +
    '<label>Tittel</label><input name="title" required maxlength="200" value="' + esc(full?.title || '') + '">' +
    '<label>Beskrivelse</label><textarea name="description" style="min-height:60px">' + esc(full?.description || '') + '</textarea>' +
    renderScopePicker('course', initial) +
    '<div class="msg" id="courseMsg"></div>' +
    '<footer>' +
      '<button type="button" class="btn secondary" data-close>Avbryt</button>' +
      '<button type="submit" class="btn">' + (full ? 'Lagre kurs-info' : 'Opprett kurs') + '</button>' +
    '</footer></form>' +
    (full ? (
      '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">' +
      '<h3 style="font-size:14px;margin-bottom:10px">Moduler og leksjoner</h3>' +
      '<div class="course-view">' + (modulesHtml || '<div class="empty">Ingen moduler enda</div>') + '</div>' +
      '<button type="button" class="btn secondary sm" id="newModuleBtn">+ Ny modul</button>' +
      '</div>'
    ) : '<p class="small-muted" style="margin-top:12px">Moduler og leksjoner kan legges til etter at kurset er opprettet.</p>'),
    true
  );
  initScopePicker('course', initial);

  document.getElementById('courseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const scope = readScopePicker('course');
    const body = {
      title: f.title.value.trim(),
      description: f.description.value || null,
      everyone: scope.everyone,
      companyIds: scope.companyIds,
      tagIds: scope.tagIds,
    };
    try {
      const r = await api(id ? '/admin/courses/' + id : '/admin/courses', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      if (!id) { closeModal(); await load(); openCourseModal(r.course.id); }
      else { await load(); document.getElementById('courseMsg').textContent = 'Lagret ✓'; }
    } catch (err) { document.getElementById('courseMsg').textContent = 'Feil: ' + err.message; }
  });

  if (full) {
    document.getElementById('newModuleBtn').addEventListener('click', () => openModuleModal(full.id, null, full.modules.length + 1));
  }
}

// ─── Module modal ─────────────────────────────────────────────
async function openModuleModal(courseId, moduleId, suggestedOrder){
  let existing = null;
  if (moduleId) {
    try {
      const r = await api('/admin/courses/' + courseId);
      existing = (r.course.modules || []).find(m => m.id === moduleId) || null;
    } catch(e) { alert('Kunne ikke laste modul'); return; }
  }
  const initialTitle = existing ? existing.title : '';
  const initialOrder = existing ? existing.order : (suggestedOrder || 1);
  openModal(
    '<h3>' + (moduleId ? 'Rediger modul' : 'Ny modul') + '</h3>' +
    '<form id="moduleForm">' +
    '<label>Tittel</label><input name="title" required maxlength="200" value="' + esc(initialTitle) + '">' +
    '<label>Rekkefølge</label><input name="order" type="number" min="1" value="' + initialOrder + '" required>' +
    '<div class="msg" id="moduleMsg"></div>' +
    '<footer>' +
      '<button type="button" class="btn secondary" data-close>Avbryt</button>' +
      '<button type="submit" class="btn">' + (moduleId ? 'Lagre' : 'Opprett') + '</button>' +
    '</footer></form>'
  );
  document.getElementById('moduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { title: e.target.title.value.trim(), order: Number(e.target.order.value) };
    try {
      const url = moduleId ? '/admin/courses/' + courseId + '/modules/' + moduleId : '/admin/courses/' + courseId + '/modules';
      await api(url, { method: moduleId ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      closeModal(); await load(); openCourseModal(courseId);
    } catch (err) { document.getElementById('moduleMsg').textContent = 'Feil: ' + err.message; }
  });
}

// ─── Lesson modal (inside a course module) ─────────────────────
async function openLessonModal(id, moduleId){
  let existing = null;
  if (id) {
    try { const r = await api('/admin/posts/' + id); existing = r.post; } catch(e){ alert('Kunne ikke laste leksjon'); return; }
    moduleId = existing.module?.id || moduleId;
  }
  openModal(
    '<h3>' + (existing ? 'Rediger leksjon' : 'Ny leksjon') + '</h3>' +
    '<form id="lessonForm">' +
    '<label>Tittel</label><input name="title" required maxlength="200" value="' + esc(existing?.title || '') + '">' +
    '<div class="row">' +
      '<div><label>Rekkefølge i modul</label><input name="moduleOrder" type="number" min="1" value="' + (existing?.moduleOrder || 1) + '" required></div>' +
      '<div><label>Lesetid (minutter)</label><input name="readingMinutes" type="number" min="1" max="120" value="' + (existing?.readingMinutes ?? 5) + '"></div>' +
    '</div>' +
    '<label style="display:flex;justify-content:space-between;align-items:center">Innhold (markdown støttes)' +
      '<label class="btn secondary sm" style="cursor:pointer;margin:0;text-transform:none;font-weight:500;letter-spacing:0;color:var(--accent)">' +
        'Importer .md fil' +
        '<input type="file" accept=".md,.markdown,text/markdown,text/plain" data-md-import style="display:none">' +
      '</label>' +
    '</label>' +
    '<textarea name="body" required>' + esc(existing?.body || '') + '</textarea>' +
    '<div class="toggle-row">' +
      '<input type="checkbox" id="lesson-publishNow" ' + (existing ? (existing.publishedAt ? 'checked' : '') : 'checked') + '>' +
      '<label for="lesson-publishNow">Publisert</label>' +
    '</div>' +
    '<p class="small-muted">Leksjoner arver synlighet fra kurset de tilhører.</p>' +
    '<div class="msg" id="lessonMsg"></div>' +
    '<footer>' +
      '<button type="button" class="btn secondary" data-close>Avbryt</button>' +
      '<button type="submit" class="btn">' + (existing ? 'Lagre' : 'Opprett') + '</button>' +
    '</footer></form>',
    true
  );
  document.getElementById('lessonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = {
      kind: 'LESSON',
      title: f.title.value.trim(),
      body: f.body.value,
      readingMinutes: Number(f.readingMinutes.value) || null,
      moduleId,
      moduleOrder: Number(f.moduleOrder.value),
      publishNow: document.getElementById('lesson-publishNow').checked,
      everyone: true,
      companyIds: [],
      tagIds: [],
    };
    try {
      const courseId = state.courses.find(co => (state.posts.find(p => p.id === id)?.module?.courseId === co.id))?.id;
      await api(id ? '/admin/posts/' + id : '/admin/posts', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      closeModal(); await load();
    } catch (err) { document.getElementById('lessonMsg').textContent = 'Feil: ' + err.message; }
  });
}

// ─── Task modal (create + edit, with inline timeline editor) ──
function openTaskModal(id, prefill){
  const existing = id ? state.tasks.find(t => t.id === id) : null;
  const initialCompanyId = existing?.company?.id || prefill?.companyId || '';
  const companyOpts = state.companies.map(c => '<option value="' + c.id + '"' + (initialCompanyId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');

  const initial = {
    title: existing?.title || prefill?.title || '',
    descriptionMd: existing?.descriptionMd || prefill?.descriptionMd || '',
    priceOre: existing?.priceOre ?? null,
    priceKr: existing?.priceOre != null ? (existing.priceOre / 100) : '',
    status: existing?.status || 'NY',
    assigneeIds: (existing?.assignees || []).map(a => a.id),
    priceViewerIds: (existing?.priceViewers || []).map(pv => pv.id),
  };

  const timelineHtml = existing ? (
    '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">' +
    '<h3 style="font-size:14px;margin-bottom:10px">Tidslinje</h3>' +
    (existing.events.length ? existing.events.map(ev =>
      '<div class="module-block">' +
      '<div class="module-header">' +
        '<strong>' + esc(ev.header) + '</strong>' +
        '<span class="actions">' +
          '<span class="small-muted" style="margin-right:8px">' + fmtDate(ev.createdAt) + '</span>' +
          '<button type="button" class="btn danger sm" data-delete-event="' + ev.id + '" data-task="' + existing.id + '">Slett</button>' +
        '</span>' +
      '</div>' +
      (ev.body ? '<div class="body" style="padding:0 8px 6px;white-space:pre-wrap">' + esc(ev.body) + '</div>' : '') +
      (ev.comments && ev.comments.length ? '<div style="padding:6px 8px;border-top:1px dashed var(--border);font-size:12px">' +
        ev.comments.map(cm => '<div style="margin-bottom:4px"><strong>' + esc(cm.user.name) + ':</strong> ' + esc(cm.body) + ' <span class="small-muted">' + fmtDate(cm.createdAt) + '</span></div>').join('') +
      '</div>' : '') +
      '</div>'
    ).join('') : '<div class="empty">Ingen hendelser enda.</div>') +
    '<div style="margin-top:12px;padding:10px;border:1px solid var(--border);border-radius:6px">' +
      '<label>Ny tidslinje-hendelse</label>' +
      '<input id="newEventHeader" placeholder="Overskrift (hva ble gjort)" maxlength="200">' +
      '<textarea id="newEventBody" placeholder="Detaljer (valgfri)" style="min-height:60px;margin-top:6px"></textarea>' +
      '<button type="button" class="btn sm" id="addEventBtn" style="margin-top:8px">+ Legg til hendelse</button>' +
    '</div>' +
    '</div>'
  ) : '<p class="small-muted" style="margin-top:12px">Tidslinjen kan bygges ut etter at oppgaven er opprettet.</p>';

  openModal(
    '<h3>' + (existing ? 'Rediger oppgave' : 'Ny oppgave') + '</h3>' +
    '<form id="taskForm">' +
    '<label>Tittel</label><input name="title" required maxlength="120" value="' + esc(initial.title) + '">' +
    '<div class="row">' +
      '<div><label>Bedrift</label><select name="companyId" required' + (existing ? ' disabled' : '') + '>' +
        (existing ? '' : '<option value="">Velg...</option>') + companyOpts +
      '</select></div>' +
      '<div><label>Status</label><select name="status">' +
        ['NY','I_ARBEID','FERDIG'].map(s => '<option value="' + s + '"' + (initial.status === s ? ' selected' : '') + '>' + s + '</option>').join('') +
      '</select></div>' +
    '</div>' +
    '<div class="row">' +
      '<div><label>Pris (NOK, tom = ingen pris)</label><input name="priceKr" type="number" min="0" step="0.01" value="' + initial.priceKr + '"></div>' +
      '<div></div>' +
    '</div>' +
    '<label>Tildelt (hvem jobber med dette fra kundens side)</label><div id="taskAssigneePicker"></div>' +
    '<label style="margin-top:10px">Hvem kan se prisen (tom = ingen)</label><div id="taskPriceViewPicker"></div>' +
    '<label style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">Beskrivelse (markdown støttes)' +
      '<label class="btn secondary sm" style="cursor:pointer;margin:0;text-transform:none;font-weight:500;letter-spacing:0;color:var(--accent)">' +
        'Importer .md fil' +
        '<input type="file" accept=".md,.markdown,text/markdown,text/plain" data-md-import style="display:none">' +
      '</label>' +
    '</label>' +
    '<textarea name="body" style="min-height:140px">' + esc(initial.descriptionMd) + '</textarea>' +
    '<div class="msg" id="taskMsg"></div>' +
    '<footer>' +
      '<button type="button" class="btn secondary" data-close>Avbryt</button>' +
      '<button type="submit" class="btn">' + (existing ? 'Lagre' : 'Opprett') + '</button>' +
    '</footer></form>' +
    timelineHtml,
    true
  );

  // Company picker drives the assignee/viewer options
  function companyUsers(){
    const cid = document.querySelector('#taskForm [name="companyId"]').value;
    return state.users.filter(u => u.company?.id === cid && u.role !== 'ADMIN').map(u => ({ id: u.id, name: u.name }));
  }
  function refreshPeoplePickers(){
    const users = companyUsers();
    initChipPicker('taskAssigneePicker', users, initial.assigneeIds,
      (o, rm) => '<span class="chip chip-company"' + (rm ? '' : '') + '>' + esc(o.name) + (rm ? '<span class="chip-close" data-remove-tag="' + o.id + '">×</span>' : '') + '</span>');
    initChipPicker('taskPriceViewPicker', users, initial.priceViewerIds,
      (o, rm) => '<span class="chip chip-company">' + esc(o.name) + (rm ? '<span class="chip-close" data-remove-tag="' + o.id + '">×</span>' : '') + '</span>');
  }
  refreshPeoplePickers();
  if (!existing) {
    document.querySelector('#taskForm [name="companyId"]').addEventListener('change', () => {
      initial.assigneeIds = [];
      initial.priceViewerIds = [];
      refreshPeoplePickers();
    });
  }

  document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const assigneeUserIds = document.getElementById('taskAssigneePicker')._getSelectedIds();
    const priceViewerUserIds = document.getElementById('taskPriceViewPicker')._getSelectedIds();
    const priceKrRaw = f.priceKr.value.trim();
    const priceOre = priceKrRaw === '' ? null : Math.round(Number(priceKrRaw) * 100);

    try {
      if (existing) {
        await api('/admin/tasks/' + existing.id, { method: 'PATCH', body: JSON.stringify({
          title: f.title.value.trim(),
          descriptionMd: f.body.value,
          priceOre,
          status: f.status.value,
          assigneeUserIds,
          priceViewerUserIds,
        })});
      } else {
        const r = await api('/admin/tasks', { method: 'POST', body: JSON.stringify({
          companyId: f.companyId.value,
          title: f.title.value.trim(),
          descriptionMd: f.body.value,
          priceOre,
          status: f.status.value,
          assigneeUserIds,
          priceViewerUserIds,
        })});
        if (prefill && prefill.requestId) {
          try { await api('/admin/requests/' + prefill.requestId + '/link-task', { method: 'POST', body: JSON.stringify({ taskId: r.task.id }) }); } catch(_){}
        }
      }
      closeModal(); await load();
    } catch (err) { document.getElementById('taskMsg').textContent = 'Feil: ' + err.message; }
  });

  if (existing) {
    document.getElementById('addEventBtn').addEventListener('click', async () => {
      const header = document.getElementById('newEventHeader').value.trim();
      const body   = document.getElementById('newEventBody').value.trim();
      if (!header) { alert('Overskrift er påkrevd'); return; }
      try {
        await api('/admin/tasks/' + existing.id + '/events', { method: 'POST', body: JSON.stringify({ header, body }) });
        closeModal(); await load(); openTaskModal(existing.id);
      } catch (err) { alert('Feil: ' + err.message); }
    });
  }
}

// ─── Request thread modal ─────────────────────────────────────
function openRequestThread(id){
  const r = state.requests.find(x => x.id === id);
  if (!r) { alert('Fant ikke forespørsel'); return; }

  const commentsHtml = (r.comments || []).map(cm =>
    '<div style="margin-bottom:10px;padding:8px;background:var(--surface);border-radius:6px">' +
      '<div style="font-weight:600">' + esc(cm.user.name) + (cm.user.role === 'ADMIN' ? ' <span class="badge admin">admin</span>' : '') +
      ' <span class="small-muted" style="font-weight:400">' + fmtDate(cm.createdAt) + '</span></div>' +
      '<div style="white-space:pre-wrap;margin-top:4px">' + esc(cm.body) + '</div>' +
    '</div>'
  ).join('');

  openModal(
    '<h3>' + esc(r.title) + '</h3>' +
    '<div class="subtitle">' + esc(r.company || '') + ' · ' + esc(r.createdBy || '') + ' · ' + statusBadgeReq(r.status) + '</div>' +
    '<div style="padding:10px;background:var(--surface);border-radius:6px;margin:10px 0;white-space:pre-wrap">' + esc(r.description || '') + '</div>' +
    '<h4 style="font-size:13px;margin:12px 0 6px">Kommentarer</h4>' +
    (commentsHtml || '<div class="empty">Ingen kommentarer</div>') +
    '<form id="reqReplyForm" style="margin-top:10px">' +
      '<label>Svar</label>' +
      '<textarea name="body" required style="min-height:70px" placeholder="Skriv et svar..."></textarea>' +
      '<footer>' +
        '<button type="button" class="btn secondary" data-close>Lukk</button>' +
        '<button type="submit" class="btn">Send svar</button>' +
      '</footer>' +
    '</form>',
    true
  );

  document.getElementById('reqReplyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = e.target.body.value.trim();
    if (!body) return;
    try {
      await api('/admin/requests/' + id + '/comments', { method: 'POST', body: JSON.stringify({ body }) });
      closeModal(); await load();
    } catch (err) { alert('Feil: ' + err.message); }
  });
}

// ─── Solution modal ───────────────────────────────────────────
function openSolutionModal(){
  const companyOpts = state.companies.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
  openModal(
    '<h3>Ny oppgave</h3>' +
    '<form id="solForm">' +
    '<label>Navn</label><input name="name" required>' +
    '<label>Bedrift</label><select name="companyId" required><option value="">Velg...</option>' + companyOpts + '</select>' +
    '<label>Undertekst (valgfri)</label><input name="subtitle">' +
    '<label>Status</label><select name="status"><option value="ACTIVE">Aktiv</option><option value="INACTIVE">Inaktiv</option></select>' +
    '<div class="msg" id="solMsg"></div>' +
    '<footer><button type="button" class="btn secondary" data-close>Avbryt</button>' +
    '<button type="submit" class="btn">Opprett</button></footer></form>'
  );
  document.getElementById('solForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = {
      name: f.name.value.trim(),
      companyId: f.companyId.value,
      subtitle: f.subtitle.value || null,
      status: f.status.value,
    };
    try { await api('/admin/solutions', { method: 'POST', body: JSON.stringify(body) }); closeModal(); await load(); }
    catch (err) { document.getElementById('solMsg').textContent = 'Feil: ' + err.message; }
  });
}

// ─── Event delegation ─────────────────────────────────────────
document.addEventListener('click', async (e) => {
  const t = e.target;
  const open = t.getAttribute && t.getAttribute('data-open');
  if (open === 'companyModal') return openCompanyModal();
  if (open === 'userModal') return openUserModal();
  if (open === 'tagModal') return openTagModal();
  if (open === 'articleModal') return openArticleModal();
  if (open === 'courseModal') return openCourseModal();
  if (open === 'solutionModal') return openSolutionModal();
  if (open === 'taskModal') return openTaskModal();

  if (t.dataset.editUser) return openUserModal(t.dataset.editUser);
  if (t.dataset.editCompany) return openCompanyModal(t.dataset.editCompany);
  if (t.dataset.editTag) return openTagModal(t.dataset.editTag);
  if (t.dataset.editArticle) return openArticleModal(t.dataset.editArticle);
  if (t.dataset.editCourse) return openCourseModal(t.dataset.editCourse);
  if (t.dataset.editModule) return openModuleModal(t.dataset.course, t.dataset.editModule);
  if (t.dataset.newLessonModule) return openLessonModal(null, t.dataset.newLessonModule);
  if (t.dataset.editLesson) return openLessonModal(t.dataset.editLesson);
  if (t.dataset.editTask) return openTaskModal(t.dataset.editTask);
  if (t.dataset.openRequest) return openRequestThread(t.dataset.openRequest);

  if (t.dataset.promoteRequest) {
    if (!confirm('Promoter forespørselen til en oppgave? Forespørselen markeres som promotert.')) return;
    try {
      const r = await api('/admin/requests/' + t.dataset.promoteRequest + '/promote', { method: 'POST' });
      await load();
      openTaskModal(null, { ...r.prefill, requestId: r.requestId });
    } catch (err) { alert('Feil: ' + err.message); }
    return;
  }
  if (t.dataset.resolveRequest) {
    try { await api('/admin/requests/' + t.dataset.resolveRequest + '/status', { method: 'POST', body: JSON.stringify({ status: 'RESOLVED' }) }); await load(); }
    catch (err) { alert('Feil: ' + err.message); }
    return;
  }
  if (t.dataset.reopenRequest) {
    try { await api('/admin/requests/' + t.dataset.reopenRequest + '/status', { method: 'POST', body: JSON.stringify({ status: 'OPEN' }) }); await load(); }
    catch (err) { alert('Feil: ' + err.message); }
    return;
  }
  if (t.dataset.deleteTask) {
    if (!confirm('Slette oppgaven? Alle tidslinje-hendelser og kommentarer slettes.')) return;
    try { await api('/admin/tasks/' + t.dataset.deleteTask, { method: 'DELETE' }); await load(); } catch (err) { alert('Feil: ' + err.message); }
    return;
  }
  if (t.dataset.deleteEvent) {
    if (!confirm('Slette tidslinje-hendelsen?')) return;
    try { await api('/admin/tasks/' + t.dataset.task + '/events/' + t.dataset.deleteEvent, { method: 'DELETE' }); closeModal(); await load(); openTaskModal(t.dataset.task); } catch (err) { alert('Feil: ' + err.message); }
    return;
  }

  if (t.dataset.deleteCompany) {
    if (!confirm('Slette bedrift? Brukere mister tilknytning.')) return;
    try { await api('/admin/companies/' + t.dataset.deleteCompany, { method: 'DELETE' }); await load(); } catch (err) { alert('Feil: ' + err.message); }
  }
  if (t.dataset.deleteTag) {
    if (!confirm('Slette tag? Fjernes fra alle brukere, artikler og kurs.')) return;
    try { await api('/admin/tags/' + t.dataset.deleteTag, { method: 'DELETE' }); await load(); } catch (err) { alert('Feil: ' + err.message); }
  }
  if (t.dataset.deletePost) {
    if (!confirm('Slette dette innlegget?')) return;
    try { await api('/admin/posts/' + t.dataset.deletePost, { method: 'DELETE' }); await load(); } catch (err) { alert('Feil: ' + err.message); }
  }
  if (t.dataset.deleteLesson) {
    if (!confirm('Slette leksjonen?')) return;
    try { await api('/admin/posts/' + t.dataset.deleteLesson, { method: 'DELETE' }); await load(); } catch (err) { alert('Feil: ' + err.message); }
  }
  if (t.dataset.deleteCourse) {
    if (!confirm('Slette kurset? Alle moduler og leksjoner slettes.')) return;
    try { await api('/admin/courses/' + t.dataset.deleteCourse, { method: 'DELETE' }); await load(); } catch (err) { alert('Feil: ' + err.message); }
  }
  if (t.dataset.deleteModule) {
    if (!confirm('Slette modulen? Leksjoner løsrives.')) return;
    try { await api('/admin/courses/' + t.dataset.course + '/modules/' + t.dataset.deleteModule, { method: 'DELETE' }); await load(); openCourseModal(t.dataset.course); } catch (err) { alert('Feil: ' + err.message); }
  }
  if (t.dataset.deleteSolution) {
    if (!confirm('Slette løsning?')) return;
    try { await api('/admin/solutions/' + t.dataset.deleteSolution, { method: 'DELETE' }); await load(); } catch (err) { alert('Feil: ' + err.message); }
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.mdImport !== undefined && t.files && t.files[0]) {
    const file = t.files[0];
    const text = await file.text();
    const form = t.closest('form');
    const ta = form && form.querySelector('textarea[name="body"]');
    if (ta) {
      ta.value = text;
      if (!form.title.value && file.name) form.title.value = file.name.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]/g, ' ');
    }
    t.value = '';
  }
});

document.getElementById('userSearch').addEventListener('input', renderUsers);
document.getElementById('articleSearch').addEventListener('input', renderArticles);

document.getElementById('signout').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
  location.href = '/admin/sign-in';
});

load();
`;
