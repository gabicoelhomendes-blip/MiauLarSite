
(() => {
    const body = document.body;

    if (!body || body.dataset.temaOriginal === "aplicado") {
        return;
    }

    body.dataset.temaOriginal = "aplicado";

    // A página inicial já tem seu próprio menu.
    if (body.classList.contains("pagina-inicial")) {
        document.querySelectorAll(".visualizacao").forEach((elemento) => {
            elemento.remove();
        });
        return;
    }

    const pagina = location.pathname.split("/").pop() || "index.html";

    const paginaLogin = pagina === "login.html";
    const paginaCadastro = pagina === "cadastro.html";
    const paginaAutenticacao = paginaLogin || paginaCadastro;

    const titulos = {
        "detalhes.html": "Detalhes do gato",
        "cadastrar-gato.html": "Cadastrar gato",
        "gerenciar-gatos.html": "Gerenciar gatos",
        "editar-gato.html": "Editar gato",
        "minhas-solicitacoes.html": "Minhas solicitações",
        "analisar-solicitacoes.html": "Analisar solicitações",
        "gerenciar-usuarios.html": "Gerenciar usuários",
        "alterar-senha.html": "Minha conta",
        "login.html": "Entrar",
        "cadastro.html": "Criar conta"
    };

    const titulo = titulos[pagina] || "MiauLar";

    function criarElemento(tag, classe, texto) {
        const elemento = document.createElement(tag);

        if (classe) {
            elemento.className = classe;
        }

        if (texto !== undefined) {
            elemento.textContent = texto;
        }

        return elemento;
    }

    function criarLink(destino, icone, texto, ativo = false) {
        const link = criarElemento(
            "a",
            ativo ? "tema-link ativo" : "tema-link"
        );

        link.href = destino;

        const simbolo = criarElemento("span", "tema-icone", icone);
        simbolo.setAttribute("aria-hidden", "true");

        link.append(simbolo, document.createTextNode(texto));

        return link;
    }

    const main = body.querySelector("main");

    if (!main) {
        return;
    }

    body.classList.add("tema-aplicado");

    if (paginaAutenticacao) {
        body.classList.add("tema-auth");
    }

    // Estrutura principal
    const estrutura = criarElemento("div", "tema-shell");

    // Menu lateral
    const sidebar = criarElemento("aside", "tema-sidebar");
    sidebar.setAttribute("aria-label", "Menu lateral do MiauLar");

    const marca = criarElemento("a", "tema-marca");
    marca.href = "index.html";

    const marcaIcone = criarElemento(
        "span",
        "tema-marca-icone",
        "🐱"
    );

    const marcaNome = criarElemento("strong", "", "MiauLar");

    marca.append(marcaIcone, marcaNome);

    const subtitulo = criarElemento(
        "div",
        "tema-subtitulo",
        "ADOÇÃO RESPONSÁVEL"
    );

    sidebar.append(marca, subtitulo);

    // Navegação principal
    const navegacao = criarElemento("nav", "tema-navegacao");
    navegacao.setAttribute("aria-label", "Navegação principal");

    navegacao.append(
        criarLink("index.html", "▦", "Explorar gatos"),
        criarLink("index.html#favoritos", "♡", "Favoritos"),
        criarLink(
            "minhas-solicitacoes.html",
            "▤",
            "Minhas solicitações",
            pagina === "minhas-solicitacoes.html"
        ),
        criarLink("index.html#guia", "▣", "Guia de adoção")
    );

    sidebar.appendChild(navegacao);

    // Área inferior do menu
    const parteInferior = criarElemento(
        "div",
        "tema-sidebar-bottom"
    );

    const aviso = criarElemento("div", "tema-care-note");

    aviso.append(
        criarElemento("span", "tema-note-icon", "♧"),
        criarElemento(
            "strong",
            "",
            "Um lar seguro começa com uma escolha consciente."
        )
    );

    const linkGuia = criarElemento(
        "a",
        "",
        "Conheça os cuidados ↗"
    );

    linkGuia.href = "index.html#guia";
    aviso.appendChild(linkGuia);

    parteInferior.appendChild(aviso);

    const ferramentas = criarElemento(
        "nav",
        "tema-navegacao tema-ferramentas"
    );

    const gerenciarGatos = criarLink(
        "gerenciar-gatos.html",
        "♧",
        "Gerenciar gatos",
        [
            "gerenciar-gatos.html",
            "editar-gato.html",
            "cadastrar-gato.html"
        ].includes(pagina)
    );

    const minhaConta = criarLink(
        "alterar-senha.html",
        "⚙",
        "Minha conta",
        pagina === "alterar-senha.html"
    );

    // Links administrativos
    const linksAdministrativos = criarElemento(
        "div",
        "tema-admin-links"
    );

    linksAdministrativos.hidden = true;

    const linkAnalisar = criarLink(
        "analisar-solicitacoes.html",
        "▤",
        "Analisar solicitações",
        pagina === "analisar-solicitacoes.html"
    );

    const linkUsuarios = criarLink(
        "gerenciar-usuarios.html",
        "♙",
        "Gerenciar usuários",
        pagina === "gerenciar-usuarios.html"
    );

    linksAdministrativos.append(linkAnalisar, linkUsuarios);

    gerenciarGatos.hidden = true;
    minhaConta.hidden = true;

    ferramentas.append(
        gerenciarGatos,
        linksAdministrativos,
        minhaConta
    );

    parteInferior.appendChild(ferramentas);

    const rodapeSidebar = criarElemento(
        "div",
        "tema-sidebar-footer",
        "MiauLar · v2.0"
    );

    parteInferior.appendChild(rodapeSidebar);
    sidebar.appendChild(parteInferior);

    // Área de conteúdo
    const workspace = criarElemento("div", "tema-workspace");

    const barraSuperior = criarElemento("header", "tema-topbar");

    const navegacaoSuperior = criarElemento(
        "div",
        "tema-breadcrumb"
    );

    navegacaoSuperior.append(
        criarElemento("span", "", "MiauLar"),
        criarElemento("span", "tema-divisor", "›"),
        criarElemento("strong", "", titulo)
    );

    const acoes = criarElemento("div", "tema-topbar-actions");

    const entrar = criarElemento(
        "a",
        "tema-btn-entrar",
        "Entrar →"
    );

    entrar.href = "login.html";
    acoes.appendChild(entrar);

    barraSuperior.append(navegacaoSuperior, acoes);
    workspace.appendChild(barraSuperior);

    main.classList.add("tema-content");

    // Login e cadastro em janela centralizada
    if (paginaAutenticacao) {
        const fundo = criarElemento(
            "div",
            "tema-auth-fundo"
        );

        fundo.append(
            criarElemento(
                "div",
                "tema-etiqueta",
                "ENCONTRE SEU COMPANHEIRO"
            ),
            criarElemento(
                "h1",
                "",
                "Seu próximo encontro começa aqui."
            ),
            criarElemento(
                "p",
                "",
                "Conheça os gatos e acompanhe cada etapa da adoção."
            )
        );

        workspace.appendChild(fundo);

        const backdrop = criarElemento(
            "div",
            "tema-backdrop"
        );

        const modal = criarElemento("div", "tema-modal");

        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-label", titulo);

        const fechar = criarElemento(
            "a",
            "tema-modal-fechar",
            "×"
        );

        fechar.href = "index.html";
        fechar.setAttribute(
            "aria-label",
            "Fechar e voltar ao catálogo"
        );

// Cabeçalho de autenticação igual ao MiauLar original
const cabecalhoAuth = criarElemento(
    "div",
    "tema-auth-cabecalho"
);

const etiquetaAuth = criarElemento(
    "span",
    "tema-auth-etiqueta",
    "UM PASSO MAIS PERTO"
);

const tituloAuth = criarElemento(
    "h2",
    "tema-auth-titulo",
    paginaLogin
        ? "Bem-vindo ao MiauLar."
        : "Seu novo começo."
);

const descricaoAuth = criarElemento(
    "p",
    "tema-auth-descricao",
    paginaLogin
        ? "Entre para acompanhar seus pedidos e cuidar de cada etapa."
        : "Crie uma conta de adotante ou responsável."
);

const abasAuth = criarElemento(
    "div",
    "tema-auth-abas"
);

const abaEntrar = criarElemento(
    "a",
    paginaLogin ? "tema-auth-aba ativa" : "tema-auth-aba",
    "Entrar"
);

abaEntrar.href = "login.html";

const abaCadastro = criarElemento(
    "a",
    paginaCadastro ? "tema-auth-aba ativa" : "tema-auth-aba",
    "Criar conta"
);

abaCadastro.href = "cadastro.html";

abasAuth.append(abaEntrar, abaCadastro);

cabecalhoAuth.append(
    etiquetaAuth,
    tituloAuth,
    descricaoAuth,
    abasAuth
);

modal.appendChild(cabecalhoAuth);

// Aviso informativo abaixo das abas
const avisoAuth = criarElemento(
    "p",
    "tema-auth-aviso",
    "A administração do MiauLar é reservada ao perfil Administrador. As demais pessoas podem participar como Adotante ou Responsável."
);

modal.appendChild(avisoAuth);


        modal.append(fechar, main);
        backdrop.appendChild(modal);

        workspace.appendChild(backdrop);
    } else {
        workspace.appendChild(main);
    }

    const rodape = criarElemento(
        "footer",
        "tema-footer",
        "MiauLar · Adoção responsável de gatos"
    );

    workspace.appendChild(rodape);

    estrutura.append(sidebar, workspace);

    body.prepend(estrutura);

    // Oculta cabeçalhos e rodapés antigos,
    // sem excluir o conteúdo das páginas.
    [...body.children].forEach((elemento) => {
        if (elemento === estrutura) {
            return;
        }

        if (elemento.tagName === "HEADER") {
            elemento.classList.add("tema-cabecalho-antigo");
        }

        if (elemento.tagName === "FOOTER") {
            elemento.classList.add("tema-rodape-antigo");
        }
    });

    // Adapta os atalhos ao perfil da pessoa autenticada.
    fetch("/api/sessao", {
        credentials: "same-origin"
    })
        .then((resposta) => {
            return resposta.ok ? resposta.json() : null;
        })
        .then((dados) => {
            const perfil = dados?.usuario?.perfil;

            if (!perfil) {
                return;
            }

            entrar.textContent = "Minha conta →";
            entrar.href = "alterar-senha.html";

            minhaConta.hidden = false;

            if (
                perfil === "administrador" ||
                perfil === "responsavel"
            ) {
                gerenciarGatos.hidden = false;
                linksAdministrativos.hidden = false;
                linkAnalisar.hidden = false;
            }

            if (perfil === "administrador") {
                linkUsuarios.hidden = false;
            } else {
                linkUsuarios.hidden = true;
            }

            if (perfil === "adotante") {
                gerenciarGatos.hidden = true;
                linksAdministrativos.hidden = true;
            }
        })
        .catch((erro) => {
            console.error(
                "Não foi possível verificar a sessão:",
                erro
            );
        });
})();
