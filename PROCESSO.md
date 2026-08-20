# Processo de implementação

Registro iniciado durante a implementação em 18/08/2026 e atualizado em 19/08/2026.

Este documento registra como a solução foi construída, quais ferramentas e skills foram usadas, decisões tomadas durante o desenvolvimento, erros encontrados, correções de rota e os pontos em que ainda existe incerteza técnica.

## Ferramentas e skills utilizadas

- **Codex:** leitura do plano, implementação, refatoração e validação local.
- **`gstack`:** skill roteadora usada para selecionar o fluxo adequado a cada solicitação e evitar a execução de pipelines que não correspondessem ao escopo da mudança.
- **`/office-hours` (gstack):** originou o plano inicial de implementação, estruturando o problema, as restrições do desafio e a priorização do ciclo completo dentro do limite aproximado de 14 horas.
- **`/plan-eng-review` (gstack):** revisou o plano contra o enunciado e os PDFs de exemplo. A revisão alterou pontos relevantes da arquitetura:
  - os oito PDFs de exemplo passaram a ser tratados como corpus de aceitação;
  - uma página física passou a poder produzir de zero a vários registros lógicos;
  - o pipeline passou a preservar posição e confiança dos tokens quando disponíveis;
  - os editores passaram a permitir correção estrutural mínima;
  - as estratégias de layout foram simplificadas para um registry de funções, evitando uma arquitetura de plugins;
  - a estratégia de regressão foi definida como oito goldens semânticos mais dois fluxos E2E completos.
- **`design-html` (gstack):** princípios de hierarquia, legibilidade e adaptação de viewport usados na tela plan-driven. O artefato Pretext de página única não foi copiado porque o plano exige uma aplicação React multiestado e declara um design system separado fora do escopo.
- **`review` (gstack):** revisão pré-integração do diff, aplicada depois das validações para procurar regressões estruturais antes do merge na `main`.
- **npm / TypeScript / Vitest / Playwright:** resolução das versões instaladas, checagem de tipos e regressões unitárias, de API e de fluxo completo.
- **Docker:** unidade reproduzível de API, web e PostgreSQL e também ambiente que revelou diferenças entre o host de desenvolvimento e o runtime Linux final.

As skills `/qa` e `/ship` fazem parte do fluxo recomendado pelo gstack, mas não foram executadas nesta etapa. Os testes existentes foram executados diretamente com Vitest e Playwright, e não houve autorização para publicação do repositório pelo fluxo de `/ship`.

Não foram usados subagentes, pois a sessão ativa não autorizava delegação.

Após solicitação do autor, o versionamento passou a seguir Git Flow com branches `feature/*` ou `fix/*`, commits convencionais por checkpoint e merge `--no-ff` na `main`. O push continua fora do fluxo local.

## Organização dos módulos web

Os módulos de revisão e comunicação com a API ficam diretamente em `apps/web/src`:

- `review/`: editores de cartão de ponto e holerite;
- `transcription/`: service HTTP e configuração de queries/mutations do TanStack Query.

A camada intermediária `features/` foi removida para evitar um nível de diretório sem função arquitetural. As páginas continuam responsáveis apenas pela composição dos módulos.

Essa decisão foi mantida porque o escopo do desafio é pequeno e não havia benefício concreto em criar uma camada adicional apenas para reproduzir uma organização comum em projetos maiores.

## Topologia de Deploy (Ambiente de Testes)

Para validação do ciclo completo fora do ambiente local, a aplicação foi desmembrada para contornar limitações de instâncias gratuitas:

- **Banco de Dados:** PostgreSQL Serverless (Neon), otimizando o consumo de recursos quando ocioso.
- **API (NestJS):** Render (Web Service via Docker), utilizando o `Dockerfile` da aplicação com adequação de variáveis de ambiente (ex: `OMP_THREAD_LIMIT`) para evitar estouro de memória durante a execução do OCR.
- **Frontend (Vite/React):** Vercel, consumindo a API exposta via variável de ambiente injetada no processo de build e protegida por regras estritas de CORS no backend.

## Correções de rota durante o trabalho

### 1. Bordas novas do Prisma 7

A primeira checagem encontrou três mudanças de integração:

- o CLI exigia URL já ao carregar o config;
- o runtime exige driver adapter;
- o campo JSON nulo usa `Prisma.JsonNull`.

O código foi ajustado sem esconder incompatibilidades com casts amplos. O campo `bytea` recebeu uma cópia em `Uint8Array` compatível com o runtime.

**Detectado por:** typecheck, execução local e inicialização do runtime.
**Decisão:** adaptar o código aos contratos atuais do Prisma em vez de contornar os erros de tipo.

