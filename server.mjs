
import http from "node:http";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import banco from "./database.mjs";
import { randomBytes, createHash } from "node:crypto";

// Configurações do MiauLar
const porta = 3000;

 // Guarda as sessões dos usuários no SQLite
banco.exec(`
    CREATE TABLE IF NOT EXISTS sessoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expira_em INTEGER NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
`);

const pastaProjeto = path.dirname(fileURLToPath(import.meta.url));

// Tipos de arquivos do site
const tipos = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml"
};

// Envia respostas em JSON
function responder(res, codigo, dados) {
    res.writeHead(codigo, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });

    res.end(JSON.stringify(dados));
}

// Recebe dados JSON enviados ao servidor
async function receberDados(req) {
    let conteudo = "";

    for await (const parte of req) {
        conteudo += parte.toString("utf8");

        if (Buffer.byteLength(conteudo, "utf8") > 16000) {
            const erro = new Error("Dados muito grandes.");
            erro.status = 413;
            throw erro;
        }
    }

    try {
        return JSON.parse(conteudo);
    } catch {
        const erro = new Error("JSON inválido.");
        erro.status = 400;
        throw erro;
    }
}
// Recebe os dados e a imagem de um gato
async function receberDadosGato(req) {
    const partes = [];
    let tamanho = 0;
    const limite = 1500000;

    for await (const parte of req) {
        tamanho += parte.length;

        if (tamanho > limite) {
            const erro = new Error("Arquivo muito grande.");
            erro.status = 413;
            throw erro;
        }

        partes.push(parte);
    }

    try {
        const conteudo = Buffer.concat(partes).toString("utf8");
        return JSON.parse(conteudo);
    } catch {
        const erro = new Error("Dados de cadastro inválidos.");
        erro.status = 400;
        throw erro;
    }
}

