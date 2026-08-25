-- CreateTable
CREATE TABLE "part_aliases" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_suppliers" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "supplierPartNumber" TEXT,
    "productUrl" TEXT,
    "unitPrice" DECIMAL(10,2),
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_images" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "imageType" TEXT NOT NULL,
    "localPath" TEXT,
    "externalUrl" TEXT,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_images_pkey" PRIMARY KEY ("id")
);

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

-- AddForeignKey
ALTER TABLE "part_aliases" ADD CONSTRAINT "part_aliases_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_suppliers" ADD CONSTRAINT "part_suppliers_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_suppliers" ADD CONSTRAINT "part_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_images" ADD CONSTRAINT "part_images_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
