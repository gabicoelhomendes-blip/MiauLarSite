
const formulario = document.getElementById("form-login");
const mensagem = document.getElementById("mensagem-login");
const botao = document.getElementById("botao-entrar");

// Realiza o login pelo servidor
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    botao.disabled = true;
    botao.textContent = "Entrando...";

    mensagem.textContent = "";
    mensagem.style.color = "";

    const dados = {
        email: document.getElementById("email").value.trim(),
        senha: document.getElementById("senha").value
    };

    try {
        const resposta = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Não foi possível realizar o login."
            );
        }

        // Exibe o resultado do login
        mensagem.textContent = `Bem-vindo(a), ${resultado.usuario.nome}!`;
        mensagem.style.color = "green";

        // Limpa a senha após o login
        document.getElementById("senha").value = "";

    } catch (erro) {
        mensagem.textContent =
            erro.message || "Erro ao conectar com o servidor.";

        mensagem.style.color = "red";

    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar";
    }
});
