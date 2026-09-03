import { Router } from 'express';
import { col, toObjectId } from '../db.js';
import { wrap, num, exigirCampos, naoEncontrado } from '../utils.js';

const router = Router();
const vendas = () => col('vendas');

/**
 * @openapi
 * /api/vendas:
 *   get:
 *     tags: [Vendas]
 *     summary: Lista vendas usando aggregate com $match e $sort (exercício 17)
 *     description: >
 *       O pipeline montado é devolvido junto da resposta, para conferência.
 *       O `$match` vem sempre antes do `$sort`, reduzindo o volume processado.
 *     parameters:
 *       - { name: categoria, in: query, schema: { type: string }, example: Periféricos, description: 'Estágio $match — exercício 17a.' }
 *       - { name: quantidadeMin, in: query, schema: { type: integer }, example: 3, description: 'Estágio $match com $gt — exercício 17b.' }
 *       - { name: ordenarPor, in: query, schema: { type: string, enum: [quantidade, valorUnitario, produto] } }
 *       - { name: ordem, in: query, schema: { type: string, enum: [asc, desc], default: desc } }
 *     responses:
 *       200:
 *         description: Vendas e o pipeline utilizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pipeline: { type: array, items: { type: object }, description: Estágios enviados ao MongoDB. }
 *                 total: { type: integer }
 *                 dados: { type: array, items: { $ref: '#/components/schemas/Venda' } }
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const { categoria, quantidadeMin, ordenarPor, ordem } = req.query;

    const pipeline = [];
    const match = {};
    if (categoria) match.categoria = categoria;
    if (quantidadeMin !== undefined) match.quantidade = { $gt: num(quantidadeMin) };
    if (Object.keys(match).length) pipeline.push({ $match: match });

    if (ordenarPor) pipeline.push({ $sort: { [ordenarPor]: ordem === 'asc' ? 1 : -1 } });

    const dados = await vendas().aggregate(pipeline).toArray();
    res.json({ pipeline, total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/vendas/resumo:
 *   get:
 *     tags: [Vendas]
 *     summary: Totais e médias por categoria (exercício 18)
 *     description: '`$group` com `$sum` (total e contagem), `$avg` (valor médio) e `$push` (lista de produtos).'
 *     responses:
 *       200:
 *         description: Resumo das vendas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalProdutosVendidos: { type: integer, example: 20 }
 *                 porCategoria:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoria: { type: string, example: Periféricos }
 *                       quantidadeTotal: { type: integer, example: 14 }
 *                       valorMedio: { type: number, example: 266.67 }
 *                       registros: { type: integer, example: 3 }
 *                       produtos: { type: array, items: { type: string } }
 */
router.get(
  '/resumo',
  wrap(async (_req, res) => {
    const [totalGeral] = await vendas()
      .aggregate([{ $group: { _id: null, totalProdutosVendidos: { $sum: '$quantidade' } } }])
      .toArray();

    const porCategoria = await vendas()
      .aggregate([
        {
          $group: {
            _id: '$categoria',
            quantidadeTotal: { $sum: '$quantidade' },
            valorMedio: { $avg: '$valorUnitario' },
            registros: { $sum: 1 },
            produtos: { $push: '$produto' },
          },
        },
        {
          $project: {
            _id: 0,
            categoria: '$_id',
            quantidadeTotal: 1,
            valorMedio: { $round: ['$valorMedio', 2] },
            registros: 1,
            produtos: 1,
          },
        },
        { $sort: { quantidadeTotal: -1 } },
      ])
      .toArray();

    res.json({
      totalProdutosVendidos: totalGeral?.totalProdutosVendidos ?? 0,
      porCategoria,
    });
  })
);

/**
 * @openapi
 * /api/vendas/faturamento:
 *   get:
 *     tags: [Vendas]
 *     summary: Faturamento total, por categoria e por venda (exercício 19)
 *     description: '`$project` com `$multiply` calcula `valorTotal = quantidade × valorUnitario`; `$group` + `$sum` + `$sort` agregam por categoria.'
 *     responses:
 *       200:
 *         description: Faturamento calculado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 faturamentoTotal: { type: number, example: 16200 }
 *                 porCategoria:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoria: { type: string, example: Informática }
 *                       faturamento: { type: number, example: 12600 }
 *                 porVenda:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       produto: { type: string }
 *                       quantidade: { type: integer }
 *                       valorUnitario: { type: number }
 *                       valorTotal: { type: number }
 */
router.get(
  '/faturamento',
  wrap(async (_req, res) => {
    const porVenda = await vendas()
      .aggregate([
        {
          $project: {
            _id: 0,
            produto: 1,
            categoria: 1,
            quantidade: 1,
            valorUnitario: 1,
            valorTotal: { $multiply: ['$quantidade', '$valorUnitario'] },
          },
        },
        { $sort: { valorTotal: -1 } },
      ])
      .toArray();

    const porCategoria = await vendas()
      .aggregate([
        { $project: { categoria: 1, valorTotal: { $multiply: ['$quantidade', '$valorUnitario'] } } },
        { $group: { _id: '$categoria', faturamento: { $sum: '$valorTotal' } } },
        { $project: { _id: 0, categoria: '$_id', faturamento: 1 } },
        { $sort: { faturamento: -1 } },
      ])
      .toArray();

    const faturamentoTotal = porVenda.reduce((acc, v) => acc + v.valorTotal, 0);

    res.json({ faturamentoTotal, porCategoria, porVenda });
  })
);

/**
 * @openapi
 * /api/vendas/{id}:
 *   get:
 *     tags: [Vendas]
 *     summary: Busca uma venda pelo _id
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Venda encontrada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Venda' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.get(
  '/:id',
  wrap(async (req, res) => {
    const doc = await vendas().findOne({ _id: toObjectId(req.params.id) });
    if (!doc) throw naoEncontrado(`Venda ${req.params.id} não encontrada.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/vendas:
 *   post:
 *     tags: [Vendas]
 *     summary: Registra uma ou várias vendas (exercício 17)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/Venda'
 *               - type: array
 *                 items: { $ref: '#/components/schemas/Venda' }
 *           example:
 *             { produto: Notebook, categoria: Informática, quantidade: 2, valorUnitario: 4500 }
 *     responses:
 *       201:
 *         description: Venda(s) registrada(s).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ResultadoInsercaoMultipla' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 */
router.post(
  '/',
  wrap(async (req, res) => {
    const corpo = Array.isArray(req.body) ? req.body : [req.body];
    corpo.forEach((v) => exigirCampos(v, ['produto', 'categoria', 'quantidade', 'valorUnitario']));
    const r = await vendas().insertMany(corpo);
    res.status(201).json({ inseridos: r.insertedCount, ids: r.insertedIds });
  })
);

/**
 * @openapi
 * /api/vendas/{id}:
 *   delete:
 *     tags: [Vendas]
 *     summary: Remove uma venda
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Documento removido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ResultadoRemocao' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.delete(
  '/:id',
  wrap(async (req, res) => {
    const r = await vendas().deleteOne({ _id: toObjectId(req.params.id) });
    if (!r.deletedCount) throw naoEncontrado(`Venda ${req.params.id} não encontrada.`);
    res.json({ removidos: r.deletedCount });
  })
);

export default router;
