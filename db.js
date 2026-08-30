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
    config: {
      incremento: 2.5,
      academiaPadrao: 'Cimerian',
      academias: ['Cimerian', 'Outra'],
      registrarPeso: true,
      blocoInicio: iso(seg),
      alvos: Object.fromEntries(Object.entries(GRUPOS).map(([k, v]) => [k, v.alvo]))
    },
    exercicios: JSON.parse(JSON.stringify(EXERCICIOS)),
    fichas: JSON.parse(JSON.stringify(FICHAS)),
    sessoes: [],
    sessaoAtiva: null,
    reintroducao: JSON.parse(JSON.stringify(REINTRODUCAO))
  };
}

function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

let estado = null;

async function carregarEstado() {
  const salvo = await lerBruto();
  if (salvo && salvo.versao) {
    estado = salvo;
    // migração leve: garante chaves novas sem apagar dados
    const base = estadoInicial();
    estado.config = Object.assign({}, base.config, estado.config);
    if (!estado.reintroducao) estado.reintroducao = base.reintroducao;
  } else {
    estado = estadoInicial();
    await salvar();
  }
  return estado;
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
