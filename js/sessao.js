
 // Verifica a sessão e atualiza o menu
async function atualizarMenu() {
    const linkEntrar = document.querySelector(
        'nav a[href="login.html"]'
    );

    if (!linkEntrar) {
        return;
    }

    try {
        const resposta = await fetch("/api/sessao", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!resposta.ok) {
            return;
        }

        const dados = await resposta.json();

        if (!dados.autenticado) {
            return;
        }

        // Usuário conectado: mostra Sair
        linkEntrar.textContent = "Sair";
        linkEntrar.href = "#";

        linkEntrar.addEventListener("click", async (evento) => {
            evento.preventDefault();

            linkEntrar.textContent = "Saindo...";

            try {
                const respostaLogout = await fetch("/api/logout", {
                    method: "POST",
                    credentials: "same-origin"
                });

                if (!respostaLogout.ok) {
                    throw new Error("Não foi possível sair da conta.");
                }

                // Atualiza a página após encerrar a sessão
                window.location.reload();

            } catch (erro) {
                alert(erro.message);
                linkEntrar.textContent = "Sair";
            }
        });

    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
    }
}

atualizarMenu();
