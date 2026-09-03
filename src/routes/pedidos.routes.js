import { Router } from 'express';
import { col, toObjectId } from '../db.js';
import { wrap, num, exigirCampos, naoEncontrado } from '../utils.js';

const router = Router();
const pedidos = () => col('pedidos');

const STATUS_VALIDOS = ['Aguardando pagamento', 'Pago', 'Enviado', 'Entregue', 'Cancelado'];

/**
 * @openapi
 * /api/pedidos:
 *   get:
 *     tags: [Pedidos]
 *     summary: Lista pedidos com filtros (exercício 20, itens a a e)
 *     description: >
 *       `?cliente=` e `?cidade=` usam notação de ponto sobre o documento aninhado `cliente`;
 *       `?produto=` procura dentro do array de documentos `itens` (`itens.produto`).
 *     parameters:
 *       - { name: status, in: query, schema: { $ref: '#/components/schemas/StatusPedido' }, description: 'Exercício 20b.' }
 *       - { name: cliente, in: query, schema: { type: string }, example: Ana Silva, description: 'Filtra por cliente.nome — exercício 20c.' }
 *       - { name: cidade, in: query, schema: { type: string }, example: Vitória da Conquista, description: 'Filtra por cliente.cidade — exercício 20d.' }
 *       - { name: produto, in: query, schema: { type: string }, example: Notebook, description: 'Filtra por itens.produto — exercício 20e.' }
 *       - { name: formaPagamento, in: query, schema: { type: string, enum: [Cartão, Pix, Boleto] } }
 *     responses:
 *       200:
 *         description: Lista de pedidos ordenada por número.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ListaFiltrada'
 *                 - type: object
 *                   properties:
 *                     dados: { type: array, items: { $ref: '#/components/schemas/Pedido' } }
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const { status, cliente, cidade, produto, formaPagamento } = req.query;
    const filtro = {};
    if (status) filtro.status = status;
    if (cliente) filtro['cliente.nome'] = cliente;        // documento aninhado
    if (cidade) filtro['cliente.cidade'] = cidade;
    if (produto) filtro['itens.produto'] = produto;       // array de documentos
    if (formaPagamento) filtro.formaPagamento = formaPagamento;

    const dados = await pedidos().find(filtro).sort({ numero: 1 }).toArray();
    res.json({ filtro, total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/pedidos/por-status:
 *   get:
 *     tags: [Pedidos]
 *     summary: Agrupa os pedidos por status (exercício 20h)
 *     description: '`$group` com `_id: "$status"` e `$sum: 1` para contar, mais `$push` para listar os números.'
 *     responses:
 *       200:
 *         description: Quantidade de pedidos em cada situação.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 dados:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status: { type: string, example: Entregue }
 *                       totalPedidos: { type: integer, example: 2 }
 *                       numeros: { type: array, items: { type: integer }, example: [1003, 1006] }
 */
