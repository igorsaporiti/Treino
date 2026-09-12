/* ================== utilidades ================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const fmtNum = (n) => (n == null ? '—' : String(Math.round(n * 100) / 100).replace('.', ','));
const fmtKg = (n) => Math.round(n).toLocaleString('pt-BR');

function dataBR(s) { const [a, m, d] = s.split('-'); return `${d}/${m}`; }
function dataBRLonga(s) {
  const [a, m, d] = s.split('-');
  const dt = new Date(+a, +m - 1, +d);
  return `${DIAS_CURTO[dt.getDay()]}, ${d}/${m}/${a}`;
}
function diasEntre(a, b) {
  const [a1, a2, a3] = a.split('-').map(Number);
  const [b1, b2, b3] = b.split('-').map(Number);
  return Math.round((Date.UTC(b1, b2 - 1, b3) - Date.UTC(a1, a2 - 1, a3)) / 86400000);
}
function hojeISO() { return iso(new Date()); }
function diasDesde(dataISO) {
  const d = diasEntre(dataISO, hojeISO());
  if (d <= 0) return 'hoje';
  if (d === 1) return '1 dia';
  return d + ' dias';
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('ver');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('ver'), 2200);
}

function ex(id) { return estado.exercicios.find(e => e.id === id) || { id, nome: id, grupos: [] }; }

/* ---------- academias ---------- */
/* Cada academia tem histórico, sugestão de carga e recordes próprios:
   máquinas diferentes não são comparáveis entre si. */
function academias() { return estado.config.academias || []; }
function academia(id) { return academias().find(a => a.id === id) || { id, nome: '—' }; }
function nomeAcademia(id) { return academia(id).nome; }
/* academia de referência: a do treino em andamento, senão a principal */
function academiaRef() {
  return (estado.sessaoAtiva && estado.sessaoAtiva.academiaId) || estado.config.academiaId;
}
function ficha(id) { return estado.fichas.find(f => f.id === id); }
function nomeFicha(id) { const f = ficha(id); return f ? f.nome : 'Treino'; }

/* ================== sequência cíclica ================== */

function fichasOrdenadas() {
  return estado.fichas.slice().sort((a, b) => (a.ordem || 99) - (b.ordem || 99));
}

function sessoesRecentes() {
  return estado.sessoes
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s.data === b.s.data ? b.i - a.i : (a.s.data < b.s.data ? 1 : -1)))
    .map(x => x.s);
}

function ultimaSessao() { return sessoesRecentes()[0] || null; }

function proximaFicha() {
  const ord = fichasOrdenadas();
  if (!ord.length) return null;
  const ult = ultimaSessao();
  if (!ult) return ord[0];
  const idx = ord.findIndex(f => f.id === ult.fichaId);
  if (idx < 0) return ord[0];
  return ord[(idx + 1) % ord.length];
}

/* últimos treinos distintos da sequência = um ciclo */
function sessoesDoCiclo() {
  const n = fichasOrdenadas().length || 5;
  const vistos = new Set();
  const out = [];
  for (const s of sessoesRecentes()) {
    if (vistos.has(s.fichaId)) break;
    vistos.add(s.fichaId);
    out.push(s);
    if (out.length >= n) break;
  }
  return out;
}

/* ================== bloco de 8 semanas ================== */

function semanaBloco(dataISO = hojeISO()) {
  const d = diasEntre(estado.config.blocoInicio, dataISO);
  if (d < 0) return 1;
  return (Math.floor(d / 7) % 8) + 1;
}
function faseBloco(sem) {
  if (sem === 7) return { rotulo: 'Semana 7 · DELOAD', classe: 'ambar', deload: true };
  if (sem === 8) return { rotulo: 'Semana 8 · reavaliação', classe: 'azul', deload: false };
  return { rotulo: 'Semana ' + sem + ' de 8', classe: '', deload: false };
}
function seriesAlvo(item, sem) {
  return faseBloco(sem).deload ? Math.max(1, Math.round(item.series * 0.6)) : item.series;
}

/* ================== prescrição ================== */

function textoPresc(item) {
  const e = ex(item.ex);
  const un = e.unidade === 'seg' ? 's' : '';
  const faixa = item.repMin === item.repMax ? item.repMin + un : `${item.repMin}-${item.repMax}${un}`;
  let t = `${item.series}x${faixa}`;
  if (item.excecao) t += ' (*)';
  if (item.rirMin != null && item.rirMax != null) {
    t += ' · RIR ' + (item.rirMin === item.rirMax ? item.rirMin : `${item.rirMin}-${item.rirMax}`);
  } else if (item.ativacao) {
    t += ' · leve';
  } else {
    t += ' · RIR ' + (item.rirMax ?? 1) + ', última até a falha';
  }
  return t;
}

/* ================== histórico por exercício ================== */

function sessoesDe(exId, acadId = academiaRef()) {
  return sessoesRecentes()
    .filter(s => (!acadId || s.academiaId === acadId) && s.series.some(x => x.ex === exId && x.carga != null));
}

/* as N últimas vezes que este exercício apareceu NESTA academia */
function ultimasVezes(exId, n = 3, acadId = academiaRef()) {
  return sessoesDe(exId, acadId).slice(0, n).map(s => ({
    data: s.data,
    series: s.series.filter(x => x.ex === exId && x.carga != null && x.tipo !== 'aquecimento')
  })).filter(u => u.series.length);
}

function ultimaVez(exId, acadId = academiaRef()) { return ultimasVezes(exId, 1, acadId)[0] || null; }

/* maior carga registrada antes de uma dada sessão.
   Usa a ordem de registro, não a data: dois treinos no mesmo dia contam certo. */
function recordeAntes(exId, indiceLimite, acadId = academiaRef()) {
  let max = 0;
  estado.sessoes.forEach((s, i) => {
    if (indiceLimite != null && i >= indiceLimite) return;
    if (acadId && s.academiaId !== acadId) return;
    s.series.forEach(x => {
      if (x.ex === exId && x.tipo !== 'aquecimento' && x.carga > max) max = x.carga;
    });
  });
  return max;
}

/* sugestão de progressão dupla */
function sugestao(item, acadId = academiaRef()) {
  const u = ultimaVez(item.ex, acadId);
  if (!u) return null;
  const validas = u.series.filter(x => x.tipo !== 'aquecimento');
  if (!validas.length) return null;
  const fechouTopo = validas.every(x => x.reps != null && x.reps >= item.repMax);
  const cargas = validas.map(x => x.carga).filter(c => c != null);
  if (!cargas.length) return null;
  const carga = Math.max(...cargas);
  return fechouTopo
    ? { tipo: 'subir', carga: carga + estado.config.incremento, de: carga }
    : { tipo: 'manter', carga };
}

/* ================== navegação ================== */

let telaAtual = 'inicio';

function irPara(nome) {
  telaAtual = nome;
  $$('.tela').forEach(t => t.classList.remove('ativa'));
  const alvo = $('#tela-' + nome);
  if (alvo) alvo.classList.add('ativa');
  $$('nav button').forEach(b => b.classList.toggle('ativo', b.dataset.tela === nome));
  $('#barra-exec').hidden = !(nome === 'exec' && estado.sessaoAtiva);
  window.scrollTo(0, 0);
  render();
}

function render() {
  if (telaAtual === 'inicio')    renderInicio();
  if (telaAtual === 'exec')      renderExec();
  if (telaAtual === 'fichas')    renderFichas();
  if (telaAtual === 'historico') renderHistorico();
  if (telaAtual === 'progresso') renderProgresso();
  if (telaAtual === 'config')    renderConfig();
}

/* ================== tela: início ================== */

function renderInicio() {
  const hoje = new Date();
  const sem = semanaBloco();
  const fase = faseBloco(sem);
  const prox = proximaFicha();
  const ativa = estado.sessaoAtiva;

  let h = `<div class="topo">
    <div><h1>${DIAS[hoje.getDay()]}</h1>
    <div class="sub">${dataBRLonga(hojeISO())}</div></div>
    <span class="tag ${fase.classe}">${fase.rotulo}</span>
  </div>`;

  if (migracao) {
    h += `<div class="aviso" style="background:var(--acento-esc);color:var(--acento)">
      <span>✓</span><span>Ficha atualizada para a versão ${migracao.para}. ${
        migracao.sessoes === 0 ? 'Nenhum treino havia sido registrado.'
        : migracao.sessoes === 1 ? 'Seu treino já registrado foi preservado.'
        : `Seus ${migracao.sessoes} treinos já registrados foram preservados.`
      }${migracao.descartouSessaoAtiva ? ' O treino que estava em andamento foi descartado, porque a ficha mudou.' : ''}</span></div>`;
  }

  if (fase.deload) {
    h += `<div class="aviso"><span>▼</span><span>Semana de deload: o app já reduziu as séries em 40%. Mantenha as cargas.</span></div>`;
  }
  if (sem === 8) {
    h += `<div class="aviso"><span>◆</span><span>Semana de reavaliação — fim do bloco. Revise as fichas antes de começar o próximo.</span></div>`;
  }

  if (ativa) {
    const feitas = ativa.series.filter(s => s.carga != null).length;
    h += `<h2>Em andamento</h2>
    <div class="card">
      <div class="col"><b>${esc(nomeFicha(ativa.fichaId))}</b>
      <span class="muted">${feitas} série${feitas === 1 ? '' : 's'} registrada${feitas === 1 ? '' : 's'} · ${esc(ativa.academia)}</span></div>
      <div style="height:10px"></div>
      <button class="primario largo" data-acao="continuar">Continuar treino</button>
    </div>`;
  } else if (prox) {
    const ultS = ultimaSessao();
    h += `<h2>Próximo na sequência</h2>
    <div class="card">
      <div class="col">
        <b style="font-size:18px">${esc(prox.nome)}</b>
        <span class="muted">${esc(prox.subtitulo || '')}</span>
      </div>
      <div class="mini" style="margin-top:8px">${prox.itens.length} exercícios · ${prox.itens.reduce((a, i) => a + seriesAlvo(i, sem), 0)} séries${ultS ? ' · último treino há ' + diasDesde(ultS.data) : ''}</div>
      ${prox.nota ? `<div class="aviso"><span>›</span><span>${esc(prox.nota)}</span></div>` : ''}
      <div style="height:12px"></div>
      <button class="primario largo" data-acao="iniciar" data-ficha="${prox.id}">Iniciar ${esc(prox.nome)}</button>
    </div>`;
  }

  h += `<h2>Sequência</h2>`;
  fichasOrdenadas().forEach(f => {
    const eProx = prox && f.id === prox.id && !ativa;
    h += `<div class="card clicavel" data-acao="iniciar" data-ficha="${f.id}"
      ${eProx ? 'style="border-color:var(--acento)"' : ''}>
      <div class="linha-flex">
        <div class="col"><b>${eProx ? '→ ' : ''}${esc(f.nome)}</b><span class="mini">${esc(f.subtitulo || '')}</span></div>
        <span class="mini">${f.ordem ? f.ordem + 'º' : ''} · ${f.itens.length} ex.</span>
      </div>
    </div>`;
  });

  const ult = ultimaSessao();
  if (ult) {
    h += `<h2>Último treino</h2>
    <div class="card clicavel" data-acao="ver-sessao" data-id="${ult.id}">
      <div class="linha-flex">
        <div class="col"><b>${esc(nomeFicha(ult.fichaId))}</b>
        <span class="mini">${dataBRLonga(ult.data)} · ${ult.series.length} séries</span></div>
        <span class="mini">›</span>
      </div>
    </div>`;
  }

  $('#tela-inicio').innerHTML = h;
}

