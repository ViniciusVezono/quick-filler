CREATE TYPE "DocumentType" AS ENUM ('cartao_ponto', 'holerite');
CREATE TYPE "TranscriptionStatus" AS ENUM ('processando', 'concluido', 'erro');

CREATE TABLE "transcriptions" (
    "id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "TranscriptionStatus" NOT NULL DEFAULT 'processando',
    "error" TEXT,
    "value" JSONB,
    "pdf_data" BYTEA NOT NULL,
    "pdf_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transcriptions_status_updated_at_idx" ON "transcriptions"("status", "updated_at");
CREATE INDEX "transcriptions_expires_at_idx" ON "transcriptions"("expires_at");
