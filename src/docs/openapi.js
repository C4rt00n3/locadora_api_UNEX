import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTA = process.env.PORT || 3000;

/**
 * Definição base do documento OpenAPI 3.0.
 * As operações (paths) são coletadas das anotações @openapi
 * escritas nos próprios arquivos de rota — ver a chave "apis" abaixo.
 */
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'API MongoDB — Lista de Exercícios',
    version: '1.0.0',
    description: [
      'Lista de Exercícios de MongoDB implementada como API REST com **Node.js + Express**',
      'e o driver oficial `mongodb` (sem ODM).',
      '',
      'Cada grupo de rotas corresponde a uma parte da lista:',
      '',
      '| Recurso | Exercícios | Conceitos |',
      '|---|---|---|',
      '| Produtos | 2 a 11 | CRUD, `$gt`/`$lt`, `$and`/`$or`/`$nor`, projeção, `sort`/`limit`, `$set`, `$inc` |',
      '| Clientes | 12, 13, 14 | documentos aninhados, `$push`, `$pull`, `$addToSet` |',
      '| Filmes | 15 | modelagem com array + documento aninhado |',
      '| Alunos | 16 | arrays de valores, `$avg`, `$unwind` |',
      '| Vendas | 17, 18, 19 | `$match`, `$group`, `$project`, `$multiply`, `$sum`, `$avg` |',
      '| Pedidos | 20 | array de documentos, `$unwind`, agrupamento por status |',
      '| Exercícios | todos | enunciado + comando no mongosh + resultado do banco |',
      '',
      'A rota **`/api/exercicios`** devolve, para cada item da lista, o enunciado, o comando',
      'equivalente no `mongosh` e o resultado real vindo do banco.',
    ].join('\n'),
    contact: { name: 'Repositório do trabalho', url: 'http://localhost:' + PORTA },
    license: { name: 'MIT' },
  },
  servers: [
    { url: `http://localhost:${PORTA}`, description: 'Ambiente local' },
  ],
  tags: [
    { name: 'Geral', description: 'Informações e status da API' },
    { name: 'Exercícios', description: 'Um endpoint por item da lista de exercícios' },
    { name: 'Produtos', description: 'Exercícios 2 a 11 — CRUD, filtros, projeção, ordenação' },
    { name: 'Clientes', description: 'Exercícios 12 a 14 — documentos aninhados e arrays' },
    { name: 'Alunos', description: 'Exercício 16 — consultas em array de notas' },
    { name: 'Vendas', description: 'Exercícios 17 a 19 — Aggregation Pipeline' },
    { name: 'Pedidos', description: 'Exercício 20 — desafio final' },
    { name: 'Filmes', description: 'Exercício 15 — modelagem de documentos' },
  ],
  components: {
    schemas: {
      ObjectId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$',
        description: 'Identificador único do documento (24 caracteres hexadecimais).',
        example: '6a98c80f3e8030cb5731e645',
      },

      Produto: {
        type: 'object',
        required: ['nome', 'preco'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          nome: { type: 'string', example: 'Notebook' },
          marca: { type: 'string', example: 'TechPro' },
          preco: { type: 'number', example: 4500 },
          estoque: { type: 'integer', example: 6 },
          categoria: { type: 'string', example: 'Periféricos', description: 'Campo opcional — exercício 9c.' },
          disponivel: { type: 'boolean', example: true, description: 'Adicionado no exercício 10d.' },
        },
      },
      ProdutoEntrada: {
        type: 'object',
        required: ['nome', 'preco'],
        properties: {
          nome: { type: 'string', example: 'Webcam' },
          marca: { type: 'string', example: 'Vision' },
          preco: { type: 'number', example: 320 },
          estoque: { type: 'integer', example: 12 },
        },
      },

      Endereco: {
        type: 'object',
        properties: {
          cidade: { type: 'string', example: 'Vitória da Conquista' },
          estado: { type: 'string', example: 'BA' },
          cep: { type: 'string', example: '45000-100' },
        },
      },
      Cliente: {
        type: 'object',
        required: ['nome'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          nome: { type: 'string', example: 'Ana Silva' },
          email: { type: 'string', format: 'email', example: 'ana@email.com' },
          endereco: { $ref: '#/components/schemas/Endereco' },
          interesses: { type: 'array', items: { type: 'string' }, example: ['games', 'programacao', 'musica'] },
          tecnologias: { type: 'array', items: { type: 'string' }, example: ['JavaScript', 'MongoDB'] },
        },
      },

      Aluno: {
        type: 'object',
        required: ['nome', 'curso'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          nome: { type: 'string', example: 'Lucas' },
          curso: { type: 'string', example: 'Sistemas de Informação' },
          idade: { type: 'integer', example: 21 },
          semestre: { type: 'integer', example: 4 },
          notas: { type: 'array', items: { type: 'number' }, example: [8.5, 7.0, 9.0] },
        },
      },

      Venda: {
        type: 'object',
        required: ['produto', 'categoria', 'quantidade', 'valorUnitario'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          produto: { type: 'string', example: 'Notebook' },
          categoria: { type: 'string', example: 'Informática' },
          quantidade: { type: 'integer', example: 2 },
          valorUnitario: { type: 'number', example: 4500 },
        },
      },

      ItemPedido: {
        type: 'object',
        required: ['produto', 'quantidade', 'preco'],
        properties: {
          produto: { type: 'string', example: 'Notebook' },
          quantidade: { type: 'integer', example: 1 },
          preco: { type: 'number', example: 4500 },
        },
      },
      ClientePedido: {
        type: 'object',
        properties: {
          nome: { type: 'string', example: 'Ana Silva' },
          cidade: { type: 'string', example: 'Vitória da Conquista' },
        },
      },
      Pedido: {
        type: 'object',
        required: ['numero', 'cliente', 'itens'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          numero: { type: 'integer', example: 1001 },
          cliente: { $ref: '#/components/schemas/ClientePedido' },
          itens: { type: 'array', items: { $ref: '#/components/schemas/ItemPedido' } },
          status: { $ref: '#/components/schemas/StatusPedido' },
          formaPagamento: { type: 'string', example: 'Cartão' },
          valorTotal: { type: 'number', example: 4800, description: 'Calculado pela API a partir dos itens.' },
          historicoStatus: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                data: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      StatusPedido: {
        type: 'string',
        enum: ['Aguardando pagamento', 'Pago', 'Enviado', 'Entregue', 'Cancelado'],
        example: 'Pago',
      },

      Filme: {
        type: 'object',
        required: ['titulo', 'ano'],
        properties: {
          _id: { $ref: '#/components/schemas/ObjectId' },
          titulo: { type: 'string', example: 'Interestelar' },
          ano: { type: 'integer', example: 2014 },
          classificacaoIndicativa: { type: 'string', example: '12 anos' },
          duracaoMinutos: { type: 'integer', example: 169 },
          generos: {
            type: 'array',
            items: { type: 'string' },
            example: ['Ficção científica', 'Aventura', 'Drama'],
          },
          diretor: {
            type: 'object',
            properties: {
              nome: { type: 'string', example: 'Christopher Nolan' },
              nacionalidade: { type: 'string', example: 'Britânico-americana' },
              anoNascimento: { type: 'integer', example: 1970 },
            },
          },
          atores: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nome: { type: 'string', example: 'Anne Hathaway' },
                personagem: { type: 'string', example: 'Dra. Brand' },
              },
            },
          },
          avaliacao: {
            type: 'object',
            properties: {
              media: { type: 'number', example: 8.7 },
              totalVotos: { type: 'integer', example: 1980000 },
              fonte: { type: 'string', example: 'IMDb' },
            },
          },
        },
      },

      ListaFiltrada: {
        type: 'object',
        description: 'Resposta padrão das consultas: repete o filtro aplicado e devolve os dados.',
        properties: {
          filtro: { type: 'object', description: 'Filtro montado a partir da query string.' },
          total: { type: 'integer', example: 5 },
          dados: { type: 'array', items: { type: 'object' } },
        },
      },

      RespostaExercicio: {
        type: 'object',
        properties: {
          exercicio: { type: 'string', example: '6d' },
          enunciado: {
            type: 'string',
            example: 'Produtos que não sejam da marca TechPro nem da marca Vision.',
          },
          comandoMongosh: {
            type: 'string',
            example: 'db.produtos.find({ $nor: [{ marca: "TechPro" }, { marca: "Vision" }] })',
          },
          total: { type: 'integer', example: 2 },
          resultado: {
            oneOf: [{ type: 'array', items: { type: 'object' } }, { type: 'integer' }],
          },
        },
      },

      ResultadoAtualizacao: {
        type: 'object',
        properties: {
          encontrados: { type: 'integer', example: 5 },
          modificados: { type: 'integer', example: 5 },
        },
      },
      ResultadoRemocao: {
        type: 'object',
        properties: { removidos: { type: 'integer', example: 1 } },
      },
      ResultadoInsercaoMultipla: {
        type: 'object',
        properties: {
          inseridos: { type: 'integer', example: 4 },
          ids: { type: 'object', additionalProperties: { $ref: '#/components/schemas/ObjectId' } },
        },
      },

      Erro: {
        type: 'object',
        properties: { erro: { type: 'string', example: 'Recurso não encontrado.' } },
      },
    },

    parameters: {
      IdPath: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'ObjectId do documento.',
        schema: { $ref: '#/components/schemas/ObjectId' },
      },
      NumeroPedidoPath: {
        name: 'numero',
        in: 'path',
        required: true,
        description: 'Número do pedido (campo `numero`, não o `_id`).',
        schema: { type: 'integer', example: 1001 },
      },
    },

    responses: {
      RequisicaoInvalida: {
        description: 'Dados inválidos ou campos obrigatórios ausentes.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
      },
      NaoEncontrado: {
        description: 'Documento não encontrado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
      },
      Conflito: {
        description: 'Conflito — o recurso já existe.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
      },
    },
  },
};

// O glob usado pelo swagger-jsdoc só entende barras normais — no Windows,
// path.join() devolveria "\" e nenhum arquivo seria encontrado.
const paraGlob = (...partes) => path.join(...partes).split(path.sep).join('/');

/** Especificação completa, com os paths lidos das anotações @openapi das rotas. */
export const openapiSpec = swaggerJSDoc({
  definition,
  apis: [
    paraGlob(__dirname, '..', 'routes', '*.js'),
    paraGlob(__dirname, '..', 'server.js'),
  ],
});

export default openapiSpec;
