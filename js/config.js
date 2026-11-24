/*
 * Configurações do Caderno de Memórias.
 *
 * SENHA DE EDIÇÃO
 * A senha padrão é: segundoD2026
 * Para trocar, gere o SHA-256 da nova senha e cole abaixo.
 * Jeito fácil: abra o site, aperte F12, vá em "Console" e digite:
 *   gerarHashSenha("minhaNovaSenha")
 * Copie o resultado para SENHA_HASH.
 *
 * Importante: esta senha só libera o modo de edição no navegador.
 * O que vai para o ar é o arquivo data/dados.js que você envia ao GitHub,
 * então quem não tem acesso ao repositório não consegue mudar o site publicado.
 */
window.CONFIG = {
  SENHA_HASH: "18f76ac3feea41a5d5295294ef6524fc6ca3532214d8dc59ddc91cbebc27c99f",
  // Tamanho máximo (em pixels) das fotos enviadas pelo modo de edição.
  LARGURA_MAXIMA_FOTO: 1400,
  QUALIDADE_FOTO: 0.8
};