// Realiza o cadastro de usuários
async function cadastrarUsuario(req, res) {
    try {
        const dados = await receberDados(req);

        if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
            responder(res, 400, {
                erro: "Dados de cadastro inválidos."
            });
            return;
        }

        const nome = typeof dados.nome === "string"
            ? dados.nome.trim()
            : "";

        const email = typeof dados.email === "string"
            ? dados.email.trim().toLowerCase()
            : "";

        const telefone = typeof dados.telefone === "string"
            ? dados.telefone.trim()
            : "";

        const senha = dados.senha;
        const perfil = dados.perfil;

        // Valida os campos
        if (
            nome.length < 3 ||
            nome.length > 120 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            email.length > 254 ||
            telefone.length < 8 ||
            telefone.length > 30 ||
            typeof senha !== "string" ||
            senha.length < 8 ||
            Buffer.byteLength(senha, "utf8") > 72 ||
            !["adotante", "responsavel"].includes(perfil)
        ) {
            responder(res, 400, {
                erro: "Confira os dados do cadastro."
            });
            return;
        }

        // Verifica se o e-mail já existe
        const existente = banco.prepare(
            "SELECT id FROM usuarios WHERE email = ?"
        ).get(email);

        if (existente) {
            responder(res, 409, {
                erro: "Este e-mail já está cadastrado."
            });
            return;
        }

        // Protege a senha com BCrypt
        const senhaHash = await bcrypt.hash(senha, 12);

        // Define o perfil do usuário
        const quantidade = banco.prepare(
            "SELECT COUNT(*) AS total FROM usuarios"
        ).get();

        const perfilFinal = quantidade.total === 0
            ? "administrador"
            : perfil;

        // Salva no banco SQLite
        const resultado = banco.prepare(`
            INSERT INTO usuarios
            (nome, email, telefone, senha_hash, perfil)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            nome,
            email,
            telefone,
            senhaHash,
            perfilFinal
        );

        responder(res, 201, {
            mensagem: "Usuário cadastrado com sucesso.",
            usuario: {
                id: Number(resultado.lastInsertRowid),
                nome: nome,
                perfil: perfilFinal
            }
        });

    } catch (erro) {
        if (erro.status === 400 || erro.status === 413) {
            responder(res, erro.status, {
                erro: erro.message
            });
            return;
        }

        if (
            typeof erro.message === "string" &&
            erro.message.includes("UNIQUE constraint failed")
        ) {
            responder(res, 409, {
                erro: "Este e-mail já está cadastrado."
            });
            return;
        }

        console.error("Erro no cadastro:", erro.message);

        responder(res, 500, {
            erro: "Não foi possível realizar o cadastro."
        });
    }
}

// Entrega as páginas e os arquivos públicos
async function entregarArquivo(req, res, url) {
    try {
        const rota = decodeURIComponent(url.pathname);
        const arquivo = rota === "/" ? "/index.html" : rota;

        const caminho = path.resolve(pastaProjeto, "." + arquivo);
        const relativo = path.relative(pastaProjeto, caminho);

        const paginasPermitidas = [
            "index.html",
            "cadastro.html",
            "detalhes.html",
            "login.html",
            "cadastrar-gato.html",
            "gerenciar-gatos.html",
            "editar-gato.html",
            "minhas-solicitacoes.html",
            "analisar-solicitacoes.html",
            "gerenciar-usuarios.html",
            "alterar-senha.html"

        ];

        const pastaPermitida =
            relativo.startsWith("cats" + path.sep) ||
            relativo.startsWith("css" + path.sep) ||
            relativo.startsWith("js" + path.sep);

        const paginaPermitida = paginasPermitidas.includes(relativo);

        const extensao = path.extname(caminho).toLowerCase();

        if (
            relativo.startsWith("..") ||
            path.isAbsolute(relativo) ||
            (!pastaPermitida && !paginaPermitida) ||
            !tipos[extensao]
        ) {
            res.writeHead(404);
            res.end("Página não encontrada");
            return;
        }

        const conteudo = await readFile(caminho);

        res.writeHead(200, {
            "Content-Type": tipos[extensao] + "; charset=utf-8",
            "X-Content-Type-Options": "nosniff"
        });

        if (req.method === "HEAD") {
            res.end();
        } else {
            res.end(conteudo);
        }

    } catch {
        res.writeHead(404);
        res.end("Página não encontrada");
    }
}

 // Controle básico de tentativas de login
const tentativasLogin = new Map();

async function realizarLogin(req, res) {
    const ip = req.socket.remoteAddress || "desconhecido";
    const agora = Date.now();
    const janela = 15 * 60 * 1000;

    const controle = tentativasLogin.get(ip);

    if (controle && agora < controle.inicio + janela) {
        if (controle.quantidade >= 15) {
            responder(res, 429, {
                erro: "Muitas tentativas. Tente novamente mais tarde."
            });
            return;
        }

        controle.quantidade++;
    } else {
        tentativasLogin.set(ip, {
            inicio: agora,
            quantidade: 1
        });
    }

    try {
        const dados = await receberDados(req);

        if (
            !dados ||
            typeof dados.email !== "string" ||
            typeof dados.senha !== "string"
        ) {
            responder(res, 400, {
                erro: "Informe seu e-mail e sua senha."
            });
            return;
        }

        const email = dados.email.trim().toLowerCase();
        const senha = dados.senha;

        if (
            !email ||
            email.length > 254 ||
            !senha ||
            Buffer.byteLength(senha, "utf8") > 72
        ) {
            responder(res, 400, {
                erro: "Dados de login inválidos."
            });
            return;
        }

        // Procura o usuário cadastrado
        const usuario = banco.prepare(`
            SELECT id, nome, email, senha_hash, perfil
            FROM usuarios
            WHERE email = ?
        `).get(email);

        // Confere a senha protegida com BCrypt
        const senhaCorreta = usuario
            ? await bcrypt.compare(senha, usuario.senha_hash)
            : false;

        if (!usuario || !senhaCorreta) {
            responder(res, 401, {
                erro: "E-mail ou senha incorretos."
            });
            return;
        }

        // Cria uma sessão com validade de 8 horas
        const token = randomBytes(32).toString("hex");

        const tokenHash = createHash("sha256")
            .update(token)
            .digest("hex");

        const validade = Date.now() + 8 * 60 * 60 * 1000;

        banco.prepare(`
            INSERT INTO sessoes (usuario_id, token_hash, expira_em)
            VALUES (?, ?, ?)
        `).run(usuario.id, tokenHash, validade);

        const cookieSeguro =
            process.env.NODE_ENV === "production" ? "; Secure" : "";

        res.setHeader(
            "Set-Cookie",
            `miaular_sessao=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${cookieSeguro}`
        );

        responder(res, 200, {
            mensagem: "Login realizado com sucesso.",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                perfil: usuario.perfil
            }
        });

    } catch (erro) {
        if (erro.status === 400 || erro.status === 413) {
            responder(res, erro.status, {
                erro: erro.message
            });
            return;
        }

        console.error("Erro no login:", erro.message);

        responder(res, 500, {
            erro: "Não foi possível realizar o login."
        });
    }
}

 // Verifica se o usuário possui uma sessão válida
function verificarSessao(req, res) {
    try {
        // Obtém os cookies enviados pelo navegador
        const cookies = req.headers.cookie || "";

        const cookieSessao = cookies
            .split(";")
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith("miaular_sessao="));

        if (!cookieSessao) {
            responder(res, 401, {
                autenticado: false,
                erro: "Usuário não autenticado."
            });
            return;
        }

        const token = cookieSessao.slice("miaular_sessao=".length);

        // Verifica se o token tem o formato esperado
        if (!/^[a-f0-9]{64}$/.test(token)) {
            responder(res, 401, {
                autenticado: false,
                erro: "Sessão inválida."
            });
            return;
        }

        // Calcula o hash do token
        const tokenHash = createHash("sha256")
            .update(token)
            .digest("hex");

        // Procura uma sessão válida no SQLite
        const sessao = banco.prepare(`
            SELECT
                usuarios.id,
                usuarios.nome,
                usuarios.email,
                usuarios.perfil
            FROM sessoes
            INNER JOIN usuarios
                ON usuarios.id = sessoes.usuario_id
            WHERE sessoes.token_hash = ?
              AND sessoes.expira_em > ?
        `).get(tokenHash, Date.now());

        if (!sessao) {
            responder(res, 401, {
                autenticado: false,
                erro: "Sessão expirada ou inválida."
            });
            return;
        }

        // Retorna apenas os dados públicos necessários
        responder(res, 200, {
            autenticado: true,
            usuario: {
                id: sessao.id,
                nome: sessao.nome,
                email: sessao.email,
                perfil: sessao.perfil
            }
        });

    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro.message);

        responder(res, 500, {
            erro: "Não foi possível verificar a sessão."
        });
    }
}


 // Encerra a sessão do usuário
function realizarLogout(req, res) {
    try {
        const cookies = req.headers.cookie || "";

        const cookieSessao = cookies
            .split(";")
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith("miaular_sessao="));

        if (cookieSessao) {
            const token = cookieSessao.slice(
                "miaular_sessao=".length
            );

            if (/^[a-f0-9]{64}$/.test(token)) {
                const tokenHash = createHash("sha256")
                    .update(token)
                    .digest("hex");

                banco.prepare(`
                    DELETE FROM sessoes
                    WHERE token_hash = ?
                `).run(tokenHash);
            }
        }

        // Apaga o cookie do navegador
        const seguro = process.env.NODE_ENV === "production"
            ? "; Secure"
            : "";

        res.setHeader(
            "Set-Cookie",
            `miaular_sessao=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${seguro}`
        );

        responder(res, 200, {
            mensagem: "Sessão encerrada com sucesso."
        });

    } catch (erro) {
        console.error("Erro no logout:", erro.message);

        responder(res, 500, {
            erro: "Não foi possível encerrar a sessão."
        });
    }
}


 // Identifica o usuário pela sessão
function obterUsuarioAutenticado(req) {
    const cookies = req.headers.cookie || "";

    const cookieSessao = cookies
        .split(";")
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith("miaular_sessao="));

    if (!cookieSessao) {
        return null;
    }

    const token = cookieSessao.slice("miaular_sessao=".length);

    if (!/^[a-f0-9]{64}$/.test(token)) {
        return null;
    }

    const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

    const usuario = banco.prepare(`
        SELECT
            usuarios.id,
            usuarios.nome,
            usuarios.email,
            usuarios.perfil
        FROM sessoes
        INNER JOIN usuarios
            ON usuarios.id = sessoes.usuario_id
        WHERE sessoes.token_hash = ?
          AND sessoes.expira_em > ?
    `).get(tokenHash, Date.now());

    return usuario || null;
}

// Confere a autenticação e o perfil permitido
function exigirPerfil(req, res, perfisPermitidos) {
    const usuario = obterUsuarioAutenticado(req);

    if (!usuario) {
        responder(res, 401, {
            erro: "Faça login para continuar."
        });
        return null;
    }

    if (!perfisPermitidos.includes(usuario.perfil)) {
        responder(res, 403, {
            erro: "Você não tem permissão para esta ação."
        });
        return null;
    }

    return usuario;
}

 // Cadastra um gato e salva sua fotografia
async function cadastrarGato(req, res, usuario) {
    let caminhoImagem = null;

    try {
        if (!req.headers["content-type"]?.startsWith("application/json")) {
            responder(res, 415, {
                erro: "Formato de envio inválido."
            });
            return;
        }

        const dados = await receberDadosGato(req);

        const campos = [
            "nome", "idade", "sexo", "raca",
            "porte", "localizacao", "saude"
        ];

        for (const campo of campos) {
            if (
                typeof dados[campo] !== "string" ||
                !dados[campo].trim()
            ) {
                responder(res, 400, {
                    erro: `Preencha corretamente o campo ${campo}.`
                });
                return;
            }
        }

        const limites = {
            nome: 100,
            idade: 30,
            raca: 100,
            localizacao: 120,
            saude: 1000
        };

        for (const [campo, limite] of Object.entries(limites)) {
            if (dados[campo].trim().length > limite) {
                responder(res, 400, {
                    erro: `O campo ${campo} ultrapassa o limite permitido.`
                });
                return;
            }
        }

        if (
            !["Macho", "Fêmea"].includes(dados.sexo) ||
            !["Pequeno", "Médio", "Grande"].includes(dados.porte)
        ) {
            responder(res, 400, {
                erro: "Sexo ou porte inválido."
            });
            return;
        }

        const total = banco.prepare(`
            SELECT COUNT(*) AS total FROM gatos
        `).get().total;

        if (total >= 20) {
            responder(res, 409, {
                erro: "O limite de 20 gatos foi atingido."
            });
            return;
        }

        // A fotografia é enviada em Base64 pelo formulário
        if (typeof dados.imagem !== "string") {
            responder(res, 400, {
                erro: "Selecione uma fotografia."
            });
            return;
        }

        const resultadoImagem = dados.imagem.match(
            /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/
        );

        if (!resultadoImagem) {
            responder(res, 400, {
                erro: "Envie uma imagem JPG, PNG ou WebP válida."
            });
            return;
        }

        const tipo = resultadoImagem[1];
        const base64 = resultadoImagem[2];
        const imagem = Buffer.from(base64, "base64");

        if (imagem.length === 0 || imagem.length > 1024 * 1024) {
            responder(res, 413, {
                erro: "A fotografia deve ter no máximo 1 MB."
            });
            return;
        }

        // Confere a assinatura real do arquivo
        const jpeg =
            imagem.length >= 3 &&
            imagem[0] === 0xff &&
            imagem[1] === 0xd8 &&
            imagem[2] === 0xff;

        const png =
            imagem.length >= 8 &&
            imagem.subarray(0, 8).equals(
                Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
            );

        const webp =
            imagem.length >= 12 &&
            imagem.toString("ascii", 0, 4) === "RIFF" &&
            imagem.toString("ascii", 8, 12) === "WEBP";

        const formatoValido =
            (tipo === "jpeg" && jpeg) ||
            (tipo === "png" && png) ||
            (tipo === "webp" && webp);

        if (!formatoValido) {
            responder(res, 400, {
                erro: "O conteúdo da fotografia é inválido."
            });
            return;
        }

        const extensao = tipo === "jpeg" ? "jpg" : tipo;
        const nomeImagem = `${randomBytes(16).toString("hex")}.${extensao}`;

        const pastaImagens = path.join(
            pastaProjeto, "cats", "uploads"
        );

        await mkdir(pastaImagens, { recursive: true });

        caminhoImagem = path.join(pastaImagens, nomeImagem);
        await writeFile(caminhoImagem, imagem, { flag: "wx" });

        const imagemBanco = `cats/uploads/${nomeImagem}`;

        const resultado = banco.prepare(`
            INSERT INTO gatos (
                nome, idade, sexo, raca, porte,
                localizacao, saude, imagem,
                status, responsavel_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            dados.nome.trim(),
            dados.idade.trim(),
            dados.sexo,
            dados.raca.trim(),
            dados.porte,
            dados.localizacao.trim(),
            dados.saude.trim(),
            imagemBanco,
            "Disponível",
            usuario.id
        );

        responder(res, 201, {
            mensagem: "Gato cadastrado com sucesso!",
            id: Number(resultado.lastInsertRowid)
        });

    } catch (erro) {
        // Remove a fotografia se o cadastro falhar
        if (caminhoImagem) {
            await unlink(caminhoImagem).catch(() => {});
        }

        console.error("Erro ao cadastrar gato:", erro.message);

        if (erro.status === 400 || erro.status === 413) {
            responder(res, erro.status, {
                erro: erro.message
            });
            return;
        }

        responder(res, 500, {
            erro: "Não foi possível cadastrar o gato."
        });
    }
}
// Edita os dados de um gato cadastrado
async function editarGato(req, res, usuario, idGato) {
    try {
        const gato = banco.prepare(
            "SELECT * FROM gatos WHERE id = ?"
        ).get(idGato);

        if (!gato) {
            responder(res, 404, {
                erro: "Gato não encontrado."
            });
            return;
        }

        // Administradores podem editar todos os gatos.
        // Responsáveis só podem editar os próprios.
        if (
            usuario.perfil !== "administrador" &&
            gato.responsavel_id !== usuario.id
        ) {
            responder(res, 403, {
                erro: "Você não tem permissão para editar este gato."
            });
            return;
        }

        const dados = await receberDados(req);

        const campos = [
            "nome", "idade", "sexo", "raca",
            "porte", "localizacao", "saude", "status"
        ];

        for (const campo of campos) {
            if (
                typeof dados[campo] !== "string" ||
                !dados[campo].trim()
            ) {
                responder(res, 400, {
                    erro: `Preencha corretamente o campo ${campo}.`
                });
                return;
            }
        }

        if (
            !["Macho", "Fêmea"].includes(dados.sexo) ||
            !["Pequeno", "Médio", "Grande"].includes(dados.porte)
        ) {
            responder(res, 400, {
                erro: "Sexo ou porte inválido."
            });
            return;
        }
        const statusPermitidos = [
            "Disponível",
            "Em adoção",
            "Adotado"
        ];

        if (!statusPermitidos.includes(dados.status)) {
            responder(res, 400, {
                erro: "Situação do gato inválida."
            });
            return;
        }

        banco.prepare(`
            UPDATE gatos
            SET nome = ?,
                idade = ?,
                sexo = ?,
                raca = ?,
                porte = ?,
                localizacao = ?,
                saude = ?,
                status = ?
            WHERE id = ?
        `).run(
            dados.nome.trim(),
            dados.idade.trim(),
            dados.sexo,
            dados.raca.trim(),
            dados.porte,
            dados.localizacao.trim(),
            dados.saude.trim(),
            dados.status,
            idGato
        );

        responder(res, 200, {
            mensagem: "Informações do gato atualizadas com sucesso!"
        });

    } catch (erro) {
        console.error("Erro ao editar gato:", erro.message);

        if (erro.status === 400 || erro.status === 413) {
            responder(res, erro.status, {
                erro: erro.message
            });
            return;
        }

        responder(res, 500, {
            erro: "Não foi possível editar o gato."
        });
    }
}

