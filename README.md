# API MongoDB — Lista de Exercícios

Implementação da **Lista de Exercícios de MongoDB** como uma **API REST em Node.js + Express**,
usando o driver oficial `mongodb`. É a mesma lista resolvida no mongosh, agora exposta por
endpoints HTTP sobre o banco `loja`.

## Stack

| | |
|---|---|
| Runtime | Node.js 18+ (testado no 24) |
| Framework | Express 4 |
| Banco | MongoDB 7 |
| Driver | `mongodb` 6 (oficial, sem ODM) |
| Documentação | OpenAPI 3.0.3 via `swagger-jsdoc` + `swagger-ui-express` |
| Módulos | ESM (`"type": "module"`) |

---

## Como rodar

### 1. Subir o MongoDB

```bash
docker run -d --name mongo-oat1-api -p 27017:27017 mongo:7
```

Se você já tem o dump da atividade, restaure-o:

```bash
docker cp ../dump-mongodb/loja.archive.gz mongo-oat1-api:/loja.archive.gz
docker exec mongo-oat1-api mongorestore --archive=/loja.archive.gz --gzip
```

### 2. Instalar e configurar

```bash
npm install
cp .env.example .env
```

`.env`:

```
MONGO_URI=mongodb://localhost:27017
MONGO_DB=loja
PORT=3000
```

### 3. Popular o banco (opcional — se não restaurou o dump)

```bash
npm run seed
```

### 4. Subir a API

```bash
npm start      # ou: npm run dev  (com --watch)
```

Abra <http://localhost:3000> — há uma página com todos os endpoints e links clicáveis.

---

## Documentação Swagger / OpenAPI

A API é documentada com **OpenAPI 3.0.3**. As anotações `@openapi` ficam nos próprios arquivos
de rota (junto do código que descrevem) e o `swagger-jsdoc` as reúne com a definição base de
`src/docs/openapi.js`, que concentra `info`, `tags`, `components/schemas`, parâmetros e respostas
reutilizáveis.

| Endereço | O que é |
|---|---|
| <http://localhost:3000/docs> | **Swagger UI** — interface interativa com botão *Try it out* |
| <http://localhost:3000/docs.json> | Especificação em JSON, servida pela API |
| <http://localhost:3000/docs.yaml> | Especificação em YAML, servida pela API |
| `openapi.json` / `openapi.yaml` | Os mesmos arquivos gravados em disco, para entregar ou versionar |

Cobertura atual: **37 caminhos, 50 operações e 18 schemas**, distribuídos em 8 tags
(Geral, Exercícios, Produtos, Clientes, Alunos, Vendas, Pedidos, Filmes).

### Gerando os arquivos da especificação

```bash
npm run docs
```

Grava `openapi.json` e `openapi.yaml` na raiz do projeto e imprime o resumo dos caminhos.

### Validando a especificação

```bash
npx swagger-cli validate openapi.json
```

### Usando fora do navegador

Os arquivos gerados podem ser importados diretamente em:

