// ============================================================================
// JARVIS — cérebro 3D da página inicial (Three.js, cópia local em vendor/)
// Recebe o grafo montado pelo app (montarGrafoCerebro: áreas → seções → itens) e
// desenha uma esfera girável: as bolinhas de verdade + "nuvens" de partículas em
// volta de cada área + poeira fina que flutua (a "neve"). Na página inicial só as
// ÁREAS têm nome; ao tocar numa área ela vem para a frente e mostra a ramificação.
// Conversa com o app por window.JarvisBrain (iniciar, carregar, focarArea, voltar...).
// Nada aqui grava dados: é só o desenho.
// ============================================================================
import * as THREE from './vendor/three.module.min.js';

const R = 100;              // raio da esfera (unidades do mundo)
const REL_AREA = 0.5;       // quanto a câmera se aproxima ao abrir uma área (1 = visão geral)
const COR_NUCLEO = '#5e9cff';
const J = {
  renderer: null, cena: null, camera: null, mundo: null, host: null, op: {},
  nos: [], porId: {}, pontos: null, linhas: null, poeira: null, auras: [], aneis: null, segs: [],
  rel: 1, relAlvo: 1, baseDist: 330, prof: 330, raioFoco: 0, ox: 0, oxAlvo: 0, oy: 0, oyAlvo: 0, qAlvo: null, qAtual: null, velRot: { x: 0, y: 0 }, autoGiro: true,
  foco: null, sel: null, ativo: false, raf: 0, t0: performance.now(), ptrs: new Map(), gesto: null, ultimaInteracao: 0,
  elRotulos: {}, fundo: new THREE.Color('#f2f2f7'), escala: 1, tamBase: null
};

// --- utilidades ---
function semente(n) { let s = n || 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function dirAleatoria(rnd) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); return new THREE.Vector3(r * Math.cos(th), u, r * Math.sin(th)); }
function corDe(css) { const c = new THREE.Color(); try { c.setStyle(css); } catch (e) { c.set('#8e8e93'); } return c; }
function texturaAura() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.3, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dist() { return J.baseDist * J.rel; }

// --- sombreadores: bolinha redonda com brilho, tamanho "de verdade" (perto = maior) e névoa de profundidade ---
const VERT_NO = `
attribute float aTam; attribute float aAlfa; attribute vec3 aCor; attribute float aPulso;
uniform float uEscala; uniform float uDist; uniform float uTempo; uniform float uDeriva; uniform vec3 uFundo;
varying vec3 vCor; varying float vAlfa;
void main() {
  vec3 p = position;
  p += uDeriva * vec3(sin(uTempo * 0.35 + position.y * 0.07), cos(uTempo * 0.3 + position.x * 0.06), sin(uTempo * 0.25 + position.z * 0.05));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float prof = clamp((-mv.z - (uDist - ${R.toFixed(1)})) / ${(2 * R).toFixed(1)}, 0.0, 1.0);
  vCor = mix(aCor, uFundo, prof * 0.62);
  vAlfa = aAlfa * (1.0 - prof * 0.55);
  float pulso = 1.0 + aPulso * 0.07 * sin(uTempo * 1.8 + position.x * 0.05);
  gl_PointSize = max(1.5, aTam * pulso * uEscala / -mv.z);
}`;
const FRAG_NO = `
varying vec3 vCor; varying float vAlfa;
void main() {
  vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
  float borda = smoothstep(0.5, 0.4, d);
  float brilho = smoothstep(0.3, 0.0, length(c - vec2(-0.12, -0.12))) * 0.35;
  gl_FragColor = vec4(mix(vCor, vec3(1.0), brilho), borda * vAlfa);
}`;
function materialPontos(deriva) {
  return new THREE.ShaderMaterial({
    uniforms: { uEscala: { value: J.escala }, uDist: { value: dist() }, uTempo: { value: 0 }, uDeriva: { value: deriva || 0 }, uFundo: { value: J.fundo } },
    vertexShader: VERT_NO, fragmentShader: FRAG_NO, transparent: true, depthWrite: false
  });
}
function geometriaPontos(pos, cor, tam, alfa, pulso) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aCor', new THREE.Float32BufferAttribute(cor, 3));
  g.setAttribute('aTam', new THREE.Float32BufferAttribute(tam, 1)); g.setAttribute('aAlfa', new THREE.Float32BufferAttribute(alfa, 1));
  g.setAttribute('aPulso', new THREE.Float32BufferAttribute(pulso, 1)); return g;
}

