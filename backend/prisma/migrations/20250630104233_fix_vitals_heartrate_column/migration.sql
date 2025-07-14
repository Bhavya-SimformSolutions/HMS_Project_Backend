/*
  Warnings:

  - You are about to drop the column `heartRate` on the `VitalSigns` table. All the data in the column will be lost.
  - Added the required column `heart_rate` to the `VitalSigns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VitalSigns" DROP COLUMN "heartRate",
ADD COLUMN     "heart_rate" TEXT NOT NULL;
