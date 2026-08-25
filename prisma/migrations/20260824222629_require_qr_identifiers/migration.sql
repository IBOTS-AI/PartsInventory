/*
  Warnings:

  - Made the column `qrCode` on table `locations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `qrCode` on table `parts` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "locations" ALTER COLUMN "qrCode" SET NOT NULL;

-- AlterTable
ALTER TABLE "parts" ALTER COLUMN "qrCode" SET NOT NULL;
