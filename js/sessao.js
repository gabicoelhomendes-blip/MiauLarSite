
// MiauLar - Identificação de usuário e controle do menu

async function atualizarMenu() {
    const barra = document.querySelector(".topbar-acoes");
    const menuGerenciar = document.querySelector(
        '.sidebar a[href="gerenciar-gatos.html"]'
    );

    if (!barra) return;

    let usuario = null;

    try {
        const resposta = await fetch("/api/sessao", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (resposta.ok) {
            const dados = await resposta.json();

            if (dados.autenticado) {
                usuario = dados.usuario;
            }
        }
    } catch (erro) {
        console.error("Erro ao consultar sessão:", erro);
    }

    const nomesPerfis = {
        administrador: "Administrador",
        responsavel: "Responsável",
        adotante: "Adotante"
    };

    // Somente perfis autorizados visualizam o gerenciamento.
    if (menuGerenciar) {
        menuGerenciar.hidden = !usuario ||
            !["administrador", "responsavel"].includes(
                usuario.perfil
            );
    }

    barra.replaceChildren();

    if (!usuario) {
        const entrar = document.createElement("a");
        entrar.href = "login.html";
        entrar.className = "botao-entrar";
        entrar.textContent = "Entrar →";
        barra.appendChild(entrar);
        return;
    }

    // Identificação do perfil na página inicial
    const identificacao = document.createElement("div");
    identificacao.className = "usuario-identificacao";

    const avatar = document.createElement("div");
    avatar.className = "usuario-avatar";
    avatar.textContent = usuario.nome.charAt(0).toUpperCase();

    const informacoes = document.createElement("div");
    informacoes.className = "usuario-informacoes";

    const nome = document.createElement("strong");
    nome.textContent = usuario.nome;

    const perfil = document.createElement("span");
    perfil.className = "usuario-perfil";
    perfil.textContent =
        nomesPerfis[usuario.perfil] || usuario.perfil;

    informacoes.append(nome, perfil);
    identificacao.append(avatar, informacoes);

    // Botão para sair da conta
    const sair = document.createElement("button");
    sair.type = "button";
    sair.className = "botao-sair";
    sair.textContent = "Sair";

    sair.addEventListener("click", async () => {
        sair.disabled = true;
        sair.textContent = "Saindo...";

        try {
            const resposta = await fetch("/api/logout", {
                method: "POST",
                credentials: "same-origin"
            });

            if (!resposta.ok) {
                throw new Error("Não foi possível sair.");
            }

            window.location.href = "index.html";
        } catch (erro) {
            alert(erro.message);
            sair.disabled = false;
            sair.textContent = "Sair";
        }
    });

    barra.append(identificacao, sair);
}

atualizarMenu();
