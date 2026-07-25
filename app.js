// ── Config ────────────────────────────────────────────────────────────────────

const MATCH_STAGE = {
  // Group Stage
  'Switzerland vs. Qatar':                  'Group Stage',
  'Germany vs. Curaçao':                    'Group Stage',
  'England vs. Croatia':                    'Group Stage',
  'Austria vs. Jordan':                     'Group Stage',
  'South Africa vs. Czechia':               'Group Stage',
  'Switzerland vs. Bosnia and Herzegovina': 'Group Stage',
  'Argentina vs. Austria':                  'Group Stage',
  'Norway vs. France':                      'Group Stage',
  'Egypt vs. Iran':                         'Group Stage',
  'Jordan vs. Argentina':                   'Group Stage',
  'DR Congo vs. Uzbekistan':                'Group Stage',
  // Round of 32
  'Germany vs. Paraguay':                   'Round of 32',
  'Netherlands vs. Morocco':                'Round of 32',
  'Belgium vs. Senegal':                    'Round of 32',
  'Portugal vs. Croatia':                   'Round of 32',
  'Australia vs. Egypt':                    'Round of 32',
  // Round of 16
  'France vs. Paraguay':                    'Round of 16',
  'Brazil vs. Norway':                      'Round of 16',
  'Mexico vs. England':                     'Round of 16',
  'Argentina vs. Egypt':                    'Round of 16',
  'Switzerland vs. Colombia':               'Round of 16',
  // Quarter-final
  'France vs. Morocco':                     'Quarter-Final',
  // Semi-final
  'Spain vs. France':                       'Semi-Final',
  // Third place
  'England vs. France':                     '3rd Place',
};

// ── Goal frame config ─────────────────────────────────────────────────────────
// Derived from FotMob's actual SVG structure:
//   Goal frame SVG:  viewBox="0 0 90 30"  transform="translate(-426 -394)"
//     → left post inner face  = x 2  (of 90)
//     → right post inner face = x 88 (of 90)
//     → crossbar inner face   = y 2  (of 30)
//     → ground                = y 30 (of 30)
//   Shot SVG:        viewBox="0 0 2 0.68" — overlaid to the same visual area.
//   Scale:  2 shot-units = 90 goal-units  →  1 shot-unit = 45 goal-units
//           0.68 shot-units = 30 goal-units → scale-y = 30/0.68 ≈ 44.12
//
//   Therefore (in shot coordinate space):
//     left  = 2/45  ≈ 0.0444   right  = 88/45 ≈ 1.9556
//     top   = 2*(0.68/30) ≈ 0.0453   bottom = 0.68
//     post/bar thickness t = 2/45 ≈ 0.0444
//
//   x=2 in the shot SVG → outer face of right post → missed wide right ✓
const GOAL_FRAME = {
  left:   2 / 45,           // ≈ 0.04444 — inner face of left post
  right:  88 / 45,          // ≈ 1.95556 — inner face of right post
  top:    2 * (0.68 / 30),  // ≈ 0.04533 — inner face of crossbar
  bottom: 0.68,             // ground level
  t:      2 / 45,           // ≈ 0.04444 — post & crossbar thickness
};

// ── State ─────────────────────────────────────────────────────────────────────
const filters = {
  outcome: 'all', stutter: 'all', type: 'all', player: '', xGOTMin: 0,
  position: 'all', ageMin: null, ageMax: null, pkMin: null, pkMax: null,
};
const tableSort = { col: null, dir: 1 };
let selectedId = null;

// ── SVG utility ───────────────────────────────────────────────────────────────
function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// ── Draw goal frame (dynamic, driven by GOAL_FRAME) ───────────────────────────
function drawGoalFrame() {
  const { left, right, top, bottom, t } = GOAL_FRAME;
  const width  = right - left;
  const height = bottom - top;

  // Net background
  const nb = document.getElementById('netBg');
  nb.innerHTML = '';
  nb.appendChild(svgEl('rect', { x: left, y: top, width, height, fill: '#091409' }));

  // Goal frame (posts + crossbar)
  const gf = document.getElementById('goalFrame');
  gf.innerHTML = '';

  // Left post
  gf.appendChild(svgEl('rect', { x: left - t, y: top - t, width: t, height: height + t, fill: '#d0d7de', rx: 0.007 }));
  // Right post
  gf.appendChild(svgEl('rect', { x: right,    y: top - t, width: t, height: height + t, fill: '#d0d7de', rx: 0.007 }));
  // Crossbar
  gf.appendChild(svgEl('rect', { x: left - t, y: top - t, width: width + 2 * t, height: t, fill: '#d0d7de', rx: 0.007 }));

  // Post bases
  const baseW = t * 1.7, baseH = t * 0.55, baseY = bottom + 0.005;
  gf.appendChild(svgEl('rect', { x: left - t * 1.2, y: baseY, width: baseW, height: baseH, fill: '#a0a9b3', rx: 0.003 }));
  gf.appendChild(svgEl('rect', { x: right - t * 0.5, y: baseY, width: baseW, height: baseH, fill: '#a0a9b3', rx: 0.003 }));

  // Subtle 3-D corner depth marks
  const cornerLen = 0.055;
  const addCornerLine = (x1, y1, x2, y2) =>
    gf.appendChild(svgEl('line', { x1, y1, x2, y2, stroke: '#aab4be', 'stroke-width': 0.005, opacity: 0.22 }));
  addCornerLine(left,  top, left  + cornerLen, top + cornerLen);
  addCornerLine(right, top, right - cornerLen, top + cornerLen);

  // Axis labels
  const labelY = bottom + 0.10;
  const mkText = (x, anchor, txt, size = 0.044) => {
    const el = svgEl('text', { x, y: labelY, 'text-anchor': anchor, fill: '#1e3a22', 'font-size': size, 'font-family': 'system-ui, sans-serif', 'font-weight': '700', 'letter-spacing': '0.04' });
    el.textContent = txt;
    gf.appendChild(el);
  };
  mkText(left  + 0.04, 'start', 'L', 0.040);
  mkText((left + right) / 2, 'middle', 'CENTER', 0.044);
  mkText(right - 0.04, 'end',   'R', 0.040);
}

