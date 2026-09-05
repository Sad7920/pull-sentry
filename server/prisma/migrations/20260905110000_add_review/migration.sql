-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "connectedRepoId" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "findings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_connectedRepoId_idx" ON "Review"("connectedRepoId");

-- CreateIndex
CREATE INDEX "Review_connectedRepoId_prNumber_idx" ON "Review"("connectedRepoId", "prNumber");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_connectedRepoId_fkey" FOREIGN KEY ("connectedRepoId") REFERENCES "ConnectedRepo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
