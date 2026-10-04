// ============================================================================
// SECADORA 3D — a "Dry Box 48" da Primos 3D (46 × 50 × 100 cm, 4 prateleiras × 12 bobinas = 48), desenhada peça por
// peça: corpo preto com cantoneiras de alumínio, porta de vidro com dobradiça (abre sozinha ao entrar), visor vermelho
// de temperatura/umidade no topo, luz quente por dentro. Cada bobina é um filamento do ESTOQUE, na cor dele; o
// "volume" de filamento enrolado acompanha os kg que restam. Arrastar gira (pouco: é um armário), pinça/roda aproxima,
// tocar numa bobina diz qual é. Um só WebGL: o app "anexa" o mesmo canvas quando redesenha o painel do Estoque.
// Uso: const s = Secadora3D.montar(host, dados, aoTocar); s.anexar(outroHost); s.atualizar(dados); s.porta(true|false); s.soltar();
// dados = { bobinas: [{ nome, material, cor: '#hex', kg, capacidade, brilho: 'seda'|'metal'|'' }], temp: '45°C', umid: '18%' }
// ============================================================================
import * as THREE from './vendor/three.module.min.js';

const L = 46, A = 100, P = 50, ESP = 1.6;            // largura, altura, profundidade (cm) e espessura das paredes
const PRAT = [8.5, 29.5, 50.5, 71.5];               // altura de cada prateleira (de baixo para cima)
const POR_FILA = 6, FILAS = 2, R_FLANGE = 9.6, LARG_BOB = 6.4, R_MIOLO = 4.6;
const TOPO_PAINEL = 10;                              // altura do painel de controle em cima

function ambiente(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), cena = new THREE.Scene();
  const geo = new THREE.SphereGeometry(80, 32, 16), cores = [], p = geo.attributes.position, cima = new THREE.Color('#ffffff'), baixo = new THREE.Color('#5a5650');
  for (let i = 0; i < p.count; i++) { const c = baixo.clone().lerp(cima, Math.min(1, (p.getY(i) / 80 + 1) / 1.5)); cores.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  cena.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const painel = (w, h, x, y, z, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); cena.add(m); };
  painel(60, 14, 0, 60, 30, 4); painel(10, 70, -60, 10, 30, 2.6); painel(8, 60, 58, 0, 34, 2.2); painel(40, 6, 0, 20, -70, 1.2);
  const tex = pm.fromScene(cena, 0.03).texture; pm.dispose(); return tex;
}
/** Visor do topo: display de LED vermelho (temperatura · umidade) + botões, como o da foto. */
function texturaVisor(temp, umid) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 220; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 220); g.addColorStop(0, '#1d1e22'); g.addColorStop(1, '#0d0d0f'); x.fillStyle = g; x.fillRect(0, 0, 1024, 220);
  x.fillStyle = '#050505'; x.fillRect(150, 50, 380, 120); x.strokeStyle = '#2a2a2e'; x.lineWidth = 4; x.strokeRect(150, 50, 380, 120);
  x.shadowColor = '#ff2a1a'; x.shadowBlur = 18; x.fillStyle = '#ff3b2a'; x.font = '700 78px ui-monospace, Consolas, monospace';
  x.fillText(String(temp || '45°C'), 170, 138); x.font = '700 50px ui-monospace, Consolas, monospace'; x.fillText(String(umid || '18%'), 405, 138);
  x.shadowBlur = 0; x.fillStyle = '#7b7b80'; x.font = '600 22px -apple-system, "Segoe UI", sans-serif'; x.fillText('TEMP', 172, 74); x.fillText('UMID', 408, 74);
  [600, 690, 780, 870].forEach((bx, i) => { x.fillStyle = i === 0 ? '#2e2f33' : '#26272b'; x.beginPath(); x.arc(bx, 110, 30, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#3c3d42'; x.lineWidth = 3; x.stroke();
    x.fillStyle = i === 0 ? '#30d158' : '#9a9aa0'; x.font = '600 26px -apple-system, "Segoe UI", sans-serif'; x.textAlign = 'center'; x.fillText(['⏻', '−', '+', 'M'][i], bx, 120); x.textAlign = 'left'; });
  x.fillStyle = '#5c5c62'; x.font = '700 24px -apple-system, "Segoe UI", sans-serif'; x.fillText('DRY BOX 48 · PRIMOS 3D', 40, 205);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/** Rótulo de papel da bobina (o "selo" no flange): fica claro no tema escuro. */
function geometriaFlange() {
  const s = new THREE.Shape(); s.absarc(0, 0, R_FLANGE, 0, Math.PI * 2, false);
  const furo = new THREE.Path(); furo.absarc(0, 0, 2.6, 0, Math.PI * 2, true); s.holes.push(furo);
  // recortes "janela" do flange, como os carretéis de plástico
  for (let i = 0; i < 4; i++) { const a0 = i * Math.PI / 2 + 0.22, a1 = a0 + Math.PI / 2 - 0.44, h = new THREE.Path(); h.absarc(0, 0, R_FLANGE - 1.3, a0, a1, false); h.absarc(0, 0, R_MIOLO + 0.6, a1, a0, true); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 40 });
  g.translate(0, 0, -0.225); g.rotateY(Math.PI / 2); return g; // eixo da bobina = X (a bobina fica "de lado", como na foto)
}

