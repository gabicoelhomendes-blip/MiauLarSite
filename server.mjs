
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import banco from "./database.mjs";
import { randomBytes, createHash } from "node:crypto";

// Configurações do MiauLarr
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
            "login.html"
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

// Cria o servidor do MiauLarr
const servidor = http.createServer(async (req, res) => {

    const url = new URL(req.url, "http://localhost");

    // ROTA 1: Verificar o banco de dados
    if (url.pathname === "/api/status" && req.method === "GET") {
        try {
            const resultado = banco.prepare(
                "SELECT COUNT(*) AS total FROM usuarios"
            ).get();

            responder(res, 200, {
                sistema: "MiauLarr",
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

    // ROTA 2: Cadastrar usuários
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
    console.log(`MiauLarr iniciado em http://localhost:${porta}`);
});