// ── Net grid ──────────────────────────────────────────────────────────────────
function drawNet() {
  const { left, right, top, bottom } = GOAL_FRAME;
  const vg = document.getElementById('netVertical');
  const hg = document.getElementById('netHorizontal');
  vg.innerHTML = '';
  hg.innerHTML = '';

  const cols = 18, rows = 8;
  for (let i = 0; i <= cols; i++) {
    const x = left + (i / cols) * (right - left);
    vg.appendChild(svgEl('line', { x1: x, y1: top, x2: x, y2: bottom }));
  }
  for (let i = 0; i <= rows; i++) {
    const y = top + (i / rows) * (bottom - top);
    hg.appendChild(svgEl('line', { x1: left, y1: y, x2: right, y2: y }));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function matchesFilters(p) {
  if (filters.outcome !== 'all' && p.outcome !== filters.outcome) return false;
  if (filters.stutter !== 'all' && String(p.stutter) !== filters.stutter) return false;
  if (filters.type !== 'all' && p.type !== filters.type) return false;
  if (filters.player && !p.taker.toLowerCase().includes(filters.player.toLowerCase())) return false;
  if (filters.xGOTMin > 0 && (p.xGOT === null || p.xGOT < filters.xGOTMin)) return false;

  const pd = PLAYER_DATA[p.taker] || {};
  if (filters.position !== 'all' && pd.position !== filters.position) return false;
  if (filters.ageMin !== null && pd.age != null && pd.age < filters.ageMin) return false;
  if (filters.ageMax !== null && pd.age != null && pd.age > filters.ageMax) return false;
  if (filters.pkMin  !== null && pd.pk_scored != null && pd.pk_scored < filters.pkMin) return false;
  if (filters.pkMax  !== null && pd.pk_scored != null && pd.pk_scored > filters.pkMax) return false;

  return true;
}

function resultIcon(result) {
  if (result === 'Scored' || result === 'Scored on retake') return '✓';
  if (result === 'Saved')    return 'S';
  if (result === 'Crossbar') return '―';
  if (result === 'Post')     return '|';
  return '✗';
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function fmtXGOT(val) {
  if (val === null || val === undefined) return null;
  return val.toFixed(2);
}

// ── Dot rendering ─────────────────────────────────────────────────────────────
const DOT_R = 0.050;

function renderDots(filtered) {
  const g = document.getElementById('penaltyDots');
  g.innerHTML = '';

  const withCoords = filtered.filter(p => p.x !== null && p.y !== null);

  // Spread dots that share identical coordinates
  const coordCount = {};
  withCoords.forEach(p => {
    const k = `${p.x},${p.y}`;
    coordCount[k] = (coordCount[k] || 0) + 1;
  });
  const coordIdx = {};

  withCoords.forEach(p => {
    const k = `${p.x},${p.y}`;
    const total = coordCount[k];
    const idx   = coordIdx[k] || 0;
    coordIdx[k] = idx + 1;

    const angle  = total > 1 ? (idx / total) * Math.PI * 2 : 0;
    const spread = total > 1 ? DOT_R * 1.5 : 0;
    let cx = p.x + Math.cos(angle) * spread;
    let cy = p.y + Math.sin(angle) * spread;

    // FotMob clamps missed shots to the goal boundary — push them visually outside.
    // Post/crossbar shots have accurate coordinates so don't push those.
    if (p.result === 'Missed/off target') {
      const PUSH = 0.11;
      if (cx <= 0.02)  cx = -PUSH;
      if (cx >= 1.98)  cx = 2 + PUSH;
      if (cy <= 0.02)  cy = -PUSH;
    }

    const isScored   = p.outcome === 'Scored';
    const isSelected = p.id === selectedId;

    if (isSelected) {
      g.appendChild(svgEl('circle', {
        cx, cy, r: DOT_R * 1.9,
        fill: 'none', stroke: '#ffffff', 'stroke-width': 0.012, opacity: 0.55,
      }));
    }

    const dot = svgEl('circle', {
      cx, cy,
      r:             isSelected ? DOT_R * 1.22 : DOT_R,
      fill:          isScored ? '#22c55e' : '#ef4444',
      'fill-opacity': isSelected ? '1' : '0.88',
      stroke:        '#ffffff',
      'stroke-width': 0.016,
      class:         'penalty-dot',
      'data-id':     p.id,
    });
    if (p.stutter) dot.setAttribute('stroke-dasharray', '0.022 0.014');
    dot.style.cursor = 'pointer';
    g.appendChild(dot);

    const lbl = svgEl('text', {
      x: cx, y: cy + DOT_R * 0.38,
      'text-anchor': 'middle',
      fill: '#ffffff',
      'font-size': 0.038,
      'font-weight': 'bold',
      'font-family': 'system-ui, sans-serif',
      'pointer-events': 'none',
    });
    lbl.textContent = p.id;
    g.appendChild(lbl);
  });

  g.querySelectorAll('.penalty-dot').forEach(el => {
    const id = Number(el.dataset.id);
    el.addEventListener('mouseenter', e => showTooltip(e, id));
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('touchstart', e => {
      e.stopPropagation();
      const t = e.touches[0];
      showTooltip({ clientX: t.clientX, clientY: t.clientY }, id);
    }, { passive: true });
    el.addEventListener('click', () => {
      selectedId = selectedId === id ? null : id;
      refresh();
    });
  });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function showTooltip(e, id) {
  const p = PENALTIES_DATA.find(d => d.id === id);
  if (!p) return;

  const pd = PLAYER_DATA[p.taker] || {};
  document.getElementById('ttPlayer').textContent   = p.taker;
  document.getElementById('ttTeam').textContent     = p.team;
  document.getElementById('ttPosition').textContent = pd.position || '—';
  document.getElementById('ttAge').textContent      = pd.age != null ? pd.age : '—';
  document.getElementById('ttMatch').textContent    = p.match;

  const resultEl = document.getElementById('ttResult');
  resultEl.textContent = p.result;
  resultEl.className   = p.outcome === 'Scored' ? 'result-scored' : 'result-failed';

  document.getElementById('ttStutter').textContent = p.stutter ? 'Stutter / Hesitation' : 'Normal run-up';

  // Technique note
  const noteRow = document.getElementById('ttNoteRow');
  if (p.techniqueNote) {
    document.getElementById('ttNote').textContent = p.techniqueNote;
    noteRow.style.display = 'flex';
  } else {
    noteRow.style.display = 'none';
  }

  // Run-up time
  const timeRow = document.getElementById('ttTimeRow');
  if (p.timeTaken !== null) {
    document.getElementById('ttTime').textContent = `${p.timeTaken}s`;
    timeRow.style.display = 'flex';
  } else {
    timeRow.style.display = 'none';
  }

  // xGOT
  const xGOTRow = document.getElementById('ttXGOTRow');
  const xgot = fmtXGOT(p.xGOT);
  if (xgot !== null) {
    document.getElementById('ttXGOTVal').textContent  = xgot;
    document.getElementById('ttXGOTFill').style.width = (p.xGOT * 100) + '%';
    xGOTRow.style.display = 'flex';
  } else {
    xGOTRow.style.display = 'none';
  }


  const tt = document.getElementById('tooltip');
  tt.style.display = 'block';
  positionTooltip(e, tt);
}

function positionTooltip(e, tt) {
  const ttW = 260;
  const ttH = tt.offsetHeight || 180;
  const pad = 8;
  let left = e.clientX + 18;
  let top  = e.clientY - 12;
  if (left + ttW > window.innerWidth  - pad) left = e.clientX - ttW - 18;
  if (left < pad)                             left = pad;
  if (top  + ttH > window.innerHeight - pad) top  = e.clientY - ttH - 8;
  if (top  < pad)                             top  = pad;
  tt.style.left = left + 'px';
  tt.style.top  = top  + 'px';
}

function hideTooltip() {
  document.getElementById('tooltip').style.display = 'none';
}


// ── KPI cards ─────────────────────────────────────────────────────────────────
function renderKPIs(filtered) {
  const total  = filtered.length;
  const scored = filtered.filter(p => p.outcome === 'Scored').length;
  const failed = total - scored;
  const pct    = total ? (scored / total * 100).toFixed(1) : '0.0';
  const xgotShots  = filtered.filter(p => p.xGOT !== null && p.xGOT > 0);
  const avgXGOT    = xgotShots.length
    ? (xgotShots.reduce((s, p) => s + p.xGOT, 0) / xgotShots.length).toFixed(2)
    : '—';
  const offTarget    = filtered.filter(p => ['Missed/off target', 'Post', 'Crossbar'].includes(p.result)).length;
  const offTargetPct = total ? (offTarget / total * 100).toFixed(1) + '%' : '—';
  const withAge = filtered.map(p => PLAYER_DATA[p.taker]?.age).filter(v => v != null);
  const medAge  = median(withAge);
  const avgAge  = medAge !== null ? medAge.toFixed(1) : '—';

  const withPK = filtered.map(p => PLAYER_DATA[p.taker]?.pk_scored).filter(v => v != null);
  const medPK  = median(withPK);
  const avgPK  = medPK !== null ? medPK.toFixed(1) : '—';

  document.getElementById('kpiTotal').textContent      = total;
  document.getElementById('kpiConversion').textContent = pct + '%';
  document.getElementById('kpiOffTarget').textContent  = offTargetPct;
  document.getElementById('kpiAvgXGOT').textContent    = avgXGOT;
  document.getElementById('kpiAvgAge').textContent     = avgAge;
  document.getElementById('kpiAvgClubPKs').textContent = avgPK;
  document.getElementById('mapScored').textContent     = scored;
  document.getElementById('mapFailed').textContent     = failed;
  document.getElementById('mapAge').textContent        = `Median Age ${avgAge}`;
  document.getElementById('mapPKs').textContent        = `Median Club PKs ${avgPK}`;
}

// ── Breakdown sidebar ──────────────────────────────────────────────────────────
function breakdownBar(label, count, pct, color) {
  return `<div class="breakdown-item">
    <div class="breakdown-meta">
      <span class="breakdown-name">${label}</span>
      <span class="breakdown-count">${count}</span>
    </div>
    <div class="breakdown-track">
      <div class="breakdown-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
    </div>
  </div>`;
}

function renderBreakdown(filtered) {
  const total = filtered.length;

  const outcomeGroups = [
    { label: 'Scored',           color: '#22c55e', vals: ['Scored', 'Scored on retake'] },
    { label: 'Saved',            color: '#ef4444', vals: ['Saved'] },
    { label: 'Missed / Post & Bar', color: '#fb923c', vals: ['Missed/off target', 'Post', 'Crossbar'] },
  ];
  document.getElementById('outcomeBreakdown').innerHTML =
    outcomeGroups.map(g => {
      const n = filtered.filter(p => g.vals.includes(p.result)).length;
      return breakdownBar(g.label, n, total ? n / total * 100 : 0, g.color);
    }).join('');

  const stutter = filtered.filter(p => p.stutter).length;
  const normal  = total - stutter;
  document.getElementById('techniqueBreakdown').innerHTML = [
    breakdownBar('Normal',  normal,  total ? normal  / total * 100 : 0, '#4ade80'),
    breakdownBar('Stutter', stutter, total ? stutter / total * 100 : 0, '#fb923c'),
  ].join('');

  const ingame   = filtered.filter(p => p.type === 'In-game').length;
  const shootout = total - ingame;
  document.getElementById('typeBreakdown').innerHTML = [
    breakdownBar('In-Game',  ingame,   total ? ingame   / total * 100 : 0, '#4ade80'),
    breakdownBar('Shootout', shootout, total ? shootout / total * 100 : 0, '#a78bfa'),
  ].join('');
}

// ── Table ─────────────────────────────────────────────────────────────────────
function sortValue(p, col) {
  const pd = PLAYER_DATA[p.taker] || {};
  switch (col) {
    case 'id':       return p.id;
    case 'type':     return p.type;
    case 'taker':    return p.taker;
    case 'team':     return p.team;
    case 'match':    return p.match;
    case 'result':   return p.result;
    case 'stutter':  return p.stutter ? 1 : 0;
    case 'xGOT':     return p.xGOT ?? -1;
    case 'position': return pd.position ?? 'zzz';
    case 'age':      return pd.age ?? -1;
    case 'pkScored': return pd.pk_scored ?? -1;
    default:         return 0;
  }
}

function renderTable(filtered) {
  const tbody = document.getElementById('penaltiesBody');
  tbody.innerHTML = '';

  // Update header indicators
  document.querySelectorAll('thead th[data-sort]').forEach(th => {
    const col = th.dataset.sort;
    const base = th.textContent.replace(/ [▲▼]$/, '');
    if (col === tableSort.col) {
      th.textContent = base + (tableSort.dir === 1 ? ' ▲' : ' ▼');
      th.classList.add('sort-active');
    } else {
      th.textContent = base;
      th.classList.remove('sort-active');
    }
  });

  // Sort a copy
  const rows = tableSort.col
    ? [...filtered].sort((a, b) => {
        const av = sortValue(a, tableSort.col);
        const bv = sortValue(b, tableSort.col);
        if (av < bv) return -tableSort.dir;
        if (av > bv) return  tableSort.dir;
        return 0;
      })
    : filtered;

  const TABLE_LIMIT = 10;
  const showAllRows = tbody.dataset.showAll === 'true';
  const visible = showAllRows ? rows : rows.slice(0, TABLE_LIMIT);

  visible.forEach(p => {
    const tr = document.createElement('tr');
    if (p.id === selectedId) tr.classList.add('row-selected');
    if (!p.videoReviewed)    tr.classList.add('row-pending');

    const xgot = fmtXGOT(p.xGOT);
    const xgotCell = xgot !== null
      ? `<span class="xgot-chip">${xgot}</span>`
      : '—';

    const pd = PLAYER_DATA[p.taker] || {};
    const posCell = pd.position || '—';
    const ageCell = pd.age != null ? pd.age : '—';
    const pkCell  = pd.pk_scored != null ? pd.pk_scored : '—';

    tr.innerHTML = `
      <td class="col-id">${p.id}</td>
      <td><span class="badge badge-${p.type === 'In-game' ? 'ingame' : 'shootout'}">${p.type === 'In-game' ? 'In-Game' : 'Shootout'}</span></td>
      <td class="col-taker">${p.taker}</td>
      <td>${p.team}</td>
      <td class="col-match">${p.match}</td>
      <td><span class="result-pill ${p.outcome === 'Scored' ? 'pill-scored' : 'pill-failed'}">${resultIcon(p.result)} ${p.result}</span></td>
      <td>${p.stutter ? '<span class="stutter-yes">Stutter</span>' : '<span class="stutter-no">Normal</span>'}</td>
      <td class="col-xgot">${xgotCell}</td>
      <td>${posCell}</td>
      <td>${ageCell}</td>
      <td>${pkCell}</td>
    `;

    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      selectedId = selectedId === p.id ? null : p.id;
      refresh();
      if (p.x !== null) {
        document.querySelector('.map-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    tbody.appendChild(tr);
  });

  if (!showAllRows && rows.length > TABLE_LIMIT) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="11" class="table-show-more">
      ▾ &nbsp;Showing ${TABLE_LIMIT} of ${rows.length} — <button class="table-show-more-btn">Show all ${rows.length}</button>
    </td>`;
    tr.querySelector('button').addEventListener('click', () => {
      tbody.dataset.showAll = 'true';
      refresh();
    });
    tbody.appendChild(tr);
  } else if (showAllRows && rows.length > TABLE_LIMIT) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="11" class="table-show-more">
      ▴ &nbsp;<button class="table-show-more-btn">Show less</button>
    </td>`;
    tr.querySelector('button').addEventListener('click', () => {
      tbody.dataset.showAll = 'false';
      refresh();
    });
    tbody.appendChild(tr);
  }
}

// ── Stutter effectiveness ─────────────────────────────────────────────────────
function renderStutterChart(filtered) {
  const groups = [
    { label: 'Normal',  key: false },
    { label: 'Stutter', key: true  },
  ];

  document.getElementById('stutterChart').innerHTML = `<div class="stutter-cards">${
    groups.map(g => {
      const pens   = filtered.filter(p => p.stutter === g.key);
      const scored = pens.filter(p => p.outcome === 'Scored').length;
      const total  = pens.length;
      const pct    = total ? Math.round(scored / total * 100) : 0;
      const mood   = pct >= 75 ? 'good' : 'bad';
      return `
        <div class="stutter-card">
          <div class="stutter-card-header">
            <span class="stutter-card-label">${g.label}</span>
            <span class="stutter-card-pct ${mood}">${pct}%</span>
          </div>
          <div class="stutter-card-tally">${scored} scored / ${total} taken</div>
          <div class="stutter-conv-track">
            <div class="stutter-conv-fill ${mood}" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('')
  }</div>`;
}

// ── Tournament stage line chart ───────────────────────────────────────────────
const STAGE_BINS = [
  { label: 'Group Stage', sub: 'Group',  key: 'Group Stage'   },
  { label: 'Round of 32', sub: 'Ro32',   key: 'Round of 32'   },
  { label: 'Round of 16', sub: 'Ro16',   key: 'Round of 16'   },
  { label: 'Quarter-Final', sub: 'QF',   key: 'Quarter-Final' },
  { label: 'Semi-Final',  sub: 'SF',     key: 'Semi-Final'    },
  { label: '3rd Place',   sub: '3rd',    key: '3rd Place'     },
];

function renderStageChart(filtered) {
  const counts = STAGE_BINS.map(bin => {
    const inBin  = filtered.filter(p => MATCH_STAGE[p.match] === bin.key);
    const scored = inBin.filter(p => p.outcome === 'Scored').length;
    const total  = inBin.length;
    const pct    = total ? Math.round(scored / total * 100) : null;
    return { ...bin, scored, total, pct };
  });

  const W = 500, H = 180;
  const mt = 28, mr = 20, mb = 48, ml = 40;
  const iW = W - ml - mr, iH = H - mt - mb;
  const n  = counts.length;
  const xOf = i => ml + (i / (n - 1)) * iW;
  const yOf = v => mt + (1 - v / 100) * iH;
  const bot = mt + iH;

  // Split into connected segments (gaps where pct === null)
  const segments = [];
  let seg = [];
  counts.forEach((c, i) => {
    if (c.pct !== null) {
      seg.push({ ...c, x: xOf(i), y: yOf(c.pct) });
    } else {
      if (seg.length) { segments.push(seg); seg = []; }
    }
  });
  if (seg.length) segments.push(seg);

  let svg = '';

  // Y gridlines at 0 / 25 / 50 / 75 / 100
  [0, 25, 50, 75, 100].forEach(pct => {
    const y = yOf(pct);
    svg += `<line x1="${ml}" y1="${y}" x2="${W - mr}" y2="${y}" stroke="var(--border)" stroke-width="1" ${pct === 0 ? '' : 'stroke-dasharray="3,3"'}/>`;
    svg += `<text x="${ml - 7}" y="${y + 4}" text-anchor="end" font-size="9" fill="var(--text-muted)" font-family="system-ui,sans-serif">${pct}%</text>`;
  });

  // Area + line per segment
  segments.forEach(s => {
    const lineD = s.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaD = `${lineD} L${s[s.length - 1].x.toFixed(1)},${bot} L${s[0].x.toFixed(1)},${bot} Z`;
    svg += `<path d="${areaD}" fill="var(--accent)" fill-opacity="0.13"/>`;
    svg += `<path d="${lineD}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  });

  // Points + labels + x-axis
  counts.forEach((c, i) => {
    const x = xOf(i);
    if (c.pct !== null) {
      const y = yOf(c.pct);
      svg += `<text x="${x}" y="${y - 11}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--accent)" font-family="system-ui,sans-serif">${c.pct}%</text>`;
      svg += `<circle cx="${x}" cy="${y}" r="5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2.5"/>`;
    }
    svg += `<text x="${x}" y="${bot + 18}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-muted)" font-family="system-ui,sans-serif">${c.sub}</text>`;
    svg += `<text x="${x}" y="${bot + 33}" text-anchor="middle" font-size="9" fill="var(--text-muted)" font-family="system-ui,sans-serif" opacity="0.6">${c.total ? c.total + ' pens' : '—'}</text>`;
  });

  document.getElementById('stageChart').innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" style="overflow:visible;display:block">${svg}</svg>`;
}

// ── Position chart ───────────────────────────────────────────────────────────
function renderPositionChart(filtered) {
  const POSITIONS = ['Forward', 'Midfielder', 'Defense'];
  const counts = POSITIONS.map(pos => {
    const inPos  = filtered.filter(p => PLAYER_DATA[p.taker]?.position === pos);
    const scored = inPos.filter(p => p.outcome === 'Scored').length;
    const failed = inPos.length - scored;
    const pct    = inPos.length ? Math.round(scored / inPos.length * 100) : 0;
    return { label: pos, scored, failed, total: inPos.length, pct };
  });

  const maxVal = Math.max(...counts.flatMap(c => [c.scored, c.failed]), 1);
  const barH   = n => Math.max((n / maxVal * 100), n > 0 ? 2 : 0).toFixed(1) + '%';

  document.getElementById('positionChart').innerHTML = counts.map(c => `
    <div class="chart-group">
      <div class="chart-bars">
        <div class="chart-bar chart-bar-scored" style="height:${barH(c.scored)}">
          <span class="chart-val">${c.scored}</span>
        </div>
        <div class="chart-bar chart-bar-failed" style="height:${barH(c.failed)}">
          <span class="chart-val">${c.failed}</span>
        </div>
      </div>
      <div class="chart-group-label">${c.label}</div>
      <div class="chart-group-sub">${c.total} pens · ${c.pct}% conv.</div>
    </div>
  `).join('');
}

// ── Club PKs vs avg xGOT scatter ─────────────────────────────────────────────
function renderCorrelationChart(filtered) {
  const map = {};
  filtered.forEach(p => {
    if (!map[p.taker]) {
      const pd = PLAYER_DATA[p.taker] || {};
      map[p.taker] = { xGOTSum: 0, count: 0, clubPKs: pd.pk_scored ?? null };
    }
    map[p.taker].xGOTSum += p.xGOT ?? 0;  // null → 0 (off-target)
    map[p.taker].count   += 1;
  });

  const pts = Object.entries(map)
    .filter(([, d]) => d.clubPKs != null && d.count > 0)
    .map(([name, d]) => ({
      name,
      x: d.clubPKs,
      y: d.xGOTSum / d.count,
    }));

  if (!pts.length) {
    document.getElementById('correlationChart').innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:12px">No data</p>';
    return;
  }

  const maxX = Math.max(...pts.map(p => p.x), 10);

  const W = 420, H = 180;
  const mt = 20, mr = 16, mb = 42, ml = 44;
  const iW = W - ml - mr, iH = H - mt - mb;
  const xOf = v  => ml + (v / maxX) * iW;
  const yOf = v  => mt + (1 - v) * iH;   // xGOT is 0–1

  // Linear regression
  const n   = pts.length;
  const mX  = pts.reduce((s, p) => s + p.x, 0) / n;
  const mY  = pts.reduce((s, p) => s + p.y, 0) / n;
  const num = pts.reduce((s, p) => s + (p.x - mX) * (p.y - mY), 0);
  const den = pts.reduce((s, p) => s + (p.x - mX) ** 2, 0);
  const slope = den ? num / den : 0;
  const intercept = mY - slope * mX;

  let svg = '';

  // Y gridlines (0, 0.25, 0.50, 0.75, 1.0)
  [0, 0.25, 0.50, 0.75, 1.0].forEach(v => {
    const y = yOf(v);
    svg += `<line x1="${ml}" y1="${y}" x2="${W - mr}" y2="${y}" stroke="var(--border)" stroke-width="1" ${v === 0 ? '' : 'stroke-dasharray="3,3"'}/>`;
    svg += `<text x="${ml - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="var(--text-muted)" font-family="system-ui,sans-serif">${v.toFixed(2)}</text>`;
  });

  // X ticks
  [0, 20, 40, 60, 80, 100, 120, 140, 160].filter(v => v <= maxX + 5).forEach(v => {
    const x = xOf(v);
    svg += `<line x1="${x}" y1="${mt + iH}" x2="${x}" y2="${mt + iH + 4}" stroke="var(--border)" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${mt + iH + 15}" text-anchor="middle" font-size="9" fill="var(--text-muted)" font-family="system-ui,sans-serif">${v}</text>`;
  });

  // Trend line clamped to chart area
  const clamp = y => Math.max(mt, Math.min(mt + iH, y));
  svg += `<line x1="${xOf(0)}" y1="${clamp(yOf(intercept))}" x2="${xOf(maxX)}" y2="${clamp(yOf(intercept + slope * maxX))}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.45"/>`;

  // Dots — colour by xGOT quality
  pts.forEach(p => {
    const fill = p.y >= 0.75 ? 'var(--green)' : p.y >= 0.50 ? '#f59e0b' : 'var(--red)';
    svg += `<circle cx="${xOf(p.x)}" cy="${yOf(p.y)}" r="5" fill="${fill}" fill-opacity="0.85" stroke="var(--surface)" stroke-width="1.5"/>`;
  });

  // Axis labels
  svg += `<text x="${ml + iW / 2}" y="${H - 4}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-muted)" font-family="system-ui,sans-serif">Career Club PKs Scored</text>`;
  svg += `<text x="${ml - 32}" y="${mt + iH / 2}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-muted)" font-family="system-ui,sans-serif" transform="rotate(-90,${ml - 32},${mt + iH / 2})">Avg xGOT</text>`;

  document.getElementById('correlationChart').innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" style="overflow:visible;display:block">${svg}</svg>`;
}

// ── Age chart ─────────────────────────────────────────────────────────────────
const AGE_BINS = [
  { label: 'Under 25', sub: '≤ 24',  min: 0,  max: 24 },
  { label: '25 – 27',  sub: '25–27', min: 25, max: 27 },
  { label: '28 – 30',  sub: '28–30', min: 28, max: 30 },
  { label: '31 – 33',  sub: '31–33', min: 31, max: 33 },
  { label: '34 +',     sub: '34+',   min: 34, max: 99 },
];

function renderAgeChart(filtered) {
  const counts = AGE_BINS.map(bin => {
    const inBin = filtered.filter(p => {
      const age = PLAYER_DATA[p.taker]?.age;
      return age != null && age >= bin.min && age <= bin.max;
    });
    const scored = inBin.filter(p => p.outcome === 'Scored').length;
    const failed = inBin.length - scored;
    const pct = inBin.length ? Math.round(scored / inBin.length * 100) : 0;
    return { label: bin.label, sub: bin.sub, scored, failed, total: inBin.length, pct };
  });

  const maxVal = Math.max(...counts.flatMap(c => [c.scored, c.failed]), 1);
  const barH = n => Math.max((n / maxVal * 100), n > 0 ? 2 : 0).toFixed(1) + '%';

  document.getElementById('ageChart').innerHTML = counts.map(c => `
    <div class="chart-group">
      <div class="chart-bars">
        <div class="chart-bar chart-bar-scored" style="height:${barH(c.scored)}">
          <span class="chart-val">${c.scored}</span>
        </div>
        <div class="chart-bar chart-bar-failed" style="height:${barH(c.failed)}">
          <span class="chart-val">${c.failed}</span>
        </div>
      </div>
      <div class="chart-group-label">${c.label}</div>
      <div class="chart-group-sub">${c.total} pens · ${c.pct}% conv.</div>
    </div>
  `).join('');
}

// ── Filter controls ───────────────────────────────────────────────────────────
function initFilters() {
  const map = { outcomeFilter: 'outcome', stutterFilter: 'stutter', typeFilter: 'type', positionFilter: 'position' };
  Object.entries(map).forEach(([groupId, key]) => {
    document.getElementById(groupId).addEventListener('click', e => {
      const btn = e.target.closest('.toggle');
      if (!btn) return;
      document.querySelectorAll(`#${groupId} .toggle`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filters[key] = btn.dataset.value;
      selectedId = null;
      refresh();
    });
  });

  // Player search dropdown
  const playerInput    = document.getElementById('playerSearch');
  const playerClear    = document.getElementById('playerClear');
  const playerDropdown = document.getElementById('playerDropdown');
  const allPlayers     = [...new Set(PENALTIES_DATA.map(p => p.taker))].sort();

  function showPlayerDropdown(matches, showAll = false) {
    playerDropdown.innerHTML = '';
    if (!matches.length) { playerDropdown.style.display = 'none'; return; }

    const limit   = 10;
    const visible = showAll ? matches : matches.slice(0, limit);

    visible.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      li.addEventListener('mousedown', e => {
        e.preventDefault();
        playerInput.value = name;
        filters.player = name;
        playerClear.style.display = 'block';
        playerDropdown.style.display = 'none';
        selectedId = null;
        refresh();
      });
      playerDropdown.appendChild(li);
    });

    if (!showAll && matches.length > limit) {
      const more = document.createElement('li');
      more.className = 'dropdown-more';
      more.textContent = `▾  Show all ${matches.length} results`;
      more.addEventListener('mousedown', e => {
        e.preventDefault();
        showPlayerDropdown(matches, true);
      });
      playerDropdown.appendChild(more);
    }

    playerDropdown.style.display = 'block';
  }

  playerInput.addEventListener('input', () => {
    const val = playerInput.value.trim();
    playerClear.style.display = val ? 'block' : 'none';
    if (val) {
      showPlayerDropdown(allPlayers.filter(n => n.toLowerCase().includes(val.toLowerCase())));
    } else {
      // Input cleared — remove the player filter
      playerDropdown.style.display = 'none';
      filters.player = '';
      selectedId = null;
      refresh();
    }
  });

  playerInput.addEventListener('focus', () => {
    const val = playerInput.value.trim();
    if (val) showPlayerDropdown(allPlayers.filter(n => n.toLowerCase().includes(val.toLowerCase())));
  });

  playerInput.addEventListener('blur', () => {
    setTimeout(() => { playerDropdown.style.display = 'none'; }, 150);
  });

  playerClear.addEventListener('click', () => {
    playerInput.value = '';
    filters.player = '';
    playerClear.style.display = 'none';
    playerDropdown.style.display = 'none';
    selectedId = null;
    refresh();
  });

  // xGOT slider
  const slider = document.getElementById('xGOTSlider');
  const label  = document.getElementById('xGOTLabel');
  slider.addEventListener('input', () => {
    filters.xGOTMin = parseFloat(slider.value);
    label.textContent = parseFloat(slider.value).toFixed(2);
    selectedId = null;
    refresh();
  });

  // Compute data bounds from PLAYER_DATA
  const playerValues = Object.values(PLAYER_DATA);
  const ages = playerValues.map(d => d.age).filter(v => v != null);
  const pks  = playerValues.map(d => d.pk_scored).filter(v => v != null);
  const ageDataMin = Math.min(...ages), ageDataMax = Math.max(...ages);
  const pkDataMin  = Math.min(...pks),  pkDataMax  = Math.max(...pks);

  // Pre-fill inputs with data bounds
  document.getElementById('ageMin').value = ageDataMin;
  document.getElementById('ageMax').value = ageDataMax;
  document.getElementById('pkMin').value  = pkDataMin;
  document.getElementById('pkMax').value  = pkDataMax;

  // Init filter state to match
  filters.ageMin = ageDataMin;
  filters.ageMax = ageDataMax;
  filters.pkMin  = pkDataMin;
  filters.pkMax  = pkDataMax;

  // Age range
  function parseRangeInput(id) {
    const val = document.getElementById(id).value.trim();
    return val === '' ? null : Number(val);
  }

  const rangeDefaults = { ageMin: ageDataMin, ageMax: ageDataMax, pkMin: pkDataMin, pkMax: pkDataMax };

  function resetIfEmpty(id) {
    const el = document.getElementById(id);
    if (el.value.trim() === '') {
      el.value = rangeDefaults[id];
      filters[id] = rangeDefaults[id];
      selectedId = null;
      refresh();
    }
  }

  ['ageMin', 'ageMax'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      filters.ageMin = parseRangeInput('ageMin');
      filters.ageMax = parseRangeInput('ageMax');
      selectedId = null;
      refresh();
    });
    el.addEventListener('blur', () => resetIfEmpty(id));
  });

  // Club PKs range
  ['pkMin', 'pkMax'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      filters.pkMin = parseRangeInput('pkMin');
      filters.pkMax = parseRangeInput('pkMax');
      selectedId = null;
      refresh();
    });
    el.addEventListener('blur', () => resetIfEmpty(id));
  });
}

