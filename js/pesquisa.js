
const campoPesquisa = document.getElementById("campo-pesquisa");
const filtroSexo = document.getElementById("filtro-sexo");
const filtroPorte = document.getElementById("filtro-porte");
const resultadoPesquisa = document.getElementById("resultado-pesquisa");
const botaoLimpar = document.getElementById("limpar-filtros");

// Padroniza textos para comparar sem diferenças de acentos
function normalizarTexto(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Obtém uma informação do cartão
function obterInformacao(card, campo) {
    const informacoes = card.querySelectorAll(".informacoes-gato p");

    for (const paragrafo of informacoes) {
        const texto = paragrafo.textContent.trim();
        const separador = texto.indexOf(":");

        if (separador === -1) {
            continue;
        }

        const nomeCampo = texto.slice(0, separador).trim();

        if (normalizarTexto(nomeCampo) === normalizarTexto(campo)) {
            return texto.slice(separador + 1).trim();
        }
    }

    return "";
}

// Cria um filtro adicional
function criarFiltro(id, titulo) {
    const grupo = document.createElement("div");
    grupo.className = "grupo-filtro-extra";

    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = titulo;

    const select = document.createElement("select");
    select.id = id;
    select.className = "filtro-extra";

    const opcao = document.createElement("option");
    opcao.value = "";
    opcao.textContent = `Todas as opções`;

    select.appendChild(opcao);
    grupo.append(label, select);

    return { grupo, select };
}

// Adiciona os filtros de idade e raça
const filtroIdadeCriado = criarFiltro("filtro-idade", "Idade");
const filtroRacaCriado = criarFiltro("filtro-raca", "Raça");

const filtroIdade = filtroIdadeCriado.select;
const filtroRaca = filtroRacaCriado.select;

// Insere os novos filtros ao lado dos existentes

const grupoPorte = filtroPorte.closest(".filtro-porte");

grupoPorte.insertAdjacentElement(
    "afterend",
    filtroIdadeCriado.grupo
);

filtroIdadeCriado.grupo.insertAdjacentElement(
    "afterend",
    filtroRacaCriado.grupo
);


// Atualiza as opções de acordo com os gatos cadastrados
function atualizarOpcoes(select, valores) {
    const valorAnterior = select.value;

    const opcoes = [...new Set(valores.filter(Boolean))]
        .sort((a, b) =>
            a.localeCompare(b, "pt-BR", { numeric: true })
        );

    select.replaceChildren();

    const primeiraOpcao = document.createElement("option");
    primeiraOpcao.value = "";
    primeiraOpcao.textContent =
        select === filtroIdade ? "Todas as idades" : "Todas as raças";

    select.appendChild(primeiraOpcao);

    for (const valor of opcoes) {
        const opcao = document.createElement("option");
        opcao.value = valor;
        opcao.textContent = valor;
        select.appendChild(opcao);
    }

    // Mantém a seleção se ainda existir no catálogo
    if (opcoes.includes(valorAnterior)) {
        select.value = valorAnterior;
    }
}

// Atualiza os filtros usando os cartões carregados
function atualizarFiltros() {
    const cards = document.querySelectorAll("#lista-gatos .card-gato");

    const idades = [];
    const racas = [];

    for (const card of cards) {
        idades.push(obterInformacao(card, "Idade"));
        racas.push(obterInformacao(card, "Raça"));
    }

    atualizarOpcoes(filtroIdade, idades);
    atualizarOpcoes(filtroRaca, racas);
}

// Pesquisa e filtra os gatos
function pesquisarGatos() {
    atualizarFiltros();

    const cards = document.querySelectorAll("#lista-gatos .card-gato");

    const pesquisa = normalizarTexto(campoPesquisa.value);
    const sexoSelecionado = normalizarTexto(filtroSexo.value);
    const porteSelecionado = normalizarTexto(filtroPorte.value);
    const idadeSelecionada = normalizarTexto(filtroIdade.value);
    const racaSelecionada = normalizarTexto(filtroRaca.value);

    let quantidade = 0;

    for (const card of cards) {
        const nome = normalizarTexto(
            card.querySelector("h3")?.textContent
        );

        const localizacao = normalizarTexto(
            obterInformacao(card, "Localização")
        );

        const sexo = normalizarTexto(
            obterInformacao(card, "Sexo")
        );

        const porte = normalizarTexto(
            obterInformacao(card, "Porte")
        );

        const idade = normalizarTexto(
            obterInformacao(card, "Idade")
        );

        const raca = normalizarTexto(
            obterInformacao(card, "Raça")
        );

        // Pesquisa pelo nome ou pela localização
        const correspondePesquisa =
            nome.includes(pesquisa) ||
            localizacao.includes(pesquisa);

        const correspondeSexo =
            !sexoSelecionado || sexo === sexoSelecionado;

        const correspondePorte =
            !porteSelecionado || porte === porteSelecionado;

        const correspondeIdade =
            !idadeSelecionada || idade === idadeSelecionada;

        const correspondeRaca =
            !racaSelecionada || raca === racaSelecionada;

        const mostrar =
            correspondePesquisa &&
            correspondeSexo &&
            correspondePorte &&
            correspondeIdade &&
            correspondeRaca;

        card.hidden = !mostrar;
        card.style.display = mostrar ? "" : "none";

        if (mostrar) {
            quantidade++;
        }
    }

    const filtrosAtivos = [
        pesquisa,
        sexoSelecionado,
        porteSelecionado,
        idadeSelecionada,
        racaSelecionada
    ].some(Boolean);

    if (!filtrosAtivos) {
        resultadoPesquisa.textContent = "";
    } else if (quantidade === 0) {
        resultadoPesquisa.textContent = "Nenhum gato encontrado.";
    } else {
        resultadoPesquisa.textContent =
            `${quantidade} gato(s) encontrado(s).`;
    }
}

// Eventos de pesquisa e filtros
campoPesquisa.addEventListener("input", pesquisarGatos);
filtroSexo.addEventListener("change", pesquisarGatos);
filtroPorte.addEventListener("change", pesquisarGatos);
filtroIdade.addEventListener("change", pesquisarGatos);
filtroRaca.addEventListener("change", pesquisarGatos);

// Limpa todos os filtros
botaoLimpar.addEventListener("click", () => {
    campoPesquisa.value = "";
    filtroSexo.value = "";
    filtroPorte.value = "";
    filtroIdade.value = "";
    filtroRaca.value = "";

    pesquisarGatos();
});

// Executa ao carregar a página
pesquisarGatos();
