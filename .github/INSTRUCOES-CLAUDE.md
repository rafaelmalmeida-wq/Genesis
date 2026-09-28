# Instruções para o Claude na nuvem — Genesis (Life OS)

Você está alterando o app **Genesis** a partir de um pedido que o dono fez **por voz** dentro do app (a transcrição pode ter erros: "Primus" = Primos, "NQ" = Anycubic etc.). O dono não programa: ele vai ler só o seu resumo no celular e tocar em "Aprovar" ou "Recusar".

## Quem usa
Engenheiro civil e dono da **Primos 3D** (impressão 3D: 2× Bambu Lab A1 Combo com AMS Lite e 1× Anycubic Kobra X). Usa o app no **iPhone** (instalado pela tela de início) e no PC. Quer o visual **igual ao iOS** (limpo, estilo Apple) em tudo.

## O que é o projeto
PWA em **HTML/CSS/JS puro** (sem framework, sem build, sem dependências externas). Abas: Painel, Primos 3D (pedidos e clientes), Agenda, Finanças, Tarefas, Notas, Estudos, Negócios, Saúde, Ajustes. Dados no `localStorage`; sincronização opcional com uma planilha Google do próprio usuário.

## Arquitetura (evoluir, nunca reescrever do zero)
- `index.html`: estrutura das abas (`.tab-content`) e navegação (`.tab-btn`); cada módulo é um bloco `<!-- Módulo N -->`.
- `style.css`: visual iOS modo escuro. Cores em variáveis no `:root` (`--card`, `--card2`, `--label`, `--label2`, `--fill`, `--blue`, `--green`, `--red`, `--orange`...). Cartões `.card`, títulos `.page-title`, controles segmentados `.focus-header-tabs`, listas `.transaction-list`, blocos `.stat-grid`/`.stat-tile`, botões `.mini-btn`/`.btn`. No celular (`max-width: 800px`) a navegação é uma barra de abas embaixo. Cores inline usam as do iOS: #0a84ff, #30d158, #ff453a, #ff9f0a, #bf5af2, #8e8e93.
- `app.js`: seções marcadas com `// --- NOME ---` ou `// ===== NOME =====`, sempre no padrão **ler do localStorage → variável global → interação → `salvar(modulo, valor)` → redesenhar**. Inicialização no fim (`// INICIALIZAÇÃO`).
- `manifest.json` + `sw.js`: instalável e offline (rede primeiro, cache de reserva).

## Regras obrigatórias
1. Toda gravação passa por `salvar(modulo, valor)`. Nunca `localStorage.setItem` direto para dados.
2. Módulo novo de dados entra em `SYNC_MODULOS`, em `exportData`/`importData` e em `redesenharTudo()`. Chave = `lifeos_<modulo>`.
3. IDs vêm de `novoId()`, nunca `Date.now()`.
4. Texto do usuário passa por `esc()` antes de `innerHTML`; URLs com `linkify(esc(texto))`.
5. Datas em ISO `aaaa-mm-dd` com os helpers (`hojeISO()`, `isoDe()`, `isoParaBR()`, `rotuloData()`); nunca `new Date('aaaa-mm-dd')` — use `new Date(y, m-1, d)`.
6. Formulários: `<input type="hidden" id="x-id">`, `cancelarEdicaoX()`, `editarX(id)`, botão Cancelar com `hidden`.
7. Não quebrar ligações: pedido ↔ lançamento em Finanças com o **mesmo id** (`sincronizarLancamentoPedido`); prazo do pedido no calendário; aporte ↔ lançamento via `financeId`; consulta ↔ evento via `medicalId`; ritual ↔ evento via `ritualKey`.
8. Nenhum token, senha ou URL secreta no código — só digitados pelo usuário na aba Ajustes.
9. Não adicionar bibliotecas externas nem chamadas a serviços de terceiros.
10. Nunca apagar dados do usuário nem mudar o formato de dados existentes sem migração compatível.
11. Mantenha a marca A♠ A♥ A♦ (Trinca de Ases) no cabeçalho do Painel.

## Como trabalhar neste pedido
- Faça a **menor mudança** que atende o pedido, no estilo do código ao redor.
- Leve em conta a **página** onde o dono estava quando pediu (vem no pedido).
- Não mexa em `.github/`. Não faça commit nem push (o robô faz isso).
- No fim, rode `node --check app.js`.
- Escreva **`.resumo-claude.md`** na raiz com 2 a 6 linhas em português simples: o que mudou e como usar. Ex.: "Adicionei o campo *Peso (g)* no formulário de pedidos da Primos 3D. Ele aparece na lista ao lado do material."
- Se o pedido for confuso, perigoso (apagar dados, mexer em segurança) ou grande demais, **não altere o código**: explique no `.resumo-claude.md` o que precisa ser esclarecido.