// --- disposição 3D: áreas numa coroa inclinada, seções em volta da área, itens em volta do "pai" ---
function dispor(grafo) {
  const rnd = semente(11);
  const nos = grafo.nos.map(n => ({ id: n.id, nome: n.nome, tipo: n.tipo, area: n.area, cor: n.tipo === 'centro' ? COR_NUCLEO : n.cor, categoria: !!n.categoria, grau: n.grau || 0, p: new THREE.Vector3() }));
  const porId = {}; nos.forEach(n => { porId[n.id] = n; });
  const ordem = { centro: 0, area: 1, secao: 2, item: 3 }; const nivel = n => ordem[n.tipo] + (n.categoria ? -0.5 : 0);
  const pais = {}; // cada seção/item fica perto do "pai" mais específico (item → seção → área)
  grafo.links.forEach(l => {
    const a = porId[l.a.id], b = porId[l.b.id]; if (!a || !b) return;
    const [pai, filho] = nivel(a) <= nivel(b) ? [a, b] : [b, a];
    if (filho.tipo === 'centro' || pai === filho) return;
    const atual = pais[filho.id];
    if (!atual || nivel(pai) > nivel(atual) || (pai.area === filho.area && atual.area !== filho.area)) pais[filho.id] = pai;
  });
  const areas = nos.filter(n => n.tipo === 'area');
  // áreas espalhadas pela esfera toda (espiral de Fibonacci), não num anel: fica um "cérebro" redondo
  areas.forEach((a, i) => { const y = (1 - (i + 0.5) / areas.length * 2) * 0.8, r = Math.sqrt(1 - y * y), ang = i * 2.39996 + 0.6; a.p.set(Math.cos(ang) * r, y, Math.sin(ang) * r).multiplyScalar(R * 0.7); });
  const centro = porId.centro;
  // em volta do pai, mas "achatado" para os lados (plano de frente para fora da esfera): quando a área
  // vem para a frente da câmera, os setores e itens se abrem na tela em vez de ficarem um atrás do outro
  const colocar = (n, base, raio, achatar) => {
    const d = dirAleatoria(rnd); const fora = base.lengthSq() > 1 ? base.clone().normalize() : null;
    if (fora && achatar) d.addScaledVector(fora, -achatar * d.dot(fora)).normalize();
    n.p.copy(base).add(d.multiplyScalar(raio * (0.7 + rnd() * 0.5))); if (n.p.length() > R * 0.97) n.p.setLength(R * 0.97);
  };
  const paiDe = n => pais[n.id] || porId['a-' + n.area] || centro;
  nos.filter(n => n.tipo === 'secao').forEach(s => { const a = porId['a-' + s.area]; colocar(s, a ? a.p.clone().multiplyScalar(1.08) : new THREE.Vector3(), 30, 0.75); });
  nos.filter(n => n.tipo === 'item' && n.categoria).forEach(it => colocar(it, paiDe(it).p, 15, 0.5));
  nos.filter(n => n.tipo === 'item' && !n.categoria).forEach(it => colocar(it, paiDe(it).p, 11, 0.5));
  // relaxa: afasta o que ficou grudado e segura cada um perto do pai
  const minD = 6.5, chave = v => `${Math.floor(v.x / minD)},${Math.floor(v.y / minD)},${Math.floor(v.z / minD)}`;
  for (let iter = 0; iter < 36; iter++) {
    const grade = new Map(); nos.forEach(n => { const k = chave(n.p); if (!grade.has(k)) grade.set(k, []); grade.get(k).push(n); });
    nos.forEach(n => {
      if (n.tipo === 'centro' || n.tipo === 'area') return;
      const [cx, cy, cz] = chave(n.p).split(',').map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        (grade.get(`${cx + dx},${cy + dy},${cz + dz}`) || []).forEach(o => { if (o === n) return; const d = n.p.distanceTo(o.p); if (d < minD && d > 0.001) n.p.addScaledVector(n.p.clone().sub(o.p).normalize(), (minD - d) * 0.5); });
      }
      const pai = pais[n.id]; if (pai) { const alvo = n.tipo === 'secao' ? 30 : n.categoria ? 15 : 11; if (n.p.distanceTo(pai.p) > alvo * 1.7) n.p.lerp(pai.p, 0.08); }
      if (n.p.length() > R * 0.97) n.p.setLength(R * 0.97);
    });
  }
  return { nos, porId };
}

