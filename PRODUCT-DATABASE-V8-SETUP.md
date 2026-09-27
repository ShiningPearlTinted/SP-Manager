# SP-Manager 1.0.33 – SP-Central Database V8

## Product relational persistence

V8 keeps the existing Product Master UI and business logic unchanged while completing relational persistence for:

- `products`
- `product_categories`
- `product_groups`
- `product_barcodes`
- `product_prices`
- `product_images`

### Hostinger

Upload only the updated API file:

`public_html/app/SP-Manager-api/products.php`

Do not overwrite `config.php`.

Deploy the frontend from this project as usual.

### Behaviour

When Product Master saves a product:

1. `products` is inserted/updated.
2. `category_id` and `group_id` are resolved to relational IDs.
3. All Product Master barcodes are synchronized to `product_barcodes`.
4. Retail selling/cost price is synchronized to `product_prices`.
5. The current product image is synchronized to `product_images`.

When Product Master loads:

- barcodes are read from `product_barcodes` when present;
- retail price/cost are read from `product_prices` when present;
- primary product image is read from `product_images` when present.

Existing products are automatically backfilled during the existing central Product bootstrap because the app already saves loaded Product records back through the Product API.

No new tables are required if the existing SP-Central schema is installed.