class Secadora {
  constructor(host, dados, aoTocar) {
    this.aoTocar = aoTocar || (() => { });
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.08; r.setClearColor(0x000000, 0);
    r.domElement.className = 'cc-gl';
    const cena = this.cena = new THREE.Scene(); cena.environment = ambiente(r);
    this.cam = new THREE.PerspectiveCamera(28, 1, 1, 900);
    cena.add(new THREE.HemisphereLight('#ffffff', '#4a4640', 0.5));
    const chave = new THREE.DirectionalLight('#ffffff', 1.35); chave.position.set(70, 120, 110); cena.add(chave);
    const recorte = new THREE.DirectionalLight('#cfe0ff', 0.55); recorte.position.set(-90, 50, -60); cena.add(recorte);
    // luz quente de dentro (a resistência/LED da secadora) — dá vida às cores
    this.luzDentro = new THREE.PointLight('#ffd9a8', 0, 140, 1.6); this.luzDentro.position.set(0, A - 18, P / 2 - 6); cena.add(this.luzDentro);
    // sombra macia no chão
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const ctx = cv.getContext('2d'); const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(110, 90), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.05; cena.add(sombra);
    this.caixa = new THREE.Group(); cena.add(this.caixa);
    this.estrutura(dados);
    this.geoFlange = geometriaFlange();
    this.matFlange = new THREE.MeshPhysicalMaterial({ color: '#1b1c1f', roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3, transparent: true, opacity: 0.92 });
    this.matFio = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.0, envMapIntensity: 0.9 });
    this.matFioBrilho = new THREE.MeshPhysicalMaterial({ roughness: 0.22, metalness: 0.55, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1.3 });
    this.matMiolo = new THREE.MeshStandardMaterial({ color: '#c9b79a', roughness: 0.8 }); // tubo de papelão
    this.ang = -0.42; this.vel = 0; this.zoom = 1; this.abertura = 0; this.alvoPorta = 1; this.entrada = performance.now();
    this.bobinas(dados); this.gestos(r.domElement); this.anexar(host);
    this.visivel = () => { if (!document.hidden) this.tocar(); }; document.addEventListener('visibilitychange', this.visivel);
  }
  estrutura(dados) {
    const preto = new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: 0.5, metalness: 0.15, clearcoat: 0.35, clearcoatRoughness: 0.4 });
    const aluminio = this.matAlu = new THREE.MeshStandardMaterial({ color: '#c8cbd0', roughness: 0.28, metalness: 1, envMapIntensity: 1.25 });
    const interno = new THREE.MeshStandardMaterial({ color: '#1f2024', roughness: 0.75, metalness: 0.1 });
    const c = this.caixa, add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); c.add(m); return m; };
    // paredes (fundo, laterais, base, teto) — por dentro um cinza escuro fosco
    add(new THREE.BoxGeometry(L, A, ESP), interno, 0, A / 2, -P / 2 + ESP / 2);
    [-1, 1].forEach(s => add(new THREE.BoxGeometry(ESP, A, P), preto, s * (L / 2 - ESP / 2), A / 2, 0));
    add(new THREE.BoxGeometry(L, ESP * 2, P), preto, 0, ESP, 0);
    add(new THREE.BoxGeometry(L, ESP, P), preto, 0, A - ESP / 2, 0);
    // cantoneiras de alumínio (as 4 arestas verticais e o contorno da frente)
    const perfil = 2.2;
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => add(new THREE.BoxGeometry(perfil, A + 0.4, perfil), aluminio, sx * (L / 2), A / 2, sz * (P / 2)));
    [0.2, A].forEach(y => { add(new THREE.BoxGeometry(L + 0.4, perfil, perfil), aluminio, 0, y, P / 2); add(new THREE.BoxGeometry(L + 0.4, perfil, perfil), aluminio, 0, y, -P / 2); });
    // pezinhos
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => add(new THREE.CylinderGeometry(1.6, 1.9, 1.4, 16), preto, sx * (L / 2 - 3), -0.7, sz * (P / 2 - 3)));
    // prateleiras: chapa de alumínio perfurada (instanciada como grade fina) + friso na frente
    PRAT.forEach(y => {
      add(new THREE.BoxGeometry(L - ESP * 2, 0.6, P - ESP * 2), new THREE.MeshStandardMaterial({ color: '#8d9096', roughness: 0.45, metalness: 0.85, envMapIntensity: 1 }), 0, y, 0);
      add(new THREE.BoxGeometry(L - ESP * 2, 1.4, 0.5), aluminio, 0, y + 0.4, P / 2 - ESP - 0.6);
    });
    // painel de controle no topo (caixa preta com o visor na frente)
    const visor = this.matVisor = new THREE.MeshStandardMaterial({ map: texturaVisor(dados.temp, dados.umid), roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0.12, emissiveMap: null });
    const painel = new THREE.Mesh(new THREE.BoxGeometry(L, TOPO_PAINEL, P), [preto, preto, preto, preto, visor, preto]);
    painel.position.set(0, A + TOPO_PAINEL / 2, 0); c.add(painel); this.painel = painel;
    add(new THREE.BoxGeometry(L + 0.4, perfil, perfil), aluminio, 0, A + TOPO_PAINEL, P / 2);
    // fita de LED quente embaixo do teto (brilha quando a porta abre)
    this.matLed = new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0.25 });
    add(new THREE.BoxGeometry(L - 6, 0.5, 1.2), this.matLed, 0, A - ESP - 0.6, P / 2 - 5);
    // PORTA: vidro fumê com moldura de alumínio; dobradiça do lado esquerdo
    const porta = this.porta3d = new THREE.Group(); porta.position.set(-L / 2, 0, P / 2 + 0.8); c.add(porta);
    const vidro = new THREE.MeshPhysicalMaterial({ color: '#9fb4c8', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
    const pv = new THREE.Mesh(new THREE.BoxGeometry(L - 1.5, A - 2.5, 0.5), vidro); pv.position.set(L / 2, A / 2, 0); pv.renderOrder = 2; porta.add(pv);
    const moldura = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.1), aluminio); m.position.set(x, y, 0); porta.add(m); };
    moldura(1.6, A - 1, 0.8, A / 2); moldura(1.6, A - 1, L - 0.8, A / 2); moldura(L, 1.6, L / 2, 1.2); moldura(L, 1.6, L / 2, A - 1.2);
    // reflexo diagonal no vidro (uma fita clara, sutil)
    const reflexo = new THREE.Mesh(new THREE.PlaneGeometry(5, A * 1.15), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.07, depthWrite: false }));
    reflexo.position.set(L * 0.32, A / 2, 0.35); reflexo.rotation.z = 0.32; porta.add(reflexo);
    // puxador vertical (direita) e vedação
    const puxador = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 26, 16), aluminio); puxador.position.set(L - 4.2, A / 2, 2.6); porta.add(puxador);
    [A / 2 - 13, A / 2 + 13].forEach(y => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2.6), aluminio); b.position.set(L - 4.2, y, 1.3); porta.add(b); });
  }
  /** Coloca as bobinas: de cima para baixo, fila da frente primeiro. */
  bobinas(dados) {
    [this.flanges, this.fios, this.fiosBrilho, this.miolos].forEach(o => { if (o) { this.caixa.remove(o); o.dispose(); } });
    const lista = (dados.bobinas || []).slice(0, PRAT.length * POR_FILA * FILAS);
    const lugares = [];
    for (let f = 0; f < FILAS; f++) for (let p = PRAT.length - 1; p >= 0; p--) for (let i = 0; i < POR_FILA; i++) lugares.push({ p, f, i }); // fase 7: a frente de todas as prateleiras primeiro (tudo à vista)
    const usados = lista.map((b, k) => ({ b, ...lugares[k] }));
    const brilho = usados.filter(u => u.b.brilho), fosco = usados.filter(u => !u.b.brilho);
    this.flanges = new THREE.InstancedMesh(this.geoFlange, this.matFlange, Math.max(1, usados.length * 2));
    // miolo e fio não mudam com os dados: são criados UMA vez e reaproveitados (antes vazavam a cada atualização — auditoria do Codex, achado 12)
    if (!this.geoMiolo) this.geoMiolo = new THREE.CylinderGeometry(R_MIOLO, R_MIOLO, LARG_BOB, 28, 1, true);
    this.miolos = new THREE.InstancedMesh(this.geoMiolo, this.matMiolo, Math.max(1, usados.length));
    if (!this.geoFio) {
      const g = this.geoFio = new THREE.CylinderGeometry(1, 1, LARG_BOB - 0.3, 48, 6);
      // listras finas de "fio enrolado": ondulação no raio (dá textura sem custo de textura)
      const pos = g.attributes.position; for (let v = 0; v < pos.count; v++) { const x = pos.getX(v), z = pos.getZ(v), y = pos.getY(v), rr = Math.hypot(x, z); if (rr > 0.5) { const k = 1 + Math.sin(y * 9) * 0.006; pos.setX(v, x * k); pos.setZ(v, z * k); } }
      g.computeVertexNormals();
    }
    const geoFio = this.geoFio;
    this.fios = new THREE.InstancedMesh(geoFio, this.matFio, Math.max(1, fosco.length));
    this.fiosBrilho = new THREE.InstancedMesh(geoFio, this.matFioBrilho, Math.max(1, brilho.length));
    this.flanges.count = usados.length * 2; this.miolos.count = usados.length; this.fios.count = fosco.length; this.fiosBrilho.count = brilho.length;
    this.usados = usados; this.porFio = fosco; this.porBrilho = brilho;
    const m = new THREE.Object3D(), cor = new THREE.Color(), passoX = (L - ESP * 2 - 2) / POR_FILA, iF = { n: 0 }, iB = { n: 0 };
    usados.forEach((u, k) => {
      const x = -L / 2 + ESP + 1 + passoX * (u.i + 0.5), z = u.f === 0 ? P / 2 - 13 : -P / 2 + 13, y = PRAT[u.p] + 0.3 + R_FLANGE;
      u.pos = new THREE.Vector3(x, y, z);
      [-1, 1].forEach((s, j) => { m.position.set(x + s * (LARG_BOB / 2), y, z); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.updateMatrix(); this.flanges.setMatrixAt(k * 2 + j, m.matrix); });
      m.position.set(x, y, z); m.rotation.set(0, 0, Math.PI / 2); m.updateMatrix(); this.miolos.setMatrixAt(k, m.matrix);
      const cheio = Math.max(0.04, Math.min(1, (u.b.kg || 0) / (u.b.capacidade || 1)));
      const raio = R_MIOLO + 0.2 + (R_FLANGE - 0.7 - R_MIOLO) * Math.sqrt(cheio); // volume ∝ área: raio cresce com a raiz
      m.scale.set(raio, 1, raio); m.updateMatrix();
      const alvo = u.b.brilho ? this.fiosBrilho : this.fios, idx = u.b.brilho ? iB.n++ : iF.n++; u.k = k; u.alvo = alvo; u.idx = idx; u.raio = raio;
      alvo.setMatrixAt(idx, m.matrix); alvo.setColorAt(idx, cor.set(u.b.cor || '#8e8e93')); m.scale.set(1, 1, 1);
    });
    [this.flanges, this.miolos, this.fios, this.fiosBrilho].forEach(o => { o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true; });
    this.caixa.add(this.miolos, this.fios, this.fiosBrilho, this.flanges);
  }
  gestos(el) {
    const p = new Map(); let inicio = null, dist0 = 0, zoom0 = 1, moveu = 0, ultX = 0, ultT = 0;
    el.style.touchAction = 'pan-y'; // no celular a página continua rolando na vertical; arrastar na horizontal gira
    el.addEventListener('pointerdown', e => { p.set(e.pointerId, [e.clientX, e.clientY]); if (p.size === 1) { inicio = [e.clientX, e.clientY]; ultX = e.clientX; ultT = performance.now(); moveu = 0; this.vel = 0; } else if (p.size === 2) { const [a, b] = [...p.values()]; dist0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = this.zoom; } this.mexeu = performance.now(); this.tocar(); });
    el.addEventListener('pointermove', e => {
      if (!p.has(e.pointerId)) return; p.set(e.pointerId, [e.clientX, e.clientY]);
      if (p.size === 2) { const [a, b] = [...p.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dist0) this.zoom = Math.max(0.5, Math.min(1.4, zoom0 * dist0 / d)); moveu = 99; this.tocar(); return; }
      const dx = e.clientX - ultX, agora = performance.now(); moveu += Math.abs(dx);
      this.ang = Math.max(-1.1, Math.min(1.1, this.ang + dx * 0.008)); this.vel = dx * 0.008 / Math.max(8, agora - ultT) * 16; ultX = e.clientX; ultT = agora; this.mexeu = agora; this.tocar();
    });
    const fim = e => { if (!p.has(e.pointerId)) return; p.delete(e.pointerId); if (p.size === 0 && moveu < 6 && inicio) this.tocarEm(e); if (p.size < 2) dist0 = 0; };
    el.addEventListener('pointerup', fim); el.addEventListener('pointercancel', fim); el.addEventListener('pointerleave', fim);
    el.addEventListener('wheel', e => { if (!e.ctrlKey && Math.abs(e.deltaY) < 40) return; e.preventDefault(); this.zoom = Math.max(0.5, Math.min(1.4, this.zoom * Math.exp(e.deltaY * 0.0012))); this.tocar(); }, { passive: false });
  }
  tocarEm(e) {
    const r = this.renderer.domElement.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.cam);
    const hit = ray.intersectObjects([this.fios, this.fiosBrilho, this.flanges], false)[0];
    if (!hit || hit.instanceId === undefined) {
      const pt = ray.intersectObject(this.porta3d, true)[0]; if (pt) { this.porta(this.alvoPorta < 0.5); return; } // tocar no vidro abre/fecha
      this.escolher(null); this.aoTocar(null); return;
    }
    const u = hit.object === this.fios ? this.porFio[hit.instanceId] : hit.object === this.fiosBrilho ? this.porBrilho[hit.instanceId] : this.usados[Math.floor(hit.instanceId / 2)];
    if (u) { if (this.sel === u) { this.escolher(null); this.aoTocar(null); return; } this.escolher(u); this.aoTocar(u.b, e.clientX - r.left, e.clientY - r.top, this.usados.indexOf(u)); }
  }
  /** fase 7: a bobina escolhida DESLIZA para fora e sobe um pouco (como tirar da prateleira); as outras voltam ao lugar. */
  posicionar(u, s) {
    const m = new THREE.Object3D(), x = u.pos.x, y = u.pos.y + s * 3.2, z = u.pos.z + s * 14, giro = s * 0.5;
    [-1, 1].forEach((d, j) => { m.position.set(x + d * (LARG_BOB / 2), y, z); m.rotation.set(giro, 0, 0); m.scale.set(1, 1, 1); m.updateMatrix(); this.flanges.setMatrixAt(u.k * 2 + j, m.matrix); });
    m.position.set(x, y, z); m.rotation.set(giro, 0, Math.PI / 2); m.scale.set(1, 1, 1); m.updateMatrix(); this.miolos.setMatrixAt(u.k, m.matrix);
    m.scale.set(u.raio, 1, u.raio); m.updateMatrix(); u.alvo.setMatrixAt(u.idx, m.matrix);
    [this.flanges, this.miolos, u.alvo].forEach(o => { o.instanceMatrix.needsUpdate = true; });
  }
  escolher(u) { if (this.sel && this.sel !== u) { this.saindo = this.sel; this.saindoT = 1; } this.sel = u || null; this.selT = 0; this.mexeu = performance.now(); if (u) this.alvoPorta = 1; this.tocar(); }
  /** A rolagem da página gira a secadora (estilo Apple): v em radianos. */
  rolar(v) { this.ang = Math.max(-1.1, Math.min(1.1, v)); this.vel = 0; this.mexeu = performance.now(); this.tocar(); }
  porta(aberta) { this.alvoPorta = aberta ? 1 : 0; this.mexeu = performance.now(); this.tocar(); }
  anexar(host) {
    if (!host) return; this.host = host; host.appendChild(this.renderer.domElement);
    if (this.obs) this.obs.disconnect(); if (window.ResizeObserver) { this.obs = new ResizeObserver(() => { this.medir(); this.tocar(); }); this.obs.observe(host); }
    this.medir(); this.tocar();
  }
  medir() {
    const h = this.host; if (!h) return; const w = h.clientWidth, a = h.clientHeight; if (!w || !a) return;
    this.renderer.setSize(w, a, false); this.cam.aspect = w / a; this.cam.updateProjectionMatrix();
    const tg = Math.tan(this.cam.fov * Math.PI / 360); this.dist = Math.max(108 / (2 * tg), 80 / (2 * tg * this.cam.aspect)); // fase 8: enquadramento mais justo (o Rafael queria ver melhor as bobinas)
  }
  atualizar(dados) {
    if (dados.temp !== this.temp || dados.umid !== this.umid) { this.temp = dados.temp; this.umid = dados.umid; if (this.matVisor.map) this.matVisor.map.dispose(); this.matVisor.map = texturaVisor(dados.temp, dados.umid); this.matVisor.needsUpdate = true; }
    this.sel = null; this.saindo = null; this.bobinas(dados); this.tocar();
  }
  tocar() { if (!this.raf && !this.solto) this.raf = requestAnimationFrame(() => this.quadro()); }
  quadro() {
    this.raf = 0; const el = this.renderer.domElement; if (this.solto || !el.isConnected || document.hidden) return;
    const agora = performance.now(), parado = agora - (this.mexeu || 0) > 3000, desde = agora - this.entrada;
    if (Math.abs(this.vel) > 0.0004) { this.ang = Math.max(-1.1, Math.min(1.1, this.ang + this.vel)); this.vel *= 0.92; }
    else if (parado) this.ang += ((-0.42 + Math.sin(agora / 5200) * 0.22) - this.ang) * 0.02; // volta devagar (sem pulo depois da rolagem) // "respira" devagar para mostrar o volume
    // porta: espera a câmera chegar e abre com mola suave (e a luz de dentro acende junto)
    const alvo = desde < 700 ? 0 : this.alvoPorta; this.abertura += (alvo - this.abertura) * 0.06;
    this.porta3d.rotation.y = -this.abertura * 1.95;
    this.luzDentro.intensity = 900 * this.abertura; this.matLed.opacity = 0.25 + 0.75 * this.abertura;
    // bobina tocada "acende" por 1,2 s (o flange fica claro)
    this.caixa.rotation.y = this.ang;
    if (this.sel) { this.selT = Math.min(1, (this.selT || 0) + 0.06); const s = 1 - Math.pow(1 - this.selT, 3); this.posicionar(this.sel, s); this.ang += (-0.12 - this.ang) * 0.05; } // a escolhida sai; a secadora vira de frente
    if (this.saindo) { this.saindoT -= 0.08; if (this.saindoT <= 0) { this.posicionar(this.saindo, 0); this.saindo = null; } else this.posicionar(this.saindo, this.saindoT * this.saindoT); }
    const chegada = Math.min(1, desde / 1400), ease = 1 - Math.pow(1 - chegada, 3);
    const d = (this.dist || 260) * this.zoom * (1.35 - 0.35 * ease);
    const foco = this.sel ? Math.min(1, this.selT || 0) : 0, alvoY = this.sel ? this.sel.pos.y : (A + TOPO_PAINEL) / 2; // aproxima da bobina escolhida
    this.olhar = this.olhar === undefined ? (A + TOPO_PAINEL) / 2 : this.olhar + (alvoY - this.olhar) * 0.08; this.aprox = (this.aprox || 0) + (foco - (this.aprox || 0)) * 0.08;
    this.cam.position.set(0, 58 + d * 0.16 - this.aprox * 20, d * (1 - this.aprox * 0.32)); this.cam.lookAt(0, this.olhar, 0);
    this.renderer.render(this.cena, this.cam);
    const mexendo = Math.abs(this.vel) > 0.0004 || Math.abs(alvo - this.abertura) > 0.002 || chegada < 1 || !!this.saindo || (this.sel && this.selT < 1);
    this.raf = requestAnimationFrame(() => this.quadro()); if (!mexendo && !parado) return; // segue animando devagar quando parado
  }
  soltar() { this.solto = true; cancelAnimationFrame(this.raf); if (this.obs) this.obs.disconnect(); document.removeEventListener('visibilitychange', this.visivel); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}

// fase 7: escolher por fora (lista do app): s.escolherPor(i) — i = índice da bobina nos dados
Secadora.prototype.escolherPor = function (i) { const u = (this.usados || [])[i]; this.escolher(u || null); return u ? u.b : null; };
window.Secadora3D = { montar: (host, dados, aoTocar) => { const s = new Secadora(host, dados, aoTocar); s.temp = dados.temp; s.umid = dados.umid; return s; } };
