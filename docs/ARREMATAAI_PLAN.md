# ArremataAI — SaaS para Investidores em Leilões de Imóveis

## Contexto

O PDF enviado (`019dce83-Plataforma_SaaS_para_1.pdf`) especifica um **SaaS totalmente novo** para investidores brasileiros em leilões de imóveis — sem relação com o código existente do Plagard Orchestrator neste diretório. Por orientação do usuário, será um **projeto greenfield separado**, com os quatro módulos (A, B, C, D) já na Fase 1, usando uma stack ideal recomendada.

O produto centraliza oportunidades de leilão (Caixa, Santander), executa análise por IA de Editais/Matrículas, projeta ROI e gerencia o portfólio pós-arremate com Kanban + DRE individualizada por ativo.

> **Observação:** o repositório do orchestrator em `/home/user/orchestrator` não é alterado em sua aplicação. O novo projeto deve viver em repositório próprio (sugerido: `arremataai/`). A branch `claude/new-session-HHDM6` recebe somente este arquivo de plano (em `docs/ARREMATAAI_PLAN.md`).

---

## Stack Recomendada (opinativa)

| Preocupação | Escolha | Por quê |
|---|---|---|
| Monorepo | **Turborepo + pnpm workspaces** | Cache remoto, tipos zod/Prisma compartilhados entre web/api/worker |
| Web/BFF | **Next.js 15 (App Router) em Node 22** | RSC para listagens pesadas, SSR/SEO, server actions para uploads |
| Serviço de API | **NestJS (adaptador Fastify)** | Superfície REST/GraphQL versionada para worker/mobile; DI limpa para tenant scoping |
| Banco de Dados | **Postgres 16 + PostGIS + pgvector** no Neon | PostGIS é mandatório para queries de bbox no mapa; pgvector para busca semântica em editais |
| ORM | **Prisma 5** | Tipos gerados consumidos por todo o monorepo |
| Fila | **BullMQ sobre Redis (Upstash)** | Retry/backoff/repeat + UI bull-board; filas: `scrape`, `analyze`, `notify` |
| Storage de objetos | **Cloudflare R2** | Compatível com S3, sem custo de egress; PUT pré-assinado + scan ClamAV |
| Mapas | **MapLibre GL JS + MapTiler** | Cliente open-source, preço amigável ao mercado BR, suporta clustering |
| Autenticação | **Clerk** (orgs = tenants) | MFA, SSO, SMS BR via Twilio/Zenvia |
| Pagamentos | **Stripe Brasil** (BRL, Boleto, Pix) | Customer Portal — sem UI de billing custom na Fase 1 |
| E-mail | **Resend + React Email** | Apenas transacional |
| IA | **Anthropic Claude** | `claude-sonnet-4-6` via Files API para PDFs; `claude-haiku-4-5-20251001` para classificação barata |
| Observabilidade | **Sentry + Axiom + OTel→Grafana Cloud + PostHog** | Erros, logs, traces, analytics/feature flags |
| Hospedagem | **Vercel** (web) + **Fly.io `gru`** (api/worker/scraper) | Baixa latência BR para usuários e scraping |

---

## Arquitetura

```
Navegador → Next.js (Vercel) ↔ Clerk
              │
              ▼ tRPC/REST
         NestJS API (Fly gru) ↔ Postgres+PostGIS+pgvec (Neon)
              │
       ┌──────┴────────┐
       ▼               ▼
  BullMQ (Redis)   Cloudflare R2 (PDFs/recibos)
       │
   ┌───┼─────────────┐
   ▼   ▼             ▼
 Scraper        Analisador      Notificador
 (Playwright)   (Claude         (Resend)
   │            Sonnet 4.6)
   ▼               │
 Caixa /           ▼
 Santander    API Anthropic
```

---

## Modelo de Dados (tabelas principais)

`tenants`, `users`, `auctions`, `properties` (com `geom geography(Point,4326)`), `listings` (matview), `saved_searches`, `pdf_documents` (kind = edital/matricula/comprovante, com `claude_file_id`), `analyses` (extracted jsonb + confiança por campo + citações), `viability_calculations`, `assets`, `kanban_columns`, `asset_costs`, `asset_dre_snapshots`, `audit_log`.

Índices-chave: `GIST(geom)`, `BTREE(end_at) WHERE status='open'` parcial, `IVFFLAT` em embeddings.

---

## Módulos

