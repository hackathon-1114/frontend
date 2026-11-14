// MUSCLE MAP 두 화면(index.html, pose-test.html)이 함께 쓰는 도구.
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

  function finding(color, title, state, lines, bullets) {
    const row = el('div', null, 'finding');
    const body = el('div');
    body.append(el('strong', title));
    if (state) body.append(el('div', state, 'state'));
    (lines || []).filter(Boolean).forEach(text => body.append(el('p', text)));
    if (bullets && bullets.length) { const ul = el('ul'); bullets.forEach(b => ul.append(el('li', b))); body.append(ul); }
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

  const BLUE = '#1D5BBF', RED = '#D63A2F', TRACK = '#EEF1F0', SUB = '#5E6664';

  // 반복마다 앉은 깊이를 둥근 막대로 그린다. fadeFrom 회차부터는 빨강이고, 점선은 처음 두 번의 깊이다.
  function topOf(reps) { return Math.max(30, ...reps.map(r => sat(r.depth))) * 1.18; }
  function repChart(reps, fadeFrom, opts = {}) {
    const compact = !!opts.compact;
    const bar = compact ? 9 : 20, gap = compact ? 5 : 13, step = bar + gap;
    const plot = compact ? 62 : 132, head = compact ? 4 : 20, foot = compact ? 2 : 24;
    const content = Math.max(reps.length, 1) * step - gap;
    const width = Math.max(content, compact ? 140 : 318);
    const height = head + plot + foot;
    const top = opts.top || topOf(reps);
    const h = value => Math.max(bar, value / top * plot);   // 너무 낮아도 둥근 머리는 보이게
    const chart = svg('svg', { viewBox: '0 0 ' + width + ' ' + height, class: 'repchart', role: 'img' });
    chart.setAttribute('aria-label', '반복별 앉은 깊이' + (fadeFrom ? ', ' + fadeFrom + '회째부터 덜 앉음' : ''));

    reps.forEach((rep, i) => {
      const x = i * step, value = sat(rep.depth), faded = fadeFrom && i + 1 >= fadeFrom;
      chart.append(svg('rect', { x, y: head, width: bar, height: plot, rx: bar / 2, fill: TRACK }));
      chart.append(svg('rect', { x, y: head + plot - h(value), width: bar, height: h(value), rx: bar / 2, fill: faded ? RED : BLUE,
        class: 'grow', style: 'animation-delay:' + (i * 30) + 'ms' }));
      if (!compact) {
        chart.append(svg('text', { x: x + bar / 2, y: head + plot - h(value) - 5, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700,
          fill: faded ? RED : SUB }, value));
        chart.append(svg('text', { x: x + bar / 2, y: height - 6, 'text-anchor': 'middle', 'font-size': 12, fill: SUB }, i + 1));
      }
    });
    if (reps.length >= 2) {
      const base = head + plot - h((sat(reps[0].depth) + sat(reps[1].depth)) / 2);
      chart.append(svg('line', { x1: 0, y1: base, x2: width, y2: base, stroke: '#1C1F1E', 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: .45 }));
      if (!compact && content < width - 50) {
        chart.append(svg('text', { x: width, y: base - 5, 'text-anchor': 'end', 'font-size': 11, fill: SUB }, '처음 깊이'));
      }
    }
    return chart;
  }

  // 처음 깊이를 지킨 반복의 비율을 고리로 그린다
  function ring(kept, total) {
    const r = 30, c = 2 * Math.PI * r, share = total ? kept / total : 0;
    const node = svg('svg', { viewBox: '0 0 76 76', class: 'ring', role: 'img' });
    node.setAttribute('aria-label', total + '회 중 ' + kept + '회가 처음 깊이를 지킴');
    node.append(svg('circle', { cx: 38, cy: 38, r, fill: 'none', stroke: TRACK, 'stroke-width': 9 }));
    node.append(svg('circle', { cx: 38, cy: 38, r, fill: 'none', stroke: share >= 1 ? '#2F8F5B' : BLUE, 'stroke-width': 9, 'stroke-linecap': 'round',
      'stroke-dasharray': (c * share) + ' ' + c, transform: 'rotate(-90 38 38)' }));
    node.append(svg('text', { x: 38, y: 43, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 800, fill: '#1C1F1E' }, kept + '/' + total));
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
