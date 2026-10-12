const $ = s => document.querySelector(s);
const esc = s => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

/* ---------- core algorithms ---------- */
function buildSA(s){
  const n = s.length, sa = Array.from({length:n}, (_, i) => i);
  sa.sort((a, b) => {
    let i = a, j = b;
    while (i < n && j < n && s[i] === s[j]) { i++; j++; }
    if (i === n) return j === n ? 0 : -1;
    if (j === n) return 1;
    return s[i] < s[j] ? -1 : 1;
  });
  return sa;
}
function naiveLCP(s, sa){
  const n = s.length, lcp = new Array(n).fill(0); let cmp = 0;
  for (let k = 1; k < n; k++){
    const a = sa[k-1], b = sa[k]; let h = 0;
    while (a + h < n && b + h < n){ cmp++; if (s[a+h] !== s[b+h]) break; h++; }
    lcp[k] = h;
  }
  return {lcp, cmp};
}
function kasaiLCP(s, sa){
  const n = s.length, rank = new Array(n), lcp = new Array(n).fill(0); let cmp = 0, h = 0;
  for (let k = 0; k < n; k++) rank[sa[k]] = k;
  for (let i = 0; i < n; i++){
    const r = rank[i];
    if (r > 0){
      const j = sa[r-1];
      while (i + h < n && j + h < n){ cmp++; if (s[i+h] !== s[j+h]) break; h++; }
      lcp[r] = h;
      if (h > 0) h--;
    } else h = 0;
  }
  return {lcp, cmp};
}
function kasaiSteps(s, sa){
  const n = s.length, rank = new Array(n), snap = new Array(n).fill(null);
  for (let k = 0; k < n; k++) rank[sa[k]] = k;
  snap[0] = 0;
  const steps = []; let h = 0, cmp = 0;
  for (let i = 0; i < n; i++){
    const r = rank[i];
    if (r > 0){
      const j = sa[r-1], hStart = h;
      while (i + h < n && j + h < n){ cmp++; if (s[i+h] !== s[j+h]) break; h++; }
      snap[r] = h;
      steps.push({i, r, j, hStart, hEnd: h, cmp, snap: snap.slice()});
      if (h > 0) h--;
    } else {
      h = 0;
      steps.push({i, r, j: -1, hStart: 0, hEnd: 0, cmp, snap: snap.slice()});
    }
  }
  return steps;
}

/* ---------- queries ---------- */
function searchSA(s, sa, p){
  const n = s.length, m = p.length;
  if (!m) return {start:0, end:0, pos:[]};
  let lo = 0, hi = n;
  while (lo < hi){ const mid = (lo + hi) >> 1; if (s.substr(sa[mid], m) < p) lo = mid + 1; else hi = mid; }
  const start = lo; hi = n;
  while (lo < hi){ const mid = (lo + hi) >> 1; if (s.substr(sa[mid], m) <= p) lo = mid + 1; else hi = mid; }
  return {start, end: lo, pos: sa.slice(start, lo).sort((a, b) => a - b)};
}
function longestRepeated(s, sa, lcp){
  let best = 0, at = -1;
  for (let k = 1; k < lcp.length; k++) if (lcp[k] > best){ best = lcp[k]; at = k; }
  if (best === 0) return null;
  const a = sa[at-1], b = sa[at];
  return {len: best, str: s.substr(sa[at], best), a: Math.min(a, b), b: Math.max(a, b)};
}
function distinctCount(n, lcp){ return n*(n+1)/2 - lcp.reduce((x, y) => x + y, 0); }
function longestCommon(a, b){
  if (!a.length || !b.length) return null;
  const s = a + '\u0001' + b + '\u0002', sa = buildSA(s), {lcp} = kasaiLCP(s, sa), la = a.length;
  let best = 0, at = -1;
  for (let k = 1; k < sa.length; k++){
    const x = sa[k-1] < la, y = sa[k] < la;
    const xb = sa[k-1] > la, yb = sa[k] > la;
    if (((x && yb) || (xb && y)) && lcp[k] > best){ best = lcp[k]; at = k; }
  }
  return best ? s.substr(sa[at], best) : null;
}

/* ---------- hero ---------- */
let T = 'banana', SA = [], LCP = [], steps = [], sidx = 0, timer = null;