// --- monta a cena ---
function limparMundo() { if (!J.mundo) return; J.cena.remove(J.mundo); J.mundo.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
function construir(grafo) {
  const { nos, porId } = dispor(grafo);
  J.nos = nos; J.porId = porId;
  limparMundo(); J.mundo = new THREE.Group(); J.cena.add(J.mundo);
  if (J.qAtual) J.mundo.quaternion.copy(J.qAtual); else J.mundo.rotation.set(0.18, -0.5, 0);
  // bolinhas de verdade (tamanho em unidades do mundo)
  const tam = n => n.tipo === 'centro' ? 9 : n.tipo === 'area' ? 8 : n.tipo === 'secao' ? 4.4 : n.categoria ? 3.6 : 2.3 + Math.min(1.6, Math.sqrt(n.grau) * 0.4);
  const pos = [], cor = [], tamA = [], alfa = [], pulso = [];
  nos.forEach((n, i) => { n.i = i; pos.push(n.p.x, n.p.y, n.p.z); const c = corDe(n.cor); cor.push(c.r, c.g, c.b); tamA.push(tam(n)); alfa.push(1); pulso.push(n.tipo === 'area' || n.tipo === 'centro' ? 1 : 0); });
  J.pontos = new THREE.Points(geometriaPontos(pos, cor, tamA, alfa, pulso), materialPontos(0.35)); J.pontos.renderOrder = 3; J.mundo.add(J.pontos);
  J.tamBase = Float32Array.from(tamA);
  // ligações
  J.segs = grafo.links.map(l => [porId[l.a.id], porId[l.b.id]]).filter(x => x[0] && x[1]);
  const seg = [], segCor = [];
  J.segs.forEach(([a, b]) => { seg.push(a.p.x, a.p.y, a.p.z, b.p.x, b.p.y, b.p.z); segCor.push(0, 0, 0, 0, 0, 0); });
  const gL = new THREE.BufferGeometry(); gL.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3)); gL.setAttribute('color', new THREE.Float32BufferAttribute(segCor, 3));
  J.linhas = new THREE.LineSegments(gL, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false }));
  J.linhas.renderOrder = 1; J.mundo.add(J.linhas);
  // nuvens de informação (em volta de cada área) + poeira fina na esfera toda (a "neve")
  const rnd = semente(23); const dPos = [], dCor = [], dTam = [], dAlfa = [], dPulso = [];
  nos.filter(n => n.tipo === 'area').forEach(a => {
    const c = corDe(a.cor).lerp(new THREE.Color('#ffffff'), 0.2);
    for (let k = 0; k < 120; k++) { const v = dirAleatoria(rnd).multiplyScalar(7 + Math.pow(rnd(), 0.6) * 34).add(a.p); if (v.length() > R * 1.02) v.setLength(R * 1.02); dPos.push(v.x, v.y, v.z); dCor.push(c.r, c.g, c.b); dTam.push(0.7 + rnd() * 1.1); dAlfa.push(0.3 + rnd() * 0.35); dPulso.push(0); }
  });
  for (let k = 0; k < 1400; k++) { const v = dirAleatoria(rnd).multiplyScalar(R * (0.15 + 0.9 * Math.pow(rnd(), 0.3))); dPos.push(v.x, v.y, v.z); const g = 0.55 + rnd() * 0.15; dCor.push(g, g + 0.03, g + 0.09); dTam.push(0.5 + rnd() * 0.9); dAlfa.push(0.25 + rnd() * 0.35); dPulso.push(0); }
  J.poeira = new THREE.Points(geometriaPontos(dPos, dCor, dTam, dAlfa, dPulso), materialPontos(2.4)); J.poeira.renderOrder = 0; J.mundo.add(J.poeira);
  // auras suaves nas áreas e no núcleo
  const tex = J.tex || (J.tex = texturaAura()); J.auras = [];
  nos.filter(n => n.tipo === 'area' || n.tipo === 'centro').forEach(n => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: corDe(n.cor), transparent: true, opacity: 0.5, depthWrite: false }));
    s.position.copy(n.p); s.scale.setScalar(n.tipo === 'centro' ? 48 : 40); s.renderOrder = 2; s.userData.no = n; J.mundo.add(s); J.auras.push(s);
  });
  // anéis orbitais finos (o "HUD" do JARVIS) — ficam fora do mundo e giram sozinhos
  if (!J.aneis) {
    J.aneis = new THREE.Group();
    [[1.1, 0.12, 0, 0.2], [1.2, 1.15, 0.4, 0.13], [1.3, -0.7, 1.1, 0.09]].forEach(([esc, rx, rz, op]) => {
      const pts = []; for (let k = 0; k <= 160; k++) { const a = k / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R * esc, 0, Math.sin(a) * R * esc)); }
      const anel = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#6f9be0', transparent: true, opacity: op, depthWrite: false }));
      anel.rotation.set(rx, 0, rz); J.aneis.add(anel);
    });
    J.cena.add(J.aneis);
  }
  prepararRotulos();
  aplicarFoco(J.foco);
  if (J.sel && !J.porId[J.sel]) J.sel = null; marcarSel();
}

