/* ═══════════════════════════════════════════════════════════════
   AKTOVKA – Aplikační logika
═══════════════════════════════════════════════════════════════ */
const TODAY = new Date('2026-06-20T09:12:00');

const state = {
  user: null,
  view: 'dnes',
  childFilter: 'all',
  channelFilter: 'all',
  openMsgId: null,
  thinking: false,
  calY: 2026, calM: 5,        // červen 2026 (0-indexed)
  calMode: window.innerWidth < 760 ? 'agenda' : 'month',
  conn: { forward: true, gmail: true, waShare: true, waBusiness: false, smsShare: true, autoCal: false },
};

/* ── Pomůcky ─────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MES_NOM = ['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec'];
const MES_GEN = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
const DNY_KR  = ['Ne','Po','Út','St','Čt','Pá','So'];
const DNY     = ['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'];

function child(id) { return CHILDREN.find(c => c.id === id); }
function evt(id) { return EVENTS.find(e => e.id === id); }
function msg(id) { return MESSAGES.find(m => m.id === id); }
function d0(date) { const x = new Date(date); x.setHours(0,0,0,0); return x; }

function relDay(dateStr) {
  const diff = Math.round((d0(dateStr + 'T00:00:00') - d0(TODAY)) / 86400000);
  if (diff === 0) return 'dnes';
  if (diff === 1) return 'zítra';
  if (diff === -1) return 'včera';
  const word = n => (n >= 2 && n <= 4 ? 'dny' : 'dní');
  if (diff > 0) return `za ${diff} ${word(diff)}`;
  return `před ${-diff} ${word(-diff)}`;
}
function fmtFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DNY[d.getDay()]} ${d.getDate()}. ${MES_GEN[d.getMonth()]}`;
}
function timeAgo(isoStr) {
  const diff = (TODAY - new Date(isoStr)) / 1000;
  if (diff < 90) return 'právě teď';
  if (diff < 3600) return `před ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `před ${Math.round(diff / 3600)} h`;
  const d = new Date(isoStr);
  if (Math.round(diff / 86400) === 1) return 'včera';
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

/* ── LOGIN ───────────────────────────────────── */
function fillLogin(u, p) { $('#lu').value = u; $('#lp').value = p; }
$('#login-form').addEventListener('submit', e => {
  e.preventDefault();
  const u = $('#lu').value.trim().toLowerCase();
  if (u.includes('kriz') || u.includes('petr') || u === '') {
    state.user = USERS.kriz;
    $('#login-screen').classList.add('hidden');
    if (localStorage.getItem('aktovka-onboarded')) enterApp();
    else startOnboarding();
  } else { $('#login-error').classList.remove('hidden'); }
});

function enterApp() {
  $('#onboarding').classList.add('hidden');
  $('#app').classList.remove('hidden');
  buildSidebar(); render();
}

/* ── SIDEBAR ─────────────────────────────────── */
const NAV = [
  { id: 'dnes', ic: '🏠', label: 'Dnes' },
  { id: 'schranka', ic: '📥', label: 'Schránka' },
  { id: 'kalendar', ic: '📅', label: 'Kalendář' },
  { id: 'deti', ic: '🧒', label: 'Děti' },
  { id: 'pripojeni', ic: '🔌', label: 'Připojení' },
];
function unreadCount() { return MESSAGES.filter(m => m.unread).length; }
function isRecognized(e) { const m = msg(e.sourceMsg); return m ? m.recognized : true; }
function newEventsCount() { return EVENTS.filter(e => !e.inCalendar && isRecognized(e)).length; }

function buildSidebar() {
  const u = state.user;
  const kids = CHILDREN.map(c => {
    const dim = c.active ? '' : 'dim';
    const active = state.childFilter === c.id ? 'active' : '';
    return `<div class="sb-kid ${active} ${dim}" style="--kidc:${c.color}" onclick="setChild('${c.id}')">
      <div class="av">${c.avatar}</div>
      <div><div class="nm">${esc(c.name)}</div><div class="cl">${esc(c.clsLabel)}</div></div>
    </div>`;
  }).join('');

  $('#sidebar').innerHTML = `
    <div class="sb-brand">
      <div class="sb-logo">🎒</div>
      <div class="sb-name">Aktovka<small>rodina Křížova</small></div>
    </div>
    <nav class="sb-nav">
      ${NAV.map(n => {
        const badge = n.id === 'schranka' && unreadCount() ? `<span class="badge">${unreadCount()}</span>`
          : n.id === 'kalendar' && newEventsCount() ? `<span class="badge">${newEventsCount()}</span>` : '';
        return `<a class="sb-item ${state.view === n.id ? 'active' : ''}" onclick="go('${n.id}')"><span class="ic">${n.ic}</span>${n.label}${badge}</a>`;
      }).join('')}
    </nav>
    <div class="sb-kids">
      <div class="sb-section-t">Moje děti</div>
      ${kids}
    </div>
    <div class="sb-foot">
      <div class="sb-avatar">${u.avatar}</div>
      <div><div class="nm">${esc(u.name)}</div><div class="rl">${esc(u.email)}</div></div>
    </div>`;

  buildMobileChrome();
}

/* Mobilní navigace: horní lišta + spodní tab bar (zrcadlí sidebar) */
function buildMobileChrome() {
  const tb = document.getElementById('topbar');
  const tab = document.getElementById('tabbar');
  if (tb) tb.innerHTML = `
    <div class="tb-brand"><div class="tb-logo">🎒</div><span>Aktovka</span></div>
    <div class="tb-avatar" onclick="go('pripojeni')">${state.user ? state.user.avatar : ''}</div>`;
  if (tab) tab.innerHTML = NAV.map(n => {
    const badge = n.id === 'schranka' && unreadCount() ? `<span class="tb-badge">${unreadCount()}</span>` : '';
    return `<button class="tab ${state.view === n.id ? 'active' : ''}" onclick="go('${n.id}')"><span class="tab-ic">${n.ic}</span>${badge}<span class="tab-l">${esc(n.label)}</span></button>`;
  }).join('');
}

function go(view) { state.view = view; state.openMsgId = null; buildSidebar(); render(); $('#main').scrollTop = 0; }

/* ── Filtrování dle dítěte ───────────────────── */
function evMatchesChild(e) { return state.childFilter === 'all' || e.childIds.includes(state.childFilter); }
function msgMatchesChild(m) {
  if (state.childFilter === 'all') return true;
  return m.eventIds.some(id => { const e = evt(id); return e && e.childIds.includes(state.childFilter); });
}

/* ── RENDER router ───────────────────────────── */
function render() {
  if (state.openMsgId) return renderMessageDetail();
  ({ dnes: renderDnes, schranka: renderSchranka, kalendar: renderKalendar, deti: renderDeti, pripojeni: renderPripojeni }[state.view])();
}