/* ================== sessão em andamento ================== */

/* Os itens da SESSÃO são uma cópia dos itens da ficha. É isso que permite
   substituir, pular e acrescentar sem mexer na ficha. */
function itemDeSessao(item, sem) {
  return {
    uid: uid(),
    ex: item.ex,
    series: seriesAlvo(item, sem),
    repMin: item.repMin, repMax: item.repMax,
    rirMin: item.rirMin, rirMax: item.rirMax,
    excecao: !!item.excecao, ativacao: !!item.ativacao,
    origem: null, pulado: false, substituido: false, extra: false
  };
}

function iniciarSessao(fichaId) {
  const f = ficha(fichaId);
  if (!f) return;
  const sem = semanaBloco();
  const itens = f.itens.map(it => itemDeSessao(it, sem));
  estado.sessaoAtiva = {
    id: uid(),
    data: hojeISO(),
    fichaId,
    academiaId: estado.config.academiaId,
    semanaBloco: sem,
    inicio: Date.now(),
    pesoCorporal: null,
    obs: '',
    itens,
    series: [],
    aberto: itens.length ? itens[0].uid : null
  };
  salvar();
  irPara('exec');
}

function itemPorUid(u) { return estado.sessaoAtiva.itens.find(i => i.uid === u); }
function achaSerie(u, j) { return estado.sessaoAtiva.series.find(s => s.k === u + ':' + j); }
function seriesFeitas(u) { return estado.sessaoAtiva.series.filter(s => s.k.startsWith(u + ':') && s.carga != null); }

function gravaSerie(u, j, dados) {
  const s = estado.sessaoAtiva;
  let r = achaSerie(u, j);
  if (!r) { r = { k: u + ':' + j }; s.series.push(r); }
  Object.assign(r, dados);
  salvar();
}

/* substitutos já usados para um exercício, mais recentes primeiro */
function substitutosDe(exId) {
  return (estado.substitutos && estado.substitutos[exId]) || [];
}
function registraSubstituto(exOriginal, exNovo) {
  if (!estado.substitutos) estado.substitutos = {};
  const lista = (estado.substitutos[exOriginal] || []).filter(x => x !== exNovo);
  lista.unshift(exNovo);
  estado.substitutos[exOriginal] = lista.slice(0, 3);
}

function substituirItem(u, exNovo) {
  const s = estado.sessaoAtiva;
  const idx = s.itens.findIndex(i => i.uid === u);
  if (idx < 0) return;
  const orig = s.itens[idx];
  const feitas = seriesFeitas(u).length;
  const restantes = Math.max(1, orig.series - feitas);

  orig.substituido = true;
  registraSubstituto(orig.ex, exNovo);

  const novo = {
    uid: uid(),
    ex: exNovo,
    series: restantes,
    repMin: orig.repMin, repMax: orig.repMax,
    rirMin: orig.rirMin, rirMax: orig.rirMax,
    excecao: false, ativacao: orig.ativacao,
    origem: orig.uid, pulado: false, substituido: false, extra: false
  };
  s.itens.splice(idx + 1, 0, novo);
  s.aberto = novo.uid;
  salvar();
  fecharModal();
  renderExec();
  toast('Substituído por ' + ex(exNovo).nome + '.');
}

/* Cria um exercício que não existe na biblioteca, a partir do nome digitado.
   Na troca, herda os grupos musculares do exercício que está substituindo —
   assim a contagem de volume continua certa sem você precisar classificar nada. */
function criarExercicio(nome, grupos) {
  nome = String(nome || '').trim();
  if (!nome) return null;
  const igual = estado.exercicios.find(e => e.nome.toLowerCase() === nome.toLowerCase());
  if (igual) return igual.id;
  const base = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'ex';
  let id = base;
  while (estado.exercicios.some(e => e.id === id)) id = base + '-' + Math.random().toString(36).slice(2, 5);
  estado.exercicios.push({ id, nome, grupos: (grupos || []).slice(), custom: true });
  return id;
}

function acrescentarExtra(exNovo) {
  const s = estado.sessaoAtiva;
  const novo = {
    uid: uid(), ex: exNovo, series: 3, repMin: 8, repMax: 8, rirMax: 1,
    excecao: false, ativacao: false, origem: null, pulado: false, substituido: false, extra: true
  };
  s.itens.push(novo);
  s.aberto = novo.uid;
  salvar();
  fecharModal();
  renderExec();
}

/* ================== tela: execução ================== */

