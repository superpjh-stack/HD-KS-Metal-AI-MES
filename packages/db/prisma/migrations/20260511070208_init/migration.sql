-- CreateEnum
CREATE TYPE "LotType" AS ENUM ('MATERIAL', 'WIP', 'PRODUCT');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('ACTIVE', 'USED', 'REJECTED', 'SHIPPED');

-- CreateEnum
CREATE TYPE "WOStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "lotType" "LotType" NOT NULL,
    "materialId" TEXT,
    "supplierId" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" VARCHAR(10) NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_events" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "eventType" VARCHAR(30) NOT NULL,
    "machineId" TEXT,
    "workOrderId" TEXT,
    "operatorId" TEXT,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lot_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "machineCode" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "machineType" VARCHAR(30) NOT NULL,
    "lineId" TEXT,
    "manufacturer" VARCHAR(100),
    "model" VARCHAR(100),
    "plcAddress" VARCHAR(200),
    "installedAt" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_lines" (
    "id" TEXT NOT NULL,
    "lineCode" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "molds" (
    "id" TEXT NOT NULL,
    "moldCode" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "totalStrokes" INTEGER NOT NULL DEFAULT 0,
    "maxStrokes" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "molds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "woNumber" VARCHAR(30) NOT NULL,
    "productCode" VARCHAR(50) NOT NULL,
    "moldId" TEXT,
    "machineId" TEXT NOT NULL,
    "plannedQty" INTEGER NOT NULL,
    "producedQty" INTEGER NOT NULL DEFAULT 0,
    "defectQty" INTEGER NOT NULL DEFAULT 0,
    "status" "WOStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "operatorId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "materialCode" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "spec" TEXT,
    "unit" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "supplierCode" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_data" (
    "id" BIGSERIAL NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "machineId" TEXT NOT NULL,
    "channel" VARCHAR(30) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "quality" INTEGER NOT NULL DEFAULT 192,

    CONSTRAINT "sensor_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100),
    "roles" TEXT[],
    "keycloakId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" VARCHAR(200) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "resourceType" VARCHAR(50) NOT NULL,
    "resourceId" VARCHAR(100),
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lots_lotNumber_key" ON "lots"("lotNumber");

-- CreateIndex
CREATE INDEX "lot_events_lotId_idx" ON "lot_events"("lotId");

-- CreateIndex
CREATE INDEX "lot_events_occurredAt_idx" ON "lot_events"("occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "machines_machineCode_key" ON "machines"("machineCode");

-- CreateIndex
CREATE UNIQUE INDEX "production_lines_lineCode_key" ON "production_lines"("lineCode");

-- CreateIndex
CREATE UNIQUE INDEX "molds_moldCode_key" ON "molds"("moldCode");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_woNumber_key" ON "work_orders"("woNumber");

-- CreateIndex
CREATE INDEX "work_orders_machineId_status_idx" ON "work_orders"("machineId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "materials_materialCode_key" ON "materials"("materialCode");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplierCode_key" ON "suppliers"("supplierCode");

-- CreateIndex
CREATE INDEX "sensor_data_machineId_time_idx" ON "sensor_data"("machineId", "time" DESC);

-- CreateIndex
CREATE INDEX "sensor_data_time_idx" ON "sensor_data"("time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloakId_key" ON "users"("keycloakId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_occurredAt_idx" ON "audit_logs"("occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_events" ADD CONSTRAINT "lot_events_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_events" ADD CONSTRAINT "lot_events_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_events" ADD CONSTRAINT "lot_events_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_events" ADD CONSTRAINT "lot_events_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "production_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_moldId_fkey" FOREIGN KEY ("moldId") REFERENCES "molds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_data" ADD CONSTRAINT "sensor_data_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
