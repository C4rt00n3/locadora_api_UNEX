import { Router } from 'express';
import { col, toObjectId } from '../db.js';
import { wrap, exigirCampos, naoEncontrado } from '../utils.js';

const router = Router();
const clientes = () => col('clientes');

/**
 * @openapi
 * /api/clientes:
 *   get:
 *     tags: [Clientes]
 *     summary: Lista clientes filtrando por campo aninhado ou por array
 *     description: >
 *       `?cidade=` usa a notação de ponto (`endereco.cidade`) — exercício 12b.
 *       `?interesse=` e `?tecnologia=` buscam um valor dentro de um array,
 *       sem precisar de operador especial — exercícios 13a e 13b.
 *     parameters:
 *       - { name: nome,   in: query, schema: { type: string }, example: Ana Silva }
 *       - name: cidade
 *         in: query
 *         schema: { type: string }
 *         example: Vitória da Conquista
 *         description: Filtra por `endereco.cidade` (documento aninhado).
 *       - { name: estado, in: query, schema: { type: string }, example: BA }
 *       - name: interesse
 *         in: query
 *         schema: { type: string }
 *         example: games
 *         description: Valor procurado dentro do array `interesses`.
 *       - name: tecnologia
 *         in: query
 *         schema: { type: string }
 *         example: MongoDB
 *         description: Valor procurado dentro do array `tecnologias`.
 *     responses:
 *       200:
 *         description: Lista de clientes.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ListaFiltrada'
 *                 - type: object
 *                   properties:
 *                     dados: { type: array, items: { $ref: '#/components/schemas/Cliente' } }
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const { nome, cidade, estado, interesse, tecnologia } = req.query;
    const filtro = {};
    if (nome) filtro.nome = nome;
    if (cidade) filtro['endereco.cidade'] = cidade;          // notação de ponto
    if (estado) filtro['endereco.estado'] = estado;
    if (interesse) filtro.interesses = interesse;            // busca dentro do array
    if (tecnologia) filtro.tecnologias = tecnologia;

    const dados = await clientes().find(filtro).toArray();
    res.json({ filtro, total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/clientes/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Busca um cliente pelo _id
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Cliente encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cliente' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.get(
  '/:id',
  wrap(async (req, res) => {
    const doc = await clientes().findOne({ _id: toObjectId(req.params.id) });
    if (!doc) throw naoEncontrado(`Cliente ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/clientes:
 *   post:
 *     tags: [Clientes]
 *     summary: Cadastra um cliente (exercícios 12, 13 e 14)
 *     description: O corpo aceita documento aninhado (`endereco`) e arrays (`interesses`, `tecnologias`).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Cliente' }
 *           examples:
 *             comEnderecoAninhado:
 *               summary: Exercício 12
 *               value:
 *                 nome: Ana Silva
 *                 email: ana@email.com
 *                 endereco: { cidade: Vitória da Conquista, estado: BA, cep: 45000-000 }
 *             comArray:
 *               summary: Exercício 13
 *               value:
 *                 nome: Bruno Santos
 *                 email: bruno@email.com
 *                 interesses: [games, programacao, cinema]
 *     responses:
 *       201:
 *         description: Cliente criado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cliente' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 */
router.post(
  '/',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['nome']);
    const r = await clientes().insertOne(req.body);
    res.status(201).json({ _id: r.insertedId, ...req.body });
  })
);

