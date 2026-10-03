-- SP-MANAGER CENTRAL MASTER DATABASE MIGRATION 1.0.41
-- Target: u729423317_SPCentral
-- Purpose: consolidate the duplicate master records visible in the supplied 2026-10-02 dump.
-- LOCK: Master Data = CENTRAL; operational Stock/Sales/etc remain outlet_id scoped.
-- IMPORTANT: take a DB backup before running. This script is intentionally conservative.

START TRANSACTION;

-- =========================================================
-- 1) PRODUCT MASTER: merge the known duplicate SKU 100001
--    Canonical Product = id 4; duplicate created for SP02 = id 5.
--    Guard makes these statements no-op unless both rows are the same SKU.
-- =========================================================
SET @merge_product_5_to_4 := (
  SELECT CASE WHEN
    EXISTS(SELECT 1 FROM products WHERE id=4 AND sku='100001')
    AND EXISTS(SELECT 1 FROM products WHERE id=5 AND sku='100001')
  THEN 1 ELSE 0 END
);

UPDATE invoice_items       SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE maintenance         SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE open_order_items    SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE product_barcodes    SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE product_images      SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE product_outlets     SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE product_prices      SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE promotions          SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE purchase_items      SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE quotation_items     SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE sale_items          SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE sale_refund_items   SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE stock_movements     SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
UPDATE warranties          SET product_id=4 WHERE product_id=5 AND @merge_product_5_to_4=1;
DELETE FROM products WHERE id=5 AND @merge_product_5_to_4=1;

-- Product identity/master fields are global. outlet_id is retained in the schema
-- only for backward compatibility, but Central Product Master rows no longer own an outlet.
UPDATE products SET outlet_id=NULL;

-- Per-outlet Product rows keep only operational state. Price/cost are now read from products.
UPDATE product_outlets SET selling_price=NULL, cost_price=NULL, allow_price_change=NULL;

-- =========================================================
-- 2) CATEGORY MASTER: merge duplicate Tinted Film category
-- =========================================================
SET @merge_category_2_to_1 := (
  SELECT CASE WHEN
    EXISTS(SELECT 1 FROM product_categories WHERE id=1 AND category_name='Tinted Film')
    AND EXISTS(SELECT 1 FROM product_categories WHERE id=2 AND category_name='Tinted Film')
  THEN 1 ELSE 0 END
);
UPDATE products       SET category_id=1 WHERE category_id=2 AND @merge_category_2_to_1=1;
UPDATE product_groups SET category_id=1 WHERE category_id=2 AND @merge_category_2_to_1=1;
DELETE FROM product_categories WHERE id=2 AND @merge_category_2_to_1=1;
UPDATE product_categories SET outlet_id=NULL;

-- =========================================================
-- 3) PRODUCT GROUP MASTER: consolidate duplicated SP02 group tree
--    Existing SP01 ids are preserved to avoid breaking old references.
-- =========================================================
UPDATE products SET group_id=2 WHERE group_id=10; -- Windscreen
UPDATE products SET group_id=4 WHERE group_id=11; -- Tinted Film
UPDATE products SET group_id=9 WHERE group_id=12; -- Security
UPDATE products SET group_id=7 WHERE group_id=13; -- Protection
UPDATE products SET group_id=5 WHERE group_id=14; -- Glass
UPDATE products SET group_id=3 WHERE group_id=15; -- Sputter
UPDATE products SET group_id=8 WHERE group_id=16; -- Standard
UPDATE products SET group_id=1 WHERE group_id=17; -- Premium

UPDATE product_groups SET parent_id=2 WHERE parent_id=10;
UPDATE product_groups SET parent_id=4 WHERE parent_id=11;
UPDATE product_groups SET parent_id=9 WHERE parent_id=12;
UPDATE product_groups SET parent_id=7 WHERE parent_id=13;
UPDATE product_groups SET parent_id=5 WHERE parent_id=14;
UPDATE product_groups SET parent_id=3 WHERE parent_id=15;
UPDATE product_groups SET parent_id=8 WHERE parent_id=16;
UPDATE product_groups SET parent_id=1 WHERE parent_id=17;