// ── Main refresh ──────────────────────────────────────────────────────────────
function refresh() {
  const filtered = PENALTIES_DATA.filter(matchesFilters);
  renderKPIs(filtered);
  renderBreakdown(filtered);
  renderDots(filtered);
  renderTable(filtered);
  renderAgeChart(PENALTIES_DATA);
  renderPositionChart(PENALTIES_DATA);
  renderCorrelationChart(PENALTIES_DATA);
  renderStageChart(PENALTIES_DATA);
}

// ── Group chart toggle ────────────────────────────────────────────────────────
function initGroupToggle() {
  document.getElementById('groupToggle').addEventListener('click', e => {
    const btn = e.target.closest('.toggle');
    if (!btn) return;
    document.querySelectorAll('#groupToggle .toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const isAge = btn.dataset.value === 'age';
    document.getElementById('ageChartWrap').style.display      = isAge ? '' : 'none';
    document.getElementById('positionChartWrap').style.display = isAge ? 'none' : '';
  });
}

// ── Table sort init ───────────────────────────────────────────────────────────
function initTableSort() {
  document.querySelectorAll('thead th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.title = 'Click to sort';
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (tableSort.col === col) {
        tableSort.dir *= -1;
      } else {
        tableSort.col = col;
        tableSort.dir = 1;
      }
      refresh();
    });
  });
}

