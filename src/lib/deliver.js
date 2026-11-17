// PONTO DE INTEGRACAO: entrega automatica dos megas.
// Ligue aqui a API do seu fornecedor/operadora. Retorne { ok: true } quando enviar de verdade.
// Enquanto retornar { manual: true }, o admin envia manualmente e confirma com .enviar @cliente
module.exports = async function entregar(/* { number, mb, label } */) {
  return { ok: false, manual: true };
};
