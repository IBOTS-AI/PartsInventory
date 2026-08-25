/*
  Warnings:

  - You are about to alter the column `quantity` on the `inventory` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `quantity` on the `inventory_transactions` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `minimumQuantity` on the `parts` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `reorderQuantity` on the `parts` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - A unique constraint covering the columns `[qrCode]` on the table `locations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrCode]` on the table `parts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "inventory" ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "inventory_transactions" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locationType" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "qrCode" UUID;

-- AlterTable
ALTER TABLE "parts" ADD COLUMN     "homeLocationId" INTEGER,
ADD COLUMN     "manufacturerUrl" TEXT,
ADD COLUMN     "qrCode" UUID,
ALTER COLUMN "minimumQuantity" SET DEFAULT 0,
ALTER COLUMN "minimumQuantity" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "reorderQuantity" SET DEFAULT 0,
ALTER COLUMN "reorderQuantity" SET DATA TYPE DECIMAL(12,3);

-- CreateIndex
CREATE UNIQUE INDEX "locations_qrCode_key" ON "locations"("qrCode");

-- CreateIndex
CREATE INDEX "locations_locationType_idx" ON "locations"("locationType");

-- CreateIndex
CREATE UNIQUE INDEX "parts_qrCode_key" ON "parts"("qrCode");

-- CreateIndex
CREATE INDEX "parts_homeLocationId_idx" ON "parts"("homeLocationId");

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_homeLocationId_fkey" FOREIGN KEY ("homeLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