// --- nomes (HTML por cima do 3D): áreas sempre; seções/itens só na ramificação ---
function prepararRotulos() {
  const cont = J.op.rotulos; if (!cont) return; cont.innerHTML = ''; J.elRotulos = {};
  J.nos.forEach(n => {
    if (n.tipo === 'centro') return;
    const el = document.createElement('div');
    el.className = `jv-rotulo jv-${n.tipo}${n.categoria ? ' jv-cat' : ''}`; el.style.setProperty('--cor', n.cor); el.style.opacity = '0';
    el.innerHTML = '<i></i><span></span>'; el.querySelector('span').textContent = n.nome;
    cont.appendChild(el); J.elRotulos[n.id] = el;
  });
}
const _v = new THREE.Vector3();
function projetar(n, w, h) { _v.copy(n.p).applyMatrix4(J.mundo.matrixWorld); const z = _v.z; _v.project(J.camera); return { x: (_v.x + 1) / 2 * w, y: (1 - _v.y) / 2 * h, z, fora: _v.z > 1 }; }
function atualizarRotulos() {
  const w = J.host.clientWidth, h = J.host.clientHeight; J.mundo.updateMatrixWorld();
  const perto = J.rel < 0.42; const ocupados = [];
  const lista = [];
  J.nos.forEach(n => {
    const el = J.elRotulos[n.id]; if (!el) return;
    const candidato = n.tipo === 'area' || (J.foco && n.area === J.foco && (n.tipo === 'secao' || n.categoria || perto)) || n.id === J.sel;
    if (!candidato) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
    lista.push({ n, el, ...projetar(n, w, h) });
  });
  // ordem de quem ganha o espaço: áreas acesas → o escolhido → setores/itens (da frente para trás) → áreas apagadas
  const forte = n => n.tipo === 'area' && (!J.foco || n.area === J.foco);
  const prio = n => forte(n) ? 0 : n.id === J.sel ? 1 : n.tipo === 'area' ? 3 : 2;
  lista.sort((a, b) => prio(a.n) - prio(b.n) || b.z - a.z);
  lista.forEach(({ n, el, x, y, z, fora }) => {
    const frente = Math.max(0, Math.min(1, (z + R) / (2 * R))); // 0 = fundo, 1 = frente
    let visivel = !fora, embaixo = false;
    if (visivel && !forte(n)) {
      // tenta em cima da bolinha; se bater em outro nome, tenta embaixo; se ainda bater, some (aparece ao aproximar)
      const larg = Math.min(170, 22 + n.nome.length * 6.4), alt = 24, bate = r => ocupados.some(o => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0);
      const cima = { x0: x - larg / 2, x1: x + larg / 2, y0: y - alt - 8, y1: y - 6 }, baixo = { x0: cima.x0, x1: cima.x1, y0: y + 6, y1: y + alt + 8 };
      if (!bate(cima)) ocupados.push(cima); else if (!bate(baixo)) { ocupados.push(baixo); embaixo = true; } else visivel = false;
    } else if (visivel) { // área sempre aparece; se bater noutra área, desce para baixo da bolinha
      const larg = 32 + n.nome.length * 7.6, cima = { x0: x - larg / 2, x1: x + larg / 2, y0: y - 40, y1: y - 6 };
      if (ocupados.some(o => cima.x0 < o.x1 && cima.x1 > o.x0 && cima.y0 < o.y1 && cima.y1 > o.y0)) { embaixo = true; ocupados.push({ x0: cima.x0, x1: cima.x1, y0: y + 6, y1: y + 40 }); } else ocupados.push(cima);
    }
    if (!visivel) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
    const op = n.tipo === 'area' ? (J.foco ? (n.area === J.foco ? 1 : 0.3) : 0.68 + frente * 0.32) : 0.4 + frente * 0.6;
    const esc = n.tipo === 'area' ? 0.84 + frente * 0.2 : 0.92 + frente * 0.1;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${embaixo ? '9px' : 'calc(-100% - 9px)'}) scale(${esc.toFixed(3)})`;
    el.classList.toggle('embaixo', embaixo);
    el.style.opacity = op.toFixed(2); el.style.zIndex = String(Math.round(frente * 100) + (n.tipo === 'area' ? 200 : 0) + (n.id === J.sel ? 400 : 0));
    el.classList.toggle('sel', n.id === J.sel);
  });
}
function rotuloNoPonto(cx, cy) {
  let melhor = null, zMax = -1;
  Object.entries(J.elRotulos).forEach(([id, el]) => {
    if (parseFloat(el.style.opacity || '0') < 0.25) return; const r = el.getBoundingClientRect();
    if (cx >= r.left - 4 && cx <= r.right + 4 && cy >= r.top - 4 && cy <= r.bottom + 4) { const z = +el.style.zIndex || 0; if (z > zMax) { zMax = z; melhor = J.porId[id]; } }
  });
  return melhor;
}

// --- foco numa área (ramificação) e seleção ---
function aplicarFoco(area) {
  J.foco = area || null; if (!J.pontos) return;
  const alfa = J.pontos.geometry.getAttribute('aAlfa');
  J.nos.forEach(n => { alfa.array[n.i] = !area || n.area === area || n.tipo === 'centro' ? 1 : 0.13; });
  alfa.needsUpdate = true; marcarSel();
  J.auras.forEach(s => { const n = s.userData.no; s.material.opacity = !area || n.area === area || n.tipo === 'centro' ? 0.5 : 0.1; });
  const cor = J.linhas.geometry.getAttribute('color'); const cinza = J.fundo.clone().lerp(new THREE.Color('#8e8e93'), 0.45);
  J.segs.forEach(([a, b], k) => {
    const base = corDe(b.tipo === 'centro' ? a.cor : b.cor); const liga = !area || a.area === area || b.area === area;
    const c = liga ? base.lerp(J.fundo, area ? 0.15 : 0.5) : cinza.clone().lerp(J.fundo, 0.75);
    cor.setXYZ(k * 2, c.r, c.g, c.b); cor.setXYZ(k * 2 + 1, c.r, c.g, c.b);
  });
  cor.needsUpdate = true;
}
function marcarSel() {
  if (!J.pontos || !J.tamBase) return; const tam = J.pontos.geometry.getAttribute('aTam');
  J.nos.forEach(n => { tam.array[n.i] = J.tamBase[n.i] * (n.id === J.sel ? 1.7 : J.foco && n.area === J.foco && n.tipo !== 'area' ? 1.25 : 1); });
  tam.needsUpdate = true;
}
/** Gira o mundo para que o ponto p (coordenadas do mundo) fique de frente para a câmera. */
function trazerParaFrente(p) {
  const atual = p.clone().applyQuaternion(J.mundo.quaternion); if (atual.length() < 1) return;
  J.raioFoco = p.length(); // o empurrão na tela é medido na profundidade do que está em foco
  const q = new THREE.Quaternion().setFromUnitVectors(atual.normalize(), new THREE.Vector3(0, 0, 1));
  J.qAlvo = q.multiply(J.mundo.quaternion.clone());
}
function focarArea(area, avisar) {
  const a = J.porId['a-' + area]; if (!a) return;
  trazerParaFrente(a.p); J.relAlvo = REL_AREA; J.autoGiro = false; J.velRot = { x: 0, y: 0 }; J.sel = null;
  aplicarFoco(area); tocar();
  if (avisar !== false && J.op.onArea) J.op.onArea(area);
}
function focarNo(id) {
  const n = J.porId[id]; if (!n) return;
  if (n.tipo === 'area') { focarArea(n.area); return; }
  if (n.area && J.foco !== n.area) aplicarFoco(n.area);
  J.sel = n.tipo === 'centro' ? null : id; marcarSel();
  trazerParaFrente(n.p); J.relAlvo = Math.min(J.relAlvo, n.tipo === 'item' ? 0.4 : 0.5); J.autoGiro = false; tocar();
}
function voltar() { J.sel = null; aplicarFoco(null); J.relAlvo = 1; J.qAlvo = null; J.autoGiro = true; tocar(); }

// --- gestos: girar com o dedo (inércia), pinça/roda para aproximar, toque escolhe ---
function noNaTela(sx, sy) {
  const w = J.host.clientWidth, h = J.host.clientHeight; J.mundo.updateMatrixWorld();
  let melhor = null, melhorPts = Infinity;
  J.nos.forEach(n => {
    if (n.tipo === 'centro') return;
    if (J.foco && n.area !== J.foco && n.tipo !== 'area') return;
    if (!J.foco && n.tipo !== 'area') return; // na visão geral só as áreas respondem ao toque
    const p = projetar(n, w, h); if (p.fora) return;
    const d = Math.hypot(p.x - sx, p.y - sy); const alcance = n.tipo === 'area' ? 36 : 20;
    const pts = d - (p.z + R) * 0.05; // em empate, quem está na frente ganha
    if (d < alcance && pts < melhorPts) { melhor = n; melhorPts = pts; }
  });
  return melhor;
}
function prepararGestos(el) {
  const pos = e => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  el.addEventListener('pointerdown', e => {
    try { el.setPointerCapture(e.pointerId); } catch (err) { }
    J.ptrs.set(e.pointerId, pos(e)); J.ultimaInteracao = performance.now();
    if (J.ptrs.size === 2) { const [a, b] = [...J.ptrs.values()]; J.gesto = { tipo: 'pinca', d: Math.hypot(a.x - b.x, a.y - b.y) }; return; }
    const p = pos(e); J.gesto = { tipo: 'giro', ini: p, ult: p, cli: { x: e.clientX, y: e.clientY }, mexeu: false }; J.velRot = { x: 0, y: 0 }; tocar();
  });
  el.addEventListener('pointermove', e => {
    const p = pos(e);
    if (!J.ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') el.style.cursor = rotuloNoPonto(e.clientX, e.clientY) || noNaTela(p.x, p.y) ? 'pointer' : 'grab'; return; }
    J.ptrs.set(e.pointerId, p); const g = J.gesto; if (!g) return; J.ultimaInteracao = performance.now();
    if (g.tipo === 'pinca' && J.ptrs.size === 2) { const [a, b] = [...J.ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); J.relAlvo = Math.max(0.3, Math.min(1.7, J.relAlvo * g.d / d)); J.rel = J.relAlvo; g.d = d; tocar(); return; }
    if (g.tipo !== 'giro') return;
    const dx = p.x - g.ult.x, dy = p.y - g.ult.y;
    if (!g.mexeu && Math.hypot(p.x - g.ini.x, p.y - g.ini.y) > 6) { g.mexeu = true; J.qAlvo = null; }
    if (!g.mexeu) return;
    const k = 0.0055 * Math.min(1.2, J.rel + 0.2);
    girar(dx * k, dy * k); J.velRot = { x: dx * k, y: dy * k }; g.ult = p; tocar();
  });
  const soltar = e => {
    const g = J.gesto; J.ptrs.delete(e.pointerId); if (!g) return;
    if (g.tipo === 'pinca') { if (J.ptrs.size === 0) J.gesto = null; return; }
    J.gesto = null; J.ultimaInteracao = performance.now();
    if (!g.mexeu && e.type === 'pointerup') {
      const n = rotuloNoPonto(g.cli.x, g.cli.y) || noNaTela(g.ini.x, g.ini.y);
      if (n) { if (n.tipo === 'area') focarArea(n.area); else { focarNo(n.id); if (J.op.onNo) J.op.onNo(n.id); } }
      else if (J.op.onToqueVazio) J.op.onToqueVazio();
    }
    tocar();
  };
  el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
  el.addEventListener('wheel', e => { e.preventDefault(); J.relAlvo = Math.max(0.3, Math.min(1.7, J.relAlvo * Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0012)))); J.ultimaInteracao = performance.now(); tocar(); }, { passive: false });
}
const _qx = new THREE.Quaternion(), _qy = new THREE.Quaternion(), EIXO_X = new THREE.Vector3(1, 0, 0), EIXO_Y = new THREE.Vector3(0, 1, 0);
function girar(ax, ay) { _qy.setFromAxisAngle(EIXO_Y, ax); _qx.setFromAxisAngle(EIXO_X, ay); J.mundo.quaternion.premultiply(_qy).premultiply(_qx); J.qAtual = J.mundo.quaternion.clone(); }

// --- laço de desenho ---
function quadro() {
  J.raf = 0; if (!J.ativo || !J.mundo) return;
  const agora = performance.now(); const t = (agora - J.t0) / 1000;
  if (!J.gesto) {
    if (Math.abs(J.velRot.x) + Math.abs(J.velRot.y) > 0.00015) { girar(J.velRot.x, J.velRot.y); J.velRot.x *= 0.95; J.velRot.y *= 0.95; }
    else if (J.autoGiro && !J.qAlvo && agora - J.ultimaInteracao > 2200) girar(0.0018, 0);
  }
  if (J.qAlvo) { J.mundo.quaternion.slerp(J.qAlvo, 0.085); J.qAtual = J.mundo.quaternion.clone(); if (J.mundo.quaternion.angleTo(J.qAlvo) < 0.002) J.qAlvo = null; }
  J.rel += (J.relAlvo - J.rel) * 0.09; J.ox += (J.oxAlvo - J.ox) * 0.09; J.oy += (J.oyAlvo - J.oy) * 0.09;
  const d = dist(); J.prof += ((J.foco ? d - J.raioFoco : d) - J.prof) * 0.09;
  const u = 2 * Math.max(20, J.prof) * Math.tan(J.camera.fov * Math.PI / 360) / (J.host.clientHeight || 1); // unidades do mundo por pixel (na profundidade do foco)
  const cx = -J.ox * u, cy = J.oy * u; J.camera.position.set(cx, cy, d); J.camera.lookAt(cx, cy, 0);
  J.cena.fog.near = d - R * 0.4; J.cena.fog.far = d + R * 2.2;
  [J.pontos, J.poeira].forEach(p => { if (p) { p.material.uniforms.uTempo.value = t; p.material.uniforms.uDist.value = d; } });
  if (J.aneis) { J.aneis.rotation.y = t * 0.05; J.aneis.rotation.x = Math.sin(t * 0.1) * 0.08; }
  J.renderer.render(J.cena, J.camera);
  atualizarRotulos();
  J.raf = requestAnimationFrame(quadro);
}
function tocar() { if (J.ativo && !J.raf) J.raf = requestAnimationFrame(quadro); }
function redimensionar() {
  if (!J.renderer || !J.host) return; const w = J.host.clientWidth, h = J.host.clientHeight; if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1); J.renderer.setPixelRatio(dpr); J.renderer.setSize(w, h, false);
  const aspecto = w / h; J.camera.aspect = aspecto; J.camera.fov = aspecto < 1 ? 50 : 42; J.camera.updateProjectionMatrix();
  const tg = Math.tan(J.camera.fov * Math.PI / 360);
  J.baseDist = Math.max(R * 1.2 / tg, R * 1.1 / (tg * Math.min(1, aspecto))); // a esfera cabe na tela (em pé ou deitada)
  J.escala = h * dpr / 2 / tg; [J.pontos, J.poeira].forEach(p => { if (p) p.material.uniforms.uEscala.value = J.escala; });
}

// --- API usada pelo app ---
window.JarvisBrain = {
  /** Cria o 3D dentro de `host`. opcoes: { rotulos (div para os nomes), fundo (cor css), onArea(area), onNo(id), onToqueVazio() } */
  iniciar(host, opcoes) {
    try {
      J.host = host; J.op = opcoes || {};
      const teste = document.createElement('canvas'); if (!(teste.getContext('webgl2') || teste.getContext('webgl'))) return false;
      J.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      J.renderer.setClearColor(0x000000, 0);
      J.renderer.domElement.className = 'jv-gl'; host.insertBefore(J.renderer.domElement, host.firstChild);
      J.cena = new THREE.Scene(); J.camera = new THREE.PerspectiveCamera(45, 1, 1, 4000);
      if (J.op.fundo) J.fundo.set(corDe(J.op.fundo)); J.cena.fog = new THREE.Fog(J.fundo, 200, 600);
      prepararGestos(J.renderer.domElement);
      window.addEventListener('resize', () => { redimensionar(); tocar(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(J.raf); J.raf = 0; } else tocar(); });
      redimensionar();
      return true;
    } catch (e) { console.warn('JARVIS 3D indisponível:', e); return false; }
  },
  carregar(grafo) { if (!J.renderer) return; construir(grafo); redimensionar(); tocar(); },
  definirFundo(css) { if (!J.renderer) return; J.fundo.set(corDe(css)); J.cena.fog.color.copy(J.fundo); aplicarFoco(J.foco); tocar(); },
  /** Empurra o cérebro na tela (em pixels: x → direita, y → baixo) para não ficar atrás da janelinha do JARVIS. */
  deslocar(x, y) { J.oxAlvo = x || 0; J.oyAlvo = y || 0; tocar(); },
  focarArea: (a) => focarArea(a, false), focarNo, voltar,
  selecionar(id) { J.sel = id || null; marcarSel(); tocar(); },
  retomar() { J.ativo = true; redimensionar(); tocar(); },
  pausar() { J.ativo = false; cancelAnimationFrame(J.raf); J.raf = 0; },
  get foco() { return J.foco; }
};
window.dispatchEvent(new Event('jarvis3d-pronto'));
