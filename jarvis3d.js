// ============================================================================
// J.A.R.V.I.S. — cérebro 3D da página inicial (Three.js, cópia local em vendor/)
// Recebe o grafo montado pelo app (montarGrafoCerebro: áreas → seções → itens) e
// desenha o "cérebro" do J.A.R.V.I.S.: uma ESFERA CENTRAL grande e translúcida (o J.A.R.V.I.S., com uma luz
// que respira dentro — pisca mais rápido quando está pensando), as ÁREAS como pérolas pousadas na superfície
// dela (com o símbolo da área em relevo, desenhado em vetor e rasterizado em alta resolução), setores e itens
// em volta, luz de estúdio e sombra suave embaixo. Sem linhas saindo do centro e sem "universo".
// TEMAS (Ajustes do J.A.R.V.I.S. → Aparência): 'perola' (padrão), 'cristal', 'grafite' e 'escuro' (Holograma).
// Na visão geral só as ÁREAS têm nome (embaixo da pérola, sem se sobrepor; as que estão atrás da esfera somem);
// ao tocar numa área ela vem para a frente e mostra a ramificação. Conversa com o app por window.JarvisBrain.
// Nada aqui grava dados: é só o desenho.
// ============================================================================
import * as THREE from './vendor/three.module.min.js';

const R = 100;              // raio da esfera (unidades do mundo)
const REL_AREA = 0.5;       // quanto a câmera se aproxima ao abrir uma área (1 = visão geral)
const ORBE_R = R * 0.5;      // raio da esfera central (o JARVIS) — as áreas pousam na superfície dela
const PEROLA_R = 6.4;        // raio das pérolas das áreas
const ORBITA_R = ORBE_R * 1.62; // holograma de vidro: raio da órbita das áreas em volta do núcleo
const TILT_ORBITA = 0.34;    // inclinação da órbita (vista um pouco de cima)
// Temas com esfera (orbe: true) trazem também o material das pérolas (mat), a casca da esfera (cor de fora/dentro
// e opacidade), o "estúdio" dos reflexos (domo), a cor da luz do núcleo, a sombra e a cor do símbolo em relevo.
const PALETAS = {
  perola: { fundo: '#f2f0eb', area: '#ffffff', secao: '#a59e93', cat: '#b3aca1', item: '#c9c2b7', nucleo: '#fff8ec', poeira: '#b9b2a7', nevoa: null, linha: '#bdb6aa', hud: '#a39c90', aditivo: false, orbe: true,
    mat: { cor: '#f6efe4', rough: 0.14, metal: 0, sheen: '#ffe6c4', irid: 1, env: 1.15 }, casca: ['#f8f2e8', '#e9dfcf'], cascaOp: [0.5, 0.35], domo: ['#ffffff', '#9d9282'],
    luz: '#f2c27a', miolo: '#fff6e6', sombra: '60,52,40', icone: '#3a3a3c', hemi: ['#ffffff', '#d9d1c4', 0.9], recorte: '#ffe9cf' },
  cristal: { fundo: '#edf1f5', area: '#ffffff', secao: '#8e99a6', cat: '#9ea8b4', item: '#bcc4ce', nucleo: '#f4f9ff', poeira: '#a9b3bf', nevoa: null, linha: '#b4bdc8', hud: '#8a96a4', aditivo: false, orbe: true,
    mat: { cor: '#f5f8fc', rough: 0.05, metal: 0, sheen: '#d6e6ff', irid: 0.55, env: 1.35 }, casca: ['#f7fafd', '#dce5ef'], cascaOp: [0.4, 0.28], domo: ['#ffffff', '#8796a7'],
    luz: '#86bfff', miolo: '#f3f9ff', sombra: '38,54,76', icone: '#36404c', hemi: ['#ffffff', '#cdd7e2', 0.95], recorte: '#dcebff' },
  grafite: { fundo: '#1d1f23', area: '#d9dce1', secao: '#8e949c', cat: '#7c828a', item: '#646a72', nucleo: '#fff1d6', poeira: '#70757d', nevoa: null, linha: '#50555c', hud: '#8b9199', aditivo: false, orbe: true, escuro: true,
    mat: { cor: '#50545b', rough: 0.3, metal: 0.55, sheen: '#b9c1cb', irid: 0.3, env: 1.05 }, casca: ['#3b3f46', '#141619'], cascaOp: [0.62, 0.5], domo: ['#e8ebef', '#191b1f'],
    luz: '#f2c27a', miolo: '#fff1d6', luzAditiva: true, sombra: '0,0,0', icone: '#eef0f3', hemi: ['#cfd5dd', '#101113', 0.7], recorte: '#ffd9a8' },
  // HOLOGRAMA DE VIDRO (fase 5, opção em Ajustes → Aparência): fundo escuro, esfera de vidro com borda luminosa e grade holográfica,
  // áreas = pérolas de vidro numa ÓRBITA organizada em volta do núcleo (orbita: true), símbolos em luz (iconeLuz: true)
  vidro: { fundo: '#03060b', area: '#dff6ff', secao: '#7da3c4', cat: '#6b8fb0', item: '#56789a', nucleo: '#e8fbff', poeira: '#4f7aa6', nevoa: null, linha: '#3d6a93', hud: '#7fd4ff', aditivo: true, orbe: true, escuro: true, vidro: true, orbita: true, iconeLuz: true,
    mat: { cor: '#0d1b2a', rough: 0.05, metal: 0.1, sheen: '#8fdcff', irid: 0.45, env: 1.7 }, casca: ['#0b1826', '#050b12'], cascaOp: [0.3, 0.22], domo: ['#2a3b4f', '#010204'],
    luz: '#79cfff', miolo: '#effcff', luzAditiva: true, sombra: '0,0,0', icone: '#e6f8ff', borda: '#7fd4ff', hemi: ['#8fb6d9', '#020406', 0.55], recorte: '#6fd0ff' },
  escuro: { fundo: '#050608', area: '#f5f5f7', secao: '#d1d1d6', cat: '#b4b4ba', item: '#8e8e93', nucleo: '#ffffff', poeira: '#c9ceda', nevoa: '#8f98ab', linha: '#ffffff', hud: '#e8ecf5', aditivo: true, escuro: true, icone: '#c9ced8' },
  claro: { fundo: '#f5f5f7', area: '#1d1d1f', secao: '#3a3a3c', cat: '#48484a', item: '#6e6e73', nucleo: '#1d1d1f', poeira: '#5a5f6b', nevoa: '#9a9ca3', linha: '#1d1d1f', hud: '#1d1d1f', aditivo: false, icone: '#3a3a3c' }
};
const J = {
  renderer: null, cena: null, camera: null, mundo: null, host: null, op: {},
  nos: [], porId: {}, pontos: null, linhas: null, poeira: null, auras: [], nevoa: [], aneis: null, hud: null, nucleo: null, segs: [],
  rel: 1, relAlvo: 1, baseDist: 330, prof: 330, raioFoco: 0, ox: 0, oxAlvo: 0, oy: 0, oyAlvo: 0, qAlvo: null, qAtual: null, velRot: { x: 0, y: 0 }, autoGiro: true,
  foco: null, sel: null, ativo: false, raf: 0, t0: performance.now(), ptrs: new Map(), gesto: null, ultimaInteracao: 0,
  elRotulos: {}, visual: 'perola', pal: PALETAS.perola, fundo: new THREE.Color(PALETAS.perola.fundo), escala: 1, tamBase: null,
  grafo: null, status: {}, pensando: false, energia: 0, hudOp: 1
};

