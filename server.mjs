
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import banco from "./database.mjs";

// Configurações do MiauLarr
const porta = 3000;
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
            "detalhes.html"
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
