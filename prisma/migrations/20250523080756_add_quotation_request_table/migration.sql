-- CreateTable
CREATE TABLE `QuotationRequest` (
    `id` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `project` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `userEmail` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationRequestActionHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationRequestId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuotationRequestActionHistory` ADD CONSTRAINT `QuotationRequestActionHistory_quotationRequestId_fkey` FOREIGN KEY (`quotationRequestId`) REFERENCES `QuotationRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