// --- utilidades ---
function semente(n) { let s = n || 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function dirAleatoria(rnd) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); return new THREE.Vector3(r * Math.cos(th), u, r * Math.sin(th)); }
function corDe(css) { const c = new THREE.Color(); try { c.setStyle(css); } catch (e) { c.set('#8e8e93'); } return c; }
function dist() { return J.baseDist * J.rel; }
function mistura() { return J.pal.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending; }
function texturaAura() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.22, 'rgba(255,255,255,0.35)'); g.addColorStop(0.55, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Nuvem macia (vários borrões sobrepostos) — a "nebulosa" sem estrelas. */
function texturaNuvem(sem) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const ctx = cv.getContext('2d'); const rnd = semente(sem);
  for (let k = 0; k < 14; k++) {
    const x = 128 + (rnd() - 0.5) * 120, y = 128 + (rnd() - 0.5) * 120, r = 40 + rnd() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${0.10 + rnd() * 0.12})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// --- sombreadores: bolha de vidro (áreas e núcleo) ou ponto macio (setores, itens, poeira) ---
const VERT_NO = `
attribute float aTam; attribute float aAlfa; attribute vec3 aCor; attribute float aPulso; attribute float aBolha;
uniform float uEscala; uniform float uDist; uniform float uTempo; uniform float uDeriva; uniform vec3 uFundo;
varying vec3 vCor; varying float vAlfa; varying float vBolha;
void main() {
  vec3 p = position;
  p += uDeriva * vec3(sin(uTempo * 0.35 + position.y * 0.07), cos(uTempo * 0.3 + position.x * 0.06), sin(uTempo * 0.25 + position.z * 0.05));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float prof = clamp((-mv.z - (uDist - ${R.toFixed(1)})) / ${(2 * R).toFixed(1)}, 0.0, 1.0);
  vCor = mix(aCor, uFundo, prof * 0.55);
  vAlfa = aAlfa * (1.0 - prof * 0.6);
  vBolha = aBolha;
  float pulso = 1.0 + aPulso * 0.06 * sin(uTempo * 1.6 + position.x * 0.05);
  gl_PointSize = max(1.5, aTam * pulso * uEscala / -mv.z);
}`;
const FRAG_NO = `
varying vec3 vCor; varying float vAlfa; varying float vBolha;
void main() {
  vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
  if (vBolha > 0.5) {
    float aro = smoothstep(0.33, 0.46, d) * (1.0 - smoothstep(0.46, 0.5, d));
    float miolo = 0.16 * (1.0 - smoothstep(0.0, 0.46, d));
    float brilho = smoothstep(0.13, 0.0, length(c - vec2(-0.15, -0.17)));
    float a = clamp(max(aro * 0.95, miolo) + brilho * 0.9, 0.0, 1.0);
    gl_FragColor = vec4(mix(vCor, vec3(1.0), brilho * 0.8), a * vAlfa);
  } else {
    float borda = smoothstep(0.5, 0.28, d);
    float nucleo = smoothstep(0.26, 0.0, d);
    gl_FragColor = vec4(mix(vCor, vec3(1.0), nucleo * 0.25), (borda * 0.55 + nucleo * 0.45) * vAlfa);
  }
}`;
function materialPontos(deriva, aditivo) {
  return new THREE.ShaderMaterial({
    uniforms: { uEscala: { value: J.escala }, uDist: { value: dist() }, uTempo: { value: 0 }, uDeriva: { value: deriva || 0 }, uFundo: { value: J.fundo } },
    vertexShader: VERT_NO, fragmentShader: FRAG_NO, transparent: true, depthWrite: false, blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending
  });
}
function geometriaPontos(pos, cor, tam, alfa, pulso, bolha) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aCor', new THREE.Float32BufferAttribute(cor, 3));
  g.setAttribute('aTam', new THREE.Float32BufferAttribute(tam, 1)); g.setAttribute('aAlfa', new THREE.Float32BufferAttribute(alfa, 1));
  g.setAttribute('aPulso', new THREE.Float32BufferAttribute(pulso, 1)); g.setAttribute('aBolha', new THREE.Float32BufferAttribute(bolha, 1)); return g;
}
function corDoNo(n) { const p = J.pal; return corDe(n.tipo === 'centro' ? p.nucleo : n.tipo === 'area' ? p.area : n.tipo === 'secao' ? p.secao : n.categoria ? p.cat : p.item); }