### 2. Parser de holerite achatado por espaço simples

A primeira versão do holerite separava linhas apenas por quebra de linha ou por dois espaços consecutivos.

Na prática, PDF.js normaliza muitos documentos para uma sequência de tokens separados por um único espaço. O teste revelou que nenhuma verba era emitida nesse formato.

O parser passou a segmentar registros pelo valor monetário terminal, preservando código, descrição e referência quando presentes.

**Detectado por:** teste automatizado do extractor.
**Decisão:** usar delimitadores observáveis no conteúdo em vez de depender da formatação textual produzida pelo PDF.js.

### 3. Regex com estado global no cartão de ponto

Uma regex global era usada em `test()` antes de `matchAll()`.

Como regexes globais mantêm `lastIndex`, a primeira data podia desaparecer da extração. O teste do cartão de ponto detectou a perda.

A detecção passou a usar uma regex sem estado, enquanto a etapa de extração cria uma instância global exclusiva para a iteração.

**Detectado por:** teste automatizado do extractor de cartão de ponto.
**Decisão:** separar regex de detecção e regex de iteração.

### 4. O host escondia dois erros do runtime Linux

O Docker revelou dois problemas que não apareciam da mesma forma no host:

1. o import nomeado de `tesseract.js` funcionava para tipos, mas não no ESM real;
2. `ValidationPipe` carregava `class-validator`, apesar de toda validação já ser feita por Zod.

O import passou a usar o objeto default do Tesseract e o pipe redundante foi removido. A imagem também passou a copiar explicitamente o `dist` do pacote compartilhado e instalar OpenSSL para o Prisma.

**Detectado por:** build e execução dentro do container Linux.
**Decisão:** tratar Docker como ambiente de validação real, não apenas como etapa final de empacotamento.

### 5. Divergência do padrão de estilização do frontend

A primeira implementação do frontend criou classes CSS intermediárias, embora o padrão adotado no projeto fosse Tailwind utility-first.

A divergência foi identificada durante a revisão do layout e corrigida imediatamente, removendo a camada paralela de estilos e voltando ao padrão Tailwind.

**Detectado por:** revisão visual e revisão do código gerado.
**Decisão:** manter o padrão Tailwind já adotado pelo projeto e evitar uma segunda convenção de estilização.

### 6. Contexto de Build em Monorepo na Nuvem

Durante o deploy no Render e na Vercel, a configuração padrão de apontar o `Root Directory` direto para as pastas isoladas (`apps/api` ou `apps/web`) quebrou o build, pois os serviços não encontravam o pacote compartilhado (`@quick-filler/domain`).

**Detectado por:** falha no log de deploy acusando pacote não encontrado ou ausência do compilador `tsc`.
**Decisão:** manter o diretório raiz dos deploys na raiz do monorepo e utilizar comandos explícitos de workspace (ex: `npm run build -w @quick-filler/domain && npm run build -w @quick-filler/web`) para garantir a compilação prévia das dependências globais.

### 7. Injeção Acidental de Markdown nas Variáveis de Ambiente

O frontend passou a apresentar erros de CORS (`Failed to fetch`) e erro genérico `404`, apesar da API estar rodando perfeitamente. O problema foi causado pela injeção da URL da API formatada acidentalmente como link Markdown (com colchetes e parênteses) nos painéis de variáveis de ambiente.

**Detectado por:** inspeção da aba Network do navegador (URL malformada e erro `strict-origin-when-cross-origin`).
**Decisão:** limpar a formatação dos painéis de CI/CD, garantindo strings estritas sem barras finais, e forçar o redeploy para reembutir as variáveis estáticas no processo do Vite.

## Trechos reescritos manualmente e por quê

### Parser de holerite
A primeira abordagem assumia que o texto extraído preservaria separação por linhas ou espaços repetidos. Depois de observar a saída real do PDF.js e o teste sem verbas, a segmentação foi reescrita para usar o valor monetário terminal como delimitador de registro. A mudança foi manual porque dependia de interpretar o comportamento real do parser.

### Extração de datas do cartão de ponto
A lógica foi reescrita depois de identificar que uma regex global estava sendo reutilizada entre `test()` e `matchAll()`. A correção separou a regex de detecção da de iteração, removendo a dependência de `lastIndex`.

### Estilização do frontend
A revisão foi feita manualmente para remover uma camada de classes CSS intermediárias e retornar ao modelo utility-first do Tailwind.

### Integração com Tesseract no runtime
O import que passava no ambiente de tipos não correspondia ao comportamento ESM real. O trecho foi ajustado a partir da execução no Docker, privilegiando o comportamento observável.

