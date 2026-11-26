# StockGuard

Sistema de gerenciamento de estoque e pedidos projetado para resolver **condições de corrida (*race conditions*)** e garantir **consistência transacional (ACID)** em cenários de compras simultâneas.

> Projeto 1 de 3 da série prática inspirada nos desafios reais de engenharia backend: ir além do CRUD básico, tratando concorrência, atomicidade, testes automatizados e reprodutibilidade de ambiente.

---

## O Problema Resolvido

Em um e-commerce comum, se há **apenas 1 unidade** de um produto em estoque e dois clientes clicam em "Comprar" ao mesmo tempo:
1. A requisição A lê `estoque = 1` (ok).
2. A requisição B lê `estoque = 1` (ok).
3. Ambas aprovam a venda → **overselling** (2 vendas para 1 produto físico).

Além disso, se o estoque for reduzido e ocorrer uma falha ao gravar o pedido, o produto some do estoque sem venda registrada.

### Como o StockGuard resolve
- **Atualização atômica condicional / Lock no banco de dados:** O decremento de estoque só é efetivado no PostgreSQL quando `quantity >= requested_quantity`, impedindo saldo negativo mesmo sob requisições paralelas.
- **Transações ACID:** A baixa no estoque e a criação do pedido acontecem dentro da mesma transação — se qualquer etapa falhar, ocorre *rollback* automático.
- **Testes de Concorrência:** Teste de integração automatizado disparando múltiplas requisições simultâneas contra um item com estoque `1`, validando que exatamente **1 compra é aprovada** e as demais recebem conflito (`409 Conflict`).

---

## Stack Tecnológica

- **Backend:** C# / .NET 10 (ASP.NET Core Web API) + Entity Framework Core + Npgsql
- **Banco de Dados:** PostgreSQL 16 (via Docker Compose)
- **Frontend:** React + TypeScript (Vite)
- **Testes:** xUnit + WebApplicationFactory / Testcontainers ou PostgreSQL em container
- **CI/CD:** GitHub Actions (execução automática de build e testes a cada push/PR)
- **Hospedagem (alvo):** Render (API em Docker) · Vercel (Frontend) · Neon/Supabase (PostgreSQL)

---

## Estrutura Planejada do Repositório

```text
stock-guard/
├── backend/
│   ├── src/
│   │   ├── StockGuard.Api/            # Controllers/Endpoints, Swagger, validação, DI
│   │   ├── StockGuard.Application/    # Regras de negócio, DTOs, serviços
│   │   ├── StockGuard.Domain/         # Entidades (Product, Order, StockMovement)
│   │   └── StockGuard.Infrastructure/ # EF Core, DbContext, Migrations, repositórios
│   └── tests/
│       ├── StockGuard.UnitTests/      # Testes unitários de domínio/regras
│       └── StockGuard.IntegrationTests/ # Testes de API e concorrência real no Postgres
├── frontend/                          # React + TypeScript (Vite)
├── docker-compose.yml                 # PostgreSQL + API
├── .env.example                       # Variáveis de ambiente de exemplo
└── README.md
```

---

## Como Executar Localmente

### Pré-requisitos
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Configurar variáveis de ambiente
```bash
cp .env.example .env
```

### 2. Subir o banco de dados PostgreSQL
```bash
docker compose up -d postgres
```

### 3. Rodar o Backend (.NET 10)
```bash
cd backend
dotnet restore
dotnet ef database update --project src/StockGuard.Infrastructure --startup-project src/StockGuard.Api
dotnet run --project src/StockGuard.Api
```
A documentação interativa (OpenAPI / Swagger) ficará disponível em `http://localhost:5000/swagger` (ou porta configurada no `launchSettings.json`).

### 4. Rodar o Frontend (React + TypeScript)
```bash
cd frontend
npm install
npm run dev
```

---

## Como Executar os Testes

```bash
cd backend
dotnet test
```
Os testes de integração incluem a simulação de **compras concorrentes simultâneas** para validar o bloqueio de *overselling*.

---

## Limitações Conhecidas

- **Escala de escrita em único nó:** O controle de concorrência atual utiliza transação e bloqueio/atualização atômica diretamente no PostgreSQL, adequado para volumes pequenos e médios; para altíssima concorrência (ex.: *flash sales* globais), seria necessário evoluir para particionamento de estoque ou fila dedicada (ex.: RabbitMQ / SQS).
- **Autenticação:** Nesta versão focada em consistência de estoque e pedidos, não há fluxo completo de autenticação JWT/OAuth de usuários.
- **Pagamentos:** O registro do pedido simula a confirmação de compra sem integração com gateway externo (tema tratado em repositório dedicado de assinaturas/webhooks).
