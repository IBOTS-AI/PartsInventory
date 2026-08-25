-- CreateTable
CREATE TABLE "tags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "locations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "locationType" TEXT NOT NULL DEFAULT 'other',
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1d5d70',
    "qrCode" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qrCode" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "manufacturer" TEXT,
    "manufacturerPartNumber" TEXT,
    "manufacturerUrl" TEXT,
    "sourceUrl" TEXT,
    "weightGrams" DECIMAL,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'each',
    "minimumQuantity" DECIMAL NOT NULL DEFAULT 0,
    "reorderQuantity" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "homeLocationId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "parts_homeLocationId_fkey" FOREIGN KEY ("homeLocationId") REFERENCES "locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "part_tags" (
    "partId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    PRIMARY KEY ("partId", "tagId"),
    CONSTRAINT "part_tags_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "part_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inventory_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partId" INTEGER NOT NULL,
    "locationId" INTEGER,
    "destinationId" INTEGER,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "notes" TEXT,
    "operatorName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_transactions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_transactions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_transactions_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "part_aliases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partId" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "part_aliases_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "part_suppliers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "supplierPartNumber" TEXT,
    "productUrl" TEXT,
    "unitPrice" DECIMAL,
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "part_suppliers_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "part_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "part_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partId" INTEGER NOT NULL,
    "imageType" TEXT NOT NULL,
    "localPath" TEXT,
    "externalUrl" TEXT,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "part_images_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "label_templates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'both',
    "showTag" BOOLEAN NOT NULL DEFAULT true,
    "showSku" BOOLEAN NOT NULL DEFAULT true,
    "showManufacturerNumber" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "showContents" BOOLEAN NOT NULL DEFAULT true,
    "showQrCode" BOOLEAN NOT NULL DEFAULT true,
    "accentColor" TEXT NOT NULL DEFAULT '#1d5d70',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_code_key" ON "tags"("code");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "locations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "locations_qrCode_key" ON "locations"("qrCode");

-- CreateIndex
CREATE INDEX "locations_parentId_idx" ON "locations"("parentId");

-- CreateIndex
CREATE INDEX "locations_locationType_idx" ON "locations"("locationType");

-- CreateIndex
CREATE UNIQUE INDEX "parts_qrCode_key" ON "parts"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "parts_sku_key" ON "parts"("sku");

-- CreateIndex
CREATE INDEX "parts_homeLocationId_idx" ON "parts"("homeLocationId");

-- CreateIndex
CREATE INDEX "parts_name_idx" ON "parts"("name");

-- CreateIndex
CREATE INDEX "parts_manufacturerPartNumber_idx" ON "parts"("manufacturerPartNumber");

-- CreateIndex
CREATE INDEX "part_tags_tagId_idx" ON "part_tags"("tagId");

-- CreateIndex
CREATE INDEX "inventory_locationId_idx" ON "inventory"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_partId_locationId_key" ON "inventory"("partId", "locationId");

-- CreateIndex
CREATE INDEX "inventory_transactions_partId_idx" ON "inventory_transactions"("partId");

-- CreateIndex
CREATE INDEX "inventory_transactions_locationId_idx" ON "inventory_transactions"("locationId");

-- CreateIndex
CREATE INDEX "inventory_transactions_createdAt_idx" ON "inventory_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "part_aliases_alias_idx" ON "part_aliases"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "part_aliases_partId_alias_key" ON "part_aliases"("partId", "alias");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "part_suppliers_supplierId_idx" ON "part_suppliers"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "part_suppliers_partId_supplierId_key" ON "part_suppliers"("partId", "supplierId");

-- CreateIndex
CREATE INDEX "part_images_partId_idx" ON "part_images"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "label_templates_name_key" ON "label_templates"("name");

-- CreateIndex
CREATE INDEX "label_templates_target_active_idx" ON "label_templates"("target", "active");
