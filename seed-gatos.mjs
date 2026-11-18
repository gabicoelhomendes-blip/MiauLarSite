
import banco from "./database.mjs";

// Gatos iniciais do catálogo MiauLar
const gatos = [
    {
        nome: "Mel",
        idade: "2 anos",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/mel.jpg",
        status: "Disponível"
    },
    {
        nome: "Luna",
        idade: "1 ano",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/luna.jpg",
        status: "Disponível"
    },
    {
        nome: "Simba",
        idade: "3 anos",
        sexo: "Macho",
        raca: "Sem raça definida (SRD)",
        porte: "Médio",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/simba.jpg",
        status: "Disponível"
    },
    {
        nome: "Nina",
        idade: "8 meses",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/nina.png",
        status: "Disponível"
    },
    {
        nome: "Thor",
        idade: "2 anos",
        sexo: "Macho",
        raca: "Sem raça definida (SRD)",
        porte: "Médio",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/thor.png",
        status: "Disponível"
    },
    {
        nome: "Amora",
        idade: "1 ano",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/amora.png",
        status: "Disponível"
    },
    {
        nome: "Oliver",
        idade: "4 meses",
        sexo: "Macho",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/oliver.png",
        status: "Disponível"
    },
    {
        nome: "Milk",
        idade: "6 meses",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/milk.png",
        status: "Disponível"
    },
    {
        nome: "Luck",
        idade: "1 ano",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/luck.png",
        status: "Disponível"
    },
    {
        nome: "Frida",
        idade: "2 anos",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/frida.png",
        status: "Disponível"
    },
    {
        nome: "Bento",
        idade: "1 ano",
        sexo: "Macho",
        raca: "Sem raça definida (SRD)",
        porte: "Médio",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/bento.png",
        status: "Disponível"
    },
    {
        nome: "Mia",
        idade: "2 anos",
        sexo: "Fêmea",
        raca: "Sem raça definida (SRD)",
        porte: "Pequeno",
        localizacao: "Franca - SP",
        saude: "A confirmar com o responsável.",
        imagem: "cats/mia.png",
        status: "Disponível"
    }
];

// Consulta para evitar gatos duplicados
const buscarGato = banco.prepare(`
    SELECT id FROM gatos
    WHERE nome = ? AND imagem = ?
`);

// Insere novos gatos no SQLite
const inserirGato = banco.prepare(`
    INSERT INTO gatos (
        nome, idade, sexo, raca, porte,
        localizacao, saude, imagem, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let adicionados = 0;

for (const gato of gatos) {
    const existente = buscarGato.get(
        gato.nome,
        gato.imagem
    );

    if (existente) {
        continue;
    }

    inserirGato.run(
        gato.nome,
        gato.idade,
        gato.sexo,
        gato.raca,
        gato.porte,
        gato.localizacao,
        gato.saude,
        gato.imagem,
        gato.status
    );

    adicionados++;
}

console.log(`${adicionados} gato(s) adicionado(s) ao banco.`);
