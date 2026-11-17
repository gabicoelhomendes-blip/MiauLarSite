
const lista = document.getElementById("lista-gerenciamento");
const mensagem = document.getElementById("mensagem-gerenciamento");

// Cria um cartão de gato na área de gerenciamento
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

    const botao = document.createElement("a");
    botao.className = "botao";
    botao.href = `editar-gato.html?id=${gato.id}`;
    botao.textContent = "Editar";

    item.append(imagem, nome, idade, status, botao);

    return item;
}

// Consulta somente os gatos permitidos para a conta
async function carregarMeusGatos() {
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
            lista.textContent = "Você ainda não possui gatos cadastrados.";
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

carregarMeusGatos();
