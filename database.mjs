
import { DatabaseSync } from "node:sqlite";

const banco = new DatabaseSync("miaular.sqlite");

// Garante a integridade das relações
banco.exec("PRAGMA foreign_keys = ON");

// Cria as tabelas do sistema
banco.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        telefone TEXT NOT NULL,
        senha_hash TEXT NOT NULL,
        perfil TEXT NOT NULL
            CHECK (perfil IN ('administrador', 'adotante', 'responsavel'))
    );

    CREATE TABLE IF NOT EXISTS gatos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        idade TEXT NOT NULL,
        sexo TEXT NOT NULL,
        raca TEXT NOT NULL,
        porte TEXT NOT NULL,
        localizacao TEXT NOT NULL,
        saude TEXT NOT NULL,
        imagem TEXT,
        status TEXT NOT NULL DEFAULT 'Disponível'
            CHECK (status IN ('Disponível', 'Em adoção', 'Adotado')),
        responsavel_id INTEGER,
        FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS solicitacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        gato_id INTEGER NOT NULL,
        questionario TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pendente'
            CHECK (status IN ('Pendente', 'Aprovada', 'Recusada')),
        criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (gato_id) REFERENCES gatos(id) ON DELETE CASCADE
    );
`);

console.log("Banco de dados SQLite preparado.");

export default banco;
