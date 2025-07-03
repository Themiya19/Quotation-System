/*
  Warnings:

  - You are about to alter the column `date` on the `Quotation` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.
  - You are about to alter the column `date` on the `QuotationRequest` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.

*/
-- AlterTable
ALTER TABLE `Quotation` MODIFY `date` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `QuotationRequest` MODIFY `date` DATETIME(3) NOT NULL;