/* ═══════════════════════════════════════════ DNES ═══ */
function renderDnes() {
  const h = TODAY.getHours();
  const greet = h < 9 ? 'Dobré ráno' : h < 18 ? 'Dobrý den' : 'Dobrý večer';

  const calEvents = EVENTS.filter(e => e.inCalendar && evMatchesChild(e));
  const upcoming = calEvents
    .filter(e => d0(e.date + 'T00:00:00') >= d0(TODAY))
    .sort((a, b) => a.date.localeCompare(b.date));
  const weekEnd = d0(TODAY); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeek = upcoming.filter(e => d0(e.date + 'T00:00:00') < weekEnd);

  // k vyřízení – nedokončené úkoly napříč akcemi
  const tasks = [];
  EVENTS.filter(evMatchesChild).forEach(e => (e.todo || []).forEach(t => {
    if (!t.done) tasks.push({ ev: e, t });
  }));

  const newEv = EVENTS.filter(e => !e.inCalendar && isRecognized(e) && evMatchesChild(e));

  $('#main').innerHTML = `<div class="page fade-up">
    <div class="page-head hello-row">
      <div>
        <h1>${greet}, ${esc(state.user.firstName)} 👋</h1>
        <p>${DNY[TODAY.getDay()][0].toUpperCase() + DNY[TODAY.getDay()].slice(1)} ${TODAY.getDate()}. ${MES_GEN[TODAY.getMonth()]} · ${kidFilterLabel()}</p>
      </div>
      ${kidFilterChips()}
    </div>

    <div class="grid-stats">
      <div class="stat accent"><span class="ic">📅</span><div class="n">${thisWeek.length}</div><div class="l">akcí tento týden</div></div>
      <div class="stat"><span class="ic">✅</span><div class="n">${tasks.length}</div><div class="l">úkolů k vyřízení</div></div>
      <div class="stat"><span class="ic">📥</span><div class="n">${MESSAGES.filter(m => m.unread).length}</div><div class="l">nepřečtených zpráv</div></div>
      <div class="stat"><span class="ic">✨</span><div class="n">${newEv.length}</div><div class="l">nových návrhů akcí</div></div>
    </div>

    ${newEv.length ? `
      <div class="section-t2">✨ AI rozpoznala nové akce <span class="cnt">${newEv.length}</span></div>
      ${newEv.map(eventRowHTML).join('')}` : ''}

    <div class="section-t2">📌 Tento týden <span class="cnt">${thisWeek.length}</span></div>
    ${thisWeek.length ? thisWeek.map(eventRowHTML).join('')
      : `<div class="todo-card"><div class="todo-row"><span class="tl" style="color:var(--text-3)">Tento týden žádné další akce 🎉</span></div></div>`}

    ${tasks.length ? `
      <div class="section-t2">✅ K vyřízení <span class="cnt">${tasks.length}</span></div>
      <div class="todo-card">
        ${tasks.map(({ ev, t }) => {
          const kid = ev.childIds.length === 1 ? child(ev.childIds[0]) : null;
          return `<div class="todo-row" onclick="toggleTodo('${ev.id}','${t.id}',event)">
            <div class="tick">✓</div>
            <div><div class="tl">${esc(t.label)}</div></div>
            <div class="for"><span>${esc(ev.title)}</span>${kid ? `<span class="e">${kid.avatar}</span>` : ''}</div>
          </div>`;
        }).join('')}
      </div>` : ''}
  </div>`;
}

function kidFilterLabel() {
  if (state.childFilter === 'all') return 'všechny děti';
  const c = child(state.childFilter); return `${c.name} · ${c.clsLabel}`;
}
function kidFilterChips() {
  const all = `<button class="kf ${state.childFilter === 'all' ? 'active' : ''}" onclick="setChild('all')"><span class="e">👨‍👩‍👧‍👦</span>Vše</button>`;
  const kids = CHILDREN.filter(c => c.active).map(c =>
    `<button class="kf ${state.childFilter === c.id ? 'active' : ''}" onclick="setChild('${c.id}')"><span class="e">${c.avatar}</span>${esc(c.name)}</button>`
  ).join('');
  return `<div class="kidfilter">${all}${kids}</div>`;
}
function setChild(id) {
  state.childFilter = (id !== 'all' && state.childFilter === id) ? 'all' : id;
  buildSidebar(); render();
}

/* ── Řádek akce (sdílený) ───────────────────── */
function eventRowHTML(e) {
  const cat = CATEGORIES[e.category];
  const d = new Date(e.date + 'T00:00:00');
  const kids = e.childIds.filter(id => child(id)).map(id => `<div class="ev-kid" title="${esc(child(id).name)}">${child(id).avatar}</div>`).join('');
  const time = e.start ? `<span>🕒 ${e.start}${e.end ? '–' + e.end : ''}</span>` : (e.recurring ? `<span>🔁 ${esc(e.recurring)}</span>` : '');
  const loc = e.location ? `<span>📍 ${esc(e.location)}</span>` : '';

  let chip = '';
  if (!e.inCalendar) chip = `<span class="ev-chip chip-new">✨ nová akce</span>`;
  else if (e.cancelled) chip = `<span class="ev-chip chip-pay">zrušeno</span>`;
  else if (e.isDeadline) chip = `<span class="ev-chip chip-pay">${esc(e.deadlineLabel || 'do')} ${relDay(e.date)}</span>`;
  else if (e.needsConfirm) chip = `<span class="ev-chip chip-confirm">⚠ potvrdit</span>`;
  else chip = `<span class="ev-chip chip-ok">✓ v kalendáři</span>`;

  return `<div class="ev" onclick="openEvent('${e.id}')">
    <div class="ev-date">
      <div class="d">${d.getDate()}</div>
      <div class="m">${MES_NOM[d.getMonth()].slice(0, 3)}</div>
      <div class="wd">${DNY_KR[d.getDay()]}</div>
    </div>
    <div class="ev-body">
      <div class="ev-top">
        <span class="ev-cat" style="background:${cat.color}1a;color:${cat.color}">${cat.emoji} ${cat.label}</span>
        <span class="ev-title">${esc(e.title)}</span>
      </div>
      <div class="ev-meta">
        ${time}${loc}
        ${kids ? `<span class="ev-kids">${kids}</span>` : ''}
      </div>
    </div>
    <div class="ev-right">${chip}<span style="font-size:11px;color:var(--text-3);font-weight:700">${relDay(e.date)}</span></div>
  </div>`;
}

/* ── Úkoly ──────────────────────────────────── */
function toggleTodo(evId, tId, ev) {
  if (ev) ev.stopPropagation();
  const e = evt(evId); const t = e.todo.find(x => x.id === tId);
  t.done = !t.done;
  if (t.done) toast('Hotovo!', '✓', true);
  render();
}

