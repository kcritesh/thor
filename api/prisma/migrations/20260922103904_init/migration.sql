-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('RECEIVED', 'ANALYSING', 'READY_FOR_REVIEW', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('DOCUMENT_REQUEST', 'INFORMATION_REQUEST', 'COMPLAINT', 'TECHNICAL_ISSUE', 'GENERAL_INQUIRY', 'OTHER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AnalysisErrorType" AS ENUM ('TIMEOUT', 'INVALID_OUTPUT', 'PROVIDER_ERROR');

-- CreateTable
CREATE TABLE "work_items" (
    "id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "WorkItemStatus" NOT NULL DEFAULT 'RECEIVED',
    "category" "Category",
    "priority" "Priority",
    "summary" TEXT,
    "recommended_action" TEXT,
    "last_error" TEXT,
    "analysed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_attempts" (
    "id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_type" "AnalysisErrorType",
    "error_message" TEXT,
    "raw_output" TEXT,
    "model" TEXT NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_items_external_id_key" ON "work_items"("external_id");

-- CreateIndex
CREATE INDEX "work_items_status_created_at_idx" ON "work_items"("status", "created_at");

-- CreateIndex
CREATE INDEX "analysis_attempts_work_item_id_created_at_idx" ON "analysis_attempts"("work_item_id", "created_at");

-- AddForeignKey
ALTER TABLE "analysis_attempts" ADD CONSTRAINT "analysis_attempts_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
