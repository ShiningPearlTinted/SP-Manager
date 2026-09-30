# SP-Manager 1.0.38 — User → Outlet Assignment V3

Scope: Users & Permissions only.

Implemented:
- User can be assigned to one or more active outlets.
- One assigned outlet is stored as the user's default outlet.
- Assignment is persisted in `user_outlets`.
- `users.outlet_id` is synchronized to the selected default outlet for backward compatibility.
- Users list shows assigned outlet codes.
- User save/update keeps existing permissions and password behaviour unchanged.
- User delete remains protected so at least one enabled Administrator remains.
- Users API creates `user_outlets` automatically when required (additive only).
- Login API can authenticate a user through an active `user_outlets` assignment and returns assigned outlets/default outlet.

Not changed in this phase:
- POS transaction APIs are still using the existing SP01 context.
- Products, Customers, Purchases, Payments, Reports and other transaction modules are not switched to outlet context yet.
- No existing POS/UI calculation or workflow was refactored.