- **Postman** — *Import → File → openapi.json* (gera a coleção com todas as requisições)
- **Insomnia** — *Import from File*
- **Swagger Editor** (<https://editor.swagger.io>) — cole o conteúdo de `openapi.yaml`
- **Redoc** — `npx @redocly/cli preview-docs openapi.yaml`

### O que as anotações documentam

Além da forma de cada requisição e resposta, as descrições explicam **o conceito de MongoDB
exercitado** em cada rota e a qual item da lista ela corresponde. Por exemplo, a rota
`POST /api/clientes/{id}/{campo}` descreve a diferença entre `$push` e `$addToSet`, e
`PATCH /api/produtos/{id}/estoque` registra que valores negativos reduzem o estoque porque não
existe operador `$dec`.

Vários endpoints trazem **múltiplos exemplos de corpo** (`examples`), rotulados pelo exercício
correspondente — em `POST /api/produtos`, por exemplo, há um exemplo para `insertOne` (exercício 2)
e outro para `insertMany` (exercício 3), selecionáveis no menu suspenso do Swagger UI.

---

## Estrutura

```
api-mongodb-express/
├── package.json
├── .env.example
├── openapi.json                      # especificação gerada (npm run docs)
├── openapi.yaml                      # idem, em YAML
├── public/
│   └── index.html                    # página inicial com links para tudo
└── src/
    ├── server.js                     # bootstrap do Express, Swagger UI, 404 e erros
    ├── db.js                         # conexão única (MongoClient) + helper de ObjectId
    ├── seed.js                       # popula as 6 coleções + cria índices
    ├── docs/
    │   ├── openapi.js                # definição base + components (schemas, params, responses)
    │   └── gerar.js                  # exporta openapi.json e openapi.yaml
    └── routes/
        ├── produtos.routes.js        # exercícios 2 a 11
        ├── clientes.routes.js        # exercícios 12, 13 e 14
        ├── filmes.routes.js          # exercício 15
        ├── alunos.routes.js          # exercício 16
        ├── vendas.routes.js          # exercícios 17, 18 e 19
        ├── pedidos.routes.js         # exercício 20
        └── exercicios.routes.js      # um endpoint por item da lista
```

---

## Rota especial: `/api/exercicios`

Cada item da lista tem um endpoint que devolve **o enunciado, o comando equivalente no
mongosh e o resultado vindo do banco** — útil para conferir as respostas do trabalho:

```bash
curl http://localhost:3000/api/exercicios          # índice dos 20 exercícios
curl http://localhost:3000/api/exercicios/6        # todos os itens do exercício 6
curl http://localhost:3000/api/exercicios/6/d      # apenas o item 6d
```

```json
{
  "exercicio": "6d",
  "enunciado": "Produtos que não sejam da marca TechPro nem da marca Vision.",
  "comandoMongosh": "db.produtos.find({ $nor: [{ marca: \"TechPro\" }, { marca: \"Vision\" }] })",
  "total": 2,
  "resultado": [ ... ]
}
```

---

## Endpoints

### Produtos — exercícios 2 a 11

| Método | Rota | Operação |
|---|---|---|
| GET | `/api/produtos` | `find()` com filtros, projeção, `sort()` e `limit()` |
| GET | `/api/produtos/contagem` | `countDocuments()` |
| GET | `/api/produtos/:id` | `findOne()` por ObjectId |
| POST | `/api/produtos` | `insertOne()` ou `insertMany()` (aceita array) |
| PATCH | `/api/produtos/:id` | `$set` |
| PATCH | `/api/produtos/:id/estoque` | `$inc` — body `{ "quantidade": 5 }` (negativo subtrai) |
| PATCH | `/api/produtos/:id/preco` | `$inc` — body `{ "valor": 50 }` |
| POST | `/api/produtos/marcar-disponiveis` | `updateMany()` com `$set` |
| DELETE | `/api/produtos/:id` | `deleteOne()` |

Query string do `GET /api/produtos`:

```
?nome=Mouse                      ?marca=TechPro            ?estoque=15
?precoMin=200&precoMax=1000      ?estoqueMax=10
?ordenarPor=preco&ordem=desc     ?limite=3
?campos=nome,preco&semId=true    (projeção)
```

```bash
# os 3 produtos mais baratos (exercício 8c)
curl "http://localhost:3000/api/produtos?ordenarPor=preco&ordem=asc&limite=3"

# preço entre 200 e 1000, só nome e preço, sem _id (exercícios 5e + 7d)
curl "http://localhost:3000/api/produtos?precoMin=200&precoMax=1000&campos=nome,preco&semId=true"
```

### Clientes — exercícios 12, 13 e 14

| Método | Rota | Operação |
|---|---|---|
| GET | `/api/clientes` | filtros `?cidade=` (aninhado), `?interesse=`, `?tecnologia=` (arrays) |
| POST | `/api/clientes` | `insertOne()` |
| PATCH | `/api/clientes/:id/endereco` | `$set` com notação de ponto |
| POST | `/api/clientes/:id/interesses` | `$push` — ou `$addToSet` com `{ "unico": true }` |
| POST | `/api/clientes/:id/tecnologias` | idem |
| DELETE | `/api/clientes/:id/interesses/:valor` | `$pull` |

```bash
# $push (permite duplicar)
curl -X POST http://localhost:3000/api/clientes/<id>/tecnologias \
     -H "Content-Type: application/json" -d '{"valor":"MongoDB"}'

# $addToSet (não duplica) — exercício 14
curl -X POST http://localhost:3000/api/clientes/<id>/tecnologias \
     -H "Content-Type: application/json" -d '{"valor":"MongoDB","unico":true}'
```

### Alunos — exercício 16

| Método | Rota | Operação |
|---|---|---|
| GET | `/api/alunos` | `?curso=` `?idadeMin=20` `?semestre=4` `?nota=9` `?campos=nome,curso` |
| GET | `/api/alunos/media` | `$avg` sobre o array de notas |
| GET | `/api/alunos/por-curso` | `$unwind` + `$group` |
| POST | `/api/alunos` | `insertMany()` |
| POST | `/api/alunos/:id/notas` | `$push` de uma nota |

### Vendas — exercícios 17, 18 e 19

| Método | Rota | Operação |
|---|---|---|
| GET | `/api/vendas` | `aggregate()` com `$match` + `$sort` |
| GET | `/api/vendas/resumo` | `$group` com `$sum` e `$avg` |
| GET | `/api/vendas/faturamento` | `$project` + `$multiply` + `$group` + `$sort` |

### Pedidos — exercício 20

| Método | Rota | Operação |
|---|---|---|
| GET | `/api/pedidos` | `?status=` `?cliente=` `?cidade=` `?produto=Notebook` |
| GET | `/api/pedidos/por-status` | `$group` por status |
| GET | `/api/pedidos/contagem?status=Entregue` | `countDocuments()` |
| GET | `/api/pedidos/faturamento` | `$unwind` + `$group` — valor de cada pedido |
| GET | `/api/pedidos/produtos-mais-vendidos` | ranking a partir do array de itens |
| GET | `/api/pedidos/:numero` | busca pelo número do pedido |
| POST | `/api/pedidos` | calcula o `valorTotal` a partir dos itens |
| PATCH | `/api/pedidos/:numero/status` | `$set` + `$push` no histórico |
| POST | `/api/pedidos/:numero/itens` | `$push` de item + `$inc` no total |

```bash
# exercício 20f
curl -X PATCH http://localhost:3000/api/pedidos/1005/status \
     -H "Content-Type: application/json" -d '{"status":"Enviado"}'
```

### Filmes — exercício 15

| Método | Rota | Operação |
|---|---|---|
| GET | `/api/filmes` | `?genero=` `?diretor=` `?ator=` `?notaMin=8` |
| POST | `/api/filmes/:id/atores` | `$push` no elenco |
| POST | `/api/filmes/:id/generos` | `$addToSet` |

---

## Operadores do MongoDB usados no projeto

| Categoria | Operadores | Onde |
|---|---|---|
| Comparação | `$eq` `$gt` `$gte` `$lt` `$lte` `$ne` `$in` | produtos, alunos, pedidos |
| Lógicos | `$and` `$or` `$nor` | exercício 6 |
| Atualização | `$set` `$inc` `$unset` | produtos, clientes, pedidos |
| Arrays | `$push` `$pull` `$addToSet` `$size` | clientes, alunos, filmes, pedidos |
| Agregação | `$match` `$group` `$project` `$sort` `$unwind` | vendas, pedidos, alunos |
| Acumuladores | `$sum` `$avg` `$first` `$push` `$addToSet` | vendas, pedidos, alunos |
| Aritméticos | `$multiply` `$round` | faturamento, médias |

---

## Padrões adotados

- **Conexão única**: um só `MongoClient`, aberto na subida e reaproveitado (pool de conexões do driver). Nada de conectar por requisição.
- **`wrap()`**: helper que captura rejeições de handlers `async` e as encaminha ao middleware de erro do Express — evita repetir `try/catch` em toda rota.
- **Erros com `status`**: as funções auxiliares lançam `Error` com a propriedade `status`, e um único middleware traduz para o código HTTP (400, 404, 409, 500).
- **Validação de ObjectId** antes de consultar, devolvendo 400 em vez de estourar exceção.
- **`_id` imutável**: o `PATCH` descarta um `_id` que venha no corpo da requisição.
- **Índices** criados no seed: `produtos.nome`, `pedidos.numero` (único), `pedidos.status`, `pedidos.cliente.nome`.

## Códigos de resposta

| Código | Quando |
|---|---|
| 200 | Consulta ou atualização bem-sucedida |
| 201 | Documento criado |
| 400 | Campos obrigatórios ausentes, `_id` inválido, status inválido |
| 404 | Documento ou rota inexistente |
| 409 | Número de pedido já cadastrado |
| 500 | Erro inesperado (registrado no console) |
#   l o c a d o r a _ a p i _ U N E X  
 