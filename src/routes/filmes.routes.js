import { Router } from 'express';
import { col, toObjectId } from '../db.js';
import { wrap, exigirCampos, naoEncontrado } from '../utils.js';

const router = Router();
const filmes = () => col('filmes');

/**
 * @openapi
 * /api/filmes:
 *   get:
 *     tags: [Filmes]
 *     summary: Lista filmes (exercício 15)
 *     description: >
 *       Demonstra os três tipos de consulta da modelagem proposta: array de strings (`generos`),
 *       documento aninhado (`diretor.nome`) e array de documentos (`atores.nome`).
 *     parameters:
 *       - { name: genero, in: query, schema: { type: string }, example: Drama, description: Valor dentro do array generos. }
 *       - { name: diretor, in: query, schema: { type: string }, example: Christopher Nolan, description: Campo diretor.nome. }
 *       - { name: ator, in: query, schema: { type: string }, example: Anne Hathaway, description: Campo atores.nome. }
 *       - { name: ano, in: query, schema: { type: integer }, example: 2014 }
 *       - { name: notaMin, in: query, schema: { type: number }, example: 8, description: 'Campo avaliacao.media com $gte.' }
 *     responses:
 *       200:
 *         description: Lista de filmes.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ListaFiltrada'
 *                 - type: object
 *                   properties:
 *                     dados: { type: array, items: { $ref: '#/components/schemas/Filme' } }
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const { genero, diretor, ator, notaMin, ano } = req.query;
    const filtro = {};
    if (genero) filtro.generos = genero;                       // array de strings
    if (diretor) filtro['diretor.nome'] = diretor;             // documento aninhado
    if (ator) filtro['atores.nome'] = ator;                    // array de documentos
    if (ano) filtro.ano = Number(ano);
    if (notaMin) filtro['avaliacao.media'] = { $gte: Number(notaMin) };

    const dados = await filmes().find(filtro).toArray();
    res.json({ filtro, total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/filmes/{id}:
 *   get:
 *     tags: [Filmes]
 *     summary: Busca um filme pelo _id
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Filme encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Filme' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.get(
  '/:id',
  wrap(async (req, res) => {
    const doc = await filmes().findOne({ _id: toObjectId(req.params.id) });
    if (!doc) throw naoEncontrado(`Filme ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/filmes:
 *   post:
 *     tags: [Filmes]
 *     summary: Cadastra um filme (exercício 15)
 *     description: Documento com valores simples, arrays (generos, atores) e documentos aninhados (diretor, avaliacao).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Filme' }
 *     responses:
 *       201:
 *         description: Filme criado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Filme' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 */
router.post(
  '/',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['titulo', 'ano']);
    const r = await filmes().insertOne(req.body);
    res.status(201).json({ _id: r.insertedId, ...req.body });
  })
);

/**
 * @openapi
 * /api/filmes/{id}/atores:
 *   post:
 *     tags: [Filmes]
 *     summary: Acrescenta um ator ao elenco com $push
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, personagem]
 *             properties:
 *               nome: { type: string, example: Casey Affleck }
 *               personagem: { type: string, example: Tom }
 *     responses:
 *       200:
 *         description: Filme já atualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Filme' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.post(
  '/:id/atores',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['nome', 'personagem']);
    const doc = await filmes().findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $push: { atores: { nome: req.body.nome, personagem: req.body.personagem } } },
      { returnDocument: 'after' }
    );
    if (!doc) throw naoEncontrado(`Filme ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/filmes/{id}/generos:
 *   post:
 *     tags: [Filmes]
 *     summary: Acrescenta um gênero sem duplicar, com $addToSet
 *     description: Gêneros formam um conjunto — repetir não faria sentido, por isso `$addToSet` e não `$push`.
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [genero]
 *             properties:
 *               genero: { type: string, example: Suspense }
 *     responses:
 *       200:
 *         description: Filme já atualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Filme' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.post(
  '/:id/generos',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['genero']);
    const doc = await filmes().findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $addToSet: { generos: req.body.genero } },
      { returnDocument: 'after' }
    );
    if (!doc) throw naoEncontrado(`Filme ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/filmes/{id}:
 *   delete:
 *     tags: [Filmes]
 *     summary: Remove um filme
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
    const r = await filmes().deleteOne({ _id: toObjectId(req.params.id) });
    if (!r.deletedCount) throw naoEncontrado(`Filme ${req.params.id} não encontrado.`);
    res.json({ removidos: r.deletedCount });
  })
);

export default router;