/**
 * @openapi
 * /api/clientes/{id}/endereco:
 *   patch:
 *     tags: [Clientes]
 *     summary: Altera campos do endereço com $set e notação de ponto (exercício 12d)
 *     description: >
 *       Cada campo enviado vira `endereco.<campo>` no `$set`, alterando apenas o subcampo.
 *       Substituir o objeto `endereco` inteiro apagaria os demais campos.
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Endereco' }
 *           example: { cep: 45000-100 }
 *     responses:
 *       200:
 *         description: Campos alterados e documento resultante.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 atualizou: { type: object, example: { 'endereco.cep': '45000-100' } }
 *                 documento: { $ref: '#/components/schemas/Cliente' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.patch(
  '/:id/endereco',
  wrap(async (req, res) => {
    const campos = {};
    for (const [chave, valor] of Object.entries(req.body)) campos[`endereco.${chave}`] = valor;
    if (!Object.keys(campos).length) {
      return res.status(400).json({ erro: 'Informe ao menos um campo do endereço.' });
    }
    const doc = await clientes().findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $set: campos },
      { returnDocument: 'after' }
    );
    if (!doc) throw naoEncontrado(`Cliente ${req.params.id} não encontrado.`);
    res.json({ atualizou: campos, documento: doc });
  })
);

/**
 * @openapi
 * /api/clientes/{id}/{campo}:
 *   post:
 *     tags: [Clientes]
 *     summary: Acrescenta um valor a um array com $push ou $addToSet (exercícios 13c e 14)
 *     description: |
 *       - `unico: false` (padrão) → **$push**: acrescenta sempre, permitindo repetição.
 *       - `unico: true` → **$addToSet**: só acrescenta se o valor ainda não existir.
 *
 *       Ao usar `$addToSet` com um valor já presente, a resposta traz o documento inalterado
 *       (no MongoDB, `matchedCount: 1` e `modifiedCount: 0`).
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *       - name: campo
 *         in: path
 *         required: true
 *         schema: { type: string, enum: [interesses, tecnologias] }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [valor]
 *             properties:
 *               valor: { type: string, example: musica }
 *               unico: { type: boolean, default: false, description: 'true usa $addToSet.' }
 *           examples:
 *             push: { summary: '$push (exercício 13c)', value: { valor: musica } }
 *             addToSet: { summary: '$addToSet (exercício 14d)', value: { valor: MongoDB, unico: true } }
 *     responses:
 *       200:
 *         description: Operador aplicado e documento resultante.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 operador: { type: string, enum: ['$push', '$addToSet'] }
 *                 valor: { type: string }
 *                 documento: { $ref: '#/components/schemas/Cliente' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.post(
  '/:id/:campo(interesses|tecnologias)',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['valor']);
    const operador = req.body.unico ? '$addToSet' : '$push';
    const r = await clientes().findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { [operador]: { [req.params.campo]: req.body.valor } },
      { returnDocument: 'after' }
    );
    if (!r) throw naoEncontrado(`Cliente ${req.params.id} não encontrado.`);
    res.json({ operador, valor: req.body.valor, documento: r });
  })
);

/**
 * @openapi
 * /api/clientes/{id}/{campo}/{valor}:
 *   delete:
 *     tags: [Clientes]
 *     summary: Remove um valor do array com $pull (exercício 13d)
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *       - name: campo
 *         in: path
 *         required: true
 *         schema: { type: string, enum: [interesses, tecnologias] }
 *       - name: valor
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         example: cinema
 *     responses:
 *       200:
 *         description: Documento resultante.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 operador: { type: string, example: '$pull' }
 *                 valor: { type: string }
 *                 documento: { $ref: '#/components/schemas/Cliente' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.delete(
  '/:id/:campo(interesses|tecnologias)/:valor',
  wrap(async (req, res) => {
    const r = await clientes().findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $pull: { [req.params.campo]: req.params.valor } },
      { returnDocument: 'after' }
    );
    if (!r) throw naoEncontrado(`Cliente ${req.params.id} não encontrado.`);
    res.json({ operador: '$pull', valor: req.params.valor, documento: r });
  })
);

/**
 * @openapi
 * /api/clientes/{id}:
 *   delete:
 *     tags: [Clientes]
 *     summary: Remove um cliente
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
    const r = await clientes().deleteOne({ _id: toObjectId(req.params.id) });
    if (!r.deletedCount) throw naoEncontrado(`Cliente ${req.params.id} não encontrado.`);
    res.json({ removidos: r.deletedCount });
  })
);

export default router;
