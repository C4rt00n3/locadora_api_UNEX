/**
 * Exporta a especificação OpenAPI para arquivos na raiz do projeto.
 *
 * Uso:  npm run docs
 * Gera: openapi.json e openapi.yaml
 *
 * Os arquivos servem para entregar a documentação junto do trabalho e para
 * importar em ferramentas externas (Postman, Insomnia, Swagger Editor, Redoc).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dump as paraYaml } from 'js-yaml';

import { openapiSpec } from './openapi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, '..', '..');

const caminhoJson = path.join(RAIZ, 'openapi.json');
const caminhoYaml = path.join(RAIZ, 'openapi.yaml');

fs.writeFileSync(caminhoJson, JSON.stringify(openapiSpec, null, 2) + '\n', 'utf8');
fs.writeFileSync(caminhoYaml, paraYaml(openapiSpec, { lineWidth: 120, noRefs: true }), 'utf8');

// Resumo do que foi documentado
const paths = Object.entries(openapiSpec.paths || {});
const operacoes = paths.reduce(
  (acc, [, metodos]) =>
    acc + Object.keys(metodos).filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m)).length,
  0
);

console.log('✔ Especificação OpenAPI gerada');
console.log(`  ${caminhoJson}`);
console.log(`  ${caminhoYaml}`);
console.log(`  ${paths.length} caminhos, ${operacoes} operações, ` +
            `${Object.keys(openapiSpec.components?.schemas || {}).length} schemas`);

for (const [rota, metodos] of paths) {
  const verbos = Object.keys(metodos)
    .filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m))
    .map((m) => m.toUpperCase())
    .join(', ');
  console.log(`    ${rota.padEnd(38)} ${verbos}`);
}
