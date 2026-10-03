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
      bico: new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: 0.3, metalness: 1, emissive: '#ff6a00', emissiveIntensity: 0.25 })
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
  /** Uma impressora, no formato real (fase 7, pesquisa: as duas são "bed slingers" de pórtico — a mesa anda em Y, o pórtico
   *  de duas colunas sobe em Z e o cabeçote corre em X). A1 Combo: corpo claro, mesa com PEI texturizado, cabeçote branco
   *  com o cabo em arco e a AMS Lite ao lado (poste + 4 bobinas inclinadas + tubos de PTFE). Kobra X: corpo grafite, as
   *  4 bobinas num suporte em cima (o sistema ACE Gen 2 fica no próprio cabeçote) e a câmera no topo. Medidas ≈ 1 unidade = 1 cm. */
  impressora(tipo, x) {
    const g = new THREE.Group(), a1 = tipo === 'a1'; g.position.set(x, 0, 0);
    const corpo = new THREE.MeshPhysicalMaterial({ color: a1 ? '#e7e8ea' : '#2b2d31', roughness: a1 ? 0.42 : 0.5, metalness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.35 });
    const escuro = new THREE.MeshPhysicalMaterial({ color: '#1a1b1e', roughness: 0.4, metalness: 0.2, clearcoat: 0.4 });
    const pei = new THREE.MeshStandardMaterial({ color: '#7d6a4c', roughness: 0.65, metalness: 0.35 }), alu = this.mat.alu;
    const tubo = new THREE.MeshStandardMaterial({ color: '#f2f2f0', roughness: 0.35, transparent: true, opacity: 0.85 });
    const add = (geo, mat, px, py, pz, pai = g) => { const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz); pai.add(o); return o; };
    const W = 30, D = 34, HB = 5.5, HT = 42;
    // base com cantos chanfrados (duas caixas sobrepostas) + tela de toque na frente
    add(new THREE.BoxGeometry(W, HB, D - 2), corpo, 0, HB / 2, 0); add(new THREE.BoxGeometry(W - 2, HB, D), corpo, 0, HB / 2, 0);
    const tela = add(new THREE.BoxGeometry(7, 4.4, 0.6), escuro, a1 ? -9 : 9, HB + 1.2, D / 2 + 0.4); tela.rotation.x = -0.35;
    add(new THREE.PlaneGeometry(6.2, 3.6), new THREE.MeshBasicMaterial({ color: a1 ? '#3a8dde' : '#2fd0c4' }), a1 ? -9 : 9, HB + 1.25, D / 2 + 0.72).rotation.x = -0.35;
    [-6, 6].forEach(px => add(new THREE.BoxGeometry(1.2, 0.8, D - 4), alu, px, HB + 0.4, 0)); // trilhos do Y
    // mesa (anda em Y): base metálica + placa de PEI texturizado
    const mesa = new THREE.Group(); mesa.position.set(0, HB + 1.4, 0); g.add(mesa);
    add(new THREE.BoxGeometry(26, 0.8, 26), escuro, 0, 0, 0, mesa); add(new THREE.BoxGeometry(25.6, 0.25, 25.6), pei, 0, 0.55, 0, mesa);
    // as duas colunas (Z) e a travessa de cima
    [-1, 1].forEach(s => { add(new THREE.BoxGeometry(3.2, HT, 5), corpo, s * (W / 2 - 1.6), HB + HT / 2, -D / 2 + 6); add(new THREE.BoxGeometry(0.6, HT - 6, 1.2), escuro, s * (W / 2 - 1.6) - s * 1.6, HB + HT / 2, -D / 2 + 6); });
    add(new THREE.BoxGeometry(W, 3, 5), corpo, 0, HB + HT + 1.5, -D / 2 + 6);
    // pórtico (X): viga que sobe com a peça + cabeçote
    const port = new THREE.Group(); port.position.set(0, HB + 12, -D / 2 + 6); g.add(port);
    add(new THREE.BoxGeometry(W - 6, 2.4, 2.6), escuro, 0, 0, 1.6, port);
    const cab = new THREE.Group(); cab.position.set(0, 0, 4.8); port.add(cab);
    add(new THREE.BoxGeometry(5.6, 6.6, 5.2), a1 ? corpo : escuro, 0, -0.6, 0, cab);
    add(new THREE.BoxGeometry(4.8, 4.2, 0.4), a1 ? escuro : new THREE.MeshStandardMaterial({ color: '#2f9bff', roughness: 0.4, emissive: '#1a6fd1', emissiveIntensity: 0.4 }), 0, 0, 2.7, cab); // tampa frontal
    add(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 16), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 1.6, 1.4, 2.95, cab).rotation.x = Math.PI / 2; // LED
    add(new THREE.ConeGeometry(0.75, 1.8, 14), this.mat.bico, 0, -4.8, 0.4, cab).rotation.x = Math.PI;
    // bobinas (4) + tubos de PTFE até o cabeçote
    const coresB = ['#1d1d20', '#f1f1ee', '#d4a53c', '#2457c5'], bob = (raio, larg) => { const s = new THREE.Group(); add(new THREE.CylinderGeometry(raio, raio, larg, 32), escuro, 0, 0, 0, s); return s; };
    const pontos = [];
    if (a1) { // AMS Lite: poste ao lado, cubo com 4 braços e as bobinas inclinadas em X
      const ams = new THREE.Group(); ams.position.set(W / 2 + 11, 0, -4); g.add(ams);
      add(new THREE.CylinderGeometry(4.5, 5.5, 1.4, 32), corpo, 0, 0.7, 0, ams); add(new THREE.CylinderGeometry(0.9, 0.9, 26, 16), corpo, 0, 13.5, 0, ams);
      add(new THREE.CylinderGeometry(2.6, 2.6, 2.2, 24), escuro, 0, 27, 0, ams);
      [0, 1, 2, 3].forEach(k => { const a = k * Math.PI / 2 + Math.PI / 4, s = new THREE.Group(); s.position.set(Math.cos(a) * 5.8, 27 + (k % 2 ? 2.5 : -2.5), Math.sin(a) * 5.8); s.rotation.set(0, -a, Math.PI / 2 - 0.35); ams.add(s);
        add(new THREE.CylinderGeometry(5.2, 5.2, 0.35, 32), escuro, 0, 1.4, 0, s); add(new THREE.CylinderGeometry(5.2, 5.2, 0.35, 32), escuro, 0, -1.4, 0, s);
        add(new THREE.CylinderGeometry(4.6, 4.6, 2.5, 32), new THREE.MeshStandardMaterial({ color: coresB[k], roughness: 0.5 }), 0, 0, 0, s);
        pontos.push(new THREE.Vector3(ams.position.x + Math.cos(a) * 2, 28.5, ams.position.z + Math.sin(a) * 2)); });
    } else { // Kobra X: suporte em cima da travessa com as 4 bobinas lado a lado + câmera
      add(new THREE.BoxGeometry(W - 2, 1, 7), escuro, 0, HB + HT + 3.5, -D / 2 + 6);
      coresB.forEach((c, k) => { const s = new THREE.Group(); s.position.set(-10.5 + k * 7, HB + HT + 9, -D / 2 + 6); s.rotation.z = Math.PI / 2; g.add(s);
        add(new THREE.CylinderGeometry(4.8, 4.8, 0.3, 32), escuro, 0, 1.3, 0, s); add(new THREE.CylinderGeometry(4.8, 4.8, 0.3, 32), escuro, 0, -1.3, 0, s);
        add(new THREE.CylinderGeometry(4.2, 4.2, 2.3, 32), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }), 0, 0, 0, s);
        pontos.push(new THREE.Vector3(-10.5 + k * 7, HB + HT + 4.5, -D / 2 + 9)); });
      add(new THREE.BoxGeometry(3, 2, 2), escuro, W / 2 - 3, HB + HT + 4, -D / 2 + 9); add(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16), new THREE.MeshBasicMaterial({ color: '#0a84ff' }), W / 2 - 3, HB + HT + 4, -D / 2 + 10.2).rotation.x = Math.PI / 2;
    }
    const tubos = new THREE.Group(); g.add(tubos);
    return { g, mesa, port, cab, tipo, pontos, tubos, tuboMat: tubo, alturaBase: HB + 3.5 };
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
      mq.placa.scale.set(30, 7.5, 1); mq.placa.position.set(0, 66, 0); mq.g.add(mq.placa); mq.job = job;
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
      if (!mq.tuboQ || (mq.tuboQ++ % 4 === 0)) { if (!mq.tuboQ) mq.tuboQ = 1; this.tubosDe(mq); }
    });
    this.caixas.forEach((c, i) => { const vx = ((c.userData.base + t * 3) + 75) % 150 - 75; c.position.x = vx; c.rotation.y = Math.sin(t + i) * 0.05; });
    (this.listras || []).forEach((l, i) => { l.position.x = ((-72 + i * 8.5 + t * 3) + 75) % 153 - 76.5; });
    const parado = performance.now() - (this.mexeu || 0) > 2500; if (parado) this.ang += (Math.sin(t * 0.15) * 0.25 - this.ang) * 0.01;
    this.mundo.rotation.y = this.ang;
    const d = this.dist || 200; this.cam.position.set(0, 40 + d * 0.18, d * 0.9); this.cam.lookAt(0, 28, 6);
    this.renderer.render(this.cena, this.cam);
    this.raf = requestAnimationFrame(() => this.quadro());
  }
  soltar() { this.solto = true; cancelAnimationFrame(this.raf); if (this.obs) this.obs.disconnect(); document.removeEventListener('visibilitychange', this.visivel); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}
window.Fabrica3D = { montar: (host, dados, aoTocar) => new Fabrica(host, dados, aoTocar) };
