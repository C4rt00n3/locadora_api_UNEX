/**
 * Popula o banco "loja" com os dados da Lista de Exercícios de MongoDB,
 * já com as atualizações dos exercícios 9 e 10 aplicadas.
 *
 * Uso:  npm run seed
 * Atenção: apaga as coleções antes de inserir.
 */
import 'dotenv/config';
import { conectar, getDb, desconectar } from './db.js';

const produtos = [
  { nome: 'Notebook', marca: 'TechPro', preco: 4500, estoque: 6, disponivel: true },
  { nome: 'Mouse', marca: 'TechPro', preco: 150, estoque: 35, disponivel: true },
  { nome: 'Teclado Mecânico', marca: 'KeyMaster', preco: 350, estoque: 15, categoria: 'Periféricos', disponivel: true },
  { nome: 'Monitor 24', marca: 'Vision', preco: 900, estoque: 8, disponivel: true },
  { nome: 'Headset', marca: 'SoundMax', preco: 300, estoque: 20, disponivel: true },
];

const clientes = [
  {
    nome: 'Ana Silva',
    email: 'ana@email.com',
    endereco: { cidade: 'Vitória da Conquista', estado: 'BA', cep: '45000-100' },
  },
  {
    nome: 'Bruno Santos',
    email: 'bruno@email.com',
    interesses: ['games', 'programacao', 'musica'],
  },
  {
    nome: 'Carla',
    tecnologias: ['JavaScript', 'MongoDB', 'Node.js', 'MongoDB'],
  },
];

const filmes = [
  {
    titulo: 'Interestelar',
    ano: 2014,
    classificacaoIndicativa: '12 anos',
    duracaoMinutos: 169,
    generos: ['Ficção científica', 'Aventura', 'Drama'],
    diretor: { nome: 'Christopher Nolan', nacionalidade: 'Britânico-americana', anoNascimento: 1970 },
    atores: [
      { nome: 'Matthew McConaughey', personagem: 'Cooper' },
      { nome: 'Anne Hathaway', personagem: 'Dra. Brand' },
      { nome: 'Jessica Chastain', personagem: 'Murph' },
      { nome: 'Michael Caine', personagem: 'Professor Brand' },
    ],
    avaliacao: { media: 8.7, totalVotos: 1980000, fonte: 'IMDb' },
  },
];

const alunos = [
  { nome: 'Lucas', curso: 'Sistemas de Informação', idade: 21, semestre: 4, notas: [8.5, 7.0, 9.0] },
  { nome: 'Mariana', curso: 'Sistemas de Informação', idade: 19, semestre: 2, notas: [9.0, 8.0, 7.5] },
  { nome: 'Pedro', curso: 'Engenharia de Software', idade: 23, semestre: 6, notas: [6.5, 7.0, 8.0] },
  { nome: 'Júlia', curso: 'Ciência da Computação', idade: 20, semestre: 3, notas: [9.0, 9.5, 10.0] },
  { nome: 'Rafael', curso: 'Sistemas de Informação', idade: 25, semestre: 4, notas: [7.0, 6.0, 8.5] },
];

const vendas = [
  { produto: 'Notebook', categoria: 'Informática', quantidade: 2, valorUnitario: 4500 },
  { produto: 'Mouse', categoria: 'Periféricos', quantidade: 5, valorUnitario: 150 },
  { produto: 'Teclado', categoria: 'Periféricos', quantidade: 3, valorUnitario: 350 },
  { produto: 'Monitor', categoria: 'Informática', quantidade: 4, valorUnitario: 900 },
  { produto: 'Headset', categoria: 'Periféricos', quantidade: 6, valorUnitario: 300 },
];

const pedidosBase = [
  {
    numero: 1001,
    cliente: { nome: 'Ana Silva', cidade: 'Vitória da Conquista' },
    itens: [
      { produto: 'Notebook', quantidade: 1, preco: 4500 },
      { produto: 'Mouse', quantidade: 2, preco: 150 },
    ],
    status: 'Enviado',
    formaPagamento: 'Cartão',
  },
  {
    numero: 1002,
    cliente: { nome: 'Bruno Santos', cidade: 'Salvador' },
    itens: [
      { produto: 'Teclado Mecânico', quantidade: 1, preco: 350 },
      { produto: 'Headset', quantidade: 1, preco: 300 },
    ],
    status: 'Enviado',
    formaPagamento: 'Pix',
  },
  {
    numero: 1003,
    cliente: { nome: 'Carla Mendes', cidade: 'Vitória da Conquista' },
    itens: [{ produto: 'Monitor 24', quantidade: 2, preco: 900 }],
    status: 'Entregue',
    formaPagamento: 'Boleto',
  },
  {
    numero: 1004,
    cliente: { nome: 'Diego Rocha', cidade: 'Ilhéus' },
    itens: [
      { produto: 'Notebook', quantidade: 1, preco: 4500 },
      { produto: 'Headset', quantidade: 2, preco: 300 },
    ],
    status: 'Aguardando pagamento',
    formaPagamento: 'Boleto',
  },
  {
    numero: 1005,
    cliente: { nome: 'Ana Silva', cidade: 'Vitória da Conquista' },
    itens: [{ produto: 'Mouse', quantidade: 3, preco: 150 }],
    status: 'Pago',
    formaPagamento: 'Pix',
  },
  {
    numero: 1006,
    cliente: { nome: 'Elisa Prado', cidade: 'Jequié' },
    itens: [
      { produto: 'Teclado Mecânico', quantidade: 2, preco: 350 },
      { produto: 'Monitor 24', quantidade: 1, preco: 900 },
    ],
    status: 'Entregue',
    formaPagamento: 'Cartão',
  },
];

// Acrescenta o valorTotal calculado a partir dos itens
const pedidos = pedidosBase.map((p) => ({
  ...p,
  valorTotal: p.itens.reduce((acc, i) => acc + i.quantidade * i.preco, 0),
}));

const DADOS = { produtos, clientes, filmes, alunos, vendas, pedidos };

async function main() {
  await conectar();
  const db = getDb();

  for (const [colecao, documentos] of Object.entries(DADOS)) {
    await db.collection(colecao).deleteMany({});
    const r = await db.collection(colecao).insertMany(documentos);
    console.log(`  ${colecao.padEnd(10)} ${r.insertedCount} documento(s)`);
  }

  // Índices úteis
  await db.collection('produtos').createIndex({ nome: 1 });
  await db.collection('pedidos').createIndex({ numero: 1 }, { unique: true });
  await db.collection('pedidos').createIndex({ status: 1 });
  await db.collection('pedidos').createIndex({ 'cliente.nome': 1 });
  console.log('  índices criados');

  await desconectar();
  console.log('✔ Seed concluído.');
}

main().catch((erro) => {
  console.error('✖ Erro no seed:', erro.message);
  process.exit(1);
});
