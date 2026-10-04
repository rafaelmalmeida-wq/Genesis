// ============================================================================
// FÁBRICA 3D — o painel do agente de Produção: as 3 impressoras da Primos 3D (2× Bambu Lab A1 Combo com AMS Lite e
// 1× Anycubic Kobra X) imprimindo camada por camada a peça da vez (na cor dela) e a FILA chegando numa esteira.
// Desenhada aqui mesmo, peça por peça, no mesmo estilo da secadora (mármore/alumínio, luz de estúdio). Um só WebGL.
// Uso: const f = Fabrica3D.montar(host, dados, aoTocar); f.anexar(host); f.atualizar(dados); f.soltar();
// dados = { maquinas: [{ nome, job: { titulo, cor } | null }], fila: [{ titulo, cor, qtd }] }
// ============================================================================
import * as THREE from './vendor/three.module.min.js';

function ambiente(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), cena = new THREE.Scene();
  const geo = new THREE.SphereGeometry(80, 32, 16), cores = [], p = geo.attributes.position, cima = new THREE.Color('#ffffff'), baixo = new THREE.Color('#4a4743');
  for (let i = 0; i < p.count; i++) { const c = baixo.clone().lerp(cima, Math.min(1, (p.getY(i) / 80 + 1) / 1.5)); cores.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  cena.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const painel = (w, h, x, y, z, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); cena.add(m); };
  painel(70, 16, 0, 60, 30, 4); painel(12, 60, -60, 10, 30, 2.4); painel(10, 50, 58, 0, 34, 1.8);
  const t = pm.fromScene(cena, 0.03).texture; pm.dispose(); return t;
}
// ---- peças e texturas das máquinas (fase 9) ----
/** Caixa de cantos arredondados e bordas suaves (plástico injetado), com a base em y = 0. */
function blocoArredondado(w, h, d, r, b = 0.6) {
  const ww = w - 2 * b, dd = d - 2 * b, rr = Math.max(0.01, Math.min(r, ww / 2 - 0.01, dd / 2 - 0.01)), s = new THREE.Shape(), x = -ww / 2, y = -dd / 2;
  s.moveTo(x + rr, y); s.lineTo(x + ww - rr, y); s.quadraticCurveTo(x + ww, y, x + ww, y + rr); s.lineTo(x + ww, y + dd - rr); s.quadraticCurveTo(x + ww, y + dd, x + ww - rr, y + dd);
  s.lineTo(x + rr, y + dd); s.quadraticCurveTo(x, y + dd, x, y + dd - rr); s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, b, 0); return geo;
}
function telaCanvas(w, h, desenhar) { const c = document.createElement('canvas'); c.width = w; c.height = h; desenhar(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
/** PEI texturizado DOURADO (a placa da Bambu): bronze com brilhos. */
function texturaPEI() {
  const t = telaCanvas(256, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#9a8150'); g.addColorStop(0.5, '#b39661'); g.addColorStop(1, '#8a7246'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { x.fillStyle = ['#e8d3a0', '#6b5633', '#f6e7c0', '#7d6640'][i % 4]; x.globalAlpha = 0.35 + Math.random() * 0.5; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random(), 1 + Math.random()); } x.globalAlpha = 1; });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}
/** Frente do cabeçote da A1: a janela escura com os 4 pontos laranja (o anel de luz é uma peça à parte) e "Bambu Lab". */
function texturaCabecoteA1() {
  return telaCanvas(256, 330, (x, w) => { const cy = 115;
    x.fillStyle = '#2a2b2f'; x.beginPath(); x.arc(w / 2, cy, 48, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffb340'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; x.beginPath(); x.arc(w / 2 + Math.cos(a) * 26, cy + Math.sin(a) * 26, 7, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = '#ffd08a'; x.beginPath(); x.arc(w / 2, cy, 9, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#8e8f94'; x.font = '600 30px "Segoe UI", -apple-system, sans-serif'; x.textAlign = 'center'; x.fillText('Bambu Lab', w / 2, 238);
    x.fillStyle = '#b7b8bc'; x.font = '13px "Segoe UI", sans-serif'; x.fillText('Remove the cover to', w / 2, 30); });
}
/** Frente do cabeçote da Kobra X: telinha colorida e "ANYCUBIC". */
function texturaCabecoteKobra() {
  return telaCanvas(256, 330, (x, w) => {
    x.fillStyle = '#16181c'; x.beginPath(); x.roundRect(58, 48, 140, 120, 18); x.fill();
    const g = x.createLinearGradient(70, 60, 190, 156); g.addColorStop(0, '#2a7cff'); g.addColorStop(1, '#8a4dff'); x.fillStyle = g; x.beginPath(); x.roundRect(70, 60, 116, 96, 12); x.fill();
    x.fillStyle = '#ffffff'; x.font = '700 30px "Segoe UI", sans-serif'; x.textAlign = 'center'; x.fillText('ACE', w / 2, 118);
    x.fillStyle = '#7e8187'; x.font = '700 24px "Segoe UI", -apple-system, sans-serif'; x.fillText('ANYCUBIC', w / 2, 236); });
}
/** Tela de toque da base: "Imprimindo" + barra de progresso (laranja na Bambu, azul na Anycubic). */
function texturaTela(a1) {
  return telaCanvas(256, 168, (x, w, h) => { x.fillStyle = '#0c0f14'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1b2029'; x.fillRect(0, 0, w, 26); x.fillStyle = '#9aa3b2'; x.font = '15px "Segoe UI", sans-serif'; x.fillText(a1 ? 'Bambu Lab A1' : 'Kobra X', 10, 18);
    x.fillStyle = '#ffffff'; x.font = '600 22px "Segoe UI", sans-serif'; x.fillText('Imprimindo', 14, 70);
    x.fillStyle = '#2a2f38'; x.beginPath(); x.roundRect(14, 92, w - 28, 12, 6); x.fill();
    x.fillStyle = a1 ? '#ff9f0a' : '#2a8cff'; x.beginPath(); x.roundRect(14, 92, (w - 28) * 0.62, 12, 6); x.fill();
    x.fillStyle = '#7d8590'; x.font = '15px "Segoe UI", sans-serif'; x.fillText('62%  ·  camada 148', 14, 136); });
}
function texturaMarca(txt, cor) { return telaCanvas(512, 90, (x, w, h) => { x.fillStyle = cor; x.font = '700 54px "Segoe UI", -apple-system, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2); }); }
/** Sombra de contato macia (um degradê escuro no chão). */
function texturaSombra() { return telaCanvas(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.55, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }); }
function texturaTexto(txt, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = 'rgba(12,12,14,0.86)'; x.beginPath(); x.roundRect(4, 4, 504, 120, 28); x.fill();
  x.fillStyle = '#ffffff'; x.font = '600 40px -apple-system, "Segoe UI", sans-serif'; x.fillText(String(txt).slice(0, 22), 28, 58);
  x.fillStyle = '#9a9aa0'; x.font = '28px -apple-system, "Segoe UI", sans-serif'; x.fillText(String(sub || '').slice(0, 30), 28, 100);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

class Fabrica {
  constructor(host, dados, aoTocar) {
    this.aoTocar = aoTocar || (() => { });
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.setClearColor(0, 0);
    r.domElement.className = 'cc-gl';
    this.cena = new THREE.Scene(); this.cena.environment = ambiente(r);
    this.cam = new THREE.PerspectiveCamera(30, 1, 1, 1500);
    this.cena.add(new THREE.HemisphereLight('#ffffff', '#3a3632', 0.55));
    const k = new THREE.DirectionalLight('#ffffff', 1.4); k.position.set(80, 140, 120); this.cena.add(k);
    const k2 = new THREE.DirectionalLight('#cfe0ff', 0.5); k2.position.set(-100, 60, -80); this.cena.add(k2);
    this.mat = {
      preto: new THREE.MeshPhysicalMaterial({ color: '#151619', roughness: 0.45, metalness: 0.2, clearcoat: 0.4 }),
      alu: new THREE.MeshStandardMaterial({ color: '#c8cbd0', roughness: 0.3, metalness: 1 }),
      mesa: new THREE.MeshStandardMaterial({ color: '#2a2b30', roughness: 0.25, metalness: 0.6 }),
      esteira: new THREE.MeshStandardMaterial({ color: '#1c1d21', roughness: 0.8 }),
      bico: new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: 0.3, metalness: 1, emissive: '#ff6a00', emissiveIntensity: 0.25 }),
      pei: new THREE.MeshStandardMaterial({ map: texturaPEI(), roughness: 0.62, metalness: 0.45 }),
      sombra: new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false })
    };
    // chão de mármore claro (o horizonte branco da Central)
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const cx = cv.getContext('2d'); const g = cx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(0.6, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(260, 140), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })); sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.05; this.cena.add(sombra);
    this.mundo = new THREE.Group(); this.cena.add(this.mundo);
    this.maquinas = []; this.caixas = [];
    this.montarEsteira();
    this.atualizar(dados);
    this.ang = 0; this.t0 = performance.now(); this.gestos(r.domElement); this.anexar(host);
    this.visivel = () => { if (!document.hidden) this.tocar(); }; document.addEventListener('visibilitychange', this.visivel);
  }
  /** Uma impressora, refeita na fase 9 a partir das FOTOS das máquinas do Rafael (pasta "Impressoras Trabalhando"):
   *  as duas são "bed slingers" de pórtico (a mesa anda para frente e para trás, o pórtico de alumínio sobe, o cabeçote corre).
   *  A1 Combo: base cinza-clara baixa e arredondada, pórtico de alumínio, mesa com PEI DOURADO texturizado, cabeçote branco com
   *  o ANEL DE LUZ LARANJA e "Bambu Lab", cabo em arco até o topo e a AMS LITE ao lado (base redonda, poste, cubo com 4
   *  bobinas em X). Kobra X: corpo branco/cinza-claro, tela de toque grande inclinada na frente da base, cabeçote branco com
   *  telinha e "ANYCUBIC", e o suporte de bobinas no topo. Medidas ≈ 1 unidade = 1 cm. */
  impressora(tipo, x) {
    const g = new THREE.Group(), a1 = tipo === 'a1'; g.position.set(x, 0, 0);
    const plast = new THREE.MeshPhysicalMaterial({ color: a1 ? '#e3e4e6' : '#eceef0', roughness: 0.48, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4 });
    const branco = new THREE.MeshPhysicalMaterial({ color: '#f5f5f3', roughness: 0.38, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    const escuro = new THREE.MeshPhysicalMaterial({ color: '#1c1d20', roughness: 0.45, metalness: 0.15, clearcoat: 0.3 });
    const alu = new THREE.MeshStandardMaterial({ color: a1 ? '#c4c8ce' : '#d6d9dd', roughness: 0.32, metalness: 0.95 });
    const tubo = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.3, transparent: true, opacity: 0.88 });
    const add = (geo, mat, px, py, pz, pai = g) => { const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz); pai.add(o); return o; };
    const W = a1 ? 34 : 36, D = a1 ? 38 : 42, HB = a1 ? 6.5 : 7.5, HT = a1 ? 38 : 42, ZC = -3; // ZC = profundidade das colunas
    // sombra de contato (macia) embaixo da máquina
    const sb = add(new THREE.PlaneGeometry(W * 1.5, D * 1.35), this.mat.sombra, 0, 0.06, 0); sb.rotation.x = -Math.PI / 2;
    // BASE arredondada + fenda do eixo Y + tela de toque
    add(blocoArredondado(W, HB, D, 3, 1.2), plast, 0, 0, 0);
    add(new THREE.BoxGeometry(4, 0.3, D - 8), escuro, 0, HB + 0.05, 0);
    const telaW = a1 ? 6.5 : 9, telaH = a1 ? 4.2 : 5.6, tela = new THREE.Group(); tela.position.set(a1 ? W / 2 - 6.5 : W / 2 - 7.5, HB + (a1 ? 0.4 : 0.8), D / 2 - (a1 ? 1.4 : 1.8)); tela.rotation.x = -0.62; g.add(tela);
    add(new THREE.BoxGeometry(telaW + 0.8, telaH + 0.8, 0.7), escuro, 0, telaH / 2, 0, tela);
    add(new THREE.PlaneGeometry(telaW, telaH), new THREE.MeshBasicMaterial({ map: texturaTela(a1), toneMapped: false }), 0, telaH / 2, 0.37, tela);
    if (!a1) { const et = add(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshBasicMaterial({ map: texturaMarca('ANYCUBIC', '#8a8d93'), transparent: true }), -W / 2 + 8, HB / 2 + 0.6, D / 2 + 0.02); et.renderOrder = 2; }
    // MESA (anda em Y): carro escuro + placa de PEI dourado texturizado
    const mesa = new THREE.Group(); mesa.position.set(0, HB + 0.9, 0); g.add(mesa);
    add(new THREE.BoxGeometry(27, 0.9, 27), escuro, 0, 0, 0, mesa);
    add(new THREE.BoxGeometry(26.2, 0.22, 26.2), this.mat.pei, 0, 0.56, 0, mesa);
    // COLUNAS (Z) de alumínio + capas + TRAVESSA de cima
    const xc = W / 2 - 2.4;
    [-1, 1].forEach(s => { add(new THREE.BoxGeometry(2.6, HT, 3.6), alu, s * xc, HB + HT / 2, ZC); add(new THREE.BoxGeometry(3.2, 3.2, 4.4), plast, s * xc, HB + 1.6, ZC); add(new THREE.CylinderGeometry(0.35, 0.35, HT - 4, 10), escuro, s * xc, HB + HT / 2, ZC - 2.2); });
    add(new THREE.BoxGeometry(2 * xc + 2.6, 2.6, 3.6), alu, 0, HB + HT + 1.3, ZC);
    add(blocoArredondado(7, 2, 4.2, 1, 0.4), plast, 0, HB + HT + 2.6, ZC); // o "cubo" do topo (onde os tubos chegam)
    // PÓRTICO (X): viga de alumínio com o trilho preto na frente + CABEÇOTE
    const port = new THREE.Group(); port.position.set(0, HB + 12, ZC); g.add(port);
    add(new THREE.BoxGeometry(2 * xc - 2.6, 2.6, 2.8), alu, 0, 0, 1.8, port);
    add(new THREE.BoxGeometry(2 * xc - 3.4, 0.7, 0.4), escuro, 0, 0.4, 3.3, port);
    [-1, 1].forEach(s => add(new THREE.BoxGeometry(2.4, 4.4, 4.6), plast, s * (xc - 0.4), 0, 0.8, port)); // carros do Z nas colunas
    const cab = new THREE.Group(); cab.position.set(0, 0.6, 5.4); port.add(cab);
    add(blocoArredondado(6.4, 8, 5.4, 1.4, 0.6), branco, 0, -4.4, 0, cab);
    const frente = add(new THREE.PlaneGeometry(5.6, 7.2), new THREE.MeshBasicMaterial({ map: a1 ? texturaCabecoteA1() : texturaCabecoteKobra(), transparent: true, toneMapped: false }), 0, -0.6, 2.76, cab); frente.renderOrder = 2;
    add(blocoArredondado(4.6, 2.2, 4, 0.8, 0.3), escuro, 0, -6.6, 0.2, cab); // bloco do bico (preto)
    add(new THREE.ConeGeometry(0.55, 1.4, 14), this.mat.bico, 0, -7.4, 0.4, cab).rotation.x = Math.PI;
    if (a1) { const luz = add(new THREE.RingGeometry(1.15, 1.45, 40), new THREE.MeshBasicMaterial({ color: '#ffb340', toneMapped: false, transparent: true, opacity: 0.95 }), 0, 0.5, 2.8, cab); luz.renderOrder = 3; cab.userData.luz = luz; }
    // BOBINAS + tubos de PTFE até o cabeçote
    const coresB = ['#1d1d20', '#f1f1ee', '#d4a53c', '#2457c5'], pontos = [];
    const flange = new THREE.MeshPhysicalMaterial({ color: '#4a4c52', roughness: 0.2, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 0.7, depthWrite: false });
    const bobina = (pai, cor, r = 5.2, l = 2.6) => { const s = new THREE.Group(); pai.add(s);
      add(new THREE.CylinderGeometry(r, r, 0.3, 40), flange, 0, l / 2 + 0.15, 0, s); add(new THREE.CylinderGeometry(r, r, 0.3, 40), flange, 0, -l / 2 - 0.15, 0, s);
      add(new THREE.CylinderGeometry(r - 0.5, r - 0.5, l, 40), new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55 }), 0, 0, 0, s); // o filamento (cor real), visível pelo carretel translúcido
      add(new THREE.CylinderGeometry(1.6, 1.6, l + 0.4, 20), plast, 0, 0, 0, s); return s; };
    if (a1) { // AMS LITE: base redonda, poste e o cubo com 4 bobinas em X (duas em cima, duas embaixo, viradas para fora)
      const ams = new THREE.Group(); ams.position.set(W / 2 + 12, 0, -6); g.add(ams);
      const sa = add(new THREE.PlaneGeometry(22, 22), this.mat.sombra, 0, 0.06, 0, ams); sa.rotation.x = -Math.PI / 2;
      add(new THREE.CylinderGeometry(6, 6.6, 1.6, 40), plast, 0, 0.8, 0, ams);
      add(new THREE.CylinderGeometry(0.85, 0.85, 22, 20), branco, 0, 12.6, 0, ams);
      add(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 28), branco, 0, 24, 0, ams);
      add(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 20), new THREE.MeshBasicMaterial({ color: '#ffb340', toneMapped: false }), 0, 25.8, 0, ams);
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy], k) => {
        const braco = new THREE.Group(); braco.position.set(sx * 3.6, 24 + sy * 3.4, 0); braco.rotation.z = sx * (sy > 0 ? 0.55 : 0.95); ams.add(braco);
        add(new THREE.BoxGeometry(4.2, 0.8, 1.6), plast, -sx * 1.4, 0, 0, braco);
        const s = bobina(braco, coresB[k], 4.8, 2.4); s.rotation.x = Math.PI / 2; s.position.set(sx * 3, 0, 0);
        pontos.push(new THREE.Vector3(ams.position.x + sx * 1.6, 25.6, ams.position.z + (sy > 0 ? 0.6 : -0.6))); });
    } else { // Kobra X: suporte de bobinas em cima da travessa (as 4 lado a lado)
      add(new THREE.BoxGeometry(2 * xc, 0.9, 6.5), plast, 0, HB + HT + 3.2, ZC);
      coresB.forEach((c, k) => { const s = bobina(g, c, 4.4, 2.2); s.rotation.z = Math.PI / 2; s.position.set(-11.4 + k * 7.6, HB + HT + 8.4, ZC);
        pontos.push(new THREE.Vector3(-11.4 + k * 7.6, HB + HT + 3.8, ZC + 3)); });
    }
    const tubos = new THREE.Group(); g.add(tubos);
    return { g, mesa, port, cab, tipo, pontos, tubos, tuboMat: tubo, alturaBase: HB + 3.7 }; // bico encostado no topo da peça
  }
  /** Os tubos de PTFE (das bobinas ao cabeçote) acompanham o cabeçote: refeitos a cada poucos quadros. */
  tubosDe(mq) {
    mq.tubos.children.forEach(o => { o.geometry.dispose(); }); mq.tubos.clear();
    const p = new THREE.Vector3(); mq.cab.getWorldPosition(p); mq.g.worldToLocal(p); p.y += 3.5;
    mq.pontos.forEach((a, k) => { const meio = a.clone().lerp(p, 0.5); meio.y = Math.max(a.y, p.y) + 7; const curva = new THREE.CatmullRomCurve3([a, meio, p.clone().add(new THREE.Vector3((k - 1.5) * 0.4, 0, 0))]);
      mq.tubos.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 0.22, 6), mq.tuboMat)); });
  }
  montarEsteira() {
    const e = new THREE.Group(); e.position.set(0, 0, 34); this.mundo.add(e); this.esteira = e;
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(150, 2.4, 10), this.mat.esteira); corpo.position.y = 2; e.add(corpo);
    [-1, 1].forEach(s => { const r = new THREE.Mesh(new THREE.BoxGeometry(150, 1.2, 0.8), this.mat.alu); r.position.set(0, 3.6, s * 5); e.add(r); });
    for (let i = 0; i < 18; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 9), new THREE.MeshStandardMaterial({ color: '#34353a' })); l.position.set(-72 + i * 8.5, 3.25, 0); e.add(l); }
    this.listras = e.children.slice(3);
  }
  atualizar(dados) {
    this.dados = dados;
    if (!this.maquinas.length) {
      const tipos = (dados.maquinas || []).map(m => /kobra|anycubic/i.test(m.nome) ? 'kobra' : 'a1');
      const n = Math.max(1, tipos.length), passo = 62; // a A1 Combo tem a AMS Lite ao lado
      tipos.forEach((t, i) => { const mq = this.impressora(t, (i - (n - 1) / 2) * passo); this.mundo.add(mq.g); this.maquinas.push(mq); });
    }
    this.maquinas.forEach((mq, i) => {
      const d = (dados.maquinas || [])[i] || {}, job = d.job;
      if (mq.peca) { mq.mesa.remove(mq.peca); mq.peca.geometry.dispose(); mq.peca.material.dispose(); mq.peca = null; }
      if (mq.placa) { mq.g.remove(mq.placa); mq.placa.material.map.dispose(); mq.placa.material.dispose(); }
      if (job) { const cor = job.cor || '#8e8e93'; const mat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: /d4a53c|c3c6cc/.test(cor) ? 0.6 : 0.02 });
        const geo = new THREE.CylinderGeometry(4.2, 5, 10, 32, 20); geo.translate(0, 5, 0); mq.peca = new THREE.Mesh(geo, mat); mq.peca.position.y = 0.5; mq.mesa.add(mq.peca); }
      mq.placa = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaTexto((d.nome || 'Impressora') + (job && job.real ? ' · ao vivo' : ''), job ? (job.real && job.prog != null ? `% · ` : job.titulo) : 'livre'), transparent: true, depthWrite: false }));
      mq.placa.scale.set(30, 7.5, 1); mq.placa.position.set(0, 69, 0); mq.g.add(mq.placa); mq.job = job;
    });
    this.caixas.forEach(c => { this.esteira.remove(c); c.geometry.dispose(); c.material.dispose(); }); this.caixas = [];
    (dados.fila || []).slice(0, 12).forEach((f, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(5.5, 4.5, 5.5), new THREE.MeshStandardMaterial({ color: f.cor || '#8e8e93', roughness: 0.45, metalness: 0.05 })); b.position.set(-68 + i * 11, 6, 0); b.userData = { f, base: -68 + i * 11 }; this.esteira.add(b); this.caixas.push(b); });
    this.tocar();
  }
  gestos(el) {
    let x0 = null, a0 = 0, moveu = 0; el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', e => { x0 = e.clientX; a0 = this.ang; moveu = 0; this.mexeu = performance.now(); });
    el.addEventListener('pointermove', e => { if (x0 === null) return; const dx = e.clientX - x0; moveu = Math.max(moveu, Math.abs(dx)); this.ang = Math.max(-0.6, Math.min(0.6, a0 + dx * 0.006)); this.mexeu = performance.now(); });
    el.addEventListener('pointerup', e => { if (moveu < 5) this.tocarEm(e); x0 = null; }); el.addEventListener('pointercancel', () => { x0 = null; });
  }
  tocarEm(e) {
    const r = this.renderer.domElement.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.cam);
    const h = ray.intersectObjects([...this.caixas, ...this.maquinas.map(m => m.g)], true)[0]; if (!h) return this.aoTocar(null);
    const cx = this.caixas.find(c => c === h.object); if (cx) return this.aoTocar({ titulo: cx.userData.f.titulo, sub: `${cx.userData.f.qtd || 1} un. · na fila` }, e.clientX - r.left, e.clientY - r.top);
    const mq = this.maquinas.find(m => { let o = h.object; while (o) { if (o === m.g) return true; o = o.parent; } return false; });
    const i = this.maquinas.indexOf(mq), d = (this.dados.maquinas || [])[i] || {};
    this.aoTocar({ titulo: d.nome || 'Impressora', sub: mq && mq.job ? (mq.job.real ? `ao vivo: ${mq.job.titulo} · ${Math.round((mq.job.prog || 0) * 100)}%${mq.job.faltam != null ? ' · faltam ' + Math.floor(mq.job.faltam / 60) + 'h' + String(mq.job.faltam % 60).padStart(2, '0') : ''}` : `imprimindo: ${mq.job.titulo}`) : 'livre' }, e.clientX - r.left, e.clientY - r.top);
  }
  /** A rolagem da página gira a fábrica. */
  rolar(v) { this.ang = Math.max(-0.6, Math.min(0.6, v)); this.mexeu = performance.now(); this.tocar(); }
  anexar(host) { if (!host) return; this.host = host; host.appendChild(this.renderer.domElement); if (this.obs) this.obs.disconnect(); if (window.ResizeObserver) { this.obs = new ResizeObserver(() => { this.medir(); this.tocar(); }); this.obs.observe(host); } this.medir(); this.tocar(); }
  medir() { const h = this.host; if (!h) return; const w = h.clientWidth, a = h.clientHeight; if (!w || !a) return; this.renderer.setSize(w, a, false); this.cam.aspect = w / a; this.cam.updateProjectionMatrix(); const tg = Math.tan(this.cam.fov * Math.PI / 360); this.dist = Math.max(52 / tg, 108 / (tg * this.cam.aspect)); }
  tocar() { if (!this.raf && !this.solto) this.raf = requestAnimationFrame(() => this.quadro()); }
  quadro() {
    this.raf = 0; const el = this.renderer.domElement; if (this.solto || !el.isConnected || document.hidden) return;
    const t = (performance.now() - this.t0) / 1000;
    this.maquinas.forEach((mq, i) => {
      const fase = t * 1.6 + i * 1.3, ativo = !!mq.job;
      if (ativo) { // o cabeçote risca a camada, a mesa (A1) vai e volta, a peça cresce e recomeça
        mq.cab.position.x = Math.sin(fase * 2.2) * 5; mq.mesa.position.z = Math.cos(fase * 1.7) * 4; // as duas são "bed slingers": a mesa vai e volta
        const prog = mq.job.real && mq.job.prog != null ? mq.job.prog : (t * 0.045 + i * 0.27) % 1; // real (Bambu) ou ilustrativo
        if (mq.peca) mq.peca.scale.y = 0.04 + prog * 0.96;
        mq.port.position.y = mq.alturaBase + 10 * (0.04 + prog * 0.96) + 5.2; // o pórtico sobe com a peça
      }
      if (mq.cab.userData.luz) mq.cab.userData.luz.material.opacity = ativo ? 0.55 + 0.45 * Math.abs(Math.sin(t * 2.2 + i)) : 0.35; // o anel laranja da A1 "respira" imprimindo
      if (!mq.tuboQ || (mq.tuboQ++ % 4 === 0)) { if (!mq.tuboQ) mq.tuboQ = 1; this.tubosDe(mq); }
    });
    this.caixas.forEach((c, i) => { const vx = ((c.userData.base + t * 3) + 75) % 150 - 75; c.position.x = vx; c.rotation.y = Math.sin(t + i) * 0.05; });
    (this.listras || []).forEach((l, i) => { l.position.x = ((-72 + i * 8.5 + t * 3) + 75) % 153 - 76.5; });
    const parado = performance.now() - (this.mexeu || 0) > 2500; if (parado) this.ang += (Math.sin(t * 0.15) * 0.25 - this.ang) * 0.01;
    this.mundo.rotation.y = this.ang;
    const d = this.dist || 200; this.cam.position.set(0, 40 + d * 0.18, d * 0.9); this.cam.lookAt(0, 31, 6);
    this.renderer.render(this.cena, this.cam);
    this.raf = requestAnimationFrame(() => this.quadro());
  }
  soltar() { this.solto = true; cancelAnimationFrame(this.raf); if (this.obs) this.obs.disconnect(); document.removeEventListener('visibilitychange', this.visivel); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}
window.Fabrica3D = { montar: (host, dados, aoTocar) => new Fabrica(host, dados, aoTocar) };
