-- SP-Manager 1.0.43 Quotation + Invoice migration
-- Central DB: u729423317_SPCentral
-- Backup database before importing.

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS valid_until DATETIME NULL AFTER quotation_date,
  ADD COLUMN IF NOT EXISTS data_json LONGTEXT NULL AFTER created_at;

ALTER TABLE quotation_items
  ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER product_name,
  ADD COLUMN IF NOT EXISTS warranty_text VARCHAR(150) NULL AFTER line_total,
  ADD COLUMN IF NOT EXISTS maintenance_text VARCHAR(150) NULL AFTER warranty_text;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS data_json LONGTEXT NULL AFTER created_at;

-- Prevent the same quotation from being converted to multiple invoices.
SET @has_uq_quote_invoice := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema=DATABASE() AND table_name='invoices' AND index_name='uq_invoice_quotation'
);
SET @sql := IF(@has_uq_quote_invoice=0,
  'ALTER TABLE invoices ADD UNIQUE KEY uq_invoice_quotation (outlet_id, quotation_id)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure document counters exist for both document types.
INSERT INTO document_counters(outlet_id,document_type,prefix,next_number)
SELECT id,'Quotation','QT-',1 FROM outlets
ON DUPLICATE KEY UPDATE prefix=COALESCE(NULLIF(prefix,''),'QT-');

INSERT INTO document_counters(outlet_id,document_type,prefix,next_number)
SELECT id,'Invoice','INV-',1 FROM outlets
ON DUPLICATE KEY UPDATE prefix=COALESCE(NULLIF(prefix,''),'INV-');
