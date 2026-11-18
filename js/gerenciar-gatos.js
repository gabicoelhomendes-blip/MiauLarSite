
const lista = document.getElementById("lista-gerenciamento");
const mensagem = document.getElementById("mensagem-gerenciamento");

// Cria um cartão para cada gato
function criarItemGato(gato) {
    const item = document.createElement("article");
    item.className = "card-gato";

    const imagem = document.createElement("img");
    imagem.src = gato.imagem;
    imagem.alt = `Foto de ${gato.nome}`;

    const nome = document.createElement("h3");
    nome.textContent = gato.nome;

    const idade = document.createElement("p");
    idade.textContent = `Idade: ${gato.idade}`;

    const status = document.createElement("p");
    status.textContent = `Situação: ${gato.status}`;

    // Botão para editar o gato
    const botaoEditar = document.createElement("a");
    botaoEditar.className = "botao";
    botaoEditar.href = `editar-gato.html?id=${gato.id}`;
    botaoEditar.textContent = "Editar";

    // Botão para excluir o gato
    const botaoExcluir = document.createElement("button");
    botaoExcluir.type = "button";
    botaoExcluir.className = "botao-excluir";
    botaoExcluir.textContent = "Excluir";

    botaoExcluir.addEventListener("click", async () => {
        const confirmado = confirm(
            `Tem certeza que deseja excluir ${gato.nome}?\n\n` +
            "Essa ação é permanente e também excluirá " +
            "as solicitações de adoção vinculadas ao gato."
        );

        if (!confirmado) {
            return;
        }

        botaoExcluir.disabled = true;
        botaoExcluir.textContent = "Excluindo...";
        mensagem.textContent = "";

        try {
            const resposta = await fetch(
                `/api/gatos/${gato.id}`,
                {
                    method: "DELETE",
                    credentials: "same-origin"
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.erro || "Não foi possível excluir o gato."
                );
            }

            // Retira o cartão somente após a exclusão no servidor
            item.remove();

            mensagem.textContent =
                `${gato.nome} foi excluído com sucesso!`;
            mensagem.style.color = "green";

            if (!lista.querySelector(".card-gato")) {
                lista.textContent =
                    "Você ainda não possui gatos cadastrados.";
            }

        } catch (erro) {
            mensagem.textContent = erro.message;
            mensagem.style.color = "red";

        } finally {
            if (item.isConnected) {
                botaoExcluir.disabled = false;
                botaoExcluir.textContent = "Excluir";
            }
        }
    });

    // Organiza os botões lado a lado
    const acoes = document.createElement("div");
    acoes.className = "acoes-gato";
    acoes.append(botaoEditar, botaoExcluir);

    item.append(imagem, nome, idade, status, acoes);

    return item;
}

// Consulta os gatos que o usuário pode gerenciar
async function carregarMeusGatos() {
    mensagem.textContent = "";

    try {
        const resposta = await fetch("/api/meus-gatos", {
            credentials: "same-origin"
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível carregar os gatos."
            );
        }

        lista.replaceChildren();

        if (dados.length === 0) {
            lista.textContent =
                "Você ainda não possui gatos cadastrados.";
            return;
        }

        for (const gato of dados) {
            lista.appendChild(criarItemGato(gato));
        }

    } catch (erro) {
        lista.textContent = "";
        mensagem.textContent = erro.message;
        mensagem.style.color = "red";
    }
}

// Carrega os gatos ao abrir a página
carregarMeusGatos();