// ── Theme toggle ──────────────────────────────────────────────────────────────
function initTheme() {
  const btn  = document.getElementById('themeToggle');
  const body = document.body;

  const apply = light => {
    body.classList.toggle('light', light);
    btn.textContent = light ? '🌕 Dark Mode' : '🌙 Light Mode';
  };

  apply(localStorage.getItem('theme') !== 'dark');

  btn.addEventListener('click', () => {
    const isLight = !body.classList.contains('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    apply(isLight);
  });
}

// ── xGOT info popup ───────────────────────────────────────────────────────────
function initXGOTInfo() {
  const btn   = document.getElementById('xGOTInfoBtn');
  const popup = document.getElementById('xGOTPopup');
  if (!btn || !popup) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', () => { popup.style.display = 'none'; });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  drawGoalFrame();
  drawNet();
  initFilters();
  initTableSort();
  initGroupToggle();
  initTheme();
  initXGOTInfo();
  refresh();

  document.getElementById('tooltipClose').addEventListener('click', e => {
    e.stopPropagation();
    hideTooltip();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.penalty-dot')) hideTooltip();
  });
  document.addEventListener('touchstart', e => {
    if (!e.target.closest('.penalty-dot') && !e.target.closest('#tooltip')) hideTooltip();
  }, { passive: true });
});
