# SP-Manager POS Product Group Hierarchy Fix V1.1.14

## Scope
Only POS product-group navigation was changed. Product master, sales, payment, printing, customer display, email, inventory, and other functions are unchanged.

## Behaviour
- POS now starts from top-level product groups for the selected category.
- Child groups are shown after opening their parent group.
- Nested groups can continue to be opened recursively.
- Products assigned directly to a parent group remain visible in that parent.
- Empty leaf groups are not shown in POS.
- A parent group remains visible when a descendant contains products.
- Group display order follows stored group rank/insertion order.
- Back navigation follows the actual parent hierarchy.
- Group images are retained on POS tiles when configured.
