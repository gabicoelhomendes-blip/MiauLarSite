
const lista = document.getElementById("lista-analise");
const mensagem = document.getElementById("mensagem-analise");


// Guarda as solicitações e o filtro selecionado
let todasSolicitacoes = [];
let filtroAtual = "Todas";

const botoesFiltro = document.querySelectorAll(".filtro-analise");



function aplicarFiltro() {
    const total = todasSolicitacoes.length;

    const pendentes = todasSolicitacoes.filter(
        pedido => pedido.status === "Pendente"
    ).length;

    const aprovadas = todasSolicitacoes.filter(
        pedido => pedido.status === "Aprovada"
    ).length;

    const atualizarNumero = (id, valor) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    };

    atualizarNumero("total-solicitacoes", total);
    atualizarNumero("total-pendentes", pendentes);
    atualizarNumero("total-aprovadas", aprovadas);

    const filtradas = todasSolicitacoes.filter(
        pedido =>
            filtroAtual === "Todas" ||
            pedido.status === filtroAtual
    );

    lista.replaceChildren();

    if (filtradas.length === 0) {
        const vazio = document.createElement("div");
        vazio.className = "analise-vazia";

        const titulo = document.createElement("h2");
        titulo.textContent = total === 0
            ? "Nenhum pedido recebido"
            : "Nenhum pedido neste filtro";

        const descricao = document.createElement("p");
        descricao.textContent = total === 0
            ? "Não há solicitações vinculadas a esta conta."
            : "Selecione outro filtro para consultar os pedidos.";

        vazio.append(titulo, descricao);
        lista.appendChild(vazio);
    } else {
        filtradas.forEach(pedido => {
            lista.appendChild(criarCard(pedido));
        });
    }

    mensagem.textContent = "";
}

// Configura os botões de filtro
for (const botao of botoesFiltro) {
    botao.addEventListener("click", () => {
        filtroAtual = botao.dataset.situacao;

        for (const item of botoesFiltro) {
            const ativo = item === botao;
            item.classList.toggle("ativo", ativo);
            item.setAttribute("aria-pressed", String(ativo));
        }

        aplicarFiltro();
    });

    botao.setAttribute(
        "aria-pressed",
        String(botao.dataset.situacao === filtroAtual)
    );
}

// Formata a data da solicitação
function formatarData(valor) {
    if (!valor) return "Data não informada";

    const data = new Date(valor.replace(" ", "T") + "Z");

    if (Number.isNaN(data.getTime())) {
        return valor;
    }

    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Sao_Paulo"
    });
}

// Envia a decisão ao servidor
async function analisarSolicitacao(solicitacao, decisao) {
    const verbo = decisao === "Aprovada" ? "aprovar" : "recusar";

    const aviso = decisao === "Aprovada"
        ? "Ao aprovar, o gato será marcado como Adotado e os outros pedidos pendentes serão recusados."
        : "Esta solicitação será recusada.";

    const confirmado = confirm(
        `Deseja ${verbo} a solicitação de ${solicitacao.nome_adotante} ` +
        `para ${solicitacao.nome_gato}?\n\n${aviso}`
    );

    if (!confirmado) return;

    mensagem.textContent = "Salvando decisão...";
    mensagem.style.color = "#555";

    try {
        const resposta = await fetch(
            `/api/solicitacoes/${solicitacao.id}`,
            {
                method: "PATCH",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: decisao })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível analisar a solicitação."
            );
        }

        await carregarSolicitacoes();

        mensagem.textContent = dados.mensagem;
        mensagem.style.color = "#15803d";

    } catch (erro) {
        mensagem.textContent = erro.message;
        mensagem.style.color = "#b91c1c";
    }
}

// Monta um cartão de solicitação
function criarCard(solicitacao) {
    const card = document.createElement("article");
    card.className = "card-analise";

    const imagem = document.createElement("img");
    imagem.src = solicitacao.imagem_gato;
    imagem.alt = `Foto de ${solicitacao.nome_gato}`;
    imagem.className = "imagem-analise";

    const conteudo = document.createElement("div");
    conteudo.className = "conteudo-analise";

    const cabecalho = document.createElement("div");
    cabecalho.className = "topo-analise";

    const nomeGato = document.createElement("h2");
    nomeGato.textContent = solicitacao.nome_gato;

    const situacao = document.createElement("span");
    situacao.className = "situacao-analise " +
        solicitacao.status.toLowerCase();
    situacao.textContent = solicitacao.status;

    cabecalho.append(nomeGato, situacao);

    const adotante = document.createElement("p");
    adotante.textContent =
        `Solicitado por: ${solicitacao.nome_adotante}`;

    const data = document.createElement("p");
    data.className = "data-analise";
    data.textContent =
        `Data do pedido: ${formatarData(solicitacao.criado_em)}`;

    const tituloMensagem = document.createElement("strong");
    tituloMensagem.textContent = "Mensagem do adotante:";

    const questionario = document.createElement("p");
    questionario.className = "questionario-analise";
    questionario.textContent = solicitacao.questionario;

    conteudo.append(
        cabecalho,
        adotante,
        data,
        tituloMensagem,
        questionario
    );

    if (solicitacao.status === "Pendente") {
        const acoes = document.createElement("div");
        acoes.className = "acoes-analise";

        const aprovar = document.createElement("button");
        aprovar.type = "button";
        aprovar.className = "botao-aprovar";
        aprovar.textContent = "Aprovar";

        const recusar = document.createElement("button");
        recusar.type = "button";
        recusar.className = "botao-recusar";
        recusar.textContent = "Recusar";

        aprovar.addEventListener("click", () => {
            analisarSolicitacao(solicitacao, "Aprovada");
        });

        recusar.addEventListener("click", () => {
            analisarSolicitacao(solicitacao, "Recusada");
        });

        acoes.append(aprovar, recusar);
        conteudo.appendChild(acoes);
    }

    card.append(imagem, conteudo);
    return card;
}

// Carrega os pedidos que o usuário pode analisar
async function carregarSolicitacoes() {
    const resposta = await fetch(
        "/api/solicitacoes/recebidas",
        { credentials: "same-origin" }
    );

    if (!resposta.ok) {
        if (resposta.status === 401) {
            throw new Error("Faça login para acessar as solicitações.");
        }

        if (resposta.status === 403) {
            throw new Error(
                "Somente responsáveis e administradores podem analisar solicitações."
            );
        }

        throw new Error("Não foi possível carregar as solicitações.");
    }

    const dados = await resposta.json();

    if (!Array.isArray(dados)) {
        throw new Error("Resposta inválida do servidor.");
    }

    todasSolicitacoes = dados;
    aplicarFiltro();
}

// Inicia a página
carregarSolicitacoes().catch((erro) => {
    mensagem.textContent = erro.message;
    mensagem.style.color = "#b91c1c";
});
