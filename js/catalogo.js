
const listaGatos = document.getElementById("lista-gatos");

// Cria um cartão com os dados vindos do SQLite
function criarCardGato(gato) {
    const card = document.createElement("article");
    card.className = "card-gato";

    const foto = document.createElement("div");
    foto.className = "foto-gato";

    const imagem = document.createElement("img");
    imagem.src = gato.imagem;
    imagem.alt = `Foto de ${gato.nome}`;
    imagem.loading = "lazy";

    foto.appendChild(imagem);

    const informacoes = document.createElement("div");
    informacoes.className = "informacoes-gato";

    const titulo = document.createElement("h3");
    titulo.textContent = gato.nome;
    informacoes.appendChild(titulo);

    const campos = [
        ["Idade", gato.idade],
        ["Sexo", gato.sexo],
        ["Raça", gato.raca],
        ["Porte", gato.porte],
        ["Localização", gato.localizacao],
        ["Saúde", gato.saude]
    ];

    for (const [campo, valor] of campos) {
        const paragrafo = document.createElement("p");
        paragrafo.textContent = `${campo}: ${valor}`;
        informacoes.appendChild(paragrafo);
    }

    const status = document.createElement("span");
    status.className = "status-gato";
    status.textContent = gato.status;
    informacoes.appendChild(status);

    const paragrafoBotao = document.createElement("p");

    const botao = document.createElement("a");
    botao.className = "botao";
    botao.textContent = "Ver detalhes";

    // Usa o ID do gato no banco de dados
    botao.href = `detalhes.html?gato=${gato.id}`;

    paragrafoBotao.appendChild(botao);
    informacoes.appendChild(paragrafoBotao);

    card.appendChild(foto);
    card.appendChild(informacoes);

    return card;
}

// Busca os gatos cadastrados no banco de dados
async function carregarGatos() {
    if (!listaGatos) {
        return;
    }

    try {
        const resposta = await fetch("/api/gatos");

        if (!resposta.ok) {
            throw new Error("Erro ao consultar os gatos.");
        }

        const gatos = await resposta.json();

        if (!Array.isArray(gatos)) {
            throw new Error("Dados inválidos recebidos.");
        }

        const novosCards = document.createDocumentFragment();

        for (const gato of gatos) {
            novosCards.appendChild(criarCardGato(gato));
        }

        // Substitui os cartões fixos pelos dados do SQLite
        listaGatos.replaceChildren(novosCards);

        // Atualiza os filtros para os novos cartões
        document.getElementById("campo-pesquisa")
            .dispatchEvent(new Event("input"));

    } catch (erro) {
        console.error("Erro ao carregar catálogo:", erro);

        // Em caso de erro, mantém os cartões antigos
    }
}

carregarGatos();
