import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import { dump as paraYaml } from 'js-yaml';

import { conectar, getDb, desconectar } from './db.js';
import { openapiSpec } from './docs/openapi.js';
import produtosRoutes from './routes/produtos.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import alunosRoutes from './routes/alunos.routes.js';
import vendasRoutes from './routes/vendas.routes.js';
import pedidosRoutes from './routes/pedidos.routes.js';
import filmesRoutes from './routes/filmes.routes.js';
import exerciciosRoutes from './routes/exercicios.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORTA = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Log simples de cada requisição
app.use((req, _res, next) => {
  console.log(`${new Date().toLocaleTimeString('pt-BR')}  ${req.method} ${req.originalUrl}`);
  next();
});

// ------------------------- Documentação Swagger -----------------------
// Interface interativa (Swagger UI): permite executar as requisições no navegador.
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'API MongoDB — Lista de Exercícios',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      persistAuthorization: true,
    },
  })
);

// Especificação bruta, para importar no Postman, Insomnia, Swagger Editor etc.
app.get('/docs.json', (_req, res) => res.json(openapiSpec));
app.get('/docs.yaml', (_req, res) => {
  res.type('text/yaml').send(paraYaml(openapiSpec, { lineWidth: 120, noRefs: true }));
});

// ------------------------------- Rotas -------------------------------
/**
 * @openapi
 * /api:
 *   get:
 *     tags: [Geral]
 *     summary: Índice dos recursos da API
 *     responses:
 *       200:
 *         description: Links para cada grupo de rotas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 api: { type: string }
 *                 banco: { type: string, example: loja }
 *                 recursos: { type: object, additionalProperties: { type: string, format: uri } }
 */
app.get('/api', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.json({
    api: 'Lista de Exercícios MongoDB — API REST com Express',
    banco: process.env.MONGO_DB || 'loja',
    recursos: {
      produtos: `${base}/api/produtos`,
      clientes: `${base}/api/clientes`,
      alunos: `${base}/api/alunos`,
      vendas: `${base}/api/vendas`,
      pedidos: `${base}/api/pedidos`,
      filmes: `${base}/api/filmes`,
      exercicios: `${base}/api/exercicios`,
    },
    documentacao: {
      swaggerUI: `${base}/docs`,
      openapiJSON: `${base}/docs.json`,
      openapiYAML: `${base}/docs.yaml`,
    },
  });
});

/**
 * @openapi
 * /api/status:
 *   get:
 *     tags: [Geral]
 *     summary: Status da conexão e contagem de documentos por coleção
 *     responses:
 *       200:
 *         description: Estado atual do banco.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conectado: { type: boolean, example: true }
 *                 banco: { type: string, example: loja }
 *                 colecoes:
 *                   type: object
 *                   additionalProperties: { type: integer }
 *                   example: { alunos: 5, clientes: 3, filmes: 1, pedidos: 6, produtos: 5, vendas: 5 }
 */
app.get('/api/status', async (_req, res, next) => {
  try {
    const db = getDb();
    const nomes = (await db.listCollections().toArray()).map((c) => c.name).sort();
    const colecoes = {};
    for (const nome of nomes) colecoes[nome] = await db.collection(nome).countDocuments();
    res.json({ conectado: true, banco: db.databaseName, colecoes });
  } catch (erro) {
    next(erro);
  }
});

app.use('/api/produtos', produtosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/alunos', alunosRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/filmes', filmesRoutes);
app.use('/api/exercicios', exerciciosRoutes);

// --------------------------- 404 e erros -----------------------------
app.use((req, res) => {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((erro, _req, res, _next) => {
  const status = erro.status || 500;
  if (status >= 500) console.error(erro);
  res.status(status).json({ erro: erro.message || 'Erro interno do servidor.' });
});

// ----------------------------- Subida --------------------------------
const servidor = await conectar()
  .then(() =>
    app.listen(PORTA, () => {
      console.log(`✔ API no ar em http://localhost:${PORTA}`);
      console.log(`  Swagger UI:    http://localhost:${PORTA}/docs`);
      console.log(`  OpenAPI:       http://localhost:${PORTA}/docs.json  |  /docs.yaml`);
      console.log(`  Exercícios:    http://localhost:${PORTA}/api/exercicios`);
    })
  )
  .catch((erro) => {
    console.error('✖ Não foi possível conectar ao MongoDB:', erro.message);
    process.exit(1);
  });

// Encerramento limpo
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    console.log('\nEncerrando...');
    servidor.close(async () => {
      await desconectar();
      process.exit(0);
    });
  });
}
