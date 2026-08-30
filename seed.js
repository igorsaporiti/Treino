/* Biblioteca de exercícios e fichas iniciais.
   Tudo aqui é apenas o ponto de partida: depois de instalado,
   o app guarda suas próprias cópias e você edita pelo próprio app. */

const GRUPOS = {
  peito:        { nome: 'Peito',            alvo: 15 },
  costas:       { nome: 'Costas',           alvo: 14 },
  ombroLateral: { nome: 'Ombro lateral',    alvo: 8  },
  ombroAnt:     { nome: 'Ombro anterior',   alvo: 0  },
  deltPost:     { nome: 'Deltoide post.',   alvo: 6  },
  trapezio:     { nome: 'Trapézio',         alvo: 8  },
  triceps:      { nome: 'Tríceps',          alvo: 9  },
  biceps:       { nome: 'Bíceps',           alvo: 7  },
  antebraco:    { nome: 'Antebraço',        alvo: 6  },
  panturrilha:  { nome: 'Panturrilha',      alvo: 7  },
  posterior:    { nome: 'Perna posterior',  alvo: 14 },
  quadriceps:   { nome: 'Quadríceps',       alvo: 0  },
  gluteo:       { nome: 'Glúteo',           alvo: 0  },
  abdutores:    { nome: 'Abdutores/adutores', alvo: 0 },
  lombar:       { nome: 'Lombar',           alvo: 0  },
  abdomen:      { nome: 'Abdômen',          alvo: 15 }
};

/* id, nome, grupos, unidade ('reps' | 'seg'), unilateral, aviso */
const EXERCICIOS = [
  // Push A
  { id: 'crucifixo-voador',   nome: 'Crucifixo voador (ativação)',        grupos: ['peito'] },
  { id: 'supino-reto-art',    nome: 'Supino reto articulado deitado',     grupos: ['peito'] },
  { id: 'supino-declinado',   nome: 'Supino declinado sentado',           grupos: ['peito'] },
  { id: 'cross-maquina',      nome: 'Cross máquina (cabo)',               grupos: ['peito'] },
  { id: 'elev-lateral',       nome: 'Elevação lateral (halteres/máquina)',grupos: ['ombroLateral'] },
  { id: 'triceps-testa',      nome: 'Tríceps testa',                      grupos: ['triceps'] },
  { id: 'triceps-corda',      nome: 'Tríceps corda',                      grupos: ['triceps'] },
  { id: 'crunch-cabo',        nome: 'Crunch no cabo',                     grupos: ['abdomen'] },

  // Pull A
  { id: 'puxada-pronada',     nome: 'Puxada frente pronada',              grupos: ['costas'] },
  { id: 'remada-curvada',     nome: 'Remada curvada',                     grupos: ['costas'] },
  { id: 'encolhimento',       nome: 'Encolhimento tradicional',           grupos: ['trapezio'] },
  { id: 'elev-posterior',     nome: 'Elevação posterior (cabo unil./peck deck inv.)', grupos: ['deltPost'] },
  { id: 'rosca-45',           nome: 'Rosca 45° inclinada',                grupos: ['biceps'] },
  { id: 'rosca-punho',        nome: 'Rosca de punho',                     grupos: ['antebraco'] },
  { id: 'elev-pernas',        nome: 'Elevação de pernas',                 grupos: ['abdomen'] },

  // Perna
  { id: 'ext-lombar-45',      nome: 'Extensão de lombar 45°',             grupos: ['posterior', 'lombar'] },
  { id: 'elev-pelvica',       nome: 'Elevação pélvica com carga',         grupos: ['gluteo', 'posterior'],
    aviso: 'Substituiu ponte de glúteo — progressão gradual. Máquina guiada ou barra com almofada.' },
  { id: 'abdutora',           nome: 'Cadeira abdutora',                   grupos: ['abdutores'] },
  { id: 'adutora',            nome: 'Cadeira adutora',                    grupos: ['abdutores'] },
  { id: 'mesa-flexora',       nome: 'Mesa flexora',                       grupos: ['posterior'] },
  { id: 'wall-sit',           nome: 'Wall sit',                           grupos: ['quadriceps'], unidade: 'seg',
    aviso: 'Parar se dor >2/10. Opcional trocar por TKE com faixa ou exercício de abdômen.' },
  { id: 'extensora-parcial',  nome: 'Cadeira extensora ADM parcial',      grupos: ['quadriceps'],
    aviso: 'Meio curso — não travar no topo.' },
  { id: 'panturrilha-sent',   nome: 'Panturrilha sentado',                grupos: ['panturrilha'] },

  // Push B
  { id: 'desenv-militar',     nome: 'Desenvolvimento militar',            grupos: ['ombroAnt'] },
  { id: 'elev-lateral-cabo',  nome: 'Elevação lateral unilateral no cabo',grupos: ['ombroLateral'], unilateral: true },
  { id: 'supino-inclinado',   nome: 'Supino superior inclinado sentado',  grupos: ['peito'],
    aviso: 'Não travar o cotovelo no topo.' },
  { id: 'panturrilha-pe',     nome: 'Panturrilha em pé',                  grupos: ['panturrilha'] },
  { id: 'rollout',            nome: 'Rollout ou elevação de pernas na barra', grupos: ['abdomen'] },
  { id: 'rotacao-cabo',       nome: 'Rotação no cabo',                    grupos: ['abdomen'], unilateral: true },

  // Pull B
  { id: 'puxada-apoio',       nome: 'Puxada frente com apoio no peito',   grupos: ['costas'],
    aviso: 'Substituição permanente de barra fixa / puxada supinada.' },
  { id: 'remada-neutra',      nome: 'Remada neutra',                      grupos: ['costas'],
    aviso: 'Substituição permanente de remada unilateral / serrote.' },
  { id: 'encolhimento-atras', nome: 'Encolhimento atrás do corpo',        grupos: ['trapezio'] },
  { id: 'face-pull',          nome: 'Face pull',                          grupos: ['deltPost'] },
  { id: 'rosca-alt-scott',    nome: 'Rosca alternada ou scott',           grupos: ['biceps'] },
  { id: 'rosca-inversa',      nome: 'Rosca inversa',                      grupos: ['antebraco'] },
  { id: 'eretor-lombar',      nome: 'Eretor lombar (hiperextensão)',      grupos: ['lombar'] }
];

