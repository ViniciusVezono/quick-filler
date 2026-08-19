# Processo de implementação

Registro iniciado durante a implementação em 18/08/2026 e atualizado em 19/08/2026.

## Ferramentas e skills utilizadas

- Codex: leitura do plano, implementação, refatoração e validação local.
- `gstack`: skill roteadora usada para selecionar o fluxo adequado a cada solicitação e
  evitar a execução de pipelines que não correspondessem ao escopo da mudança.
- `design-html` (gstack): princípios de hierarquia, legibilidade e adaptação de viewport
  usados na tela plan-driven. O artefato Pretext de página única não foi copiado porque o
  plano exige uma aplicação React multiestado e declara um design system separado fora do
  escopo.
- `review` (gstack): revisão pré-integração do diff, aplicada depois das validações para
  procurar regressões estruturais antes do merge na `main`.
- npm/TypeScript/Vitest/Playwright: resolução das versões instaladas, tipos e regressões
  unitárias, de API e de fluxo completo.
- Docker: unidade reproduzível de API, web e PostgreSQL.

As skills `plan-eng-review`, `qa` e `ship` fazem parte do fluxo de desenvolvimento gstack e
são indicadas, respectivamente, para revisar decisões arquiteturais, executar ciclos de QA
com correção e preparar push/PR. Elas não são marcadas como executadas neste registro quando
o escopo já está definido, os E2E existentes cobrem a alteração ou não há autorização para
publicar o repositório.

Não foram usados subagentes, pois a sessão ativa não autorizava delegação. Após a solicitação
do autor, o versionamento passou a seguir Git Flow com branches `feature/*` ou `fix/*`, commits
convencionais por checkpoint e merge `--no-ff` na `main`. O push continua fora do fluxo local.

## Organização dos módulos web

Os módulos de revisão e comunicação com a API ficam diretamente em `apps/web/src`:

- `review/`: editores de cartão de ponto e holerite;
- `transcription/`: service HTTP e configuração de queries/mutations do TanStack Query.

A camada intermediária `features/` foi removida para evitar um nível de diretório sem função
arquitetural. As páginas continuam responsáveis apenas pela composição dos módulos.

## Correções de rota durante o trabalho

### 1. Corpus assumido pelo plano, mas ausente

O plano tratava `exemplos/` e oito PDFs como existentes. A busca encontrou apenas PDFs
pessoais com nomes diferentes. Reutilizá-los criaria PII no projeto e goldens sem relação
com a aceitação. A correção foi manter testes sintéticos, criar o local esperado e registrar
explicitamente que 8/8 goldens permanecem dependentes dos arquivos originais.

### 2. Bordas novas do Prisma 7

A primeira checagem encontrou três mudanças: o CLI exigia URL já ao carregar o config, o
runtime exige driver adapter e o campo JSON nulo usa `Prisma.JsonNull`. O código foi ajustado
sem esconder o erro com casts amplos. `bytea` recebeu uma cópia `Uint8Array` compatível.

### 3. Parser achatado por espaço simples

A primeira versão do holerite separava linhas apenas por quebra ou dois espaços. PDF.js
normaliza muitos documentos para uma sequência de tokens com um espaço, e o teste revelou
que nenhuma verba era emitida. O parser passou a segmentar pelo valor monetário terminal,
preservando código, descrição e referência quando presentes.

### 4. Regex com estado global

Uma regex global era usada em `test()` antes de `matchAll()`. O `lastIndex` fazia a primeira
data desaparecer, e o teste de cartão detectou a perda. A detecção agora cria regex sem
estado e a extração cria uma instância global exclusiva.

### 5. O host escondia dois erros do runtime Linux

O Docker revelou que o import nomeado de `tesseract.js` funcionava para tipos, mas não no
ESM real, e que `ValidationPipe` carregava `class-validator` apesar de toda validação já ser
feita por Zod. O import passou a usar o objeto default do Tesseract e o pipe redundante foi
removido. A imagem também passou a copiar explicitamente o `dist` do pacote compartilhado
e instalar OpenSSL para o Prisma.

## Decisões com mais de uma resposta razoável

1. **Prisma versus SQL direto.** Prisma foi mantido porque o plano o escolhia como default e
   o modelo é pequeno; SQL direto teria imagem menor e menos tooling no runtime.
2. **OCR local versus serviço externo.** Tesseract.js preserva privacidade e Docker único;
   um serviço gerenciado provavelmente teria precisão melhor, mas adicionaria credenciais,
   custo e envio de PII.
3. **PDF no banco versus object storage.** `bytea` torna refresh e demo autocontidos;
   object storage seria a escolha para volume e retenção reais.

## O que quebraria primeiro em produção

- restart perde jobs que estavam apenas na memória;
- OCR consome CPU e memória antes do PostgreSQL virar gargalo;
- download do idioma do Tesseract pode falhar em ambiente sem saída de rede;
- `bytea` aumenta rapidamente backup e I/O do banco;
- sem autenticação ou rate limit, o endpoint público não deve receber documentos reais.
