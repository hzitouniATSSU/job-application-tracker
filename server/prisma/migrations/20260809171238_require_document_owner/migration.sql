/*
  Warnings:

  - Made the column `userId` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "userId" SET NOT NULL;