// --- símbolo de cada área DENTRO da pérola: em "alto relevo" (sombra + luz + face), nítido ---
// def = { svg: '<svg ...>' } (vetor com traço; desenhado a 512 px, com mipmaps e filtro anisotrópico)
// ou { img: '...' } (imagem vira silhueta: quanto mais escura, mais opaca).
const texIcones = {};
const TAM_ICONE = 512;
function texturaIcone(area, def) {
  const chave = area + ':' + J.visual; if (texIcones[chave]) return texIcones[chave];
  const T = TAM_ICONE, k = T / 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = T; const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = J.renderer ? J.renderer.capabilities.getMaxAnisotropy() : 1; texIcones[chave] = tex;
  const img = new Image();
  img.onload = () => {
    const forma = document.createElement('canvas'); forma.width = forma.height = T; const fx = forma.getContext('2d'); const m = (def.img ? 22 : 34) * k;
    fx.drawImage(img, m, m, T - 2 * m, T - 2 * m);
    if (def.img) {
      const d = fx.getImageData(0, 0, T, T);
      for (let i = 0; i < d.data.length; i += 4) { const lum = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) / 255; const a = (d.data[i + 3] / 255) * Math.max(0, Math.min(1, (0.92 - lum) * 1.7)); d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a * 255; }
      fx.putImageData(d, 0, 0);
    }
    const tingir = cor => { const c = document.createElement('canvas'); c.width = c.height = T; const x = c.getContext('2d'); x.drawImage(forma, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = cor; x.fillRect(0, 0, T, T); return c; };
    const escuro = !!J.pal.escuro;
    ctx.clearRect(0, 0, T, T);
    if (J.pal.iconeLuz) { // holograma: o símbolo é feito de luz (brilho em volta + miolo claro)
      ctx.save(); ctx.shadowColor = J.pal.luz; ctx.shadowBlur = 26 * k; ctx.globalAlpha = 0.9; ctx.drawImage(tingir(J.pal.luz), 0, 0); ctx.restore();
      ctx.save(); ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6 * k; ctx.drawImage(tingir(J.pal.icone || '#ffffff'), 0, 0); ctx.restore();
    } else {
      ctx.globalAlpha = escuro ? 0.55 : 0.8; ctx.drawImage(tingir('#000000'), 3.5 * k, 4.5 * k);   // sombra (embaixo à direita)
      ctx.globalAlpha = escuro ? 0.35 : 1; ctx.drawImage(tingir('#ffffff'), -2 * k, -2 * k);       // luz (em cima à esquerda)
      ctx.globalAlpha = 1; ctx.drawImage(tingir(J.pal.icone || '#3a3a3c'), 0, 0);                  // face
    }
    tex.needsUpdate = true; tocar();
  };
  img.src = def.img ? def.img : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(def.svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" `));
  return tex;
}

// --- MERCADO: a moeda dentro da pérola, em OURO, alternando ₿ → $ → € (pedido do Rafael) ---
const MOEDAS = ['₿', '$', '€'];
const texMoedas = {};
function texturaMoeda(simbolo) {
  if (texMoedas[simbolo]) return texMoedas[simbolo];
  const T = TAM_ICONE, cv = document.createElement('canvas'); cv.width = cv.height = T; const ctx = cv.getContext('2d');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${T * 0.62}px -apple-system, "SF Pro Display", "Segoe UI", Arial, sans-serif`;
  const ouro = ctx.createLinearGradient(0, T * 0.18, 0, T * 0.82);
  ouro.addColorStop(0, '#fff6c8'); ouro.addColorStop(0.35, '#ffd766'); ouro.addColorStop(0.6, '#e2a92b'); ouro.addColorStop(1, '#9c6a12');
  ctx.save(); ctx.shadowColor = 'rgba(255, 196, 64, 0.95)'; ctx.shadowBlur = T * 0.07; ctx.fillStyle = ouro; ctx.fillText(simbolo, T / 2, T * 0.53); ctx.restore(); // brilho dourado
  ctx.fillStyle = ouro; ctx.fillText(simbolo, T / 2, T * 0.53);
  ctx.lineWidth = T * 0.008; ctx.strokeStyle = 'rgba(255, 250, 220, 0.85)'; ctx.strokeText(simbolo, T / 2 - T * 0.004, T * 0.53 - T * 0.006); // fio de luz na borda
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = J.renderer ? J.renderer.capabilities.getMaxAnisotropy() : 1;
  return (texMoedas[simbolo] = tex);
}
/** Borda luminosa de vidro (efeito Fresnel): brilha nas bordas, transparente no meio. */
function materialFresnel(cor, forca, potencia, lado) {
  return new THREE.ShaderMaterial({
    uniforms: { uCor: { value: new THREE.Color(cor) }, uForca: { value: forca }, uPot: { value: potencia }, uOp: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uCor; uniform float uForca; uniform float uPot; uniform float uOp; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPot) * uForca * uOp; gl_FragColor = vec4(uCor * f, f); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: lado || THREE.FrontSide
  });
}

// --- SUBPLANO: nuvenzinha discreta, afastada do cérebro (curiosidades, desabafos, conversas) ---
/** Canto de baixo, à direita (fora da esfera e acima da barra), calculado pelo tamanho da tela. */
function posSubplano() {
  const w = J.host ? J.host.clientWidth : 1, h = J.host ? J.host.clientHeight : 1;
  const hh = J.baseDist * Math.tan((J.camera ? J.camera.fov : 45) * Math.PI / 360), hw = hh * w / h;
  return new THREE.Vector3(hw * 0.62, -hh * 0.6, 0);
}
function construirSubplano() {
  if (J.sub) { J.cena.remove(J.sub); J.sub.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
  const tipos = J.subTipos || [], rnd = semente(77), pal = J.pal, adit = pal.aditivo;
  J.sub = new THREE.Group(); J.sub.position.copy(posSubplano());
  const pos = [], cor = [], tam = [], alfa = [], pul = [], bol = [], ca = corDe(pal.secao), cp = corDe(pal.poeira);
  const n = Math.max(7, tipos.length);
  for (let k = 0; k < n; k++) { const v = dirAleatoria(rnd).multiplyScalar(3 + rnd() * 11); pos.push(v.x, v.y, v.z); cor.push(ca.r, ca.g, ca.b); tam.push(k < tipos.length ? 1.9 : 1.2); alfa.push(k < tipos.length ? 0.85 : 0.3); pul.push(0); bol.push(0); }
  for (let k = 0; k < 90; k++) { const v = dirAleatoria(rnd).multiplyScalar(2 + Math.pow(rnd(), 0.5) * 16); pos.push(v.x, v.y, v.z); cor.push(cp.r, cp.g, cp.b); tam.push(0.5 + rnd() * 0.6); alfa.push(0.18 + rnd() * 0.22); pul.push(0); bol.push(0); }
  const pts = new THREE.Points(geometriaPontos(pos, cor, tam, alfa, pul, bol), materialPontos(0.8, adit)); pts.renderOrder = 3; J.sub.add(pts); J.subPontos = pts;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: J.tex || (J.tex = texturaAura()), color: corDe(pal.nevoa), transparent: true, opacity: adit ? 0.16 : 0.1, depthWrite: false, blending: mistura() })); halo.scale.setScalar(44); J.sub.add(halo);
  const aro = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2; aro.push(new THREE.Vector3(Math.cos(a) * 19, Math.sin(a) * 19, 0)); }
  J.sub.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(aro), new THREE.LineBasicMaterial({ color: corDe(pal.hud), transparent: true, opacity: 0.1, depthWrite: false, blending: mistura() })));
  J.cena.add(J.sub);
  if (J.op.rotulos && !J.elSub) { J.elSub = document.createElement('div'); J.elSub.className = 'jv-rotulo jv-sub'; J.elSub.innerHTML = '<span>subplano</span>'; }
  if (J.op.rotulos && J.elSub && !J.elSub.isConnected) J.op.rotulos.appendChild(J.elSub);
}
function telaDo(v3) { const w = J.host.clientWidth, h = J.host.clientHeight; _v.copy(v3).project(J.camera); return { x: (_v.x + 1) / 2 * w, y: (1 - _v.y) / 2 * h, fora: _v.z > 1 }; }

// --- disposição 3D: áreas espalhadas pela esfera, setores em volta da área, itens em volta do "pai" ---
function dispor(grafo) {
  const rnd = semente(11);
  const nos = grafo.nos.map(n => ({ id: n.id, nome: n.nome, tipo: n.tipo, area: n.area, categoria: !!n.categoria, grau: n.grau || 0, p: new THREE.Vector3() }));
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
  const orbita = !!J.pal.orbita, RMAX = orbita ? R * 1.18 : R * 0.97;
  if (orbita) {
    // holograma de vidro: áreas em ÓRBITA, igualmente espaçadas num anel em volta do núcleo (o anel gira no próprio plano)
    areas.forEach((a, i) => { const ang = i / areas.length * Math.PI * 2; a.ang = ang; a.p.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(ORBITA_R); });
  } else {
    // áreas espalhadas pela esfera toda (espiral de Fibonacci), não num anel: fica um "cérebro" redondo
    areas.forEach((a, i) => { const y = (1 - (i + 0.5) / areas.length * 2) * 0.8, r = Math.sqrt(1 - y * y), ang = i * 2.39996 + 0.6; a.p.set(Math.cos(ang) * r, y, Math.sin(ang) * r).multiplyScalar(ORBE_R * 1.1); }); // pousadas na superfície da esfera central
  }
  const centro = porId.centro;
  // em volta do pai, mas "achatado" para os lados (plano de frente para fora da esfera): quando a área
  // vem para a frente da câmera, os setores e itens se abrem na tela em vez de ficarem um atrás do outro
  const colocar = (n, base, raio, achatar) => {
    const d = dirAleatoria(rnd); const fora = base.lengthSq() > 1 ? base.clone().normalize() : null;
    if (fora && achatar) d.addScaledVector(fora, -achatar * d.dot(fora)).normalize();
    n.p.copy(base).add(d.multiplyScalar(raio * (0.7 + rnd() * 0.5))); if (n.p.length() > RMAX) n.p.setLength(RMAX);
  };
  const paiDe = n => pais[n.id] || porId['a-' + n.area] || centro;
  nos.filter(n => n.tipo === 'secao').forEach(s => { const a = porId['a-' + s.area]; colocar(s, a ? a.p.clone().multiplyScalar(orbita ? 1.14 : 1.45) : new THREE.Vector3(), orbita ? 19 : 24, orbita ? 0.9 : 0.8); });
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
      if (n.p.length() < ORBE_R * 1.2) n.p.setLength(ORBE_R * 1.2); // nada fica dentro da esfera central
      const pai = pais[n.id]; if (pai) { const alvo = n.tipo === 'secao' ? 24 : n.categoria ? 15 : 11; if (n.p.distanceTo(pai.p) > alvo * 1.7) n.p.lerp(pai.p, 0.08); }
      if (n.p.length() > RMAX) n.p.setLength(RMAX);
    });
  }
  return { nos, porId };
}

// --- monta a cena ---
function limparMundo() { if (!J.mundo) return; J.cena.remove(J.mundo); J.mundo.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
function construir(grafo) {
  J.grafo = grafo;
  const { nos, porId } = dispor(grafo);
  J.nos = nos; J.porId = porId;
  limparMundo(); J.mundo = new THREE.Group(); J.cena.add(J.mundo);
  if (J.pal.orbita) aplicarOrbita(); else if (J.qAtual) J.mundo.quaternion.copy(J.qAtual); else J.mundo.rotation.set(0.18, -0.5, 0);
  const pal = J.pal, adit = pal.aditivo;
  const orbe = !!pal.orbe; // visual pérola: áreas = pérolas de verdade (malhas) em vez de bolhas desenhadas
  // bolinhas de verdade (tamanho em unidades do mundo)
  const tam = n => n.tipo === 'centro' ? 7 : n.tipo === 'area' ? 9 : n.tipo === 'secao' ? 3.8 : n.categoria ? 3.2 : 2.1 + Math.min(1.4, Math.sqrt(n.grau) * 0.35);
  const pos = [], cor = [], tamA = [], alfa = [], pulso = [], bolha = [];
  nos.forEach((n, i) => { n.i = i; pos.push(n.p.x, n.p.y, n.p.z); const c = corDoNo(n); cor.push(c.r, c.g, c.b); tamA.push(tam(n)); alfa.push(1); pulso.push(n.tipo === 'area' ? 1 : 0); bolha.push(n.tipo === 'area' ? 1 : 0); });
  J.pontos = new THREE.Points(geometriaPontos(pos, cor, tamA, alfa, pulso, bolha), materialPontos(0.35, false)); J.pontos.renderOrder = 4; J.mundo.add(J.pontos);
  J.tamBase = Float32Array.from(tamA);
  // ligações: fios finíssimos (sem os fios que saem do centro — o centro agora é a esfera)
  J.segs = grafo.links.map(l => [porId[l.a.id], porId[l.b.id]]).filter(x => x[0] && x[1] && x[0].tipo !== 'centro' && x[1].tipo !== 'centro');
  const seg = [], segCor = [];
  J.segs.forEach(([a, b]) => { seg.push(a.p.x, a.p.y, a.p.z, b.p.x, b.p.y, b.p.z); segCor.push(0, 0, 0, 0, 0, 0); });
  const gL = new THREE.BufferGeometry(); gL.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3)); gL.setAttribute('color', new THREE.Float32BufferAttribute(segCor, 3));
  J.linhas = new THREE.LineSegments(gL, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: adit ? 0.55 : orbe ? 0.7 : 0.4, depthWrite: false, blending: mistura() }));
  J.linhas.renderOrder = 1; J.mundo.add(J.linhas);
  // nuvens de informação (em volta de cada área) + poeira fina
  const rnd = semente(23); const dPos = [], dCor = [], dTam = [], dAlfa = [], dPulso = [], dBolha = []; const cp = corDe(pal.poeira);
  if (pal.orbita) {
    // holograma: poeira de luz concentrada no plano da órbita (um "disco" em volta do núcleo) + um pouco solta no espaço
    for (let k = 0; k < 520; k++) { const ang = rnd() * Math.PI * 2, r = ORBE_R * (1.08 + Math.pow(rnd(), 0.8) * 1.05), y = (rnd() - 0.5) * 7 * (r / ORBITA_R); dPos.push(Math.cos(ang) * r, y, Math.sin(ang) * r); const l = 0.7 + rnd() * 0.5; dCor.push(cp.r * l, cp.g * l, cp.b * l); dTam.push(0.4 + rnd() * 0.8); dAlfa.push(0.12 + rnd() * 0.32); dPulso.push(0); dBolha.push(0); }
    for (let k = 0; k < 220; k++) { const v = dirAleatoria(rnd).multiplyScalar(R * (0.7 + rnd() * 0.6)); dPos.push(v.x, v.y, v.z); const l = 0.6 + rnd() * 0.4; dCor.push(cp.r * l, cp.g * l, cp.b * l); dTam.push(0.35 + rnd() * 0.5); dAlfa.push(0.06 + rnd() * 0.16); dPulso.push(0); dBolha.push(0); }
  } else nos.filter(n => n.tipo === 'area').forEach(a => {
    for (let k = 0; k < (orbe ? 70 : 130); k++) { const v = dirAleatoria(rnd).multiplyScalar(6 + Math.pow(rnd(), 0.6) * 30).add(a.p.clone().multiplyScalar(orbe ? 1.25 : 1)); if (v.length() > R * 1.02) v.setLength(R * 1.02); if (orbe && v.length() < ORBE_R * 1.1) v.setLength(ORBE_R * 1.1); dPos.push(v.x, v.y, v.z); const l = 0.85 + rnd() * 0.3; dCor.push(cp.r * l, cp.g * l, cp.b * l); dTam.push(0.6 + rnd() * 1.0); dAlfa.push((adit ? 0.28 : orbe ? 0.35 : 0.3) + rnd() * 0.3); dPulso.push(0); dBolha.push(0); }
  });
  if (!pal.orbita) for (let k = 0; k < (orbe ? 700 : 1600); k++) { const v = dirAleatoria(rnd).multiplyScalar(R * (0.12 + 0.92 * Math.pow(rnd(), 0.3))); if (orbe && v.length() < ORBE_R * 1.05) v.setLength(ORBE_R * (1.05 + rnd() * 0.9)); dPos.push(v.x, v.y, v.z); const l = 0.7 + rnd() * 0.4; dCor.push(cp.r * l, cp.g * l, cp.b * l); dTam.push(0.45 + rnd() * 0.85); dAlfa.push((adit ? 0.18 : 0.22) + rnd() * 0.3); dPulso.push(0); dBolha.push(0); }
  J.poeira = new THREE.Points(geometriaPontos(dPos, dCor, dTam, dAlfa, dPulso, dBolha), materialPontos(2.4, adit)); J.poeira.renderOrder = 0; J.mundo.add(J.poeira);
  // névoa (nebulosa sem estrelas) — só nos visuais escuro/claro
  J.nevoa = [];
  if (pal.nevoa) for (let k = 0; k < 11; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaNuvem(31 + k), color: corDe(pal.nevoa), transparent: true, opacity: (adit ? 0.11 : 0.1) + rnd() * 0.06, depthWrite: false, blending: mistura() }));
    s.position.copy(dirAleatoria(rnd).multiplyScalar(R * (0.2 + rnd() * 0.6))); s.scale.setScalar(90 + rnd() * 90); s.material.rotation = rnd() * 6.28; s.userData.giro = (rnd() - 0.5) * 0.05; s.renderOrder = -1;
    J.mundo.add(s); J.nevoa.push(s);
  }
  // auras: halo suave nas áreas (no pérola, um brilho quente bem leve)
  const tex = J.tex || (J.tex = texturaAura()); J.auras = [];
  nos.filter(n => n.tipo === 'area').forEach(n => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: corDe(orbe ? (pal.escuro ? pal.luz : '#ffffff') : pal.area), transparent: true, opacity: adit ? 0.28 : orbe ? (pal.escuro ? 0.16 : 0.55) : 0.12, depthWrite: false, blending: pal.escuro && orbe ? THREE.AdditiveBlending : mistura() }));
    s.position.copy(n.p); s.scale.setScalar(orbe ? 22 : 34); s.renderOrder = 2; s.userData.no = n; s.userData.op0 = s.material.opacity; J.mundo.add(s); J.auras.push(s);
  });
  // pérolas das áreas (malhas com o material do tema: brilho, verniz e iridescência). No holograma: vidro escuro + borda de luz.
  // O Mercado é de OURO (e a moeda lá dentro alterna ₿ → $ → €).
  J.perolas = []; J.bordas = [];
  const geoP = J.geoPerola || (J.geoPerola = new THREE.SphereGeometry(PEROLA_R, 64, 40));
  if (orbe) nos.filter(n => n.tipo === 'area').forEach(n => {
    const ouro = n.area === 'mercado';
    const mat = pal.vidro ? materialPerola(0.5, ouro ? '#3a2a0a' : undefined) : materialPerola(1, ouro ? '#f2d58f' : undefined);
    if (ouro && !pal.vidro) { mat.metalness = 0.55; mat.roughness = 0.18; mat.sheenColor = new THREE.Color('#ffd56b'); }
    const m = new THREE.Mesh(geoP, mat);
    m.position.copy(n.p); m.renderOrder = 3; m.userData.no = n; J.mundo.add(m); J.perolas.push(m);
    if (pal.vidro) {
      const b = new THREE.Mesh(geoP, materialFresnel(ouro ? '#ffc94d' : pal.borda, 1.25, 2.4)); b.scale.setScalar(1.03); b.position.copy(n.p); b.renderOrder = 4; b.userData.no = n; b.userData.f0 = 1.25; J.mundo.add(b); J.bordas.push(b);
    }
  });
  // símbolos das áreas (P da Primos, treliça da engenharia, capacete…) — em relevo (pérola) ou feitos de luz (holograma)
  J.icones = []; J.moedas = null;
  nos.filter(n => n.tipo === 'area' && J.op.icones && J.op.icones[n.area]).forEach(n => {
    if (n.area === 'mercado' && orbe) { // duas camadas para a troca suave entre as moedas
      const a = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaMoeda(MOEDAS[0]), transparent: true, opacity: 1, depthWrite: false, depthTest: false, blending: pal.vidro ? THREE.AdditiveBlending : THREE.NormalBlending }));
      const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaMoeda(MOEDAS[1]), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: pal.vidro ? THREE.AdditiveBlending : THREE.NormalBlending }));
      [a, b].forEach(s => { s.position.copy(n.p); s.scale.setScalar(10.2); s.renderOrder = 6; s.userData.no = n; s.userData.op0 = 1; J.mundo.add(s); J.icones.push(s); });
      J.moedas = { a, b, idx: 0 }; return;
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaIcone(n.area, J.op.icones[n.area]), transparent: true, opacity: pal.iconeLuz ? 0.95 : adit ? 0.55 : orbe ? 0.82 : 0.42, depthWrite: false, depthTest: !orbe, blending: pal.iconeLuz ? THREE.AdditiveBlending : THREE.NormalBlending }));
    s.position.copy(n.p); s.scale.setScalar(orbe ? 9.2 : 7.4); s.renderOrder = 6; s.userData.no = n; s.userData.op0 = s.material.opacity; J.mundo.add(s); J.icones.push(s);
  });
  // holograma: a linha da órbita (anel fino de luz) e três "satélites" correndo nela
  J.satelites = []; J.orbitaLinha = null;
  if (pal.orbita) {
    const pts = []; for (let k = 0; k <= 240; k++) { const a = k / 240 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * ORBITA_R, 0, Math.sin(a) * ORBITA_R)); }
    const orbitaLinha = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: corDe(pal.borda), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    orbitaLinha.renderOrder = 1; J.mundo.add(orbitaLinha); J.orbitaLinha = orbitaLinha;
    const pts2 = []; for (let k = 0; k <= 240; k++) { const a = k / 240 * Math.PI * 2; pts2.push(new THREE.Vector3(Math.cos(a) * ORBITA_R * 1.2, 0, Math.sin(a) * ORBITA_R * 1.2)); }
    const externa = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts2), new THREE.LineBasicMaterial({ color: corDe(pal.borda), transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending })); J.mundo.add(externa);
    for (let k = 0; k < 3; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: corDe(pal.borda), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(3.2); s.userData.fase = k / 3 * Math.PI * 2; s.userData.vel = 0.18 + k * 0.05; s.userData.r = ORBITA_R * (k === 2 ? 1.2 : 1); J.mundo.add(s); J.satelites.push(s); }
  }
  construirOrbe();
  construirNucleo();
  construirAneis();
  prepararRotulos();
  construirSubplano();
  aplicarFoco(J.foco);
  if (J.sel && !J.porId[J.sel]) J.sel = null; marcarSel();
}

// --- visual PÉROLA: material de pérola, luz de estúdio, esfera central (o JARVIS) e sombra no chão ---
function materialPerola(opacidade, cor) {
  const m = (J.pal && J.pal.mat) || PALETAS.perola.mat;
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(cor || m.cor), roughness: m.rough, metalness: m.metal, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.7, sheenRoughness: 0.3, sheenColor: new THREE.Color(m.sheen), iridescence: m.irid, iridescenceIOR: 1.3, iridescenceThicknessRange: [260, 720], envMapIntensity: m.env, transparent: opacidade < 1, opacity: opacidade, depthWrite: opacidade >= 1 });
}
/** "Estúdio" para os reflexos: domo com degradê (cores do tema) + 3 softboxes (como foto de produto). Um por tema. */
const ambientes = {};
function ambienteEstudio() {
  const dom = (J.pal && J.pal.domo) || PALETAS.perola.domo, fitas = !!(J.pal && J.pal.vidro), chave = dom.join('|') + (fitas ? '|fitas' : '');
  if (ambientes[chave]) return ambientes[chave];
  const pm = new THREE.PMREMGenerator(J.renderer); const cena = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 32, 16); const cores = []; const p = geo.attributes.position; const cima = new THREE.Color(dom[0]), baixo = new THREE.Color(dom[1]);
  for (let i = 0; i < p.count; i++) { const c = baixo.clone().lerp(cima, Math.min(1, (p.getY(i) / 50 + 1) / 1.6)); cores.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  cena.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const painel = (w, h, x, y, z, k, cor) => { const c = cor ? new THREE.Color(cor).multiplyScalar(k) : new THREE.Color(k, k, k * 0.97); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); cena.add(m); };
  if (fitas) { painel(46, 1.6, 0, 40, 14, 1.6, '#9fe3ff'); painel(1.4, 34, -40, 4, 16, 1.1, '#7fd4ff'); painel(1.2, 26, 38, -6, -12, 0.7, '#7fd4ff'); } // vidro: fitas finas de luz ciano (sem manchas cinza)
  else { painel(34, 14, 0, 38, 16, 4.2); painel(14, 30, -38, 6, 18, 2.6); painel(10, 24, 36, -4, -14, 1.8); painel(60, 8, 0, -30, 30, 0.35); }
  ambientes[chave] = pm.fromScene(cena, 0.035).texture; pm.dispose();
  return ambientes[chave];
}
function construirOrbe() {
  if (J.orbe) { J.cena.remove(J.orbe); J.orbe.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material && x.material.map !== J.tex) x.material.dispose(); }); J.orbe = null; }
  const pal = J.pal;
  if (!pal.orbe) { J.cena.environment = null; return; }
  J.cena.environment = ambienteEstudio();
  J.orbe = new THREE.Group();
  // a esfera: casca translúcida (dentro e fora) — deixa ver a luz do J.A.R.V.I.S. lá dentro
  const geo = new THREE.SphereGeometry(ORBE_R, 96, 64);
  const dentro = new THREE.Mesh(geo, materialPerola(0.5, pal.casca[1])); dentro.material.side = THREE.BackSide; dentro.renderOrder = -2;
  const fora = new THREE.Mesh(geo, materialPerola(0.8, pal.casca[0])); fora.renderOrder = 2;
  // luzes de estúdio
  const hemi = new THREE.HemisphereLight(pal.hemi[0], pal.hemi[1], pal.hemi[2]);
  const chave = new THREE.DirectionalLight('#ffffff', pal.escuro ? 1.9 : 1.7); chave.position.set(60, 90, 120);
  const recorte = new THREE.DirectionalLight(pal.recorte, pal.escuro ? 1.1 : 0.7); recorte.position.set(-90, -20, -80);
  // sombra suave no "chão"
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const ctx = cv.getContext('2d'); const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(${pal.sombra},0.55)`); g.addColorStop(0.6, `rgba(${pal.sombra},0.12)`); g.addColorStop(1, `rgba(${pal.sombra},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const ts = new THREE.CanvasTexture(cv); ts.colorSpace = THREE.SRGBColorSpace;
  const sombra = new THREE.Sprite(new THREE.SpriteMaterial({ map: ts, transparent: true, opacity: pal.escuro ? 0.6 : 0.35, depthWrite: false, fog: false })); sombra.scale.set(R * 1.7, R * 0.3, 1); sombra.position.set(0, -R * 1.12, 0); sombra.renderOrder = -3;
  J.orbe.add(dentro, fora, hemi, chave, recorte, sombra); J.orbe.userData = { dentro, fora, sombra };
  if (pal.vidro) {
    // HOLOGRAMA DE VIDRO: borda de luz (Fresnel) por fora e por dentro, grade holográfica girando lá dentro,
    // e um brilho no "chão" em vez de sombra — a esfera parece uma inteligência de luz dentro de um vidro
    sombra.visible = false;
    const borda = new THREE.Mesh(geo, materialFresnel(pal.borda, 1.35, 2.2)); borda.scale.setScalar(1.004); borda.renderOrder = 3;
    const bordaDentro = new THREE.Mesh(geo, materialFresnel(pal.borda, 0.45, 1.6, THREE.BackSide)); bordaDentro.renderOrder = -1;
    const grade = new THREE.Group(), matG = new THREE.LineBasicMaterial({ color: corDe(pal.borda), transparent: true, opacity: 0.075, depthWrite: false, blending: THREE.AdditiveBlending });
    const rg = ORBE_R * 0.965;
    for (let i = 1; i < 9; i++) { const lat = -Math.PI / 2 + i * Math.PI / 9, pts = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(lat) * rg, Math.sin(lat) * rg, Math.sin(a) * Math.cos(lat) * rg)); } grade.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matG)); }
    for (let i = 0; i < 12; i++) { const lon = i / 12 * Math.PI, pts = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(lon) * rg, Math.sin(a) * rg, Math.cos(a) * Math.sin(lon) * rg)); } grade.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matG)); }
    grade.renderOrder = -1;
    const chao = new THREE.Sprite(new THREE.SpriteMaterial({ map: J.tex || (J.tex = texturaAura()), color: corDe(pal.luz), transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    chao.scale.set(R * 2.1, R * 0.34, 1); chao.position.set(0, -R * 1.08, 0); chao.renderOrder = -3;
    J.orbe.add(borda, bordaDentro, grade, chao); Object.assign(J.orbe.userData, { borda, bordaDentro, grade, chao });
  }
  J.cena.add(J.orbe);
}

// --- o NÚCLEO (o JARVIS): luz que respira + anéis de HUD sempre de frente para a câmera ---
function construirNucleo() {
  [J.nucleo, J.hud].forEach(o => { if (o) { J.cena.remove(o); o.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); } });
  const pal = J.pal, tex = J.tex || (J.tex = texturaAura()), orbe = !!pal.orbe;
  J.nucleo = new THREE.Group();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: corDe(orbe ? pal.luz : pal.nucleo), transparent: true, opacity: 0.7, depthWrite: false, depthTest: !orbe, blending: orbe ? (pal.luzAditiva ? THREE.AdditiveBlending : THREE.NormalBlending) : mistura() })); halo.scale.setScalar(orbe ? 44 : pal.aditivo ? 40 : 30);
  const miolo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: corDe(orbe ? pal.miolo : pal.aditivo ? '#ffffff' : '#1d1d1f'), transparent: true, opacity: 1, depthWrite: false, depthTest: !orbe, blending: pal.luzAditiva ? THREE.AdditiveBlending : mistura() })); miolo.scale.setScalar(orbe ? 16 : 10);
  J.nucleo.add(halo, miolo); J.nucleo.userData = { halo, miolo }; J.nucleo.renderOrder = 5; halo.renderOrder = orbe ? 3 : 5; miolo.renderOrder = orbe ? 3 : 6; // no pérola: a luz aparece através da casca
  J.cena.add(J.nucleo);
  // HUD: arcos tracejados, régua com marcas e arcos curtos (no pérola, em volta da esfera, bem sutis)
  const k = orbe ? ORBE_R / 15 * (pal.vidro ? 0.86 : 1.12) : 1;
  const cor = corDe(pal.hud), mat = op => new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: orbe ? op * 0.8 : op, depthWrite: false, blending: mistura() });
  const arco = (r, a0, a1, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push(new THREE.Vector3(Math.cos(a) * r * k, Math.sin(a) * r * k, 0)); } return new THREE.BufferGeometry().setFromPoints(p); };
  J.hud = new THREE.Group(); const g1 = new THREE.Group(), g2 = new THREE.Group(), g3 = new THREE.Group();
  if (!orbe) for (let i = 0; i < 3; i++) g1.add(new THREE.Line(arco(15, i * 2.094, i * 2.094 + 1.35, 40), mat(0.6)));
  else for (let i = 0; i < 2; i++) g1.add(new THREE.Line(arco(16.4, i * Math.PI, i * Math.PI + 0.9, 30), mat(0.55)));
  g2.add(new THREE.Line(arco(20.5, 0, Math.PI * 2, 160), mat(0.16)));
  const marcas = []; for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, r1 = 20.5 * k, r2 = (i % 6 === 0 ? 23 : 21.6) * k; marcas.push(Math.cos(a) * r1, Math.sin(a) * r1, 0, Math.cos(a) * r2, Math.sin(a) * r2, 0); }
  const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(marcas, 3)); g2.add(new THREE.LineSegments(gm, mat(orbe ? 0.22 : 0.3)));
  g3.add(new THREE.Line(arco(27, 0.3, 1.0, 24), mat(0.45))); g3.add(new THREE.Line(arco(27, 3.4, 4.3, 24), mat(0.45))); if (!orbe) g3.add(new THREE.Line(arco(30, 1.9, 2.2, 10), mat(0.35)));
  J.hud.add(g1, g2, g3); J.hud.userData = { g1, g2, g3 }; J.hud.renderOrder = 6; J.cena.add(J.hud);
}
function construirAneis() {
  if (J.aneis) { J.cena.remove(J.aneis); J.aneis.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); }
  J.aneis = new THREE.Group(); const cor = corDe(J.pal.hud);
  (J.pal.orbita ? [] : J.pal.orbe ? [[1.12, 0.35, 0.1, 0.16]] : [[1.1, 0.12, 0, 0.12], [1.2, 1.15, 0.4, 0.08], [1.3, -0.7, 1.1, 0.06]]).forEach(([esc, rx, rz, op]) => {
    const pts = []; for (let k = 0; k <= 180; k++) { const a = k / 180 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R * esc, 0, Math.sin(a) * R * esc)); }
    const anel = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: op, depthWrite: false, blending: mistura() }));
    anel.rotation.set(rx, 0, rz); J.aneis.add(anel);
  });
  J.cena.add(J.aneis);
}

// --- nomes (HTML por cima do 3D): áreas sempre; seções/itens só na ramificação ---
function prepararRotulos() {
  const cont = J.op.rotulos; if (!cont) return; cont.innerHTML = ''; J.elRotulos = {};
  J.nos.forEach(n => {
    if (n.tipo === 'centro') return;
    const el = document.createElement('div');
    el.className = `jv-rotulo jv-${n.tipo}${n.categoria ? ' jv-cat' : ''}`; el.style.opacity = '0';
    if (n.tipo === 'area' && J.status[n.area]) el.style.setProperty('--status', J.status[n.area]);
    el.innerHTML = '<i></i><span></span>'; el.querySelector('span').textContent = n.nome;
    cont.appendChild(el); J.elRotulos[n.id] = el;
  });
}
const _v = new THREE.Vector3();
function projetar(n, w, h) { _v.copy(n.p).applyMatrix4(J.mundo.matrixWorld); const z = _v.z; _v.project(J.camera); return { x: (_v.x + 1) / 2 * w, y: (1 - _v.y) / 2 * h, z, fora: _v.z > 1 }; }
/** Largura do nome na tela (medida uma vez e guardada; muda só se o texto mudar). */
function larguraRotulo(el, n) {
  if (el._w && el._nome === n.nome) return el._w;
  const w = el.offsetWidth; if (w) { el._w = w; el._nome = n.nome; return w; }
  return (n.tipo === 'area' ? 24 : 18) + n.nome.length * (n.tipo === 'area' ? 7.2 : 6.2);
}
/**
 * Nomes por cima do 3D, SEM se sobrepor: cada nome procura um lugar livre em volta da bolinha
 * (área: embaixo → em cima → à direita → à esquerda; setor/item: em cima → embaixo). Quem está na
 * frente escolhe primeiro. Áreas que ficaram atrás da esfera central somem na visão geral (limpa a tela).
 */
function atualizarRotulos() {
  const w = J.host.clientWidth, h = J.host.clientHeight; J.mundo.updateMatrixWorld();
  const perto = J.rel < 0.42; const ocupados = [];
  const lista = [];
  const tg = Math.tan(J.camera.fov * Math.PI / 360), camZ = J.camera.position.z;
  J.nos.forEach(n => {
    const el = J.elRotulos[n.id]; if (!el) return;
    const candidato = n.tipo === 'area' || (J.foco && n.area === J.foco && (n.tipo === 'secao' || n.categoria || perto)) || n.id === J.sel;
    if (!candidato) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
    lista.push({ n, el, ...projetar(n, w, h) });
  });
  // ordem de quem ganha o espaço: área em foco → o escolhido → áreas (da frente para trás) → setores/itens
  const forte = n => n.tipo === 'area' && J.foco && n.area === J.foco;
  const prio = n => forte(n) ? 0 : n.id === J.sel ? 1 : n.tipo === 'area' ? 2 : 3;
  lista.sort((a, b) => prio(a.n) - prio(b.n) || b.z - a.z);
  const bate = r => r.x0 < 4 || r.x1 > w - 4 || r.y0 < 4 || r.y1 > h - 4 || ocupados.some(o => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0);
  lista.forEach(({ n, el, x, y, z, fora }) => {
    const frente = Math.max(0, Math.min(1, (z + R * 0.6) / (R * 1.2))); // 0 = atrás da esfera, 1 = na frente
    let visivel = !fora;
    if (visivel && n.tipo === 'area' && !J.foco && frente < 0.3) visivel = false; // atrás da esfera: não polui a tela
    let lugar = null;
    if (visivel) {
      const larg = larguraRotulo(el, n), alt = n.tipo === 'area' ? 24 : 20;
      const raio = n.tipo === 'area' ? Math.max(8, PEROLA_R * h / (2 * tg * Math.max(1, camZ - z))) : 5; // raio da pérola na tela
      const vao = n.tipo === 'area' ? 5 : 6;
      const opcoes = {
        baixo: { x0: x - larg / 2, x1: x + larg / 2, y0: y + raio + vao, y1: y + raio + vao + alt },
        cima: { x0: x - larg / 2, x1: x + larg / 2, y0: y - raio - vao - alt, y1: y - raio - vao },
        direita: { x0: x + raio + vao + 2, x1: x + raio + vao + 2 + larg, y0: y - alt / 2, y1: y + alt / 2 },
        esquerda: { x0: x - raio - vao - 2 - larg, x1: x - raio - vao - 2, y0: y - alt / 2, y1: y + alt / 2 }
      };
      const ordem = n.tipo === 'area' ? ['baixo', 'cima', 'direita', 'esquerda'] : ['cima', 'baixo'];
      lugar = ordem.find(k => !bate(opcoes[k]));
      if (!lugar && (forte(n) || n.id === J.sel)) lugar = ordem[0]; // o que está em foco aparece de qualquer jeito
      if (lugar) { ocupados.push(opcoes[lugar]); el._r = opcoes[lugar]; } else visivel = false;
    }
    if (!visivel) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
    const op = n.tipo === 'area' ? (J.foco ? (n.area === J.foco ? 1 : 0.35) : 0.55 + frente * 0.45) : 0.45 + frente * 0.55;
    const r = el._r;
    el.style.transform = `translate3d(${r.x0.toFixed(1)}px, ${r.y0.toFixed(1)}px, 0)`;
    el.dataset.lugar = lugar;
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
  const orbe = !!J.pal.orbe; // no pérola, a área é uma pérola de verdade: o ponto desenhado dela some
  const orbita = !!J.pal.orbita; // holograma: na visão geral só as áreas aparecem (setores e itens só ao abrir uma área)
  J.nos.forEach(n => { alfa.array[n.i] = orbe && (n.tipo === 'area' || n.tipo === 'centro') ? 0 : orbita && !area ? 0 : !area || n.area === area || n.tipo === 'centro' ? 1 : orbita ? 0 : 0.12; });
  alfa.needsUpdate = true; marcarSel();
  const adit = J.pal.aditivo;
  J.auras.forEach(s => { const n = s.userData.no; s.material.opacity = !area || n.area === area ? s.userData.op0 : s.userData.op0 * 0.2; });
  (J.icones || []).forEach(s => { s.userData.foco = !area || s.userData.no.area === area ? 1 : 0.25; if (!(J.moedas && (s === J.moedas.a || s === J.moedas.b))) s.material.opacity = s.userData.op0 * s.userData.foco; });
  (J.perolas || []).forEach(m => { const acesa = !area || m.userData.no.area === area; if (J.pal.vidro) { m.material.opacity = acesa ? 0.5 : 0.18; return; } m.material.transparent = !acesa; m.material.opacity = acesa ? 1 : 0.28; m.material.depthWrite = acesa; });
  (J.bordas || []).forEach(b => { b.material.uniforms.uOp.value = !area || b.userData.no.area === area ? 1 : 0.25; });
  const cor = J.linhas.geometry.getAttribute('color'); const base = corDe(J.pal.linha);
  J.segs.forEach(([a, b], k) => {
    const liga = !area || a.area === area || b.area === area;
    const peso = orbita ? (!area ? 0 : liga ? 0.9 : 0) : J.pal.orbe ? (!area ? 0.8 : liga ? 1 : 0.18) : !area ? 0.38 : liga ? 0.75 : 0.08; // quanto do fio "acende"
    const c = J.fundo.clone().lerp(base, peso);
    cor.setXYZ(k * 2, c.r, c.g, c.b); cor.setXYZ(k * 2 + 1, c.r, c.g, c.b);
  });
  cor.needsUpdate = true;
}
function marcarSel() {
  if (!J.pontos || !J.tamBase) return; const tam = J.pontos.geometry.getAttribute('aTam');
  J.nos.forEach(n => { tam.array[n.i] = J.tamBase[n.i] * (n.id === J.sel ? 1.8 : J.foco && n.area === J.foco && n.tipo !== 'area' ? 1.3 : 1); });
  tam.needsUpdate = true;
}
// --- ÓRBITA (holograma de vidro): o mundo é controlado por inclinação (tilt) + giro no plano (spin) ---
const _euler = new THREE.Euler(0, 0, 0, 'XYZ');
function orbitaEstado() { return J.orb || (J.orb = { tilt: TILT_ORBITA, tiltAlvo: TILT_ORBITA, spin: -0.6, spinAlvo: null, vel: 0 }); }
function aplicarOrbita() { const o = orbitaEstado(); _euler.set(o.tilt, o.spin, 0); J.mundo.quaternion.setFromEuler(_euler); J.qAtual = J.mundo.quaternion.clone(); }
/** Ângulo de giro que traz o ponto (no plano da órbita) para a frente da câmera, o mais perto do giro atual. */
function spinParaFrente(p) { const o = orbitaEstado(); const th = Math.atan2(p.z, p.x); let s = th - Math.PI / 2; while (s - o.spin > Math.PI) s -= Math.PI * 2; while (o.spin - s > Math.PI) s += Math.PI * 2; return s; }
/** Gira o mundo para que o ponto p (coordenadas do mundo) fique de frente para a câmera. */
function trazerParaFrente(p) {
  J.giroEntrada = 0; // tocou numa área durante a volta da abertura: o foco manda
  if (J.pal.orbita) { const o = orbitaEstado(); J.raioFoco = p.length(); o.spinAlvo = spinParaFrente(p); o.tiltAlvo = 0.02; o.vel = 0; return; } // órbita quase reta: a área para no meio da tela, não embaixo
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
function voltar() { J.sel = null; aplicarFoco(null); J.relAlvo = 1; J.qAlvo = null; J.autoGiro = true; if (J.pal.orbita) { const o = orbitaEstado(); o.spinAlvo = null; o.tiltAlvo = TILT_ORBITA; } tocar(); }

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
/** Tocou na nuvenzinha do subplano? */
function noSubplano(sx, sy) { if (!J.sub) return false; const p = telaDo(J.sub.position); return !p.fora && Math.hypot(p.x - sx, p.y - sy) < 46; }
/** Tocou no núcleo (o JARVIS)? */
function noNucleo(sx, sy) {
  const w = J.host.clientWidth, h = J.host.clientHeight; _v.set(0, 0, 0).project(J.camera);
  return Math.hypot((_v.x + 1) / 2 * w - sx, (1 - _v.y) / 2 * h - sy) < 30;
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
    if (!J.ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') el.style.cursor = rotuloNoPonto(e.clientX, e.clientY) || noNaTela(p.x, p.y) || noNucleo(p.x, p.y) || noSubplano(p.x, p.y) ? 'pointer' : 'grab'; return; }
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
      else if (!J.foco && noNucleo(g.ini.x, g.ini.y) && J.op.onNucleo) J.op.onNucleo();
      else if (noSubplano(g.ini.x, g.ini.y) && J.op.onSubplano) J.op.onSubplano();
      else if (J.op.onToqueVazio) J.op.onToqueVazio();
    }
    tocar();
  };
  el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
  el.addEventListener('wheel', e => { e.preventDefault(); J.relAlvo = Math.max(0.3, Math.min(1.7, J.relAlvo * Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0012)))); J.ultimaInteracao = performance.now(); tocar(); }, { passive: false });
}
const _qx = new THREE.Quaternion(), _qy = new THREE.Quaternion(), EIXO_X = new THREE.Vector3(1, 0, 0), EIXO_Y = new THREE.Vector3(0, 1, 0);
function girar(ax, ay) {
  if (J.pal.orbita) { const o = orbitaEstado(); o.spin += ax; o.spinAlvo = null; o.tilt = o.tiltAlvo = Math.max(-0.15, Math.min(1.1, o.tilt + ay)); aplicarOrbita(); return; } // arrastar gira a órbita e inclina
  _qy.setFromAxisAngle(EIXO_Y, ax); _qx.setFromAxisAngle(EIXO_X, ay); J.mundo.quaternion.premultiply(_qy).premultiply(_qx); J.qAtual = J.mundo.quaternion.clone();
}

// --- laço de desenho ---
function quadro() {
  J.raf = 0; if (!J.ativo || !J.mundo) return;
  const agora = performance.now(); const t = (agora - J.t0) / 1000;
  if (!J.gesto) {
    if (Math.abs(J.velRot.x) + Math.abs(J.velRot.y) > 0.00015) { girar(J.velRot.x, J.velRot.y); J.velRot.x *= 0.95; J.velRot.y *= 0.95; }
    else if (J.autoGiro && !J.qAlvo && agora - J.ultimaInteracao > 2200) girar(0.0016, 0);
  }
  if (J.giroEntrada > 0.0005) { girar(J.giroEntrada, 0); J.giroEntrada *= 0.955; } // a volta da abertura
  if (J.qAlvo) { J.mundo.quaternion.slerp(J.qAlvo, 0.085); J.qAtual = J.mundo.quaternion.clone(); if (J.mundo.quaternion.angleTo(J.qAlvo) < 0.002) J.qAlvo = null; }
  if (J.pal.orbita) { // a órbita: gira até a área escolhida (spinAlvo) e volta à inclinação de sempre
    const o = orbitaEstado();
    if (o.spinAlvo !== null && !J.gesto) { o.spin += (o.spinAlvo - o.spin) * 0.085; if (Math.abs(o.spinAlvo - o.spin) < 0.0008) o.spin = o.spinAlvo; }
    if (!J.gesto) o.tilt += (o.tiltAlvo - o.tilt) * 0.08;
    aplicarOrbita();
  }
  const suav = agora < (J.entradaAte || 0) ? 0.04 : 0.09; // na abertura a câmera chega mais devagar
  J.rel += (J.relAlvo - J.rel) * suav; J.ox += (J.oxAlvo - J.ox) * 0.09; J.oy += (J.oyAlvo - J.oy) * 0.09;
  const d = dist(); J.prof += ((J.foco ? d - J.raioFoco : d) - J.prof) * 0.09;
  const u = 2 * Math.max(20, J.prof) * Math.tan(J.camera.fov * Math.PI / 360) / (J.host.clientHeight || 1); // unidades do mundo por pixel (na profundidade do foco)
  const cx = -J.ox * u, cy = J.oy * u; J.camera.position.set(cx, cy, d); J.camera.lookAt(cx, cy, 0);
  J.cena.fog.near = d - R * 0.4; J.cena.fog.far = d + R * 2.2;
  [J.pontos, J.poeira].forEach(p => { if (p) { p.material.uniforms.uTempo.value = t; p.material.uniforms.uDist.value = d; } });
  J.nevoa.forEach(s => { s.material.rotation += s.userData.giro * 0.016; });
  if (J.aneis) { J.aneis.rotation.y = t * 0.05; J.aneis.rotation.x = Math.sin(t * 0.1) * 0.08; }
  // o núcleo respira (devagar parado; rápido e mais forte quando está pensando)
  J.energia += ((J.pensando ? 1 : 0) - J.energia) * 0.05;
  J.vozSuave = (J.vozSuave || 0) + ((J.vozNivel || 0) - (J.vozSuave || 0)) * 0.35; // conversa por voz: o núcleo pulsa com a fala dele
  const ritmo = 1.6 + J.energia * 5, onda = 0.5 + 0.5 * Math.sin(t * ritmo), fala = J.vozSuave;
  if (J.nucleo) {
    const { halo, miolo } = J.nucleo.userData, orbe = !!J.pal.orbe;
    halo.scale.setScalar((orbe ? 46 : J.pal.aditivo ? 34 : 26) * (1 + onda * (0.12 + J.energia * 0.25) + fala * 0.55));
    halo.material.opacity = Math.min(1, (orbe ? 0.22 + onda * 0.22 + J.energia * 0.25 : 0.45 + onda * 0.35) * (J.foco ? 0.5 : 1) + fala * 0.35); if (orbe) miolo.material.opacity = Math.min(1, (0.55 + onda * 0.35) * (J.foco ? 0.5 : 1) + fala * 0.3);
    miolo.scale.setScalar((orbe ? 13 : 8) + onda * (orbe ? 4 : 2.5) + J.energia * 3 + fala * 9);
  }
  if (J.orbe) { const [of, od] = J.pal.cascaOp || [0.5, 0.35]; J.orbe.userData.fora.material.opacity = (J.foco ? of * 0.6 : of) + onda * 0.04; J.orbe.userData.dentro.material.opacity = J.foco ? od * 0.5 : od; }
  if (J.orbe && J.orbe.userData.grade) { // holograma: a grade gira devagar e a borda de luz respira (mais forte quando ele pensa)
    const u2 = J.orbe.userData; u2.grade.rotation.y = t * 0.06; u2.grade.rotation.x = Math.sin(t * 0.13) * 0.12;
    u2.borda.material.uniforms.uForca.value = (1.2 + onda * 0.2 + J.energia * 0.6) * (J.foco ? 0.6 : 1); u2.chao.material.opacity = 0.07 + onda * 0.04;
  }
  if (J.moedas) { // Mercado: ₿ → $ → € em ouro, com troca suave
    const P = 3.4, F = 0.7, m = J.moedas, i = Math.floor(t / P) % MOEDAS.length, fr = t % P;
    if (m.idx !== i) { m.idx = i; m.a.material.map = texturaMoeda(MOEDAS[i]); m.b.material.map = texturaMoeda(MOEDAS[(i + 1) % MOEDAS.length]); m.a.material.needsUpdate = m.b.material.needsUpdate = true; }
    const mix = fr > P - F ? (fr - (P - F)) / F : 0, foco = m.a.userData.foco === undefined ? 1 : m.a.userData.foco;
    m.a.material.opacity = (1 - mix) * foco; m.b.material.opacity = mix * foco;
    const esc = 10.2 * (1 + 0.035 * Math.sin(t * 2.2)); m.a.scale.setScalar(esc); m.b.scale.setScalar(esc);
  }
  (J.satelites || []).forEach(s => { const a = s.userData.fase + t * s.userData.vel; s.position.set(Math.cos(a) * s.userData.r, 0, Math.sin(a) * s.userData.r); s.material.opacity = (0.45 + 0.3 * Math.sin(t * 3 + s.userData.fase)) * (J.foco ? 0.3 : 1); });
  if (J.orbitaLinha) J.orbitaLinha.material.opacity = J.foco ? 0.08 : 0.22;
  if (J.hud) {
    J.hudOp += ((J.foco ? 0.15 : 1) - J.hudOp) * 0.08;
    const { g1, g2, g3 } = J.hud.userData, vel = 1 + J.energia * 4;
    g1.rotation.z += 0.006 * vel; g2.rotation.z -= 0.0012 * vel; g3.rotation.z -= 0.004 * vel;
    J.hud.traverse(o => { if (o.material) { if (o.userData.op0 === undefined) o.userData.op0 = o.material.opacity; o.material.opacity = o.userData.op0 * J.hudOp * (0.75 + onda * 0.25); } });
  }
  if (J.sub) {
    J.sub.rotation.y += 0.004; J.sub.rotation.x = Math.sin(t * 0.2) * 0.2; if (J.subPontos) { J.subPontos.material.uniforms.uTempo.value = t; J.subPontos.material.uniforms.uDist.value = d; }
    J.subOp = (J.subOp === undefined ? 1 : J.subOp) + (((J.foco ? 0.25 : 1)) - (J.subOp === undefined ? 1 : J.subOp)) * 0.08;
    J.sub.traverse(o => { if (o.material) { if (o.userData.op0 === undefined) o.userData.op0 = o.material.opacity !== undefined ? o.material.opacity : 1; if (o.material.opacity !== undefined && !o.material.uniforms) o.material.opacity = o.userData.op0 * J.subOp; } });
  }
  J.renderer.render(J.cena, J.camera);
  atualizarRotulos();
  if (J.elSub && J.sub) { const p = telaDo(J.sub.position.clone().add(new THREE.Vector3(0, -22, 0))); J.elSub.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, 0)`; J.elSub.style.opacity = p.fora ? '0' : (0.55 * (J.subOp || 1)).toFixed(2); }
  J.raf = requestAnimationFrame(quadro);
}
function tocar() { if (J.ativo && !J.raf) J.raf = requestAnimationFrame(quadro); }
function redimensionar() {
  if (!J.renderer || !J.host) return; const w = J.host.clientWidth, h = J.host.clientHeight; if (!w || !h) return;
  const dpr = Math.min(Math.min(w, h) < 900 ? 3 : 2, window.devicePixelRatio || 1); J.renderer.setPixelRatio(dpr); J.renderer.setSize(w, h, false); // celular: resolução cheia (mais nítido)
  const aspecto = w / h; J.camera.aspect = aspecto; J.camera.fov = aspecto < 1 ? 50 : 42; J.camera.updateProjectionMatrix();
  const tg = Math.tan(J.camera.fov * Math.PI / 360);
  const lado = aspecto < 0.8 ? (J.pal && J.pal.orbita ? 1 : 0.86) : 1.1; // no holograma de vidro a órbita inteira precisa caber na largura
  J.baseDist = Math.max(R * 1.2 / tg, R * lado / (tg * Math.min(1, aspecto))); // a esfera cabe na tela (no celular em pé, mais perto: as pontas de fora podem cortar)
  J.escala = h * dpr / 2 / tg; [J.pontos, J.poeira, J.subPontos].forEach(p => { if (p) p.material.uniforms.uEscala.value = J.escala; });
  if (J.sub) J.sub.position.copy(posSubplano());
}
function aplicarPaleta(visual) {
  J.visual = PALETAS[visual] ? visual : 'perola'; J.pal = PALETAS[J.visual]; J.fundo.set(corDe(J.pal.fundo));
  if (J.cena && J.cena.fog) J.cena.fog.color.copy(J.fundo);
}

