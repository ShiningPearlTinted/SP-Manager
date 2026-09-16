# SP-Manager 1.0.25

## Critical render fix
- Removed the `canPermission` runtime dependency completely.
- Added top-level `isPermissionAllowed(user, key)` helper.
- All sidebar, Management, Users & Permissions, and POS menu permission checks use the same helper.
- Management no longer receives a permission callback prop.
- Login session is valid only when `sp_auth_version` matches 1.0.25 and an active user exists.
- Password Show/Hide remains enabled.
- Hardware Agent polling remains disabled unless explicitly enabled in Settings.
- Existing POS calculations and workflows are kept unchanged.
