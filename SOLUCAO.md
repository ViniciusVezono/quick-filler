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

A solução prioriza o ciclo completo:

```text
upload
  → processamento assíncrono
  → extração por texto ou OCR
  → estratégia de layout
  → validação
  → revisão humana
  → correção e persistência
  → exportação
```

Quando houver conflito entre profundidade de suporte a um layout e o funcionamento do
ciclo inteiro, a solução prefere extração parcial e explícita a retornar dados inventados
ou eliminar etapas de revisão e correção.

## Como executar

### Docker

```bash
docker compose up --build
```

O Compose sobe PostgreSQL, executa a migration antes da API e só inicia a web quando o
healthcheck da API estiver saudável. A URL local é:

```text
http://localhost:8080
```

O ciclo de infraestrutura foi validado do zero em 18/08/2026: as duas imagens foram
construídas em Linux, a migration foi aplicada, os três healthchecks ficaram verdes e um
upload real confirmou o fluxo assíncrono `202 → processando → erro` para um documento
fora das estratégias reconhecidas.

Esse teste validou persistência, fila, consulta de status e tratamento explícito de layout
desconhecido. Ele não foi usado como teste de precisão dos extractors.

O projeto e o volume isolados usados nessa validação foram removidos depois do teste.

### Desenvolvimento

Requer Node 22 ou superior e PostgreSQL:

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## Como validar

A validação foi dividida entre regras isoladas, integração da API, fluxo da interface e
runtime final.

- **Vitest:** regras de domínio, parsers, transformações, persistência e contratos
  determinísticos.
- **Playwright:** os dois fluxos principais da interface, cobrindo upload, polling,
  edição estrutural, save e download com API mockada.
- **TypeScript:** checagem de incompatibilidades de tipos durante implementação e
  integração.
- **Docker:** validação do runtime Linux, migration, dependências nativas, healthchecks
  e comportamento da aplicação empacotada.

Os comandos exatos de lint, typecheck, testes e build devem ser executados pelos scripts
definidos no `package.json` do repositório. A validação do ambiente final pode ser repetida
com:

```bash
docker compose up --build
```

## API

O contrato HTTP principal é:

- `POST /api/transcricoes`
  - recebe `multipart/form-data` com `arquivo` e `tipo`;
  - persiste a transcrição em estado `processando`;
  - agenda o processamento;
  - retorna `202 { id }`.

- `GET /api/transcricoes/:id`
  - consulta `id`, `tipo`, `status`, `erro` e `value`.

- `PUT /api/transcricoes/:id`
  - recebe o `value` corrigido pela interface;
  - valida o schema de acordo com o tipo;
  - substitui a transcrição persistida sem alterar o PDF original.

- `GET /api/transcricoes/:id/planilha?formato=xlsx|csv|json`
  - exporta sempre o `value` atual, incluindo as correções humanas.

- `GET /api/transcricoes/:id/arquivo`
  - fornece o PDF original para o viewer da tela de revisão.

- `GET /healthz`
  - retorna sucesso quando a aplicação está operacional.

O contrato obrigatório permanece separado dos detalhes internos de aquisição, OCR,
estratégias e persistência.

## Contrato e domínio

`packages/domain` contém schemas Zod, tipos, normalização conservadora, warnings e o
modelo tabular. API e web não mantêm cópias dessas regras.

Dinheiro e conteúdo impresso permanecem como string. `?` é um valor legítimo de
incerteza e nunca é substituído silenciosamente por um caractere inferido.

A aquisição usa `PageInput` com:

- texto agregado;
- tokens;
- `bbox`;
- `confidence`, quando disponível;
- origem textual ou OCR.

Esses metadados são internos ao pipeline e não alteram o JSON público.

A estratégia recebe uma página física e pode devolver zero, um ou vários registros
lógicos:

```text
PhysicalPage → 0..N LogicalRecords
```

Assim, uma ficha financeira pode emitir diversas competências com o mesmo número público
de página.

Essa separação também evita assumir que toda página física corresponde exatamente a uma
linha da transcrição.

## Persistência

Prisma ORM 7 usa PostgreSQL com driver adapter `pg`.

A tabela `transcriptions` guarda:

- tipo;
- estado (`processando`, `concluido`, `erro`);
- mensagem de erro sanitizada, quando houver;
- `value` em JSONB, preservando ordem e formato documental;
- PDF original em `bytea`, necessário para revisão após refresh;
- tamanho do PDF;
- datas de criação e atualização;
- data de expiração.

Avisos, texto OCR e tokens intermediários não são persistidos.

