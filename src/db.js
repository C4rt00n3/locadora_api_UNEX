import { MongoClient, ObjectId } from 'mongodb';

const URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB || 'loja';

const client = new MongoClient(URI);
let db = null;

/** Abre a conexão com o MongoDB (chamado uma única vez, na subida do servidor). */
export async function conectar() {
  if (db) return db;
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✔ Conectado ao MongoDB — banco "${DB_NAME}" em ${URI}`);
  return db;
}

/** Retorna a instância do banco já conectado. */
export function getDb() {
  if (!db) throw new Error('Banco não conectado. Chame conectar() antes.');
  return db;
}

/** Atalho para acessar uma coleção. */
export function col(nome) {
  return getDb().collection(nome);
}

export async function desconectar() {
  await client.close();
  db = null;
}

/**
 * Converte uma string em ObjectId, lançando um erro tratável de 400
 * quando o formato é inválido (24 caracteres hexadecimais).
 */
export function toObjectId(id) {
  if (!ObjectId.isValid(id)) {
    const erro = new Error(`_id inválido: "${id}". Deve ter 24 caracteres hexadecimais.`);
    erro.status = 400;
    throw erro;
  }
  return new ObjectId(id);
}

export { ObjectId };