/* dia: 1=segunda ... 7=domingo
   itens: exercicio, series, repMin, repMax, rirMin, rirMax */
const FICHAS = [
  {
    id: 'push-a', nome: 'Push A', subtitulo: 'peito — horizontal/declinado', dia: 1,
    nota: 'Sem pressão vertical hoje.',
    itens: [
      { ex: 'crucifixo-voador', series: 1, repMin: 15, repMax: 20, rirMin: 5, rirMax: 6 },
      { ex: 'supino-reto-art',  series: 4, repMin: 6,  repMax: 8,  rirMin: 1, rirMax: 2 },
      { ex: 'supino-declinado', series: 3, repMin: 8,  repMax: 10, rirMin: 1, rirMax: 2 },
      { ex: 'cross-maquina',    series: 3, repMin: 10, repMax: 12, rirMin: 1, rirMax: 1 },
      { ex: 'elev-lateral',     series: 4, repMin: 12, repMax: 15, rirMin: 0, rirMax: 1 },
      { ex: 'triceps-testa',    series: 3, repMin: 10, repMax: 12, rirMin: 1, rirMax: 1 },
      { ex: 'triceps-corda',    series: 3, repMin: 12, repMax: 15, rirMin: 0, rirMax: 1 },
      { ex: 'crunch-cabo',      series: 3, repMin: 12, repMax: 15, rirMin: 1, rirMax: 1 }
    ]
  },
  {
    id: 'pull-a', nome: 'Pull A', subtitulo: 'costas largura + bíceps', dia: 2,
    itens: [
      { ex: 'puxada-pronada', series: 4, repMin: 6,  repMax: 8,  rirMin: 1, rirMax: 2 },
      { ex: 'remada-curvada', series: 3, repMin: 8,  repMax: 10, rirMin: 1, rirMax: 2 },
      { ex: 'encolhimento',   series: 4, repMin: 12, repMax: 15, rirMin: 1, rirMax: 1 },
      { ex: 'elev-posterior', series: 3, repMin: 12, repMax: 15, rirMin: 1, rirMax: 1 },
      { ex: 'rosca-45',       series: 4, repMin: 10, repMax: 12, rirMin: 1, rirMax: 1 },
      { ex: 'rosca-punho',    series: 3, repMin: 12, repMax: 15, rirMin: 1, rirMax: 1 },
      { ex: 'elev-pernas',    series: 3, repMin: 10, repMax: 15, rirMin: 1, rirMax: 1 }
    ]
  },
  {
    id: 'perna', nome: 'Perna', subtitulo: 'fase de recalibração', dia: 4,
    nota: 'Aquecimento: bike leve 5 min. Excêntrica 2-3s em todo padrão de joelho.',
    itens: [
      { ex: 'ext-lombar-45',     series: 3, repMin: 10, repMax: 12, rirMin: 2, rirMax: 3 },
      { ex: 'elev-pelvica',      series: 3, repMin: 15, repMax: 15, rirMin: 2, rirMax: 3 },
      { ex: 'abdutora',          series: 3, repMin: 15, repMax: 20, rirMin: 2, rirMax: 3 },
      { ex: 'adutora',           series: 3, repMin: 15, repMax: 20, rirMin: 2, rirMax: 3 },
      { ex: 'mesa-flexora',      series: 4, repMin: 10, repMax: 12, rirMin: 1, rirMax: 2 },
      { ex: 'wall-sit',          series: 3, repMin: 20, repMax: 30 },
      { ex: 'extensora-parcial', series: 2, repMin: 12, repMax: 15, rirMin: 1, rirMax: 2 },
      { ex: 'panturrilha-sent',  series: 3, repMin: 15, repMax: 15, rirMin: 1, rirMax: 2 }
    ]
  },
  {
    id: 'push-b', nome: 'Push B', subtitulo: 'ombro — vertical', dia: 5,
    nota: 'Todo o estresse subacromial da semana está aqui.',
    itens: [
      { ex: 'desenv-militar',    series: 4, repMin: 6,  repMax: 8,  rirMin: 1, rirMax: 2 },
      { ex: 'elev-lateral-cabo', series: 4, repMin: 15, repMax: 20, rirMin: 0, rirMax: 1 },
      { ex: 'triceps-corda',     series: 3, repMin: 10, repMax: 12, rirMin: 0, rirMax: 1 },
      { ex: 'supino-inclinado',  series: 4, repMin: 8,  repMax: 10, rirMin: 1, rirMax: 2 },
      { ex: 'panturrilha-pe',    series: 4, repMin: 12, repMax: 15, rirMin: 0, rirMax: 1 },
      { ex: 'rollout',           series: 3, repMin: 8,  repMax: 10, rirMin: 1, rirMax: 1 },
      { ex: 'rotacao-cabo',      series: 3, repMin: 10, repMax: 12, rirMin: 1, rirMax: 1 }
    ]
  },
  {
    id: 'pull-b', nome: 'Pull B', subtitulo: 'costas espessura + trapézio', dia: 6,
    itens: [
      { ex: 'puxada-apoio',       series: 4, repMin: 6,  repMax: 8,  rirMin: 1, rirMax: 2 },
      { ex: 'remada-neutra',      series: 3, repMin: 10, repMax: 12, rirMin: 1, rirMax: 1 },
      { ex: 'encolhimento-atras', series: 4, repMin: 12, repMax: 15, rirMin: 1, rirMax: 1 },
      { ex: 'face-pull',          series: 3, repMin: 12, repMax: 15, rirMin: 1, rirMax: 1 },
      { ex: 'rosca-alt-scott',    series: 3, repMin: 10, repMax: 12, rirMin: 0, rirMax: 1 },
      { ex: 'rosca-inversa',      series: 3, repMin: 12, repMax: 15, rirMin: 1, rirMax: 1 },
      { ex: 'eretor-lombar',      series: 3, repMin: 12, repMax: 15, rirMin: 1, rirMax: 1 }
    ]
  }
];

