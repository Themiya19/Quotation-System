-- CreateTable
CREATE TABLE `Quotation` (
    `id` VARCHAR(191) NOT NULL,
    `quotationNo` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NOT NULL,
    `myCompany` VARCHAR(191) NULL,
    `project` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `pdfUrl` VARCHAR(191) NOT NULL,
    `annexureUrl` VARCHAR(191) NULL,
    `toAddress` VARCHAR(191) NOT NULL,
    `attn` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `emailTo` VARCHAR(191) NOT NULL,
    `emailCC` VARCHAR(191) NULL,
    `salesperson` VARCHAR(191) NULL,
    `customerReferences` VARCHAR(191) NULL,
    `paymentTerms` VARCHAR(191) NULL,
    `dueDate` VARCHAR(191) NULL,
    `discountType` VARCHAR(191) NOT NULL,
    `discountValue` VARCHAR(191) NOT NULL,
    `taxRate` VARCHAR(191) NOT NULL,
    `poNo` VARCHAR(191) NULL,
    `poFileUrl` VARCHAR(191) NULL,
    `internalStatus` VARCHAR(191) NOT NULL,
    `externalStatus` VARCHAR(191) NOT NULL,
    `actionHistory` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdByRole` VARCHAR(191) NULL,
    `createdByDepartment` VARCHAR(191) NULL,
    `creatorType` VARCHAR(191) NULL,
    `forDepartment` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `isRequested` BOOLEAN NULL,
    `clientApprovalDate` VARCHAR(191) NULL,
    `poNumber` VARCHAR(191) NULL,
    `poFile` VARCHAR(191) NULL,

    UNIQUE INDEX `Quotation_quotationNo_key`(`quotationNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationId` VARCHAR(191) NOT NULL,
    `system` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `qty` VARCHAR(191) NULL,
    `amount` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Term` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Term` ADD CONSTRAINT `Term_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
