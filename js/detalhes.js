
const parametros = new URLSearchParams(window.location.search);
const idGato = parametros.get("gato");

const nomeGato = document.getElementById("nome-gato");
const imagemGato = document.getElementById("imagem-gato");
const informacoes = document.getElementById("informacoes-detalhes");

// Mostra uma mensagem quando não é possível carregar o gato
function mostrarErro(mensagem) {
    nomeGato.textContent = "Gato não encontrado";
    imagemGato.hidden = true;
    informacoes.textContent = mensagem;
}

// Cria o formulário para solicitar adoção
function criarFormularioAdocao(gato) {
    const formulario = document.createElement("form");
    formulario.className = "formulario-adocao";

    const titulo = document.createElement("h3");
    titulo.textContent = `Quer adotar ${gato.nome}?`;

    const descricao = document.createElement("p");
    descricao.textContent =
        "Conte um pouco sobre você e por que deseja adotar este gato.";

    const label = document.createElement("label");
    label.htmlFor = "questionario-adocao";
    label.textContent = "Por que você deseja adotar este gato?";

    const campo = document.createElement("textarea");
    campo.id = "questionario-adocao";
    campo.name = "questionario";
    campo.placeholder =
        "Fale sobre sua rotina, sua experiência com animais e o lar que pretende oferecer.";
    campo.minLength = 30;
    campo.maxLength = 2000;
    campo.rows = 5;
    campo.required = true;

    const ajuda = document.createElement("small");
    ajuda.textContent = "Mínimo de 30 caracteres.";

    const botao = document.createElement("button");
    botao.type = "submit";
    botao.className = "botao";
    botao.textContent = "Enviar solicitação de adoção";

    const mensagem = document.createElement("p");
    mensagem.className = "mensagem-adocao";
    mensagem.setAttribute("role", "status");
    mensagem.setAttribute("aria-live", "polite");

    formulario.append(
        titulo,
        descricao,
        label,
        campo,
        ajuda,
        botao,
        mensagem
    );

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const questionario = campo.value.trim();

        if (questionario.length < 30) {
            mensagem.textContent =
                "Escreva pelo menos 30 caracteres.";
            mensagem.style.color = "#b91c1c";
            return;
        }

        botao.disabled = true;
        botao.textContent = "Enviando...";
        mensagem.textContent = "";

        try {
            const resposta = await fetch("/api/solicitacoes", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    gato_id: Number(gato.id),
                    questionario: questionario
                })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.erro ||
                    "Não foi possível enviar sua solicitação."
                );
            }

            mensagem.textContent =
                "Solicitação enviada com sucesso! Aguarde a análise.";
            mensagem.style.color = "#15803d";

            campo.disabled = true;
            botao.textContent = "Solicitação enviada";

        } catch (erro) {
            mensagem.textContent = erro.message;
            mensagem.style.color = "#b91c1c";

            botao.disabled = false;
            botao.textContent = "Enviar solicitação de adoção";
        }
    });

    return formulario;
}

// Verifica se o usuário pode solicitar adoção
async function mostrarOpcaoAdocao(gato) {
    if (gato.status !== "Disponível") {
        return;
    }

    const area = document.createElement("section");
    area.className = "area-adocao";

    try {
        const resposta = await fetch("/api/sessao", {
            credentials: "same-origin"
        });

        if (resposta.status === 401) {
            const aviso = document.createElement("p");
            aviso.textContent =
                "Faça login como adotante para solicitar a adoção.";

            const link = document.createElement("a");
            link.href = "login.html";
            link.className = "botao";
            link.textContent = "Entrar para adotar";

            area.append(aviso, link);
            informacoes.appendChild(area);
            return;
        }

        if (!resposta.ok) {
            throw new Error("Não foi possível verificar sua sessão.");
        }

        const dados = await resposta.json();

        if (dados.usuario?.perfil !== "adotante") {
            return;
        }

        area.appendChild(criarFormularioAdocao(gato));
        informacoes.appendChild(area);

    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);

        const aviso = document.createElement("p");
        aviso.textContent =
            "Não foi possível carregar a opção de adoção.";

        area.appendChild(aviso);
        informacoes.appendChild(area);
    }
}

// Mostra os detalhes do gato
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

    mostrarOpcaoAdocao(gato);
}

// Busca os dados dos gatos pela API
async function carregarDetalhes() {
    if (!idGato) {
        mostrarErro("Nenhum gato foi selecionado.");
        return;
    }

    try {
        const resposta = await fetch("/api/gatos");

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível consultar os gatos."
            );
        }

        const gatos = await resposta.json();

        if (!Array.isArray(gatos)) {
            throw new Error("Resposta inválida do servidor.");
        }

        // Aceita o ID do banco e os links antigos
        const gato = gatos.find((item) => {
            const nomeImagem = String(item.imagem || "")
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
