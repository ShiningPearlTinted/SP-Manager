# Product Groups — SP-Manager reference Function Audit / SP-Manager V1.1.9

## Reference

Audited against the supplied SP-Manager reference package `SP-Manager reference(10).zip`, especially `Modules/SP-Manager reference.Pos.Management/Lang/en.lang` and the Product Groups module strings.

## Confirmed SP-Manager reference group functions

- Product groups support a parent/child relationship (`ParentGroup`).
- Groups have Name, Color and Image details in the supplied SP-Manager reference language resources.
- Group image can be selected from the computer and cleared.
- SP-Manager reference validates invalid parent relationships.
- SP-Manager reference has create, edit and delete group actions.
- SP-Manager reference prevents deletion when the selected group is still referenced by products/documents/promotions/sales according to the supplied error text.

## SP-Manager V1.1.9 changes

- Main group: create, edit, delete and image.
- Second group: create under a selected main group, edit, delete and image.
- Group images are compressed and stored in `productGroupMeta` local storage.
- Existing `productGroups` string data remains compatible. Existing groups without metadata are treated as main groups.
- Selecting a main group includes its second-group products in the product list.
- Group images are also shown in the Product Groups tree and POS group/category tiles when available.
- Delete is blocked when the group has child groups or products, preserving the existing data rather than silently reassigning products.

## Locked functions

No changes were intentionally made to sales calculations, POS payment flow, invoice flow, printing, price tags, customer display, email, inventory calculations or other unrelated modules.
