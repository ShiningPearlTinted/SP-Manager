-- SP-Manager Payment Type Customer Display image migration
-- Adds one nullable image reference field to the existing Payment Types master.
-- Existing payment records and IDs are preserved.
ALTER TABLE `payment_types`
  ADD COLUMN `customer_display_image` LONGTEXT NULL AFTER `sort_order`;