### Módulo A — Agregador
- **Endpoints:** `GET /listings?bbox=…`, `GET /map/clusters?bbox=&zoom=` (PostGIS `ST_ClusterDBSCAN`), `POST /saved-searches`.
- **Jobs:** `scrape:caixa` 30 min, `scrape:santander` 60 min, `geocode-pending` 5 min, `index-listings` após cada scrape.
- **Stack:** `playwright-extra` + stealth, `cheerio`, `bottleneck`, proxies residenciais (Bright Data BR) somente se houver escalada anti-bot. Preferir o XHR JSON descobrível do Santander a usar Playwright.
- **UI:** `<MapView/>`, `<FiltersDrawer/>`, `<ListingCard/>` com badge de fase (1º/2º/Venda Direta).

### Módulo B — Analista IA de Edital/Matrícula
- **Fluxo:** upload pré-assinado → ClamAV → Anthropic Files API → enfileira `analyze:edital|matricula` → Claude Sonnet 4.6 com schema estrito de tool-use → grava linha em `analyses`.
- **Schema (validado por zod, registrado como tool):** `gravames[] (penhora|hipoteca|usufruto|arrolamento)`, `area_util_m2`, `ex_owner` (CPF mascarado), `passivos_impeditivos[] (severidade: baixa|media|alta)`, `desocupacao`. Cada folha = `{value, confidence 0..1, citation: {page, quote}}`.
- **Pré-classificação** com Haiku + `pdfjs` para evitar Sonnet em documentos baratos.
- **Revisão humana** dispara quando `confidence < 0.75`, severidade alta, ou divergência com o leilão extraído.
- **UI:** `<AnalysisReport/>` com `react-pdf` lado-a-lado e destaque de citações.

### Módulo C — Calculadora de Viabilidade (ROI)
- Função pura em `packages/shared/viability.ts` — mesmo código no web (preview instantâneo) e na api (autoritativo).
- Inputs: arremate, comissão (default 5%), ITBI, escritura, registro, custas judiciais, reforma. Outputs: lucro líquido, ROI%, payback em meses.
- `<RoiBreakdown/>` em waterfall (Recharts) + `<SensitivityTable/>` (±10% arremate, ±20% reforma).

### Módulo D — CRM Pós-Arremate (Kanban + DRE)
- `<KanbanBoard/>` com `@dnd-kit/core`, lexorank string para posição.
- `assets` derivam de `properties` via botão "Tornar ativo" — copia última viabilidade como baseline de aquisição.
- `asset_costs` com upload de comprovante (R2 → ClamAV → linkado de volta).
- `<DreTable/>` exportável para PDF (renderer `react-pdf`) e XLSX (`exceljs`).

---

## Ordem de Construção (faixas paralelas)

1. **Semanas 0–1 — Fundação (sequencial):** Turborepo, Clerk, Postgres+PostGIS, Prisma, CI, deploy stubs.
2. **Faixa A (S2–6):** Módulo A — scraping + mapa + listagens.
3. **Faixa B (S2–5, paralela):** Módulo C — calculadora pura (lead-magnet).
4. **Faixa C (S4–8):** Módulo B — analista IA (depende de storage de PDF existir).
5. **Faixa D (S6–10):** Módulo D — Kanban/DRE (depende do Módulo A estável).

Beta na S8 (A+C prontos, B em beta privado). GA na S12.

---

## Arquivos Críticos (no novo repositório)

- `packages/db/prisma/schema.prisma` — modelo de dados canônico.
- `apps/scraper/src/sources/caixa.ts` — scraper Caixa + dedupe (âncora do Módulo A).
- `apps/worker/src/jobs/analyze-edital.ts` — Claude Sonnet 4.6 + Files API + tool-use (âncora do Módulo B).
- `packages/shared/src/viability.ts` — calculadora ROI pura compartilhada por web + api (âncora do Módulo C).
- `apps/web/src/app/(app)/kanban/page.tsx` — Kanban com `@dnd-kit` + drawer de DRE do ativo (âncora do Módulo D).

---

## Riscos