router.get(
  '/por-status',
  wrap(async (_req, res) => {
    const dados = await pedidos()
      .aggregate([
        { $group: { _id: '$status', totalPedidos: { $sum: 1 }, numeros: { $push: '$numero' } } },
        { $project: { _id: 0, status: '$_id', totalPedidos: 1, numeros: 1 } },
        { $sort: { totalPedidos: -1, status: 1 } },
      ])
      .toArray();
    res.json({ total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/pedidos/contagem:
 *   get:
 *     tags: [Pedidos]
 *     summary: Conta pedidos, opcionalmente por status (exercício 20g)
 *     parameters:
 *       - { name: status, in: query, schema: { $ref: '#/components/schemas/StatusPedido' } }
 *     responses:
 *       200:
 *         description: Total encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 filtro: { type: object }
 *                 total: { type: integer, example: 2 }
 */
router.get(
  '/contagem',
  wrap(async (req, res) => {
    const filtro = req.query.status ? { status: req.query.status } : {};
    res.json({ filtro, total: await pedidos().countDocuments(filtro) });
  })
);

/**
 * @openapi
 * /api/pedidos/faturamento:
 *   get:
 *     tags: [Pedidos]
 *     summary: Valor de cada pedido e faturamento consolidado
 *     description: >
 *       Usa `$unwind` para desmontar o array `itens` (um documento por item) e depois
 *       `$group` somando `quantidade × preco`. O faturamento confirmado ignora pedidos
 *       cancelados e aguardando pagamento.
 *     responses:
 *       200:
 *         description: Faturamento por pedido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 faturamentoTotal: { type: number, example: 14800 }
 *                 faturamentoConfirmado: { type: number, example: 9250 }
 *                 pedidos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       numero: { type: integer, example: 1001 }
 *                       cliente: { type: string }
 *                       status: { type: string }
 *                       valorPedido: { type: number, example: 4800 }
 */
router.get(
  '/faturamento',
  wrap(async (_req, res) => {
    const dados = await pedidos()
      .aggregate([
        { $unwind: '$itens' },
        {
          $group: {
            _id: '$numero',
            cliente: { $first: '$cliente.nome' },
            status: { $first: '$status' },
            valorPedido: { $sum: { $multiply: ['$itens.quantidade', '$itens.preco'] } },
          },
        },
        { $project: { _id: 0, numero: '$_id', cliente: 1, status: 1, valorPedido: 1 } },
        { $sort: { numero: 1 } },
      ])
      .toArray();

    const faturamentoTotal = dados.reduce((acc, p) => acc + p.valorPedido, 0);
    const faturamentoConfirmado = dados
      .filter((p) => p.status !== 'Cancelado' && p.status !== 'Aguardando pagamento')
      .reduce((acc, p) => acc + p.valorPedido, 0);

    res.json({ faturamentoTotal, faturamentoConfirmado, pedidos: dados });
  })
);

/**
 * @openapi
 * /api/pedidos/produtos-mais-vendidos:
 *   get:
 *     tags: [Pedidos]
 *     summary: Ranking de produtos a partir do array de itens
 *     description: '`$match` (descarta cancelados) + `$unwind` + `$group` com `$sum`.'
 *     responses:
 *       200:
 *         description: Produtos ordenados por unidades vendidas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 dados:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       produto: { type: string, example: Mouse }
 *                       unidades: { type: integer, example: 5 }
 *                       receita: { type: number, example: 750 }
 */
router.get(
  '/produtos-mais-vendidos',
  wrap(async (_req, res) => {
    const dados = await pedidos()
      .aggregate([
        { $match: { status: { $ne: 'Cancelado' } } },
        { $unwind: '$itens' },
        {
          $group: {
            _id: '$itens.produto',
            unidades: { $sum: '$itens.quantidade' },
            receita: { $sum: { $multiply: ['$itens.quantidade', '$itens.preco'] } },
          },
        },
        { $project: { _id: 0, produto: '$_id', unidades: 1, receita: 1 } },
        { $sort: { unidades: -1, receita: -1 } },
      ])
      .toArray();
    res.json({ total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/pedidos/{numero}:
 *   get:
 *     tags: [Pedidos]
 *     summary: Busca um pedido pelo número
 *     description: A busca usa o campo de negócio `numero`, e não o `_id` do MongoDB.
 *     parameters:
 *       - $ref: '#/components/parameters/NumeroPedidoPath'
 *     responses:
 *       200:
 *         description: Pedido encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.get(
  '/:numero',
  wrap(async (req, res) => {
    const doc = await pedidos().findOne({ numero: num(req.params.numero) });
    if (!doc) throw naoEncontrado(`Pedido ${req.params.numero} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/pedidos:
 *   post:
 *     tags: [Pedidos]
 *     summary: Cria um pedido, calculando o valorTotal (exercício 20)
 *     description: >
 *       A API soma `quantidade × preco` de cada item e grava o resultado em `valorTotal`.
 *       O número do pedido é único — um número repetido devolve 409.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Pedido' }
 *           example:
 *             numero: 1007
 *             cliente: { nome: Ana Silva, cidade: Vitória da Conquista }
 *             itens:
 *               - { produto: Notebook, quantidade: 1, preco: 4500 }
 *               - { produto: Mouse, quantidade: 2, preco: 150 }
 *             status: Pago
 *             formaPagamento: Cartão
 *     responses:
 *       201:
 *         description: Pedido criado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       409: { $ref: '#/components/responses/Conflito' }
 */
router.post(
  '/',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['numero', 'cliente', 'itens']);
    if (!Array.isArray(req.body.itens) || !req.body.itens.length) {
      return res.status(400).json({ erro: 'O pedido precisa de ao menos um item.' });
    }
    const jaExiste = await pedidos().findOne({ numero: num(req.body.numero) });
    if (jaExiste) {
      return res.status(409).json({ erro: `Já existe um pedido com o número ${req.body.numero}.` });
    }

    const pedido = {
      ...req.body,
      numero: num(req.body.numero),
      status: req.body.status || 'Aguardando pagamento',
      data: req.body.data ? new Date(req.body.data) : new Date(),
      valorTotal: req.body.itens.reduce((acc, i) => acc + num(i.quantidade, 0) * num(i.preco, 0), 0),
    };

    const r = await pedidos().insertOne(pedido);
    res.status(201).json({ _id: r.insertedId, ...pedido });
  })
);

/**
 * @openapi
 * /api/pedidos/{numero}/status:
 *   patch:
 *     tags: [Pedidos]
 *     summary: Altera o status do pedido (exercício 20f)
 *     description: >
 *       Aplica `$set` no status e `$push` em `historicoStatus`, registrando a data da mudança.
 *       Status fora da lista permitida devolve 400.
 *     parameters:
 *       - $ref: '#/components/parameters/NumeroPedidoPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { $ref: '#/components/schemas/StatusPedido' }
 *           example: { status: Enviado }
 *     responses:
 *       200:
 *         description: Pedido já atualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.patch(
  '/:numero/status',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['status']);
    if (!STATUS_VALIDOS.includes(req.body.status)) {
      return res.status(400).json({
        erro: `Status inválido: "${req.body.status}".`,
        statusValidos: STATUS_VALIDOS,
      });
    }
    const doc = await pedidos().findOneAndUpdate(
      { numero: num(req.params.numero) },
      {
        $set: { status: req.body.status },
        $push: { historicoStatus: { status: req.body.status, data: new Date() } },
      },
      { returnDocument: 'after' }
    );
    if (!doc) throw naoEncontrado(`Pedido ${req.params.numero} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/pedidos/{numero}/itens:
 *   post:
 *     tags: [Pedidos]
 *     summary: Acrescenta um item ao pedido
 *     description: '`$push` no array `itens` e `$inc` no `valorTotal`, em uma única operação atômica.'
 *     parameters:
 *       - $ref: '#/components/parameters/NumeroPedidoPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ItemPedido' }
 *           example: { produto: Headset, quantidade: 1, preco: 300 }
 *     responses:
 *       200:
 *         description: Pedido já atualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pedido' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.post(
  '/:numero/itens',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['produto', 'quantidade', 'preco']);
    const item = {
      produto: req.body.produto,
      quantidade: num(req.body.quantidade),
      preco: num(req.body.preco),
    };
    const doc = await pedidos().findOneAndUpdate(
      { numero: num(req.params.numero) },
      { $push: { itens: item }, $inc: { valorTotal: item.quantidade * item.preco } },
      { returnDocument: 'after' }
    );
    if (!doc) throw naoEncontrado(`Pedido ${req.params.numero} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/pedidos/{numero}:
 *   delete:
 *     tags: [Pedidos]
 *     summary: Remove um pedido pelo número
 *     parameters:
 *       - $ref: '#/components/parameters/NumeroPedidoPath'
 *     responses:
 *       200:
 *         description: Documento removido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ResultadoRemocao' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.delete(
  '/:numero',
  wrap(async (req, res) => {
    const r = await pedidos().deleteOne({ numero: num(req.params.numero) });
    if (!r.deletedCount) throw naoEncontrado(`Pedido ${req.params.numero} não encontrado.`);
    res.json({ removidos: r.deletedCount });
  })
);

export default router;
