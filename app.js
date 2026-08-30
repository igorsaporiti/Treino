/* ================== utilidades ================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const fmtNum = (n) => (n == null ? '—' : String(Math.round(n * 100) / 100).replace('.', ','));

function dataBR(s) {
  const [a, m, d] = s.split('-');
  return `${d}/${m}`;
}
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

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('ver');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('ver'), 2200);
}

function ex(id) { return estado.exercicios.find(e => e.id === id) || { id, nome: id, grupos: [] }; }
function ficha(id) { return estado.fichas.find(f => f.id === id); }

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

/* ================== prescrição / histórico ================== */

function textoPresc(item) {
  const e = ex(item.ex);
  const un = e.unidade === 'seg' ? 's' : '';
  const faixa = item.repMin === item.repMax ? item.repMin + un : `${item.repMin}-${item.repMax}${un}`;
  let t = `${item.series}x${faixa}`;
  if (item.rirMin != null) t += ' · RIR ' + (item.rirMin === item.rirMax ? item.rirMin : `${item.rirMin}-${item.rirMax}`);
  return t;
}

/* sessões passadas (mais recente primeiro), opcionalmente só da academia habitual */
function sessoesDe(exId, soHabitual = true) {
  const hab = estado.config.academiaPadrao;
  return estado.sessoes
    .filter(s => (!soHabitual || s.academia === hab) && s.series.some(x => x.ex === exId && x.carga != null))
    .sort((a, b) => (a.data < b.data ? 1 : -1));
}

function ultimaVez(exId) {
  const s = sessoesDe(exId, true)[0];
  if (!s) return null;
  const series = s.series.filter(x => x.ex === exId && x.carga != null && x.tipo !== 'aquecimento');
  if (!series.length) return null;
  return { data: s.data, series, academia: s.academia };
}

/* sugestão de progressão dupla */
function sugestao(item) {
  const u = ultimaVez(item.ex);
  if (!u) return null;
  const validas = u.series.filter(x => x.tipo !== 'aquecimento');
  if (!validas.length) return null;
  const fechouTopo = validas.every(x => x.reps != null && x.reps >= item.repMax);
  const cargas = validas.map(x => x.carga).filter(c => c != null);
  if (!cargas.length) return null;
  const carga = Math.max(...cargas);
  if (fechouTopo) {
    return { tipo: 'subir', carga: carga + estado.config.incremento, de: carga };
  }
  return { tipo: 'manter', carga };
}

/* ================== navegação ================== */

let telaAtual = 'inicio';