function renderHero(){
  const n = T.length;
  const tbl = $('#satable');
  if (!n){
    tbl.innerHTML = '<tr><td style="padding:18px;font-family:var(--body);color:var(--muted)">Type at least one character to build the arrays.</td></tr>';
    $('#arrays').innerHTML = ''; $('#cmpbox').innerHTML = ''; return;
  }
  SA = buildSA(T);
  const nv = naiveLCP(T, SA), kv = kasaiLCP(T, SA);
  LCP = kv.lcp;
  let html = '<tr><th>k</th><th>SA[k]</th><th>LCP[k]</th><th>Suffix</th></tr>';
  for (let k = 0; k < n; k++){
    const suf = T.slice(SA[k]), l = LCP[k];
    html += `<tr><td class="n">${k}</td><td class="v">${SA[k]}</td><td class="lcpv">${l}</td><td class="suf">` +
      (l ? `<mark class="m">${esc(suf.slice(0, l))}</mark>` : '') + esc(suf.slice(l)) + '</td></tr>';
  }
  tbl.innerHTML = html;
  $('#arrays').innerHTML =
    `<div><span class="k">SA</span>[${SA.join(', ')}]</div><div><span class="k">LCP</span>[${LCP.join(', ')}]</div>`;
  const same = JSON.stringify(nv.lcp) === JSON.stringify(kv.lcp);
  $('#cmpbox').innerHTML = `<p>The naive method made <b class="mono">${nv.cmp}</b> character comparisons. Kasai's made <b class="mono">${kv.cmp}</b>. ` +
    `Both produced ${same ? '<b style="color:var(--good)">identical</b>' : '<b>different</b>'} LCP arrays for this text.</p>`;

  steps = kasaiSteps(T, SA); sidx = 0; stopPlay(); renderStep();
}

/* ---------- stepper ---------- */
function chars(str, hs, he, mismatch){
  let o = '';
  for (let c = 0; c < str.length; c++){
    let cls = 'ch';
    if (c < hs) cls += ' skip'; else if (c < he) cls += ' hit'; else if (c === he && mismatch) cls += ' miss';
    o += `<span class="${cls}">${esc(str[c])}</span>`;
  }
  return o;
}
function renderCells(el, arr, cur){
  el.innerHTML = arr.map((v, k) =>
    `<div class="cell${k === cur ? ' cur' : ''}"><div class="i">${k}</div><div class="x${v === null ? ' empty' : ''}">${v === null ? '·' : v}</div></div>`).join('');
}
function renderStep(){
  const n = T.length;
  if (!n){ ['#pair','#stepmsg','#cellsSA','#cellsLCP','#stepcmp','#steppos'].forEach(q => $(q).innerHTML = ''); return; }
  const st = steps[sidx];
  const sufI = T.slice(st.i);
  let pair, msg;
  if (st.r === 0){
    pair = `<div class="row"><span class="tag">Suffix ${st.i}</span><span class="chars">${chars(sufI, 0, 0, false)}</span></div>`;
    msg = `Suffix ${st.i} is the smallest in sorted order, so it has no predecessor. LCP[0] stays 0, and h resets to 0.`;
  } else {
    const sufJ = T.slice(st.j);
    const mismatch = st.i + st.hEnd < n && st.j + st.hEnd < n;
    pair = `<div class="row"><span class="tag">Suffix ${st.i}</span><span class="chars">${chars(sufI, st.hStart, st.hEnd, mismatch)}</span></div>` +
           `<div class="row"><span class="tag">Predecessor, suffix ${st.j}</span><span class="chars">${chars(sufJ, st.hStart, st.hEnd, mismatch)}</span></div>`;
    const carried = st.hStart > 0
      ? `The previous step left h = ${st.hStart}, so the first ${st.hStart} character${st.hStart > 1 ? 's' : ''} already match and are skipped. `
      : `Nothing carried over, so comparison starts at the first character. `;
    const ext = st.hEnd > st.hStart
      ? `Comparing onward extends the match to ${st.hEnd}. `
      : `The very next characters differ, so the match stays at ${st.hEnd}. `;
    msg = `${carried}${ext}Store LCP[${st.r}] = ${st.hEnd}. The next step starts with h = ${Math.max(st.hEnd - 1, 0)}.`;
  }
  $('#pair').innerHTML = pair;
  $('#stepmsg').textContent = msg;
  renderCells($('#cellsSA'), SA, st.r);
  renderCells($('#cellsLCP'), st.snap, st.r);
  $('#stepcmp').textContent = `${st.cmp} of ${kasaiLCP(T, SA).cmp}`;
  $('#steppos').textContent = `Step ${sidx + 1} of ${steps.length}`;
  $('#bBack').disabled = sidx === 0;
  $('#bNext').disabled = sidx === steps.length - 1;
}
function stopPlay(){ if (timer){ clearInterval(timer); timer = null; } $('#bPlay').textContent = 'Play'; }
$('#bNext').onclick = () => { if (sidx < steps.length - 1){ sidx++; renderStep(); } };
$('#bBack').onclick = () => { if (sidx > 0){ sidx--; renderStep(); } };
$('#bReset').onclick = () => { stopPlay(); sidx = 0; renderStep(); };
$('#bPlay').onclick = () => {
  if (timer){ stopPlay(); return; }
  if (sidx === steps.length - 1) sidx = 0;
  $('#bPlay').textContent = 'Pause';
  renderStep();
  timer = setInterval(() => { if (sidx < steps.length - 1){ sidx++; renderStep(); } else stopPlay(); }, 1100);
};
$('#txt').addEventListener('input', e => { T = e.target.value; renderHero(); });