Os avisos são derivados novamente do `value` após cada edição. Dessa forma, tela e
exportação usam a mesma fonte de verdade e uma correção do usuário pode remover ou criar
um warning sem precisar armazenar estado duplicado.

O uso de `bytea` é uma decisão de MVP. Ele simplifica a demonstração e evita uma segunda
infraestrutura para arquivos, mas não é a escolha recomendada para grande volume ou
retenção longa.

## PDF e OCR

PDF.js tenta primeiro a camada textual e preserva posição quando disponível.

A decisão de usar OCR é feita por página, não pelo documento inteiro. Uma página com
camada textual ausente ou insuficiente pode cair para OCR enquanto outras páginas do mesmo
PDF continuam usando extração textual.

```text
página
  ├─ texto suficiente → tokens PDF.js
  └─ texto insuficiente
       → renderização
       → Tesseract.js
       → TSV
       → tokens + bbox + confidence
```

O Tesseract.js devolve TSV, usado para reconstruir tokens, caixas e confiança.

O pipeline não corrige um dígito por inferência. Horários incertos mantêm `?`; datas e
competências impossíveis são rejeitadas pelo domínio.

Se a estratégia não encontrar sinais estruturais fortes o suficiente para associar
valores às colunas corretas, o processamento termina com erro legível em vez de devolver
uma transcrição aparentemente válida.

### Dependência dos dados de idioma

A primeira execução do idioma `por` pode precisar baixar os dados do Tesseract.

Para operação sem dependência externa de rede, esses dados devem ser empacotados na imagem
ou fornecidos por um cache controlado.

## Estratégias de extração

Cartão de ponto e holerite possuem registries separados de estratégias.

O desenho evita uma arquitetura de plugins. Cada estratégia segue um contrato simples,
equivalente a:

```text
{
  id,
  matches(page),
  extract(page)
}
```

A estratégia com sinais estruturais confiáveis realiza a extração. Helpers comuns ficam
compartilhados, mas layouts diferentes podem ter regras específicas sem criar classes,
factories ou injeção de dependência para cada documento.

O objetivo não é construir um parser universal. Um layout desconhecido deve ser recusado
explicitamente quando não houver confiança suficiente para associar os valores corretos.

## Processamento assíncrono

O runner em memória aceita por padrão dois jobs simultâneos.

O request de upload apenas:

1. valida o arquivo;
2. abre o PDF para detectar corrupção;
3. persiste bytes e metadata;
4. cria a transcrição em `processando`;
5. agenda o job;
6. retorna `202`.

O processamento pesado ocorre depois da resposta.

Cada job possui timeout. No bootstrap, jobs antigos ainda marcados como `processando`
passam para `erro` com orientação de reenvio, evitando registros presos para sempre.

Esse desenho é intencional para o MVP.

Para operação com jobs duráveis, o primeiro passo seria separar worker e API e utilizar uma
fila persistente com:

- claiming;
- retries;
- idempotência;
- recuperação de jobs abandonados;
- métricas.

## Revisão e exportação

A rota de revisão mostra o PDF e o modelo editável lado a lado.

O usuário pode:

- alterar células;
- adicionar ou remover dia;
- adicionar ou remover batida;
- adicionar ou remover verba;
- adicionar ou remover base;
- salvar e recarregar as correções;
- baixar XLSX, CSV ou JSON.

A correção estrutural é importante porque um OCR pode não apenas errar uma célula, mas
deixar de detectar um registro inteiro.

Se houver mudanças pendentes, o download aguarda o `PUT`. O endpoint de exportação lê
somente o `value` persistido, garantindo que o arquivo baixado reflita a revisão humana.

### XLSX

O XLSX aplica:

- cabeçalho `#173772`;
- amarelo para incerteza, estrutura ímpar ou registro vazio;
- vermelho para data ou competência não sequencial;
- precedência do vermelho quando as duas situações se aplicam.

### CSV e JSON

CSV e JSON carregam o mesmo conteúdo lógico, sem estilos visuais.

## Segurança e retenção

A aplicação implementa as proteções compatíveis com o escopo do desafio:

- validação da assinatura `%PDF-`;
- abertura real do documento para detectar corrupção;
- limite configurável de upload;
- CORS configurado por variável de ambiente;
- erros sanitizados;
- logs sem nome, CPF, salário ou texto do documento;
- retenção padrão de 24 horas;
- cleanup periódico de registros expirados;
- timeout configurável;
- concorrência global limitada.

Não há autenticação, conforme o escopo do desafio.

