# SP-Manager Product Groups – Subgroup Product Assignment V1.1.13

## Changes
- New product opened while a subgroup is selected now automatically uses that subgroup.
- The product category is inferred from the selected group and its ancestors when possible.
- Product Group selector now exposes nested groups belonging to the selected category.
- Existing products can be edited and assigned directly to any nested subgroup.
- New group creation now supports any existing group as the parent, allowing unlimited nesting.
- Selecting a subgroup and pressing **New group** automatically uses the selected subgroup as the parent.
- Product Group tree renders recursively so deeper levels remain visible and selectable.
- Group metadata keeps the category association for newly created groups.
- Circular parent assignments are rejected.
- Existing POS, pricing, stock, invoice, printing, email and other functions are unchanged.
