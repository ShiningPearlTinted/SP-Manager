# SP-Manager 1.0.8 — Customer Fixes

Requested customer-only changes based on the 1.0.7 base:

1. Clicking a customer row now opens the customer form with the selected customer's existing data populated.
2. Customer Master Refresh no longer reloads the whole application, so it stays on the Customer screen.
3. Added Vehicle Number to Customer Master and POS Add Customer.
4. POS customer search/list also recognizes and displays Vehicle Number when available.
5. Existing functions and UI outside these requested customer changes were left unchanged.

### UI polish
- Improved Customer Master Add Customer modal Cancel button styling only.
- No customer logic, save logic, navigation, or other functions changed.

## Customer code / uppercase input patch
- Customer Code is auto-generated as CUS-000001, CUS-000002, etc.
- Customer form text input is converted to uppercase while typing.
- Existing customer functions and data fields are preserved.
- Existing customer records with a blank Code are assigned the next available CUS-###### code automatically.
