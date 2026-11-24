/*
 * Caderno de Memórias do 2º Ano D
 * Lógica do site: exibe o conteúdo de data/dados.js e permite editar tudo
 * pelo próprio site (textos, fotos, itens), salvando um rascunho no navegador
 * e exportando o arquivo dados.js para publicar no GitHub.
 */
(function () {
  "use strict";

  const CONFIG = window.CONFIG || {};
  const CHAVE_SESSAO = "segundoD.logado";
  const LISTAS = ["galeria", "linhaDoTempo", "turma", "frases", "albuns"];

  let dados = clonar(window.DADOS || {});
  const VERSAO_PUBLICADA = resumoTexto(JSON.stringify(window.DADOS || {}));
  let copiaAntesDeEditar = null;
  let editando = false;
  let alterado = false;
  let destinoImagem = null; // função que recebe a imagem escolhida

  /* ---------- Utilidades ---------- */

  function resumoTexto(texto) {
    let h = 5381;
    for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + "-" + texto.length;
  }

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function novoId(prefixo) {
    return prefixo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function el(tag, atributos, filhos) {
    const elemento = document.createElement(tag);
    Object.entries(atributos || {}).forEach(([chave, valor]) => {
      if (valor === undefined || valor === null) return;
      if (chave === "texto") elemento.textContent = valor;
      else if (chave === "classe") elemento.className = valor;
      else if (chave.startsWith("on")) elemento.addEventListener(chave.slice(2), valor);
      else elemento.setAttribute(chave, valor);
    });
    (filhos || []).forEach((filho) => filho && elemento.appendChild(filho));
    return elemento;
  }

  function mostrarMensagem(texto) {
    const caixa = document.getElementById("mensagem");
    caixa.textContent = texto;
    caixa.classList.add("visivel");
    clearTimeout(mostrarMensagem.timer);
    mostrarMensagem.timer = setTimeout(() => caixa.classList.remove("visivel"), 3800);
  }

  function imagemVazia(texto) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
      '<rect width="800" height="600" fill="#e9dfcc"/>' +
      '<g fill="none" stroke="#b9a98c" stroke-width="10" stroke-linejoin="round">' +
      '<rect x="310" y="230" width="180" height="130" rx="14"/><circle cx="400" cy="295" r="38"/>' +
      '<path d="M350 230l18-26h64l18 26"/></g>' +
      '<text x="400" y="420" font-family="Arial" font-size="26" fill="#8f7f63" text-anchor="middle">' +
      texto + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function fonteImagem(src) {
    return src ? src : imagemVazia(editando ? "Clique para escolher uma foto" : "Foto em breve");
  }

  function ehVideo(item) {
    return !!item && (item.tipo === "video" || /\.(mp4|webm|mov)$/i.test(item.src || ""));
  }

  function contarItens(itens) {
    const videos = itens.filter(ehVideo).length;
    const fotos = itens.length - videos;
    const partes = [];
    if (fotos || !videos) partes.push(fotos + (fotos === 1 ? " foto" : " fotos"));
    if (videos) partes.push(videos + (videos === 1 ? " vídeo" : " vídeos"));
    return partes.join(" e ");
  }

  function marcarAlterado() {
    alterado = true;
  }

  /* ---------- Rascunho no navegador (IndexedDB) ---------- */

  const banco = {
    abrir() {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error("IndexedDB indisponível"));
        const pedido = indexedDB.open("caderno-segundo-d", 1);
        pedido.onupgradeneeded = () => pedido.result.createObjectStore("rascunho");
        pedido.onsuccess = () => resolve(pedido.result);
        pedido.onerror = () => reject(pedido.error);
      });
    },
    async ler() {
      const db = await this.abrir();
      return new Promise((resolve, reject) => {
        const req = db.transaction("rascunho").objectStore("rascunho").get("dados");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    },
    async gravar(valor) {
      const db = await this.abrir();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("rascunho", "readwrite");
        tx.objectStore("rascunho").put(valor, "dados");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    async apagar() {
      const db = await this.abrir();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("rascunho", "readwrite");
        tx.objectStore("rascunho").delete("dados");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  };

  /* ---------- Desenho da página ---------- */

  function desenharCampos() {
    document.querySelectorAll("[data-campo]").forEach((elemento) => {
      if (document.activeElement === elemento) return;
      elemento.textContent = dados[elemento.dataset.campo] || "";
    });
    document.querySelectorAll("img[data-imagem]").forEach((img) => {
      img.src = fonteImagem(dados[img.dataset.imagem]);
    });
    document.title = (dados.serie || "") + " " + (dados.letra || "") + " | " + (dados.subtitulo || "");
  }

  function ferramentas(lista, indice, extras) {
    const total = (dados[lista] || []).length;
    return el("div", { classe: "ferramentas" }, [
      ...(extras || []),
      indice > 0 ? el("button", { type: "button", texto: "↑", title: "Mover para cima", onclick: () => mover(lista, indice, -1) }) : null,
      indice < total - 1 ? el("button", { type: "button", texto: "↓", title: "Mover para baixo", onclick: () => mover(lista, indice, 1) }) : null,
      el("button", { type: "button", classe: "remover", texto: "Remover", onclick: () => remover(lista, indice) })
    ]);
  }

  function campoItem(tag, item, campo, classe) {
    return el(tag, { classe: classe, "data-item-campo": campo, texto: item[campo] || "" });
  }

  function botaoAdicionar(texto, acao) {
    return el("button", { type: "button", classe: "adicionar", texto: "+ " + texto, onclick: acao });
  }

  const desenhistas = {
    galeria(container) {
      const fotos = dados.galeria || [];
      fotos.forEach((foto, i) => {
        const img = el("img", { src: fonteImagem(foto.src), alt: foto.legenda || "Foto da turma", loading: "lazy", "data-item-imagem": "src" });
        img.addEventListener("click", () => {
          if (!editando) abrirVisor(fotos, i, null);
        });
        container.appendChild(
          el("figure", { classe: "polaroid", "data-id": foto.id }, [ferramentas("galeria", i), img, campoItem("figcaption", foto, "legenda")])
        );
      });
      if (!fotos.length) container.appendChild(el("p", { classe: "vazio", texto: "Nenhuma foto ainda." }));
      return botaoAdicionar("Adicionar fotos", () => escolherImagens(true, (imagens) => {
        imagens.forEach((src) => dados.galeria.push({ id: novoId("g"), src: src, legenda: "Escreva uma legenda" }));
        marcarAlterado();
        desenharListas();
      }));
    },

    linhaDoTempo(container) {
      (dados.linhaDoTempo || []).forEach((marco, i) => {
        container.appendChild(
          el("li", { classe: "marco", "data-id": marco.id }, [
            ferramentas("linhaDoTempo", i),
            campoItem("span", marco, "data", "marco-data"),
            campoItem("h3", marco, "titulo"),
            campoItem("p", marco, "texto")
          ])
        );
      });
      if (!(dados.linhaDoTempo || []).length) container.appendChild(el("li", { classe: "vazio", texto: "Nenhum acontecimento ainda." }));
      return botaoAdicionar("Adicionar acontecimento", () => {
        dados.linhaDoTempo.push({ id: novoId("t"), data: "Mês", titulo: "Novo acontecimento", texto: "Conte o que aconteceu." });
        marcarAlterado();
        desenharListas();
      });
    },

    turma(container) {
      (dados.turma || []).forEach((aluno, i) => {
        container.appendChild(
          el("article", { classe: "aluno", "data-id": aluno.id }, [
            ferramentas("turma", i),
            el("img", { src: fonteImagem(aluno.foto), alt: "Foto de " + (aluno.nome || "aluno"), loading: "lazy", "data-item-imagem": "foto" }),
            campoItem("h3", aluno, "nome"),
            campoItem("p", aluno, "apelido", "apelido"),
            campoItem("p", aluno, "frase", "frase-aluno")
          ])
        );
      });
      if (!(dados.turma || []).length) container.appendChild(el("p", { classe: "vazio", texto: "Ninguém cadastrado ainda." }));
      return botaoAdicionar("Adicionar pessoa", () => {
        dados.turma.push({ id: novoId("a"), nome: "Nome", apelido: "apelido", frase: "Uma frase sobre a pessoa.", foto: "" });
        marcarAlterado();
        desenharListas();
      });
    },

    frases(container) {
      (dados.frases || []).forEach((frase, i) => {
        container.appendChild(
          el("figure", { classe: "bilhete", "data-id": frase.id }, [
            ferramentas("frases", i),
            campoItem("blockquote", frase, "texto"),
            campoItem("cite", frase, "autor")
          ])
        );
      });
      if (!(dados.frases || []).length) container.appendChild(el("p", { classe: "vazio", texto: "Nenhuma frase ainda." }));
      return botaoAdicionar("Adicionar frase", () => {
        dados.frases.push({ id: novoId("f"), texto: "Escreva a frase aqui", autor: "Quem disse" });
        marcarAlterado();
        desenharListas();
      });
    },

    albuns(container) {
      (dados.albuns || []).forEach((album, i) => {
        album.fotos = album.fotos || [];
        const capa = album.fotos.find((f) => f.src && !ehVideo(f));
        const adicionarFotos = el("button", {
          type: "button",
          texto: "+ Fotos",
          onclick: (evento) => {
            evento.stopPropagation();
            escolherImagens(true, (imagens) => {
              imagens.forEach((src) => album.fotos.push({ id: novoId("af"), src: src, legenda: "" }));
              marcarAlterado();
              desenharListas();
            });
          }
        });
        const cartao = el("article", { classe: "album", "data-id": album.id, tabindex: "0", role: "button", "aria-label": "Abrir álbum " + (album.titulo || "") }, [
          ferramentas("albuns", i, [adicionarFotos]),
          el("div", { classe: "album-pilha" }, [
            el("span"),
            el("span"),
            el("img", { src: fonteImagem(capa ? capa.src : ""), alt: "", loading: "lazy" })
          ]),
          campoItem("h3", album, "titulo"),
          el("p", { texto: contarItens(album.fotos) }),
          campoItem("p", album, "descricao")
        ]);
        const abrir = (evento) => {
          if (evento.target.closest(".ferramentas")) return;
          if (editando && evento.target.closest("[data-item-campo]")) return;
          if (!album.fotos.length) {
            mostrarMensagem(editando ? "Use \"+ Fotos\" para colocar fotos neste álbum." : "Este álbum ainda não tem fotos.");
            return;
          }
          abrirVisor(album.fotos, 0, album);
        };
        cartao.addEventListener("click", abrir);
        cartao.addEventListener("keydown", (evento) => {
          if ((evento.key === "Enter" || evento.key === " ") && !evento.target.isContentEditable) {
            evento.preventDefault();
            abrir(evento);
          }
        });
        container.appendChild(cartao);
      });
      if (!(dados.albuns || []).length) container.appendChild(el("p", { classe: "vazio", texto: "Nenhum álbum ainda." }));
      return botaoAdicionar("Criar álbum", () => {
        dados.albuns.push({ id: novoId("al"), titulo: "Novo álbum", descricao: "Uma descrição curta.", fotos: [] });
        marcarAlterado();
        desenharListas();
      });
    }
  };

  function desenharListas() {
    LISTAS.forEach((lista) => {
      if (!Array.isArray(dados[lista])) dados[lista] = [];
      const container = document.querySelector('[data-lista="' + lista + '"]');
      if (!container) return;
      container.replaceChildren();
      const botao = desenhistas[lista](container);
      const anterior = container.nextElementSibling;
      if (anterior && anterior.classList.contains("adicionar")) anterior.remove();
      if (botao) container.after(botao);
    });
    aplicarEdicao();
  }

  function desenharTudo() {
    desenharCampos();
    desenharListas();
  }

  /* ---------- Edição de itens ---------- */

  function mover(lista, indice, direcao) {
    const itens = dados[lista];
    const destino = indice + direcao;
    if (destino < 0 || destino >= itens.length) return;
    [itens[indice], itens[destino]] = [itens[destino], itens[indice]];
    marcarAlterado();
    desenharListas();
  }

  function remover(lista, indice) {
    if (!window.confirm("Remover este item?")) return;
    dados[lista].splice(indice, 1);
    marcarAlterado();
    desenharListas();
  }

  function aplicarEdicao() {
    document.body.classList.toggle("editando", editando);
    document.querySelectorAll("[data-campo], [data-item-campo]").forEach((elemento) => {
      if (editando) {
        elemento.setAttribute("contenteditable", "plaintext-only");
        if (elemento.contentEditable !== "plaintext-only") elemento.setAttribute("contenteditable", "true");
        elemento.setAttribute("spellcheck", "true");
      } else {
        elemento.removeAttribute("contenteditable");
      }
    });
    document.querySelectorAll("img[data-item-imagem]").forEach((img) => {
      if (!img.getAttribute("src") || img.getAttribute("src").startsWith("data:image/svg")) {
        const item = acharItem(img);
        img.src = fonteImagem(item ? item[img.dataset.itemImagem] : "");
      }
    });
    document.querySelectorAll("img[data-imagem]").forEach((img) => {
      img.src = fonteImagem(dados[img.dataset.imagem]);
    });
  }

  function acharItem(elemento) {
    const cartao = elemento.closest("[data-id]");
    const container = elemento.closest("[data-lista]");
    if (!cartao || !container) return null;
    return (dados[container.dataset.lista] || []).find((item) => item.id === cartao.dataset.id) || null;
  }

  // Textos editados direto na página
  document.addEventListener("input", (evento) => {
    if (!editando) return;
    const alvo = evento.target;
    if (alvo.dataset && alvo.dataset.campo) {
      dados[alvo.dataset.campo] = alvo.textContent.trim();
      marcarAlterado();
    } else if (alvo.dataset && alvo.dataset.itemCampo) {
      const item = alvo.closest(".visor") ? visor.fotoAtual() : acharItem(alvo);
      if (item) {
        item[alvo.dataset.itemCampo] = alvo.textContent.trim();
        marcarAlterado();
      }
    }
  });

  // Ao sair de um campo, atualiza as outras cópias do mesmo texto (ex.: a letra da turma)
  document.addEventListener("focusout", (evento) => {
    if (editando && evento.target.dataset && evento.target.dataset.campo) desenharCampos();
  });

  // Enter não quebra linha em títulos curtos
  document.addEventListener("keydown", (evento) => {
    if (!editando || evento.key !== "Enter") return;
    const alvo = evento.target;
    const multilinha = ["P", "BLOCKQUOTE"].includes(alvo.tagName);
    if (alvo.isContentEditable && !multilinha) {
      evento.preventDefault();
      alvo.blur();
    }
  });

  // Trocar fotos clicando nelas no modo de edição
  document.addEventListener("click", (evento) => {
    if (!editando) return;
    const img = evento.target.closest("img[data-imagem], img[data-item-imagem]");
    if (!img || img.closest(".visor")) return;
    evento.preventDefault();
    if (img.dataset.imagem) {
      escolherImagens(false, ([src]) => {
        dados[img.dataset.imagem] = src;
        marcarAlterado();
        desenharCampos();
      });
    } else {
      const item = acharItem(img);
      if (!item) return;
      escolherImagens(false, ([src]) => {
        item[img.dataset.itemImagem] = src;
        marcarAlterado();
        desenharListas();
      });
    }
  });

  /* ---------- Fotos ---------- */

  const entradaImagem = document.getElementById("arquivo-imagem");

  function escolherImagens(varias, callback) {
    destinoImagem = callback;
    entradaImagem.multiple = varias;
    entradaImagem.value = "";
    entradaImagem.click();
  }

  entradaImagem.addEventListener("change", async () => {
    const arquivos = Array.from(entradaImagem.files || []).filter((f) => f.type.startsWith("image/"));
    if (!arquivos.length || !destinoImagem) return;
    mostrarMensagem("Preparando " + arquivos.length + (arquivos.length === 1 ? " foto..." : " fotos..."));
    try {
      const imagens = [];
      for (const arquivo of arquivos) imagens.push(await reduzirImagem(arquivo));
      destinoImagem(imagens);
      mostrarMensagem("Foto adicionada. Lembre de salvar.");
    } catch (erro) {
      console.error(erro);
      mostrarMensagem("Não consegui abrir essa imagem. Tente outra (JPG ou PNG).");
    } finally {
      destinoImagem = null;
    }
  });

  function reduzirImagem(arquivo) {
    const largura = CONFIG.LARGURA_MAXIMA_FOTO || 1400;
    const qualidade = CONFIG.QUALIDADE_FOTO || 0.8;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, largura / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Imagem inválida"));
      };
      img.src = url;
    });
  }

  /* ---------- Visualizador de fotos ---------- */

  const visor = (function () {
    const janela = document.getElementById("visor");
    const img = janela.querySelector("img");
    const video = el("video", { controls: "", playsinline: "", preload: "metadata" });
    video.hidden = true;
    img.after(video);
    const legenda = janela.querySelector("figcaption");
    let fotos = [];
    let indice = 0;
    let album = null;
    let barraEdicao = null;

    function mostrar() {
      const foto = fotos[indice];
      if (!foto) return fechar();
      video.pause();
      if (ehVideo(foto)) {
        img.hidden = true;
        video.hidden = false;
        video.src = foto.src;
      } else {
        video.hidden = true;
        video.removeAttribute("src");
        img.hidden = false;
        img.src = fonteImagem(foto.src);
        img.alt = foto.legenda || "Foto";
      }
      legenda.textContent = foto.legenda || "";
      if (album && editando) {
        legenda.dataset.itemCampo = "legenda";
        legenda.setAttribute("contenteditable", "true");
        if (!foto.legenda) legenda.textContent = "";
        legenda.setAttribute("data-dica", "Escreva uma legenda");
      } else {
        delete legenda.dataset.itemCampo;
        legenda.removeAttribute("contenteditable");
      }
      janela.querySelector(".anterior").hidden = fotos.length < 2;
      janela.querySelector(".proxima").hidden = fotos.length < 2;
      montarBarraEdicao();
    }

    function montarBarraEdicao() {
      if (barraEdicao) barraEdicao.remove();
      barraEdicao = null;
      if (!album || !editando) return;
      barraEdicao = el("div", { classe: "ferramentas", style: "display:flex;position:fixed;top:1rem;left:1rem;right:auto" }, [
        ehVideo(fotos[indice]) ? null : el("button", {
          type: "button",
          texto: "Trocar foto",
          onclick: () => escolherImagens(false, ([src]) => {
            fotos[indice].src = src;
            marcarAlterado();
            mostrar();
            desenharListas();
          })
        }),
        el("button", {
          type: "button",
          classe: "remover",
          texto: "Remover foto",
          onclick: () => {
            if (!window.confirm("Remover esta foto do álbum?")) return;
            fotos.splice(indice, 1);
            marcarAlterado();
            indice = Math.min(indice, fotos.length - 1);
            desenharListas();
            fotos.length ? mostrar() : fechar();
          }
        })
      ]);
      janela.appendChild(barraEdicao);
    }

    function abrir(lista, inicio, albumAtual) {
      fotos = lista;
      indice = inicio;
      album = albumAtual;
      mostrar();
      if (!janela.open) janela.showModal();
    }

    function fechar() {
      video.pause();
      if (janela.open) janela.close();
    }

    function passo(direcao) {
      if (fotos.length < 2) return;
      indice = (indice + direcao + fotos.length) % fotos.length;
      mostrar();
    }

    janela.querySelector(".visor-fechar").addEventListener("click", fechar);
    janela.querySelector(".anterior").addEventListener("click", () => passo(-1));
    janela.querySelector(".proxima").addEventListener("click", () => passo(1));
    janela.addEventListener("click", (evento) => {
      if (evento.target === janela || evento.target.tagName === "FIGURE") fechar();
    });
    janela.addEventListener("keydown", (evento) => {
      if (evento.target.isContentEditable) return;
      if (evento.key === "ArrowLeft") passo(-1);
      if (evento.key === "ArrowRight") passo(1);
    });
    janela.addEventListener("close", () => {
      video.pause();
      if (barraEdicao) barraEdicao.remove();
      barraEdicao = null;
    });

    return { abrir, fotoAtual: () => fotos[indice] };
  })();

  function abrirVisor(fotos, indice, album) {
    visor.abrir(fotos, indice, album);
  }

  /* ---------- Login e modo de edição ---------- */

  async function hashTexto(texto) {
    const bytes = new TextEncoder().encode(texto);
    const resumo = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(resumo)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  window.gerarHashSenha = async function (senha) {
    const hash = await hashTexto(String(senha));
    console.log("Cole em js/config.js, no campo SENHA_HASH:\n" + hash);
    return hash;
  };

  const janelaLogin = document.getElementById("login");
  const campoSenha = document.getElementById("senha");
  const erroLogin = document.getElementById("erro-login");

  function pedirLogin() {
    erroLogin.hidden = true;
    campoSenha.value = "";
    janelaLogin.showModal();
    campoSenha.focus();
  }

  document.getElementById("form-login").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!window.crypto || !crypto.subtle) {
      erroLogin.textContent = "Abra o site por http(s) ou localhost para usar o login.";
      erroLogin.hidden = false;
      return;
    }
    const hash = await hashTexto(campoSenha.value);
    if (hash === CONFIG.SENHA_HASH) {
      sessionStorage.setItem(CHAVE_SESSAO, "1");
      janelaLogin.close();
      entrarEdicao();
    } else {
      erroLogin.textContent = "Senha incorreta.";
      erroLogin.hidden = false;
      campoSenha.select();
    }
  });

  document.getElementById("cancelar-login").addEventListener("click", () => janelaLogin.close());

  const barraEdicao = document.querySelector(".barra-edicao");
  const botaoEditar = document.getElementById("btn-editar");

  function entrarEdicao() {
    copiaAntesDeEditar = clonar(dados);
    alterado = false;
    editando = true;
    botaoEditar.hidden = true;
    barraEdicao.hidden = false;
    desenharTudo();
    mostrarMensagem("Modo de edição: clique nos textos e nas fotos para alterar.");
  }

  function sairEdicao() {
    editando = false;
    botaoEditar.hidden = false;
    barraEdicao.hidden = true;
    desenharTudo();
  }

  botaoEditar.addEventListener("click", () => {
    if (sessionStorage.getItem(CHAVE_SESSAO) === "1") entrarEdicao();
    else pedirLogin();
  });

  document.getElementById("btn-salvar").addEventListener("click", async () => {
    if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
    try {
      await banco.gravar({ versaoBase: VERSAO_PUBLICADA, dados: dados });
      alterado = false;
      sairEdicao();
      mostrarAvisoRascunho(true);
      mostrarMensagem("Salvo neste navegador. Para publicar, entre em Editar e use Baixar dados.");
    } catch (erro) {
      console.error(erro);
      mostrarMensagem("Não consegui salvar no navegador. Use Baixar dados para não perder nada.");
    }
  });

  document.getElementById("btn-sair").addEventListener("click", () => {
    if (alterado && !window.confirm("Sair sem salvar? As alterações desta edição serão perdidas.")) return;
    if (alterado) dados = copiaAntesDeEditar;
    alterado = false;
    sessionStorage.removeItem(CHAVE_SESSAO);
    sairEdicao();
  });

  document.getElementById("btn-baixar").addEventListener("click", () => {
    const conteudo =
      "/*\n * Conteúdo do site. Este arquivo é gerado pelo botão \"Baixar dados\"\n" +
      " * no modo de edição. Para publicar uma alteração, substitua este arquivo\n" +
      " * pelo que você baixou e envie para o GitHub.\n */\n" +
      "window.DADOS = " + JSON.stringify(dados, null, 2) + ";\n";
    const blob = new Blob([conteudo], { type: "text/javascript" });
    const link = el("a", { href: URL.createObjectURL(blob), download: "dados.js" });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
    mostrarMensagem("Arquivo dados.js baixado. Coloque na pasta data do projeto e envie ao GitHub.");
  });

  const entradaDados = document.getElementById("arquivo-dados");
  document.getElementById("btn-carregar").addEventListener("click", () => {
    entradaDados.value = "";
    entradaDados.click();
  });

  entradaDados.addEventListener("change", async () => {
    const arquivo = entradaDados.files && entradaDados.files[0];
    if (!arquivo) return;
    try {
      const texto = await arquivo.text();
      const inicio = texto.indexOf("{");
      const fim = texto.lastIndexOf("}");
      const novos = JSON.parse(texto.slice(inicio, fim + 1));
      if (typeof novos !== "object" || !("escola" in novos)) throw new Error("Arquivo sem os dados do site");
      dados = novos;
      marcarAlterado();
      desenharTudo();
      mostrarMensagem("Dados carregados. Clique em Salvar e concluir para guardar.");
    } catch (erro) {
      console.error(erro);
      mostrarMensagem("Esse arquivo não é um dados.js válido.");
    }
  });

  document.getElementById("btn-descartar").addEventListener("click", async () => {
    if (!window.confirm("Descartar o rascunho deste navegador e voltar ao conteúdo publicado?")) return;
    try {
      await banco.apagar();
    } catch (erro) {
      console.error(erro);
    }
    dados = clonar(window.DADOS || {});
    copiaAntesDeEditar = clonar(dados);
    alterado = false;
    mostrarAvisoRascunho(false);
    desenharTudo();
    mostrarMensagem("Rascunho descartado.");
  });

  window.addEventListener("beforeunload", (evento) => {
    if (editando && alterado) {
      evento.preventDefault();
      evento.returnValue = "";
    }
  });

  function mostrarAvisoRascunho(mostrar) {
    document.getElementById("aviso-rascunho").hidden = !mostrar;
  }

  /* ---------- Menu ---------- */

  const botaoMenu = document.querySelector(".menu-botao");
  const menu = document.getElementById("menu");
  botaoMenu.addEventListener("click", () => {
    const aberto = menu.classList.toggle("aberto");
    botaoMenu.setAttribute("aria-expanded", String(aberto));
  });
  menu.addEventListener("click", (evento) => {
    if (evento.target.tagName === "A") {
      menu.classList.remove("aberto");
      botaoMenu.setAttribute("aria-expanded", "false");
    }
  });

  if ("IntersectionObserver" in window) {
    const links = Array.from(menu.querySelectorAll("a"));
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        links.forEach((link) => link.classList.toggle("ativo", link.getAttribute("href") === "#" + entrada.target.id));
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll("main section[id]").forEach((secao) => observador.observe(secao));
  }

  /* ---------- Início ---------- */

  async function iniciar() {
    desenharTudo();
    try {
      const rascunho = await banco.ler();
      // Rascunhos antigos (sem versão) ou feitos sobre outra versão publicada são descartados,
      // para o navegador nunca esconder uma atualização enviada ao GitHub.
      if (rascunho && rascunho.versaoBase === VERSAO_PUBLICADA && rascunho.dados) {
        dados = rascunho.dados;
        mostrarAvisoRascunho(true);
        desenharTudo();
      } else if (rascunho) {
        await banco.apagar();
        mostrarMensagem("O site foi atualizado. O rascunho antigo deste navegador foi descartado.");
      }
    } catch (erro) {
      // Sem IndexedDB (ex.: navegação privada): o site funciona só com os dados publicados.
      console.warn("Rascunho indisponível:", erro);
    }
  }

  iniciar();
})();
