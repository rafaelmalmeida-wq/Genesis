// ============================================================================
// EXPOSITOR 3D — a torre giratória de chaveiros da Primos 3D, igual à dos vídeos: base em estrela, coluna,
// 2 andares de 8 braços com ranhuras e a placa do PIX no topo (andar de cima R$ 15, de baixo R$ 10).
// Desenhada aqui mesmo, peça por peça (não é o arquivo do autor do MakerWorld). Cada ranhura mostra um chaveiro do
// ESTOQUE, na cor do modelo; vendeu → o gancho esvazia. Arrastar gira (com inércia), pinça/roda aproxima, tocar num
// chaveiro diz qual é. Um só visualizador (um só WebGL): o app "anexa" o mesmo canvas de novo quando redesenha a aba.
// Uso: const v = Expositor3D.montar(host, dados, aoTocar); v.anexar(outroHost); v.atualizar(dados); v.soltar();
// dados = { nome, aneis: 'ouro'|'prata', andares: [{ preco, itens: [{ nome, restante, cor, metal }] }] }
// ============================================================================
import * as THREE from './vendor/three.module.min.js';

const BRACOS = 8, RANHURAS = 6, PASSO = 1.45, RAIO_COL = 1.3, INICIO = RAIO_COL + 1.1;
const COMP = INICIO + PASSO * RANHURAS + 0.9 - RAIO_COL; // comprimento do braço (da coluna até a ponta)
const Y_CIMA = 30, Y_BAIXO = 14.5, TOPO = 35.5;

function ambiente(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), cena = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 32, 16), cores = [], p = geo.attributes.position, cima = new THREE.Color('#ffffff'), baixo = new THREE.Color('#8f877b');
  for (let i = 0; i < p.count; i++) { const c = baixo.clone().lerp(cima, Math.min(1, (p.getY(i) / 50 + 1) / 1.6)); cores.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  cena.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const painel = (w, h, x, y, z, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); cena.add(m); };
  painel(34, 14, 0, 38, 16, 3.6); painel(14, 30, -38, 6, 18, 2.2); painel(10, 24, 36, -4, -14, 1.6);
  const tex = pm.fromScene(cena, 0.04).texture; pm.dispose(); return tex;
}
function semente(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
/** Placa do topo: "PRIMOS 3D · Superior R$ 15 · Inferior R$ 10" e um QR ilustrativo (não é o QR de verdade). */
function texturaPlaca(nome) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 400; const x = c.getContext('2d');
  x.fillStyle = '#141416'; x.fillRect(0, 0, 640, 400);
  const rnd = semente(7), n = 21, q = 170, ox = 34, oy = 60, cel = q / n;
  x.fillStyle = '#ffffff'; x.fillRect(ox - 10, oy - 10, q + 20, q + 20); x.fillStyle = '#111';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (rnd() > 0.52) x.fillRect(ox + i * cel, oy + j * cel, cel, cel);
  [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([i, j]) => { x.fillStyle = '#111'; x.fillRect(ox + i * cel, oy + j * cel, 7 * cel, 7 * cel); x.fillStyle = '#fff'; x.fillRect(ox + (i + 1) * cel, oy + (j + 1) * cel, 5 * cel, 5 * cel); x.fillStyle = '#111'; x.fillRect(ox + (i + 2) * cel, oy + (j + 2) * cel, 3 * cel, 3 * cel); });
  x.fillStyle = '#ff8a1d'; x.font = '700 36px -apple-system, "Segoe UI", sans-serif'; x.fillText('PRIMOS 3D', 240, 92);
  x.fillStyle = '#f2f2f2'; x.font = '600 27px ui-monospace, Menlo, Consolas, monospace'; x.fillText('Superior: R$ 15,00', 240, 146); x.fillText('Inferior: R$ 10,00', 240, 186);
  x.font = '22px ui-monospace, Menlo, Consolas, monospace'; x.fillStyle = '#c9c9cc'; x.fillText('PIX: escaneie o QR', 240, 228);
  x.font = '600 24px -apple-system, "Segoe UI", sans-serif'; x.fillStyle = '#8e8e93'; x.fillText(String(nome || '').slice(0, 34), 34, 330);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/** Plaquinha de chaveiro (retângulo arredondado com espessura), em tamanho 1 × 1 — cada chaveiro escala a sua. */
function geometriaPlaquinha() {
  const s = new THREE.Shape(), w = 0.5, h = 0.5, r = 0.2;
  s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -0.11); return g;
}

