
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const porta = 3000;
const pastaProjeto = path.dirname(fileURLToPath(import.meta.url));

// Tipos de arquivos utilizados pelo site
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

// Cria o servidor do MiauLarr
const servidor = http.createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405);
        res.end("Metodo nao permitido");
        return;
    }

    try {
        const url = new URL(req.url, "http://localhost");
        const rota = decodeURIComponent(url.pathname);
        const arquivo = rota === "/" ? "/index.html" : rota;

        const caminho = path.resolve(pastaProjeto, "." + arquivo);
        const relativo = path.relative(pastaProjeto, caminho);

        // Impede acesso a arquivos fora das pastas publicas
        const pastaPermitida =
            relativo.startsWith("cats" + path.sep) ||
            relativo.startsWith("css" + path.sep) ||
            relativo.startsWith("js" + path.sep);

        const paginaPermitida = [
            "index.html",
            "cadastro.html",
            "detalhes.html"
        ].includes(relativo);

        const extensao = path.extname(caminho).toLowerCase();

        if (
            (!pastaPermitida && !paginaPermitida) ||
            !tipos[extensao]
        ) {
            res.writeHead(404);
            res.end("Pagina nao encontrada");
            return;
        }

        const conteudo = await readFile(caminho);

        res.writeHead(200, {
            "Content-Type": tipos[extensao] + "; charset=utf-8",
            "X-Content-Type-Options": "nosniff"
        });

        res.end(req.method === "HEAD" ? undefined : conteudo);
    } catch {
        res.writeHead(404);
        res.end("Pagina nao encontrada");
    }
});

servidor.listen(porta, () => {
    console.log(`MiauLarr iniciado em http://localhost:${porta}`);
});
