CREATE TABLE "CtcDecoding" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rawInput" TEXT,
    "company" TEXT,
    "quotedCtc" DOUBLE PRECISION NOT NULL,
    "fixedComponent" DOUBLE PRECISION NOT NULL,
    "variableComponent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variablePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfEmployee" DOUBLE PRECISION NOT NULL,
    "pfEmployer" DOUBLE PRECISION NOT NULL,
    "gratuityAnnual" DOUBLE PRECISION NOT NULL,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esop" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowances" JSONB NOT NULL DEFAULT '[]',
    "grossMonthly" DOUBLE PRECISION NOT NULL,
    "netMonthly" DOUBLE PRECISION NOT NULL,
    "taxAnnual" DOUBLE PRECISION NOT NULL,
    "taxRegime" TEXT NOT NULL DEFAULT 'new',
    "effectiveCtc" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CtcDecoding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CtcDecoding_userId_createdAt_idx" ON "CtcDecoding"("userId", "createdAt");

ALTER TABLE "CtcDecoding" ADD CONSTRAINT "CtcDecoding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
