
const formulario = document.getElementById("form-gato");
const mensagem = document.getElementById("mensagem-gato");
const botao = document.getElementById("botao-cadastrar-gato");

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagem.textContent = "";

    const arquivo = document.getElementById("imagem").files[0];

    if (!arquivo) {
        mensagem.textContent = "Selecione uma fotografia.";
        mensagem.style.color = "red";
        return;
    }

    const formatos = ["image/jpeg", "image/png", "image/webp"];

    if (!formatos.includes(arquivo.type)) {
        mensagem.textContent = "Use uma foto JPG, PNG ou WebP.";
        mensagem.style.color = "red";
        return;
    }

    if (arquivo.size > 1024 * 1024) {
        mensagem.textContent = "A foto deve ter no máximo 1 MB.";
        mensagem.style.color = "red";
        return;
    }

    botao.disabled = true;
    botao.textContent = "Cadastrando...";

    try {
        const imagemBase64 = await new Promise((resolve, reject) => {
            const leitor = new FileReader();

            leitor.onload = () => resolve(leitor.result);
            leitor.onerror = () => reject(
                new Error("Não foi possível ler a fotografia.")
            );

            leitor.readAsDataURL(arquivo);
        });

        const dados = {
            nome: document.getElementById("nome").value.trim(),
            idade: document.getElementById("idade").value.trim(),
            sexo: document.getElementById("sexo").value,
            raca: document.getElementById("raca").value.trim(),
            porte: document.getElementById("porte").value,
            localizacao: document.getElementById("localizacao").value.trim(),
            saude: document.getElementById("saude").value.trim(),
            imagem: imagemBase64
        };

        const resposta = await fetch("/api/gatos", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Não foi possível cadastrar o gato."
            );
        }

        mensagem.textContent = resultado.mensagem;
        mensagem.style.color = "green";
        formulario.reset();

    } catch (erro) {
        mensagem.textContent = erro.message;
        mensagem.style.color = "red";

    } finally {
        botao.disabled = false;
        botao.textContent = "Cadastrar gato";
    }
});
