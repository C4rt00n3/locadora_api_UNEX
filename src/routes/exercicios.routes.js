import { Router } from 'express';
import { col } from '../db.js';
import { wrap } from '../utils.js';

const router = Router();

const produtos = () => col('produtos');
const clientes = () => col('clientes');
const alunos = () => col('alunos');
const vendas = () => col('vendas');
const pedidos = () => col('pedidos');
const filmes = () => col('filmes');

/**
 * Catálogo dos exercícios da lista.
 * Cada item traz o enunciado, o comando equivalente no mongosh e a função
 * que executa a operação usando o driver oficial do MongoDB para Node.js.
 */
const EXERCICIOS = {
  2: {
    titulo: 'Criando seu primeiro banco e coleção',
    itens: {
      a: {
        enunciado: 'Liste os documentos da coleção produtos.',
        comando: 'db.produtos.find()',
        executar: () => produtos().find().toArray(),
      },
      b: {
        enunciado: 'Consulte apenas o produto chamado Notebook.',
        comando: 'db.produtos.find({ nome: "Notebook" })',
        executar: () => produtos().find({ nome: 'Notebook' }).toArray(),
      },
    },
  },

  3: {
    titulo: 'Inserindo vários produtos',
    itens: {
      a: {
        enunciado: 'Liste todos os produtos cadastrados.',
        comando: 'db.produtos.find()',
        executar: () => produtos().find().toArray(),
      },
      b: {
        enunciado: 'Conte quantos documentos existem na coleção.',
        comando: 'db.produtos.countDocuments()',
        executar: () => produtos().countDocuments(),
      },
    },
  },

  4: {
    titulo: 'Filtros básicos',
    itens: {
      a: {
        enunciado: 'O produto chamado Mouse.',
        comando: 'db.produtos.find({ nome: "Mouse" })',
        executar: () => produtos().find({ nome: 'Mouse' }).toArray(),
      },
      b: {
        enunciado: 'Todos os produtos da marca TechPro.',
        comando: 'db.produtos.find({ marca: "TechPro" })',
        executar: () => produtos().find({ marca: 'TechPro' }).toArray(),
      },
      c: {
        enunciado: 'Todos os produtos com estoque igual a 15.',
        comando: 'db.produtos.find({ estoque: 15 })',
        executar: () => produtos().find({ estoque: 15 }).toArray(),
      },
      d: {
        enunciado: 'Todos os produtos com preço igual a 900.',
        comando: 'db.produtos.find({ preco: 900 })',
        executar: () => produtos().find({ preco: 900 }).toArray(),
      },
    },
  },

  5: {
    titulo: 'Operadores de comparação',
    itens: {
      a: {
        enunciado: 'Produtos com preço maior que R$ 500.',
        comando: 'db.produtos.find({ preco: { $gt: 500 } })',
        executar: () => produtos().find({ preco: { $gt: 500 } }).toArray(),
      },
      b: {
        enunciado: 'Produtos com preço menor que R$ 500.',
        comando: 'db.produtos.find({ preco: { $lt: 500 } })',
        executar: () => produtos().find({ preco: { $lt: 500 } }).toArray(),
      },
      c: {
        enunciado: 'Produtos com preço maior ou igual a R$ 900.',
        comando: 'db.produtos.find({ preco: { $gte: 900 } })',
        executar: () => produtos().find({ preco: { $gte: 900 } }).toArray(),
      },
      d: {
        enunciado: 'Produtos com estoque menor ou igual a 10.',
        comando: 'db.produtos.find({ estoque: { $lte: 10 } })',
        executar: () => produtos().find({ estoque: { $lte: 10 } }).toArray(),
      },
      e: {
        enunciado: 'Produtos com preço entre R$ 200 e R$ 1.000.',
        comando: 'db.produtos.find({ preco: { $gte: 200, $lte: 1000 } })',
        executar: () => produtos().find({ preco: { $gte: 200, $lte: 1000 } }).toArray(),
      },
    },
  },

  6: {
    titulo: 'Operadores lógicos',
    itens: {
      a: {
        enunciado: 'Produtos da marca TechPro com preço maior que R$ 100.',
        comando: 'db.produtos.find({ $and: [{ marca: "TechPro" }, { preco: { $gt: 100 } }] })',
        executar: () =>
          produtos().find({ $and: [{ marca: 'TechPro' }, { preco: { $gt: 100 } }] }).toArray(),
      },
      b: {
        enunciado: 'Produtos que sejam da marca TechPro ou da marca Vision.',
        comando: 'db.produtos.find({ $or: [{ marca: "TechPro" }, { marca: "Vision" }] })',
        executar: () =>
          produtos().find({ $or: [{ marca: 'TechPro' }, { marca: 'Vision' }] }).toArray(),
      },
      c: {
        enunciado: 'Produtos com preço menor que R$ 300 ou estoque menor que 10.',
        comando: 'db.produtos.find({ $or: [{ preco: { $lt: 300 } }, { estoque: { $lt: 10 } }] })',
        executar: () =>
          produtos().find({ $or: [{ preco: { $lt: 300 } }, { estoque: { $lt: 10 } }] }).toArray(),
      },
      d: {
        enunciado: 'Produtos que não sejam da marca TechPro nem da marca Vision.',
        comando: 'db.produtos.find({ $nor: [{ marca: "TechPro" }, { marca: "Vision" }] })',
        executar: () =>
          produtos().find({ $nor: [{ marca: 'TechPro' }, { marca: 'Vision' }] }).toArray(),
      },
    },
  },

  7: {
    titulo: 'Projeção de campos',
    itens: {
      a: {
        enunciado: 'Liste apenas nome e preco de todos os produtos.',
        comando: 'db.produtos.find({}, { nome: 1, preco: 1 })',
        executar: () => produtos().find({}, { projection: { nome: 1, preco: 1 } }).toArray(),
      },
      b: {
        enunciado: 'Liste apenas nome e estoque.',
        comando: 'db.produtos.find({}, { nome: 1, estoque: 1 })',
        executar: () => produtos().find({}, { projection: { nome: 1, estoque: 1 } }).toArray(),
      },
      c: {
        enunciado: 'Produtos da marca TechPro, mostrando apenas nome e preco.',
        comando: 'db.produtos.find({ marca: "TechPro" }, { nome: 1, preco: 1 })',
        executar: () =>
          produtos().find({ marca: 'TechPro' }, { projection: { nome: 1, preco: 1 } }).toArray(),
      },
      d: {
        enunciado: 'Consulta removendo o campo _id do resultado.',
        comando: 'db.produtos.find({}, { _id: 0, nome: 1, preco: 1 })',
        executar: () =>
          produtos().find({}, { projection: { _id: 0, nome: 1, preco: 1 } }).toArray(),
      },
    },
  },

  8: {
    titulo: 'Ordenação e limite',
    itens: {
      a: {
        enunciado: 'Produtos em ordem crescente de preço.',
        comando: 'db.produtos.find().sort({ preco: 1 })',
        executar: () => produtos().find().sort({ preco: 1 }).toArray(),
      },
      b: {
        enunciado: 'Produtos em ordem decrescente de preço.',
        comando: 'db.produtos.find().sort({ preco: -1 })',
        executar: () => produtos().find().sort({ preco: -1 }).toArray(),
      },
      c: {
        enunciado: 'Os três produtos mais baratos.',
        comando: 'db.produtos.find().sort({ preco: 1 }).limit(3)',
        executar: () => produtos().find().sort({ preco: 1 }).limit(3).toArray(),
      },
      d: {
        enunciado: 'Os dois produtos mais caros.',
        comando: 'db.produtos.find().sort({ preco: -1 }).limit(2)',
        executar: () => produtos().find().sort({ preco: -1 }).limit(2).toArray(),
      },
      e: {
        enunciado: 'Produtos em ordem decrescente de estoque.',
        comando: 'db.produtos.find().sort({ estoque: -1 })',
        executar: () => produtos().find().sort({ estoque: -1 }).toArray(),
      },
    },
  },

  9: {
    titulo: 'Atualizando documentos ($set)',
    observacao:
      'As alterações já estão aplicadas no banco. Para executá-las novamente use ' +
      'PATCH /api/produtos/:id com o corpo { "preco": 150 }.',
    itens: {
      d: {
        enunciado: 'Consulte os documentos atualizados para verificar as alterações.',
        comando: 'db.produtos.find({ nome: { $in: ["Mouse", "Notebook", "Teclado Mecânico"] } })',
        executar: () =>
          produtos().find({ nome: { $in: ['Mouse', 'Notebook', 'Teclado Mecânico'] } }).toArray(),
      },
    },
  },

  10: {
    titulo: 'Operadores de atualização ($inc)',
    observacao:
      'Use PATCH /api/produtos/:id/estoque { "quantidade": 5 } e ' +
      'PATCH /api/produtos/:id/preco { "valor": 50 } para reexecutar as operações.',
    itens: {
      e: {
        enunciado: 'Situação final da coleção produtos.',
        comando: 'db.produtos.find()',
        executar: () => produtos().find().toArray(),
      },
    },
  },

  11: {
    titulo: 'Removendo documentos',
    observacao:
      'O "Produto Teste" foi inserido e removido com deleteOne(). Reexecute com ' +
      'POST /api/produtos e DELETE /api/produtos/:id.',
    itens: {
      d: {
        enunciado: 'Consulte novamente a coleção após a remoção.',
        comando: 'db.produtos.find()',
        executar: () => produtos().find().toArray(),
      },
    },
  },

  12: {
    titulo: 'Documentos aninhados',
    itens: {
      a: {
        enunciado: 'Consulte o cliente pelo nome.',
        comando: 'db.clientes.find({ nome: "Ana Silva" })',
        executar: () => clientes().find({ nome: 'Ana Silva' }).toArray(),
      },
      b: {
        enunciado: 'Consulte clientes cuja cidade seja Vitória da Conquista.',
        comando: 'db.clientes.find({ "endereco.cidade": "Vitória da Conquista" })',
        executar: () =>
          clientes().find({ 'endereco.cidade': 'Vitória da Conquista' }).toArray(),
      },
      c: {
        enunciado: 'Exiba apenas nome e cidade.',
        comando: 'db.clientes.find({}, { _id: 0, nome: 1, "endereco.cidade": 1 })',
        executar: () =>
          clientes().find({}, { projection: { _id: 0, nome: 1, 'endereco.cidade': 1 } }).toArray(),
      },
      d: {
        enunciado: 'CEP alterado para 45000-100 (resultado do $set com notação de ponto).',
        comando: 'db.clientes.find({ nome: "Ana Silva" })',
        executar: () => clientes().find({ nome: 'Ana Silva' }).toArray(),
      },
    },
  },

  13: {
    titulo: 'Trabalhando com Arrays ($push e $pull)',
    itens: {
      a: {
        enunciado: 'Clientes que possuem games entre seus interesses.',
        comando: 'db.clientes.find({ interesses: "games" })',
        executar: () => clientes().find({ interesses: 'games' }).toArray(),
      },
      b: {
        enunciado: 'Clientes que possuem programacao.',
        comando: 'db.clientes.find({ interesses: "programacao" })',
        executar: () => clientes().find({ interesses: 'programacao' }).toArray(),
      },
      d: {
        enunciado: 'Estado final dos interesses de Bruno (musica adicionada, cinema removido).',
        comando: 'db.clientes.find({ nome: "Bruno Santos" })',
        executar: () => clientes().find({ nome: 'Bruno Santos' }).toArray(),
      },
    },
  },

  14: {
    titulo: '$push, $addToSet e arrays',
    observacao:
      'O array de Carla mantém "MongoDB" duplicado porque o $push não verifica repetição; ' +
      'o $addToSet posterior não alterou nada (modifiedCount: 0).',
    itens: {
      e: {
        enunciado: 'Resultado após $push (duplicando) e $addToSet (sem duplicar).',
        comando: 'db.clientes.find({ nome: "Carla" })',
        executar: () => clientes().find({ nome: 'Carla' }).toArray(),
      },
    },
  },

  15: {
    titulo: 'Modelagem de documentos — Interestelar',
    itens: {
      a: {
        enunciado: 'Documento proposto, com valores simples, arrays e documentos aninhados.',
        comando: 'db.filmes.find({ titulo: "Interestelar" })',
        executar: () => filmes().find({ titulo: 'Interestelar' }).toArray(),
      },
    },
  },

  16: {
    titulo: 'Sistema de estudantes',
    itens: {
      a: {
        enunciado: 'Todos os alunos de Sistemas de Informação.',
        comando: 'db.alunos.find({ curso: "Sistemas de Informação" })',
        executar: () => alunos().find({ curso: 'Sistemas de Informação' }).toArray(),
      },
      b: {
        enunciado: 'Alunos com idade maior que 20 anos.',
        comando: 'db.alunos.find({ idade: { $gt: 20 } })',
        executar: () => alunos().find({ idade: { $gt: 20 } }).toArray(),
      },
      c: {
        enunciado: 'Alunos do quarto semestre.',
        comando: 'db.alunos.find({ semestre: 4 })',
        executar: () => alunos().find({ semestre: 4 }).toArray(),
      },
      d: {
        enunciado: 'Alunos que possuem uma nota igual a 9.0.',
        comando: 'db.alunos.find({ notas: 9.0 })',
        executar: () => alunos().find({ notas: 9.0 }).toArray(),
      },
      e: {
        enunciado: 'Apenas nome e curso dos alunos.',
        comando: 'db.alunos.find({}, { _id: 0, nome: 1, curso: 1 })',
        executar: () => alunos().find({}, { projection: { _id: 0, nome: 1, curso: 1 } }).toArray(),
      },
    },
  },

  17: {
    titulo: 'Introdução ao Aggregation Pipeline',
    itens: {
      a: {
        enunciado: 'Vendas da categoria Periféricos.',
        comando: 'db.vendas.aggregate([{ $match: { categoria: "Periféricos" } }])',
        executar: () => vendas().aggregate([{ $match: { categoria: 'Periféricos' } }]).toArray(),
      },
      b: {
        enunciado: 'Vendas com quantidade maior que 3.',
        comando: 'db.vendas.aggregate([{ $match: { quantidade: { $gt: 3 } } }])',
        executar: () => vendas().aggregate([{ $match: { quantidade: { $gt: 3 } } }]).toArray(),
      },
      c: {
        enunciado: 'Vendas ordenadas por quantidade em ordem decrescente.',
        comando: 'db.vendas.aggregate([{ $sort: { quantidade: -1 } }])',
        executar: () => vendas().aggregate([{ $sort: { quantidade: -1 } }]).toArray(),
      },
    },
  },

  18: {
    titulo: 'Agrupamento de dados ($group)',
    itens: {
      a: {
        enunciado: 'Quantidade total de produtos vendidos.',
        comando:
          'db.vendas.aggregate([{ $group: { _id: null, totalProdutosVendidos: { $sum: "$quantidade" } } }])',
        executar: () =>
          vendas()
            .aggregate([{ $group: { _id: null, totalProdutosVendidos: { $sum: '$quantidade' } } }])
            .toArray(),
      },
      b: {
        enunciado: 'Registros agrupados por categoria.',
        comando:
          'db.vendas.aggregate([{ $group: { _id: "$categoria", produtos: { $push: "$produto" }, registros: { $sum: 1 } } }])',
        executar: () =>
          vendas()
            .aggregate([
              {
                $group: {
                  _id: '$categoria',
                  produtos: { $push: '$produto' },
                  registros: { $sum: 1 },
                },
              },
            ])
            .toArray(),
      },
      c: {
        enunciado: 'Quantidade total vendida de cada categoria.',
        comando:
          'db.vendas.aggregate([{ $group: { _id: "$categoria", quantidadeTotal: { $sum: "$quantidade" } } }, { $sort: { quantidadeTotal: -1 } }])',
        executar: () =>
          vendas()
            .aggregate([
              { $group: { _id: '$categoria', quantidadeTotal: { $sum: '$quantidade' } } },
              { $sort: { quantidadeTotal: -1 } },
            ])
            .toArray(),
      },
      d: {
        enunciado: 'Valor médio dos produtos de cada categoria.',
        comando:
          'db.vendas.aggregate([{ $group: { _id: "$categoria", valorMedio: { $avg: "$valorUnitario" } } }, { $sort: { valorMedio: -1 } }])',
        executar: () =>
          vendas()
            .aggregate([
              { $group: { _id: '$categoria', valorMedio: { $avg: '$valorUnitario' } } },
              { $sort: { valorMedio: -1 } },
            ])
            .toArray(),
      },
    },
  },

  19: {
    titulo: 'Calculando faturamento',
    itens: {
      a: {
        enunciado: 'Produto, quantidade, valor unitário e valor total.',
        comando:
          'db.vendas.aggregate([{ $project: { _id: 0, produto: 1, quantidade: 1, valorUnitario: 1, valorTotal: { $multiply: ["$quantidade", "$valorUnitario"] } } }])',
        executar: () =>
          vendas()
            .aggregate([
              {
                $project: {
                  _id: 0,
                  produto: 1,
                  quantidade: 1,
                  valorUnitario: 1,
                  valorTotal: { $multiply: ['$quantidade', '$valorUnitario'] },
                },
              },
            ])
            .toArray(),
      },
      b: {
        enunciado: 'Faturamento total da loja.',
        comando:
          'db.vendas.aggregate([{ $project: { valorTotal: { $multiply: ["$quantidade", "$valorUnitario"] } } }, { $group: { _id: null, faturamentoTotal: { $sum: "$valorTotal" } } }])',
        executar: () =>
          vendas()
            .aggregate([
              { $project: { valorTotal: { $multiply: ['$quantidade', '$valorUnitario'] } } },
              { $group: { _id: null, faturamentoTotal: { $sum: '$valorTotal' } } },
            ])
            .toArray(),
      },
      c: {
        enunciado: 'Faturamento total por categoria.',
        comando:
          'db.vendas.aggregate([{ $project: { categoria: 1, valorTotal: { $multiply: ["$quantidade", "$valorUnitario"] } } }, { $group: { _id: "$categoria", faturamento: { $sum: "$valorTotal" } } }])',
        executar: () =>
          vendas()
            .aggregate([
              {
                $project: {
                  categoria: 1,
                  valorTotal: { $multiply: ['$quantidade', '$valorUnitario'] },
                },
              },
              { $group: { _id: '$categoria', faturamento: { $sum: '$valorTotal' } } },
            ])
            .toArray(),
      },
      d: {
        enunciado: 'Categorias ordenadas da maior para a menor em faturamento.',
        comando: '... + { $sort: { faturamento: -1 } }',
        executar: () =>
          vendas()
            .aggregate([
              {
                $project: {
                  categoria: 1,
                  valorTotal: { $multiply: ['$quantidade', '$valorUnitario'] },
                },
              },
              { $group: { _id: '$categoria', faturamento: { $sum: '$valorTotal' } } },
              { $sort: { faturamento: -1 } },
            ])
            .toArray(),
      },
    },
  },

  20: {
    titulo: 'Mini sistema de pedidos',
    itens: {
      a: {
        enunciado: 'Liste todos os pedidos.',
        comando: 'db.pedidos.find()',
        executar: () => pedidos().find().sort({ numero: 1 }).toArray(),
      },
      b: {
        enunciado: 'Pedidos com status Pago.',
        comando: 'db.pedidos.find({ status: "Pago" })',
        executar: () => pedidos().find({ status: 'Pago' }).toArray(),
      },
      c: {
        enunciado: 'Pedidos de determinado cliente (Ana Silva).',
        comando: 'db.pedidos.find({ "cliente.nome": "Ana Silva" })',
        executar: () => pedidos().find({ 'cliente.nome': 'Ana Silva' }).toArray(),
      },
      d: {
        enunciado: 'Pedidos de clientes de Vitória da Conquista.',
        comando: 'db.pedidos.find({ "cliente.cidade": "Vitória da Conquista" })',
        executar: () => pedidos().find({ 'cliente.cidade': 'Vitória da Conquista' }).toArray(),
      },
      e: {
        enunciado: 'Pedidos que contenham o produto Notebook.',
        comando: 'db.pedidos.find({ "itens.produto": "Notebook" })',
        executar: () => pedidos().find({ 'itens.produto': 'Notebook' }).toArray(),
      },
      f: {
        enunciado: 'Pedido 1001 após a mudança de Pago para Enviado.',
        comando: 'db.pedidos.find({ numero: 1001 }, { _id: 0, numero: 1, status: 1 })',
        executar: () =>
          pedidos().find({ numero: 1001 }, { projection: { _id: 0, numero: 1, status: 1 } }).toArray(),
      },
      g: {
        enunciado: 'Quantos pedidos estão com status Entregue.',
        comando: 'db.pedidos.countDocuments({ status: "Entregue" })',
        executar: () => pedidos().countDocuments({ status: 'Entregue' }),
      },
      h: {
        enunciado: 'Pedidos agrupados por status.',
        comando:
          'db.pedidos.aggregate([{ $group: { _id: "$status", totalPedidos: { $sum: 1 } } }, { $sort: { totalPedidos: -1, _id: 1 } }])',
        executar: () =>
          pedidos()
            .aggregate([
              { $group: { _id: '$status', totalPedidos: { $sum: 1 } } },
              { $sort: { totalPedidos: -1, _id: 1 } },
            ])
            .toArray(),
      },
    },
  },
};