function irPara(nome) {
  telaAtual = nome;
  $$('.tela').forEach(t => t.classList.remove('ativa'));
  const alvo = $('#tela-' + (nome === 'exec' ? 'exec' : nome));
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
  const diaSemana = hoje.getDay() === 0 ? 7 : hoje.getDay();
  const sem = semanaBloco();
  const fase = faseBloco(sem);
  const doDia = estado.fichas.find(f => f.dia === diaSemana);
  const ativa = estado.sessaoAtiva;

  let h = `<div class="topo">
    <div><h1>${DIAS[hoje.getDay()]}</h1>
    <div class="sub">${dataBRLonga(hojeISO())}</div></div>
    <span class="tag ${fase.classe}">${fase.rotulo}</span>
  </div>`;

  if (fase.deload) {
    h += `<div class="aviso"><span>▼</span><span>Semana de deload: o app já reduziu as séries em 40%. Mantenha as cargas.</span></div>`;
  }
  if (sem === 8) {
    h += `<div class="aviso"><span>◆</span><span>Semana de reavaliação — fim do bloco. Revise as fichas antes de começar o próximo.</span></div>`;
  }

  if (ativa) {
    const f = ficha(ativa.fichaId);
    const feitas = ativa.series.filter(s => s.carga != null).length;
    h += `<h2>Em andamento</h2>
    <div class="card">
      <div class="linha-flex">
        <div class="col"><b>${esc(f ? f.nome : 'Treino')}</b>
        <span class="muted">${feitas} série${feitas === 1 ? '' : 's'} registrada${feitas === 1 ? '' : 's'} · ${esc(ativa.academia)}</span></div>
      </div>
      <div style="height:10px"></div>
      <button class="primario largo" data-acao="continuar">Continuar treino</button>
    </div>`;
  } else if (doDia) {
    h += `<h2>Treino de hoje</h2>
    <div class="card">
      <div class="col">
        <b style="font-size:18px">${esc(doDia.nome)}</b>
        <span class="muted">${esc(doDia.subtitulo || '')}</span>
      </div>
      <div class="mini" style="margin-top:8px">${doDia.itens.length} exercícios · ${doDia.itens.reduce((a, i) => a + seriesAlvo(i, sem), 0)} séries</div>
      ${doDia.nota ? `<div class="aviso"><span>›</span><span>${esc(doDia.nota)}</span></div>` : ''}
      <div style="height:12px"></div>
      <button class="primario largo" data-acao="iniciar" data-ficha="${doDia.id}">Iniciar ${esc(doDia.nome)}</button>
    </div>`;
  } else {
    h += `<h2>Hoje</h2>
    <div class="card centro">
      <div style="font-size:30px">☾</div>
      <b>Dia de descanso</b>
      <div class="muted">Nenhuma ficha marcada para hoje.</div>
    </div>`;
  }

  h += `<h2>Iniciar outro treino</h2>`;
  estado.fichas.forEach(f => {
    if (doDia && f.id === doDia.id && !ativa) return;
    h += `<div class="card clicavel" data-acao="iniciar" data-ficha="${f.id}">
      <div class="linha-flex">
        <div class="col"><b>${esc(f.nome)}</b><span class="mini">${esc(f.subtitulo || '')}</span></div>
        <span class="mini">${DIAS_CURTO[f.dia % 7]} · ${f.itens.length} ex.</span>
      </div>
    </div>`;
  });

  const ult = estado.sessoes.slice().sort((a, b) => (a.data < b.data ? 1 : -1))[0];
  if (ult) {
    const f = ficha(ult.fichaId);
    h += `<h2>Último treino</h2>
    <div class="card clicavel" data-acao="ver-sessao" data-id="${ult.id}">
      <div class="linha-flex">
        <div class="col"><b>${esc(f ? f.nome : 'Treino')}</b>
        <span class="mini">${dataBRLonga(ult.data)} · ${ult.series.filter(s => s.carga != null).length} séries</span></div>
        <span class="mini">›</span>
      </div>
    </div>`;
  }

  $('#tela-inicio').innerHTML = h;
}

/* ================== tela: execução ================== */

function iniciarSessao(fichaId) {
  const f = ficha(fichaId);
  if (!f) return;
  const sem = semanaBloco();
  estado.sessaoAtiva = {
    id: uid(),
    data: hojeISO(),
    fichaId,
    academia: estado.config.academiaPadrao,
    semanaBloco: sem,
    inicio: Date.now(),
    pesoCorporal: null,
    obs: '',
    series: [],
    aberto: 0
  };
  salvar();
  irPara('exec');
}

function chaveSerie(i, j) { return i + ':' + j; }
function achaSerie(i, j) {
  return estado.sessaoAtiva.series.find(s => s.k === chaveSerie(i, j));
}
function gravaSerie(i, j, dados) {
  const s = estado.sessaoAtiva;
  let r = achaSerie(i, j);
  if (!r) { r = { k: chaveSerie(i, j) }; s.series.push(r); }
  Object.assign(r, dados);
  salvar();
}

