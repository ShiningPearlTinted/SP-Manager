# POS Product Group Hierarchy Fix V1.1.15

- POS now treats Product Groups as a recursive parent/child hierarchy.
- Selecting a top-level POS category shows only content-bearing root groups; the category itself is never repeated as a group tile.
- Selecting a group with children shows its child groups directly.
- Selecting a leaf group shows its products directly.
- Empty groups and empty leaf groups are hidden from POS.
- Back navigation follows the actual parent group and the breadcrumb displays the selected group.
- Existing POS search, cart, payment, printing, cash drawer, and other functions are not changed by this patch.
- Group image metadata remains supported.