const REINTRODUCAO = [
  { nome: 'RDL',                   status: 'aguardando' },
  { nome: 'Hip thrust com barra',  status: 'aguardando' },
  { nome: 'Spanish squat',         status: 'aguardando' }
];

const REFERENCIA = [
  { titulo: 'RIR', texto: 'Repetições em reserva. RIR 2 = parar sentindo que faria mais 2.' },
  { titulo: 'Convenção de registro', texto: 'Carga informada sem reps = atingiu a faixa-alvo prescrita. Só registre reps quando o resultado for diferente do prescrito.' },
  { titulo: 'Progressão dupla', texto: 'Suba as reps dentro da faixa antes de aumentar carga. Ex: 4x6-8 → chegue a 4x8, então aumente peso e volte a 6.' },
  { titulo: 'Bloco de 8 semanas', texto: 'Semanas 1-6 progressão · semana 7 deload (-40% volume, mesma carga) · semana 8 reavaliação.' },
  { titulo: 'Joelho', texto: 'Excêntrica 2-3s em todo padrão de joelho. Dor >3/10 ou que passa de 24h: reduzir amplitude ou trocar exercício. RDL, hip thrust com barra e Spanish squat voltam um de cada vez.' },
  { titulo: 'Ombro', texto: 'Push A = horizontal/declinado · Push B = vertical. Nunca misturar os dois vetores no mesmo dia.' },
  { titulo: 'Academia', texto: 'Cargas feitas fora da academia habitual não são comparáveis como referência de progressão — sistemas de máquina diferentes.' }
];
