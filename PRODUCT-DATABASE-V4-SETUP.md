# SP-Manager 1.0.33 – SP-Central Product Database V4

## Purpose
V4 connects Product Master Category and Product Group selections to the relational MySQL tables without changing the existing Product Master UI or unrelated POS/Invoice/Customer Display functions.

## Relational mapping
- `products.category_id` → `product_categories.id`
- `products.group_id` → `product_groups.id`
- `product_groups.category_id` → `product_categories.id`
- `product_groups.parent_id` → `product_groups.id`

## API file
Upload only:
`api/products.php`

to:
`public_html/app/SP-Manager-api/products.php`

Do not overwrite `config.php`.

## What V4 does
- Saves Product Master Category by resolving the selected category name to `category_id`.
- Saves Product Master Product Group by resolving the selected group name to `group_id`.
- Returns category/group names and IDs when loading products.
- Syncs existing local Product Master categories/groups into `product_categories` and `product_groups`.
- Backfills existing products whose `category_id` / `group_id` are NULL when their Category/Group names already exist in SP-Manager local state.
- New categories and product groups created from Product Master are also synced to MySQL.
- Product group parent/category relationships are stored using `parent_id` and `category_id`.
- Product group rename keeps the existing relational group row instead of creating an unrelated new group.

## No database SQL import required
V4 uses the existing tables already present in SP-Central. No new table is required.
