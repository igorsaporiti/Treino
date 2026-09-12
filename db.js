/* Persistência local. Guarda o estado inteiro como um documento único
   no IndexedDB (cabe anos de treino) e mantém uma cópia no localStorage
   como rede de segurança. Nada sai do aparelho. */

const DB_NOME = 'treino-db';
const STORE = 'estado';
const CHAVE = 'principal';
const BACKUP_LS = 'treino-backup';

let _db = null;

function abrirDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    if (!('indexedDB' in window)) return resolve(null);
    const req = indexedDB.open(DB_NOME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => resolve(null);
  });
}

async function lerBruto() {
  const db = await abrirDB();
  if (db) {
    const valor = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(CHAVE);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    if (valor) return valor;
  }
  try {
    const ls = localStorage.getItem(BACKUP_LS);
    return ls ? JSON.parse(ls) : null;
  } catch (e) { return null; }
}

async function gravarBruto(estado) {
  const db = await abrirDB();
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(estado, CHAVE);
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      } catch (e) { resolve(); }
    });
  }
  try { localStorage.setItem(BACKUP_LS, JSON.stringify(estado)); } catch (e) { /* cota cheia */ }
}

/* ---------- estado ---------- */

function estadoInicial() {
  const hoje = new Date();
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7)); // segunda desta semana
  return {
    versao: 1,
    seedVersao: SEED_VERSAO,
    config: {
      incremento: 2.5,
      academias: [{ id: 'cimerian', nome: 'Cimerian' }],
      academiaId: 'cimerian',
      registrarPeso: true,
      blocoInicio: iso(seg),
      alvos: Object.fromEntries(Object.entries(GRUPOS).map(([k, v]) => [k, v.alvo]))
    },
    exercicios: JSON.parse(JSON.stringify(EXERCICIOS)),
    fichas: JSON.parse(JSON.stringify(FICHAS)),
    sessoes: [],
    sessaoAtiva: null,
    substitutos: {},
    reintroducao: JSON.parse(JSON.stringify(REINTRODUCAO))
  };
}

function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

let estado = null;

/* Resultado da última carga, para o app avisar o que mudou. */
let migracao = null;

async function carregarEstado() {
  const salvo = await lerBruto();
  if (salvo && salvo.versao) {
    estado = salvo;
    const base = estadoInicial();
    estado.config = Object.assign({}, base.config, estado.config);
    if (!estado.reintroducao) estado.reintroducao = base.reintroducao;
    if (!estado.substitutos) estado.substitutos = {};

    migrarAcademias(estado);

    /* sessão em andamento no formato antigo (sem itens próprios) não é recuperável */
    if (estado.sessaoAtiva && !Array.isArray(estado.sessaoAtiva.itens)) {
      estado.sessaoAtiva = null;
    }

    /* Ficha nova publicada: substitui exercícios, fichas e alvos,
       preservando todo o histórico de treinos já registrados. */
    if (estado.seedVersao !== SEED_VERSAO) {
      const antes = estado.seedVersao || 1;
      const statusReintro = {};
      (estado.reintroducao || []).forEach(r => { statusReintro[r.nome] = r.status; });

      const meus = (estado.exercicios || []).filter(e => e.custom);
      estado.exercicios = JSON.parse(JSON.stringify(EXERCICIOS)).concat(meus);
      estado.fichas = JSON.parse(JSON.stringify(FICHAS));
      estado.config.alvos = Object.fromEntries(Object.entries(GRUPOS).map(([k, v]) => [k, v.alvo]));
      estado.reintroducao = JSON.parse(JSON.stringify(REINTRODUCAO))
        .map(r => (statusReintro[r.nome] ? { ...r, status: statusReintro[r.nome] } : r));

      const tinhaSessaoAtiva = !!estado.sessaoAtiva;
      estado.sessaoAtiva = null; // os índices da ficha antiga não valem mais
      estado.seedVersao = SEED_VERSAO;
      migracao = { de: antes, para: SEED_VERSAO, sessoes: estado.sessoes.length, descartouSessaoAtiva: tinhaSessaoAtiva };
      await gravarBruto(estado);
    }
  } else {
    estado = estadoInicial();
    await salvar();
  }
  return estado;
}

/* Academias passaram a ser objetos {id, nome} com histórico próprio.
   Converte o formato antigo (lista de nomes) sem perder nenhuma sessão. */
function slugAcademia(nome) {
  const base = String(nome || 'academia').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return base || 'academia';
}

function migrarAcademias(st) {
  const c = st.config;
  if (!Array.isArray(c.academias)) c.academias = [];

  if (c.academias.length && typeof c.academias[0] === 'string') {
    c.academias = c.academias.map(nome => ({ id: slugAcademia(nome), nome }));
  }
  if (!c.academias.length) c.academias = [{ id: 'cimerian', nome: 'Cimerian' }];

  /* academiaPadrao guardava o nome; agora guardamos o id */
  if (!c.academiaId) {
    const porNome = c.academias.find(a => a.nome === c.academiaPadrao);
    c.academiaId = porNome ? porNome.id : c.academias[0].id;
  }
  delete c.academiaPadrao;

  const idDe = (nome) => {
    const achou = c.academias.find(a => a.nome === nome);
    if (achou) return achou.id;
    const nova = { id: slugAcademia(nome), nome };
    if (c.academias.some(a => a.id === nova.id)) nova.id += '-' + Math.random().toString(36).slice(2, 5);
    c.academias.push(nova);
    return nova.id;
  };

  (st.sessoes || []).forEach(s => {
    if (!s.academiaId) s.academiaId = s.academia ? idDe(s.academia) : c.academiaId;
  });
  if (st.sessaoAtiva && !st.sessaoAtiva.academiaId) {
    st.sessaoAtiva.academiaId = st.sessaoAtiva.academia ? idDe(st.sessaoAtiva.academia) : c.academiaId;
  }
}

let _timer = null;
function salvar() {
  clearTimeout(_timer);
  return new Promise((resolve) => {
    _timer = setTimeout(async () => { await gravarBruto(estado); resolve(); }, 120);
  });
}

async function salvarJa() {
  clearTimeout(_timer);
  await gravarBruto(estado);
}

/* ---------- backup ---------- */

function exportarJSON() {
  const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'treino-backup-' + iso(new Date()) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function importarJSON(texto) {
  const dados = JSON.parse(texto);
  if (!dados || !dados.versao || !Array.isArray(dados.sessoes)) {
    throw new Error('Arquivo não parece um backup deste app.');
  }
  estado = dados;
  const base = estadoInicial();
  estado.config = Object.assign({}, base.config, estado.config);
  await salvarJa();
}