/* Exclui um gato após verificar as permissões */
function excluirGato(res, usuario, idGato) {
    try {
        const gato = banco.prepare(
            "SELECT * FROM gatos WHERE id = ?"
        ).get(idGato);

        if (!gato) {
            responder(res, 404, {
                erro: "Gato não encontrado."
            });
            return;
        }

        // Administrador pode excluir qualquer gato.
        // Responsável pode excluir apenas os próprios.
        if (
            usuario.perfil !== "administrador" &&
            gato.responsavel_id !== usuario.id
        ) {
            responder(res, 403, {
                erro: "Você não tem permissão para excluir este gato."
            });
            return;
        }

        banco.prepare(
            "DELETE FROM gatos WHERE id = ?"
        ).run(idGato);

        responder(res, 200, {
            mensagem: "Gato excluído com sucesso!"
        });

    } catch (erro) {
        console.error("Erro ao excluir gato:", erro.message);

        responder(res, 500, {
            erro: "Não foi possível excluir o gato."
        });
    }
}

/* Registra uma solicitação de adoção */
async function solicitarAdocao(req, res, usuario) {
    try {
        const dados = await receberDados(req);

        const gatoId = dados?.gato_id;
        const questionario = typeof dados?.questionario === "string"
            ? dados.questionario.trim()
            : "";

        if (!Number.isSafeInteger(gatoId) || gatoId <= 0) {
            responder(res, 400, {
                erro: "Gato inválido."
            });
            return;
        }

        if (questionario.length < 30 || questionario.length > 2000) {
            responder(res, 400, {
                erro: "Escreva entre 30 e 2000 caracteres sobre seu interesse na adoção."
            });
            return;
        }

        const gato = banco.prepare(
            "SELECT id, nome, status FROM gatos WHERE id = ?"
        ).get(gatoId);

        if (!gato) {
            responder(res, 404, {
                erro: "Gato não encontrado."
            });
            return;
        }

        if (gato.status !== "Disponível") {
            responder(res, 409, {
                erro: "Este gato não está disponível para novas solicitações."
            });
            return;
        }

        // Impede solicitações pendentes duplicadas
        const existente = banco.prepare(`
            SELECT id
            FROM solicitacoes
            WHERE usuario_id = ?
              AND gato_id = ?
              AND status = 'Pendente'
        `).get(usuario.id, gatoId);

        if (existente) {
            responder(res, 409, {
                erro: "Você já possui uma solicitação pendente para este gato."
            });
            return;
        }

        const resultado = banco.prepare(`
            INSERT INTO solicitacoes (usuario_id, gato_id, questionario)
            VALUES (?, ?, ?)
        `).run(usuario.id, gatoId, questionario);

        responder(res, 201, {
            mensagem: "Solicitação de adoção enviada com sucesso!",
            id: Number(resultado.lastInsertRowid)
        });

    } catch (erro) {
        if (erro.status === 400 || erro.status === 413) {
            responder(res, erro.status, {
                erro: erro.message
            });
            return;
        }

        console.error("Erro ao solicitar adoção:", erro.message);

        responder(res, 500, {
            erro: "Não foi possível enviar a solicitação."
        });
    }
}

