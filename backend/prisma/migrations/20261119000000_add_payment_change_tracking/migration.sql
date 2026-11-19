-- Counter checkout: record cash handed over and change given back.
-- Both columns are nullable, so existing payments are unaffected.
ALTER TABLE "order_payments" ADD COLUMN "amountTendered" DECIMAL(10,2),
ADD COLUMN "changeGiven" DECIMAL(10,2);

-- Daily book looks up payments by tenant and date.
CREATE INDEX "order_payments_tenantId_createdAt_idx" ON "order_payments"("tenantId", "createdAt");