function renderExec() {
  const s = estado.sessaoAtiva;
  const el = $('#tela-exec');
  if (!s) {
    el.innerHTML = `<div class="vazio">Nenhum treino em andamento.<br><br>
      <button class="primario" data-acao="ir" data-tela="inicio">Ir para o início</button></div>`;
    return;
  }
  const f = ficha(s.fichaId);
  const sem = s.semanaBloco;
  const fase = faseBloco(sem);

  let h = `<div class="topo">
    <div><h1>${esc(f.nome)}</h1><div class="sub">${esc(f.subtitulo || '')} · ${dataBR(s.data)}</div></div>
    <span class="tag ${fase.classe}">${fase.deload ? 'DELOAD' : 'S' + sem}</span>
  </div>`;

  h += `<div class="card">
    <div class="detalhes" style="padding:0">
      <div class="campo"><label>Academia</label>
        <select data-campo="academia">
          ${estado.config.academias.map(a => `<option ${a === s.academia ? 'selected' : ''}>${esc(a)}</option>`).join('')}
        </select></div>
      ${estado.config.registrarPeso ? `<div class="campo"><label>Peso (kg)</label>
        <input type="number" inputmode="decimal" data-campo="peso" value="${s.pesoCorporal ?? ''}" placeholder="—"></div>` : ''}
    </div>
    ${s.academia !== estado.config.academiaPadrao
      ? `<div class="aviso"><span>!</span><span>Fora da academia habitual: estas cargas não entram nos gráficos de progressão.</span></div>` : ''}
  </div>`;

  if (f.nota) h += `<div class="aviso"><span>›</span><span>${esc(f.nota)}</span></div><div style="height:10px"></div>`;

  f.itens.forEach((item, i) => {
    const e = ex(item.ex);
    const alvo = seriesAlvo(item, sem);
    const feitas = Array.from({ length: alvo }, (_, j) => achaSerie(i, j)).filter(r => r && r.carga != null).length;
    const completo = feitas >= alvo;
    const aberto = s.aberto === i;
    const sug = sugestao(item);
    const u = ultimaVez(item.ex);
    const unSeg = e.unidade === 'seg';

    h += `<div class="ex-bloco ${completo && !aberto ? 'feito' : ''}" data-bloco="${i}">
      <div class="ex-cab" data-acao="abrir" data-i="${i}">
        <div class="col">
          <span class="ex-nome">${esc(e.nome)}</span>
          <span class="ex-presc">${textoPresc({ ...item, series: alvo })}</span>
        </div>
        <div style="text-align:right;white-space:nowrap">
          ${completo ? '<span class="tag verde">✓</span>' : `<span class="mini">${feitas}/${alvo}</span>`}
        </div>
      </div>
      <div class="ex-corpo ${aberto ? '' : 'oculto'}">`;

    if (e.aviso) h += `<div class="aviso"><span>⚠</span><span>${esc(e.aviso)}</span></div>`;

    if (u) {
      const desc = u.series.map(x => fmtNum(x.carga) + (x.reps != null ? '×' + x.reps : '')).join(' · ');
      h += `<div class="ult-vez">Última vez (${dataBR(u.data)}): <b>${desc}</b></div>`;
    } else {
      h += `<div class="ult-vez">Primeiro registro deste exercício.</div>`;
    }
    if (sug && sug.tipo === 'subir') {
      h += `<div class="aviso" style="background:var(--acento-esc);color:var(--acento)">
        <span>↑</span><span>Fechou o topo da faixa. Sugestão: <b>${fmtNum(sug.carga)} kg</b> e voltar a ${item.repMin} reps.</span></div>`;
    }

    for (let j = 0; j < alvo; j++) {
      const r = achaSerie(i, j) || {};
      const ok = r.carga != null;
      const cargaSug = r.carga != null ? r.carga : (sug ? (sug.tipo === 'subir' ? sug.carga : sug.carga) : '');
      const repsPad = r.reps != null ? r.reps : item.repMax;
      const temDet = r.rir != null || (r.tipo && r.tipo !== 'valida') || r.obs || r.descanso != null;
      h += `<div class="serie ${ok ? 'ok' : ''}" data-i="${i}" data-j="${j}">
        <div class="n">${j + 1}</div>
        <input class="carga" type="number" inputmode="decimal" step="0.5" placeholder="kg"
               value="${r.carga != null ? r.carga : ''}" data-campo="carga"
               ${r.carga == null && cargaSug !== '' ? `data-sug="${cargaSug}"` : ''}>
        <input class="carga" style="width:62px" type="number" inputmode="numeric" step="1"
               value="${r.reps != null ? r.reps : ''}" placeholder="${unSeg ? repsPad + 's' : repsPad}" data-campo="reps">
        <button class="btn-ok ${ok ? 'primario' : 'pendente'}" data-acao="confirmar">✓</button>
        <button class="btn-det ${temDet ? 'marcado' : ''}" data-acao="detalhes">⋯</button>
        <div class="detalhes oculto" data-det="${i}:${j}">
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
    h += `</div></div>`;
  });

  h += `<div class="card"><div class="campo"><label>Observações do treino</label>
    <textarea rows="3" data-campo="obs-sessao" placeholder="opcional">${esc(s.obs || '')}</textarea></div></div>`;
  h += `<div style="height:70px"></div>`;

  el.innerHTML = h;
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
  const f = ficha(s.fichaId);
  const sessao = {
    id: s.id, data: s.data, fichaId: s.fichaId, academia: s.academia,
    semanaBloco: s.semanaBloco, pesoCorporal: s.pesoCorporal, obs: s.obs,
    duracao: Math.round((Date.now() - s.inicio) / 60000),
    series: s.series.filter(x => x.carga != null).map(x => {
      const [i, j] = x.k.split(':').map(Number);
      const item = f.itens[i];
      return {
        ex: item.ex, ordem: i, serie: j,
        carga: x.carga, reps: x.reps ?? item.repMax,
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
  let h = `<div class="topo"><div><h1>Fichas</h1>
    <div class="sub">${estado.fichas.length} treinos · toque para editar</div></div></div>`;
  estado.fichas.forEach(f => {
    h += `<div class="card clicavel" data-acao="editar-ficha" data-id="${f.id}">
      <div class="linha-flex">
        <div class="col"><b>${esc(f.nome)}</b><span class="mini">${esc(f.subtitulo || '')}</span></div>
        <span class="tag">${DIAS_CURTO[f.dia % 7]}</span>
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
    <div class="campo largo"><label>Dia da semana</label>
      <select data-f="dia">${[1,2,3,4,5,6,7].map(d =>
        `<option value="${d}" ${f.dia === d ? 'selected' : ''}>${DIAS[d % 7]}</option>`).join('')}
        <option value="0" ${!f.dia ? 'selected' : ''}>Sem dia fixo</option></select></div>
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

function renderHistorico() {
  const ss = estado.sessoes.slice().sort((a, b) => (a.data < b.data ? 1 : -1));
  let h = `<div class="topo"><div><h1>Histórico</h1>
    <div class="sub">${ss.length} treino${ss.length === 1 ? '' : 's'} registrado${ss.length === 1 ? '' : 's'}</div></div></div>`;
  if (!ss.length) {
    h += `<div class="vazio">Nenhum treino registrado ainda.</div>`;
  } else {
    let mesAtual = '';
    ss.forEach(s => {
      const mes = s.data.slice(0, 7);
      if (mes !== mesAtual) {
        mesAtual = mes;
        const [a, m] = mes.split('-');
        h += `<h2>${['','janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][+m]} ${a}</h2>`;
      }
      const f = ficha(s.fichaId);
      const vol = s.series.reduce((acc, x) => acc + (x.carga || 0) * (x.reps || 0), 0);
      h += `<div class="card clicavel" data-acao="ver-sessao" data-id="${s.id}">
        <div class="linha-flex">
          <div class="col"><b>${esc(f ? f.nome : 'Treino')}</b>
            <span class="mini">${dataBRLonga(s.data)}${s.academia !== estado.config.academiaPadrao ? ' · ' + esc(s.academia) : ''}</span></div>
          <div style="text-align:right"><div class="mini">${s.series.length} séries</div>
            <div class="mini">${Math.round(vol).toLocaleString('pt-BR')} kg vol.</div></div>
        </div>
      </div>`;
    });
  }
  $('#tela-historico').innerHTML = h;
}

function verSessao(id) {
  const s = estado.sessoes.find(x => x.id === id);
  if (!s) return;
  const f = ficha(s.fichaId);
  const porEx = {};
  s.series.forEach(x => { (porEx[x.ex] = porEx[x.ex] || []).push(x); });
  let h = `<h3>${esc(f ? f.nome : 'Treino')}</h3>
    <div class="muted" style="margin-top:-8px">${dataBRLonga(s.data)} · ${esc(s.academia)}${s.duracao ? ' · ' + s.duracao + ' min' : ''}${s.pesoCorporal ? ' · ' + fmtNum(s.pesoCorporal) + ' kg' : ''}</div>
    <div style="height:14px"></div>`;
  Object.entries(porEx).forEach(([exId, series]) => {
    h += `<div class="card" style="padding:11px">
      <b style="font-size:14.5px">${esc(ex(exId).nome)}</b>
      <table style="margin-top:6px"><tr><th>#</th><th class="num">Carga</th><th class="num">Reps</th><th class="num">RIR</th><th>Tipo</th></tr>
      ${series.map((x, k) => `<tr><td>${k + 1}</td><td class="num">${fmtNum(x.carga)}</td><td class="num">${x.reps ?? '—'}</td>
        <td class="num">${x.rir ?? '—'}</td><td>${x.tipo === 'valida' ? '' : esc(x.tipo)}</td></tr>`).join('')}
      </table>
      ${series.filter(x => x.obs).map(x => `<div class="mini" style="margin-top:6px">${esc(x.obs)}</div>`).join('')}
    </div>`;
  });
  if (s.obs) h += `<div class="card"><div class="mini">Observações</div>${esc(s.obs)}</div>`;
  h += `<div style="height:10px"></div>
    <div class="botoes"><button class="fantasma" data-acao="fechar-modal">Fechar</button>
    <button class="perigo" data-acao="excluir-sessao" data-id="${s.id}">Excluir</button></div>`;
  modal(h);
}

/* ================== tela: progressão ================== */

let exSelecionado = null;

function renderProgresso() {
  const usados = [...new Set(estado.sessoes.flatMap(s => s.series.map(x => x.ex)))];
  if (!exSelecionado || !usados.includes(exSelecionado)) exSelecionado = usados[0] || null;

  let h = `<div class="topo"><div><h1>Progresso</h1>
    <div class="sub">só a academia habitual entra nos gráficos</div></div></div>`;

  /* volume semanal */
  const hoje = new Date();
  const seg = new Date(hoje); seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const inicioSemana = iso(seg);
  const contagem = {};
  estado.sessoes.filter(s => s.data >= inicioSemana).forEach(s => {
    s.series.filter(x => x.tipo !== 'aquecimento').forEach(x => {
      ex(x.ex).grupos.forEach(g => { contagem[g] = (contagem[g] || 0) + 1; });
    });
  });
  h += `<h2>Volume desta semana</h2><div class="card">`;
  const grupos = Object.keys(GRUPOS).filter(g => estado.config.alvos[g] > 0 || contagem[g]);
  if (!grupos.length) h += `<div class="mini">Nenhuma série registrada esta semana.</div>`;
  grupos.forEach(g => {
    const feito = contagem[g] || 0;
    const alvo = estado.config.alvos[g] || 0;
    const pct = alvo ? Math.min(100, (feito / alvo) * 100) : 0;
    const cls = !alvo ? '' : (feito < alvo * 0.7 ? 'baixo' : (feito > alvo * 1.2 ? 'alto' : ''));
    h += `<div style="margin-bottom:11px">
      <div class="linha-flex"><span style="font-size:14px">${GRUPOS[g].nome}</span>
        <span class="mini">${feito}${alvo ? ' / ' + alvo : ''}</span></div>
      <div class="barra-vol"><i class="${cls}" style="width:${pct}%"></i></div>
    </div>`;
  });
  h += `</div>`;

  /* progressão por exercício */
  h += `<h2>Carga por exercício</h2>`;
  if (!usados.length) {
    h += `<div class="vazio">Registre alguns treinos para ver a progressão.</div>`;
    $('#tela-progresso').innerHTML = h;
    return;
  }
  h += `<div class="chips">${usados.map(id =>
    `<button class="${id === exSelecionado ? 'ativo' : ''}" data-acao="sel-ex" data-id="${id}">${esc(ex(id).nome)}</button>`).join('')}</div>`;

  const pontos = sessoesDe(exSelecionado, true).map(s => {
    const ser = s.series.filter(x => x.ex === exSelecionado && x.tipo !== 'aquecimento' && x.carga != null);
    if (!ser.length) return null;
    const maxC = Math.max(...ser.map(x => x.carga));
    const vol = ser.reduce((a, x) => a + x.carga * (x.reps || 0), 0);
    return { data: s.data, carga: maxC, vol, reps: ser.map(x => x.reps).join('/') };
  }).filter(Boolean).reverse();

  h += `<div class="card"><canvas id="grafico"></canvas>
    <div class="mini centro" style="margin-top:4px">carga máxima por sessão (kg)</div></div>`;

  if (pontos.length) {
    const pr = pontos.reduce((a, p) => (p.carga > a.carga ? p : a), pontos[0]);
    const volMax = pontos.reduce((a, p) => (p.vol > a.vol ? p : a), pontos[0]);
    h += `<div class="card">
      <div class="linha-flex"><span class="muted">Recorde de carga</span><b>${fmtNum(pr.carga)} kg <span class="mini">(${dataBR(pr.data)})</span></b></div>
      <div class="linha-flex" style="margin-top:6px"><span class="muted">Maior volume</span><b>${Math.round(volMax.vol).toLocaleString('pt-BR')} kg <span class="mini">(${dataBR(volMax.data)})</span></b></div>
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
  if (pontos.length < 1) {
    g.fillStyle = '#6b7280'; g.font = '13px -apple-system, sans-serif'; g.textAlign = 'center';
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

  g.strokeStyle = '#2a2f3a'; g.lineWidth = 1;
  g.fillStyle = '#6b7280'; g.font = '10px -apple-system, sans-serif'; g.textAlign = 'right';
  for (let k = 0; k <= 3; k++) {
    const v = min + (max - min) * k / 3, y = Y(v);
    g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke();
    g.fillText(Math.round(v), pad.l - 6, y + 3);
  }

  g.beginPath();
  pontos.forEach((p, i) => { i ? g.lineTo(X(i), Y(p.carga)) : g.moveTo(X(i), Y(p.carga)); });
  g.strokeStyle = '#4ade80'; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke();

  g.lineTo(X(pontos.length - 1), hh - pad.b); g.lineTo(X(0), hh - pad.b); g.closePath();
  const grad = g.createLinearGradient(0, pad.t, 0, hh - pad.b);
  grad.addColorStop(0, 'rgba(74,222,128,.22)'); grad.addColorStop(1, 'rgba(74,222,128,0)');
  g.fillStyle = grad; g.fill();

  pontos.forEach((p, i) => {
    g.beginPath(); g.arc(X(i), Y(p.carga), 3.2, 0, Math.PI * 2);
    g.fillStyle = '#4ade80'; g.fill();
  });

  g.fillStyle = '#6b7280'; g.textAlign = 'center'; g.font = '10px -apple-system, sans-serif';
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
      <div class="campo"><label>Incremento de carga (kg)</label>
        <input type="number" inputmode="decimal" step="0.5" data-cfg="incremento" value="${c.incremento}"></div>
      <div class="campo"><label>Academia habitual</label>
        <input data-cfg="academiaPadrao" value="${esc(c.academiaPadrao)}"></div>
      <div class="campo largo"><label>Início do bloco de 8 semanas</label>
        <input type="date" data-cfg="blocoInicio" value="${c.blocoInicio}"></div>
    </div>
    <div class="mini" style="margin-top:8px">Você está na semana ${sem} de 8${sem === 7 ? ' (deload)' : sem === 8 ? ' (reavaliação)' : ''}.</div>
    <div style="height:10px"></div>
    <button class="fantasma largo" data-acao="reiniciar-bloco">Reiniciar bloco a partir desta segunda</button>
  </div>`;

  h += `<div class="card"><div class="linha-flex">
    <span>Registrar peso corporal</span>
    <button class="pequeno ${c.registrarPeso ? 'primario' : 'fantasma'}" data-acao="toggle-peso">${c.registrarPeso ? 'ativado' : 'desativado'}</button>
  </div></div>`;

  h += `<h2>Alvo de volume semanal</h2><div class="card">`;
  Object.keys(GRUPOS).forEach(g => {
    h += `<div class="linha-flex" style="padding:5px 0">
      <span style="font-size:14px">${GRUPOS[g].nome}</span>
      <input type="number" inputmode="numeric" data-alvo="${g}" value="${c.alvos[g] ?? 0}"
             style="width:70px;text-align:center;background:var(--card-2);border:1px solid var(--linha);border-radius:8px;padding:7px;color:var(--txt)">
    </div>`;
  });
  h += `<div class="mini" style="margin-top:8px">Séries por semana. Zero esconde o grupo do painel.</div></div>`;

  h += `<h2>Backup</h2><div class="card">
    <div class="mini" style="margin-bottom:10px">Os dados ficam só neste aparelho. Se apagar o app ou limpar os dados do Safari, o histórico vai junto — exporte de vez em quando.</div>
    <div class="botoes">
      <button class="fantasma" data-acao="exportar">Exportar</button>
      <button class="fantasma" data-acao="importar">Importar</button>
    </div>
    <input type="file" id="arquivo" accept="application/json,.json" hidden>
  </div>`;

  h += `<h2>Zona de risco</h2><div class="card">
    <button class="perigo largo" data-acao="apagar-tudo">Apagar todos os dados</button>
  </div>`;

  h += `<div class="mini centro" style="margin-top:22px">Treino · uso pessoal · dados locais</div>`;

  $('#tela-config').innerHTML = h;
}

/* ================== modal ================== */

let ctxModal = {};
function modal(html, ctx = {}) {
  ctxModal = ctx;
  $('#modal').innerHTML = html;
  $('#modal-fundo').classList.remove('oculto');
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
    const i = +alvo.dataset.i;
    estado.sessaoAtiva.aberto = (estado.sessaoAtiva.aberto === i ? -1 : i);
    salvar(); renderExec();
  }

  if (a === 'confirmar') {
    const linha = alvo.closest('.serie');
    const i = +linha.dataset.i, j = +linha.dataset.j;
    const inpCarga = linha.querySelector('[data-campo="carga"]');
    const inpReps = linha.querySelector('[data-campo="reps"]');
    let carga = num(inpCarga.value);
    if (carga == null && inpCarga.dataset.sug) carga = num(inpCarga.dataset.sug);
    if (carga == null) { inpCarga.focus(); toast('Informe a carga.'); return; }
    const f = ficha(estado.sessaoAtiva.fichaId);
    const reps = num(inpReps.value) ?? f.itens[i].repMax;
    gravaSerie(i, j, { carga, reps });
    inpCarga.blur(); inpReps.blur();
    renderExec();
    return;
  }

  if (a === 'detalhes') {
    const linha = alvo.closest('.serie');
    linha.querySelector('.detalhes').classList.toggle('oculto');
    return;
  }

  if (a === 'ver-sessao') verSessao(alvo.dataset.id);
  if (a === 'excluir-sessao') {
    estado.sessoes = estado.sessoes.filter(s => s.id !== alvo.dataset.id);
    await salvarJa(); fecharModal(); toast('Sessão excluída.'); render();
  }
  if (a === 'descartar') {
    estado.sessaoAtiva = null; await salvarJa(); fecharModal(); toast('Treino descartado.'); irPara('inicio');
  }

  if (a === 'editar-ficha') editarFicha(alvo.dataset.id);
  if (a === 'rm-item') {
    const f = ficha(ctxModal.fichaId);
    lerFormFicha(f);
    f.itens.splice(+alvo.dataset.i, 1);
    salvar(); editarFicha(f.id);
  }
  if (a === 'salvar-ficha') {
    const f = ficha(alvo.dataset.id);
    lerFormFicha(f);
    await salvarJa(); fecharModal(); toast('Ficha salva.'); render();
  }
  if (a === 'excluir-ficha') {
    estado.fichas = estado.fichas.filter(f => f.id !== alvo.dataset.id);
    await salvarJa(); fecharModal(); toast('Ficha excluída.'); render();
  }
  if (a === 'nova-ficha') {
    const nova = { id: uid(), nome: 'Nova ficha', subtitulo: '', dia: 0, itens: [] };
    estado.fichas.push(nova); await salvarJa(); editarFicha(nova.id);
  }
  if (a === 'toggle-reintro') {
    const r = estado.reintroducao[+alvo.dataset.i];
    r.status = r.status === 'ativo' ? 'aguardando' : 'ativo';
    await salvarJa(); render();
  }

  if (a === 'sel-ex') { exSelecionado = alvo.dataset.id; renderProgresso(); }

  if (a === 'toggle-peso') { estado.config.registrarPeso = !estado.config.registrarPeso; await salvarJa(); render(); }
  if (a === 'reiniciar-bloco') {
    const hoje = new Date(); const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
    estado.config.blocoInicio = iso(seg);
    await salvarJa(); toast('Bloco reiniciado na semana 1.'); render();
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
  const m = $('#modal');
  const g = (k) => { const el = m.querySelector(`[data-f="${k}"]`); return el ? el.value : null; };
  if (g('nome') != null) f.nome = g('nome');
  if (g('subtitulo') != null) f.subtitulo = g('subtitulo');
  if (g('nota') != null) f.nota = g('nota');
  if (g('dia') != null) f.dia = +g('dia');
  $$('[data-it]', m).forEach(inp => {
    const it = f.itens[+inp.dataset.it];
    if (!it) return;
    const v = num(inp.value);
    if (inp.dataset.c === 'rirMax') { it.rirMax = v; if (it.rirMin == null || it.rirMin > v) it.rirMin = v; }
    else if (v != null) it[inp.dataset.c] = v;
  });
}

document.addEventListener('change', async (ev) => {
  const t = ev.target;

  if (t.dataset.acao === 'add-item' && t.value) {
    const f = ficha(ctxModal.fichaId);
    lerFormFicha(f);
    f.itens.push({ ex: t.value, series: 3, repMin: 8, repMax: 12, rirMin: 1, rirMax: 2 });
    await salvarJa(); editarFicha(f.id);
    return;
  }

  if (t.dataset.campo === 'academia') { estado.sessaoAtiva.academia = t.value; salvar(); renderExec(); return; }
  if (t.dataset.campo === 'peso')     { estado.sessaoAtiva.pesoCorporal = num(t.value); salvar(); return; }
  if (t.dataset.campo === 'obs-sessao') { estado.sessaoAtiva.obs = t.value; salvar(); return; }

  if (t.dataset.campo && t.closest('.serie')) {
    const linha = t.closest('.serie');
    const i = +linha.dataset.i, j = +linha.dataset.j;
    const c = t.dataset.campo;
    const v = (c === 'tipo' || c === 'obs') ? t.value : num(t.value);
    if ((c === 'carga' || c === 'reps') && v == null) return;
    gravaSerie(i, j, { [c]: v });
    if (c === 'carga') renderExec();
    return;
  }

  if (t.dataset.cfg) {
    const c = t.dataset.cfg;
    estado.config[c] = (c === 'incremento') ? (num(t.value) || 2.5) : t.value;
    if (c === 'academiaPadrao' && !estado.config.academias.includes(t.value)) {
      estado.config.academias = [t.value, 'Outra'];
    }
    await salvarJa(); toast('Salvo.');
    return;
  }
  if (t.dataset.alvo) { estado.config.alvos[t.dataset.alvo] = num(t.value) || 0; await salvarJa(); return; }

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
    try { await navigator.serviceWorker.register('sw.js'); } catch (e) { /* ok sem offline */ }
  }
})();
