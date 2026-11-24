# Caderno de Memórias do 2º Ano D

Site do 2º Ano D do Colégio Estadual Rodolpho Zaninelli. Ele reúne uma carta de boas-vindas, galeria de fotos, linha do tempo, turma, frases, álbuns (com fotos e vídeos) e uma despedida com o código Turma2D.java. Foi feito só com HTML, CSS e JavaScript, sem precisar instalar nada, e funciona no GitHub Pages.

## Estrutura

```
index.html        página do site
css/style.css     visual (cores, fontes, layout)
js/config.js      senha de edição e tamanho das fotos
js/app.js         toda a lógica (exibição, edição, login, fotos)
data/dados.js     conteúdo do site (textos e fotos)
```

## Como abrir

Dê dois cliques no `index.html`. Para usar o login de edição, abra o site por um endereço http, como o GitHub Pages, ou pelo Live Server do VS Code, porque alguns navegadores bloqueiam a verificação de senha quando o arquivo é aberto direto do disco.

## Como editar o conteúdo

1. Clique em **Editar** e digite a senha. A senha padrão é `segundoD2026`.
2. Clique em qualquer texto para alterar. Clique em qualquer foto para trocar.
3. Use os botões **+ Adicionar** de cada seção e as setas ou **Remover** de cada item.
4. Clique em **Salvar e concluir**. As alterações ficam guardadas só neste navegador.
5. Para publicar, entre em **Editar**, clique em **Baixar dados** e substitua o arquivo `data/dados.js` do projeto pelo que foi baixado. Depois envie para o GitHub.

Quando uma versão nova do `dados.js` é publicada, o navegador descarta sozinho o rascunho antigo e mostra o conteúdo novo. Por isso, baixe e publique suas alterações antes de alguém enviar outra versão.

O botão **Carregar dados** abre um `dados.js` salvo antes. O **Descartar rascunho** apaga o que foi salvo no navegador e volta ao conteúdo publicado.

## Como trocar a senha

Abra o site, aperte F12, vá em Console e digite `gerarHashSenha("novaSenha")`. Copie o código que aparecer para o campo `SENHA_HASH` do arquivo `js/config.js`.

A senha só libera o modo de edição. O site publicado só muda quando alguém com acesso ao repositório envia um novo `data/dados.js`.

## Como publicar no GitHub Pages

1. Crie um repositório e envie todos os arquivos desta pasta.
2. No repositório, vá em **Settings → Pages**.
3. Em **Branch**, escolha `main` e a pasta `/ (root)` e salve.
4. Em alguns minutos o site fica disponível no endereço mostrado nessa página.

## Fotos e vídeos

As fotos e o vídeo trazidos do site antigo (Lovable) ficam na pasta `img/`, e o `dados.js` aponta para eles pelo caminho, por exemplo `img/turma-capa.jpg`.

As fotos enviadas pelo modo de edição são reduzidas automaticamente para no máximo 1400 px e ficam dentro do `dados.js`. Em um álbum com muitas fotos o arquivo fica grande. Se passar de 25 MB, o envio pelo site do GitHub falha, então coloque as fotos na pasta `img/` e use o caminho no lugar da imagem dentro do `dados.js`.

Os álbuns também mostram vídeos. Para colocar um, salve o arquivo `.mp4` na pasta `img/` e acrescente no álbum um item assim: `{ "id": "v1", "src": "img/meu-video.mp4", "tipo": "video", "legenda": "" }`.
