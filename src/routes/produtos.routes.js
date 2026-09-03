import { Router } from 'express';
import { col, toObjectId } from '../db.js';
import { wrap, num, exigirCampos, naoEncontrado } from '../utils.js';

const router = Router();
const produtos = () => col('produtos');

/**
 * @openapi
 * /api/produtos:
 *   get:
 *     tags: [Produtos]
 *     summary: Lista produtos com filtros, projeção, ordenação e limite
 *     description: |
 *       Cobre os exercícios 4 a 8 em um único endpoint.
 *
 *       Exemplos:
 *       - `?marca=TechPro` — exercício 4b
 *       - `?precoMin=200&precoMax=1000` — exercício 5e (`$gte` + `$lte`)
 *       - `?ordenarPor=preco&ordem=asc&limite=3` — exercício 8c
 *       - `?campos=nome,preco&semId=true` — exercício 7d
 *     parameters:
 *       - { name: nome,       in: query, schema: { type: string },  example: Mouse }
 *       - { name: marca,      in: query, schema: { type: string },  example: TechPro }
 *       - { name: estoque,    in: query, schema: { type: integer }, description: Estoque exatamente igual ao valor. }
 *       - { name: precoMin,   in: query, schema: { type: number },  description: "Operador $gte sobre o preço." }
 *       - { name: precoMax,   in: query, schema: { type: number },  description: "Operador $lte sobre o preço." }
 *       - { name: estoqueMin, in: query, schema: { type: integer }, description: "Operador $gte sobre o estoque." }
 *       - { name: estoqueMax, in: query, schema: { type: integer }, description: "Operador $lte sobre o estoque." }
 *       - name: ordenarPor
 *         in: query
 *         schema: { type: string, enum: [nome, preco, estoque, marca] }
 *       - name: ordem
 *         in: query
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *       - { name: limite, in: query, schema: { type: integer, minimum: 1 }, description: Equivale ao limit(). }
 *       - name: campos
 *         in: query
 *         schema: { type: string }
 *         example: nome,preco
 *         description: Campos a incluir na projeção, separados por vírgula.
 *       - name: semId
 *         in: query
 *         schema: { type: boolean }
 *         description: "Quando true, remove o _id do resultado (_id: 0)."
 *     responses:
 *       200:
 *         description: Lista de produtos.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ListaFiltrada'
 *                 - type: object
 *                   properties:
 *                     dados: { type: array, items: { $ref: '#/components/schemas/Produto' } }
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const { nome, marca, estoque, precoMin, precoMax, estoqueMin, estoqueMax } = req.query;

    const filtro = {};
    if (nome) filtro.nome = nome;
    if (marca) filtro.marca = marca;
    if (estoque !== undefined) filtro.estoque = num(estoque);

    const preco = {};
    if (precoMin !== undefined) preco.$gte = num(precoMin);
    if (precoMax !== undefined) preco.$lte = num(precoMax);
    if (Object.keys(preco).length) filtro.preco = preco;

    const est = {};
    if (estoqueMin !== undefined) est.$gte = num(estoqueMin);
    if (estoqueMax !== undefined) est.$lte = num(estoqueMax);
    if (Object.keys(est).length) filtro.estoque = est;

    // Projeção (exercício 7)
    let projecao = {};
    if (req.query.campos) {
      for (const campo of String(req.query.campos).split(',')) projecao[campo.trim()] = 1;
      if (req.query.semId === 'true') projecao._id = 0;
    }

    // Ordenação e limite (exercício 8)
    const ordenarPor = req.query.ordenarPor;
    const sort = ordenarPor ? { [ordenarPor]: req.query.ordem === 'desc' ? -1 : 1 } : {};
    const limite = num(req.query.limite, 0);

    const cursor = produtos().find(filtro, { projection: projecao }).sort(sort);
    if (limite > 0) cursor.limit(limite);

    const dados = await cursor.toArray();
    res.json({ filtro, sort, limite: limite || null, total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/produtos/contagem:
 *   get:
 *     tags: [Produtos]
 *     summary: Conta os documentos da coleção (exercício 3b)
 *     description: Executa `db.produtos.countDocuments()`.
 *     responses:
 *       200:
 *         description: Total de produtos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer, example: 5 }
 */
router.get(
  '/contagem',
  wrap(async (_req, res) => {
    res.json({ total: await produtos().countDocuments() });
  })
);