class Vitrine {
  constructor(host, dados, aoTocar) {
    this.aoTocar = aoTocar || (() => { });
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.setClearColor(0x000000, 0);
    r.domElement.className = 'jvk-gl';
    const cena = this.cena = new THREE.Scene(); cena.environment = ambiente(r);
    this.cam = new THREE.PerspectiveCamera(30, 1, 1, 600);
    cena.add(new THREE.HemisphereLight('#ffffff', '#8a8378', 0.55));
    const chave = new THREE.DirectionalLight('#ffffff', 1.5); chave.position.set(40, 70, 60); cena.add(chave);
    const recorte = new THREE.DirectionalLight('#ffe2c4', 0.7); recorte.position.set(-60, 30, -50); cena.add(recorte);
    // sombra macia no chão
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const ctx = cv.getContext('2d'); const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(40,30,20,0.42)'); gr.addColorStop(0.55, 'rgba(40,30,20,0.12)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
    const ts = new THREE.CanvasTexture(cv); const sombra = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: ts, transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.02; cena.add(sombra);
    this.torre = new THREE.Group(); cena.add(this.torre);
    this.estrutura(dados.nome);
    this.geoTag = geometriaPlaquinha(); this.geoAnel = new THREE.TorusGeometry(0.62, 0.075, 8, 24);
    this.matTag = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.02, envMapIntensity: 0.9 });
    this.matTagMetal = new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.85, envMapIntensity: 1.2 });
    this.matAnel = new THREE.MeshStandardMaterial({ color: '#d7d9dc', roughness: 0.22, metalness: 1, envMapIntensity: 1.3 });
    this.ang = dados.angulo !== undefined ? dados.angulo : -0.5; this.vel = 0; this.zoom = 1; this.balanco = 0; this.ultimoToque = 0;
    this.chaveiros(dados); this.gestos(r.domElement); this.anexar(host);
    this.visivel = () => { if (!document.hidden) this.tocar(); }; document.addEventListener('visibilitychange', this.visivel);
  }
  estrutura(nome) {
    const preto = this.matPreto = new THREE.MeshPhysicalMaterial({ color: '#17181b', roughness: 0.55, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    const t = this.torre, add = (geo, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, preto); m.position.set(x, y, z); m.rotation.y = ry; t.add(m); return m; };
    // base: moldura de 8 lados + raios cruzados + miolo
    const fora = new THREE.Shape(), furo = new THREE.Path();
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const p1 = [Math.cos(a) * 11, Math.sin(a) * 11], p2 = [Math.cos(a) * 9.3, Math.sin(a) * 9.3]; if (i === 0) { fora.moveTo(...p1); furo.moveTo(...p2); } else { fora.lineTo(...p1); furo.lineTo(...p2); } }
    fora.holes.push(furo);
    const moldura = new THREE.Mesh(new THREE.ExtrudeGeometry(fora, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 }), preto); moldura.rotation.x = -Math.PI / 2; moldura.position.y = 0.15; t.add(moldura);
    for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(19, 1.1, 1.2), 0, 0.75, 0, i * Math.PI / 4);
    add(new THREE.CylinderGeometry(2.6, 2.9, 1.6, 32), 0, 0.95, 0);
    // coluna, colares dos andares e a emenda do meio
    add(new THREE.CylinderGeometry(RAIO_COL, RAIO_COL, TOPO - 1.4, 32), 0, 1.4 + (TOPO - 1.4) / 2, 0);
    [Y_CIMA, Y_BAIXO].forEach(y => add(new THREE.CylinderGeometry(1.85, 1.85, 1.7, 32), 0, y, 0));
    add(new THREE.CylinderGeometry(1.55, 1.55, 1.1, 32), 0, 22.5, 0);
    add(new THREE.CylinderGeometry(1.5, 1.3, 0.8, 32), 0, TOPO + 0.2, 0);
    // braços com ranhuras (dentes)
    const dentes = [], dente = new THREE.BoxGeometry(0.42, 0.85, 0.8), ponta = new THREE.BoxGeometry(0.5, 1.4, 0.8);
    [Y_CIMA, Y_BAIXO].forEach(y => {
      for (let b = 0; b < BRACOS; b++) {
        const a = b / BRACOS * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), meio = RAIO_COL + COMP / 2;
        add(new THREE.BoxGeometry(COMP, 0.72, 0.8), c * meio, y, -s * meio, a);
        for (let k = 0; k <= RANHURAS; k++) { const rr = INICIO + k * PASSO - PASSO / 2; dentes.push([c * rr, y + 0.75, -s * rr, a, k === RANHURAS]); }
      }
    });
    const inst = new THREE.InstancedMesh(dente, preto, dentes.filter(d => !d[4]).length), instP = new THREE.InstancedMesh(ponta, preto, dentes.filter(d => d[4]).length), m = new THREE.Object3D();
    let i1 = 0, i2 = 0;
    dentes.forEach(([x, y, z, a, p]) => { m.position.set(x, p ? y + 0.28 : y, z); m.rotation.set(0, a, 0); m.updateMatrix(); (p ? instP : inst).setMatrixAt(p ? i2++ : i1++, m.matrix); });
    t.add(inst, instP);
    // a placa do PIX no topo (haste + placa preta com a arte na frente)
    add(new THREE.CylinderGeometry(0.35, 0.35, 3, 12), 0, TOPO + 1.8, 0);
    const placaMat = [preto, preto, preto, preto, new THREE.MeshStandardMaterial({ map: texturaPlaca(nome), roughness: 0.5 }), preto];
    const placa = new THREE.Mesh(new THREE.BoxGeometry(10.5, 6.6, 0.35), placaMat); placa.position.set(0, TOPO + 6.4, 0); t.add(placa); this.placa = placa;
  }
  /** Os chaveiros do estoque: andar de cima com os de R$ 15, de baixo com os de R$ 10; até 2 por ranhura. */
  chaveiros(dados) {
    [this.tags, this.tagsMetal, this.aneis].forEach(o => { if (o) { this.torre.remove(o); o.dispose(); } });
    this.matAnel.color.set(dados.aneis === 'ouro' ? '#d8b35c' : '#d7d9dc');
    const unidades = [];
    (dados.andares || []).forEach((andar, ia) => {
      const y = ia === 0 ? Y_CIMA : Y_BAIXO, lista = [];
      (andar.itens || []).forEach(it => { for (let n = 0; n < Math.max(0, it.restante || 0); n++) lista.push(it); });
      lista.slice(0, BRACOS * RANHURAS * 2).forEach((it, i) => {
        const b = i % BRACOS, k = RANHURAS - 1 - (Math.floor(i / BRACOS) % RANHURAS), camada = Math.floor(i / (BRACOS * RANHURAS));
        unidades.push({ it, y, b, k, camada, preco: andar.preco, grande: andar.preco >= 15 });
      });
    });
    const normais = unidades.filter(u => !u.it.metal), metais = unidades.filter(u => u.it.metal);
    this.tags = new THREE.InstancedMesh(this.geoTag, this.matTag, Math.max(1, normais.length));
    this.tagsMetal = new THREE.InstancedMesh(this.geoTag, this.matTagMetal, Math.max(1, metais.length));
    this.aneis = new THREE.InstancedMesh(this.geoAnel, this.matAnel, Math.max(1, unidades.length));
    this.tags.count = normais.length; this.tagsMetal.count = metais.length; this.aneis.count = unidades.length;
    this.unidades = unidades; this.porTag = normais; this.porMetal = metais;
    const rnd = semente(11), cor = new THREE.Color();
    unidades.forEach(u => { u.gira = (rnd() - 0.5) * 0.7; u.fase = rnd() * Math.PI * 2; u.inclina = (rnd() - 0.5) * 0.12; });
    const vivas = ['#e0418f', '#2f6fd6', '#1fa65a', '#ff8a1d', '#f2c21f', '#7a4fe0']; // "colorido": cada unidade de uma cor
    normais.forEach((u, i) => { cor.set(u.it.multi ? vivas[i % vivas.length] : u.it.cor || '#8e8e93'); this.tags.setColorAt(i, cor); });
    metais.forEach((u, i) => { cor.set(u.it.cor || '#d4a53c'); this.tagsMetal.setColorAt(i, cor); });
    this.posicionar(0);
    this.torre.add(this.tags, this.tagsMetal, this.aneis);
  }
  /** Coloca anéis e plaquinhas (o balanço vem do giro da torre). */
  posicionar(balanco) {
    const m = new THREE.Object3D(), q = new THREE.Quaternion(), eixo = new THREE.Vector3();
    let iN = 0, iM = 0;
    this.unidades.forEach((u, iu) => {
      const a = u.b / BRACOS * Math.PI * 2, rr = INICIO + u.k * PASSO + (u.camada ? 0.22 : 0), c = Math.cos(a), s = Math.sin(a);
      const x = c * rr, z = -s * rr, off = u.camada ? 0.38 : 0;
      // anel: pendurado na ranhura, no plano perpendicular ao braço
      m.position.set(x + s * off * 0.6, u.y - 0.55, z + c * off * 0.6); m.rotation.set(0, a + Math.PI / 2, 0); m.updateMatrix(); this.aneis.setMatrixAt(iu, m.matrix);
      // plaquinha: embaixo do anel, virada para fora, balançando um pouco
      const w = u.grande ? 1.8 : 1.45, h = u.grande ? 2.6 : 2.05, bal = balanco * Math.sin(u.fase) * 0.9 + u.inclina;
      m.position.set(x + s * off, u.y - 1.25 - h / 2, z + c * off);
      m.rotation.set(0, a + Math.PI / 2 + u.gira, 0); m.quaternion.setFromEuler(m.rotation);
      eixo.set(c, 0, -s); q.setFromAxisAngle(eixo, bal); m.quaternion.premultiply(q);
      m.scale.set(w, h, 1); m.updateMatrix();
      if (u.it.metal) this.tagsMetal.setMatrixAt(iM++, m.matrix); else this.tags.setMatrixAt(iN++, m.matrix);
      m.scale.set(1, 1, 1);
    });
    this.tags.instanceMatrix.needsUpdate = true; this.tagsMetal.instanceMatrix.needsUpdate = true; this.aneis.instanceMatrix.needsUpdate = true;
  }
  gestos(el) {
    const p = new Map(); let inicio = null, dist0 = 0, zoom0 = 1, moveu = 0, ultX = 0, ultT = 0;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => { try { el.setPointerCapture(e.pointerId); } catch (err) { } p.set(e.pointerId, [e.clientX, e.clientY]); if (p.size === 1) { inicio = [e.clientX, e.clientY]; ultX = e.clientX; ultT = performance.now(); moveu = 0; this.vel = 0; } else if (p.size === 2) { const [a, b] = [...p.values()]; dist0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = this.zoom; } this.mexeu = performance.now(); this.tocar(); });
    el.addEventListener('pointermove', e => {
      if (!p.has(e.pointerId)) return; p.set(e.pointerId, [e.clientX, e.clientY]);
      if (p.size === 2) { const [a, b] = [...p.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dist0) this.zoom = Math.max(0.55, Math.min(1.5, zoom0 * dist0 / d)); moveu = 99; this.tocar(); return; }
      const dx = e.clientX - ultX, agora = performance.now(); moveu += Math.abs(dx);
      this.ang += dx * 0.012; this.vel = dx * 0.012 / Math.max(8, agora - ultT) * 16; ultX = e.clientX; ultT = agora; this.mexeu = agora; this.tocar();
    });
    const fim = e => { if (!p.has(e.pointerId)) return; p.delete(e.pointerId); if (p.size === 0 && moveu < 6 && inicio) this.tocarEm(e); if (p.size < 2) dist0 = 0; };
    el.addEventListener('pointerup', fim); el.addEventListener('pointercancel', fim);
    el.addEventListener('wheel', e => { e.preventDefault(); this.zoom = Math.max(0.55, Math.min(1.5, this.zoom * Math.exp(e.deltaY * 0.0012))); this.tocar(); }, { passive: false });
  }
  tocarEm(e) {
    const r = this.renderer.domElement.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.cam);
    const hit = ray.intersectObjects([this.tags, this.tagsMetal], false)[0];
    if (!hit || hit.instanceId === undefined) { this.aoTocar(null); return; }
    const u = (hit.object === this.tags ? this.porTag : this.porMetal)[hit.instanceId];
    this.aoTocar(u ? { nome: u.it.nome, preco: u.preco, restante: u.it.restante, vendidos: u.it.vendidos, licenca: u.it.licenca } : null, e.clientX - r.left, e.clientY - r.top);
  }
  anexar(host) {
    if (!host) return; this.host = host; host.appendChild(this.renderer.domElement);
    if (this.obs) this.obs.disconnect(); if (window.ResizeObserver) { this.obs = new ResizeObserver(() => { this.medir(); this.tocar(); }); this.obs.observe(host); }
    this.medir(); this.tocar();
  }
  medir() {
    const h = this.host; if (!h) return; const w = h.clientWidth, a = h.clientHeight; if (!w || !a) return;
    this.renderer.setSize(w, a, false); this.cam.aspect = w / a; this.cam.updateProjectionMatrix();
    const tg = Math.tan(this.cam.fov * Math.PI / 360); this.dist = Math.max(57 / (2 * tg), 31 / (2 * tg * this.cam.aspect));
  }
  atualizar(dados) { if (dados.nome !== this.nome) { this.nome = dados.nome; const mat = this.placa.material[4]; if (mat.map) mat.map.dispose(); mat.map = texturaPlaca(dados.nome); mat.needsUpdate = true; } this.chaveiros(dados); this.tocar(); }
  tocar() { if (!this.raf && !this.solto) this.raf = requestAnimationFrame(() => this.quadro()); }
  quadro() {
    this.raf = 0; const el = this.renderer.domElement; if (this.solto || !el.isConnected || document.hidden) return;
    const agora = performance.now(), parado = agora - (this.mexeu || 0) > 2500;
    if (Math.abs(this.vel) > 0.0004) { this.ang += this.vel; this.vel *= 0.94; } else if (parado) this.ang += 0.0025;
    const alvoBal = Math.max(-0.5, Math.min(0.5, -this.vel * 8)); this.balanco += (alvoBal - this.balanco) * 0.12;
    if (Math.abs(this.balanco) > 0.002 || this.balancoAntes !== undefined && Math.abs(this.balancoAntes) > 0.002) this.posicionar(this.balanco + Math.sin(agora / 260) * this.balanco * 0.3);
    this.balancoAntes = this.balanco;
    this.torre.rotation.y = this.ang;
    const d = (this.dist || 90) * this.zoom; this.cam.position.set(0, 23 + d * 0.17, d); this.cam.lookAt(0, 22, 0); // enquadra da base até a placa do PIX
    this.renderer.render(this.cena, this.cam);
    this.raf = requestAnimationFrame(() => this.quadro());
  }
  get angulo() { return this.ang; }
  soltar() { this.solto = true; cancelAnimationFrame(this.raf); if (this.obs) this.obs.disconnect(); document.removeEventListener('visibilitychange', this.visivel); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}

window.Expositor3D = { montar: (host, dados, aoTocar) => { const v = new Vitrine(host, dados, aoTocar); v.nome = dados.nome; return v; } };
window.dispatchEvent(new Event('expositor3d-pronto'));
