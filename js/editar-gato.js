const parametrosEdicao = new URLSearchParams(window.location.search);
const idGatoEdicao = parametrosEdicao.get("id");

const formulario = document.getElementById("form-editar-gato");
const mensagem = document.getElementById("mensagem-edicao");
const botaoSalvar = formulario.querySelector('button[type="submit"]');

const campos = [
    "nome", "idade", "sexo", "raca",
    "porte", "localizacao", "saude"
];

let gatoOriginal = null;

// Carrega apenas os gatos que o usuário tem permissão para editar
async function carregarGato() {
    if (!idGatoEdicao || !/^[1-9]\d*$/.test(idGatoEdicao)) {
        mensagem.textContent = "Identificador do gato inválido.";
        return;
    }

    try {
        const resposta = await fetch("/api/meus-gatos", {
            credentials: "same-origin"
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível carregar o gato."
            );
        }
        
        gatoOriginal = dados.find(
            (gato) => String(gato.id) === idGatoEdicao
        );

        if (!gatoOriginal) {
            throw new Error(
                "Gato não encontrado ou você não tem permissão para editá-lo."
            );
        }

        for (const campo of campos) {
            document.getElementById(campo).value =
                gatoOriginal[campo] ?? "";
        }

        mensagem.textContent = `Editando: ${gatoOriginal.nome}`;
        formulario.hidden = false;

    } catch (erro) {
        mensagem.textContent = erro.message;
        mensagem.style.color = "red";
    }
}

// Envia as alterações ao servidor
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const dados = {};

    for (const campo of campos) {
        dados[campo] = document.getElementById(campo).value.trim();
    }

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
    mensagem.textContent = "";

    try {
        const resposta = await fetch(
           `/api/gatos/${encodeURIComponent(idGatoEdicao)}`,
            {
                method: "PUT",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Não foi possível salvar as alterações."
            );
        }

        mensagem.textContent = resultado.mensagem;
        mensagem.style.color = "green";

        gatoOriginal = { ...gatoOriginal, ...dados };

    } catch (erro) {
        mensagem.textContent = erro.message;
        mensagem.style.color = "red";

    } finally {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = "Salvar alterações";
    }
});

carregarGato();
