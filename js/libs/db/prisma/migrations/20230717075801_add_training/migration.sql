-- CreateEnum
CREATE TYPE "TrainingJobTypes" AS ENUM ('FINETUNE');

-- CreateEnum
CREATE TYPE "ModelTypes" AS ENUM ('PRETRAINED', 'ADAPTER');

-- CreateEnum
CREATE TYPE "VisibilityTypes" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateTable
CREATE TABLE "TrainingJob" (
    "id" TEXT NOT NULL,
    "type" "TrainingJobTypes" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "parameters" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TrainingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "type" "ModelTypes" NOT NULL,
    "readyForInference" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "baseModelId" TEXT,
    "hfDatasetId" TEXT,
    "visibility" "VisibilityTypes" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptConfig" (
    "modelId" TEXT NOT NULL,
    "template" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Model_ownerId_key" ON "Model"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Model_baseModelId_key" ON "Model"("baseModelId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptConfig_modelId_key" ON "PromptConfig"("modelId");

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_baseModelId_fkey" FOREIGN KEY ("baseModelId") REFERENCES "Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_id_fkey" FOREIGN KEY ("id") REFERENCES "PromptConfig"("modelId") ON DELETE RESTRICT ON UPDATE CASCADE;
