/* Biblioteca de exercícios e fichas.
   Ao subir uma ficha nova, aumente SEED_VERSAO: o app substitui
   exercícios, fichas e alvos no aparelho, preservando o histórico. */

const SEED_VERSAO = 2;

/* Versão do app, mostrada em Ajustes. Serve para você conferir, olhando o
   celular, se a atualização realmente chegou. Aumente a cada publicação
   (junto com o ?v= no index.html e o CACHE no sw.js). */
const APP_VERSAO = '4.0';

/* Alvos por CICLO completo (os 5 treinos), não por semana de calendário. */
const GRUPOS = {
  peito:        { nome: 'Peito',              alvo: 15 },
  costas:       { nome: 'Costas',             alvo: 14 },
  biceps:       { nome: 'Bíceps',             alvo: 11 },
  triceps:      { nome: 'Tríceps',            alvo: 10 },
  deltPost:     { nome: 'Deltoide posterior', alvo: 9  },
  abdomen:      { nome: 'Abdômen',            alvo: 9  },
  trapezio:     { nome: 'Trapézio',           alvo: 8  },
  ombroLateral: { nome: 'Ombro lateral',      alvo: 8  },
  isquios:      { nome: 'Isquiotibiais',      alvo: 7  },
  antebraco:    { nome: 'Antebraço',          alvo: 6  },
  gluteo:       { nome: 'Glúteo',             alvo: 6  },
  panturrilha:  { nome: 'Panturrilha',        alvo: 6  },
  ombroAnt:     { nome: 'Ombro anterior',     alvo: 4  },
  adutores:     { nome: 'Adutores',           alvo: 3  },
  quadriceps:   { nome: 'Quadríceps',         alvo: 3  },
  eretores:     { nome: 'Eretores',           alvo: 3  }
};

/* id, nome, grupos, unidade ('reps'|'seg'), unilateral, aviso, nota */
const EXERCICIOS = [
  // Push A
  { id: 'crucifixo-voador',  nome: 'Crucifixo voador (ativação)',           grupos: ['peito'],
    nota: 'Leve — só preparo articular.' },
  { id: 'supino-reto-art',   nome: 'Supino reto articulado deitado',        grupos: ['peito'] },
  { id: 'supino-declinado',  nome: 'Supino declinado sentado',              grupos: ['peito'] },
  { id: 'cross-maquina',     nome: 'Cross máquina (cabo)',                  grupos: ['peito'] },
  { id: 'elev-lateral',      nome: 'Elevação lateral (halteres/máquina)',   grupos: ['ombroLateral'] },
  { id: 'triceps-testa',     nome: 'Tríceps testa',                         grupos: ['triceps'],
    nota: 'Cabeça longa, posição alongada.' },
  { id: 'triceps-corda',     nome: 'Tríceps corda',                         grupos: ['triceps'],
    nota: 'Pegada neutra.' },
  { id: 'crunch-cabo',       nome: 'Crunch no cabo',                        grupos: ['abdomen'] },

  // Pull A
  { id: 'puxada-pronada',    nome: 'Puxada frente pronada',                 grupos: ['costas'] },
  { id: 'remada-curvada',    nome: 'Remada curvada',                        grupos: ['costas'] },
  { id: 'encolhimento',      nome: 'Encolhimento tradicional',              grupos: ['trapezio'] },
  { id: 'elev-posterior',    nome: 'Elevação posterior (cabo unil./peck deck inv.)', grupos: ['deltPost'] },
  { id: 'rosca-45',          nome: 'Rosca 45° inclinada',                   grupos: ['biceps'] },
  { id: 'rosca-punho',       nome: 'Rosca de punho',                        grupos: ['antebraco'] },
  { id: 'rotacao-cabo',      nome: 'Rotação no cabo',                       grupos: ['abdomen'], unilateral: true },

  // Perna
  { id: 'elev-pelvica',      nome: 'Elevação pélvica com carga',            grupos: ['gluteo'],
    nota: 'Primeiro do dia: exige foco de ativação.' },
  { id: 'abdutora',          nome: 'Cadeira abdutora',                      grupos: ['gluteo'],
    nota: 'Glúteo médio.' },
  { id: 'adutora',           nome: 'Cadeira adutora',                       grupos: ['adutores'] },
  { id: 'flexora-sentada',   nome: 'Cadeira flexora sentada',               grupos: ['isquios'],
    nota: 'Substituiu extensão lombar 45° — isquiotibial em posição alongada.' },
  { id: 'mesa-flexora',      nome: 'Mesa flexora',                          grupos: ['isquios'] },
  { id: 'rosca-martelo',     nome: 'Rosca martelo',                         grupos: ['biceps'],
    nota: 'Braquial · bíceps fresco, sem fadiga de puxada.' },
  { id: 'extensora-parcial', nome: 'Cadeira extensora ADM parcial',         grupos: ['quadriceps'],
    aviso: 'Meio curso — não travar no topo. Excêntrica 2-3s.' },
  { id: 'panturrilha-sent',  nome: 'Panturrilha sentado',                   grupos: ['panturrilha'] },

  // Push B
  { id: 'desenv-militar',    nome: 'Desenvolvimento militar',               grupos: ['ombroAnt'] },
  { id: 'elev-lateral-cabo', nome: 'Elevação lateral unilateral no cabo',   grupos: ['ombroLateral'], unilateral: true },
  { id: 'supino-inclinado',  nome: 'Supino superior inclinado sentado',     grupos: ['peito'],
    aviso: 'Não travar o cotovelo no topo.' },
  { id: 'crucifixo-invert',  nome: 'Crucifixo invertido (peck deck inv. ou cabo)', grupos: ['deltPost'],
    nota: 'Antagonista da carga do dia — equilíbrio de ombro.' },
  { id: 'triceps-pulley',    nome: 'Tríceps pulley barra reta pronada',     grupos: ['triceps'],
    nota: 'Cabeça lateral · sem posição overhead.' },
  { id: 'rollout',           nome: 'Rollout (ou elevação de pernas na barra)', grupos: ['abdomen'] },

  // Pull B
  { id: 'puxada-apoio',      nome: 'Puxada frente com apoio no peito',      grupos: ['costas'],
    nota: 'Substituição permanente de barra fixa / puxada supinada.' },
  { id: 'remada-neutra',     nome: 'Remada neutra',                         grupos: ['costas'],
    nota: 'Substituição permanente de remada unilateral / serrote.' },
  { id: 'encolhimento-atras',nome: 'Encolhimento atrás do corpo',           grupos: ['trapezio'] },
  { id: 'face-pull',         nome: 'Face pull',                             grupos: ['deltPost'] },
  { id: 'rosca-alt-scott',   nome: 'Rosca alternada ou scott',              grupos: ['biceps'] },
  { id: 'rosca-inversa',     nome: 'Rosca inversa',                         grupos: ['antebraco'] },
  { id: 'panturrilha-pe',    nome: 'Panturrilha em pé',                     grupos: ['panturrilha'],
    nota: 'Separada da Perna por um treino — recuperação do tendão de Aquiles.' },
  { id: 'eretor-lombar',     nome: 'Eretor lombar (hiperextensão)',         grupos: ['eretores'] }
];

