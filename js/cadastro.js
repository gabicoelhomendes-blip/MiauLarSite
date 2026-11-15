
const formulario = document.getElementById("form-cadastro");
const mensagem = document.getElementById("mensagem-cadastro");
const botao = document.getElementById("botao-cadastrar");

// Envia os dados do cadastro para o servidor
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    // Evita cadastrar duas vezes
    botao.disabled = true;
    botao.textContent = "Cadastrando...";

    mensagem.textContent = "Aguarde, realizando cadastro...";
    mensagem.style.color = "#424242";

    const dados = {
        nome: document.getElementById("nome").value.trim(),
        email: document.getElementById("email").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        senha: document.getElementById("senha").value,
        perfil: document.getElementById("perfil").value
    };

    try {
        const resposta = await fetch("/api/cadastro", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Não foi possível realizar o cadastro."
            );
        }

        // Cadastro realizado com sucesso
        mensagem.textContent = resultado.mensagem;
        mensagem.style.color = "green";

        formulario.reset();

    } catch (erro) {
        mensagem.textContent =
            erro.message || "Erro ao conectar com o servidor.";

        mensagem.style.color = "red";

    } finally {
        botao.disabled = false;
        botao.textContent = "Cadastrar";
    }
});