- **Termos de Uso de Scraping / LGPD:** os ToS de Caixa e Santander podem proibir automação; editais contêm CPFs. Mitigação: respeitar `robots.txt`, rate limits conservadores, User-Agent descritivo, mascarar CPFs na ingestão (`***.***.***-12`), RBAC + audit log nos campos de ex-proprietário, documentar base de legítimo interesse (LGPD Art. 7º IX), SOP de takedown, parecer jurídico antes do lançamento.
- **Escalada anti-bot:** orçamento para proxies residenciais + Playwright stealth + fallback de "import por CSV" para o produto continuar funcionando em quedas.
- **Qualidade de OCR em matrículas faxadas:** pré-classificar com Haiku + pdfjs; nunca confiar automaticamente em campos de gravame com confidence < 0.75.
- **Performance do mapa com >50k pinos:** clustering server-side via PostGIS, base `pmtiles`, paginação no grid.
- **Scope creep:** quatro módulos na Fase 1 — critérios de aceite estritos por módulo, feature freeze 2 semanas antes do GA.

---

## Bootstrap do Repositório (comandos a executar, em ordem)

```bash
mkdir arremataai && cd arremataai && git init
pnpm dlx create-turbo@latest . --package-manager pnpm

# Apps
pnpm dlx create-next-app@latest apps/web --ts --app --tailwind --src-dir --import-alias "@/*"
pnpm dlx @nestjs/cli new apps/api --package-manager pnpm --strict
mkdir -p apps/worker apps/scraper

# Pacotes compartilhados
mkdir -p packages/{db,shared,ui,ai}
pnpm -F @arremataai/db add prisma @prisma/client
pnpm -F @arremataai/db exec prisma init --datasource-provider postgresql
pnpm -F @arremataai/shared add zod
pnpm -F @arremataai/ai add @anthropic-ai/sdk

# API
pnpm -F api add @nestjs/platform-fastify @nestjs/config @nestjs/throttler bullmq ioredis @clerk/backend pino-http

# Worker / Scraper
pnpm -F worker add bullmq ioredis @anthropic-ai/sdk pino zod
pnpm -F scraper add playwright playwright-extra puppeteer-extra-plugin-stealth cheerio bottleneck p-queue
pnpm dlx playwright install --with-deps chromium

# Web
pnpm -F web add @clerk/nextjs maplibre-gl @turf/turf @dnd-kit/core react-pdf recharts react-hook-form @hookform/resolvers resend react-email exceljs

# Tooling
pnpm -w add -D turbo typescript @types/node eslint prettier vitest tsx

# Extensões do Postgres (uma vez)
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Targets de deploy
pnpm dlx vercel link
fly launch --no-deploy -a arremataai-api
fly launch --no-deploy -a arremataai-worker
fly launch --no-deploy -a arremataai-scraper

# Segredos
fly secrets set DATABASE_URL=… REDIS_URL=… ANTHROPIC_API_KEY=… CLERK_SECRET_KEY=… R2_ACCESS_KEY_ID=…
vercel env add ANTHROPIC_API_KEY production
```

---

## Verificação (ponta-a-ponta)

1. **Fundação:** `pnpm turbo run build` verde; `prisma migrate deploy` contra Neon; endpoints de health de `apps/web` e `apps/api` respondendo em Vercel + Fly.
2. **Módulo A:** disparar `scrape:caixa` manualmente via bull-board → ao menos 100 linhas em `auctions` com `geom IS NOT NULL`; visão de mapa em `/imoveis` renderiza pinos clusterizados; filtro `uf=SP&minDiscount=30` retorna a contagem esperada.
3. **Módulo B:** subir um edital de exemplo → `pdf_documents.status='clean'` → Claude Sonnet 4.6 retorna `analyses.extracted` válido contra o zod; citações apontam para as páginas corretas; campos com baixa confiança caem na fila de revisão.
4. **Módulo C:** chamar `/api/viability/simulate` com inputs de exemplo (arremate=300k, ITBI=3%, reforma=50k) → ROI determinístico, idêntico ao preview do web até o centavo.
5. **Módulo D:** arrastar um card de coluna no Kanban → atualização otimista + lexorank persistido; subir comprovante → linkado a `asset_costs`; `/assets/:id/dre?from=…` retorna totais consolidados consistentes com a soma de `asset_costs`.
6. **Smoke:** Sentry sem erros não-tratados em soak de 1h; PostHog captura `listing_viewed`, `viability_simulated`, `analysis_completed`, `asset_moved`.

---

## Fora de Escopo (Fase 1)

App mobile, modelos fine-tuned, marketplace/leilões hospedados por nós, integrações com cartórios, white-label, multi-moeda. Reavaliar pós-GA.