## Decisões com mais de uma resposta razoável

### 1. Prisma versus SQL direto
**Escolha:** Prisma.
Prisma foi mantido porque o plano o escolhia como default e o modelo de dados é pequeno. SQL direto teria imagem menor e menos tooling, mas aumentaria o trabalho manual de migrations, queries e tipagem em um tempo limitado.

### 2. OCR local versus serviço externo
**Escolha:** Tesseract.js.
Preserva privacidade e mantém a solução autocontida. Um serviço gerenciado teria precisão melhor, mas adicionaria credenciais e envio de PII para terceiros.

### 3. PDF no banco versus object storage
**Escolha:** PostgreSQL `bytea`.
Torna refresh, revisão e demo autocontidos. Object storage seria ideal para volume e operação real, mas acrescentaria uma dependência externa desnecessária para a avaliação principal.

### 4. Estratégias por funções versus classes por layout
**Escolha:** registry simples de funções.
As estratégias usam funções explícitas em vez de injeção de dependência para cada formato, evitando transformar exemplos num sistema de plugins prematuro.

### 5. Profundidade de extractor versus ciclo completo
**Escolha:** preservar o ciclo completo.
A solução aceita extração parcial e explícita em vez de sacrificar upload, validação, revisão e persistência.

## Onde eu não confio totalmente na entrega

### OCR de baixa qualidade
OCR continua sendo a parte de menor previsibilidade. Documentos com baixa resolução, carimbos ou ruído podem produzir registros parciais. A regra é preferir incerteza explícita a devolver um valor aparentemente correto e inventado.

### Generalização dos parsers
As estratégias foram construídas para serem explícitas e separadas por layout. Documentos muito diferentes dos padrões cobertos podem exigir uma nova estratégia.

### Processamento em memória
O processamento assíncrono dentro do Nest é suficiente para o desafio, mas não considero apropriado para jobs duráveis em produção (sujeitos a reinicializações abruptas).

## O que quebraria primeiro em produção

- **Jobs em memória:** um restart perde execuções que ainda não haviam sido finalizadas. O bootstrap consegue marcar transcrições antigas como erro, mas não retoma o processamento. *(Comportamento validado na prática durante o deploy em instâncias serverless gratuitas, onde o processo é morto abruptamente antes do catch ser resolvido).*
- **CPU e memória do OCR:** OCR tende a pressionar CPU e memória antes do PostgreSQL se tornar o principal gargalo. *(Observado no plano gratuito do Render: o pico de consumo de RAM do Tesseract ultrapassa rapidamente 512MB, resultando em OOM Kill (Out of Memory) e travamento do status do banco).*
- **Dados de idioma do Tesseract:** o download ou carregamento do idioma pode falhar em um ambiente sem saída de rede ou sem o artefato previamente empacotado.
- **PDF armazenado como `bytea`:** volume de PDFs aumenta rapidamente backup, I/O e tamanho do banco.
- **Endpoint público:** sem autenticação ou rate limit, a aplicação demonstrativa não deve receber documentos reais em escala.
- **Retenção:** qualquer falha no cleanup aumenta o tempo em que PII permanece armazenada.
- **Layouts desconhecidos:** um documento fora das estratégias conhecidas deve falhar explicitamente em vez de tentar se encaixar em um parser incorreto.

## Como a IA foi usada

A IA foi usada principalmente como acelerador de implementação, revisão e exploração de alternativas. O fluxo adotado não tratou a saída do agente como autoridade final. Sugestões foram verificadas por:

- typecheck;
- testes unitários, de API e E2E;
- execução em Docker e Deploy em nuvem;
- inspeção visual do frontend;
- comparação com o plano e os contratos do desafio.

A utilidade do agente esteve na velocidade para propor e alterar código, enquanto a confiança veio de executar, observar e revisar o resultado localmente e na nuvem.

## O que eu faria diferente com mais tempo

1. Empacotaria os dados de idioma usados pelo OCR na imagem para eliminar dependência de rede em runtime.
2. Adicionaria rate limiting antes de expor o endpoint para uso real.
3. Migraria jobs duráveis para uma fila persistente com worker separado (ex: Redis + BullMQ).
4. Migraria PDFs para object storage (S3) caso a retenção ou o volume deixassem de ser apenas de demonstração.

## Estado final do processo

A implementação terminou com o ciclo principal estruturado para:

```text
upload
  -> processamento assíncrono
  -> extração por texto ou OCR
  -> estratégia de layout
  -> validação
  -> revisão humana
  -> correção e persistência
  -> exportação
