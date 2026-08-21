# ⚡ Dashboard AI Enviagora

> **Plataforma corporativa de auditoria operacional para detecção de divergências de estoque entre ERP e Marketplaces, com diagnósticos automatizados por IA (James Engine) e integrações externas (Google Sheets, exportação em PDF e Webhooks).**

---

## 📌 Sumário
- [Visão Geral](#-visão-geral)
- [Stack Tecnológica](#-stack-tecnológica)
- [Arquitetura & Fluxo de Dados](#-arquitetura--fluxo-de-dados)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Modelagem de Dados](#-modelagem-de-dados)
- [Rotas de API & Contratos](#-rotas-de-api--contratos)
- [Funcionalidades de Frontend](#-funcionalidades-de-frontend)
- [Motor de IA — James Engine](#-motor-de-ia--james-engine)
- [Segurança & Resiliência](#-segurança--resiliência)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Como Rodar Localmente](#-como-rodar-localmente)
- [Roadmap & Próximos Passos](#-roadmap--próximos-passos)

---

## 🎯 Visão Geral

O **Dashboard AI Enviagora** resolve o desafio de sincronização e integridade de estoque no e-commerce multicanal. O sistema recebe e compara dados de duas fontes principais:
1. **ERP:** Quantidade de estoque físico real da empresa.
2. **Canais de Venda / Marketplace:** Quantidade anunciada na API externa.

Quando divergências são identificadas (ex.: *Quebra de Estoque Físico*, *SKU Ausente na API*), o sistema classifica os status em `OK` ou `CRITICAL`, permitindo à equipe de operações acionar o motor de inteligência artificial **James Engine** para gerar diagnósticos estruturados, exportar relatórios executivos em **PDF** ou sincronizar diretamente com planilhas no **Google Sheets**.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Estilização** | Tailwind CSS v4, Dark Mode, Glassmorphism, Paleta Neon Lime (`#bfff00`) |
| **Inteligência Artificial** | Vercel AI SDK (`ai`, `@ai-sdk/groq`, `@ai-sdk/google`) — Modelo **Llama 3.3 70B Versatile** |
| **Banco de Dados** | Prisma ORM 7 + SQLite (`better-sqlite3` com adapter de alta performance) |
| **Gráficos** | Recharts (Gráfico de área responsivo com gradiente) |
| **Exportação de Relatórios** | jsPDF + jsPDF-AutoTable |
| **Integrações de Nuvem** | Google Sheets API via `googleapis` (Google Cloud Service Account) |
| **Ícones** | Lucide React |

---

## 🏗️ Arquitetura & Fluxo de Dados

```
[ ERP / Sistemas Externos ] 
             │ (POST divergências)
             ▼
      [ /api/webhook ]
             │
             ▼
  [ Prisma ORM / SQLite (dev.db) ]
             │
             ▼
  [ Dashboard AI Enviagora (UI) ]
    ├──► [ /api/analyze ] ──► [ Groq AI Engine (Llama 3.3 70B) ]
    ├──► [ /api/sheets ]  ──► [ Google Sheets API (Nuvem) ]
    └──► [ jsPDF Export ] ──► [ Relatório PDF Corporativo ]
```

---

## 📂 Estrutura de Pastas

```
dashboard-ai-enviagora/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts      # Integração com IA James Engine (Groq)
│   │   ├── audit-logs/route.ts   # CRUD de leitura de logs de auditoria
│   │   ├── sheets/route.ts       # Sincronização direta com Google Sheets
│   │   └── webhook/route.ts      # Recepção de eventos externos
│   ├── favicon.ico
│   ├── globals.css               # Estilos base e Tailwind CSS v4
│   ├── layout.tsx                # Layout raiz da aplicação
│   └── page.tsx                  # Interface completa do Dashboard
├── lib/
│   └── prisma.ts                 # Instância singleton do Prisma Client
├── prisma/
│   └── schema.prisma             # Schema e modelagem da tabela AuditLog
├── public/
│   └── img/                      # Logotipos SVG da marca (logo e seta)
├── .env.example                  # Modelo de variáveis de ambiente com placeholders
├── .gitignore                    # Arquivos ignorados pelo Git (segurança)
├── package.json                  # Dependências e scripts
└── tsconfig.json                 # Configurações do TypeScript
```

---

## 🗄️ Modelagem de Dados

O modelo de dados está definido em `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
}

generator client {
  provider = "prisma-client-js"
}

model AuditLog {
  id        String   @id @default(uuid())
  sku       String
  erp       Int
  mkt       Int
  failure   String
  status    String
  createdAt DateTime @default(now())
}
```

* **`sku`**: Código único do produto (Stock Keeping Unit).
* **`erp`**: Quantidade registrada no estoque físico do ERP.
* **`mkt`**: Quantidade anunciada na API do Marketplace.
* **`failure`**: Descrição do tipo de inconsistência detectada.
* **`status`**: Nível de severidade (`OK` ou `CRITICAL`).

---

## 🔌 Rotas de API & Contratos

### 1. `GET /api/audit-logs`
Retorna todos os logs de auditoria armazenados no banco de dados. Caso a base esteja vazia, popula automaticamente com dados de seed para demonstração.

### 2. `POST /api/analyze`
Envia os dados de inventário para o motor de IA e retorna um parecer técnico executivo.
* **Payload esperado:**
  ```json
  {
    "dataset": [
      { "id": "1", "sku": "ENV-102", "erp": 50, "mkt": 42, "failure": "Quebra de Estoque Físico", "status": "CRITICAL" }
    ]
  }
  ```

### 3. `POST /api/sheets`
Autentica com a Service Account do Google, limpa o intervalo `Auditoria!A2:Z` da planilha configurada e salva o lote atualizado ordenado por ID.

### 4. `POST /api/webhook`
Recebe eventos de discrepância de sistemas externos e persiste o log no banco.
* **Payload esperado:**
  ```json
  {
    "sku": "ENV-102",
    "erp": 50,
    "mkt": 42,
    "failure": "Quebra de Estoque Físico",
    "status": "CRITICAL"
  }
  ```

---

## 🖥️ Funcionalidades de Frontend

* **Barra Lateral Retrátil com Glassmorphism:** Navegação fluida entre abas (*Dashboard Base, Métricas & Análises, Controle de SKUs, Favoritos, Logs, Relatórios e Configurações*) com suporte a hover dinâmico no menu e logos em SVG.
* **Cards de Indicadores Principais (KPIs):** Receita monitorada, alertas ativos com contador de status crítico e integridade geral de estoque.
* **Gráficos Interativos:** Visualização de evolução de vendas vs erros ao longo dos meses com Recharts.
* **Tabela de Auditoria em Tempo Real:** Listagem completa com badges coloridas por nível de criticidade.
* **Diagnósticos com IA:** Visualizador formatado com seções destacadas e marcadores luminosos gerados pelo James Engine.
* **Exportação com 1 Clique:**
  * **PDF Corporativo:** Documento estilizado com cabeçalho institucional e tabela de SKUs.
  * **Google Sheets:** Envio e sincronização dos dados com a nuvem do Google Drive.
* **Sistema de Notificações (Toasts):** Feedback visual em tempo real com alertas de sucesso, erro e aviso.

---

## 🧠 Motor de IA — James Engine

O **James Engine** atua como assistente especialista em auditoria operacional:
* **Modelo:** Llama 3.3 70B Versatile (via Groq Cloud).
* **Diretrizes de Prompt:** Respostas com espaçamento duplo, tópicos claros, identificação pontual de riscos e recomendações de correção para a equipe de logística.
* **Timeout de Segurança:** AbortController configurado em 12 segundos para garantir responsividade no cliente.

---

## 🛡️ Segurança & Resiliência

* **Modo Offline com Fallback:** Em caso de indisponibilidade de rede ou falha em APIs externas, o dashboard carrega dados simulados e avisa o usuário via toast sem quebrar a interface.
* **Sanitização de Chaves RSA:** Tratamento automático de quebras de linha `\n` na chave privada do Google para compatibilidade no Windows e servidores de deploy.
* **Proteção de Credenciais:** Arquivos `.env` e `.env.local` estritamente bloqueados no `.gitignore`, com disponibilização do modelo público `.env.example`.

---

## 🔐 Variáveis de Ambiente

Copie o modelo `.env.example` para `.env.local` e preencha com suas credenciais:

| Variável | Descrição |
| :--- | :--- |
| `GROQ_API_KEY` | Chave de API da Groq Cloud (usada pelo James Engine) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail da Service Account do Google Cloud |
| `GOOGLE_PRIVATE_KEY` | Chave Privada RSA da Service Account (com `\n`) |
| `GOOGLE_SHEET_ID` | ID da Planilha do Google Sheets de destino |

---

## 🚀 Como Rodar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/davidabx-dev/dashboard-ai-enviagora.git
cd dashboard-ai-enviagora
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env.local
# Preencha suas credenciais reais no .env.local
```

### 4. Inicializar o Banco de Dados (Prisma)
```bash
npx prisma generate
npx prisma db push
```

### 5. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para acessar a aplicação.

---

## 🗺️ Roadmap & Próximos Passos

- [ ] **Autenticação & Controle de Acesso:** Implementação de login seguro (NextAuth / Clerk).
- [ ] **Migração de Banco para Nuvem:** Migrar SQLite para PostgreSQL (Supabase / Neon) para viabilizar deploy serverless na Vercel.
- [ ] **Filtros e Paginação Avançada:** Busca por SKU e filtro por tipo de divergência na tabela.
- [ ] **Rate Limiting:** Proteção contra abuso nas chamadas de webhook e IA.

---

## 📄 Licença

Projeto desenvolvido para uso corporativo na **EnviaGora**.
