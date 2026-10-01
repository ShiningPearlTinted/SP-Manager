-- SP-Manager V8 Product Master / Outlet Inventory architecture
-- Additive only. Existing products remain valid. No DROP / no data wipe.
-- Product Master remains one row in `products`.
-- `product_outlets` stores outlet-specific assignment, price, cost and stock.

CREATE TABLE IF NOT EXISTS product_outlets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    outlet_id BIGINT UNSIGNED NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    selling_price DECIMAL(15,2) NULL,
    cost_price DECIMAL(15,2) NULL,
    stock_qty DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    min_stock DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    preferred_quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    allow_price_change TINYINT(1) NULL,
    last_purchase_price DECIMAL(15,2) NULL,
    rank INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_product_outlet (product_id, outlet_id),
    INDEX idx_product_outlets_outlet (outlet_id),
    INDEX idx_product_outlets_product (product_id),
    CONSTRAINT fk_product_outlets_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_outlets_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One-time, non-destructive backfill of existing outlet-owned products.
INSERT INTO product_outlets (product_id, outlet_id, active, selling_price, cost_price, stock_qty, min_stock, preferred_quantity, allow_price_change, last_purchase_price, rank)
SELECT p.id, p.outlet_id, COALESCE(p.active,1),
       COALESCE(p.selling_price,0), COALESCE(p.cost_price,0), COALESCE(p.stock_qty,0),
       COALESCE(p.min_stock,0), 0, COALESCE(p.allow_price_change,0), NULL, 0
FROM products p
WHERE p.outlet_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM outlets o WHERE o.id=p.outlet_id)
  AND NOT EXISTS (SELECT 1 FROM product_outlets po WHERE po.product_id=p.id AND po.outlet_id=p.outlet_id);