function renderExec() {
  const s = estado.sessaoAtiva;
  const el = $('#tela-exec');
  if (!s) {
    el.innerHTML = `<div class="vazio">Nenhum treino em andamento.<br><br>
      <button class="primario" data-acao="ir" data-tela="inicio">Ir para o início</button></div>`;
    return;
  }
  const f = ficha(s.fichaId);
  const fase = faseBloco(s.semanaBloco);

  let h = `<div class="topo">
    <div><h1>${esc(f ? f.nome : 'Treino')}</h1>
      <div class="sub">${esc(f ? (f.subtitulo || '') : '')} · ${dataBR(s.data)}</div></div>
    <span class="tag ${fase.classe}">${fase.deload ? 'DELOAD' : 'S' + s.semanaBloco}</span>
  </div>`;

  h += `<div class="card">
    <div class="detalhes" style="padding:0">
      <div class="campo"><label>Academia</label>
        <select data-campo="academia">
          ${academias().map(a => `<option value="${a.id}" ${a.id === s.academiaId ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}
        </select></div>
      ${estado.config.registrarPeso ? `<div class="campo"><label>Peso (kg)</label>
        <input type="number" inputmode="decimal" data-campo="peso" value="${s.pesoCorporal ?? ''}" placeholder="—"></div>` : ''}
    </div>
    ${s.academiaId !== estado.config.academiaId
      ? `<div class="aviso"><span>!</span><span>As cargas sugeridas e o histórico abaixo são os desta academia — ${esc(nomeAcademia(s.academiaId))}.</span></div>` : ''}
  </div>`;

  if (f && f.nota) h += `<div class="aviso"><span>›</span><span>${esc(f.nota)}</span></div><div style="height:10px"></div>`;

  s.itens.forEach((item, i) => {
    const e = ex(item.ex);
    const feitas = seriesFeitas(item.uid).length;
    const completo = feitas >= item.series;
    const aberto = s.aberto === item.uid;
    const sug = sugestao(item, s.academiaId);
    const unSeg = e.unidade === 'seg';
    const inativo = item.pulado || item.substituido;

    let etiqueta = '';
    if (item.pulado) etiqueta = '<span class="tag">pulado</span>';
    else if (item.substituido) etiqueta = '<span class="tag ambar">substituído</span>';
    else if (completo) etiqueta = '<span class="tag verde">✓</span>';
    else etiqueta = `<span class="mini">${feitas}/${item.series}</span>`;

    h += `<div class="ex-bloco ${(completo || inativo) && !aberto ? 'feito' : ''} ${item.origem ? 'derivado' : ''}" data-bloco="${i}" data-uid="${item.uid}">
      <div class="ex-cab" data-acao="abrir" data-uid="${item.uid}">
        <div class="col">
          <span class="ex-nome">${item.origem ? '↳ ' : ''}${esc(e.nome)}${item.extra ? ' <span class="tag azul">extra</span>' : ''}</span>
          <span class="ex-presc">${inativo ? (item.pulado ? 'não realizado' : 'trocado — ' + feitas + ' série' + (feitas === 1 ? '' : 's') + ' aproveitada' + (feitas === 1 ? '' : 's')) : textoPresc(item)}</span>
        </div>
        <div style="text-align:right;white-space:nowrap">${etiqueta}</div>
      </div>
      <div class="ex-corpo ${aberto ? '' : 'oculto'}">`;

    if (item.pulado) {
      h += `<div class="ult-vez">Marcado como não realizado neste treino.</div>
        <div class="botoes" style="padding-bottom:10px">
          <button class="pequeno fantasma" data-acao="despular" data-uid="${item.uid}">Desfazer</button>
        </div>`;
    } else {
      if (e.aviso) h += `<div class="aviso"><span>⚠</span><span>${esc(e.aviso)}</span></div>`;
      if (e.nota) h += `<div class="ult-vez" style="padding-bottom:0">${esc(e.nota)}</div>`;
      if (item.excecao) h += `<div class="ult-vez" style="padding-bottom:0">(*) Reps altas por motivo articular — não subir carga além da faixa.</div>`;

      const hist = ultimasVezes(item.ex, 3, s.academiaId);
      if (hist.length) {
        h += `<div class="ult-vez">Últimas vezes${academias().length > 1 ? ' em ' + esc(nomeAcademia(s.academiaId)) : ''}:</div><div class="hist-mini">`;
        hist.forEach((u, k) => {
          const desc = u.series.map(x => fmtNum(x.carga) + (x.reps != null ? '×' + x.reps : '')).join(' · ');
          h += `<div class="${k === 0 ? 'recente' : ''}"><span>${dataBR(u.data)}</span><b>${desc}</b></div>`;
        });
        h += `</div>`;
      } else {
        h += `<div class="ult-vez">Primeira vez deste exercício${academias().length > 1 ? ' em ' + esc(nomeAcademia(s.academiaId)) : ''}.</div>`;
      }

      if (sug && sug.tipo === 'subir' && !item.excecao) {
        h += `<div class="aviso" style="background:var(--acento-esc);color:var(--acento)">
          <span>↑</span><span>Fechou o topo da faixa. Sugestão: <b>${fmtNum(sug.carga)} kg</b> e voltar a ${item.repMin} reps.</span></div>`;
      }

      for (let j = 0; j < item.series; j++) {
        const r = achaSerie(item.uid, j) || {};
        const ok = r.carga != null;
        const cargaSug = r.carga != null ? r.carga : (sug ? sug.carga : '');
        const repsPad = r.reps != null ? r.reps : item.repMax;
        const temDet = r.rir != null || (r.tipo && r.tipo !== 'valida') || r.obs || r.descanso != null;
        const ehFalha = !item.ativacao && j === item.series - 1;
        h += `<div class="serie ${ok ? 'ok' : ''}" data-uid="${item.uid}" data-j="${j}">
          <div class="n ${ehFalha ? 'falha' : ''}">${j + 1}</div>
          <input class="carga" type="number" inputmode="decimal" step="0.5" placeholder="kg"
                 value="${r.carga != null ? r.carga : ''}" data-campo="carga"
                 ${r.carga == null && cargaSug !== '' ? `data-sug="${cargaSug}"` : ''}>
          <input class="carga" style="width:62px" type="number" inputmode="numeric" step="1"
                 value="${r.reps != null ? r.reps : ''}" placeholder="${unSeg ? repsPad + 's' : repsPad}" data-campo="reps">
          <button class="btn-ok ${ok ? 'primario' : 'pendente'}" data-acao="confirmar">✓</button>
          <button class="btn-det ${temDet ? 'marcado' : ''}" data-acao="detalhes">⋯</button>
          <div class="detalhes oculto">
            <div class="campo"><label>RIR</label>
              <input type="number" inputmode="numeric" data-campo="rir" value="${r.rir ?? ''}" placeholder="${item.rirMax ?? ''}"></div>
            <div class="campo"><label>Tipo</label>
              <select data-campo="tipo">
                <option value="valida" ${(!r.tipo || r.tipo === 'valida') ? 'selected' : ''}>Válida</option>
                <option value="aquecimento" ${r.tipo === 'aquecimento' ? 'selected' : ''}>Aquecimento</option>
                <option value="falha" ${r.tipo === 'falha' ? 'selected' : ''}>Falha</option>
              </select></div>
            <div class="campo"><label>Descanso (s)</label>
              <input type="number" inputmode="numeric" data-campo="descanso" value="${r.descanso ?? ''}" placeholder="—"></div>
            <div class="campo largo"><label>Observação</label>
              <input type="text" data-campo="obs" value="${esc(r.obs || '')}" placeholder="opcional"></div>
          </div>
        </div>`;
      }

      h += `<div class="botoes" style="padding:11px 0 4px">
        <button class="pequeno fantasma" data-acao="trocar" data-uid="${item.uid}">⇄ Trocar exercício</button>
        ${item.extra
          ? `<button class="pequeno fantasma" data-acao="rm-extra" data-uid="${item.uid}">Remover</button>`
          : `<button class="pequeno fantasma" data-acao="pular" data-uid="${item.uid}">Pular</button>`}
        <button class="pequeno fantasma" data-acao="mais-serie" data-uid="${item.uid}">+ série</button>
      </div>`;
    }
    h += `</div></div>`;
  });

  h += `<div style="height:6px"></div>
    <button class="fantasma largo" data-acao="add-extra">+ Acrescentar exercício</button>`;

  h += `<div class="card" style="margin-top:12px"><div class="campo"><label>Observações do treino</label>
    <textarea rows="3" data-campo="obs-sessao" placeholder="opcional">${esc(s.obs || '')}</textarea></div></div>`;
  h += `<div style="height:70px"></div>`;

  el.innerHTML = h;
}

/* modal de escolha de exercício */
function abrirTroca(u) {
  const item = itemPorUid(u);
  if (!item) return;
  const original = ex(item.ex);
  const grupos = original.grupos || [];
  const preferidos = substitutosDe(item.ex).filter(id => id !== item.ex);
  const mesmoGrupo = estado.exercicios
    .filter(e => e.id !== item.ex && !preferidos.includes(e.id) && e.grupos.some(g => grupos.includes(g)))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const outros = estado.exercicios
    .filter(e => e.id !== item.ex && !preferidos.includes(e.id) && !e.grupos.some(g => grupos.includes(g)))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const linha = (e) => `<div class="card clicavel" style="padding:11px" data-acao="confirmar-troca" data-uid="${u}" data-ex="${e.id}">
      <div class="linha-flex"><b style="font-size:14.5px">${esc(e.nome)}</b>
      <span class="mini">${e.grupos.map(g => GRUPOS[g] ? GRUPOS[g].nome : g).join(', ')}</span></div>
    </div>`;

  let h = `<h3>Trocar ${esc(original.nome)}</h3>
    <div class="muted" style="margin-top:-8px">O substituto herda a prescrição e mantém sua própria curva de carga.</div>
    <div style="height:14px"></div>`;
  if (preferidos.length) {
    h += `<h2 style="margin-top:0">Já usou antes</h2>` + preferidos.map(id => linha(ex(id))).join('');
  }
  h += `<h2>Mesmo grupo muscular</h2>`;
  h += mesmoGrupo.length ? mesmoGrupo.map(linha).join('') : `<div class="mini">Nenhum outro exercício deste grupo na biblioteca.</div>`;
  h += `<h2>Outros exercícios</h2><div class="campo">
    <select data-acao="troca-outro" data-uid="${u}">
      <option value="">— escolher —</option>
      ${outros.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}
    </select></div>`;

  h += `<h2>Não está na lista</h2>
    <div class="card" style="padding:12px">
      <div class="campo"><label>Nome do exercício</label>
        <input id="novo-ex-nome" type="text" placeholder="ex.: supino convergente Hammer" autocapitalize="sentences"></div>
      <div class="mini" style="margin:8px 0 10px">Entra como ${esc(grupos.map(g => GRUPOS[g] ? GRUPOS[g].nome.toLowerCase() : g).join(', ') || 'sem grupo muscular')} e fica salvo na sua biblioteca.</div>
      <button class="primario largo pequeno" data-acao="criar-e-trocar" data-uid="${u}">Criar e usar agora</button>
    </div>`;

  h += `<div style="height:10px"></div>
    <button class="fantasma largo" data-acao="fechar-modal">Cancelar</button>`;
  modal(h);
}

function abrirExtra() {
  const lista = estado.exercicios.slice().sort((a, b) => a.nome.localeCompare(b.nome));
  let h = `<h3>Acrescentar exercício</h3>
    <div class="muted" style="margin-top:-8px">Entra no fim da sessão, marcado como extra.</div>
    <div style="height:14px"></div>
    <div class="campo"><select data-acao="extra-escolhido">
      <option value="">— escolher —</option>
      ${lista.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}
    </select></div>

    <h2>Não está na lista</h2>
    <div class="card" style="padding:12px">
      <div class="campo"><label>Nome do exercício</label>
        <input id="novo-ex-nome" type="text" placeholder="ex.: crucifixo Hammer" autocapitalize="sentences"></div>
      <div class="campo" style="margin-top:8px"><label>Grupo muscular</label>
        <select id="novo-ex-grupo">
          <option value="">— sem grupo (não conta no volume) —</option>
          ${Object.entries(GRUPOS).map(([g, i]) => `<option value="${g}">${esc(i.nome)}</option>`).join('')}
        </select></div>
      <div style="height:10px"></div>
      <button class="primario largo pequeno" data-acao="criar-e-acrescentar">Criar e acrescentar</button>
    </div>

    <div style="height:10px"></div>
    <button class="fantasma largo" data-acao="fechar-modal">Cancelar</button>`;
  modal(h);
}

function finalizarSessao() {
  const s = estado.sessaoAtiva;
  if (!s) return;
  const validas = s.series.filter(x => x.carga != null);
  if (!validas.length) {
    modal(`<h3>Descartar treino?</h3>
      <p class="muted">Nenhuma série foi registrada.</p>
      <div class="botoes"><button class="fantasma" data-acao="fechar-modal">Voltar</button>
      <button class="perigo" data-acao="descartar">Descartar</button></div>`);
    return;
  }
  const porUid = {};
  s.itens.forEach(i => { porUid[i.uid] = i; });

  const sessao = {
    id: s.id, data: s.data, fichaId: s.fichaId,
    academiaId: s.academiaId, academia: nomeAcademia(s.academiaId),
    semanaBloco: s.semanaBloco, pesoCorporal: s.pesoCorporal, obs: s.obs,
    duracao: Math.round((Date.now() - s.inicio) / 60000),
    /* o que estava previsto e o que aconteceu com cada item */
    itens: s.itens.map(i => ({
      ex: i.ex, series: i.series, pulado: i.pulado, substituido: i.substituido,
      extra: i.extra, origemEx: i.origem && porUid[i.origem] ? porUid[i.origem].ex : null
    })),
    series: validas.map(x => {
      const [u, j] = x.k.split(':');
      const item = porUid[u] || {};
      return {
        ex: item.ex, itemUid: u, serie: +j,
        carga: x.carga, reps: x.reps ?? item.repMax ?? null,
        rir: x.rir ?? null, tipo: x.tipo || 'valida',
        descanso: x.descanso ?? null, obs: x.obs || ''
      };
    })
  };
  estado.sessoes.push(sessao);
  estado.sessaoAtiva = null;
  salvarJa();
  toast('Treino registrado.');
  irPara('inicio');
}

/* ================== tela: fichas ================== */

function renderFichas() {
  const prox = proximaFicha();
  let h = `<div class="topo"><div><h1>Fichas</h1>
    <div class="sub">sequência de ${estado.fichas.length} treinos · toque para editar</div></div></div>`;
  fichasOrdenadas().forEach(f => {
    h += `<div class="card clicavel" data-acao="editar-ficha" data-id="${f.id}">
      <div class="linha-flex">
        <div class="col"><b>${esc(f.nome)}</b><span class="mini">${esc(f.subtitulo || '')}</span></div>
        <span class="tag ${prox && prox.id === f.id ? 'verde' : ''}">${f.ordem ? f.ordem + 'º' : '—'}</span>
      </div>
      <div class="mini" style="margin-top:8px">${f.itens.map(i => esc(ex(i.ex).nome)).join(' · ')}</div>
    </div>`;
  });
  h += `<div style="height:8px"></div>
    <button class="fantasma largo" data-acao="nova-ficha">+ Nova ficha</button>`;

  h += `<h2>Reintrodução</h2><div class="card">`;
  estado.reintroducao.forEach((r, i) => {
    h += `<div class="linha-flex" style="padding:6px 0">
      <span>${esc(r.nome)}</span>
      <button class="pequeno ${r.status === 'ativo' ? 'primario' : 'fantasma'}" data-acao="toggle-reintro" data-i="${i}">
        ${r.status === 'ativo' ? 'reintroduzido' : 'aguardando'}</button>
    </div>`;
  });
  h += `<div class="mini" style="margin-top:8px">Voltam um de cada vez, por critério subjetivo.</div></div>`;

  h += `<h2>Referência</h2>`;
  REFERENCIA.forEach(r => {
    h += `<div class="card"><b>${esc(r.titulo)}</b><div class="muted" style="margin-top:4px">${esc(r.texto)}</div></div>`;
  });

  $('#tela-fichas').innerHTML = h;
}

function editarFicha(id) {
  const f = ficha(id);
  if (!f) return;
  let h = `<h3>${esc(f.nome)}</h3>
  <div class="detalhes" style="grid-template-columns:1fr 1fr">
    <div class="campo largo"><label>Nome</label><input data-f="nome" value="${esc(f.nome)}"></div>
    <div class="campo largo"><label>Subtítulo</label><input data-f="subtitulo" value="${esc(f.subtitulo || '')}"></div>
    <div class="campo largo"><label>Posição na sequência</label>
      <select data-f="ordem">${[1,2,3,4,5,6,7,8].map(d =>
        `<option value="${d}" ${f.ordem === d ? 'selected' : ''}>${d}º treino do ciclo</option>`).join('')}
        <option value="0" ${!f.ordem ? 'selected' : ''}>Fora da sequência</option></select></div>
    <div class="campo largo"><label>Nota do treino</label><input data-f="nota" value="${esc(f.nota || '')}"></div>
  </div>
  <h2>Exercícios</h2>`;

  f.itens.forEach((it, i) => {
    h += `<div class="card" style="padding:11px">
      <div class="linha-flex"><b style="font-size:14.5px">${esc(ex(it.ex).nome)}</b>
        <button class="pequeno perigo" data-acao="rm-item" data-i="${i}">remover</button></div>
      <div class="detalhes" style="padding-bottom:0;grid-template-columns:repeat(4,1fr)">
        <div class="campo"><label>Séries</label><input type="number" inputmode="numeric" data-it="${i}" data-c="series" value="${it.series}"></div>
        <div class="campo"><label>Rep. mín</label><input type="number" inputmode="numeric" data-it="${i}" data-c="repMin" value="${it.repMin}"></div>
        <div class="campo"><label>Rep. máx</label><input type="number" inputmode="numeric" data-it="${i}" data-c="repMax" value="${it.repMax}"></div>
        <div class="campo"><label>RIR</label><input type="number" inputmode="numeric" data-it="${i}" data-c="rirMax" value="${it.rirMax ?? ''}"></div>
      </div>
    </div>`;
  });

  h += `<div class="campo largo" style="margin-top:10px"><label>Adicionar exercício</label>
    <select data-acao="add-item">
      <option value="">— escolher —</option>
      ${estado.exercicios.slice().sort((a, b) => a.nome.localeCompare(b.nome))
        .map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}
    </select></div>
  <div style="height:14px"></div>
  <div class="botoes">
    <button class="fantasma" data-acao="fechar-modal">Fechar</button>
    <button class="primario" data-acao="salvar-ficha" data-id="${id}">Salvar</button>
  </div>
  <div style="height:10px"></div>
  <button class="perigo largo" data-acao="excluir-ficha" data-id="${id}">Excluir ficha</button>`;

  modal(h, { fichaId: id });
}

/* ================== tela: histórico ================== */

let filtroFicha = null;

function volumeSessao(s) {
  return s.series.reduce((a, x) => a + (x.carga || 0) * (x.reps || 0), 0);
}

/* recordes batidos numa sessão (comparando com tudo que veio antes) */
function prsDaSessao(s) {
  const idx = estado.sessoes.findIndex(x => x.id === s.id);
  const out = [];
  const porEx = {};
  s.series.filter(x => x.tipo !== 'aquecimento').forEach(x => {
    if (!porEx[x.ex] || x.carga > porEx[x.ex]) porEx[x.ex] = x.carga;
  });
  Object.entries(porEx).forEach(([exId, carga]) => {
    const antes = recordeAntes(exId, idx < 0 ? null : idx, s.academiaId);
    if (antes > 0 && carga > antes) out.push({ ex: exId, carga, antes });
  });
  return out;
}

/* sessão anterior da mesma ficha */
function sessaoAnteriorDa(s) {
  const lista = sessoesRecentes().filter(x => x.fichaId === s.fichaId);
  const i = lista.findIndex(x => x.id === s.id);
  return i >= 0 ? lista[i + 1] || null : null;
}

function renderHistorico() {
  const todas = sessoesRecentes();
  const ss = filtroFicha ? todas.filter(s => s.fichaId === filtroFicha) : todas;

  let h = `<div class="topo"><div><h1>Histórico</h1>
    <div class="sub">${todas.length} treino${todas.length === 1 ? '' : 's'} registrado${todas.length === 1 ? '' : 's'}</div></div></div>`;

  if (!todas.length) {
    h += `<div class="vazio">Nenhum treino registrado ainda.</div>`;
    $('#tela-historico').innerHTML = h;
    return;
  }

  /* --- resumo --- */
  const hoje = hojeISO();
  const ult30 = todas.filter(s => diasEntre(s.data, hoje) <= 30);
  const volTotal = todas.reduce((a, s) => a + volumeSessao(s), 0);
  const seriesTotal = todas.reduce((a, s) => a + s.series.length, 0);
  const comDuracao = todas.filter(s => s.duracao > 0);
  const duracaoMedia = comDuracao.length
    ? Math.round(comDuracao.reduce((a, s) => a + s.duracao, 0) / comDuracao.length) : null;
  const intervalos = [];
  for (let i = 0; i < todas.length - 1; i++) {
    const d = diasEntre(todas[i + 1].data, todas[i].data);
    if (d > 0 && d < 30) intervalos.push(d);
  }
  const intervaloMedio = intervalos.length
    ? (intervalos.reduce((a, b) => a + b, 0) / intervalos.length).toFixed(1).replace('.', ',') : null;

  h += `<div class="card">
    <div class="resumo">
      <div><b>${ult30.length}</b><span>treinos em 30 dias</span></div>
      <div><b>${seriesTotal}</b><span>séries no total</span></div>
      <div><b>${fmtKg(volTotal)}</b><span>kg de volume</span></div>
      ${duracaoMedia ? `<div><b>${duracaoMedia} min</b><span>duração média</span></div>` : ''}
      ${intervaloMedio ? `<div><b>${intervaloMedio} d</b><span>entre treinos</span></div>` : ''}
      <div><b>${diasDesde(todas[0].data)}</b><span>desde o último</span></div>
    </div>
  </div>`;

  /* --- frequência (12 semanas) --- */
  h += `<h2>Frequência</h2><div class="card">${heatmapHTML(todas)}
    <div class="mini centro" style="margin-top:8px">últimas 12 semanas</div></div>`;

  /* --- filtro --- */
  h += `<h2>Treinos</h2>
    <div class="chips">
      <button class="${!filtroFicha ? 'ativo' : ''}" data-acao="filtro-ficha" data-id="">Todos</button>
      ${fichasOrdenadas().map(f =>
        `<button class="${filtroFicha === f.id ? 'ativo' : ''}" data-acao="filtro-ficha" data-id="${f.id}">${esc(f.nome)}</button>`).join('')}
    </div>`;

  if (!ss.length) {
    h += `<div class="vazio">Nenhum treino desta ficha.</div>`;
  }

  let mesAtual = '';
  ss.forEach((s, k) => {
    const mes = s.data.slice(0, 7);
    if (mes !== mesAtual) {
      mesAtual = mes;
      const [a, m] = mes.split('-');
      h += `<h2>${MESES[+m]} ${a}</h2>`;
    }
    const vol = volumeSessao(s);
    const prs = prsDaSessao(s);
    const itens = s.itens || [];
    const pulados = itens.filter(i => i.pulado).length;
    const trocados = itens.filter(i => i.substituido).length;
    const extras = itens.filter(i => i.extra).length;
    const anterior = ss[k + 1] && ss[k + 1].fichaId === s.fichaId ? ss[k + 1] : null;
    const dVol = anterior ? vol - volumeSessao(anterior) : null;

    h += `<div class="card clicavel" data-acao="ver-sessao" data-id="${s.id}">
      <div class="linha-flex">
        <div class="col"><b>${esc(nomeFicha(s.fichaId))}</b>
          <span class="mini">${dataBRLonga(s.data)}${s.duracao ? ' · ' + s.duracao + ' min' : ''}</span></div>
        <div style="text-align:right">
          <div class="mini">${s.series.length} séries</div>
          <div class="mini">${fmtKg(vol)} kg${dVol != null && Math.abs(dVol) > 1
            ? ` <span class="${dVol > 0 ? 'delta-pos' : 'delta-neg'}">${dVol > 0 ? '↑' : '↓'}${fmtKg(Math.abs(dVol))}</span>` : ''}</div>
        </div>
      </div>
      ${(prs.length || pulados || trocados || extras || s.academiaId !== estado.config.academiaId) ? `
      <div class="selos">
        ${prs.length ? `<span class="tag verde">${prs.length} recorde${prs.length > 1 ? 's' : ''}</span>` : ''}
        ${trocados ? `<span class="tag ambar">${trocados} troca${trocados > 1 ? 's' : ''}</span>` : ''}
        ${pulados ? `<span class="tag">${pulados} pulado${pulados > 1 ? 's' : ''}</span>` : ''}
        ${extras ? `<span class="tag azul">${extras} extra${extras > 1 ? 's' : ''}</span>` : ''}
        ${s.academiaId !== estado.config.academiaId ? `<span class="tag">${esc(nomeAcademia(s.academiaId))}</span>` : ''}
      </div>` : ''}
    </div>`;
  });

  $('#tela-historico').innerHTML = h;
}

function heatmapHTML(sessoes) {
  const porData = {};
  sessoes.forEach(s => { porData[s.data] = (porData[s.data] || 0) + s.series.length; });
  const hoje = new Date();
  const fim = new Date(hoje);
  fim.setDate(hoje.getDate() + (7 - ((hoje.getDay() + 6) % 7) - 1)); // domingo desta semana
  const celulas = [];
  for (let k = 12 * 7 - 1; k >= 0; k--) {
    const d = new Date(fim);
    d.setDate(fim.getDate() - k);
    const key = iso(d);
    const n = porData[key] || 0;
    const nivel = n === 0 ? 0 : n < 12 ? 1 : n < 20 ? 2 : 3;
    const futuro = key > hojeISO();
    celulas.push(`<i class="n${nivel}${futuro ? ' fut' : ''}" title="${dataBR(key)}${n ? ' · ' + n + ' séries' : ''}"></i>`);
  }
  return `<div class="heat">${celulas.join('')}</div>`;
}

function verSessao(id) {
  const s = estado.sessoes.find(x => x.id === id);
  if (!s) return;
  const ant = sessaoAnteriorDa(s);
  const vol = volumeSessao(s);
  const prs = prsDaSessao(s);
  const prsPorEx = {};
  prs.forEach(p => { prsPorEx[p.ex] = p; });

  /* agrupa séries por item (para separar substituto do original) */
  const grupos = [];
  s.series.forEach(x => {
    const chave = x.itemUid || x.ex;
    let g = grupos.find(y => y.chave === chave);
    if (!g) { g = { chave, ex: x.ex, series: [] }; grupos.push(g); }
    g.series.push(x);
  });

  let h = `<h3>${esc(nomeFicha(s.fichaId))}</h3>
    <div class="muted" style="margin-top:-8px">${dataBRLonga(s.data)} · ${esc(nomeAcademia(s.academiaId))}${s.duracao ? ' · ' + s.duracao + ' min' : ''}${s.pesoCorporal ? ' · ' + fmtNum(s.pesoCorporal) + ' kg' : ''}</div>
    <div style="height:12px"></div>`;

  h += `<div class="card"><div class="resumo">
    <div><b>${s.series.length}</b><span>séries</span></div>
    <div><b>${fmtKg(vol)}</b><span>kg de volume</span></div>
    ${ant ? `<div><b>${(() => { const d = vol - volumeSessao(ant); return (d >= 0 ? '+' : '−') + fmtKg(Math.abs(d)); })()}</b><span>vs ${dataBR(ant.data)}</span></div>` : ''}
    <div><b>S${s.semanaBloco || '—'}</b><span>semana do bloco</span></div>
  </div></div>`;

  if (prs.length) {
    h += `<div class="aviso" style="background:var(--acento-esc);color:var(--acento)">
      <span>★</span><span>Recorde de carga em ${prs.map(p => esc(ex(p.ex).nome) + ' (' + fmtNum(p.carga) + ' kg, antes ' + fmtNum(p.antes) + ')').join('; ')}.</span></div>
      <div style="height:10px"></div>`;
  }

  grupos.forEach(g => {
    const antSer = ant ? ant.series.filter(x => x.ex === g.ex && x.tipo !== 'aquecimento') : [];
    const maxAnt = antSer.length ? Math.max(...antSer.map(x => x.carga)) : null;
    const maxAgora = Math.max(...g.series.filter(x => x.tipo !== 'aquecimento').map(x => x.carga));
    const d = maxAnt != null ? maxAgora - maxAnt : null;
    const itemInfo = (s.itens || []).find(i => i.ex === g.ex && i.origemEx);

    h += `<div class="card" style="padding:11px">
      <div class="linha-flex">
        <b style="font-size:14.5px">${esc(ex(g.ex).nome)}${prsPorEx[g.ex] ? ' <span class="tag verde">PR</span>' : ''}</b>
        ${d != null && Math.abs(d) > 0.01
          ? `<span class="mini ${d > 0 ? 'delta-pos' : 'delta-neg'}">${d > 0 ? '↑' : '↓'} ${fmtNum(Math.abs(d))} kg</span>`
          : (maxAnt != null ? `<span class="mini">= carga anterior</span>` : `<span class="mini">novo</span>`)}
      </div>
      ${itemInfo ? `<div class="mini" style="margin-top:3px">substituiu ${esc(ex(itemInfo.origemEx).nome)}</div>` : ''}
      <table style="margin-top:6px">
        <tr><th>#</th><th class="num">Carga</th><th class="num">Reps</th><th class="num">RIR</th><th>Tipo</th></tr>
        ${g.series.map((x, k) => `<tr>
          <td>${k + 1}</td>
          <td class="num"><input class="edit" type="number" inputmode="decimal" step="0.5" value="${x.carga}" data-ed="${s.id}|${g.chave}|${x.serie}|carga"></td>
          <td class="num"><input class="edit" type="number" inputmode="numeric" value="${x.reps ?? ''}" data-ed="${s.id}|${g.chave}|${x.serie}|reps"></td>
          <td class="num">${x.rir ?? '—'}</td>
          <td>${x.tipo === 'valida' ? '' : esc(x.tipo)}</td>
        </tr>`).join('')}
      </table>
      ${g.series.filter(x => x.obs).map(x => `<div class="mini" style="margin-top:6px">${esc(x.obs)}</div>`).join('')}
    </div>`;
  });

  const pulados = (s.itens || []).filter(i => i.pulado);
  if (pulados.length) {
    h += `<div class="card"><div class="mini">Não realizados</div>
      ${pulados.map(i => `<div style="font-size:14px">${esc(ex(i.ex).nome)}</div>`).join('')}</div>`;
  }

  if (s.obs) h += `<div class="card"><div class="mini">Observações</div>${esc(s.obs)}</div>`;

  h += `<div class="mini" style="margin:10px 0 4px">As cargas e reps acima são editáveis — corrija e salve.</div>
    <div class="botoes">
      <button class="fantasma" data-acao="fechar-modal">Fechar</button>
      <button class="primario" data-acao="salvar-sessao" data-id="${s.id}">Salvar</button>
    </div>
    <div style="height:10px"></div>
    <button class="perigo largo" data-acao="excluir-sessao" data-id="${s.id}">Excluir treino</button>`;
  modal(h);
}

function salvarEdicaoSessao(id) {
  const s = estado.sessoes.find(x => x.id === id);
  if (!s) return;
  $$('#modal [data-ed]').forEach(inp => {
    const [, chave, serie, campo] = inp.dataset.ed.split('|');
    const alvo = s.series.find(x => (x.itemUid || x.ex) === chave && x.serie === +serie);
    if (!alvo) return;
    const v = num(inp.value);
    if (v != null) alvo[campo] = v;
  });
  salvarJa();
  fecharModal();
  toast('Treino atualizado.');
  render();
}

/* ================== tela: progressão ================== */

let exSelecionado = null;
let acadSelecionada = null;

function renderProgresso() {
  if (!acadSelecionada || !academias().some(a => a.id === acadSelecionada)) {
    acadSelecionada = estado.config.academiaId;
  }
  const daAcad = sessoesRecentes().filter(s => s.academiaId === acadSelecionada);
  const usados = [...new Set(daAcad.flatMap(s => s.series.map(x => x.ex)))];
  if (!exSelecionado || !usados.includes(exSelecionado)) exSelecionado = usados[0] || null;

  let h = `<div class="topo"><div><h1>Progresso</h1>
    <div class="sub">cada academia tem sua própria curva de carga</div></div></div>`;

  if (academias().length > 1) {
    h += `<div class="chips">${academias().map(a =>
      `<button class="${a.id === acadSelecionada ? 'ativo' : ''}" data-acao="sel-acad" data-id="${a.id}">${esc(a.nome)}</button>`).join('')}</div>`;
  }

  /* --- volume do ciclo: feito vs previsto --- */
  const doCiclo = sessoesDoCiclo();
  const feito = {}, previsto = {};
  doCiclo.forEach(s => {
    s.series.filter(x => x.tipo !== 'aquecimento').forEach(x => {
      ex(x.ex).grupos.forEach(g => { feito[g] = (feito[g] || 0) + 1; });
    });
    const itens = s.itens || (ficha(s.fichaId) ? ficha(s.fichaId).itens : []);
    itens.filter(i => !i.extra && !i.substituido).forEach(i => {
      ex(i.ex).grupos.forEach(g => { previsto[g] = (previsto[g] || 0) + (i.series || 0); });
    });
  });

  const nFichas = fichasOrdenadas().length;
  h += `<h2>Volume do ciclo</h2>
    <div class="mini" style="margin:-6px 0 8px">${doCiclo.length} de ${nFichas} treinos da sequência${doCiclo.length ? ' · desde ' + dataBR(doCiclo[doCiclo.length - 1].data) : ''}</div>
    <div class="card">`;
  const grupos = Object.keys(GRUPOS).filter(g => estado.config.alvos[g] > 0 || feito[g]);
  if (!grupos.length) h += `<div class="mini">Nenhuma série registrada ainda.</div>`;
  grupos.forEach(g => {
    const f = feito[g] || 0;
    const p = previsto[g] || 0;
    const alvo = estado.config.alvos[g] || 0;
    const base = Math.max(alvo, f, p) || 1;
    const pctF = Math.min(100, (f / base) * 100);
    const pctP = Math.min(100, (p / base) * 100);
    const cls = !alvo ? '' : (f < alvo * 0.7 ? 'baixo' : (f > alvo * 1.2 ? 'alto' : ''));
    const faltou = p - f;
    h += `<div style="margin-bottom:11px">
      <div class="linha-flex"><span style="font-size:14px">${GRUPOS[g].nome}</span>
        <span class="mini">${f}${alvo ? ' / ' + alvo : ''}${faltou > 0 ? ` <span class="delta-neg">−${faltou}</span>` : ''}</span></div>
      <div class="barra-vol"><i class="${cls}" style="width:${pctF}%"></i>
        ${p ? `<u style="left:${pctP}%" title="previsto ${p}"></u>` : ''}</div>
    </div>`;
  });
  h += `<div class="mini" style="margin-top:4px">A marca clara na barra é o previsto dos treinos já feitos; o número em vermelho é o que ficou faltando por pulo ou troca.</div>`;
  h += `</div>`;

  /* --- progressão por exercício --- */
  h += `<h2>Carga por exercício</h2>`;
  if (!usados.length) {
    h += `<div class="vazio">Nenhum treino registrado${academias().length > 1 ? ' em ' + esc(nomeAcademia(acadSelecionada)) : ''} ainda.</div>`;
    $('#tela-progresso').innerHTML = h;
    return;
  }
  h += `<div class="chips">${usados.map(id =>
    `<button class="${id === exSelecionado ? 'ativo' : ''}" data-acao="sel-ex" data-id="${id}">${esc(ex(id).nome)}</button>`).join('')}</div>`;

  const pontos = sessoesDe(exSelecionado, acadSelecionada).map(s => {
    const ser = s.series.filter(x => x.ex === exSelecionado && x.tipo !== 'aquecimento' && x.carga != null);
    if (!ser.length) return null;
    return {
      data: s.data,
      carga: Math.max(...ser.map(x => x.carga)),
      vol: ser.reduce((a, x) => a + x.carga * (x.reps || 0), 0),
      reps: ser.map(x => x.reps).join('/')
    };
  }).filter(Boolean).reverse();

  h += `<div class="card"><canvas id="grafico"></canvas>
    <div class="mini centro" style="margin-top:4px">carga máxima por sessão (kg)</div></div>`;

  if (pontos.length) {
    const pr = pontos.reduce((a, p) => (p.carga > a.carga ? p : a), pontos[0]);
    const volMax = pontos.reduce((a, p) => (p.vol > a.vol ? p : a), pontos[0]);
    h += `<div class="card">
      <div class="linha-flex"><span class="muted">Recorde de carga</span><b>${fmtNum(pr.carga)} kg <span class="mini">(${dataBR(pr.data)})</span></b></div>
      <div class="linha-flex" style="margin-top:6px"><span class="muted">Maior volume</span><b>${fmtKg(volMax.vol)} kg <span class="mini">(${dataBR(volMax.data)})</span></b></div>
    </div>`;
    h += `<div class="card"><table>
      <tr><th>Data</th><th class="num">Carga</th><th class="num">Reps</th><th class="num">Volume</th></tr>
      ${pontos.slice().reverse().slice(0, 12).map(p =>
        `<tr><td>${dataBR(p.data)}</td><td class="num">${fmtNum(p.carga)}</td><td class="num">${esc(p.reps)}</td><td class="num">${Math.round(p.vol)}</td></tr>`).join('')}
    </table></div>`;
  }

  $('#tela-progresso').innerHTML = h;
  desenharGrafico(pontos);
}

function desenharGrafico(pontos) {
  const c = $('#grafico');
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth, hh = 190;
  c.width = w * dpr; c.height = hh * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, hh);
  /* cores vindas do tema em uso */
  const cs = getComputedStyle(document.documentElement);
  const cor = (n, alt) => (cs.getPropertyValue(n) || '').trim() || alt;
  const COR_ACENTO = cor('--acento', '#4ade80');
  const COR_LINHA = cor('--linha', '#2a2f3a');
  const COR_TXT3 = cor('--txt-3', '#6b7280');
  const COR_AREA = cor('--acento-rgb', '74,222,128');
  if (pontos.length < 1) {
    g.fillStyle = COR_TXT3; g.font = '13px -apple-system, sans-serif'; g.textAlign = 'center';
    g.fillText('Sem dados suficientes', w / 2, hh / 2);
    return;
  }
  const pad = { t: 14, r: 12, b: 24, l: 34 };
  const vals = pontos.map(p => p.carga);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 5; max += 5; }
  const margem = (max - min) * 0.15;
  min = Math.max(0, min - margem); max = max + margem;
  const X = (i) => pad.l + (pontos.length === 1 ? (w - pad.l - pad.r) / 2 : i * (w - pad.l - pad.r) / (pontos.length - 1));
  const Y = (v) => pad.t + (1 - (v - min) / (max - min)) * (hh - pad.t - pad.b);

  g.strokeStyle = COR_LINHA; g.lineWidth = 1;
  g.fillStyle = COR_TXT3; g.font = '10px -apple-system, sans-serif'; g.textAlign = 'right';
  for (let k = 0; k <= 3; k++) {
    const v = min + (max - min) * k / 3, y = Y(v);
    g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke();
    g.fillText(Math.round(v), pad.l - 6, y + 3);
  }

  g.beginPath();
  pontos.forEach((p, i) => { i ? g.lineTo(X(i), Y(p.carga)) : g.moveTo(X(i), Y(p.carga)); });
  g.strokeStyle = COR_ACENTO; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke();

  g.lineTo(X(pontos.length - 1), hh - pad.b); g.lineTo(X(0), hh - pad.b); g.closePath();
  const grad = g.createLinearGradient(0, pad.t, 0, hh - pad.b);
  grad.addColorStop(0, `rgba(${COR_AREA},.22)`); grad.addColorStop(1, `rgba(${COR_AREA},0)`);
  g.fillStyle = grad; g.fill();

  pontos.forEach((p, i) => {
    g.beginPath(); g.arc(X(i), Y(p.carga), 3.2, 0, Math.PI * 2);
    g.fillStyle = COR_ACENTO; g.fill();
  });

  g.fillStyle = COR_TXT3; g.textAlign = 'center'; g.font = '10px -apple-system, sans-serif';
  const passo = Math.max(1, Math.ceil(pontos.length / 6));
  pontos.forEach((p, i) => { if (i % passo === 0 || i === pontos.length - 1) g.fillText(dataBR(p.data), X(i), hh - 8); });
}

/* ================== tela: ajustes ================== */

function renderConfig() {
  const c = estado.config;
  const sem = semanaBloco();
  let h = `<div class="topo"><div><h1>Ajustes</h1><div class="sub">tudo fica salvo neste aparelho</div></div></div>`;

  h += `<h2>Treino</h2><div class="card">
    <div class="detalhes" style="grid-template-columns:1fr 1fr;padding:0">
      <div class="campo largo"><label>Incremento de carga (kg)</label>
        <input type="number" inputmode="decimal" step="0.5" data-cfg="incremento" value="${c.incremento}"></div>
      <div class="campo largo"><label>Início do bloco de 8 semanas</label>
        <input type="date" data-cfg="blocoInicio" value="${c.blocoInicio}"></div>
    </div>
    <div class="mini" style="margin-top:8px">Você está na semana ${sem} de 8${sem === 7 ? ' (deload)' : sem === 8 ? ' (reavaliação)' : ''}.</div>
    <div style="height:10px"></div>
    <button class="fantasma largo" data-acao="reiniciar-bloco">Reiniciar bloco nesta segunda</button>
  </div>`;

  h += `<h2>Academias</h2>
    <div class="mini" style="margin:-6px 0 8px">Cada academia guarda as próprias cargas. As máquinas mudam de uma para outra, então a progressão de uma nunca entra na conta da outra.</div>
    <div class="card">`;
  academias().forEach(a => {
    const nSess = estado.sessoes.filter(x => x.academiaId === a.id).length;
    const principal = a.id === c.academiaId;
    h += `<div style="padding:7px 0;border-bottom:1px solid var(--linha)">
      <div class="linha-flex">
        <input data-acad="${a.id}" value="${esc(a.nome)}"
               style="flex:1;min-width:0;background:var(--card-2);border:1px solid var(--linha);border-radius:8px;padding:9px;color:var(--txt);font-size:15px">
        ${principal ? '<span class="tag verde">principal</span>'
                    : `<button class="pequeno fantasma" data-acao="acad-principal" data-id="${a.id}">tornar principal</button>`}
      </div>
      <div class="linha-flex" style="margin-top:5px">
        <span class="mini">${nSess} treino${nSess === 1 ? '' : 's'} registrado${nSess === 1 ? '' : 's'}</span>
        ${(!principal && !nSess) ? `<button class="pequeno perigo" data-acao="acad-remover" data-id="${a.id}">remover</button>` : ''}
      </div>
    </div>`;
  });
  h += `<div style="height:10px"></div>
    <button class="fantasma largo pequeno" data-acao="acad-nova">+ Adicionar academia</button>
    <div class="mini" style="margin-top:8px">O nome é editável: toque, corrija e o histórico acompanha. Só dá para remover uma academia sem treinos registrados.</div>
  </div>`;

  h += `<div class="card"><div class="linha-flex">
    <span>Registrar peso corporal</span>
    <button class="pequeno ${c.registrarPeso ? 'primario' : 'fantasma'}" data-acao="toggle-peso">${c.registrarPeso ? 'ativado' : 'desativado'}</button>
  </div></div>`;

  h += `<h2>Alvo de volume por ciclo</h2><div class="card">`;
  Object.keys(GRUPOS).forEach(g => {
    h += `<div class="linha-flex" style="padding:5px 0">
      <span style="font-size:14px">${GRUPOS[g].nome}</span>
      <input type="number" inputmode="numeric" data-alvo="${g}" value="${c.alvos[g] ?? 0}"
             style="width:70px;text-align:center;background:var(--card-2);border:1px solid var(--linha);border-radius:8px;padding:7px;color:var(--txt)">
    </div>`;
  });
  h += `<div class="mini" style="margin-top:8px">Séries por ciclo completo (os ${fichasOrdenadas().length} treinos). Zero esconde o grupo do painel.</div></div>`;

  const meus = estado.exercicios.filter(e => e.custom);
  if (meus.length) {
    h += `<h2>Exercícios que você criou</h2><div class="card">`;
    meus.forEach(e => {
      const usado = estado.sessoes.some(x => x.series.some(y => y.ex === e.id));
      h += `<div style="padding:7px 0;border-bottom:1px solid var(--linha)">
        <div class="linha-flex">
          <input data-meuex="${e.id}" value="${esc(e.nome)}"
                 style="flex:1;min-width:0;background:var(--card-2);border:1px solid var(--linha);border-radius:8px;padding:9px;color:var(--txt);font-size:15px">
          ${usado ? '' : `<button class="pequeno perigo" data-acao="ex-remover" data-id="${e.id}">remover</button>`}
        </div>
        <div class="mini" style="margin-top:4px">${e.grupos.map(g => GRUPOS[g] ? GRUPOS[g].nome : g).join(', ') || 'sem grupo muscular'}</div>
      </div>`;
    });
    h += `<div class="mini" style="margin-top:8px">Aparecem na lista de troca e na edição das fichas como qualquer outro.</div></div>`;
  }

  const nSub = Object.keys(estado.substitutos || {}).length;
  if (nSub) {
    h += `<h2>Substituições aprendidas</h2><div class="card">`;
    Object.entries(estado.substitutos).forEach(([exId, lista]) => {
      h += `<div style="padding:5px 0"><div style="font-size:14px">${esc(ex(exId).nome)}</div>
        <div class="mini">→ ${lista.map(id => esc(ex(id).nome)).join(' · ')}</div></div>`;
    });
    h += `<div style="height:8px"></div>
      <button class="fantasma largo pequeno" data-acao="limpar-substitutos">Limpar lista</button></div>`;
  }

  h += `<h2>Backup</h2><div class="card">
    <div class="mini" style="margin-bottom:10px">Os dados ficam só neste aparelho. Se apagar o app ou limpar os dados do navegador, o histórico vai junto — exporte de vez em quando.</div>
    <div class="botoes">
      <button class="fantasma" data-acao="exportar">Exportar</button>
      <button class="fantasma" data-acao="importar">Importar</button>
    </div>
    <input type="file" id="arquivo" accept="application/json,.json" hidden>
  </div>`;

  h += `<h2>Zona de risco</h2><div class="card">
    <button class="perigo largo" data-acao="apagar-tudo">Apagar todos os dados</button>
  </div>`;

  h += `<h2>Versão</h2><div class="card">
    <div class="linha-flex"><span>Versão instalada</span><b>${APP_VERSAO}</b></div>
    <div class="mini" style="margin:8px 0 10px">Se você acabou de publicar uma versão nova e este número não mudou, toque abaixo para buscar do servidor.</div>
    <button class="fantasma largo" data-acao="buscar-atualizacao">Buscar atualização</button>
  </div>`;

  h += `<div class="mini centro" style="margin-top:22px">Treino ${APP_VERSAO} · uso pessoal · dados locais</div>`;

  $('#tela-config').innerHTML = h;
}

/* ================== modal ================== */

let ctxModal = {};
function modal(html, ctx = {}) {
  ctxModal = ctx;
  $('#modal').innerHTML = html;
  $('#modal-fundo').classList.remove('oculto');
  $('#modal').scrollTop = 0;
}
function fecharModal() {
  $('#modal-fundo').classList.add('oculto');
  $('#modal').innerHTML = '';
  ctxModal = {};
}

/* ================== eventos ================== */

document.addEventListener('click', async (ev) => {
  const alvo = ev.target.closest('[data-acao]');
  const navBtn = ev.target.closest('nav button');

  if (navBtn) { irPara(navBtn.dataset.tela); return; }
  if (ev.target.id === 'modal-fundo') { fecharModal(); return; }
  if (ev.target.id === 'btn-finalizar') { finalizarSessao(); return; }
  if (!alvo) return;

  const a = alvo.dataset.acao;
  const u = alvo.dataset.uid;

  if (a === 'ir') irPara(alvo.dataset.tela);
  if (a === 'fechar-modal') fecharModal();

  if (a === 'iniciar') {
    if (estado.sessaoAtiva) {
      modal(`<h3>Já existe um treino em andamento</h3>
        <p class="muted">Finalize ou descarte antes de iniciar outro.</p>
        <div class="botoes"><button class="fantasma" data-acao="fechar-modal">Voltar</button>
        <button class="primario" data-acao="ir-exec">Ir para o treino</button></div>`);
      return;
    }
    iniciarSessao(alvo.dataset.ficha);
  }
  if (a === 'ir-exec') { fecharModal(); irPara('exec'); }
  if (a === 'continuar') irPara('exec');

  if (a === 'abrir') {
    estado.sessaoAtiva.aberto = (estado.sessaoAtiva.aberto === u ? null : u);
    salvar(); renderExec();
  }

  if (a === 'confirmar') {
    const linha = alvo.closest('.serie');
    const uu = linha.dataset.uid, j = +linha.dataset.j;
    const inpCarga = linha.querySelector('[data-campo="carga"]');
    const inpReps = linha.querySelector('[data-campo="reps"]');
    let carga = num(inpCarga.value);
    if (carga == null && inpCarga.dataset.sug) carga = num(inpCarga.dataset.sug);
    if (carga == null) { inpCarga.focus(); toast('Informe a carga.'); return; }
    const item = itemPorUid(uu) || {};
    const reps = num(inpReps.value) ?? item.repMax ?? null;
    gravaSerie(uu, j, { carga, reps });
    inpCarga.blur(); inpReps.blur();
    renderExec();
    return;
  }

  if (a === 'detalhes') {
    alvo.closest('.serie').querySelector('.detalhes').classList.toggle('oculto');
    return;
  }

  if (a === 'criar-e-trocar') {
    const item = itemPorUid(u);
    const nome = ($('#novo-ex-nome') || {}).value;
    if (!nome || !nome.trim()) { toast('Escreva o nome do exercício.'); return; }
    const novoId = criarExercicio(nome, item ? ex(item.ex).grupos : []);
    if (!novoId) { toast('Não deu para criar.'); return; }
    await salvarJa();
    substituirItem(u, novoId);
    return;
  }
  if (a === 'criar-e-acrescentar') {
    const nome = ($('#novo-ex-nome') || {}).value;
    const grupo = ($('#novo-ex-grupo') || {}).value;
    if (!nome || !nome.trim()) { toast('Escreva o nome do exercício.'); return; }
    const novoId = criarExercicio(nome, grupo ? [grupo] : []);
    if (!novoId) { toast('Não deu para criar.'); return; }
    await salvarJa();
    acrescentarExtra(novoId);
    return;
  }
  if (a === 'trocar') { abrirTroca(u); return; }
  if (a === 'confirmar-troca') { substituirItem(u, alvo.dataset.ex); return; }
  if (a === 'add-extra') { abrirExtra(); return; }

  if (a === 'pular') {
    const item = itemPorUid(u);
    if (item) { item.pulado = true; estado.sessaoAtiva.aberto = null; await salvarJa(); renderExec(); }
    return;
  }
  if (a === 'despular') {
    const item = itemPorUid(u);
    if (item) { item.pulado = false; await salvarJa(); renderExec(); }
    return;
  }
  if (a === 'mais-serie') {
    const item = itemPorUid(u);
    if (item) { item.series += 1; await salvarJa(); renderExec(); }
    return;
  }
  if (a === 'rm-extra') {
    const s = estado.sessaoAtiva;
    s.itens = s.itens.filter(i => i.uid !== u);
    s.series = s.series.filter(x => !x.k.startsWith(u + ':'));
    await salvarJa(); renderExec();
    return;
  }

  if (a === 'ver-sessao') verSessao(alvo.dataset.id);
  if (a === 'salvar-sessao') { salvarEdicaoSessao(alvo.dataset.id); return; }
  if (a === 'excluir-sessao') {
    estado.sessoes = estado.sessoes.filter(s => s.id !== alvo.dataset.id);
    await salvarJa(); fecharModal(); toast('Treino excluído.'); render();
  }
  if (a === 'descartar') {
    estado.sessaoAtiva = null; await salvarJa(); fecharModal(); toast('Treino descartado.'); irPara('inicio');
  }
  if (a === 'filtro-ficha') { filtroFicha = alvo.dataset.id || null; renderHistorico(); return; }

  if (a === 'editar-ficha') editarFicha(alvo.dataset.id);
  if (a === 'rm-item') {
    const f = ficha(ctxModal.fichaId);
    lerFormFicha(f);
    f.itens.splice(+alvo.dataset.i, 1);
    salvar(); editarFicha(f.id);
  }
  if (a === 'salvar-ficha') {
    lerFormFicha(ficha(alvo.dataset.id));
    await salvarJa(); fecharModal(); toast('Ficha salva.'); render();
  }
  if (a === 'excluir-ficha') {
    estado.fichas = estado.fichas.filter(f => f.id !== alvo.dataset.id);
    await salvarJa(); fecharModal(); toast('Ficha excluída.'); render();
  }
  if (a === 'nova-ficha') {
    const nova = { id: uid(), nome: 'Nova ficha', subtitulo: '', ordem: fichasOrdenadas().length + 1, itens: [] };
    estado.fichas.push(nova); await salvarJa(); editarFicha(nova.id);
  }
  if (a === 'toggle-reintro') {
    const r = estado.reintroducao[+alvo.dataset.i];
    r.status = r.status === 'ativo' ? 'aguardando' : 'ativo';
    await salvarJa(); render();
  }

  if (a === 'sel-ex') { exSelecionado = alvo.dataset.id; renderProgresso(); }

  if (a === 'acad-nova') {
    modal(`<h3>Nova academia</h3>
      <div class="muted" style="margin-top:-8px">Ela começa sem histórico: as cargas da primeira ida você digita, e a partir daí o app acompanha a progressão separadamente.</div>
      <div style="height:14px"></div>
      <div class="campo"><label>Nome</label>
        <input id="nova-acad" type="text" placeholder="ex.: Smart Fit Centro" autocapitalize="words"></div>
      <div style="height:14px"></div>
      <div class="botoes">
        <button class="fantasma" data-acao="fechar-modal">Cancelar</button>
        <button class="primario" data-acao="acad-criar">Adicionar</button>
      </div>`);
    setTimeout(() => { const el = $('#nova-acad'); if (el) el.focus(); }, 120);
    return;
  }
  if (a === 'acad-criar') {
    const nome = (($('#nova-acad') || {}).value || '').trim();
    if (!nome) { toast('Escreva o nome.'); return; }
    if (academias().some(x => x.nome.toLowerCase() === nome.toLowerCase())) {
      toast('Já existe uma academia com esse nome.'); return;
    }
    let id = slugAcademia(nome);
    while (academias().some(x => x.id === id)) id += '-' + Math.random().toString(36).slice(2, 4);
    estado.config.academias.push({ id, nome });
    await salvarJa(); fecharModal(); toast(nome + ' adicionada.'); render();
    return;
  }
  if (a === 'acad-principal') {
    estado.config.academiaId = alvo.dataset.id;
    await salvarJa(); toast(nomeAcademia(alvo.dataset.id) + ' é a principal.'); render();
    return;
  }
  if (a === 'acad-remover') {
    const id = alvo.dataset.id;
    if (estado.sessoes.some(x => x.academiaId === id)) { toast('Tem treinos registrados nela.'); return; }
    estado.config.academias = academias().filter(x => x.id !== id);
    await salvarJa(); toast('Academia removida.'); render();
    return;
  }
  if (a === 'ex-remover') {
    const id = alvo.dataset.id;
    if (estado.sessoes.some(x => x.series.some(y => y.ex === id))) { toast('Esse exercício já tem séries registradas.'); return; }
    estado.exercicios = estado.exercicios.filter(e => e.id !== id);
    estado.fichas.forEach(f => { f.itens = f.itens.filter(i => i.ex !== id); });
    await salvarJa(); toast('Exercício removido.'); render();
    return;
  }
  if (a === 'sel-acad') { acadSelecionada = alvo.dataset.id; renderProgresso(); return; }

  if (a === 'toggle-peso') { estado.config.registrarPeso = !estado.config.registrarPeso; await salvarJa(); render(); }
  if (a === 'limpar-substitutos') { estado.substitutos = {}; await salvarJa(); toast('Lista limpa.'); render(); }
  if (a === 'reiniciar-bloco') {
    const hoje = new Date(); const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
    estado.config.blocoInicio = iso(seg);
    await salvarJa(); toast('Bloco reiniciado na semana 1.'); render();
  }
  if (a === 'buscar-atualizacao') {
    toast('Procurando...');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update()));
      }
      if (window.caches) {
        const chaves = await caches.keys();
        await Promise.all(chaves.map(k => caches.delete(k)));
      }
    } catch (e) { /* segue mesmo assim */ }
    location.replace(location.pathname + '?r=' + Date.now());
    return;
  }
  if (a === 'exportar') exportarJSON();
  if (a === 'importar') $('#arquivo').click();
  if (a === 'apagar-tudo') {
    modal(`<h3>Apagar todos os dados?</h3>
      <p class="muted">Histórico, fichas e ajustes. Não tem como desfazer. Exporte antes se quiser guardar.</p>
      <div class="botoes"><button class="fantasma" data-acao="fechar-modal">Cancelar</button>
      <button class="perigo" data-acao="apagar-confirma">Apagar tudo</button></div>`);
  }
  if (a === 'apagar-confirma') {
    estado = estadoInicial(); await salvarJa(); fecharModal(); toast('Dados apagados.'); irPara('inicio');
  }
});

function lerFormFicha(f) {
  if (!f) return;
  const m = $('#modal');
  const g = (k) => { const el = m.querySelector(`[data-f="${k}"]`); return el ? el.value : null; };
  if (g('nome') != null) f.nome = g('nome');
  if (g('subtitulo') != null) f.subtitulo = g('subtitulo');
  if (g('nota') != null) f.nota = g('nota');
  if (g('ordem') != null) f.ordem = +g('ordem');
  $$('[data-it]', m).forEach(inp => {
    const it = f.itens[+inp.dataset.it];
    if (!it) return;
    const v = num(inp.value);
    if (inp.dataset.c === 'rirMax') {
      it.rirMax = v;
      if (it.rirMin != null && v != null && it.rirMin > v) it.rirMin = v;
    } else if (v != null) it[inp.dataset.c] = v;
  });
}

document.addEventListener('change', async (ev) => {
  const t = ev.target;

  if (t.dataset.acao === 'add-item' && t.value) {
    const f = ficha(ctxModal.fichaId);
    lerFormFicha(f);
    f.itens.push({ ex: t.value, series: 3, repMin: 8, repMax: 8, rirMax: 1 });
    await salvarJa(); editarFicha(f.id);
    return;
  }
  if (t.dataset.acao === 'troca-outro' && t.value) { substituirItem(t.dataset.uid, t.value); return; }
  if (t.dataset.acao === 'extra-escolhido' && t.value) { acrescentarExtra(t.value); return; }

  if (t.dataset.campo === 'academia') { estado.sessaoAtiva.academiaId = t.value; salvar(); renderExec(); return; }
  if (t.dataset.campo === 'peso')     { estado.sessaoAtiva.pesoCorporal = num(t.value); salvar(); return; }
  if (t.dataset.campo === 'obs-sessao') { estado.sessaoAtiva.obs = t.value; salvar(); return; }

  if (t.dataset.campo && t.closest('.serie')) {
    const linha = t.closest('.serie');
    const uu = linha.dataset.uid, j = +linha.dataset.j;
    const c = t.dataset.campo;
    const v = (c === 'tipo' || c === 'obs') ? t.value : num(t.value);
    if ((c === 'carga' || c === 'reps') && v == null) return;
    gravaSerie(uu, j, { [c]: v });
    if (c === 'carga') renderExec();
    return;
  }

  if (t.dataset.cfg) {
    const c = t.dataset.cfg;
    estado.config[c] = (c === 'incremento') ? (num(t.value) || 2.5) : t.value;
    await salvarJa(); toast('Salvo.');
    return;
  }
  if (t.dataset.alvo) { estado.config.alvos[t.dataset.alvo] = num(t.value) || 0; await salvarJa(); return; }

  if (t.dataset.acad) {
    const nome = (t.value || '').trim();
    const a = academias().find(x => x.id === t.dataset.acad);
    if (a && nome) { a.nome = nome; await salvarJa(); toast('Renomeada.'); render(); }
    else { render(); }
    return;
  }
  if (t.dataset.meuex) {
    const nome = (t.value || '').trim();
    const e = estado.exercicios.find(x => x.id === t.dataset.meuex);
    if (e && nome) { e.nome = nome; await salvarJa(); toast('Renomeado.'); render(); }
    else { render(); }
    return;
  }

  if (t.id === 'arquivo' && t.files[0]) {
    try {
      await importarJSON(await t.files[0].text());
      toast('Backup importado.'); irPara('inicio');
    } catch (e) { toast('Falhou: ' + e.message); }
    t.value = '';
  }
});

window.addEventListener('resize', () => { if (telaAtual === 'progresso') renderProgresso(); });

/* ================== início ================== */

(async function () {
  await carregarEstado();
  irPara(estado.sessaoAtiva ? 'exec' : 'inicio');
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      /* procura versão nova a cada abertura e quando o app volta do fundo */
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
    } catch (e) { /* ok sem offline */ }
  }
})();
