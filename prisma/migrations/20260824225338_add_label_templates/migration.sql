-- CreateTable
CREATE TABLE "label_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'both',
    "showCategory" BOOLEAN NOT NULL DEFAULT true,
    "showSku" BOOLEAN NOT NULL DEFAULT true,
    "showManufacturerNumber" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "showContents" BOOLEAN NOT NULL DEFAULT true,
    "showQrCode" BOOLEAN NOT NULL DEFAULT true,
    "accentColor" TEXT NOT NULL DEFAULT '#1d5d70',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "label_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "label_templates_name_key" ON "label_templates"("name");

-- CreateIndex
CREATE INDEX "label_templates_target_active_idx" ON "label_templates"("target", "active");
