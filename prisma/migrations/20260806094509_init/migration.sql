-- CreateEnum
CREATE TYPE "HypothesisStatus" AS ENUM ('NEW', 'PLANNED', 'IN_PROGRESS', 'ACCEPTED', 'HOLD', 'DONE');

-- CreateEnum
CREATE TYPE "ConversionMetric" AS ENUM ('CR', 'LTV', 'CR_LTV');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DEV', 'EXPERIMENT', 'DONE');

-- CreateEnum
CREATE TYPE "ExperimentStage" AS ENUM ('DISCOVERY', 'DESIGN', 'DEVELOPMENT', 'EXPERIMENTATION', 'ANALYSIS');

-- CreateTable
CREATE TABLE "FunnelLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "funnelLevelId" TEXT,
    "conversion" "ConversionMetric" NOT NULL DEFAULT 'CR',
    "impact" INTEGER NOT NULL,
    "effort" DOUBLE PRECISION NOT NULL,
    "reach" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "HypothesisStatus" NOT NULL DEFAULT 'NEW',
    "result" TEXT,
    "comment" TEXT,
    "modeling" TEXT,
    "sampleSize" TEXT,
    "taskUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DEV',
    "author" TEXT,
    "targeting" TEXT,
    "segment" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "stage" "ExperimentStage",
    "hypothesisId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FunnelLevel_name_key" ON "FunnelLevel"("name");

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_funnelLevelId_fkey" FOREIGN KEY ("funnelLevelId") REFERENCES "FunnelLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "Hypothesis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
