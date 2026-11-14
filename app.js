// MUSCLE MAP 두 화면(index.html, pose-test.html)이 함께 쓰는 도구.
const MM = (() => {
  const $ = id => document.getElementById(id);
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* 저장소를 못 쓰면 이번 화면에서만 유지 */ } },
  };

  // 예시 사용자는 1번(5주치 기록이 있음). 새 사용자는 이 기기에서만 쓰는 임의 번호를 받는다
  function userKind() { return store.get('mmUserKind') === 'new' ? 'new' : 'example'; }
  function setUserKind(kind) { store.set('mmUserKind', kind); }
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
  function svg(tag, attrs) {
    const node = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  // 반복마다 얼마나 깊이 앉았는지를 위에서 아래로 내려오는 선으로 그린다.
  // 선이 길수록 깊이 앉은 것이고, fadeFrom 회차부터는 빨강으로 바뀐다.
  function repChart(reps, fadeFrom, opts = {}) {
    const compact = !!opts.compact;
    const n = Math.max(reps.length, 1);
    const step = compact ? 16 : 34;
    const pad = compact ? 8 : 20;
    const width = pad * 2 + step * (n - 1);
    const top = 6, floor = compact ? 70 : 150, height = floor + (compact ? 8 : 34);
    // 가장 깊은 반복이 바닥 근처에 오도록 눈금을 맞춘다. 여러 세트를 나란히 그릴 때는 opts.deepest로 같은 눈금을 쓴다
    const deepest = opts.deepest || deepestOf(reps);
    const y = depth => top + Math.max(0, Math.min(1, (1 - depth) / deepest)) * (floor - top);
    const chart = svg('svg', { viewBox: '0 0 ' + Math.max(width, compact ? 150 : 320) + ' ' + height, class: 'repchart', role: 'img' });
    chart.setAttribute('aria-label', '반복별 앉은 깊이' + (fadeFrom ? ', ' + fadeFrom + '회째부터 얕아짐' : ''));

    if (fadeFrom && !compact) {
      const x0 = pad + step * (fadeFrom - 1) - step / 2;
      chart.append(svg('rect', { x: x0, y: 0, width: pad + step * (n - 1) + step / 2 - x0, height: floor + 8, fill: '#D63A2F', opacity: .07 }));
    }
    chart.append(svg('line', { x1: 0, y1: top, x2: '100%', y2: top, stroke: '#1C1F1E', 'stroke-width': compact ? 1.5 : 2 }));
    if (reps.length >= 2) {
      const base = y((reps[0].depth + reps[1].depth) / 2);
      chart.append(svg('line', { x1: 0, y1: base, x2: '100%', y2: base, stroke: '#D3D8D6', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }));
    }
    reps.forEach((rep, i) => {
      const x = pad + step * i;
      const faded = fadeFrom && i + 1 >= fadeFrom;
      const color = faded ? '#D63A2F' : '#1C1F1E';
      const g = svg('g', { class: 'drop', style: 'animation-delay:' + (i * 35) + 'ms' });
      g.append(svg('line', { x1: x, y1: top, x2: x, y2: y(rep.depth), stroke: color, 'stroke-width': compact ? 2 : 3 }),
        svg('circle', { cx: x, cy: y(rep.depth), r: compact ? 3.5 : 7, fill: color }));
      chart.append(g);
      if (!compact) {
        const label = svg('text', { x, y: height - 8, 'text-anchor': 'middle', 'font-size': 12, fill: faded ? '#D63A2F' : '#5E6664', 'font-family': 'inherit' });
        label.textContent = i + 1;
        chart.append(label);
      }
    });
    return chart;
  }

  function deepestOf(reps) {
    return Math.max(0.3, ...reps.map(r => 1 - r.depth)) * 1.1;
  }

  function when(iso) {
    const d = new Date(iso);
    const day = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + day + '요일 ' + (d.getHours() < 12 ? '오전 ' : '오후 ') + (d.getHours() % 12 || 12) + '시';
  }

  return { $, userKind, setUserKind, userId, api, el, finding, repChart, deepestOf, when };
})();
