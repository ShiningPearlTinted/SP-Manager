-- SP-Manager Documents register permission migration.
-- Safe to run more than once; transaction tables and historical records remain unchanged.
INSERT INTO permissions (permission_key,permission_name,description,active)
VALUES ('manageDocuments','Documents','Access unified document register',1)
ON DUPLICATE KEY UPDATE permission_name=VALUES(permission_name),active=1;

UPDATE users u
LEFT JOIN roles r ON r.id=u.role_id
SET u.permissions_json=JSON_SET(
  IF(JSON_VALID(u.permissions_json),u.permissions_json,'{}'),
  '$.manageDocuments',
  IF(COALESCE(r.role_name,'')='Administrator'
     OR JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(u.permissions_json),u.permissions_json,'{}'),'$.managePurchases')) IN ('true','1')
     OR JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(u.permissions_json),u.permissions_json,'{}'),'$.manageQuotation')) IN ('true','1')
     OR JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(u.permissions_json),u.permissions_json,'{}'),'$.manageInvoice')) IN ('true','1')
     OR JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(u.permissions_json),u.permissions_json,'{}'),'$.viewSalesHistory')) IN ('true','1')
     OR JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(u.permissions_json),u.permissions_json,'{}'),'$.managePayments')) IN ('true','1')
     OR JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(u.permissions_json),u.permissions_json,'{}'),'$.manageInventory')) IN ('true','1'),
     TRUE,FALSE)
);
