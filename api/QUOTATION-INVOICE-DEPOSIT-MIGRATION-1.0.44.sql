-- SP-Manager 1.0.44 Quotation + Invoice + Deposit migration
-- Central DB: u729423317_SPCentral
-- BACKUP DATABASE BEFORE IMPORTING.
-- Safe to run after 1.0.43 migration. Uses IF NOT EXISTS where supported by current MariaDB.

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS valid_until DATETIME NULL AFTER quotation_date,
  ADD COLUMN IF NOT EXISTS data_json LONGTEXT NULL AFTER created_at;

ALTER TABLE quotation_items
  ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER product_name,
  ADD COLUMN IF NOT EXISTS warranty_text VARCHAR(150) NULL AFTER line_total,
  ADD COLUMN IF NOT EXISTS maintenance_text VARCHAR(150) NULL AFTER warranty_text;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS data_json LONGTEXT NULL AFTER created_at;

-- One quotation may only produce one invoice per outlet.
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

-- Payments received before/against an invoice (deposit / advance payment).
-- This is separate from sale_payments because a quotation deposit exists before a POS sale exists.
CREATE TABLE IF NOT EXISTS document_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  outlet_id BIGINT UNSIGNED NOT NULL,
  quotation_id BIGINT UNSIGNED NULL,
  invoice_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NULL,
  payment_type_id BIGINT UNSIGNED NULL,
  payment_type_name VARCHAR(100) NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  reference_no VARCHAR(150) NULL,
  notes TEXT NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_document_payments_outlet (outlet_id),
  KEY idx_document_payments_quotation (quotation_id),
  KEY idx_document_payments_invoice (invoice_id),
  KEY idx_document_payments_customer (customer_id),
  KEY idx_document_payments_type (payment_type_id),
  CONSTRAINT fk_document_payments_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
  CONSTRAINT fk_document_payments_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id),
  CONSTRAINT fk_document_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_document_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_document_payments_type FOREIGN KEY (payment_type_id) REFERENCES payment_types(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure document counters exist for all current outlets.
INSERT INTO document_counters(outlet_id,document_type,prefix,next_number)
SELECT id,'Quotation','QT-',1 FROM outlets
ON DUPLICATE KEY UPDATE prefix=COALESCE(NULLIF(prefix,''),'QT-');

INSERT INTO document_counters(outlet_id,document_type,prefix,next_number)
SELECT id,'Invoice','INV-',1 FROM outlets
ON DUPLICATE KEY UPDATE prefix=COALESCE(NULLIF(prefix,''),'INV-');