Por esse motivo, a aplicação demonstrativa não deve ser tratada como um serviço pronto para
receber documentos trabalhistas reais em escala.

## Cobertura e limites honestos

Os registries e o contrato físico/lógico têm testes sintéticos sem PII, incluindo o caso
de ficha financeira com várias competências por página física.

Os dois fluxos Playwright usam API mockada para verificar de forma determinística:

```text
upload
  → polling
  → revisão
  → edição estrutural
  → save
  → download
```

### Corpus oficial

O plano revisado previa os oito PDFs oficiais de `exemplos/` como corpus de aceitação e
oito goldens semânticos.

Esses oito arquivos originais não estavam disponíveis no workspace durante a implementação
final. Por isso:

- não foi possível fechar os 8/8 goldens contra o corpus oficial;
- não foi possível gerar e conferir as planilhas finais a partir desses oito documentos;
- PDFs pessoais encontrados no ambiente não foram usados como substitutos;
- nenhum documento pessoal foi copiado para o repositório.

Essa escolha evita PII e também evita criar uma falsa equivalência entre documentos
aleatórios e os arquivos efetivamente usados na avaliação.

A infraestrutura para esses testes permanece preparada. Quando os PDFs oficiais forem
colocados em `exemplos/`, cada arquivo deve receber seu fixture esperado e entrar na
regressão dos extractors e exportadores.

### Deploy público

Também não foi possível publicar uma URL sem credenciais e plataforma definidas.

O Docker permanece como unidade reproduzível de deploy, e o CORS já aceita configuração
da origem pública por variável de ambiente.

## Fora do escopo do desafio

Foram deliberadamente deixados fora do MVP:

- autenticação e autorização;
- rate limiting;
- antivírus;
- object storage;
- worker separado;
- fila durável;
- retry automático de processamento;
- recuperação automática de jobs interrompidos;
- histórico/listagem de transcrições;
- exclusão manual pela interface;
- rastreabilidade visual de célula para coordenada no PDF;
- autodetecção do tipo do documento;
- parser universal de layouts;
- design system;
- analytics;
- observabilidade completa de produção;
- deploy automatizado.

Esses itens aumentariam infraestrutura ou profundidade de produto sem melhorar
proporcionalmente o ciclo principal de transcrição dentro do limite de tempo do desafio.

A exceção importante é que coordenadas já são preservadas internamente quando úteis à
extração. O que fica fora do escopo é a funcionalidade visual de clicar numa célula e
destacar sua origem no PDF.

## Evolução de produção

Uma evolução para operação real seguiria aproximadamente esta ordem:

1. **Object storage criptografado**
   - substituir `bytea` para reduzir pressão de I/O, backup e tamanho do banco.

2. **Worker e fila durável**
   - separar processamento pesado da API;
   - adicionar retry, idempotência e recuperação de jobs.

3. **OCR autocontido e observável**
   - empacotar os dados de idioma;
   - medir tempo e falha por página;
   - registrar métricas sem conteúdo do documento.

4. **Proteções do upload**
   - rate limiting;
   - antivírus;
   - limites por usuário;
   - políticas de retenção por ambiente.

5. **Autenticação e auditoria**
   - controlar acesso aos documentos;
   - registrar eventos de revisão e download sem expor PII em logs comuns.

6. **Observabilidade sem PII**
   - latência de processamento;
   - falhas por estratégia/layout;
   - consumo de OCR;
   - jobs interrompidos;
   - expiração e cleanup.

7. **Expansão controlada do corpus**
   - adicionar layouts reais como fixtures autorizados;
   - manter regressão por estratégia;
   - medir explicitamente onde cada extractor deixa de generalizar.

## Resumo das decisões técnicas

As principais decisões do MVP foram:

- React/Vite no frontend;
- Nest.js na API;
- PostgreSQL como fonte de verdade;
- Prisma 7 para persistência;
- `jsonb` para o modelo documental;
- PDF em `bytea` no MVP;
- processamento assíncrono dentro do processo da API;
- concorrência limitada;
- PDF.js antes de OCR;
- Tesseract.js como fallback por página;
- `PageInput` com posição e confiança;
- `PhysicalPage → 0..N LogicalRecords`;
- registries simples de estratégias;
- Zod compartilhado em `packages/domain`;
- warnings derivados, não persistidos;
- correção estrutural na interface;
- XLSX, CSV e JSON derivados do mesmo `value`;
- erro explícito e `?` em vez de dados inventados.

O desenho foi deliberadamente mantido simples para concentrar o tempo do desafio na
precisão, revisão humana, comportamento de erro e fechamento do ciclo completo.
