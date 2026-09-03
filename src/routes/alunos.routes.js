import { Router } from 'express';
import { col, toObjectId } from '../db.js';
import { wrap, num, exigirCampos, naoEncontrado } from '../utils.js';

const router = Router();
const alunos = () => col('alunos');

/**
 * @openapi
 * /api/alunos:
 *   get:
 *     tags: [Alunos]
 *     summary: Lista alunos com filtros e projeção (exercício 16)
 *     description: >
 *       `?nota=9` busca o valor dentro do array `notas` (exercício 16d);
 *       `?campos=nome,curso` faz a projeção removendo o `_id` (exercício 16e).
 *     parameters:
 *       - { name: curso, in: query, schema: { type: string }, example: Sistemas de Informação }
 *       - { name: idadeMin, in: query, schema: { type: integer }, example: 20, description: 'Operador $gt.' }
 *       - { name: idadeMax, in: query, schema: { type: integer }, description: 'Operador $lt.' }
 *       - { name: semestre, in: query, schema: { type: integer }, example: 4 }
 *       - { name: nota, in: query, schema: { type: number }, example: 9, description: Procura o valor dentro do array de notas. }
 *       - { name: campos, in: query, schema: { type: string }, example: 'nome,curso' }
 *     responses:
 *       200:
 *         description: Lista de alunos.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ListaFiltrada'
 *                 - type: object
 *                   properties:
 *                     dados: { type: array, items: { $ref: '#/components/schemas/Aluno' } }
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const { curso, idadeMin, idadeMax, semestre, nota } = req.query;
    const filtro = {};
    if (curso) filtro.curso = curso;
    if (semestre !== undefined) filtro.semestre = num(semestre);
    if (nota !== undefined) filtro.notas = num(nota);   // busca dentro do array de notas

    const idade = {};
    if (idadeMin !== undefined) idade.$gt = num(idadeMin);
    if (idadeMax !== undefined) idade.$lt = num(idadeMax);
    if (Object.keys(idade).length) filtro.idade = idade;

    const projecao = {};
    if (req.query.campos) {
      projecao._id = 0;
      for (const c of String(req.query.campos).split(',')) projecao[c.trim()] = 1;
    }

    const dados = await alunos().find(filtro, { projection: projecao }).toArray();
    res.json({ filtro, total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/alunos/media:
 *   get:
 *     tags: [Alunos]
 *     summary: Média das notas de cada aluno
 *     description: Aggregation com `$project`, `$avg` sobre o array `notas` e `$round`.
 *     responses:
 *       200:
 *         description: Alunos ordenados da maior para a menor média.
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
 *                       nome: { type: string, example: Júlia }
 *                       curso: { type: string }
 *                       notas: { type: array, items: { type: number } }
 *                       media: { type: number, example: 9.5 }
 */
router.get(
  '/media',
  wrap(async (_req, res) => {
    const dados = await alunos()
      .aggregate([
        {
          $project: {
            _id: 0,
            nome: 1,
            curso: 1,
            notas: 1,
            media: { $round: [{ $avg: '$notas' }, 2] },
          },
        },
        { $sort: { media: -1 } },
      ])
      .toArray();
    res.json({ total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/alunos/por-curso:
 *   get:
 *     tags: [Alunos]
 *     summary: Quantidade de alunos e média geral por curso
 *     description: Aggregation com `$unwind` no array de notas, `$group` com `$addToSet` e `$avg`, e `$size`.
 *     responses:
 *       200:
 *         description: Cursos ordenados pela média geral.
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
 *                       curso: { type: string, example: Ciência da Computação }
 *                       totalAlunos: { type: integer, example: 1 }
 *                       mediaGeral: { type: number, example: 9.5 }
 */
router.get(
  '/por-curso',
  wrap(async (_req, res) => {
    const dados = await alunos()
      .aggregate([
        { $unwind: '$notas' },
        {
          $group: {
            _id: '$curso',
            totalAlunos: { $addToSet: '$nome' },
            mediaGeral: { $avg: '$notas' },
          },
        },
        {
          $project: {
            _id: 0,
            curso: '$_id',
            totalAlunos: { $size: '$totalAlunos' },
            mediaGeral: { $round: ['$mediaGeral', 2] },
          },
        },
        { $sort: { mediaGeral: -1 } },
      ])
      .toArray();
    res.json({ total: dados.length, dados });
  })
);

/**
 * @openapi
 * /api/alunos/{id}:
 *   get:
 *     tags: [Alunos]
 *     summary: Busca um aluno pelo _id
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     responses:
 *       200:
 *         description: Aluno encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Aluno' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.get(
  '/:id',
  wrap(async (req, res) => {
    const doc = await alunos().findOne({ _id: toObjectId(req.params.id) });
    if (!doc) throw naoEncontrado(`Aluno ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/alunos:
 *   post:
 *     tags: [Alunos]
 *     summary: Cadastra um ou vários alunos (exercício 16)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/Aluno'
 *               - type: array
 *                 items: { $ref: '#/components/schemas/Aluno' }
 *           example:
 *             { nome: Lucas, curso: Sistemas de Informação, idade: 21, semestre: 4, notas: [8.5, 7, 9] }
 *     responses:
 *       201:
 *         description: Aluno(s) criado(s).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ResultadoInsercaoMultipla' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 */
router.post(
  '/',
  wrap(async (req, res) => {
    const corpo = Array.isArray(req.body) ? req.body : [req.body];
    corpo.forEach((a) => exigirCampos(a, ['nome', 'curso']));
    const r = await alunos().insertMany(corpo);
    res.status(201).json({ inseridos: r.insertedCount, ids: r.insertedIds });
  })
);

/**
 * @openapi
 * /api/alunos/{id}/notas:
 *   post:
 *     tags: [Alunos]
 *     summary: Acrescenta uma nota ao array com $push
 *     description: Aqui o `$push` é o operador correto — a mesma nota pode legitimamente se repetir.
 *     parameters:
 *       - $ref: '#/components/parameters/IdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nota]
 *             properties:
 *               nota: { type: number, example: 8.5 }
 *     responses:
 *       200:
 *         description: Documento já atualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Aluno' }
 *       400: { $ref: '#/components/responses/RequisicaoInvalida' }
 *       404: { $ref: '#/components/responses/NaoEncontrado' }
 */
router.post(
  '/:id/notas',
  wrap(async (req, res) => {
    exigirCampos(req.body, ['nota']);
    const doc = await alunos().findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      { $push: { notas: num(req.body.nota) } },
      { returnDocument: 'after' }
    );
    if (!doc) throw naoEncontrado(`Aluno ${req.params.id} não encontrado.`);
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/alunos/{id}:
 *   delete:
 *     tags: [Alunos]
 *     summary: Remove um aluno
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
    const r = await alunos().deleteOne({ _id: toObjectId(req.params.id) });
    if (!r.deletedCount) throw naoEncontrado(`Aluno ${req.params.id} não encontrado.`);
    res.json({ removidos: r.deletedCount });
  })
);

export default router;
