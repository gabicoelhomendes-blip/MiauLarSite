
const lista = document.getElementById("lista-solicitacoes");
const mensagem = document.getElementById("mensagem-solicitacoes");

// Converte a data do SQLite para o formato brasileiro
function formatarData(valor) {
    if (!valor) {
        return "Data não informada";
    }

    const data = new Date(
        valor.replace(" ", "T") + "Z"
    );

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

// Cria um cartão para uma solicitação
function criarCardSolicitacao(solicitacao) {
    const card = document.createElement("article");
    card.className = "card-solicitacao";

    const imagem = document.createElement("img");
    imagem.src = solicitacao.imagem_gato;
    imagem.alt = `Foto de ${solicitacao.nome_gato}`;
    imagem.className = "imagem-solicitacao";

    const conteudo = document.createElement("div");
    conteudo.className = "conteudo-solicitacao";

    const topo = document.createElement("div");
    topo.className = "topo-solicitacao";

    const nome = document.createElement("h2");
    nome.textContent = solicitacao.nome_gato;

    const status = document.createElement("span");

    const situacao = solicitacao.status || "Pendente";

    const classesStatus = {
        "Pendente": "pendente",
        "Aprovada": "aprovada",
        "Recusada": "recusada"
    };

    status.className =
        `status-solicitacao ${classesStatus[situacao] || "pendente"}`;

    status.textContent = situacao;

    topo.append(nome, status);

    const data = document.createElement("p");
    data.className = "data-solicitacao";
    data.textContent =
        `Solicitado em ${formatarData(solicitacao.criado_em)}`;

    const tituloQuestionario = document.createElement("strong");
    tituloQuestionario.textContent = "Sua mensagem:";

    const questionario = document.createElement("p");
    questionario.className = "texto-questionario";
    questionario.textContent = solicitacao.questionario;

    const aviso = document.createElement("p");
    aviso.className = "aviso-solicitacao";

    if (situacao === "Pendente") {
        aviso.textContent =
            "Sua solicitação está aguardando análise.";
    } else if (situacao === "Aprovada") {
        aviso.textContent =
            "Sua solicitação foi aprovada!";
    } else {
        aviso.textContent =
            "Sua solicitação não foi aprovada.";
    }

    conteudo.append(
        topo,
        data,
        tituloQuestionario,
        questionario,
        aviso
    );

    card.append(imagem, conteudo);

    return card;
}

// Busca as solicitações do usuário autenticado
async function carregarSolicitacoes() {
    try {
        const resposta = await fetch(
            "/api/minhas-solicitacoes",
            {
                credentials: "same-origin"
            }
        );

        if (resposta.status === 401) {
            mensagem.textContent =
                "Faça login para acompanhar suas solicitações.";

            const link = document.createElement("a");
            link.href = "login.html";
            link.className = "voltar-catalogo";
            link.textContent = "Entrar na minha conta";

            lista.appendChild(link);
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                "Não foi possível carregar suas solicitações."
            );
        }

        if (!Array.isArray(dados)) {
            throw new Error(
                "Resposta inválida do servidor."
            );
        }

        mensagem.textContent = "";
        lista.replaceChildren();

        if (dados.length === 0) {
            mensagem.textContent =
                "Você ainda não realizou nenhuma solicitação de adoção.";
            return;
        }

        for (const solicitacao of dados) {
            lista.appendChild(
                criarCardSolicitacao(solicitacao)
            );
        }

    } catch (erro) {
        mensagem.textContent = erro.message;
        mensagem.className = "erro-solicitacoes";
    }
}

carregarSolicitacoes();