// --- API usada pelo app ---
window.JarvisBrain = {
  /** Cria o 3D dentro de `host`. opcoes: { rotulos, visual ('escuro'|'claro'), onArea(area), onNo(id), onNucleo(), onToqueVazio() } */
  iniciar(host, opcoes) {
    try {
      J.host = host; J.op = opcoes || {};
      const teste = document.createElement('canvas'); if (!(teste.getContext('webgl2') || teste.getContext('webgl'))) return false;
      J.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      J.renderer.setClearColor(0x000000, 0);
      J.renderer.domElement.className = 'jv-gl'; host.insertBefore(J.renderer.domElement, host.firstChild);
      J.cena = new THREE.Scene(); J.camera = new THREE.PerspectiveCamera(45, 1, 1, 4000);
      aplicarPaleta(J.op.visual); J.cena.fog = new THREE.Fog(J.fundo, 200, 600);
      prepararGestos(J.renderer.domElement);
      window.addEventListener('resize', () => { redimensionar(); tocar(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(J.raf); J.raf = 0; } else tocar(); });
      redimensionar();
      return true;
    } catch (e) { console.warn('JARVIS 3D indisponível:', e); return false; }
  },
  carregar(grafo) { if (!J.renderer) return; construir(grafo); redimensionar(); tocar(); },
  /** Tema: 'perola' | 'cristal' | 'grafite' | 'escuro' — refaz as cores e os materiais de tudo. */
  definirVisual(visual) { if (!J.renderer) return; aplicarPaleta(visual); if (J.grafo) construir(J.grafo); else { construirNucleo(); construirAneis(); } redimensionar(); tocar(); },
  /** Abertura: a câmera chega de longe, devagar, com meia volta — logo depois da vinheta. */
  entrada() { if (!J.renderer) return; J.rel = 2.4; J.relAlvo = J.foco ? REL_AREA : 1; J.giroEntrada = 0.022; J.entradaAte = performance.now() + 1800; tocar(); },
  /** Cor da bolinha de status de cada área (nível de informação do JARVIS): { primos: '#34c759', ... } */
  definirStatus(mapa) { J.status = mapa || {}; J.nos.forEach(n => { const el = J.elRotulos[n.id]; if (el && n.tipo === 'area') el.style.setProperty('--status', J.status[n.area] || ''); }); },
  /** Lista dos tipos das memórias do subplano (uma bolinha para cada). */
  definirSubplano(tipos) { const novo = (tipos || []).join(','); if (novo === (J.subTipos || []).join(',') && J.sub) return; J.subTipos = tipos || []; if (J.renderer) { construirSubplano(); if (J.subPontos) J.subPontos.material.uniforms.uEscala.value = J.escala; tocar(); } },
  /** O JARVIS está pensando (pedido enviado ao computador): o núcleo pisca mais rápido. */
  pensar(sim) { J.pensando = !!sim; tocar(); },
  /** Nível da voz do J.A.R.V.I.S. (0–1) na conversa falada: o núcleo cresce e brilha junto com a fala. */
  voz(nivel) { J.vozNivel = Math.max(0, Math.min(1, nivel || 0)); if (J.vozNivel) tocar(); },
  /** Empurra o cérebro na tela (em pixels: x → direita, y → baixo) para não ficar atrás da janelinha do JARVIS. */
  deslocar(x, y) { J.oxAlvo = x || 0; J.oyAlvo = y || 0; tocar(); },
  focarArea: (a) => focarArea(a, false), focarNo, voltar,
  selecionar(id) { J.sel = id || null; marcarSel(); tocar(); },
  /** Termina na hora as animações de câmera (foco, zoom, deslocamento) — usado nos testes de tela. */
  concluir() {
    if (!J.mundo) return; J.giroEntrada = 0; J.rel = J.relAlvo; J.ox = J.oxAlvo; J.oy = J.oyAlvo;
    if (J.qAlvo) { J.mundo.quaternion.copy(J.qAlvo); J.qAtual = J.qAlvo.clone(); J.qAlvo = null; }
    if (J.pal.orbita) { const o = orbitaEstado(); if (o.spinAlvo !== null) o.spin = o.spinAlvo; o.tilt = o.tiltAlvo; aplicarOrbita(); }
    const d = dist(); J.prof = J.foco ? d - J.raioFoco : d; tocar();
  },
  retomar() { J.ativo = true; redimensionar(); tocar(); },
  pausar() { J.ativo = false; cancelAnimationFrame(J.raf); J.raf = 0; },
  get foco() { return J.foco; },
  get visual() { return J.visual; }
};
window.dispatchEvent(new Event('jarvis3d-pronto'));
