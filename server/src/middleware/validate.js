// validate.js — valida e SANITIZA o corpo da requisição com um schema zod.
//
// Toda entrada do usuário passa por aqui antes de chegar perto do banco:
//  - rejeita formatos inesperados (400) em vez de repassar lixo;
//  - .strip() remove campos não declarados (evita mass-assignment);
//  - tipos coeridos e limites de tamanho reduzem superfície de ataque.
//
// Contra SQL Injection: nunca montamos SQL por concatenação — o supabase-js
// usa queries parametrizadas (PostgREST). Validar aqui é a camada extra.
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Dados inválidos.',
        details: result.error.issues.map((i) => ({ campo: i.path.join('.'), msg: i.message })),
      });
    }
    req.body = result.data; // versão validada/sanitizada
    next();
  };
}