/* ---------- queries ---------- */
function hlText(s, ranges){
  const f = new Array(s.length).fill(false);
  ranges.forEach(([a, l]) => { for (let c = a; c < a + l && c < s.length; c++) f[c] = true; });
  let o = '', open = false;
  for (let c = 0; c < s.length; c++){
    if (f[c] && !open){ o += '<mark>'; open = true; }
    if (!f[c] && open){ o += '</mark>'; open = false; }
    o += esc(s[c]);
  }
  return o + (open ? '</mark>' : '');
}
function renderQueries(){
  const t = $('#qt').value, p = $('#qp').value, u = $('#q2').value;
  if (!t){
    ['#r1','#r2','#r3','#r4'].forEach(q => $(q).innerHTML = '<span class="none">Enter a text to run this query.</span>'); return;
  }
  const sa = buildSA(t), {lcp} = kasaiLCP(t, sa);

  // pattern search
  if (!p) $('#r1').innerHTML = '<span class="none">Enter a pattern to search for.</span>';
  else {
    const r = searchSA(t, sa, p);
    $('#r1').innerHTML = r.pos.length
      ? `<span class="big">${r.pos.length}</span> occurrence${r.pos.length > 1 ? 's' : ''} at position${r.pos.length > 1 ? 's' : ''} ${r.pos.join(', ')}<br><span class="note">Suffix array block: rows ${r.start} to ${r.end - 1}</span><div class="hltext">${hlText(t, r.pos.map(x => [x, p.length]))}</div>`
      : `<span class="big">0</span> occurrences<div class="hltext">${esc(t)}</div>`;
  }
  // LRS
  const lrs = longestRepeated(t, sa, lcp);
  $('#r2').innerHTML = lrs
    ? `<span class="big">${esc(lrs.str)}</span> <span class="note">length ${lrs.len}, found at positions ${lrs.a} and ${lrs.b}</span><div class="hltext">${hlText(t, [[lrs.a, lrs.len], [lrs.b, lrs.len]])}</div>`
    : '<span class="none">No substring repeats in this text.</span>';
  // distinct
  const d = distinctCount(t.length, lcp);
  $('#r3').innerHTML = `<span class="big">${d}</span> <span class="note">distinct substrings out of ${t.length*(t.length+1)/2} total (${t.length*(t.length+1)/2 - d} duplicates)</span>`;
  // LCS
  if (!u) $('#r4').innerHTML = '<span class="none">Enter a second text to compare against.</span>';
  else {
    const l = longestCommon(t, u);
    $('#r4').innerHTML = l
      ? `<span class="big">${esc(l)}</span> <span class="note">length ${l.length}, shared by "${esc(t)}" and "${esc(u)}"</span>`
      : '<span class="none">The two texts share no characters.</span>';
  }
}
['#qt', '#qp', '#q2'].forEach(q => $(q).addEventListener('input', renderQueries));

