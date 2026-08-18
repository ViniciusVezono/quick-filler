# Quick Filler

Aplicação para transcrever cartões de ponto e holerites em um fluxo completo:

`upload do PDF → processamento → revisão/correção → XLSX, CSV ou JSON`

## Execução local

1. Copie `.env.example` para `.env`.
2. Inicie um PostgreSQL e ajuste `DATABASE_URL`.
3. Rode:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Web: `http://localhost:5173`  
API: `http://localhost:3000`  
Healthcheck: `http://localhost:3000/healthz`

## Docker

```bash
docker compose up --build
```

A aplicação fica disponível em `http://localhost:8080`.

## Validação

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Consulte [SOLUCAO.md](./SOLUCAO.md) para arquitetura e limites e
[PROCESSO.md](./PROCESSO.md) para as decisões e incertezas da implementação.
