-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_label_templates" (
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
    "borderThickness" INTEGER NOT NULL DEFAULT 22,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_label_templates" ("accentColor", "active", "createdAt", "id", "name", "showContents", "showLocation", "showManufacturerNumber", "showQrCode", "showSku", "showTag", "target", "updatedAt") SELECT "accentColor", "active", "createdAt", "id", "name", "showContents", "showLocation", "showManufacturerNumber", "showQrCode", "showSku", "showTag", "target", "updatedAt" FROM "label_templates";
DROP TABLE "label_templates";
ALTER TABLE "new_label_templates" RENAME TO "label_templates";
CREATE UNIQUE INDEX "label_templates_name_key" ON "label_templates"("name");
CREATE INDEX "label_templates_target_active_idx" ON "label_templates"("target", "active");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
