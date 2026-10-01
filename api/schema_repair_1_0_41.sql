-- SP-Manager 1.0.41 additive repair for the supplied SPCentral schema.
-- This script checks each table/column first and does not read or modify row data.
-- It is safe to import more than once. No DROP, DELETE, or data backfill is used.

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='purchases')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='purchases' AND column_name='data_json'),
  'ALTER TABLE `purchases` ADD COLUMN `data_json` LONGTEXT NULL', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='purchase_items')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='purchase_items' AND column_name='data_json'),
  'ALTER TABLE `purchase_items` ADD COLUMN `data_json` LONGTEXT NULL', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='products')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='products' AND column_name='metadata_json'),
  'ALTER TABLE `products` ADD COLUMN `metadata_json` LONGTEXT NULL', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='suppliers')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='suppliers' AND column_name='metadata_json'),
  'ALTER TABLE `suppliers` ADD COLUMN `metadata_json` LONGTEXT NULL', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='stock_movements')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='stock_movements' AND column_name='reference_no'),
  'ALTER TABLE `stock_movements` ADD COLUMN `reference_no` VARCHAR(150) NULL', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='end_of_day')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='end_of_day' AND column_name='report_number'),
  'ALTER TABLE `end_of_day` ADD COLUMN `report_number` INT UNSIGNED NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='end_of_day')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='end_of_day' AND column_name='total_transactions'),
  'ALTER TABLE `end_of_day` ADD COLUMN `total_transactions` INT UNSIGNED NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='end_of_day')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='end_of_day' AND column_name='report_json'),
  'ALTER TABLE `end_of_day` ADD COLUMN `report_json` LONGTEXT NULL', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='sale_items')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sale_items' AND column_name='warranty_enabled'),
  'ALTER TABLE `sale_items` ADD COLUMN `warranty_enabled` TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='sale_items')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sale_items' AND column_name='warranty_years'),
  'ALTER TABLE `sale_items` ADD COLUMN `warranty_years` INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='sale_items')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sale_items' AND column_name='maintenance_enabled'),
  'ALTER TABLE `sale_items` ADD COLUMN `maintenance_enabled` TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;

SET @sp1041_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='sale_items')
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='sale_items' AND column_name='maintenance_count'),
  'ALTER TABLE `sale_items` ADD COLUMN `maintenance_count` INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE sp1041_stmt FROM @sp1041_ddl; EXECUTE sp1041_stmt; DEALLOCATE PREPARE sp1041_stmt;
