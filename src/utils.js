/**
 * Envolve um handler assíncrono para que qualquer erro lançado
 * caia automaticamente no middleware de tratamento de erros do Express.
 */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Converte um parâmetro de query em número, devolvendo o padrão quando ausente/inválido. */
export function num(valor, padrao = undefined) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  const n = Number(valor);
  return Number.isNaN(n) ? padrao : n;
}

/** Garante que os campos obrigatórios vieram no corpo da requisição. */
export function exigirCampos(body, campos) {
  const faltando = campos.filter((c) => body?.[c] === undefined || body[c] === null || body[c] === '');
  if (faltando.length) {
    const erro = new Error(`Campos obrigatórios ausentes: ${faltando.join(', ')}.`);
    erro.status = 400;
    throw erro;
  }
}

/** Resposta padrão de "não encontrado". */
export function naoEncontrado(mensagem = 'Recurso não encontrado.') {
  const erro = new Error(mensagem);
  erro.status = 404;
  return erro;
}

/**
 * Monta a resposta dos endpoints de exercício, mostrando o enunciado,
 * o comando equivalente no mongosh e o resultado devolvido pelo banco.
 */
export function exercicio(id, enunciado, comando, resultado) {
  return {
    exercicio: id,
    enunciado,
    comandoMongosh: comando,
    total: Array.isArray(resultado) ? resultado.length : undefined,
    resultado,
  };
}