/* ordem = posição na sequência cíclica (1 a 5).
   excecao: true = exceção articular ao alvo de 8 reps.
   ativacao: true = série leve, sem falha. */
const FICHAS = [
  {
    id: 'push-a', ordem: 1, nome: 'Push A', subtitulo: 'peito — horizontal/declinado',
    nota: 'Sem pressão vertical neste treino.',
    itens: [
      { ex: 'crucifixo-voador', series: 1, repMin: 15, repMax: 20, rirMin: 5, rirMax: 6, ativacao: true },
      { ex: 'supino-reto-art',  series: 4, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'supino-declinado', series: 3, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'cross-maquina',    series: 3, repMin: 10, repMax: 12, rirMax: 1, excecao: true },
      { ex: 'elev-lateral',     series: 4, repMin: 10, repMax: 12, rirMax: 1, excecao: true },
      { ex: 'triceps-testa',    series: 3, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'triceps-corda',    series: 3, repMin: 8,  repMax: 10, rirMax: 1 },
      { ex: 'crunch-cabo',      series: 3, repMin: 10, repMax: 12, rirMax: 1 }
    ]
  },
  {
    id: 'pull-a', ordem: 2, nome: 'Pull A', subtitulo: 'costas largura + bíceps',
    itens: [
      { ex: 'puxada-pronada', series: 4, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'remada-curvada', series: 3, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'encolhimento',   series: 4, repMin: 8,  repMax: 10, rirMax: 1 },
      { ex: 'elev-posterior', series: 3, repMin: 12, repMax: 15, rirMax: 1, excecao: true },
      { ex: 'rosca-45',       series: 4, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'rosca-punho',    series: 3, repMin: 10, repMax: 12, rirMax: 1 },
      { ex: 'rotacao-cabo',   series: 3, repMin: 10, repMax: 12, rirMax: 1 }
    ]
  },
  {
    id: 'perna', ordem: 3, nome: 'Perna', subtitulo: 'fase de recalibração',
    nota: 'Aquecimento: bike leve 5 min. Excêntrica 2-3s em todo padrão de joelho.',
    itens: [
      { ex: 'elev-pelvica',      series: 3, repMin: 8,  repMax: 10, rirMax: 1 },
      { ex: 'abdutora',          series: 3, repMin: 12, repMax: 15, rirMax: 1 },
      { ex: 'adutora',           series: 3, repMin: 12, repMax: 15, rirMax: 1 },
      { ex: 'flexora-sentada',   series: 3, repMin: 8,  repMax: 10, rirMax: 1 },
      { ex: 'mesa-flexora',      series: 4, repMin: 8,  repMax: 10, rirMax: 1 },
      { ex: 'rosca-martelo',     series: 3, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'extensora-parcial', series: 3, repMin: 12, repMax: 15, rirMax: 1, excecao: true },
      { ex: 'panturrilha-sent',  series: 3, repMin: 8,  repMax: 10, rirMax: 1 }
    ]
  },
  {
    id: 'push-b', ordem: 4, nome: 'Push B', subtitulo: 'ombro — vertical',
    nota: 'Todo o estresse subacromial do ciclo está aqui.',
    itens: [
      { ex: 'desenv-militar',    series: 4, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'elev-lateral-cabo', series: 4, repMin: 10, repMax: 12, rirMax: 1, excecao: true },
      { ex: 'supino-inclinado',  series: 4, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'crucifixo-invert',  series: 3, repMin: 12, repMax: 15, rirMax: 1, excecao: true },
      { ex: 'triceps-pulley',    series: 4, repMin: 8,  repMax: 10, rirMax: 1 },
      { ex: 'rollout',           series: 3, repMin: 8,  repMax: 10, rirMax: 1 }
    ]
  },
  {
    id: 'pull-b', ordem: 5, nome: 'Pull B', subtitulo: 'costas espessura + trapézio',
    itens: [
      { ex: 'puxada-apoio',       series: 4, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'remada-neutra',      series: 3, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'encolhimento-atras', series: 4, repMin: 8,  repMax: 10, rirMax: 1 },
      { ex: 'face-pull',          series: 3, repMin: 12, repMax: 15, rirMax: 1, excecao: true },
      { ex: 'rosca-alt-scott',    series: 4, repMin: 8,  repMax: 8,  rirMax: 1 },
      { ex: 'rosca-inversa',      series: 3, repMin: 10, repMax: 12, rirMax: 1 },
      { ex: 'panturrilha-pe',     series: 3, repMin: 8,  repMax: 10, rirMax: 1 },
      { ex: 'eretor-lombar',      series: 3, repMin: 10, repMax: 12, rirMax: 1 }
    ]
  }
];

