ALTER TABLE "Subscription" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "Subscription" ADD COLUMN "customerId" TEXT NOT NULL DEFAULT '';
CREATE TABLE "BillingCheckout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "testMode" BOOLEAN NOT NULL,
  "transactionId" TEXT,
  "pendingKey" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BillingCheckout_transactionId_key" ON "BillingCheckout"("transactionId");
CREATE UNIQUE INDEX "BillingCheckout_pendingKey_key" ON "BillingCheckout"("pendingKey");
CREATE INDEX "BillingCheckout_userId_testMode_idx" ON "BillingCheckout"("userId", "testMode");
