# Corpus de aceitação

Os oito PDFs citados no plano (`payroll-01..04` e `time-card-01..04`) não estavam
presentes no diretório recebido em 18/08/2026. Por isso, nenhum golden foi inventado.

Quando os arquivos forem adicionados em `exemplos/`, cada fixture deve registrar o
JSON canônico revisado manualmente, a fonte por página (`text`/`ocr`), a estratégia
escolhida, a cardinalidade física/lógica, os warnings e as limitações observadas.

Os testes atuais cobrem os contratos e estratégias com `PageInput` sintético sem PII.