/* ═══════════════════════════════════════════ SCHRÁNKA ═══ */
function renderSchranka() {
  const tabs = [['all', 'Vše', '📨'], ['whatsapp', 'WhatsApp', '💬'], ['email', 'E-mail', '✉️'], ['sms', 'SMS', '📱']];
  const list = MESSAGES
    .filter(m => state.channelFilter === 'all' || m.channel === state.channelFilter)
    .filter(msgMatchesChild)
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  $('#main').innerHTML = `<div class="page fade-up">
    <div class="page-head hello-row">
      <div><h1>Schránka</h1><p>Sjednocené zprávy ze všech kanálů · ${kidFilterLabel()}</p></div>
      ${kidFilterChips()}
    </div>
    <div class="inbox-tabs">
      ${tabs.map(([id, label, ic]) => {
        const c = id === 'all' ? MESSAGES.length : MESSAGES.filter(m => m.channel === id).length;
        return `<button class="itab ${state.channelFilter === id ? 'active' : ''}" onclick="setChannel('${id}')">${ic} ${label} <span class="c">${c}</span></button>`;
      }).join('')}
    </div>
    ${list.length ? list.map(msgRowHTML).join('') : `<div class="empty-state"><div class="big">📭</div><h3>Žádné zprávy v tomto filtru</h3></div>`}
  </div>`;
}
function setChannel(id) { state.channelFilter = id; render(); }

function avatarHTML(m, size) {
  const ch = CHANNELS[m.channel];
  const isEmoji = !/^[A-ZÁ-Ž]{2}$/.test(m.avatar);
  const style = isEmoji ? `background:${ch.bg};color:${ch.color};font-size:20px` : `background:${ch.color}`;
  return `<div class="msg-av" style="${style};${size ? `width:${size}px;height:${size}px` : ''}">
    ${esc(m.avatar)}
    <div class="ch" style="color:${ch.color}">${ch.icon}</div>
  </div>`;
}

function msgRowHTML(m) {
  const aiEvents = m.eventIds.map(evt).filter(Boolean);
  let foot;
  if (!m.recognized) {
    foot = `<button class="btn-recognize" onclick="recognize('${m.id}',event)">✨ Rozpoznat akci</button>`;
  } else if (aiEvents.length) {
    foot = aiEvents.map(e => {
      const cat = CATEGORIES[e.category];
      return `<span class="ai-chip">✨ ${cat.emoji} ${esc(e.title)}</span>`;
    }).join('');
  } else {
    foot = `<span class="ai-chip none">✨ Žádná akce k zařazení</span>`;
  }

  return `<div class="msg ${m.unread ? 'unread' : ''}" onclick="openMessage('${m.id}')">
    ${avatarHTML(m)}
    <div class="msg-main">
      <div class="msg-top">
        <span class="msg-from">${esc(m.fromName)}</span>
        <span class="msg-time">${timeAgo(m.time)}</span>
      </div>
      <div class="msg-meta">${esc(m.fromMeta)}</div>
      ${m.subject ? `<div class="msg-subj">${esc(m.subject)}</div>` : ''}
      <div class="msg-prev">${esc(m.preview)}</div>
      <div class="msg-foot">${foot}</div>
    </div>
  </div>`;
}

/* ── Detail zprávy + extrakce ───────────────── */
function openMessage(id) { state.openMsgId = id; const m = msg(id); m.unread = false; buildSidebar(); render(); $('#main').scrollTop = 0; }
function closeMessage() { state.openMsgId = null; state.thinking = false; render(); }

function recognize(id, ev) {
  if (ev) ev.stopPropagation();
  state.openMsgId = id; state.thinking = true;
  msg(id).unread = false;
  buildSidebar(); render();
  const steps = ['Čtu obsah zprávy…', 'Hledám datum, místo a čas…', 'Přiřazuji k vašim dětem…', 'Sestavuji akci…'];
  let i = 0;
  const tick = setInterval(() => { i++; if ($('#think-sub') && steps[i]) $('#think-sub').textContent = steps[i]; }, 480);
  setTimeout(() => {
    clearInterval(tick);
    msg(id).recognized = true; state.thinking = false;
    render();
    toast('Akce rozpoznána a připravena', '✨');
  }, 2000);
}

