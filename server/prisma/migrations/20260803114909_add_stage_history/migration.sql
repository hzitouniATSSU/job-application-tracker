/*
  Warnings:

  - You are about to drop the column `mimeType` on the `Document` table. All the data in the column will be lost.
  - Added the required column `mimetype` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "mimeType",
ADD COLUMN     "mimetype" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "StageHistory" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "previousStage" TEXT,
    "newStage" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageHistory_jobId_idx" ON "StageHistory"("jobId");

-- AddForeignKey
ALTER TABLE "StageHistory" ADD CONSTRAINT "StageHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