DELETE FROM product_groups WHERE id IN (10,11,12,13,14,15,16,17);
UPDATE product_groups SET outlet_id=NULL;

-- =========================================================
-- 4) PAYMENT TYPE MASTER: remove the copied SP02 Cash row.
--    sale_payments remains linked to the canonical central Cash record.
-- =========================================================
SET @merge_payment_4_to_1 := (
  SELECT CASE WHEN
    EXISTS(SELECT 1 FROM payment_types WHERE id=1 AND LOWER(payment_name)='cash')
    AND EXISTS(SELECT 1 FROM payment_types WHERE id=4 AND LOWER(payment_name)='cash')
  THEN 1 ELSE 0 END
);
UPDATE sale_payments SET payment_type_id=1 WHERE payment_type_id=4 AND @merge_payment_4_to_1=1;
DELETE FROM sp_relational_sync WHERE state_key='paymentTypes' AND db_id=4 AND @merge_payment_4_to_1=1;
DELETE FROM payment_types WHERE id=4 AND @merge_payment_4_to_1=1;

-- =========================================================
-- 5) CUSTOMER MASTER -> SUPPLIER ROLE BRIDGE
--    Customer Master remains the source of truth. The suppliers table is retained
--    only as a backward-compatible purchase FK/role projection. No manual duplicate
--    supplier entry is required.
-- =========================================================
INSERT INTO suppliers (outlet_id,supplier_code,supplier_name,phone,email,address,active,metadata_json)
SELECT
  c.outlet_id,
  COALESCE(NULLIF(c.code,''),CONCAT('CUST-',c.id)),
  c.name,
  c.phone,
  c.email,
  CONCAT_WS(', ',NULLIF(c.building_number,''),NULLIF(c.street_name,''),NULLIF(c.additional_street_name,''),NULLIF(c.district,''),NULLIF(c.postal_code,''),NULLIF(c.city,''),NULLIF(c.state,''),NULLIF(c.country,'')),
  CASE WHEN c.enabled=1 THEN 1 ELSE 0 END,
  CONCAT('{"customerId":',c.id,',"source":"Customer Master"}')
FROM customers c
WHERE c.is_supplier=1
  AND NOT EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.outlet_id=c.outlet_id
      AND (s.supplier_code=c.code OR s.metadata_json LIKE CONCAT('%"customerId":',c.id,'%'))
  );

UPDATE suppliers s
JOIN customers c ON c.outlet_id=s.outlet_id
 AND (s.supplier_code=c.code OR s.metadata_json LIKE CONCAT('%"customerId":',c.id,'%'))
SET s.supplier_code=COALESCE(NULLIF(c.code,''),CONCAT('CUST-',c.id)),
    s.supplier_name=c.name,
    s.phone=c.phone,
    s.email=c.email,
    s.address=CONCAT_WS(', ',NULLIF(c.building_number,''),NULLIF(c.street_name,''),NULLIF(c.additional_street_name,''),NULLIF(c.district,''),NULLIF(c.postal_code,''),NULLIF(c.city,''),NULLIF(c.state,''),NULLIF(c.country,'')),
    s.active=CASE WHEN c.is_supplier=1 AND c.enabled=1 THEN 1 ELSE 0 END,
    s.metadata_json=CONCAT('{"customerId":',c.id,',"source":"Customer Master"}');

-- Legacy per-outlet product_prices are intentionally preserved for audit/history,
-- but the updated API no longer reads/writes them as the online base selling price.

COMMIT;

-- =========================================================
-- POST-MIGRATION CHECKS
-- =========================================================
SELECT id,outlet_id,sku,product_name,cost_price,selling_price,active FROM products ORDER BY id;
SELECT id,outlet_id,category_name,active FROM product_categories ORDER BY id;
SELECT id,outlet_id,category_id,parent_id,group_name,active FROM product_groups ORDER BY id;
SELECT product_id,outlet_id,stock_qty,min_stock,last_purchase_price FROM product_outlets ORDER BY product_id,outlet_id;
SELECT id,outlet_id,payment_code,payment_name,enabled FROM payment_types ORDER BY id;