// Cria o servidor do MiauLar
const servidor = http.createServer(async (req, res) => {

    const url = new URL(req.url, "http://localhost");

    // ROTA 1: Verificar o banco de dados
    if (url.pathname === "/api/status" && req.method === "GET") {
        try {
            const resultado = banco.prepare(
                "SELECT COUNT(*) AS total FROM usuarios"
            ).get();

            responder(res, 200, {
                sistema: "MiauLar",
                banco: "conectado",
                usuarios: resultado.total
            });

        } catch (erro) {
            console.error("Erro no banco:", erro.message);

            responder(res, 500, {
                erro: "Falha ao consultar o banco de dados."
            });
        }

        return;
    }
    // ROTA: Listar gatos cadastrados
    if (url.pathname === "/api/gatos" && req.method === "GET") {
        try {
            const gatos = banco.prepare(`
                SELECT
                    id, nome, idade, sexo, raca, porte,
                    localizacao, saude, imagem, status
                FROM gatos
                ORDER BY id
            `).all();

            responder(res, 200, gatos);
        } catch (erro) {
            console.error("Erro ao listar gatos:", erro.message);

            responder(res, 500, {
                erro: "Não foi possível carregar os gatos."
            });
        }

        return;
    }
        // ROTA: Cadastrar um novo gato
    if (url.pathname === "/api/gatos" && req.method === "POST") {
        const usuario = exigirPerfil(
            req,
            res,
            ["responsavel", "administrador"]
        );

        if (!usuario) {
            return;
        }
            await cadastrarGato(req, res, usuario);
    return;
}
    // ROTA: Listar gatos que o usuário pode gerenciar
    if (url.pathname === "/api/meus-gatos" && req.method === "GET") {
        const usuario = exigirPerfil(
            req,
            res,
            ["responsavel", "administrador"]
        );

        if (!usuario) {
            return;
        }

        try {
            let gatos;

            if (usuario.perfil === "administrador") {
                gatos = banco.prepare(`
                    SELECT
                        id, nome, idade, sexo, raca, porte,
                        localizacao, saude, imagem, status,
                        responsavel_id
                    FROM gatos
                    ORDER BY id
                `).all();
            } else {
                gatos = banco.prepare(`
                    SELECT
                        id, nome, idade, sexo, raca, porte,
                        localizacao, saude, imagem, status,
                        responsavel_id
                    FROM gatos
                    WHERE responsavel_id = ?
                    ORDER BY id
                `).all(usuario.id);
            }

            responder(res, 200, gatos);

        } catch (erro) {
            console.error("Erro ao listar gatos:", erro.message);

            responder(res, 500, {
                erro: "Não foi possível carregar seus gatos."
            });
        }

        return;
    }
    // ROTA: Editar informações de um gato
    const rotaEdicao = url.pathname.match(/^\/api\/gatos\/([0-9]+)$/);

    if (rotaEdicao && req.method === "PUT") {
        const usuario = exigirPerfil(
            req,
            res,
            ["responsavel", "administrador"]
        );

        if (!usuario) {
            return;
        }

        const idGato = Number(rotaEdicao[1]);

        if (!Number.isSafeInteger(idGato) || idGato <= 0) {
            responder(res, 400, {
                erro: "Identificador do gato inválido."
            });
            return;
        }

        await editarGato(req, res, usuario, idGato);
        return;
    }

// ROTA: Excluir um gato
if (rotaEdicao && req.method === "DELETE") {
    const usuario = exigirPerfil(
        req,
        res,
        ["responsavel", "administrador"]
    );

    if (!usuario) {
        return;
    }

    const idGato = Number(rotaEdicao[1]);

    if (!Number.isSafeInteger(idGato) || idGato <= 0) {
        responder(res, 400, {
            erro: "Identificador do gato inválido."
        });
        return;
    }

    excluirGato(res, usuario, idGato);
    return;
}

// ROTA: Solicitar adoção
if (url.pathname === "/api/solicitacoes" && req.method === "POST") {
    const usuario = exigirPerfil(req, res, ["adotante"]);

    if (!usuario) {
        return;
    }

    await solicitarAdocao(req, res, usuario);
    return;
}

    // ROTA: Consultar minhas solicitações de adoção
    if (
        url.pathname === "/api/minhas-solicitacoes" &&
        req.method === "GET"
    ) {
        const usuario = exigirPerfil(req, res, ["adotante"]);

        if (!usuario) {
            return;
        }

        try {
            const solicitacoes = banco.prepare(`
                SELECT
                    solicitacoes.id,
                    solicitacoes.questionario,
                    solicitacoes.status,
                    solicitacoes.criado_em,
                    gatos.nome AS nome_gato,
                    gatos.imagem AS imagem_gato
                FROM solicitacoes
                INNER JOIN gatos
                    ON gatos.id = solicitacoes.gato_id
                WHERE solicitacoes.usuario_id = ?
                ORDER BY solicitacoes.criado_em DESC,
                         solicitacoes.id DESC
            `).all(usuario.id);

            responder(res, 200, solicitacoes);

        } catch (erro) {
            console.error(
                "Erro ao consultar solicitações:",
                erro.message
            );

            responder(res, 500, {
                erro: "Não foi possível carregar suas solicitações."
            });
        }

        return;
    }

    // ROTA: Aprovar ou recusar uma solicitação
    const rotaAnalise = url.pathname.match(
        /^\/api\/solicitacoes\/([0-9]+)$/
    );

    if (rotaAnalise && req.method === "PATCH") {
        const usuario = exigirPerfil(
            req,
            res,
            ["responsavel", "administrador"]
        );

        if (!usuario) {
            return;
        }

        const idSolicitacao = Number(rotaAnalise[1]);

        if (!Number.isSafeInteger(idSolicitacao) || idSolicitacao <= 0) {
            responder(res, 400, {
                erro: "Identificador inválido."
            });
            return;
        }

        try {
            const dados = await receberDados(req);
            const decisao = dados?.status;

            if (!["Aprovada", "Recusada"].includes(decisao)) {
                responder(res, 400, {
                    erro: "Escolha Aprovar ou Recusar."
                });
                return;
            }

            const solicitacao = banco.prepare(`
                SELECT
                    s.id,
                    s.gato_id,
                    s.status,
                    g.responsavel_id,
                    g.status AS status_gato
                FROM solicitacoes s
                INNER JOIN gatos g ON g.id = s.gato_id
                WHERE s.id = ?
            `).get(idSolicitacao);

            if (!solicitacao) {
                responder(res, 404, {
                    erro: "Solicitação não encontrada."
                });
                return;
            }

            if (
                usuario.perfil !== "administrador" &&
                solicitacao.responsavel_id !== usuario.id
            ) {
                responder(res, 403, {
                    erro: "Você não pode analisar esta solicitação."
                });
                return;
            }

            if (solicitacao.status !== "Pendente") {
                responder(res, 409, {
                    erro: "Esta solicitação já foi analisada."
                });
                return;
            }

            if (solicitacao.status_gato !== "Disponível") {
                responder(res, 409, {
                    erro: "Este gato não está disponível para adoção."
                });
                return;
            }

            // Mantém as atualizações do banco na mesma transação.
            banco.exec("BEGIN IMMEDIATE");

            try {
                banco.prepare(`
                    UPDATE solicitacoes
                    SET status = ?
                    WHERE id = ?
                `).run(decisao, idSolicitacao);

                if (decisao === "Aprovada") {
                    banco.prepare(`
                        UPDATE gatos
                        SET status = 'Adotado'
                        WHERE id = ?
                    `).run(solicitacao.gato_id);

                    // Recusa os demais pedidos pendentes do mesmo gato.
                    banco.prepare(`
                        UPDATE solicitacoes
                        SET status = 'Recusada'
                        WHERE gato_id = ?
                          AND id <> ?
                          AND status = 'Pendente'
                    `).run(solicitacao.gato_id, idSolicitacao);
                }

                banco.exec("COMMIT");

            } catch (erro) {
                banco.exec("ROLLBACK");
                throw erro;
            }

            responder(res, 200, {
                mensagem: decisao === "Aprovada"
                    ? "Solicitação aprovada com sucesso!"
                    : "Solicitação recusada com sucesso!"
            });

        } catch (erro) {
            if (erro.status === 400 || erro.status === 413) {
                responder(res, erro.status, {
                    erro: erro.message
                });
                return;
            }

            console.error("Erro ao analisar solicitação:", erro.message);

            responder(res, 500, {
                erro: "Não foi possível analisar a solicitação."
            });
        }

        return;
    }

    // ROTA: Listar usuários cadastrados
    // Acesso exclusivo de administradores
    if (
        url.pathname === "/api/admin/usuarios" &&
        req.method === "GET"
    ) {
        const usuario = exigirPerfil(
            req,
            res,
            ["administrador"]
        );

        if (!usuario) {
            return;
        }

        try {
            const usuarios = banco.prepare(`
                SELECT
                    id,
                    nome,
                    email,
                    telefone,
                    perfil
                FROM usuarios
                ORDER BY nome ASC
            `).all();

            responder(res, 200, usuarios);

        } catch (erro) {
            console.error(
                "Erro ao listar usuários:",
                erro.message
            );

            responder(res, 500, {
                erro: "Não foi possível carregar os usuários."
            });
        }

        return;
    }

    // ROTA: Alterar perfil de um usuário
    const rotaPerfilUsuario = url.pathname.match(
        /^\/api\/admin\/usuarios\/([0-9]+)\/perfil$/
    );

    if (rotaPerfilUsuario && req.method === "PATCH") {
        const administrador = exigirPerfil(
            req,
            res,
            ["administrador"]
        );

        if (!administrador) {
            return;
        }

        try {
            const idUsuario = Number(rotaPerfilUsuario[1]);
            const dados = await receberDados(req);

            if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
                responder(res, 400, {
                    erro: "Usuário inválido."
                });
                return;
            }

            if (!["responsavel", "adotante"].includes(dados?.perfil)) {
                responder(res, 400, {
                    erro: "Selecione Responsável ou Adotante."
                });
                return;
            }

            const usuario = banco.prepare(`
                SELECT id, perfil
                FROM usuarios
                WHERE id = ?
            `).get(idUsuario);

            if (!usuario) {
                responder(res, 404, {
                    erro: "Usuário não encontrado."
                });
                return;
            }

            if (usuario.perfil === "administrador") {
                responder(res, 403, {
                    erro: "O perfil do administrador não pode ser alterado."
                });
                return;
            }

            if (usuario.perfil === dados.perfil) {
                responder(res, 200, {
                    mensagem: "O usuário já possui esse perfil."
                });
                return;
            }

            // Não permite transformar em adotante uma conta
            // que ainda seja responsável por gatos.
            if (dados.perfil === "adotante") {
                const total = banco.prepare(`
                    SELECT COUNT(*) AS total
                    FROM gatos
                    WHERE responsavel_id = ?
                `).get(idUsuario).total;

                if (total > 0) {
                    responder(res, 409, {
                        erro: "Este usuário possui gatos vinculados. Transfira a responsabilidade antes de alterar o perfil."
                    });
                    return;
                }
            }

            banco.prepare(`
                UPDATE usuarios
                SET perfil = ?
                WHERE id = ?
            `).run(dados.perfil, idUsuario);

            // Encerra sessões anteriores para aplicar o novo perfil.
            banco.prepare(`
                DELETE FROM sessoes
                WHERE usuario_id = ?
            `).run(idUsuario);

            responder(res, 200, {
                mensagem: "Perfil atualizado com sucesso!"
            });

        } catch (erro) {
            if (erro.status === 400 || erro.status === 413) {
                responder(res, erro.status, {
                    erro: erro.message
                });
                return;
            }

            console.error("Erro ao alterar perfil:", erro.message);

            responder(res, 500, {
                erro: "Não foi possível atualizar o perfil."
            });
        }

        return;
    }

    // ROTA: Alterar a própria senha
    if (
        url.pathname === "/api/alterar-senha" &&
        req.method === "PATCH"
    ) {
        const usuario = exigirPerfil(
            req,
            res,
            ["administrador", "responsavel", "adotante"]
        );

        if (!usuario) {
            return;
        }

        try {
            const dados = await receberDados(req);

            const senhaAtual = dados?.senhaAtual;
            const novaSenha = dados?.novaSenha;
            const confirmarSenha = dados?.confirmarSenha;

            if (
                typeof senhaAtual !== "string" ||
                typeof novaSenha !== "string" ||
                typeof confirmarSenha !== "string"
            ) {
                responder(res, 400, {
                    erro: "Preencha todos os campos."
                });
                return;
            }

            if (
                novaSenha.length < 8 ||
                Buffer.byteLength(novaSenha, "utf8") > 72
            ) {
                responder(res, 400, {
                    erro: "A nova senha deve ter pelo menos 8 caracteres e no máximo 72 bytes."
                });
                return;
            }

            if (novaSenha !== confirmarSenha) {
                responder(res, 400, {
                    erro: "A confirmação da senha não corresponde."
                });
                return;
            }

            const conta = banco.prepare(`
                SELECT senha_hash
                FROM usuarios
                WHERE id = ?
            `).get(usuario.id);

            if (!conta) {
                responder(res, 404, {
                    erro: "Usuário não encontrado."
                });
                return;
            }

            const senhaCorreta = await bcrypt.compare(
                senhaAtual,
                conta.senha_hash
            );

            if (!senhaCorreta) {
                responder(res, 401, {
                    erro: "Senha atual incorreta."
                });
                return;
            }

            const senhaRepetida = await bcrypt.compare(
                novaSenha,
                conta.senha_hash
            );

            if (senhaRepetida) {
                responder(res, 400, {
                    erro: "A nova senha deve ser diferente da atual."
                });
                return;
            }

            // Protege a nova senha com BCrypt
            const novoHash = await bcrypt.hash(novaSenha, 12);

            // Atualiza a senha e encerra as sessões da conta
            banco.exec("BEGIN IMMEDIATE");

            try {
                banco.prepare(`
                    UPDATE usuarios
                    SET senha_hash = ?
                    WHERE id = ?
                `).run(novoHash, usuario.id);

                banco.prepare(`
                    DELETE FROM sessoes
                    WHERE usuario_id = ?
                `).run(usuario.id);

                banco.exec("COMMIT");

            } catch (erro) {
                banco.exec("ROLLBACK");
                throw erro;
            }

            const seguro = process.env.NODE_ENV === "production"
                ? "; Secure"
                : "";

            res.setHeader(
                "Set-Cookie",
                `miaular_sessao=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${seguro}`
            );

            responder(res, 200, {
                mensagem: "Senha alterada com sucesso! Faça login novamente."
            });

        } catch (erro) {
            if (erro.status === 400 || erro.status === 413) {
                responder(res, erro.status, {
                    erro: erro.message
                });
                return;
            }

            console.error("Erro ao alterar senha:", erro.message);

            responder(res, 500, {
                erro: "Não foi possível alterar a senha."
            });
        }

        return;
    }

    // ROTA 2: Cadastrar usuários
    // ROTA: Listar solicitações para análise
    if (
        url.pathname === "/api/solicitacoes/recebidas" &&
        req.method === "GET"
    ) {
        const usuario = exigirPerfil(
            req,
            res,
            ["responsavel", "administrador"]
        );

        if (!usuario) {
            return;
        }

        try {
            let solicitacoes;

            const consulta = `
                SELECT
                    s.id,
                    s.gato_id,
                    s.usuario_id,
                    s.questionario,
                    s.status,
                    s.criado_em,
                    g.nome AS nome_gato,
                    g.imagem AS imagem_gato,
                    u.nome AS nome_adotante
                FROM solicitacoes s
                INNER JOIN gatos g ON g.id = s.gato_id
                INNER JOIN usuarios u ON u.id = s.usuario_id
            `;

            if (usuario.perfil === "administrador") {
                solicitacoes = banco.prepare(`
                    ${consulta}
                    ORDER BY s.criado_em DESC, s.id DESC
                `).all();
            } else {
                solicitacoes = banco.prepare(`
                    ${consulta}
                    WHERE g.responsavel_id = ?
                    ORDER BY s.criado_em DESC, s.id DESC
                `).all(usuario.id);
            }

            responder(res, 200, solicitacoes);

        } catch (erro) {
            console.error(
                "Erro ao listar solicitações:",
                erro.message
            );

            responder(res, 500, {
                erro: "Não foi possível carregar as solicitações."
            });
        }

        return;
    }

    if (url.pathname === "/api/cadastro" && req.method === "POST") {
        await cadastrarUsuario(req, res);
        return;
    }
        // ROTA 3: Login de usuários
    if (url.pathname === "/api/login" && req.method === "POST") {
        await realizarLogin(req, res);
        return;
    }
        // ROTA 4: Verificar usuário autenticado
    if (url.pathname === "/api/sessao" && req.method === "GET") {
        verificarSessao(req, res);
        return;
    }
        // ROTA 5: Encerrar sessão
    if (url.pathname === "/api/logout" && req.method === "POST") {
        realizarLogout(req, res);
        return;
    }
        // Rota de teste: acesso exclusivo de administradores
    if (url.pathname === "/api/admin/verificar" && req.method === "GET") {
        const usuario = exigirPerfil(req, res, ["administrador"]);

        if (!usuario) {
            return;
        }

        responder(res, 200, {
            mensagem: "Acesso administrativo autorizado.",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                perfil: usuario.perfil
            }
        });

        return;
    }

    // Bloqueia métodos não permitidos
    if (req.method !== "GET" && req.method !== "HEAD") {
        responder(res, 405, {
            erro: "Método não permitido."
        });
        return;
    }

    // Abre as páginas do site
    await entregarArquivo(req, res, url);
});

// Inicia o servidor
servidor.listen(porta, () => {
    console.log(`MiauLar iniciado em http://localhost:${porta}`);
});
