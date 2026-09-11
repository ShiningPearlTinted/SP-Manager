# SP-Manager Architecture

Core entities identified during functional analysis:
Product, Barcode, Customer, Supplier, User, Document, DocumentItem, Payment, PaymentType, Stock, Warehouse, Tax, Promotion, LoyaltyCard, PosOrder, PosOrderItem, ZReport, StartingCash and PosVoid.

Business rules should remain in the backend. The frontend should consume a stable API.

Production direction: PostgreSQL + authenticated API + audit trail + printing + backup/restore.