/**
 * @openapi
 * /api/exercicios:
 *   get:
 *     tags: [Exercícios]
 *     summary: Índice dos 20 exercícios da lista
 *     description: Devolve, para cada exercício, o título, os itens disponíveis e a URL para executá-los.
 *     responses:
 *       200:
 *         description: Índice dos exercícios.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer, example: 20 }
 *                 exercicios:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       exercicio: { type: integer, example: 6 }
 *                       titulo: { type: string, example: Operadores lógicos }
 *                       itens: { type: array, items: { type: string }, example: [a, b, c, d] }
 *                       url: { type: string, format: uri }
 */
router.get('/', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}/api/exercicios`;
  const indice = Object.entries(EXERCICIOS).map(([numero, ex]) => ({
    exercicio: Number(numero),
    titulo: ex.titulo,
    itens: Object.keys(ex.itens),
    url: `${base}/${numero}`,
  }));
  res.json({ total: indice.length, exercicios: indice });
});

/**
 * @openapi
 * /api/exercicios/{numero}:
 *   get:
 *     tags: [Exercícios]
 *     summary: Executa todos os itens de um exercício
 *     description: >
 *       Para cada item devolve o enunciado, o comando equivalente no `mongosh`
 *       e o resultado real vindo do banco.
 *     parameters:
 *       - name: numero
 *         in: path
 *         required: true
 *         schema: { type: integer, minimum: 2, maximum: 20 }
 *         example: 6
 *     responses:
 *       200:
 *         description: Itens executados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exercicio: { type: integer, example: 6 }
 *                 titulo: { type: string, example: Operadores lógicos }
 *                 observacao: { type: string, description: Presente apenas nos exercícios de escrita. }
 *                 itens:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/RespostaExercicio' }
 *       404:
 *         description: Exercício inexistente — a resposta lista os números disponíveis.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Erro' }
 */
router.get(
  '/:numero',
  wrap(async (req, res) => {
    const ex = EXERCICIOS[req.params.numero];
    if (!ex) {
      return res.status(404).json({
        erro: `Exercício ${req.params.numero} não encontrado.`,
        disponiveis: Object.keys(EXERCICIOS).map(Number),
      });
    }

    const itens = [];
    for (const [letra, item] of Object.entries(ex.itens)) {
      const resultado = await item.executar();
      itens.push({
        item: letra,
        enunciado: item.enunciado,
        comandoMongosh: item.comando,
        total: Array.isArray(resultado) ? resultado.length : undefined,
        resultado,
      });
    }

    res.json({
      exercicio: Number(req.params.numero),
      titulo: ex.titulo,
      observacao: ex.observacao,
      itens,
    });
  })
);

/**
 * @openapi
 * /api/exercicios/{numero}/{letra}:
 *   get:
 *     tags: [Exercícios]
 *     summary: Executa um item específico da lista
 *     description: 'Exemplo: `/api/exercicios/6/d` devolve o resultado do exercício 6d (`$nor`).'
 *     parameters:
 *       - name: numero
 *         in: path
 *         required: true
 *         schema: { type: integer, minimum: 2, maximum: 20 }
 *         example: 6
 *       - name: letra
 *         in: path
 *         required: true
 *         schema: { type: string, pattern: '^[a-h]$' }
 *         example: d
 *     responses:
 *       200:
 *         description: Enunciado, comando e resultado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespostaExercicio' }
 *       404:
 *         description: Item inexistente — a resposta lista os itens disponíveis.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Erro' }
 */
router.get(
  '/:numero/:letra',
  wrap(async (req, res) => {
    const ex = EXERCICIOS[req.params.numero];
    const item = ex?.itens?.[req.params.letra.toLowerCase()];
    if (!item) {
      return res.status(404).json({
        erro: `Item ${req.params.numero}${req.params.letra} não encontrado.`,
        itensDisponiveis: ex ? Object.keys(ex.itens) : [],
      });
    }
    const resultado = await item.executar();
    res.json({
      exercicio: `${req.params.numero}${req.params.letra}`,
      enunciado: item.enunciado,
      comandoMongosh: item.comando,
      total: Array.isArray(resultado) ? resultado.length : undefined,
      resultado,
    });
  })
);

export default router;
