
const campoPesquisa = document.getElementById("campo-pesquisa");
const filtroSexo = document.getElementById("filtro-sexo");
const filtroPorte = document.getElementById("filtro-porte");
const cardsGatos = document.querySelectorAll(".card-gato");
const resultadoPesquisa = document.getElementById("resultado-pesquisa");

// Padroniza os textos para facilitar a comparação
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Encontra uma informação dentro do card
function obterInformacao(card, campo) {
    const informacoes = card.querySelectorAll(".informacoes-gato p");

    const informacao = Array.from(informacoes).find((p) =>
        p.textContent.trim().startsWith(campo + ":")
    );

    if (!informacao) {
        return "";
    }

    return normalizarTexto(
        informacao.textContent.split(":").slice(1).join(":")
    );
}

// Filtra os gatos conforme as opções escolhidas
function pesquisarGatos() {
    const pesquisa = normalizarTexto(campoPesquisa.value);
    const sexoSelecionado = filtroSexo.value;
    const porteSelecionado = filtroPorte.value;

    let quantidade = 0;

    cardsGatos.forEach((card) => {
        const nome = normalizarTexto(
            card.querySelector("h3").textContent
        );

        const sexo = obterInformacao(card, "Sexo");
        const porte = obterInformacao(card, "Porte");

        const correspondeNome = nome.includes(pesquisa);
        const correspondeSexo =
            sexoSelecionado === "" || sexo === sexoSelecionado;
        const correspondePorte =
            porteSelecionado === "" || porte === porteSelecionado;

        const mostrar =
            correspondeNome && correspondeSexo && correspondePorte;

        card.hidden = !mostrar;
        card.style.display = mostrar ? "" : "none";

        if (mostrar) {
            quantidade++;
        }
    });

    if (
        pesquisa === "" &&
        sexoSelecionado === "" &&
        porteSelecionado === ""
    ) {
        resultadoPesquisa.textContent = "";
    } else if (quantidade === 0) {
        resultadoPesquisa.textContent = "Nenhum gato encontrado.";
    } else {
        resultadoPesquisa.textContent =
            `${quantidade} gato(s) encontrado(s).`;
    }
}

// Atualiza a lista quando os campos são alterados
campoPesquisa.addEventListener("input", pesquisarGatos);
filtroSexo.addEventListener("change", pesquisarGatos);
filtroPorte.addEventListener("change", pesquisarGatos);
