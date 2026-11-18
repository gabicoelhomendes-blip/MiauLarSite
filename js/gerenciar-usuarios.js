
const lista = document.getElementById("lista-usuarios");
const mensagem = document.getElementById("mensagem-usuarios");

// Nomes dos perfis exibidos na tela
function nomePerfil(perfil) {
    const nomes = {
        administrador: "Administrador",
        responsavel: "Responsável",
        adotante: "Adotante"
    };

    return nomes[perfil] || perfil;
}

// Mostra mensagens ao usuário
function mostrarMensagem(texto, cor = "#555") {
    mensagem.textContent = texto;
    mensagem.style.color = cor;
}

// Altera o perfil de um usuário
async function alterarPerfil(usuario, novoPerfil, botao, seletor) {
    if (novoPerfil === usuario.perfil) {
        mostrarMensagem("Este usuário já possui esse perfil.");
        return;
    }

    const confirmado = confirm(
        `Deseja alterar o perfil de ${usuario.nome} ` +
        `para ${nomePerfil(novoPerfil)}?\n\n` +
        "O usuário precisará entrar novamente após a alteração."
    );

    if (!confirmado) {
        seletor.value = usuario.perfil;
        return;
    }

    botao.disabled = true;
    seletor.disabled = true;
    botao.textContent = "Salvando...";

    try {
        const resposta = await fetch(
            `/api/admin/usuarios/${usuario.id}/perfil`,
            {
                method: "PATCH",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    perfil: novoPerfil
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível alterar o perfil."
            );
        }

        await carregarUsuarios();

        mostrarMensagem(
            dados.mensagem || "Perfil atualizado com sucesso!",
            "#15803d"
        );

    } catch (erro) {
        mostrarMensagem(erro.message, "#b91c1c");

        seletor.value = usuario.perfil;
        seletor.disabled = false;
        botao.disabled = false;
        botao.textContent = "Salvar perfil";
    }
}

// Cria o cartão de cada usuário
function criarCardUsuario(usuario) {
    const card = document.createElement("article");
    card.className = "card-usuario";

    const dados = document.createElement("div");
    dados.className = "dados-usuario";

    const nome = document.createElement("h2");
    nome.textContent = usuario.nome;

    const email = document.createElement("p");
    email.textContent = `E-mail: ${usuario.email}`;

    const telefone = document.createElement("p");
    telefone.textContent = `Telefone: ${usuario.telefone}`;

    dados.append(nome, email, telefone);

    // Área lateral com perfil e controles
    const lateral = document.createElement("div");
    lateral.className = "acoes-usuario";

    const perfil = document.createElement("span");
    perfil.className = `perfil-usuario perfil-${usuario.perfil}`;
    perfil.textContent = nomePerfil(usuario.perfil);

    lateral.appendChild(perfil);

    // A conta administradora fica protegida
    if (usuario.perfil !== "administrador") {
        const seletor = document.createElement("select");
        seletor.className = "seletor-perfil";

        seletor.setAttribute(
            "aria-label",
            `Alterar perfil de ${usuario.nome}`
        );

        const opcoes = [
            ["adotante", "Adotante"],
            ["responsavel", "Responsável"]
        ];

        for (const [valor, texto] of opcoes) {
            const opcao = document.createElement("option");
            opcao.value = valor;
            opcao.textContent = texto;
            seletor.appendChild(opcao);
        }

        seletor.value = usuario.perfil;

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "botao-salvar-perfil";
        botao.textContent = "Salvar perfil";

        botao.addEventListener("click", () => {
            alterarPerfil(
                usuario,
                seletor.value,
                botao,
                seletor
            );
        });

        lateral.append(seletor, botao);
    }

    card.append(dados, lateral);

    return card;
}

// Busca os usuários cadastrados
async function carregarUsuarios() {
    try {
        const resposta = await fetch("/api/admin/usuarios", {
            credentials: "same-origin"
        });

        if (resposta.status === 401) {
            lista.replaceChildren();
            mostrarMensagem(
                "Faça login como administrador para continuar."
            );
            return;
        }

        if (resposta.status === 403) {
            lista.replaceChildren();
            mostrarMensagem(
                "Acesso permitido somente para administradores."
            );
            return;
        }

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível carregar os usuários."
            );
        }

        const usuarios = await resposta.json();

        if (!Array.isArray(usuarios)) {
            throw new Error(
                "Resposta inválida do servidor."
            );
        }

        lista.replaceChildren();

        for (const usuario of usuarios) {
            lista.appendChild(criarCardUsuario(usuario));
        }

        mostrarMensagem(
            `${usuarios.length} usuário(s) cadastrado(s).`
        );

    } catch (erro) {
        mostrarMensagem(erro.message, "#b91c1c");
    }
}

// Carrega os usuários ao abrir a página
carregarUsuarios();
