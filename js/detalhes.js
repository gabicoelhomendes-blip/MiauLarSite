
const parametros = new URLSearchParams(window.location.search);
const idGato = parametros.get("gato");

const nomeGato = document.getElementById("nome-gato");
const imagemGato = document.getElementById("imagem-gato");
const informacoes = document.getElementById("informacoes-detalhes");

// Exibe uma mensagem quando o gato não é encontrado
function mostrarErro(mensagem) {
    nomeGato.textContent = "Gato não encontrado";
    imagemGato.hidden = true;
    informacoes.textContent = mensagem;
}

// Apresenta os dados do gato selecionado
function mostrarGato(gato) {
    document.title = `${gato.nome} | MiauLar`;

    nomeGato.textContent = `Conheça ${gato.nome}`;

    imagemGato.src = gato.imagem;
    imagemGato.alt = `Foto de ${gato.nome}`;
    imagemGato.hidden = false;

    informacoes.replaceChildren();

    const dados = [
        ["Nome", gato.nome],
        ["Idade", gato.idade],
        ["Sexo", gato.sexo],
        ["Raça", gato.raca],
        ["Porte", gato.porte],
        ["Localização", gato.localizacao],
        ["Saúde", gato.saude],
        ["Situação", gato.status]
    ];

    for (const [campo, valor] of dados) {
        const paragrafo = document.createElement("p");
        const titulo = document.createElement("strong");

        titulo.textContent = `${campo}: `;
        paragrafo.append(
            titulo,
            document.createTextNode(valor ?? "Não informado")
        );

        informacoes.appendChild(paragrafo);
    }
}

// Busca os dados diretamente do SQLite por meio da API
async function carregarDetalhes() {
    if (!idGato) {
        mostrarErro("Nenhum gato foi selecionado.");
        return;
    }

    try {
        const resposta = await fetch("/api/gatos");

        if (!resposta.ok) {
            throw new Error("Não foi possível consultar os gatos.");
        }

        const gatos = await resposta.json();

        if (!Array.isArray(gatos)) {
            throw new Error("Resposta inválida do servidor.");
        }

        // Aceita o ID do banco e também os links antigos
        const gato = gatos.find((item) => {
            const nomeImagem = item.imagem
                .split("/")
                .pop()
                .replace(/\.[^.]+$/, "");

            return String(item.id) === idGato ||
                   nomeImagem === idGato;
        });

        if (!gato) {
            mostrarErro(
                "Não foi possível encontrar as informações desse gato."
            );
            return;
        }

        mostrarGato(gato);

    } catch (erro) {
        console.error("Erro ao carregar detalhes:", erro);

        mostrarErro(
            "Não foi possível carregar as informações. Tente novamente."
        );
    }
}

carregarDetalhes();
