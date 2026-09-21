# SP-Manager 1.0.14 — POS / Management Audit Fixes

- Removed the legacy report-engine binaries, scripts, logs, templates and references from the project.
- Management now routes Cash In / Out to a dedicated cash movement function.
- Management now routes Credit payments to a dedicated outstanding-payment collection function.
- Loyalty points are stored on customer records and earned at 1 point per RM1 on paid POS sales (Walk-in Customer excluded).
- Customer and Loyalty views display the stored loyalty points.
- Settings access is enforced by `manageSettings` for navigation and POS Settings buttons.
- Management access is shown when the user has at least one Management permission.
- Editing the currently signed-in user refreshes the active permission object immediately.
- Existing POS product, stock, sales, payment, purchase and reporting flows were otherwise left intact.
