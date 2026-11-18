
const formulario = document.getElementById("formulario-senha");
const mensagem = document.getElementById("mensagem-senha");
const botao = document.getElementById("botao-salvar-senha");

function mostrarMensagem(texto, cor = "#555") {
    mensagem.textContent = texto;
    mensagem.style.color = cor;
}

// Verifica se existe uma sessão ativa
async function verificarAcesso() {
    try {
        const resposta = await fetch("/api/sessao", {
            credentials: "same-origin"
        });

        if (!resposta.ok) {
            formulario.hidden = true;
            mostrarMensagem(
                "Faça login para alterar sua senha.",
                "#b91c1c"
            );

            const link = document.createElement("a");
            link.href = "login.html";
            link.textContent = "Entrar na minha conta";
            link.className = "link-login-senha";

            mensagem.after(link);
        }

    } catch (erro) {
        formulario.hidden = true;
        mostrarMensagem(
            "Não foi possível verificar sua sessão.",
            "#b91c1c"
        );
    }
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const senhaAtual = document.getElementById("senha-atual").value;
    const novaSenha = document.getElementById("nova-senha").value;
    const confirmarSenha =
        document.getElementById("confirmar-senha").value;

    if (novaSenha.length < 8) {
        mostrarMensagem(
            "A nova senha deve ter pelo menos 8 caracteres.",
            "#b91c1c"
        );
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mostrarMensagem(
            "A confirmação da senha não corresponde.",
            "#b91c1c"
        );
        return;
    }

    botao.disabled = true;
    botao.textContent = "Salvando...";
    mostrarMensagem("");

    try {
        const resposta = await fetch("/api/alterar-senha", {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                senhaAtual,
                novaSenha,
                confirmarSenha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível alterar a senha."
            );
        }

        formulario.reset();
        formulario.hidden = true;

        mostrarMensagem(
            "Senha alterada com sucesso! Entre novamente com a nova senha.",
            "#15803d"
        );

        const link = document.createElement("a");
        link.href = "login.html";
        link.className = "link-login-senha";
        link.textContent = "Fazer login";

        mensagem.after(link);

    } catch (erro) {
        mostrarMensagem(erro.message, "#b91c1c");

        botao.disabled = false;
        botao.textContent = "Salvar nova senha";
    }
});

verificarAcesso();
