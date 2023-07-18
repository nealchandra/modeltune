/*
  Warnings:

  - You are about to drop the column `startedAt` on the `TrainingJob` table. All the data in the column will be lost.
  - Added the required column `userId` to the `TrainingJob` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TrainingJobStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingJobStepTypes" AS ENUM ('JOB_STARTED', 'JOB_FAILED', 'JOB_COMPLETED', 'JOB_CANCELLED', 'PREPARING_DATASET', 'TRAINING_STARTED', 'EPOCH_COMPLETED');

-- DropIndex
DROP INDEX "Model_baseModelId_key";

-- DropIndex
DROP INDEX "Model_ownerId_key";

-- AlterTable
ALTER TABLE "TrainingJob" DROP COLUMN "startedAt",
ADD COLUMN     "data" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "status" "TrainingJobStatus" NOT NULL DEFAULT 'STARTED',
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "TrainingJobStep" (
    "id" TEXT NOT NULL,
    "type" "TrainingJobStepTypes" NOT NULL,
    "trainingJobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "TrainingJobStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingJobLog" (
    "id" TEXT NOT NULL,
    "trainingJobId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingJobLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrainingJob" ADD CONSTRAINT "TrainingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingJobStep" ADD CONSTRAINT "TrainingJobStep_trainingJobId_fkey" FOREIGN KEY ("trainingJobId") REFERENCES "TrainingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingJobLog" ADD CONSTRAINT "TrainingJobLog_trainingJobId_fkey" FOREIGN KEY ("trainingJobId") REFERENCES "TrainingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
