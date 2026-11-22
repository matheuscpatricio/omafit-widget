import type {
  LikertScaleLabel,
  PublicForcedChoiceBlock,
  PublicLikertItem,
} from './types';

/** Perguntas públicas — sem etiquetas de perfil nem marcação de frase invertida. */
export const FORCED_CHOICE_BLOCKS: PublicForcedChoiceBlock[] = [
  {
    id: 'B1',
    number: 1,
    stem: 'Numa negociação, eu…',
    statements: [
      { id: 'B1A', letter: 'A', text: 'Vou direto ao ponto.' },
      { id: 'B1B', letter: 'B', text: 'Crio conexão primeiro.' },
      { id: 'B1C', letter: 'C', text: 'Levo números e dados.' },
      { id: 'B1D', letter: 'D', text: 'Sigo o roteiro que preparei.' },
    ],
  },
  {
    id: 'B2',
    number: 2,
    stem: 'Com um cliente novo, eu…',
    statements: [
      { id: 'B2A', letter: 'A', text: 'Procuro contatos em comum.' },
      { id: 'B2B', letter: 'B', text: 'Estudo a empresa a fundo antes.' },
      { id: 'B2C', letter: 'C', text: 'Já proponho o próximo passo.' },
      { id: 'B2D', letter: 'D', text: 'Entendo a rotina dele com calma.' },
    ],
  },
  {
    id: 'B3',
    number: 3,
    stem: 'Minha semana ideal tem…',
    statements: [
      { id: 'B3A', letter: 'A', text: 'Tempo para revisar propostas e números.' },
      { id: 'B3B', letter: 'B', text: 'Agenda organizada e previsível.' },
      { id: 'B3C', letter: 'C', text: 'Metas desafiadoras.' },
      { id: 'B3D', letter: 'D', text: 'Muitas reuniões e conversas.' },
    ],
  },
  {
    id: 'B4',
    number: 4,
    stem: 'Quando perco uma venda, eu…',
    statements: [
      { id: 'B4A', letter: 'A', text: 'Reviso meu processo com calma.' },
      { id: 'B4B', letter: 'B', text: 'Parto logo para a próxima.' },
      { id: 'B4C', letter: 'C', text: 'Converso com o cliente para entender.' },
      { id: 'B4D', letter: 'D', text: 'Analiso em que etapa o funil falhou.' },
    ],
  },
  {
    id: 'B5',
    number: 5,
    stem: 'Num time comercial, costumo ser quem…',
    statements: [
      { id: 'B5A', letter: 'A', text: 'Cuida da qualidade.' },
      { id: 'B5B', letter: 'B', text: 'Anima o grupo.' },
      { id: 'B5C', letter: 'C', text: 'Puxa o ritmo.' },
      { id: 'B5D', letter: 'D', text: 'Mantém a organização.' },
    ],
  },
  {
    id: 'B6',
    number: 6,
    stem: 'O que mais me incomoda é…',
    statements: [
      { id: 'B6A', letter: 'A', text: 'Demora para decidir.' },
      { id: 'B6B', letter: 'B', text: 'Mudança de última hora.' },
      { id: 'B6C', letter: 'C', text: 'Trabalhar isolado(a).' },
      { id: 'B6D', letter: 'D', text: 'Proposta enviada com erro.' },
    ],
  },
  {
    id: 'B7',
    number: 7,
    stem: 'Numa apresentação, eu foco em…',
    statements: [
      { id: 'B7A', letter: 'A', text: 'Mostrar provas e números.' },
      { id: 'B7B', letter: 'B', text: 'O resultado que o cliente terá.' },
      { id: 'B7C', letter: 'C', text: 'Explicar passo a passo como funciona.' },
      { id: 'B7D', letter: 'D', text: 'Contar uma boa história.' },
    ],
  },
  {
    id: 'B8',
    number: 8,
    stem: 'Para bater a meta, confio mais em…',
    statements: [
      { id: 'B8A', letter: 'A', text: 'Meus relacionamentos.' },
      { id: 'B8B', letter: 'B', text: 'Minha garra.' },
      { id: 'B8C', letter: 'C', text: 'Minha disciplina diária.' },
      { id: 'B8D', letter: 'D', text: 'Meu método e meus dados.' },
    ],
  },
  {
    id: 'B9',
    number: 9,
    stem: 'Diante de um problema urgente, eu…',
    statements: [
      { id: 'B9A', letter: 'A', text: 'Mantenho a calma e organizo.' },
      { id: 'B9B', letter: 'B', text: 'Levanto os fatos primeiro.' },
      { id: 'B9C', letter: 'C', text: 'Chamo as pessoas certas.' },
      { id: 'B9D', letter: 'D', text: 'Decido na hora.' },
    ],
  },
  {
    id: 'B10',
    number: 10,
    stem: 'Clientes costumam me ver como…',
    statements: [
      { id: 'B10A', letter: 'A', text: 'Objetivo(a).' },
      { id: 'B10B', letter: 'B', text: 'Confiável.' },
      { id: 'B10C', letter: 'C', text: 'Cuidadoso(a).' },
      { id: 'B10D', letter: 'D', text: 'Simpático(a).' },
    ],
  },
  {
    id: 'B11',
    number: 11,
    stem: 'Num projeto novo, começo…',
    statements: [
      { id: 'B11A', letter: 'A', text: 'Montando um cronograma.' },
      { id: 'B11B', letter: 'B', text: 'Envolvendo pessoas.' },
      { id: 'B11C', letter: 'C', text: 'Entendendo os requisitos.' },
      { id: 'B11D', letter: 'D', text: 'Pondo a mão na massa.' },
    ],
  },
  {
    id: 'B12',
    number: 12,
    stem: 'Num conflito com um parceiro, eu…',
    statements: [
      { id: 'B12A', letter: 'A', text: 'Busco um acordo com bom humor.' },
      { id: 'B12B', letter: 'B', text: 'Uso fatos e critérios.' },
      { id: 'B12C', letter: 'C', text: 'Escuto e evito desgaste.' },
      { id: 'B12D', letter: 'D', text: 'Digo abertamente o que penso.' },
    ],
  },
];

