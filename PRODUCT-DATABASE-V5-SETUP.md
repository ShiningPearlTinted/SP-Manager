# SP-Manager 1.0.33 – SP-Central Product Database V5

## Purpose
Fix Product Master relational saving so `products.category_id` and `products.group_id` are populated from the selected Category and Product Group.

## What changed
- `api/products.php`
  - Automatically creates a missing Product Category before saving a product.
  - Automatically creates a missing Product Group before saving a product.
  - Resolves existing Category/Group names to their MySQL IDs.
  - Saves `category_id` and `group_id` into `products`.
  - Returns the saved relational IDs to the frontend.
  - Returns the saved selling price in the save response.
- `frontend/src/main.jsx`
  - Uses the returned `category_id` / `group_id` after Product save.
  - Existing bootstrap migration will retry saving local Product Master records so old NULL foreign keys can be repaired.

## Hostinger deployment
Upload only:

`api/products.php`

To:

`public_html/app/SP-Manager-api/products.php`

Do NOT overwrite `config.php`.

The frontend build must also be deployed using the existing GitHub Pages/deployment workflow because `frontend/src/main.jsx` was updated.

## Database
No new tables and no full SQL import are required. Existing tables are used:
- `product_categories`
- `product_groups`
- `products`

## Test
1. Deploy `products.php`.
2. Deploy the updated frontend.
3. Open Product Master.
4. Edit `SPUTTER MAX HD`.
5. Confirm Category = `Tinted Film` and Product Group = `Sputter`.
6. Confirm the price is correct in Pricing tab.
7. Click Save Changes.
8. Check phpMyAdmin:

```sql
SELECT id, outlet_id, category_id, group_id, sku, product_name, selling_price
FROM products
ORDER BY id DESC;
```

Expected: `category_id` and `group_id` are numeric IDs, not NULL, and `selling_price` matches Product Master.
