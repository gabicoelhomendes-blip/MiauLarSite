
const campoPesquisa = document.getElementById("campo-pesquisa");
const cardsGatos = document.querySelectorAll(".card-gato");
const resultadoPesquisa = document.getElementById("resultado-pesquisa");

function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function pesquisarGatos() {
    const pesquisa = normalizarTexto(campoPesquisa.value);
    let quantidade = 0;

    cardsGatos.forEach((card) => {
        const nome = card.querySelector("h3").textContent;
        const encontrado = normalizarTexto(nome).includes(pesquisa);

        card.hidden = !encontrado;
        card.style.display = encontrado ? "" : "none";

        if (encontrado) {
            quantidade++;
        }
    });

    if (pesquisa === "") {
        resultadoPesquisa.textContent = "";
    } else if (quantidade === 0) {
        resultadoPesquisa.textContent = "Nenhum gato encontrado.";
    } else {
        resultadoPesquisa.textContent =
            `${quantidade} gato(s) encontrado(s).`;
    }
}

campoPesquisa.addEventListener("input", pesquisarGatos);
