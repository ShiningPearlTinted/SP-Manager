-- Per-item discount shown on invoices (POS). Informational: the cart discount in sales.discount
-- stays the amount used for totals and reports; line_discount only records how it was split per item.
-- Back up first. Safe to run more than once; existing rows get 0.
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS line_discount decimal(15,2) NOT NULL DEFAULT 0.00 AFTER discount;