function renderMessageDetail() {
  const m = msg(state.openMsgId);
  const events = m.eventIds.map(evt).filter(Boolean);

  let right;
  if (state.thinking) {
    right = `<div class="md-extract"><div class="thinking">
      <div class="orb"></div>
      <div class="tt">Aktovka analyzuje zprávu</div>
      <div class="ts" id="think-sub">Čtu obsah zprávy…</div>
    </div></div>`;
  } else if (!m.recognized) {
    right = `<div class="md-extract"><div class="empty-extract">
      <div class="big">✨</div>
      <div style="font-weight:700;color:var(--text-2);margin-bottom:6px">Zatím nerozpoznáno</div>
      <div style="font-size:13px;margin-bottom:18px">Nechte Aktovku z této zprávy vytáhnout akci.</div>
      <button class="btn btn-primary" style="flex:none;display:inline-flex" onclick="recognize('${m.id}')">✨ Rozpoznat akci</button>
    </div></div>`;
  } else if (events.length) {
    right = events.map(e => extractCardHTML(e, m)).join('');
  } else {
    right = `<div class="md-extract"><div class="empty-extract">
      <div class="big">📭</div>
      <div style="font-weight:700;color:var(--text-2);margin-bottom:6px">Žádná akce k zařazení</div>
      <div style="font-size:13px">Tahle zpráva je informativní – nic se nepřidává do kalendáře.</div>
    </div></div>`;
  }

  // zvýraznění frází v originálu
  let body = esc(m.body);
  if (m.recognized) {
    const phrases = events.flatMap(e => e.phrases || []);
    phrases.forEach(p => {
      const safe = esc(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      body = body.replace(new RegExp(safe, 'g'), `<mark>${esc(p)}</mark>`);
    });
  }

  $('#main').innerHTML = `<div class="page fade-up">
    <button class="md-back" onclick="closeMessage()">← Zpět do schránky</button>
    <div class="md-split">
      <div class="md-orig">
        <div class="md-orig-head">
          ${avatarHTML(m)}
          <div><div class="msg-from">${esc(m.fromName)}</div><div class="msg-meta">${esc(m.fromMeta)} · ${timeAgo(m.time)}</div></div>
        </div>
        <div class="md-orig-body">
          ${m.subject ? `<div class="md-subj">${esc(m.subject)}</div>` : ''}
          <div class="md-text">${body}</div>
        </div>
      </div>
      <div>${right}</div>
    </div>
  </div>`;
}

/* ── Karta extrakce (na detailu zprávy) ─────── */
function extractCardHTML(e, m) {
  const cat = CATEGORIES[e.category];
  return `<div class="md-extract" style="margin-bottom:16px">
    <div class="md-ex-head">
      <div class="spark">✨</div>
      <div><div class="t">Návrh akce</div><div class="s">automaticky z ${CHANNELS[m.channel].label.toLowerCase()}u</div></div>
      <div class="conf">${e.confidence}% jistota</div>
    </div>
    <div class="md-ex-body">
      <div class="fld">
        <div class="fi" style="background:${cat.color}1a">${cat.emoji}</div>
        <div class="fc"><div class="fk">${cat.label}</div><div class="fv lg">${esc(e.title)}</div></div>
      </div>
      ${detailFieldsHTML(e)}
      ${perChildHTML(e)}
      ${checklistHTML(e)}
    </div>
    <div class="md-actions">
      ${e.inCalendar
        ? `<button class="btn btn-primary done" onclick="openEvent('${e.id}')">✓ V kalendáři – otevřít</button>`
        : `<button class="btn btn-primary" onclick="addToCalendar('${e.id}')">📅 Přidat do kalendáře</button>`}
      <button class="btn btn-ghost" onclick="shareEvent('${e.id}')" title="Sdílet s ${esc(state.user.partner)}">📲</button>
    </div>
  </div>`;
}

/* ── Společné detailní sekce (datum, místo, …) ── */
function detailFieldsHTML(e) {
  const d = new Date(e.date + 'T00:00:00');
  const when = `${DNY[d.getDay()]} ${d.getDate()}. ${MES_GEN[d.getMonth()]}` +
    (e.start ? ` · ${e.start}${e.end ? '–' + e.end : ''}` : '') +
    (e.recurring ? ` · ${e.recurring}` : '');
  let rows = `<div class="fld"><div class="fi">📅</div><div class="fc"><div class="fk">Kdy</div><div class="fv">${esc(when)} <span style="color:var(--brand-deep);font-weight:700">(${relDay(e.date)})</span></div></div></div>`;
  if (e.location) rows += `<div class="fld"><div class="fi">📍</div><div class="fc"><div class="fk">Kde</div><div class="fv">${esc(e.location)}</div>${e.address ? `<div style="font-size:12.5px;color:var(--text-2);margin-top:1px">${esc(e.address)}</div>` : ''}</div></div>`;
  if (e.transport) rows += `<div class="fld"><div class="fi">🚌</div><div class="fc"><div class="fk">Doprava</div><div class="fv" style="font-weight:600;font-size:13px">${esc(e.transport)}</div></div></div>`;
  if (e.dress) rows += `<div class="fld"><div class="fi">👕</div><div class="fc"><div class="fk">Jak oblečené</div><div class="fv">${esc(e.dress)}</div></div></div>`;
  if (e.money) rows += `<div class="fld"><div class="fi">💰</div><div class="fc"><div class="fk">${e.isDeadline ? 'Platba' : 'Peníze / kapesné'}</div><div class="fv">${esc(e.money)}</div></div></div>`;
  if (e.food) rows += `<div class="fld"><div class="fi">🥪</div><div class="fc"><div class="fk">Svačina</div><div class="fv" style="font-weight:600;font-size:13px">${esc(e.food)}</div></div></div>`;
  if (e.makeupDate) rows += `<div class="fld"><div class="fi">🔄</div><div class="fc"><div class="fk">Náhrada</div><div class="fv">${fmtFull(e.makeupDate)}</div></div></div>`;
  return rows;
}

function perChildHTML(e) {
  const ids = e.childIds.filter(id => (state.childFilter === 'all' || id === state.childFilter) && child(id) && e.perChild && e.perChild[id]);
  if (!ids.length) return '';
  const rows = ids.map(id => {
    const c = child(id); const p = e.perChild[id];
    const tag = p.retTag === 'dříve' ? '<span class="tag-ret driv">dříve</span>'
      : p.retTag === 'později' ? '<span class="tag-ret poz">později</span>' : '';
    return `<div class="pc-row">
      <div class="pc-av" style="--kidc:${c.color}">${c.avatar}</div>
      <div class="pc-info">
        <div class="pc-name">${esc(c.name)}<span class="cl">${esc(c.clsLabel)}</span></div>
        <div class="pc-lines">
          <div class="pc-line"><span class="k">Sraz</span><b>${esc(p.meet)}</b></div>
          ${p.depart ? `<div class="pc-line"><span class="k">Odjezd</span>${esc(p.depart)}</div>` : ''}
          <div class="pc-line"><span class="k">Dozor</span>${esc(p.escort)}</div>
          <div class="pc-line"><span class="k">Návrat</span>${esc(p.ret)}${tag}</div>
        </div>
      </div>
    </div>`;
  }).join('');
  return `<div style="padding:14px 20px 4px"><div class="fk" style="font-size:11px;font-weight:800;color:var(--brand-deep);text-transform:uppercase;letter-spacing:.06em">✨ Pro vaše děti – přizpůsobeno třídě</div></div>
    <div class="pc">${rows}</div>`;
}

function checklistHTML(e) {
  if (!e.bring || !e.bring.length) return '';
  return `<div style="padding:8px 20px 2px"><div class="fk" style="font-size:11px;font-weight:800;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em">🎒 Co s sebou</div></div>
    <div class="chk">${e.bring.map(b => `<span>✔ ${esc(b)}</span>`).join('')}</div>`;
}

/* ── Akce na akci ───────────────────────────── */
function addToCalendar(id) {
  const e = evt(id); e.inCalendar = true;
  buildSidebar(); render();
  toast('Přidáno do kalendáře', '📅');
}
function shareEvent(id) { toast(`Odesláno: ${state.user.partner}`, '📲'); }
function confirmEvent(id) { const e = evt(id); e.needsConfirm = false; closeDrawer(); render(); toast('Účast potvrzena', '✓', true); }

/* ═══════════════════════════════════════════ KALENDÁŘ ═══ */
function renderKalendar() {
  $('#main').innerHTML = `<div class="page fade-up">
    <div class="page-head hello-row">
      <div><h1>Kalendář</h1><p>Všechny akce na jednom místě · ${kidFilterLabel()}</p></div>
      ${kidFilterChips()}
    </div>
    <div class="cal-head">
      <div class="cal-title">${MES_NOM[state.calM][0].toUpperCase() + MES_NOM[state.calM].slice(1)} ${state.calY}</div>
      <div class="cal-nav">
        <button onclick="calMove(-1)">‹</button>
        <button onclick="calToday()">dnes</button>
        <button onclick="calMove(1)">›</button>
      </div>
      <div class="cal-toggle">
        <button class="${state.calMode === 'month' ? 'active' : ''}" onclick="setCalMode('month')">Měsíc</button>
        <button class="${state.calMode === 'agenda' ? 'active' : ''}" onclick="setCalMode('agenda')">Seznam</button>
      </div>
    </div>
    ${state.calMode === 'month' ? calMonthHTML() : calAgendaHTML()}
  </div>`;
}
function calMove(d) { state.calM += d; if (state.calM < 0) { state.calM = 11; state.calY--; } if (state.calM > 11) { state.calM = 0; state.calY++; } render(); }
function calToday() { state.calY = TODAY.getFullYear(); state.calM = TODAY.getMonth(); render(); }
function setCalMode(m) { state.calMode = m; render(); }

function eventsOn(dateStr) {
  return EVENTS.filter(e => e.inCalendar && e.date === dateStr && evMatchesChild(e));
}

function calMonthHTML() {
  const first = new Date(state.calY, state.calM, 1);
  let offset = (first.getDay() + 6) % 7;          // pondělí = 0
  const start = new Date(state.calY, state.calM, 1 - offset);
  const daysTotal = Math.ceil((offset + new Date(state.calY, state.calM + 1, 0).getDate()) / 7) * 7;

  let cells = '';
  for (let i = 0; i < daysTotal; i++) {
    const dt = new Date(start); dt.setDate(start.getDate() + i);
    const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const out = dt.getMonth() !== state.calM ? 'out' : '';
    const today = dt.toDateString() === TODAY.toDateString() ? 'today' : '';
    const evs = eventsOn(ds);
    const shown = evs.slice(0, 3).map(e => {
      const cat = CATEGORIES[e.category];
      return `<div class="cal-ev" style="background:${cat.color}1a;color:${cat.color}" onclick="event.stopPropagation();openEvent('${e.id}')">${cat.emoji} ${esc(e.title)}</div>`;
    }).join('');
    const more = evs.length > 3 ? `<div class="cal-more">+${evs.length - 3} další</div>` : '';
    cells += `<div class="cal-cell ${out} ${today}"><div class="cal-dn">${dt.getDate()}</div>${shown}${more}</div>`;
  }

  return `<div class="cal-grid">
    <div class="cal-wd">${['Po','Út','St','Čt','Pá','So','Ne'].map(d => `<div>${d}</div>`).join('')}</div>
    <div class="cal-days">${cells}</div>
  </div>`;
}

function calAgendaHTML() {
  const list = EVENTS.filter(e => e.inCalendar && evMatchesChild(e))
    .filter(e => d0(e.date + 'T00:00:00') >= d0(TODAY))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start || '').localeCompare(b.start || ''));
  if (!list.length) return `<div class="empty-state"><div class="big">🗓️</div><h3>Žádné nadcházející akce</h3></div>`;

  const byDay = {};
  list.forEach(e => (byDay[e.date] = byDay[e.date] || []).push(e));
  return Object.keys(byDay).sort().map(date => {
    const d = new Date(date + 'T00:00:00');
    return `<div class="agenda-day">
      <div class="agenda-dh">
        <span class="dd">${d.getDate()}. ${MES_GEN[d.getMonth()]}</span>
        <span class="dw">${DNY[d.getDay()]}</span>
        <span class="rel">${relDay(date)}</span>
      </div>
      ${byDay[date].map(eventRowHTML).join('')}
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════ DĚTI ═══ */
function renderDeti() {
  const cards = CHILDREN.map(c => {
    const evs = EVENTS.filter(e => e.inCalendar && e.childIds.includes(c.id) && d0(e.date + 'T00:00:00') >= d0(TODAY));
    const tasks = EVENTS.filter(e => e.childIds.includes(c.id)).flatMap(e => e.todo || []).filter(t => !t.done).length;
    return `<div class="kid-card">
      <div class="kid-banner" style="background:linear-gradient(135deg,${c.color},${c.color}99)"></div>
      <div class="kid-av-lg" style="border-color:${c.color}33">${c.avatar}</div>
      <div class="kid-body">
        <div class="kid-name">${esc(c.full)}</div>
        <div class="kid-cls">${esc(c.clsLabel)}</div>
        <div class="kid-teacher">🧑‍🏫 ${esc(c.teacher)}</div>
        ${c.active ? `<div class="kid-stats">
          <div class="ks"><div class="n">${evs.length}</div><div class="l">akcí</div></div>
          <div class="ks"><div class="n">${tasks}</div><div class="l">úkolů</div></div>
        </div>` : `<div class="kid-soon">🌱 ${esc(c.startsNote)}</div>`}
      </div>
    </div>`;
  }).join('');

  $('#main').innerHTML = `<div class="page fade-up">
    <div class="page-head"><h1>Moje děti</h1><p>Profily a jejich akce</p></div>
    <div class="kids-grid">${cards}</div>
  </div>`;
}

/* ═══════════════════════════════════════════ PŘIPOJENÍ KANÁLŮ ═══ */
const FORWARD_ADDR = 'kriz@in.aktovka.cz';

function sw(key) { return `<button class="sw ${state.conn[key] ? 'on' : ''}" onclick="toggleConn('${key}')" aria-label="přepínač"><span class="kn"></span></button>`; }
function toggleConn(key) {
  state.conn[key] = !state.conn[key];
  const labels = { forward: 'Přeposílání', gmail: 'Gmail schránka', waShare: 'Sdílení z WhatsAppu', smsShare: 'Sdílení z SMS', autoCal: 'Automatický kalendář' };
  toast(`${labels[key] || 'Nastavení'}: ${state.conn[key] ? 'zapnuto' : 'vypnuto'}`, state.conn[key] ? '✓' : '○', state.conn[key]);
  render();
}
function copyForward() {
  if (navigator.clipboard) navigator.clipboard.writeText(FORWARD_ADDR).catch(() => {});
  toast('Adresa zkopírována', '📋', true);
}
function inviteSchool() { toast('Pozvánka škole odeslána', '✉️', true); }

function renderPripojeni() {
  const c = state.conn;
  const autoCount = (c.forward || c.gmail ? 1 : 0);   // e-mail = jediný plně automatický

  $('#main').innerHTML = `<div class="page fade-up">
    <div class="page-head"><h1>Připojení kanálů</h1><p>Odkud Aktovka sbírá zprávy o akcích</p></div>

    <button class="onb-replay" onclick="startOnboarding()">▶ Spustit průvodce připojením</button>

    <div class="conn-summary">
      <div class="cs-item"><span class="cs-ic" style="background:var(--mail-bg);color:var(--mail)">✉️</span><div><div class="cs-n">Automaticky</div><div class="cs-l">E-mail běží sám</div></div></div>
      <div class="cs-sep"></div>
      <div class="cs-item"><span class="cs-ic" style="background:var(--wa-bg);color:var(--wa)">💬</span><div><div class="cs-n">1 klepnutím</div><div class="cs-l">WhatsApp přes Sdílet</div></div></div>
      <div class="cs-sep"></div>
      <div class="cs-item"><span class="cs-ic" style="background:var(--sms-bg);color:var(--sms)">📱</span><div><div class="cs-n">1 klepnutím</div><div class="cs-l">SMS přes Sdílet</div></div></div>
    </div>

    <!-- E-MAIL -->
    <div class="conn-card">
      <div class="conn-head">
        <div class="conn-icon" style="background:var(--mail-bg)">✉️</div>
        <div class="conn-h-main"><div class="conn-name">E-mail</div><div class="conn-desc">Hlavní zdroj — sem chodí většina oficiálních zpráv ze školy.</div></div>
        <div class="conn-status ${(c.forward || c.gmail) ? 'ok' : 'off'}">${(c.forward || c.gmail) ? '✓ Připojeno' : 'Vypnuto'}</div>
      </div>
      <div class="conn-methods">
        <div class="conn-method">
          <div class="cm-ic">📨</div>
          <div class="cm-main">
            <div class="cm-t">Přeposílací adresa</div>
            <div class="cm-s">Ve škole nebo ve své schránce nastavte přeposílání sem.</div>
            <div class="copy-field"><code>${FORWARD_ADDR}</code><button class="copy-btn" onclick="copyForward()">Kopírovat</button></div>
          </div>
          ${sw('forward')}
        </div>
        <div class="conn-method">
          <div class="cm-ic">🅖</div>
          <div class="cm-main">
            <div class="cm-t">Připojená schránka <span class="cm-tag">Gmail</span></div>
            <div class="cm-s">petr.kriz@gmail.com · naposledy přijato před 14 min</div>
          </div>
          ${sw('gmail')}
        </div>
        <button class="conn-add" onclick="toast('Otevře se přihlášení k poskytovateli','✉️')">＋ Připojit další schránku (Outlook, iCloud, IMAP)</button>
      </div>
    </div>

    <!-- WHATSAPP -->
    <div class="conn-card">
      <div class="conn-head">
        <div class="conn-icon" style="background:var(--wa-bg)">💬</div>
        <div class="conn-h-main"><div class="conn-name">WhatsApp</div><div class="conn-desc">Skupiny rodičů a školní kanály.</div></div>
        <div class="conn-status ${c.waBusiness ? 'ok' : 'warn'}">${c.waBusiness ? '✓ Automaticky' : '◐ Přes sdílení'}</div>
      </div>
      <div class="conn-methods">
        <div class="conn-method">
          <div class="cm-ic">📲</div>
          <div class="cm-main">
            <div class="cm-t">Sdílení do Aktovky</div>
            <div class="cm-s">Podržte zprávu ve WhatsAppu → <b>Sdílet</b> → <b>Aktovka</b>.</div>
            ${shareStepsHTML('WhatsApp')}
          </div>
          ${sw('waShare')}
        </div>
        <div class="conn-method">
          <div class="cm-ic">🏫</div>
          <div class="cm-main">
            <div class="cm-t">Školní kanál <span class="cm-tag">Business API</span></div>
            <div class="cm-s">Pokud škola zavede oficiální WhatsApp kanál, zprávy chodí samy.</div>
          </div>
          <button class="cm-btn" onclick="inviteSchool()">Pozvat školu</button>
        </div>
      </div>
    </div>

    <!-- SMS -->
    <div class="conn-card">
      <div class="conn-head">
        <div class="conn-icon" style="background:var(--sms-bg)">📱</div>
        <div class="conn-h-main"><div class="conn-name">SMS</div><div class="conn-desc">Krátké zprávy z aplikace Zprávy.</div></div>
        <div class="conn-status warn">◐ Jen přes sdílení</div>
      </div>
      <div class="conn-methods">
        <div class="ios-note">🔒 Apple z důvodu soukromí nedovolí žádné aplikaci číst SMS automaticky. Proto se přidávají sdílením — Aktovka uvidí jen to, co jí pošlete.</div>
        <div class="conn-method">
          <div class="cm-ic">📲</div>
          <div class="cm-main">
            <div class="cm-t">Sdílení ze Zpráv</div>
            <div class="cm-s">Podržte SMS → <b>Sdílet</b> → <b>Aktovka</b>.</div>
            ${shareStepsHTML('Zprávy')}
          </div>
          ${sw('smsShare')}
        </div>
      </div>
    </div>

    <!-- PŘEDVOLBY -->
    <div class="section-t2">⚙️ Předvolby</div>
    <div class="conn-card">
      <div class="conn-methods">
        <div class="conn-method">
          <div class="cm-ic">📅</div>
          <div class="cm-main">
            <div class="cm-t">Automaticky přidávat do kalendáře</div>
            <div class="cm-s">Rozpoznané akce s vysokou jistotou se přidají bez potvrzování.</div>
          </div>
          ${sw('autoCal')}
        </div>
      </div>
    </div>

    <div class="privacy-note">🛡️ <b>Vaše soukromí.</b> Aktovka zpracovává jen zprávy, které jí pošlete nebo z napojené školní schránky. Nečte nic dalšího ve vašem telefonu.</div>
  </div>`;
}

function shareStepsHTML(app) {
  return `<div class="share-steps">
    <div class="ss"><span class="ss-n">1</span>${esc(app)}: podržet zprávu</div>
    <div class="ss-arr">→</div>
    <div class="ss"><span class="ss-n">2</span>Sdílet</div>
    <div class="ss-arr">→</div>
    <div class="ss"><span class="ss-n">3</span>🎒 Aktovka</div>
  </div>`;
}

/* ═══════════════════════════════════════════ ONBOARDING ═══ */
function startOnboarding() {
  state.onboarding = {
    step: 0,
    kids: CHILDREN.filter(c => c.active).map(c => ({ id: c.id, name: c.name, cls: c.cls, avatar: c.avatar, color: c.color })),
    emailConnected: false, waFollowed: false, adding: false, revealed: false, _sched: false,
  };
  $('#login-screen').classList.add('hidden');
  $('#app').classList.add('hidden');
  $('#onboarding').classList.remove('hidden');
  renderOnboarding();
}
function finishOnboarding() {
  localStorage.setItem('aktovka-onboarded', '1');
  state.onboarding = null;
  enterApp();
}
function onbNext() { state.onboarding.step++; $('#onboarding').scrollTop = 0; renderOnboarding(); }
function onbBack() { if (state.onboarding.step > 0) { state.onboarding.step--; renderOnboarding(); } }
function onbConnectEmail() { state.onboarding.emailConnected = true; renderOnboarding(); toast('Gmail připojen', '✓', true); }
function onbFollowWa() { state.onboarding.waFollowed = true; renderOnboarding(); toast('Sledujete školní kanál', '✓', true); }
function onbShowAdd() { state.onboarding.adding = true; renderOnboarding(); setTimeout(() => $('#onb-kid-name') && $('#onb-kid-name').focus(), 30); }
function onbAddKid() {
  const n = ($('#onb-kid-name').value || '').trim();
  const c = ($('#onb-kid-cls').value || '').trim();
  if (!n) { $('#onb-kid-name').focus(); return; }
  const colors = ['#ec4899', '#06b6d4', '#f97316', '#22c55e'];
  state.onboarding.kids.push({ id: 'x' + Date.now(), name: n, cls: c || '?', avatar: '🧒', color: colors[state.onboarding.kids.length % colors.length] });
  state.onboarding.adding = false;
  renderOnboarding();
}
function onbRemoveKid(i) { state.onboarding.kids.splice(i, 1); renderOnboarding(); }

function renderOnboarding() {
  const o = state.onboarding;
  const steps = [obStepSchool, obStepKids, obStepConnect, obStepDone];
  const progress = `<div class="onb-progress">${[0, 1, 2].map(i => `<div class="onb-bar ${o.step >= i ? 'on' : ''}"></div>`).join('')}</div>`;
  const brand = `<div class="onb-brand"><div class="lg">🎒</div><b>Aktovka</b></div>`;
  $('#onboarding').innerHTML = `<div class="onb-inner fade-up">${brand}${o.step < 3 ? progress : ''}${steps[o.step]()}</div>`;
  if (o.step === 3 && !o.revealed && !o._sched) {
    o._sched = true;
    setTimeout(() => { if (state.onboarding) { state.onboarding.revealed = true; renderOnboarding(); } }, 1900);
  }
}

function obStepSchool() {
  return `
    <div class="onb-h">Která je vaše škola?</div>
    <div class="onb-sub">Najdeme ji a propojíme, co půjde automaticky.</div>
    <div class="onb-body">
      <div class="onb-search">🔎 Hledat školu podle názvu nebo města…</div>
      <div class="onb-school">
        <div class="onb-school-ic">🏫</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:15.5px">ZŠ Compass</div>
          <div style="font-size:13px;color:var(--text-2)">Praha 4 – Kunratice</div>
          <div class="onb-badge-ok" style="margin-top:8px">✓ Propojená škola</div>
        </div>
        <div class="onb-check">✓</div>
      </div>
      <div class="onb-note">💜 Zprávy od propojené školy chodí do Aktovky samy — bez jakéhokoli nastavování.</div>
    </div>
    <div class="onb-foot">
      <button class="onb-btn" onclick="onbNext()">Pokračovat</button>
      <button class="onb-skip" onclick="finishOnboarding()">Přeskočit zatím</button>
    </div>`;
}

function obStepKids() {
  const o = state.onboarding;
  const rows = o.kids.map((k, i) => `<div class="onb-kid">
      <div class="onb-kid-av" style="--kidc:${k.color}">${k.avatar}</div>
      <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:15px">${esc(k.name)}</div><div style="font-size:12.5px;color:var(--text-2)">${esc(k.cls)} třída</div></div>
      <button class="onb-x" onclick="onbRemoveKid(${i})" aria-label="odebrat">✕</button>
    </div>`).join('');
  const add = o.adding
    ? `<div class="onb-addkid">
         <input id="onb-kid-name" placeholder="Jméno" autocomplete="off" />
         <input id="onb-kid-cls" placeholder="Třída (4.)" style="max-width:96px" autocomplete="off" />
         <button class="onb-add-go" onclick="onbAddKid()">Přidat</button>
       </div>`
    : `<button class="onb-addrow" onclick="onbShowAdd()">＋ Přidat dítě</button>`;
  return `
    <div class="onb-h">Kdo u vás chodí do školy?</div>
    <div class="onb-sub">Podle třídy vám řekneme přesně, co platí pro <em>vaše</em> dítě.</div>
    <div class="onb-body">${rows}${add}</div>
    <div class="onb-foot">
      <button class="onb-btn" onclick="onbNext()" ${o.kids.length ? '' : 'disabled'}>Pokračovat</button>
      <button class="onb-skip" onclick="onbBack()">Zpět</button>
    </div>`;
}

function obStepConnect() {
  const o = state.onboarding;
  const email = o.emailConnected
    ? `<div class="onb-conn ok"><div class="onb-conn-ic" style="background:var(--mail-bg)">✉️</div><div style="flex:1;min-width:0"><div class="onb-conn-t">E-mail · Gmail</div><div class="onb-conn-s">petr.kriz@gmail.com</div></div><div class="onb-badge-ok">✓ Připojeno</div></div>`
    : `<div class="onb-conn"><div class="onb-conn-ic" style="background:var(--mail-bg)">✉️</div><div style="flex:1;min-width:0"><div class="onb-conn-t">E-mail</div><div class="onb-conn-s">Vidíme jen zprávy od školy.</div></div><button class="onb-conn-btn" onclick="onbConnectEmail()">Připojit Gmail</button></div>`;
  const wa = o.waFollowed
    ? `<div class="onb-conn ok"><div class="onb-conn-ic" style="background:var(--wa-bg)">💬</div><div style="flex:1;min-width:0"><div class="onb-conn-t">WhatsApp</div><div class="onb-conn-s">Školní kanál ZŠ Compass</div></div><div class="onb-badge-ok">✓ Sledujete</div></div>`
    : `<div class="onb-conn"><div class="onb-conn-ic" style="background:var(--wa-bg)">💬</div><div style="flex:1;min-width:0"><div class="onb-conn-t">WhatsApp</div><div class="onb-conn-s">Hromadné zprávy školy.</div></div><button class="onb-conn-btn" onclick="onbFollowWa()">Sledovat školu</button></div>`;
  return `
    <div class="onb-h">Odkud máme sbírat zprávy?</div>
    <div class="onb-sub">Stačí jedno klepnutí, zbytek zařídíme.</div>
    <div class="onb-body">
      ${email}${wa}
      <div class="onb-note">📲 SMS a ostatní zprávy přidáš kdykoliv přes <b>Sdílet → Aktovka</b>.</div>
    </div>
    <div class="onb-foot">
      <button class="onb-btn" onclick="onbNext()">Pokračovat</button>
      <button class="onb-skip" onclick="onbBack()">Zpět</button>
    </div>`;
}

function obStepDone() {
  const o = state.onboarding;
  if (!o.revealed) {
    return `<div class="thinking" style="padding:48px 0 40px">
      <div class="orb"></div>
      <div class="tt">Aktovka čte první zprávu od školy…</div>
      <div class="ts">Hledám termín, místo a co platí pro vaše děti</div>
    </div>`;
  }
  return `
    <div class="onb-h">A je to! 🎉</div>
    <div class="onb-sub">Z první zprávy Aktovka rovnou připravila akci:</div>
    <div class="onb-body">
      <div class="onb-preview">
        <div class="onb-prev-top"><span class="onb-prev-cat">🚌 Výlet</span><span class="onb-prev-conf">✨ 97 %</span></div>
        <div class="onb-prev-title">Výlet – výstava Signal Space</div>
        <div class="onb-prev-when">📅 čt 25. června · 👕 uniforma + kšiltovka · 💰 ~100 Kč</div>
        <div class="onb-prev-kids">
          <div class="onb-prev-kid"><span class="e">🦊</span><div><b>Eliška</b> · 3. třída<br>sraz 8:20 · oběd ~12:45</div></div>
          <div class="onb-prev-kid"><span class="e">🐢</span><div><b>Matěj</b> · 5. třída<br>sraz 8:35 · zmrzlina 🍦 · oběd ~13:15</div></div>
        </div>
      </div>
      <div class="onb-note">Takhle to uvidíš u každé zprávy — vždy personalizované pro každé dítě.</div>
    </div>
    <div class="onb-foot">
      <button class="onb-btn" onclick="finishOnboarding()">Vstoupit do Aktovky →</button>
    </div>`;
}

/* ═══════════════════════════════════════════ DRAWER (detail akce) ═══ */
function openEvent(id) {
  const e = evt(id); const cat = CATEGORIES[e.category];
  const d = new Date(e.date + 'T00:00:00');
  const when = `${DNY[d.getDay()]} ${d.getDate()}. ${MES_GEN[d.getMonth()]}` +
    (e.start ? ` · ${e.start}${e.end ? '–' + e.end : ''}` : '') + (e.recurring ? ` · ${e.recurring}` : '');

  const todos = (e.todo || []).length ? `
    <div style="padding:8px 20px 4px"><div class="fk" style="font-size:11px;font-weight:800;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em">✅ K vyřízení</div></div>
    <div class="todo-card" style="margin:0 14px 8px;border:none;box-shadow:none">
      ${e.todo.map(t => `<div class="todo-row ${t.done ? 'done' : ''}" onclick="toggleTodoDrawer('${e.id}','${t.id}')">
        <div class="tick ${t.done ? 'on' : ''}">✓</div><div class="tl">${esc(t.label)}</div></div>`).join('')}
    </div>` : '';

  const actions = !e.inCalendar
    ? `<button class="btn btn-primary" onclick="addToCalendar('${e.id}');closeDrawer()">📅 Přidat do kalendáře</button><button class="btn btn-ghost" onclick="shareEvent('${e.id}')">📲</button>`
    : e.needsConfirm
      ? `<button class="btn btn-primary" onclick="confirmEvent('${e.id}')">✓ Potvrdit účast</button><button class="btn btn-ghost" onclick="shareEvent('${e.id}')">📲</button>`
      : `<button class="btn btn-primary" onclick="shareEvent('${e.id}')">📲 Sdílet s ${esc(state.user.partnerWith)}</button><button class="btn btn-ghost" onclick="openMessage('${e.sourceMsg}');closeDrawer()">✉️</button>`;

  $('#drawer').innerHTML = `
    <div class="dr-hero" style="background:linear-gradient(135deg,${cat.color},${cat.color}cc)">
      <button class="dr-close" onclick="closeDrawer()">✕</button>
      <div class="dr-cat">${cat.emoji} ${cat.label}</div>
      <div class="dr-title">${esc(e.title)}</div>
      <div class="dr-when">📅 ${esc(when)} · ${relDay(e.date)}</div>
    </div>
    <div class="dr-sum">${esc(e.summary)}</div>
    ${detailFieldsHTML(e)}
    ${perChildHTML(e)}
    ${checklistHTML(e)}
    ${todos}
    <div class="md-actions" style="position:sticky;bottom:0">${actions}</div>`;
  $('#drawer-overlay').classList.remove('hidden');
}
function closeDrawer() { $('#drawer-overlay').classList.add('hidden'); }
function toggleTodoDrawer(evId, tId) {
  const e = evt(evId); const t = e.todo.find(x => x.id === tId); t.done = !t.done;
  if (t.done) toast('Hotovo!', '✓', true);
  openEvent(evId);
}

/* ═══════════════════════════════════════════ TOAST ═══ */
function toast(text, icon, ok) {
  const el = document.createElement('div');
  el.className = 'toast' + (ok ? ' ok' : '');
  el.innerHTML = `<div class="ti">${icon || '✓'}</div>${esc(text)}`;
  $('#toast-wrap').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; setTimeout(() => el.remove(), 300); }, 2600);
}

/* ── Klávesnice ─────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#drawer-overlay').classList.contains('hidden')) closeDrawer();
    else if (state.openMsgId) closeMessage();
  }
});

/* ═══════════════════════════════════════════ INSTALACE PWA ═══ */
let deferredInstall = null;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  showInstallPill();
});
window.addEventListener('appinstalled', () => { deferredInstall = null; hideInstallPill(); toast('Aktovka nainstalována 🎉', '✓', true); });

function hideInstallPill() { const el = $('#install-pill'); if (el) el.classList.add('hidden'); }

function showInstallPill() {
  if (isStandalone() || sessionStorage.getItem('aktovka-install-x')) return;
  const el = $('#install-pill'); if (!el) return;

  if (deferredInstall) {
    el.innerHTML = `<div class="ip-txt">📲 Aktovka na plochu</div>
      <button class="ip-go" onclick="doInstall()">Instalovat</button>
      <button class="ip-x" onclick="dismissInstall()" aria-label="zavřít">✕</button>`;
    el.classList.remove('hidden');
  } else if (isIOS()) {
    el.innerHTML = `<div class="ip-txt">📲 <b>Přidat na plochu</b><br>klepněte na Sdílet → Přidat na plochu</div>
      <button class="ip-x" onclick="dismissInstall()" aria-label="zavřít">✕</button>`;
    el.classList.remove('hidden');
  }
}
function dismissInstall() { sessionStorage.setItem('aktovka-install-x', '1'); hideInstallPill(); }
async function doInstall() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  try { await deferredInstall.userChoice; } catch (e) {}
  deferredInstall = null; hideInstallPill();
}

/* iOS nemá beforeinstallprompt → ukaž návod po načtení */
window.addEventListener('load', () => { if (isIOS() && !isStandalone()) setTimeout(showInstallPill, 1200); });

/* auto-login pro rychlé demo (vyplní pole) */
fillLogin('petr.kriz@email.cz', 'aktovka');