export const LIKERT_SCALE: LikertScaleLabel[] = [
  { value: 1, label: 'Discordo totalmente' },
  { value: 2, label: 'Discordo' },
  { value: 3, label: 'Neutro' },
  { value: 4, label: 'Concordo' },
  { value: 5, label: 'Concordo totalmente' },
];

export const LIKERT_ITEMS: PublicLikertItem[] = [
  {
    id: 'L1',
    text: 'Quando vejo uma oportunidade de negócio, ajo sem esperar alguém pedir.',
  },
  {
    id: 'L2',
    text: 'Mantenho minha rotina de prospecção mesmo sem ninguém acompanhando.',
  },
  {
    id: 'L3',
    text: 'Prefiro que outra pessoa defina minhas prioridades da semana.',
  },
  {
    id: 'L4',
    text: 'Termino o que comecei antes de abrir novas frentes.',
  },
  {
    id: 'L5',
    text: 'Depois de um “não”, procuro outro caminho até quem decide.',
  },
];

export const OPEN_QUESTION = {
  id: 'C1',
  text: 'A head de e-commerce de uma marca de moda de porte médio responde ao seu primeiro contato: “Já testamos um provador virtual e não funcionou.” O que você responderia e qual seria o seu próximo passo?',
  maxChars: 600,
  minChars: 20,
  placeholder: 'Escreva sua resposta aqui…',
} as const;

export const CONSENT_TEXT =
  'Ao continuar, autorizo a Omafit a tratar os dados que fornecerei (nome, contatos, perfil profissional, respostas ao teste e materiais do estudo de caso) exclusivamente para avaliar minha candidatura ao cargo de Sócio(a) Comercial. Os dados serão acessados apenas pelos sócios da Omafit e pela pessoa convidada por eles para a entrevista da Etapa 3, sob dever de confidencialidade, e excluídos em até 6 meses após o encerramento do processo, salvo se eu autorizar a manutenção em banco de talentos. Entendo que o teste é indicativo, não é um teste psicológico e não é usado isoladamente para decisões. Posso solicitar acesso, correção ou exclusão dos meus dados a qualquer momento pelo e-mail contato@omafit.co.';