const REINTRODUCAO = [
  { nome: 'RDL',                  status: 'aguardando' },
  { nome: 'Hip thrust com barra', status: 'aguardando' },
  { nome: 'Spanish squat',        status: 'aguardando' }
];

const REFERENCIA = [
  { titulo: 'Alvo padrão', texto: '8 repetições com carga máxima até a exaustão. Falha real na última série de cada exercício, RIR 1 nas anteriores.' },
  { titulo: 'Exceções articulares (*)', texto: 'Cross, elevação lateral, elevação posterior, crucifixo invertido, face pull e cadeira extensora ficam em reps mais altas por motivo articular, não por preferência. Carga alta nessas posições estressa cápsula do ombro / patela sem ganho proporcional.' },
  { titulo: 'Progressão', texto: 'Fechou 8 reps limpas em todas as séries → sobe carga. Se as cargas começarem a cair a cada ciclo, reduzir a frequência de falha (efeito de treinar em déficit calórico).' },
  { titulo: 'Convenção de registro', texto: 'Carga informada sem reps = atingiu o alvo. Só registre reps quando o resultado for diferente do prescrito.' },
  { titulo: 'Sequência', texto: 'Push A → Pull A → Perna → Push B → Pull B → recomeça. Sem dias fixos: descanso conforme necessário, mantendo a ordem.' },
  { titulo: 'Bloco de 8 semanas', texto: 'Semanas 1-6 progressão · semana 7 deload (-40% volume, mesma carga) · semana 8 reavaliação.' },
  { titulo: 'Joelho', texto: 'Excêntrica 2-3s em todo padrão de joelho. Dor >3/10 ou que passa de 24h: reduzir amplitude ou trocar exercício. RDL, hip thrust com barra e Spanish squat voltam um de cada vez.' },
  { titulo: 'Ombro', texto: 'Push A = horizontal/declinado · Push B = vertical. Nunca misturar os dois vetores no mesmo treino.' },
  { titulo: 'Panturrilha', texto: 'Perna (3º) e Pull B (5º) — separadas por um treino, pela recuperação lenta do tendão de Aquiles. Se comprimir o ciclo, evitar os dois em dias consecutivos.' },
  { titulo: 'Academia', texto: 'Cargas feitas fora da academia habitual não são comparáveis como referência de progressão — sistemas de máquina diferentes.' },
  { titulo: 'Pendência aberta', texto: 'Quadríceps em 3 séries por ciclo (só extensora parcial) — único grupo abaixo da faixa mínima.' }
];
