# Solução técnica

## Visão geral

O Quick Filler implementa o ciclo completo para cartão de ponto e holerite. A web envia
o PDF por `multipart/form-data`; a API persiste PDF e status, responde `202` e coloca o
identificador em uma fila limitada no próprio processo. O resultado canônico em JSON é a
única fonte para a revisão e para todos os formatos de exportação.

```text
React/Vite → Nest.js → PostgreSQL
                  ├─ PDF.js (texto e geometria)
                  ├─ Tesseract.js (fallback OCR por página)
                  ├─ registries de extração
                  └─ ExcelJS / CSV / JSON
```

## Como executar

### Docker

```bash
docker compose up --build
```

O Compose sobe PostgreSQL, executa a migration antes da API e só inicia a web quando o
healthcheck da API estiver saudável. A URL local é `http://localhost:8080`.

O ciclo de infraestrutura foi validado do zero em 18/08/2026: as duas imagens foram
construídas em Linux, a migration foi aplicada, os três healthchecks ficaram verdes e um
upload real percorreu `202 → processando → erro de layout não suportado`. O projeto e o
volume isolados do teste foram removidos depois da validação.

### Desenvolvimento

Requer Node 22 ou superior e PostgreSQL:

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## Contrato e domínio

`packages/domain` contém schemas Zod, tipos, normalização conservadora, warnings e o
modelo tabular. API e web não mantêm cópias dessas regras. Dinheiro e conteúdo impresso
permanecem como string; `?` é um valor legítimo de incerteza.

A aquisição usa `PageInput` com texto, tokens, `bbox` e `confidence`. A estratégia recebe
uma página física e pode devolver zero, um ou vários registros lógicos. Assim, uma ficha
financeira pode emitir diversas competências com o mesmo número público de página.

## Persistência

Prisma ORM 7 usa PostgreSQL com driver adapter `pg`. A tabela `transcriptions` guarda:

- tipo e estado (`processando`, `concluido`, `erro`);
- `value` em JSONB, preservando ordem e formato documental;
- PDF original em `bytea`, necessário para revisão após refresh;
- datas de criação, atualização e expiração.

Avisos, texto OCR e tokens intermediários não são persistidos. Os avisos são derivados
novamente do `value` após cada edição.

## PDF e OCR

PDF.js tenta primeiro a camada textual e preserva posição quando disponível. Uma página
com pouco conteúdo cai individualmente para OCR, sem obrigar o documento inteiro a ser
renderizado. O Tesseract.js devolve TSV, usado para reconstruir tokens, caixas e confiança.

O pipeline não corrige um dígito por inferência. Horários incertos mantêm `?`; datas e
competências impossíveis são rejeitadas pelo domínio. Layout sem sinais estruturais fortes
termina com erro legível.

Observação operacional: a primeira execução do idioma `por` pode precisar baixar os dados
do Tesseract. Em produção, esses dados devem ser empacotados na imagem ou servidos por um
cache controlado para eliminar essa dependência de rede.

## Processamento assíncrono

O runner em memória aceita por padrão dois jobs simultâneos. O request de upload só abre e
valida o PDF, persiste os bytes e retorna. Cada job possui timeout. No bootstrap, jobs antigos
ainda marcados como `processando` passam para `erro` com orientação de reenvio.

Esse desenho é intencional para o MVP. Em produção, o primeiro passo seria separar worker e
API e usar uma fila durável com claiming, retries, idempotência e métricas.

## Revisão e exportação

A rota de revisão mostra o PDF e o modelo editável lado a lado. O usuário pode:

- alterar células;
- adicionar/remover dia e batida;
- adicionar/remover verba e base;
- salvar e recarregar as correções;
- baixar XLSX, CSV ou JSON.

Se houver mudanças pendentes, o download aguarda o PUT. O XLSX aplica cabeçalho `#173772`,
amarelo para incerteza/estrutura ímpar/vazio e vermelho para não sequencial, com precedência
do vermelho. CSV e JSON carregam os mesmos dados sem estilo.

## Segurança e retenção

- assinatura `%PDF-`, abertura real e limite configurável de upload;
- CORS por variável de ambiente;
- erros sanitizados e logs sem nome, CPF, salário ou texto do documento;
- retenção padrão de 24 horas e cleanup periódico;
- timeout e concorrência global configuráveis;
- nenhuma autenticação, conforme o escopo do desafio.

## Cobertura e limites honestos

Os registries e o contrato físico/lógico têm testes sintéticos sem PII, incluindo ficha
financeira multi-competência. Os dois fluxos Playwright usam API mockada para verificar
upload, polling, edição estrutural, save e download.

Os oito PDFs `payroll-01..04` e `time-card-01..04` não estavam disponíveis no repositório
ou nos Downloads. Portanto, os oito goldens e as planilhas finais não foram fabricados.
Quando o corpus for fornecido, ele deve ser colocado em `exemplos/` e revisado visualmente
antes de versionar os goldens.

Também não foi possível publicar uma URL sem credenciais e plataforma definidas. O Docker
é a unidade de deploy e o CORS já aceita a origem pública via env.

## Evolução de produção

1. object storage criptografado em vez de `bytea`;
2. worker e fila durável com retry/idempotência;
3. dados OCR empacotados e OCR observável por página;
4. antivírus e rate limiting no upload;
5. autenticação e trilha de auditoria para documentos trabalhistas;
6. métricas sem PII para latência, falhas por layout e expiração.
