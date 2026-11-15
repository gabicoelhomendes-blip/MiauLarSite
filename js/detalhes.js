
// Dados demonstrativos dos gatos
const gatos = {
    mel: {
        nome: "Mel",
        idade: "2 anos",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        status: "Disponível",
        imagem: "cats/mel.jpg"
    },

    luna: {
        nome: "Luna",
        idade: "1 ano",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        status: "Disponível",
        imagem: "cats/luna.jpg"
    }
};

// Identifica qual gato foi selecionado
const parametros = new URLSearchParams(window.location.search);
const idGato = parametros.get("gato");
const gato = gatos[idGato];

const nomeGato = document.getElementById("nome-gato");
const imagemGato = document.getElementById("imagem-gato");
const informacoes = document.getElementById("informacoes-detalhes");

// Exibe as informações do gato escolhido
if (gato) {
    document.title = `${gato.nome} | MiauLarr`;

    nomeGato.textContent = `Conheça a ${gato.nome}`;
    imagemGato.src = gato.imagem;
    imagemGato.alt = `Foto da gata ${gato.nome}`;

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

    dados.forEach(([campo, valor]) => {
        const paragrafo = document.createElement("p");
        const titulo = document.createElement("strong");

        titulo.textContent = `${campo}: `;
        paragrafo.append(titulo, document.createTextNode(valor));

        informacoes.appendChild(paragrafo);
    });
} else {
    nomeGato.textContent = "Gato não encontrado";
    imagemGato.hidden = true;
    informacoes.textContent =
        "Não foi possível encontrar as informações desse gato.";
}