/**
 * @openapi
 * /api/produtos/{id}:
 *   get:
 *     tags: [Produtos]
 *     summary: Busca um produto pelo _id
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Produto encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Produto' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.get(
  '/:id',
  wrap(async (req, res) => {
    const doc = await produtos().findOne({ _id: toObjectId(req.params.id) });
    if (!doc) throw naoEncontrado(`Produto ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/produtos:
 *   post:
 *     tags: [Produtos]
 *     summary: Cadastra um produto ou vários de uma vez (exercícios 2 e 3)
 *     description: Um objeto no corpo usa `insertOne()`; um array usa `insertMany()`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/ProdutoEntrada'
 *               - type: array
 *                 items: { $ref: '#/components/schemas/ProdutoEntrada' }
 *           examples:
 *             umProduto:
 *               summary: insertOne (exercício 2)
 *               value: { nome: Notebook, marca: TechPro, preco: 4500, estoque: 10 }
 *             varios:
 *               summary: insertMany (exercício 3)
 *               value:
 *                 - { nome: Mouse, marca: TechPro, preco: 120, estoque: 30 }
 *                 - { nome: Headset, marca: SoundMax, preco: 250, estoque: 20 }
 *     responses:
 *       201:
 *         description: Produto(s) criado(s).
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Produto'
 *                 - $ref: '#/components/schemas/ResultadoInsercaoMultipla'
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 */
router.post(
  '/',
  wrap(async (req, res) => {
    if (Array.isArray(req.body)) {
      req.body.forEach((p) => exigirCampos(p, ['nome', 'preco']));
      const r = await produtos().insertMany(req.body);
      return res.status(201).json({ inseridos: r.insertedCount, ids: r.insertedIds });
    }
    exigirCampos(req.body, ['nome', 'preco']);
    const r = await produtos().insertOne(req.body);
    res.status(201).json({ _id: r.insertedId, ...req.body });
  })
);

/**
 * @openapi
 * /api/produtos/{id}:
 *   patch:
 *     tags: [Produtos]
 *     summary: Atualiza campos do produto com $set (exercício 9)
 *     description: Um `_id` enviado no corpo é descartado, pois o campo é imutável.
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, additionalProperties: true }
 *           examples:
 *             alterarPreco:
 *               summary: Exercício 9a
 *               value: { preco: 150 }
 *             novoCampo:
 *               summary: Exercício 9c
 *               value: { categoria: Periféricos }
 *     responses:
 *       200:
 *         description: Documento já atualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Produto' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.patch(
  '/:id',
  wrap(async (req, res) => {
    const { _id, ...campos } = req.body; // _id é imutável
    if (!Object.keys(campos).length) {
      return res.status(400).json({ erro: 'Informe ao menos um campo para atualizar.' });
    }
    const doc = await produtos().findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $set: campos },
      { returnDocument: 'after' }
    );
    if (!doc) throw naoEncontrado(`Produto ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/produtos/{id}/estoque:
 *   patch:
 *     tags: [Produtos]
 *     summary: Soma (ou subtrai) unidades no estoque com $inc (exercícios 10a e 10b)
 *     description: Valores negativos reduzem o estoque — não existe operador `$dec` no MongoDB.
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantidade]
 *             properties:
 *               quantidade: { type: integer, example: 5 }
 *           examples:
 *             aumentar: { summary: Exercicio 10a, value: { quantidade: 5 } }
 *             reduzir: { summary: Exercicio 10b, value: { quantidade: -2 } }
 *     responses:
 *       200:
 *         description: Documento já atualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Produto' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.patch(
  '/:id/estoque',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['quantidade']);
    const doc = await produtos().findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $inc: { estoque: num(req.body.quantidade, 0) } },
      { returnDocument: 'after' }
    );
    if (!doc) throw naoEncontrado(`Produto ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/produtos/{id}/preco:
 *   patch:
 *     tags: [Produtos]
 *     summary: Soma um valor ao preço com $inc (exercício 10c)
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [valor]
 *             properties:
 *               valor: { type: number, example: 50 }
 *     responses:
 *       200:
 *         description: Documento já atualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Produto' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.patch(
  '/:id/preco',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['valor']);
    const doc = await produtos().findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $inc: { preco: num(req.body.valor, 0) } },
      { returnDocument: 'after' }
    );
    if (!doc) throw naoEncontrado(`Produto ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/produtos/marcar-disponiveis:
 *   post:
 *     tags: [Produtos]
 *     summary: Marca disponivel=true nos produtos com estoque maior que zero (exercício 10d)
 *     description: Usa `updateMany()` com `$set` — atinge todos os documentos do filtro.
 *     responses:
 *       200:
 *         description: Quantidade de documentos encontrados e modificados.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ResultadoAtualizacao' }
 */
router.post(
  '/marcar-disponiveis',
  wrap(async (_req, res) => {
    const r = await produtos().updateMany({ estoque: { $gt: 0 } }, { $set: { disponivel: true } });
    res.json({ encontrados: r.matchedCount, modificados: r.modifiedCount });
  })
);

/**
 * @openapi
 * /api/produtos/{id}:
 *   delete:
 *     tags: [Produtos]
 *     summary: Remove um produto com deleteOne (exercício 11c)
 *     description: >
 *       `deleteOne()` remove apenas o primeiro documento correspondente ao filtro;
 *       `deleteMany()` removeria todos.
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
    const r = await produtos().deleteOne({ _id: toObjectId(req.params.id) });
    if (!r.deletedCount) throw naoEncontrado(`Produto ${req.params.id} não encontrado.`);
    res.json({ removidos: r.deletedCount });
  })
);

export default router;
