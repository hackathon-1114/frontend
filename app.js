// MOTIF 두 화면(index.html, pose-test.html)이 함께 쓰는 도구.
const MM = (() => {
  const $ = id => document.getElementById(id);
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* 저장소를 못 쓰면 이번 화면에서만 유지 */ } },
  };

  // 예시 사용자는 1번(5주치 기록이 있음). 새 사용자는 이 기기에서만 쓰는 임의 번호를 받는다
  function userKind() { return store.get('mmUserKind') === 'new' ? 'new' : 'example'; }
  function setUserKind(kind) { store.set('mmUserKind', kind); overviewRequest = null; }
  function userId() {
    if (userKind() === 'example') return '1';
    let id = store.get('mmNewUser');
    if (!id) { id = String(1000 + Math.floor(Math.random() * 900000)); store.set('mmNewUser', id); }
    return id;
  }

  // 백엔드와 다른 주소에서 이 화면을 띄울 때는 페이지에서 window.MM_API_BASE에 백엔드 주소를 넣는다
  const BASE = window.MM_API_BASE || '';

  async function api(method, url, body) {
    const res = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', 'X-User-Id': userId() },
      body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!res.ok) { const err = new Error(data.message || data.code); err.code = data.code; throw err; }
    return data.data;
  }

  // 화면에 필요한 것을 한 번에 받아 둔다. 서버가 멀어 호출 한 번이 0.6초쯤 걸리기 때문에,
  // 지난번에 받은 것을 먼저 그리고(cachedOverview) 새로 받은 것으로 다시 그린다.
  let overviewRequest = null;
  const cacheKey = () => 'mmOverview:' + userId();
  function cachedOverview() { try { return JSON.parse(store.get(cacheKey())); } catch (e) { return null; } }
  function keepOverview(data) { store.set(cacheKey(), JSON.stringify(data)); overviewRequest = Promise.resolve(data); return data; }
  function overview(fresh) {
    if (fresh || !overviewRequest) overviewRequest = api('GET', '/api/overview').then(keepOverview);
    return overviewRequest;
  }

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  // why는 그렇게 본 근거다. 접어 두지 않고 본문 아래에 연한 글씨로 바로 보여 준다
  function finding(color, title, state, lines, bullets, why) {
    const row = el('div', null, 'finding');
    const body = el('div');
    body.append(el('strong', title));
    if (state) body.append(el('div', state, 'state'));
    (lines || []).filter(Boolean).forEach(text => body.append(el('p', text)));
    if (bullets && bullets.length) { const ul = el('ul'); bullets.forEach(b => ul.append(el('li', b))); body.append(ul); }
    if (why) body.append(el('p', why, 'why'));
    row.append(el('span', null, 'plate ' + color), body);
    return row;
  }

  const SVG = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, text) {
    const node = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text != null) node.textContent = text;
    return node;
  }

  // 서버가 주는 depth는 엉덩이 높이 비율(서 있으면 1)이다. 화면에는 "앉은 깊이"(얼마나 내려갔나, %)로 보여 준다.
  // 클수록 깊이 앉은 것이라 막대가 높을수록 잘 앉은 것으로 읽힌다.
  const sat = depth => Math.round((1 - depth) * 100);

  const BLUE = '#C6FF3A', RED = '#FF6B6B', TRACK = '#2A332B', SUB = '#7C877D', INK = '#F3F6F1', DOT = '#12160F';   // BLUE는 강조색(라임) 자리

  // 점들을 지나는 부드러운 곡선. 점 사이에서 값이 튀어 오르지 않는 방식(단조 3차 보간)이라 없는 봉우리를 만들지 않는다
  function smooth(pts) {
    const n = pts.length;
    if (n < 3) return 'M' + pts.map(p => p[0] + ',' + p[1]).join(' L');
    const slope = [], tangent = [];
    for (let i = 0; i < n - 1; i++) slope[i] = (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]);
    tangent[0] = slope[0]; tangent[n - 1] = slope[n - 2];
    for (let i = 1; i < n - 1; i++) tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : 2 * slope[i - 1] * slope[i] / (slope[i - 1] + slope[i]);
    let d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (let i = 0; i < n - 1; i++) {
      const third = (pts[i + 1][0] - pts[i][0]) / 3;
      d += ' C' + (pts[i][0] + third) + ',' + (pts[i][1] + tangent[i] * third) + ' ' + (pts[i + 1][0] - third) + ',' + (pts[i + 1][1] - tangent[i + 1] * third)
        + ' ' + pts[i + 1][0] + ',' + pts[i + 1][1];
    }
    return d;
  }

  // 반복마다 앉은 깊이를 선과 영역으로 그린다. 반복이 10회든 40회든 같은 폭에 들어간다.
  // fadeFrom 회차부터는 빨강이고, 점선은 처음 두 번의 깊이다.
  let chartSeq = 0;
  function topOf(reps) { return Math.max(30, ...reps.map(r => sat(r.depth))) * 1.2; }
  function repChart(reps, fadeFrom, opts = {}) {
    const compact = !!opts.compact;
    const width = compact ? 140 : 320, plot = compact ? 58 : 128, head = compact ? 6 : 26, foot = compact ? 4 : 24;
    const padX = compact ? 4 : 12, height = head + plot + foot, floor = head + plot;
    const n = reps.length, top = opts.top || topOf(reps);
    const x = i => n === 1 ? width / 2 : padX + i * (width - padX * 2) / (n - 1);
    const y = value => floor - Math.min(1, value / top) * plot;
    const values = reps.map(r => sat(r.depth));
    const pts = values.map((v, i) => [+x(i).toFixed(1), +y(v).toFixed(1)]);
    const chart = svg('svg', { viewBox: '0 0 ' + width + ' ' + height, class: 'repchart', role: 'img' });
    chart.setAttribute('aria-label', '반복별 앉은 깊이' + (fadeFrom ? ', ' + fadeFrom + '회째부터 덜 앉음' : ''));
    if (!n) return chart;

    // 색이 바뀌는 자리. 마지막으로 지킨 반복과 처음 무너진 반복의 가운데
    const split = fadeFrom && fadeFrom <= n ? (fadeFrom > 1 ? (x(fadeFrom - 2) + x(fadeFrom - 1)) / 2 : 0) : width;
    const id = 'mmclip' + (++chartSeq);
    const defs = svg('defs', {});
    const keep = svg('clipPath', { id: id + 'a' }); keep.append(svg('rect', { x: 0, y: 0, width: split, height }));
    const fade = svg('clipPath', { id: id + 'b' }); fade.append(svg('rect', { x: split, y: 0, width: width - split, height }));
    defs.append(keep, fade);
    // 영역은 아래로 갈수록 옅어지게 칠한다
    [[BLUE, 'c'], [RED, 'd']].forEach(([color, key]) => {
      const wash = svg('linearGradient', { id: id + key, x1: 0, y1: 0, x2: 0, y2: 1 });
      wash.append(svg('stop', { offset: '0', 'stop-color': color, 'stop-opacity': .22 }), svg('stop', { offset: '1', 'stop-color': color, 'stop-opacity': .02 }));
      defs.append(wash);
    });
    chart.append(defs);

    chart.append(svg('line', { x1: 0, y1: floor, x2: width, y2: floor, stroke: TRACK, 'stroke-width': 1.5 }));
    if (n >= 2) {
      const line = smooth(pts);
      const area = line + ' L' + pts[n - 1][0] + ',' + floor + ' L' + pts[0][0] + ',' + floor + ' Z';
      [[BLUE, id + 'a', id + 'c'], [RED, id + 'b', id + 'd']].forEach(([color, clip, wash]) => {
        chart.append(svg('path', { d: area, fill: 'url(#' + wash + ')', 'clip-path': 'url(#' + clip + ')' }));
        chart.append(svg('path', { d: line, fill: 'none', stroke: color, 'stroke-width': compact ? 1.8 : 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          'clip-path': 'url(#' + clip + ')' }));
      });
      const base = y((values[0] + values[1]) / 2);
      chart.append(svg('line', { x1: 0, y1: base, x2: width, y2: base, stroke: SUB, 'stroke-width': 1, 'stroke-dasharray': '2 4', opacity: .7 }));
    }
    if (compact) return chart;

    const faded = i => fadeFrom && i + 1 >= fadeFrom;
    // 점은 반복이 적을 때만 전부 찍는다. 많으면 처음, 무너지기 시작한 곳, 마지막만
    const marked = i => n <= 16 || i === 0 || i === n - 1 || i + 1 === fadeFrom;
    pts.forEach((p, i) => {
      if (marked(i)) chart.append(svg('circle', { cx: p[0], cy: p[1], r: 3.2, fill: DOT, stroke: faded(i) ? RED : BLUE, 'stroke-width': 2 }));
    });
    // 수치는 처음, 무너지기 시작한 곳, 마지막에만 붙인다
    [...new Set([0, fadeFrom ? fadeFrom - 1 : -1, n - 1])].filter(i => i >= 0 && i < n).forEach(i => {
      const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      chart.append(svg('text', { x: pts[i][0] + (i === 0 ? -4 : i === n - 1 ? 4 : 0), y: pts[i][1] - 10, 'text-anchor': anchor, 'font-size': 12, 'font-weight': 700,
        fill: faded(i) ? RED : INK }, values[i] + '%'));
    });
    // 가로축 숫자는 12회까지는 전부, 넘으면 5회 간격으로
    const every = n <= 12 ? 1 : n <= 30 ? 5 : 10;
    reps.forEach((_, i) => {
      if (i === 0 || i === n - 1 || (i + 1) % every === 0) {
        if (every > 1 && i === n - 1 && n % every !== 0 && n % every < every / 2) return;   // 끝 숫자가 앞 숫자와 붙으면 뺀다
        chart.append(svg('text', { x: pts[i][0], y: height - 6, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle', 'font-size': 11,
          fill: faded(i) ? RED : SUB }, i + 1));
      }
    });
    return chart;
  }

  // 처음 깊이를 지킨 반복의 비율을 고리로 그린다
  function ring(kept, total) {
    const r = 30, c = 2 * Math.PI * r, share = total ? kept / total : 0;
    const node = svg('svg', { viewBox: '0 0 76 76', class: 'ring', role: 'img' });
    node.setAttribute('aria-label', total + '회 중 ' + kept + '회가 처음 깊이를 지킴');
    node.append(svg('circle', { cx: 38, cy: 38, r, fill: 'none', stroke: TRACK, 'stroke-width': 8 }));
    node.append(svg('circle', { cx: 38, cy: 38, r, fill: 'none', stroke: share >= 1 ? BLUE : BLUE, 'stroke-width': 8, 'stroke-linecap': 'round',
      'stroke-dasharray': (c * share) + ' ' + c, transform: 'rotate(-90 38 38)' }));
    node.append(svg('text', { x: 38, y: 43, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: INK }, kept + '/' + total));
    return node;
  }

  function when(iso) {
    const d = new Date(iso);
    const day = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + day + '요일 ' + (d.getHours() < 12 ? '오전 ' : '오후 ') + (d.getHours() % 12 || 12) + '시';
  }

  // 측정 화면이 쓰는 관절 추적 모델(약 8MB)을 한가할 때 미리 받아 둔다. 측정 화면이 바로 뜬다
  function warmMeasure() {
    const later = window.requestIdleCallback || (fn => setTimeout(fn, 1500));
    later(() => ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.wasm',
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task']
      .forEach(href => { const link = document.createElement('link'); link.rel = 'prefetch'; link.href = href; link.crossOrigin = 'anonymous'; document.head.append(link); }));
  }

  return { $, userKind, setUserKind, userId, api, overview, cachedOverview, keepOverview, el, finding, repChart, topOf, ring, sat, when, warmMeasure };
})();