/* ---------- benchmark (reported results) ---------- */
const BENCH = {
  random: {
    cols: ['n', 'SA build (s)', 'Naive LCP (s)', 'Kasai LCP (s)', 'Speed-up'],
    rows: [[100, .00017, .00003, .00002, '1.6x'], [500, .00096, .00028, .00013, '2.1x'], [1000, .00240, .00060, .00028, '2.2x'],
           [2000, .00500, .00132, .00057, '2.3x'], [4000, .01212, .00298, .00117, '2.6x']],
    n: [100, 500, 1000, 2000, 4000], naive: [.00003, .00028, .00060, .00132, .00298], kasai: [.00002, .00013, .00028, .00057, .00117]
  },
  worst: {
    cols: ['n', 'Naive LCP (s)', 'Kasai LCP (s)', 'Speed-up'],
    rows: [[200, .00145, .00003, '47.6x'], [800, .03609, .00017, '215.0x'], [1600, .15313, .00039, '389.1x'], [3200, .61765, .00079, '786.0x']],
    n: [200, 800, 1600, 3200], naive: [.00145, .03609, .15313, .61765], kasai: [.00003, .00017, .00039, .00079]
  }
};
let mode = 'worst';
function niceMax(v){
  const e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e;
}
function drawChart(){
  const D = BENCH[mode], W = 720, H = 320, L = 64, R = 74, Tp = 18, B = 46;
  const xs = D.n, xmax = xs[xs.length-1];
  const ymax = niceMax(Math.max(...D.naive));
  const X = v => L + (v / xmax) * (W - L - R), Y = v => H - B - (v / ymax) * (H - B - Tp);
  const fmt = v => v >= 0.1 ? v.toFixed(1) : v >= 0.01 ? v.toFixed(2) : v.toFixed(3);
  let s = '';
  for (let g = 0; g <= 4; g++){
    const v = ymax * g / 4, y = Y(v);
    s += `<line class="gl" x1="${L}" x2="${W-R}" y1="${y}" y2="${y}"/><text x="${L-8}" y="${y+4}" text-anchor="end">${fmt(v)}</text>`;
  }
  xs.forEach(v => { s += `<text x="${X(v)}" y="${H-B+18}" text-anchor="middle">${v}</text>`; });
  s += `<line class="ax" x1="${L}" x2="${W-R}" y1="${H-B}" y2="${H-B}"/><line class="ax" x1="${L}" x2="${L}" y1="${Tp}" y2="${H-B}"/>`;
  s += `<text x="${(L+W-R)/2}" y="${H-6}" text-anchor="middle">Input length n</text>`;
  s += `<text x="14" y="${(Tp+H-B)/2}" text-anchor="middle" transform="rotate(-90 14 ${(Tp+H-B)/2})">Time (seconds)</text>`;
  const line = (arr, col, cls, label) => {
    const pts = xs.map((v, i) => `${X(v)},${Y(arr[i])}`).join(' ');
    let o = `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round"/>`;
    xs.forEach((v, i) => { o += `<circle cx="${X(v)}" cy="${Y(arr[i])}" r="4" fill="${col}"><title>n=${v}: ${arr[i]} s</title></circle>`; });
    const lx = X(xs[xs.length-1]) + 8, ly = Y(arr[arr.length-1]) + (cls === 'lab-k' ? -6 : 4);
    return o + `<text class="${cls}" x="${lx}" y="${ly}">${label}</text>`;
  };
  s += line(D.naive, 'var(--accent)', 'lab-n', 'Naive');
  s += line(D.kasai, 'var(--ink)', 'lab-k', 'Kasai');
  $('#chart').innerHTML = s;
  $('#btable').innerHTML = '<tr>' + D.cols.map(c => `<th>${c}</th>`).join('') + '</tr>' +
    D.rows.map(r => '<tr>' + r.map((c, i) => `<td${i === r.length - 1 ? ' class="sp"' : ''}>${c}</td>`).join('') + '</tr>').join('');
  $('#tabR').setAttribute('aria-pressed', mode === 'random');
  $('#tabW').setAttribute('aria-pressed', mode === 'worst');
}
$('#tabR').onclick = () => { mode = 'random'; drawChart(); };
$('#tabW').onclick = () => { mode = 'worst'; drawChart(); };

/* ---------- live benchmark ---------- */
function timeit(fn){
  let reps = 1;
  for (;;){
    const t0 = performance.now();
    for (let r = 0; r < reps; r++) fn();
    const dt = performance.now() - t0;
    if (dt >= 25 || reps > 1e6) return dt / reps;
    reps *= 4;
  }
}
function randomText(n){ let o = ''; const a = 'ACGT'; for (let i = 0; i < n; i++) o += a[Math.floor(Math.random()*4)]; return o; }
$('#runLive').onclick = async () => {
  const btn = $('#runLive'), tbl = $('#livetable');
  btn.disabled = true; btn.textContent = 'Running…';
  tbl.style.display = 'table';
  tbl.innerHTML = '<tr><th>Input</th><th>n</th><th>Naive (ms)</th><th>Kasai (ms)</th><th>Speed-up</th></tr>';
  const jobs = [];
  [250, 500, 1000, 2000].forEach(n => jobs.push(['Random 4-letter', n, randomText(n)]));
  [250, 500, 1000, 2000].forEach(n => jobs.push(['"a" repeated', n, 'a'.repeat(n)]));
  for (const [label, n, s] of jobs){
    await new Promise(r => setTimeout(r, 30));
    const sa = buildSA(s);
    const tn = timeit(() => naiveLCP(s, sa)), tk = timeit(() => kasaiLCP(s, sa));
    const ok = JSON.stringify(naiveLCP(s, sa).lcp) === JSON.stringify(kasaiLCP(s, sa).lcp);
    tbl.insertAdjacentHTML('beforeend',
      `<tr><td>${label}${ok ? '' : ' (MISMATCH)'}</td><td>${n}</td><td>${tn.toFixed(3)}</td><td>${tk.toFixed(3)}</td><td class="sp">${(tn / tk).toFixed(1)}x</td></tr>`);
  }
  btn.disabled = false; btn.textContent = 'Run again';
};

/* ---------- init ---------- */
renderHero(); renderQueries(); drawChart();
