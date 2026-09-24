import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import"./styles.css";

const AUTH_VERSION="1.0.33";

// Product image fallback: transparent SVG so POS products never show a boxed placeholder.
const DEFAULT_PRODUCT_IMAGE="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><g fill="none" stroke="#aeb7bd" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M54 128h212c10 0 18-8 18-18v-12c0-9-6-17-15-19l-34-8-18-34c-4-8-12-13-21-13h-70c-9 0-17 5-21 13L87 71l-34 8c-9 2-15 10-15 19v12c0 10 8 18 18 18Z"/><path d="M95 71h130"/><circle cx="88" cy="128" r="17"/><circle cx="232" cy="128" r="17"/></g></svg>`);
const productImageSrc=p=>p?.image||DEFAULT_PRODUCT_IMAGE;


const seedProducts=[
{id:1,code:"SP001",name:"Tinted Film Standard",group:"Tinted Film",category:"Tinted Film",price:180,cost:90,stock:12,reorder:5},
{id:2,code:"SP002",name:"Tinted Film Premium",group:"Tinted Film",category:"Tinted Film",price:280,cost:140,stock:8,reorder:5},
{id:3,code:"SP003",name:"Tinted Film Ceramic",group:"Tinted Film",category:"Tinted Film",price:450,cost:220,stock:5,reorder:5},
{id:4,code:"SP004",name:"Front Windscreen Film",group:"Windscreen",category:"Windscreen",price:160,cost:80,stock:14,reorder:5},
{id:5,code:"SP005",name:"Rear Windscreen Film",group:"Windscreen",category:"Windscreen",price:140,cost:70,stock:10,reorder:5},
{id:6,code:"SP006",name:"Door Glass Film",group:"Glass",category:"Glass",price:95,cost:45,stock:20,reorder:5},
{id:7,code:"SP007",name:"Security Film",group:"Security",category:"Security",price:520,cost:260,stock:4,reorder:5},
{id:8,code:"SP008",name:"UV Protection Film",group:"Protection",category:"Protection",price:320,cost:160,stock:9,reorder:5}
];
const priceChangeAllowedFor=p=>{const v=p?.priceChangeAllowed??p?.allowPriceChangeAtPOS??p?.allowPriceChange??p?.priceChangeAtPOS;return v===true||v===1||String(v??"").trim().toLowerCase()==="true"||String(v??"").trim()==="1"};

const normalizeProductStockControl=p=>{
 const reorder=Math.max(0,Number(p?.reorder??0)||0);
 const warningQty=Number.isFinite(Number(p?.lowStockWarningQuantity))?Math.max(0,Number(p.lowStockWarningQuantity)):reorder;
 const rawPriceChange=p?.priceChangeAllowed??p?.allowPriceChangeAtPOS??p?.allowPriceChange??p?.priceChangeAtPOS;
 const priceChangeAllowed=rawPriceChange===true||rawPriceChange===1||String(rawPriceChange??"").trim().toLowerCase()==="true"||String(rawPriceChange??"").trim()==="1";
 return {...p,reorder,preferredQuantity:Number.isFinite(Number(p?.preferredQuantity))?Math.max(0,Number(p.preferredQuantity)):reorder,lowStockWarning:p?.lowStockWarning!==undefined?Boolean(p.lowStockWarning):reorder>0,lowStockWarningQuantity:warningQty,supplierId:p?.supplierId||"",priceChangeAllowed};
};

const seedCustomers=[
{id:1,name:"Walk-in Customer",phone:"-",email:"-",visits:0,spend:0,loyaltyPoints:0},
{id:2,name:"Ahmad Customer",phone:"012-000 0000",email:"ahmad@example.com",visits:8,spend:2480,loyaltyPoints:2480},
{id:3,name:"Corporate Account",phone:"03-0000 0000",email:"sales@example.com",visits:14,spend:5820,loyaltyPoints:5820}
];
const seedSuppliers=[
{id:1,name:"SP Film Supplier",phone:"03-1111 2222",email:"supplier@example.com",balance:0},
{id:2,name:"Auto Glass Trading",phone:"03-3333 4444",email:"sales@autoglass.example",balance:0}
];
const seedPromos=[
{id:1,name:"Standard 5%",type:"percent",value:5,active:true},
{id:2,name:"Premium RM20",type:"fixed",value:20,active:true}
];
const seedPaymentTypes=[
{id:1,name:"Cash",code:"",position:1,enabled:true,quickPayment:true,customerRequired:false,changeAllowed:true,markPaid:true,printReceipt:true,shortcutKey:"",openCashDrawer:true},
{id:2,name:"Card",code:"",position:2,enabled:true,quickPayment:true,customerRequired:false,changeAllowed:false,markPaid:true,printReceipt:true,shortcutKey:"",openCashDrawer:false},
{id:3,name:"QR",code:"",position:3,enabled:true,quickPayment:true,customerRequired:false,changeAllowed:false,markPaid:true,printReceipt:true,shortcutKey:"",openCashDrawer:false},
{id:4,name:"Bank Transfers",code:"",position:4,enabled:true,quickPayment:true,customerRequired:false,changeAllowed:false,markPaid:true,printReceipt:true,shortcutKey:"",openCashDrawer:false},
{id:5,name:"Check",code:"",position:5,enabled:true,quickPayment:true,customerRequired:false,changeAllowed:false,markPaid:true,printReceipt:true,shortcutKey:"",openCashDrawer:false},
{id:6,name:"Deposit",code:"",position:6,enabled:true,quickPayment:false,customerRequired:true,changeAllowed:false,markPaid:true,printReceipt:true,shortcutKey:"",openCashDrawer:false},
{id:7,name:"Unpaid",code:"",position:7,enabled:true,quickPayment:true,customerRequired:true,changeAllowed:false,markPaid:false,printReceipt:true,shortcutKey:"",openCashDrawer:false}
];
const PERMISSION_KEYS=["viewSalesHistory","viewOpenSales","cashInOut","creditPayments","endOfDay","userInfo","manageUsers","manageProducts","manageInventory","manageCustomers","managePurchases","managePayments","manageManagement","manageSettings","manageReports","manageTax","manageDiscount","manageLoyalty"];
const PERMISSION_LABELS={viewSalesHistory:"View sales history",viewOpenSales:"View open sales",cashInOut:"Cash In / Out",creditPayments:"Credit payments",endOfDay:"End of day",userInfo:"User info",manageUsers:"Users & Permissions",manageProducts:"Products",manageInventory:"Inventory",manageCustomers:"Customers",managePurchases:"Purchases",managePayments:"Payments",manageSettings:"Settings",manageReports:"Reports",manageTax:"Tax",manageDiscount:"Discount / Promotion",manageLoyalty:"Loyalty",manageManagement:"Management"};
const ALL_PERMISSIONS=Object.fromEntries(PERMISSION_KEYS.map(k=>[k,true]));
const CASHIER_PERMISSIONS={viewSalesHistory:false,viewOpenSales:false,cashInOut:true,creditPayments:false,endOfDay:true,userInfo:false,manageUsers:false,manageProducts:false,manageInventory:false,manageCustomers:true,managePurchases:false,managePayments:true,manageSettings:false,manageReports:false,manageTax:false,manageDiscount:true,manageLoyalty:false,manageManagement:false};
const seedUsers=[
{id:1,name:"Administrator",username:"admin",role:"Administrator",enabled:true,password:"admin123",permissions:ALL_PERMISSIONS},
{id:2,name:"Cashier",username:"cashier",role:"Cashier",enabled:true,password:"cashier123",permissions:CASHIER_PERMISSIONS}
];
const defaultSettings={
 general:{language:"English",direction:"ltr",colorScheme:"Light",layout:"Visual",rows:5,columns:5,virtualKeyboard:false,zoom:100,showClose:true,clickToClose:false,slideIn:true,messageDuration:5,messagePosition:"Top",showCashIn:false,selectBusinessDay:false,buttonBar:{search:true,transfer:true,customer:true,discount:true,comment:false,newSale:true,refund:true,cashDrawer:true,serviceType:true,orderName:true},
    notificationPosition:"Top"},
 order:{floorPlans:false,sounds:false,soundNavigation:false,soundItemAdded:true,soundItemNotFound:true,defaultSearch:"Name",showSearchOptions:true,defaultQuantity:1,defaultDiscountType:"Percentage",separateRow:false,preventSaleBelowCost:false,preventNegativeInventory:false,singleUser:true,showReceiptDialog:true,defaultDueDate:0,mergeItemsOnReceipt:true,singleItemDiscount:true,shortcutPaymentConfirmation:true,requireVoidReason:false,trackUnconfirmedVoids:false,customOrderName:true,orderNameRequired:false,requestOrderName:false,resetOrderNumberOnClose:false,showItemsOnPayment:true,paymentRows:0,showAllOccupiedTables:false},
 products:{taxInclusive:false,discountRule:"After tax",sorting:"Name",allowNegativePrice:false,costMarkup:false,autoUpdateCost:false,updateSalePriceMarkup:false,movingAverage:false},
 documents:{numberFormat:"%YEAR%-%TYPE%-%COUNTER%",overrides:{}},
 weighing:{enabled:false,prefix:"20",productCodeLength:5,decimalPlaces:3,trimZeros:false,usePriceBarcode:false},
 customerDisplay:{enabled:false,secondaryMonitor:false,comPort:"",baudRate:9600,dataBits:8,stopBits:1,characters:20,topLine:"WELCOME!",bottomLine:""},
 email:{host:"",port:465,ssl:true,displayName:"",emailAddress:"",username:"",password:"",subject:"",message:"",bcc:""},
 print:{printReceipt:true,printCreditPayments:false,printLockedSale:false,printKitchenTicket:false,printServiceMessages:false,printer:"",printerType:"Windows printer",paperSize:"80 mm",copies:1,charactersPerLine:42,rightToLeft:false,header:"",footer:"",feedLines:3,cutPaper:true,printBitmap:true,richFormatting:true,printBarcode:true,printLogoFullWidth:false,alignment:"Left",codePage:"437",characterSet:"None",marginTop:0,marginRight:0,marginBottom:0,marginLeft:0,fontFamily:"Arial",fontSize:100,useSystemCurrencyFormat:true,printTaxTotals:true,printTaxName:false,printItemsCount:false,printTotalQuantity:false,shortReceiptNumber:false,printOrderNumber:true,printOutstandingBalance:false,decimalPlaces:2,receiptCounter:0,addressFormat:"%STREET_NAME% %BUILDING_NUMBER%\\n%POSTAL_CODE% %CITY%",customerName:true,customerCode:false,customerTaxNumber:false,customerAddress:false,customerPhone:false,customerEmail:false,customerLabelAddress:true,customerLabelTaxNumber:true,customerLabelCode:true,customerLabelPhone:true,customerLabelEmail:true,invoiceTitle:"",printA5:false,taxColumn:true,discountColumn:true,paymentTypes:true,outstandingBalance:true,footerInvoiceOnly:false,printerReceipt:"",printerCreditPayments:"",printerLockedSale:"",printerKitchenTicket:"",printerServiceMessages:"",localize:{companyTaxNumber:"Tax No.",receiptNumber:"Receipt No.",refundNumber:"Refund No.",orderNumber:"Order No.",user:"User",itemsCount:"Items count",discount:"Cart discount",subtotal:"Subtotal",taxRate:"Tax",total:"TOTAL",paidAmount:"Paid amount",amountDue:"Amount due",change:"Change",totalSavings:"You saved",outstandingBalance:"Outstanding balance",customer:"Customer",address:"Address",taxNumber:"Tax No.",code:"Code",phone:"Phone",email:"Email"}},
 database:{autoBackup:false,backupOnStart:false,backupOnClose:false,backupEveryHours:24,deleteOldBackups:false,deleteAfterDays:30,lastBackup:""},
 hardware:{agentEnabled:false,agentUrl:"http://127.0.0.1:18765",printer:"",printerType:"Windows",cashDrawerEnabled:false,cashDrawerPrinter:"",cashDrawerPulse:[27,112,0,25,250],customerDisplayEnabled:false,customerDisplayMode:"COM",customerDisplayPort:"",customerDisplayBaud:9600,customerDisplayChars:20,customerDisplayTop:"WELCOME!",customerDisplayBottom:""}
};
const deepMerge=(base,override)=>{if(!override||typeof override!=="object")return base;const out={...base};Object.keys(override).forEach(k=>{if(override[k]&&typeof override[k]==="object"&&!Array.isArray(override[k]))out[k]=deepMerge(base[k]||{},override[k]);else out[k]=override[k]});return out};

const nav=["Dashboard","POS / Sales","Products","Inventory","Customers","Purchases","Payments","Payment Types","Refund / Void","Discount / Promotion","Tax","Loyalty","Users & Permissions","Management","Reports","X / Z Report","Named Order / Takeaway","My company","Settings"];
const money=n=>"RM "+Number(n||0).toFixed(2);

const escapeHtml=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const openPrintDocument=(title,html)=>{
 try{
  const w=window.open("","_blank","width=900,height=760");
  if(!w){window.alert("Please allow pop-ups for SP-Manager printing.");return false}
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
   @page{margin:12mm}body{font-family:Arial,Segoe UI,sans-serif;color:#102a43;background:#fff;margin:0;padding:18px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:18px 0 8px}.meta{color:#718397;font-size:12px;margin-bottom:16px}.head{border-bottom:2px solid #123b59;padding-bottom:10px;margin-bottom:14px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f2f6f9;color:#526b80;text-align:left;padding:8px;border-bottom:1px solid #d8e3ec}td{padding:8px;border-bottom:1px solid #e8eef3}td.num{text-align:right}.total{margin-top:16px;margin-left:auto;width:280px}.total div{display:flex;justify-content:space-between;padding:5px 0}.grand{font-size:16px;font-weight:700;border-top:2px solid #123b59;margin-top:5px;padding-top:8px}.footer{margin-top:22px;color:#718397;font-size:11px}@media print{body{padding:0}}
  </style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),180);</script></body></html>`);
  w.document.close();return true;
 }catch(e){window.alert("Unable to open print preview: "+e.message);return false}
};
const downloadReportPDF=(title,columns,rows)=>{
 const safeRows=(rows||[]).map(row=>`<tr>${(row||[]).map((cell,i)=>`<td class="${i===((row||[]).length-1)?"num":""}">${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
 const html=`<div class="head"><h1>${escapeHtml(title)}</h1><div class="meta">SP-Manager · ${escapeHtml(new Date().toLocaleString())}</div></div><table><thead><tr>${(columns||[]).map(c=>`<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${safeRows||`<tr><td colspan="${Math.max(1,(columns||[]).length)}">No records</td></tr>`}</tbody></table><div class="footer">Generated by SP-Manager</div>`;
 openPrintDocument(title,html);
};
const formatInvoiceDate=value=>{const d=new Date(value||Date.now());return Number.isNaN(d.getTime())?"":d.toLocaleDateString("en-GB")};
const invoiceAddressLines=company=>{
 const clean=v=>String(v??"").trim();
 const street=[clean(company?.buildingNumber),clean(company?.streetName)].filter(Boolean).join(", ");
 const area=[clean(company?.additionalStreetName),clean(company?.plotIdentification)].filter(Boolean).join(", ");
 const city=[clean(company?.postalCode),clean(company?.city)].filter(Boolean).join(", ");
 const region=[clean(company?.district),clean(company?.state)].filter(Boolean).join(", ");
 const country=clean(company?.country);
 return [street,area,city,region,country].filter(Boolean).filter((v,i,a)=>!(i===a.length-1 && /^Malaysia$/i.test(v)));
};
const buildInvoiceHtml=(sale,company={},customers=[],settings={})=>{
 const p=settings?.print||{};
 const customer=(customers||[]).find(x=>x.id===sale?.customerId);
 const items=sale?.items||[];
 const isA5=!!p.printA5;
 const fontScale=Math.min(2,Math.max(.5,Number(p.fontSize??100)/100));
 const logo=company?.logo?`<img class="company-logo" src="${String(company.logo).replace(/"/g,"&quot;")}" alt="Company logo">`:``;
 const addrLines=invoiceAddressLines(company);
 const companyName=String(company?.name||"").trim().toUpperCase();
 const companyPhone=String(company?.phoneNumber||"").trim();
 const companyEmail=String(company?.email||"").trim();
 const dueDate=sale?.dueDate||sale?.date;
 const paid=Number(sale?.paymentAmount||0);
 const total=Number(sale?.total||0);
 const due=Math.max(0,total-paid);
 const showTax=p.taxColumn!==false;
 const showDiscount=p.discountColumn!==false;
 const showPaymentTypes=p.paymentTypes!==false;
 const showOutstanding=p.outstandingBalance!==false;
 const paymentLines=(Array.isArray(sale?.payments)&&sale.payments.length?sale.payments:[{payment:sale?.payment||"Cash",amount:paid}]).map(x=>`<div><span>${escapeHtml(x.payment||"Payment")}</span><b>${escapeHtml(money(x.amount))}</b></div>`).join("");
 const itemRows=items.map((i,n)=>{const warranty=Boolean(i.warrantyEnabled)&&Number(i.warrantyYears||0)>0;const maintenance=Boolean(i.maintenanceEnabled)&&Number(i.maintenanceCount||0)>0;const description=String(i.description||"").trim();const descriptionHtml=description?`<div class="invoice-item-service invoice-item-description">${escapeHtml(description).replace(/\n/g,"<br>")}</div>`:"";const serviceLines=`${descriptionHtml}${warranty?`<div class="invoice-item-service">Warranty ${escapeHtml(Math.max(1,Number(i.warrantyYears)||1))} Year</div>`:""}${maintenance?`<div class="invoice-item-service">Free Maintenance ${escapeHtml(Math.max(1,Number(i.maintenanceCount)||1))} x</div>`:""}`;return `<tr><td class="col-no">${n+1}</td><td class="col-item"><div>${escapeHtml(i.name||"")}</div>${serviceLines}</td><td class="col-qty num">${escapeHtml(i.qty||0)}</td><td class="col-unit num">${escapeHtml(Number(i.price||0).toFixed(2))}</td>${showTax?`<td class="col-tax num">---</td>`:""}${showDiscount?`<td class="col-discount num">0.00%</td>`:""}<td class="col-total num">${escapeHtml(money(Number(i.price||0)*Number(i.qty||0)))}</td></tr>`}).join("");
 const columns=5+(showTax?1:0)+(showDiscount?1:0);
 const publicNote=String(sale?.note||"").trim();
 const customerLines=[
   p.customerTaxNumber&&customer?.taxNumber?`<div>Tax No.: ${escapeHtml(customer.taxNumber)}</div>`:"",
   p.customerCode&&customer?.code?`<div>Code: ${escapeHtml(customer.code)}</div>`:"",
   p.customerPhone&&customer?.phone&&customer.phone!=="-"?`<div>${escapeHtml(customer.phone)}</div>`:"",
   p.customerEmail&&customer?.email&&customer.email!=="-"?`<div>${escapeHtml(customer.email)}</div>`:""
 ].filter(Boolean).join("");
 const footerText=String(p.footer||"").trim();
 return `<div class="invoice-page ${isA5?"invoice-a5":"invoice-a4"}" style="--invoice-font-scale:${fontScale}">
  <div class="invoice-head"><div class="invoice-company-info"><div class="invoice-title">${escapeHtml(p.invoiceTitle||"INVOICE")}</div>${companyName?`<div class="company-name">${escapeHtml(companyName)}</div>`:""}${addrLines.length?`<div class="company-address">${addrLines.map(line=>`<div>${escapeHtml(line)}</div>`).join("")}</div>`:""}${companyPhone?`<div class="company-contact">Phone: <span>${escapeHtml(companyPhone)}</span></div>`:""}${companyEmail?`<div class="company-contact">Email: <span>${escapeHtml(companyEmail)}</span></div>`:""}</div><div class="invoice-company"><div class="invoice-company-top">${logo}</div></div></div>
  <div class="invoice-header-line"></div>
  <div class="invoice-info-grid"><div><b>Bill to</b><div>${escapeHtml(customer?.name||"Walk-in customer")}</div>${customerLines}</div><div class="invoice-meta"><div><b>Invoice No.:</b> ${escapeHtml(sale?.no||"")}</div><div><b>Date:</b> ${escapeHtml(formatInvoiceDate(sale?.date))}</div><div><b>Due date:</b> ${escapeHtml(formatInvoiceDate(dueDate))}</div><div><b>Payment status:</b> ${sale?.paid===false||due>0?"Unpaid":"Paid"}</div></div></div>
  <table class="invoice-table"><thead><tr><th class="col-no">#</th><th class="col-item">Item</th><th class="col-qty">Quantity</th><th class="col-unit">Unit price</th>${showTax?`<th class="col-tax">Tax</th>`:""}${showDiscount?`<th class="col-discount">Discount</th>`:""}<th class="col-total">Total</th></tr></thead><tbody>${itemRows||`<tr><td colspan="${columns}">No items</td></tr>`}</tbody></table>
  <div class="invoice-bottom-row"><div class="invoice-total"><span>Total</span><b>${escapeHtml(money(total))}</b></div>${showPaymentTypes||showOutstanding?`<div class="payment-summary">${showPaymentTypes?`<div class="payment-heading"><b>Payment method:</b></div>${paymentLines}`:""}${showOutstanding?`<div><span>Paid amount:</span><b>${escapeHtml(money(paid))}</b></div><div><span>Amount due:</span><b>${escapeHtml(money(due))}</b></div>`:""}</div>`:""}</div>
  ${publicNote?`<div class="invoice-note"><div class="invoice-note-title">Add notes</div><div class="invoice-note-text">${escapeHtml(publicNote).replace(/\n/g,"<br>")}</div></div>`:""}
  ${footerText?`<div class="invoice-footer">${escapeHtml(footerText).replace(/\n/g,"<br>")}</div>`:`<div class="invoice-footer">Page 1</div>`}
 </div>`;
};
const invoiceCss=`@page{size:__INVOICE_PAPER__ portrait;margin:0}body{font-family:Arial,Segoe UI,sans-serif;color:#111;background:#fff;margin:0}.invoice-page{box-sizing:border-box;width:var(--invoice-width);min-height:var(--invoice-height);padding:var(--invoice-padding);margin:0 auto;font-size:calc(var(--invoice-base-font)*var(--invoice-font-scale));overflow:hidden}.invoice-a4{--invoice-paper:A4;--invoice-width:210mm;--invoice-height:297mm;--invoice-padding:12mm 10mm 12mm;--invoice-base-font:10px}.invoice-a5{--invoice-paper:A5;--invoice-width:148mm;--invoice-height:210mm;--invoice-padding:8mm 7mm 8mm;--invoice-base-font:8.5px}.invoice-head{display:grid;grid-template-columns:minmax(0,1fr) var(--logo-column);column-gap:var(--head-gap);align-items:start}.invoice-a4{--logo-column:33mm;--head-gap:8mm}.invoice-a5{--logo-column:24mm;--head-gap:5mm}.invoice-company-info{min-width:0;text-align:left}.invoice-company{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;width:var(--logo-column);min-width:var(--logo-column);max-width:var(--logo-column);text-align:right}.invoice-company-top{width:var(--logo-column);display:flex;justify-content:flex-end;align-items:flex-start}.company-logo{width:var(--logo-width);max-height:var(--logo-height);object-fit:contain;object-position:right center}.invoice-a4{--logo-width:27mm;--logo-height:13mm}.invoice-a5{--logo-width:21mm;--logo-height:10mm}.company-name{margin-top:var(--company-name-gap);font-size:calc(var(--company-name-font)*var(--invoice-font-scale));font-weight:700;line-height:1.35}.invoice-a4{--company-name-gap:5mm;--company-name-font:9px}.invoice-a5{--company-name-gap:3mm;--company-name-font:7.5px}.company-address{max-width:100mm;margin-top:1mm;font-size:calc(var(--company-info-font)*var(--invoice-font-scale));font-weight:400;line-height:1.45;overflow-wrap:anywhere}.company-address div{display:block}.company-contact{font-size:calc(var(--company-info-font)*var(--invoice-font-scale));line-height:1.35}.invoice-a4{--company-info-font:9px}.invoice-a5{--company-info-font:7.5px}.invoice-header-line{border-top:1px solid #aaa;margin-top:var(--line-gap)}.invoice-a4{--line-gap:4mm}.invoice-a5{--line-gap:3mm}.invoice-meta{width:var(--meta-width);margin:0;text-align:right;line-height:1.45;align-self:start;justify-self:end}.invoice-a4{--meta-width:88mm}.invoice-a5{--meta-width:57mm}.invoice-meta div{white-space:nowrap}.invoice-title{font-size:var(--title-font);font-weight:700;letter-spacing:.4px;margin-bottom:var(--title-gap)}.invoice-a4{--title-font:17px;--title-gap:5mm}.invoice-a5{--title-font:13px;--title-gap:3mm}.invoice-info-grid{display:grid;grid-template-columns:minmax(0,1fr) var(--meta-width);gap:var(--info-gap);margin-top:var(--info-top);line-height:1.5}.invoice-a4{--info-gap:10mm;--info-top:5mm}.invoice-a5{--info-gap:5mm;--info-top:3mm}.invoice-info-grid>div:last-child{justify-self:end;width:var(--meta-width)}.invoice-table{width:100%;border-collapse:collapse;margin-top:var(--table-top);font-size:var(--table-font);table-layout:fixed}.invoice-a4{--table-top:5mm;--table-font:9px}.invoice-a5{--table-top:3mm;--table-font:7.3px}.invoice-table th{background:#fff;border:1px solid #aaa;padding:var(--cell-pad);text-align:left}.invoice-table td{border:1px solid #ccc;padding:var(--cell-pad);vertical-align:top;overflow-wrap:anywhere}.invoice-a4{--cell-pad:4px}.invoice-a5{--cell-pad:2.5px}.invoice-table .col-no{width:5%}.invoice-table .col-item{width:var(--item-width)}.invoice-table .col-qty{width:var(--qty-width)}.invoice-table .col-unit{width:var(--unit-width)}.invoice-table .col-tax{width:var(--tax-width)}.invoice-table .col-discount{width:var(--discount-width)}.invoice-table .col-total{width:var(--total-width)}.invoice-a4{--item-width:39%;--qty-width:9%;--unit-width:14%;--tax-width:10%;--discount-width:12%;--total-width:11%}.invoice-a5{--item-width:34%;--qty-width:9%;--unit-width:15%;--tax-width:11%;--discount-width:13%;--total-width:13%}.num{text-align:right}.invoice-bottom-row{display:flex;flex-direction:column;align-items:flex-end;margin-top:var(--bottom-gap)}.invoice-a4{--bottom-gap:3mm}.invoice-a5{--bottom-gap:2.5mm}.invoice-total{margin:0;width:var(--summary-width);display:flex;justify-content:space-between;border:1px solid #aaa;padding:var(--summary-pad);font-weight:700;box-sizing:border-box}.invoice-a4{--summary-width:62mm;--summary-pad:4px 6px}.invoice-a5{--summary-width:52mm;--summary-pad:3px 4px}.payment-summary{margin:var(--payment-gap) 0 0;width:var(--summary-width);line-height:1.5}.invoice-a4{--payment-gap:3mm}.invoice-a5{--payment-gap:2mm}.payment-summary>div{display:flex;justify-content:space-between;gap:6px}.payment-summary .payment-heading{display:block;margin-bottom:1mm}.invoice-note{margin-top:var(--note-gap);border-top:1px solid #aaa;padding-top:2mm;line-height:1.45}.invoice-a4{--note-gap:8mm}.invoice-a5{--note-gap:5mm}.invoice-note-title{font-weight:700;margin-bottom:1mm}.invoice-note-text{white-space:normal}.invoice-footer{margin-top:var(--footer-gap);text-align:right;font-size:calc(var(--footer-font)*var(--invoice-font-scale));color:#666}.invoice-a4{--footer-gap:15mm;--footer-font:8px}.invoice-a5{--footer-gap:7mm;--footer-font:6.5px}@media print{.invoice-page{margin:0}}`;
const printInvoice=(sale,company={},customers=[],settings={})=>{try{const w=window.open("","_blank","width=900,height=760");if(!w){window.alert("Please allow pop-ups for SP-Manager printing.");return false}w.document.open();const paper=settings?.print?.printA5?"A5":"A4";w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(sale?.no||"")}</title><style>${invoiceCss.replace("__INVOICE_PAPER__",paper)}</style></head><body>${buildInvoiceHtml(sale,company,customers,settings)}<script>window.onload=()=>setTimeout(()=>window.print(),180);<\/script></body></html>`);w.document.close();return true}catch(e){window.alert("Unable to open invoice: "+e.message);return false}};
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem("sp_"+k))??d}catch{return d}};
const save=(k,v)=>localStorage.setItem("sp_"+k,JSON.stringify(v));
const persist=(key,val,setter)=>{save(key,val);setter(val)};
const uid=()=>Date.now()+Math.floor(Math.random()*999);
const isPermissionAllowed=(user,key)=>Boolean(user&&(user.role==="Administrator"||user.permissions?.[key]===true));
const hasManagementAccess=user=>Boolean(user&&(user.role==="Administrator"||user.permissions?.manageManagement===true));

function playPosBeep(kind="ok"){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C();const o=ctx.createOscillator();const g=ctx.createGain();o.type="sine";o.frequency.value=kind==="error"?220:880;g.gain.value=.035;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.07);setTimeout(()=>ctx.close?.(),120)}catch{}}
function App(){
 const[signedIn,setSignedIn]=useState(()=>sessionStorage.getItem("sp_auth")==="1"&&sessionStorage.getItem("sp_auth_version")==="1.0.26"&&!!load("activeUser",null));
 const[activeUser,setCurrentUser]=useState(()=>load("activeUser",null));
 const[page,setPage]=useState("POS / Sales");
 const[posMenu,setPosMenu]=useState(false);
 const[showEndOfDay,setShowEndOfDay]=useState(false);
 const openEndOfDayFromPOS=()=>{sessionStorage.setItem("sp_eod_source","pos");setShowEndOfDay(true)};
 const[mobileNavOpen,setMobileNavOpen]=useState(false);
 useEffect(()=>{setPosMenu(false);setMobileNavOpen(false);if(page==="End of day"&&sessionStorage.getItem("sp_eod_source")!=="pos"){setPage("POS / Sales")}},[page]);
 const[products,setProducts]=useState(()=>load("products",seedProducts).map(normalizeProductStockControl));
 const[stockHistory,setStockHistory]=useState(()=>load("stockHistory",[]));
 const[categories,setCategories]=useState(()=>load("categories",["Tinted Film","Windscreen","Glass","Security","Protection"]));
 const[customers,setCustomers]=useState(()=>load("customers",seedCustomers));
 const[suppliers,setSuppliers]=useState(()=>load("suppliers",seedSuppliers));
 const[sales,setSales]=useState(()=>load("sales",[]));
 const[cashMovements,setCashMovements]=useState(()=>load("cashMovements",[]));
 const[paymentTypes,setPaymentTypes]=useState(()=>load("paymentTypes",seedPaymentTypes));
 const[purchases,setPurchases]=useState(()=>load("purchases",[]));
 const[promos,setPromos]=useState(()=>load("promos",seedPromos));
 const[users,setUsers]=useState(()=>load("users",seedUsers).map(u=>({...u,permissions:{...(u.role==="Administrator"?ALL_PERMISSIONS:CASHIER_PERMISSIONS),...(u.permissions||{}),...(u.role!=="Administrator"?{cashInOut:true,endOfDay:true}: {})}})));
 const[orders,setOrders]=useState(()=>load("orders",[]));
 const signOut=()=>{sessionStorage.removeItem("sp_auth");sessionStorage.removeItem("sp_auth_version");save("activeUser",null);setCurrentUser(null);setSignedIn(false);setPage("POS / Sales")};
 const[settings,setSettings]=useState(()=>deepMerge(defaultSettings,load("settings",{})));
 const[cart,setCart]=useState([]);
 const[q,setQ]=useState("");
 const[posSearchMode,setPosSearchMode]=useState(()=>{const saved=load("posSearchMode",null);const def=load("settings",{}).order?.defaultSearch||"Name";return ["All","Barcode","Code","Name","All fields"].includes(saved)?(saved==="All fields"?"All":saved):((def==="All fields"?"All":def))});
 const[posCategory,setPosCategory]=useState("All Categories");
 const[customer,setCustomer]=useState(1);
 const[discount,setDiscount]=useState(0);
 const[discountFixed,setDiscountFixed]=useState(0);
 const[payment,setPayment]=useState(()=>load("paymentTypes",seedPaymentTypes).filter(x=>x.enabled).sort((a,b)=>a.position-b.position)[0]?.name||"Cash");
 const[taxRate,setTaxRate]=useState(()=>load("taxRate",0));
 const[notice,setNotice]=useState("");
 const[messageBox,setMessageBox]=useState(null);
 const[noteBox,setNoteBox]=useState(null);
 const[lowStockAlert,setLowStockAlert]=useState(null);
 const[businessDay,setBusinessDay]=useState(()=>load("businessDay",{open:true,openingCash:0,date:new Date().toISOString().slice(0,10)}));
 const[company,setCompany]=useState(()=>load("company",{name:"Shining Pearl Tinted",taxNumber:"",streetName:"",buildingNumber:"",additionalStreetName:"",plotIdentification:"",district:"",postalCode:"",city:"",state:"",country:"Malaysia",phoneNumber:"",email:"",bankAccountNumber:"",bankDetails:"",logo:""}));
 const[agentHeaderStatus,setAgentHeaderStatus]=useState({connected:false});
 const[editing,setEditing]=useState(null);
 const[productGroups,setProductGroups]=useState(()=>load("productGroups",[...new Set(seedProducts.map(p=>p.group||p.category).filter(Boolean))]));
 const[lastSale,setLastSale]=useState(null);
 const[showCashInOutModal,setShowCashInOutModal]=useState(false);
 const[posOrderMeta,setPosOrderMeta]=useState({name:"",comment:"",serviceType:"Dine In",table:""});

 useEffect(()=>{if(!notice)return;const ms=Math.max(1,Number(settings.general.messageDuration||5))*1000;const t=setTimeout(()=>setNotice(""),ms);return()=>clearTimeout(t)},[notice,settings.general.messageDuration]);
 useEffect(()=>{const key="sp_startup_settings_checked";if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1");let next={...businessDay};let changed=false;if(settings.general.selectBusinessDay){const answer=window.prompt("Select business day (YYYY-MM-DD)",businessDay.date||new Date().toISOString().slice(0,10));if(answer&&/^\d{4}-\d{2}-\d{2}$/.test(answer)){next.date=answer;changed=true}}if(settings.general.showCashIn){const answer=window.prompt("Starting cash",String(businessDay.openingCash||0));if(answer!==null&&!Number.isNaN(Number(answer))){next.openingCash=Math.max(0,Number(answer));changed=true}}if(changed){persist("businessDay",next,setBusinessDay)}},[]);
 useEffect(()=>{let alive=true;const enabled=!!settings?.hardware?.agentEnabled;if(!enabled){setAgentHeaderStatus({connected:false});return()=>{alive=false}};const check=async()=>{const base=String(settings?.hardware?.agentUrl||"http://127.0.0.1:18765").replace(/\/$/,"");try{const r=await fetch(base+"/status",{cache:"no-store"});if(!r.ok)throw Error();const x=await r.json();if(alive)setAgentHeaderStatus(x?.connected?x:{...x,connected:false});}catch{if(alive)setAgentHeaderStatus({connected:false});}};check();const id=setInterval(check,5000);return()=>{alive=false;clearInterval(id)}},[settings?.hardware?.agentEnabled,settings?.hardware?.agentUrl]);
 const activeSales=sales.filter(x=>!x.voided&&!x.refunded);
 const today=activeSales.reduce((a,x)=>a+x.total,0);
 const lowStock=products.filter(p=>p.stock<=p.reorder).length;
 const filtered=useMemo(()=>{const mode=posSearchMode||"All";const list=products.filter(p=>p.active!==false).filter(p=>{const text=mode==="Barcode"?((p.barcode||"")+" "+(Array.isArray(p.barcodes)?p.barcodes.join(" "):"")):mode==="Code"?(p.code||""):mode==="Name"?(p.name||""):[p.name,p.code,p.barcode,Array.isArray(p.barcodes)?p.barcodes.join(" "):"",p.group,p.category].join(" ");const cat=!q||posCategory==="All Categories"||((p.category||p.group||"")===posCategory);return cat&&text.toLowerCase().includes(q.toLowerCase())});return [...list].sort((a,b)=>{const ar=Number(a.rank||0),br=Number(b.rank||0);if(ar!==br)return ar-br;return settings.products.sorting==="Code"?String(a.code||"").localeCompare(String(b.code||""),undefined,{numeric:true}):String(a.name||"").localeCompare(String(b.name||""))})},[products,q,posCategory,posSearchMode,settings.order.defaultSearch,settings.products.sorting]);
 const emailReceipt=async(sale)=>{
  const c=customers.find(x=>x.id===sale.customerId);const to=c?.email&&c.email!=="-"?String(c.email).trim():"";
  if(!to){setMessageBox({title:"Email",message:"Customer email is missing. Please add a valid customer email before sending.",type:"warning"});return}
  const e=settings?.email||{};
  if(!String(e.host||"").trim()||!Number(e.port)||!String(e.emailAddress||"").trim()||!String(e.password||"").trim()){
   setMessageBox({title:"Email Settings",message:"Email settings are not configured correctly. Please check Settings > Email: Host, Port, Email address and Password.",type:"warning"});return;
  }
  const subjectTemplate=e.subject||"Receipt attached - {receipt}";
  const subject=String(subjectTemplate).replaceAll("{receipt}",sale.no).replaceAll("{date}",formatInvoiceDate(sale.date)).replaceAll("{total}",money(sale.total));
  const defaultBody=`Dear ${c?.name||"Customer"},<br><br>Please find your invoice details below.<br><b>Invoice:</b> ${escapeHtml(sale.no)}<br><b>Date:</b> ${escapeHtml(formatInvoiceDate(sale.date))}<br><b>Total:</b> ${escapeHtml(money(sale.total))}<br><b>Payment:</b> ${escapeHtml(sale.payment||"Cash")}<br><br>Thank you,<br>${escapeHtml(company?.name||"Shining Pearl Tinted")}`;
  const bodyTemplate=e.message||defaultBody;
  const body=String(bodyTemplate).replaceAll("{receipt}",escapeHtml(sale.no)).replaceAll("{date}",escapeHtml(formatInvoiceDate(sale.date))).replaceAll("{total}",escapeHtml(money(sale.total))).replace(/\n/g,"<br>");
  try{
   const base=String(settings?.hardware?.agentUrl||"http://127.0.0.1:18765").replace(/\/$/,"");
   const r=await fetch(base+"/email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({host:e.host,port:Number(e.port),ssl:e.ssl!==false,from:e.emailAddress,displayName:e.displayName||company?.name||"SP-Manager",username:e.username||e.emailAddress,password:e.password,to,subject,body,bcc:e.bcc||"",pdfFileName:`Invoice-${String(sale.no||"SP-Manager").replace(/[^a-zA-Z0-9_-]/g,"_")}.pdf`,pdfHtml:`<!doctype html><html><head><meta charset="utf-8"><style>${invoiceCss.replace("__INVOICE_PAPER__",settings?.print?.printA5?"A5":"A4")}</style></head><body>${buildInvoiceHtml(sale,company,customers,settings)}</body></html>`})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok||!data.ok)throw new Error(data.error||"Email sending failed.");
   setNotice("Email sent successfully to "+to+".");
  }catch(err){setMessageBox({title:"Email Sending Failed",message:"Unable to send email. Please check Settings > Email and make sure the SMTP details are correct.\n\n"+String(err?.message||err),type:"error"});}
 };

 const subtotal=cart.reduce((a,x)=>a+x.price*x.qty,0);
 const customerForTotals=customers.find(c=>c.id===customer);
 const customerDiscountPct=Math.min(100,Math.max(0,Number(customerForTotals?.discount||0)));
 const customerDiscount=Math.min(subtotal,subtotal*customerDiscountPct/100);
 const afterCustomer=Math.max(0,subtotal-customerDiscount);
 const manualDiscount=Math.min(afterCustomer,Number(discountFixed||0)+afterCustomer*Number(discount||0)/100);
 const totalDiscount=Math.min(subtotal,customerDiscount+manualDiscount);
 const taxRateValue=Math.max(0,Number(taxRate||0));
 let taxable=0,tax=0,grand=0;
 if(settings.products.taxInclusive){
   const grossAfterCustomer=Math.max(0,subtotal-customerDiscount);
   if((settings.products.discountRule||"After tax")==="Before tax"){
     const grossAfterDiscount=Math.max(0,grossAfterCustomer-manualDiscount);
     tax=grossAfterDiscount*(taxRateValue/(100+taxRateValue||100));
     taxable=Math.max(0,grossAfterDiscount-tax);
     grand=grossAfterDiscount;
   }else{
     const taxBeforeDiscount=grossAfterCustomer*(taxRateValue/(100+taxRateValue||100));
     tax=Math.max(0,taxBeforeDiscount-manualDiscount*(taxRateValue/(100+taxRateValue||100)));
     taxable=Math.max(0,grossAfterCustomer-manualDiscount-tax);
     grand=Math.max(0,grossAfterCustomer-manualDiscount);
   }
 }else if((settings.products.discountRule||"After tax")==="Before tax"){
   taxable=Math.max(0,subtotal-totalDiscount);
   tax=taxable*taxRateValue/100;
   grand=taxable+tax;
 }else{
   taxable=Math.max(0,subtotal-customerDiscount);
   tax=taxable*taxRateValue/100;
   grand=Math.max(0,taxable+tax-manualDiscount);
 }
 const disc=totalDiscount;

 const persist=(key,val,setter)=>{save(key,val);setter(val)};
 const nextDocumentCounter=()=>{const current=Math.max(0,Number(load("orderCounter",0)||0))+1;save("orderCounter",current);return current};
 const formatDocumentNumber=(type="Order",counterOverride)=>{
   const current=counterOverride==null?nextDocumentCounter():Math.max(0,Number(counterOverride||0));
   const d=settings?.documents||{};
   const pattern=d.overrides?.[type]||d.numberFormat||"%YEAR%-%TYPE%-%COUNTER%";
   return String(pattern).replaceAll("%YEAR%",String(new Date().getFullYear())).replaceAll("%TYPE%",type).replaceAll("%COUNTER%",String(current).padStart(6,"0"));
 };
 const nextOrderNumber=(counterOverride)=>formatDocumentNumber("Order",counterOverride);
 const updateSettings=next=>{const merged=deepMerge(defaultSettings,next);persist("settings",merged,setSettings);return merged};
 useEffect(()=>{save("settings",settings)},[settings]);
 useEffect(()=>{save("posSearchMode",posSearchMode)},[posSearchMode]);
 useEffect(()=>{const def=settings.order.defaultSearch||"Name";const mode=def==="All fields"?"All":def;if(["All","Barcode","Code","Name"].includes(mode))setPosSearchMode(mode)},[settings.order.defaultSearch]);
 useEffect(()=>{if(!settings.database.backupOnClose)return;const run=()=>{try{const snapshot={createdAt:new Date().toISOString(),data:{}};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith("sp_")&&!k.startsWith("sp_auto_backup_"))snapshot.data[k]=localStorage.getItem(k)}const stamp=Date.now();localStorage.setItem("sp_auto_backup_close",JSON.stringify(snapshot));localStorage.setItem("sp_auto_backup_"+stamp,JSON.stringify(snapshot));localStorage.setItem("sp_last_backup_close",snapshot.createdAt);if(settings.database.deleteOldBackups){const cutoff=Date.now()-Math.max(1,Number(settings.database.deleteAfterDays||30))*86400000;for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith("sp_auto_backup_")&&Number(k.slice("sp_auto_backup_".length))<cutoff)localStorage.removeItem(k)}}}catch{}};window.addEventListener("beforeunload",run);return()=>window.removeEventListener("beforeunload",run)},[settings.database.backupOnClose,settings.database.deleteOldBackups,settings.database.deleteAfterDays]);
 useEffect(()=>{if(!settings.database.autoBackup)return;const every=Math.max(1,Number(settings.database.backupEveryHours||24))*3600000;const run=()=>{const snapshot={createdAt:new Date().toISOString(),data:{}};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith("sp_")&&!k.startsWith("sp_auto_backup_"))snapshot.data[k]=localStorage.getItem(k)}const stamp=Date.now();localStorage.setItem("sp_auto_backup",JSON.stringify(snapshot));localStorage.setItem("sp_auto_backup_"+stamp,JSON.stringify(snapshot));if(settings.database.deleteOldBackups){const cutoff=Date.now()-Math.max(1,Number(settings.database.deleteAfterDays||30))*86400000;for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith("sp_auto_backup_")&&Number(k.slice("sp_auto_backup_".length))<cutoff)localStorage.removeItem(k)}}setSettings(x=>({...x,database:{...x.database,lastBackup:snapshot.createdAt}}))};if(settings.database.backupOnStart)run();const timer=setInterval(run,every);return()=>clearInterval(timer)},[settings.database.autoBackup,settings.database.backupEveryHours,settings.database.backupOnStart,settings.database.deleteOldBackups,settings.database.deleteAfterDays]);
 const recordStockHistory=(entries)=>{if(!entries.length)return;const next=[...entries,...stockHistory].slice(0,2000);persist("stockHistory",next,setStockHistory)};
 const promotionPrice=(p,qty=1)=>{
  const now=new Date();
  const day=now.getDay();
  const active=promos.filter(pr=>{
   if(pr.active===false)return false;
   if(pr.startDate&&new Date(pr.startDate+"T00:00:00")>now)return false;
   if(pr.endDate&&new Date(pr.endDate+"T23:59:59")<now)return false;
   if(Array.isArray(pr.daysOfWeek)&&pr.daysOfWeek.length&&!pr.daysOfWeek.includes(day))return false;
   return (pr.items||[]).some(i=>i.productId===p.id);
  });
  let price=Number(p.price||0);
  active.forEach(pr=>{const it=(pr.items||[]).find(i=>i.productId===p.id);if(!it)return;const required=Number(it.quantity||0);if(it.conditional&&required>0&&qty<required)return;price=it.priceType==="fixed"?Number(it.value||0):Math.max(0,price-(price*Number(it.value||0)/100));});
  return price;
 };
 const add=(p,quantityOverride,manualPriceOverride)=>{if(p?.active===false){setNotice("This product is inactive and cannot be sold.");return false}if(!settings.products.allowNegativePrice&&Number(p.price||0)<0){setNotice("Negative price is not allowed for "+p.name+".");return false}const service=Boolean(p.isService||p.service||p.serviceItem);if(settings.order.preventSaleBelowCost&&!service&&Number(p.price||0)<Number(p.cost||0)){setNotice("Sale below cost price is prevented for "+p.name+".");return false}const existing=settings.order.separateRow?null:cart.find(x=>x.id===p.id);const productDefaultQuantity=p.defaultQuantity===false?1:Math.max(1,Number(settings.order.defaultQuantity||1));const step=Math.max(1,Number(quantityOverride||productDefaultQuantity));const nextQty=(existing?.qty||0)+step;if(settings.order.preventNegativeInventory&&!service&&nextQty>Number(p.stock||0)){setNotice("Insufficient stock for "+p.name+".");return false}const hasManualPrice=manualPriceOverride!==undefined&&manualPriceOverride!==null&&Number.isFinite(Number(manualPriceOverride));const forcedPrice=hasManualPrice?Number(manualPriceOverride):null;setCart(c=>{const old=settings.order.separateRow?null:c.find(x=>x.id===p.id);const qty=(old?.qty||0)+step;const price=hasManualPrice?forcedPrice:(old?.manualPrice?old.price:promotionPrice(p,qty));const line=old?{...old,qty,price,isService:service,manualPrice:hasManualPrice?true:old.manualPrice}:{...p,id:p.id,productId:p.id,lineId:settings.order.separateRow?uid():p.id,qty,originalPrice:p.price,price,isService:service,manualPrice:hasManualPrice};return old?c.map(x=>x.id===p.id?line:x):[...c,line]});return true;};
 const changeQty=(key,d)=>{setCart(c=>c.flatMap(x=>{if((x.lineId||x.id)!==key)return [x];const qty=x.qty+d;if(qty<=0)return [];const base=products.find(p=>p.id===x.productId||p.id===x.id)||x;const service=Boolean(base.isService||base.service||base.serviceItem);const price=x.manualPrice?x.price:promotionPrice(base,qty);return [{...x,qty,price,originalPrice:base.price,isService:service}]}));};
 const updateLinePrice=(key,value)=>{const n=Number(value);if(!Number.isFinite(n)||n<0){setNotice("Enter a valid sale price.");return false}setCart(c=>c.map(x=>(x.lineId||x.id)===key?{...x,price:n,manualPrice:true}:x));return true};

 const completeSale=(paymentInfo={})=>{
  if(!cart.length)return setNotice("The cart is empty.");
  const primaryName=paymentInfo.payment||payment;
  const primary=paymentTypes.find(x=>x.name===primaryName)||paymentTypes.find(x=>x.enabled)||paymentTypes[0];
  if(primary?.customerRequired&&!customer)return setNotice("Please select a customer for this payment type.");
  const paidAmount=Number(paymentInfo.paidAmount??(primary?.markPaid?grand:0));
  const payments=(paymentInfo.payments&&paymentInfo.payments.length)?paymentInfo.payments.map(x=>({...x,amount:Number(x.amount||0)})):[{paymentTypeId:primary?.id,payment:primary?.name||primaryName,amount:paidAmount,paid:Boolean(primary?.markPaid)}];
  const totalPaymentAmount=payments.reduce((sum,x)=>sum+Number(x.amount||0),0);
  const allPaid=payments.every(x=>paymentTypes.find(pt=>pt.id===x.paymentTypeId)?.markPaid!==false)&&totalPaymentAmount>=grand;
  const customerObj=customers.find(c=>c.id===customer);
  const dueDays=Number(customerObj?.dueDatePeriod>0?customerObj.dueDatePeriod:settings.order.defaultDueDate||0);
  const dueDate=new Date(Date.now()+dueDays*86400000).toISOString();
  const documentCounter=nextDocumentCounter();
  const sale={id:uid(),no:formatDocumentNumber("Invoice",documentCounter),orderNumber:nextOrderNumber(documentCounter),date:new Date().toISOString(),dueDate,customerId:customer,items:cart,subtotal,discount:disc,tax,total:grand,payment:payments.length>1?"Split payment":(primary?.name||primaryName),paymentTypeId:primary?.id,paid:allPaid,paymentAmount:totalPaymentAmount,change:Math.max(0,totalPaymentAmount-grand),payments,voided:false,refunded:false,note:String(paymentInfo.note??posOrderMeta.comment??""),internalNote:String(paymentInfo.internalNote??""),orderName:String(paymentInfo.orderName??posOrderMeta.name??""),serviceType:String(paymentInfo.serviceType??posOrderMeta.serviceType??""),table:String(paymentInfo.table??posOrderMeta.table??""),receiptAllowed:paymentInfo.printReceipt!==false};
  const ns=[...sales,sale];
  const np=products.map(p=>{const i=cart.find(x=>x.id===p.id);return i?{...p,stock:Math.max(0,p.stock-i.qty)}:p});
  const lowStockItems=cart.map(i=>{const product=products.find(p=>p.id===i.id);const before=Number(product?.stock||0);const after=Math.max(0,before-Number(i.qty||0));const warningEnabled=product?.lowStockWarning!==false;const warningQty=Math.max(0,Number(product?.lowStockWarningQuantity??product?.reorder??0));return {product,before,after,warningEnabled,warningQty}}).filter(x=>x.product&&x.warningEnabled&&x.warningQty>0&&x.before>=x.warningQty&&x.after<x.warningQty);
  const notifiedIds=(()=>{try{return JSON.parse(sessionStorage.getItem("sp_low_stock_notified")||"[]")}catch{return[]}})();
  const freshLowStockItems=lowStockItems.filter(x=>!notifiedIds.includes(x.product.id));
  if(freshLowStockItems.length){try{sessionStorage.setItem("sp_low_stock_notified",JSON.stringify([...new Set([...notifiedIds,...freshLowStockItems.map(x=>x.product.id)])]))}catch{};setLowStockAlert(freshLowStockItems.map(x=>x.product))}
  persist("sales",ns,setSales);persist("products",np,setProducts);recordStockHistory(cart.map(i=>({id:uid(),date:new Date().toISOString(),productId:i.id,productName:i.name,code:i.code||"",type:"Sale",change:-Number(i.qty),quantityAfter:Number(products.find(p=>p.id===i.id)?.stock||0)-Number(i.qty),reference:sale.no})));
  const earnedPoints=allPaid&&customerObj&&customerObj.id!==1?Math.floor(Math.max(0,grand)):0;
  const nc=customers.map(c=>c.id===customer?{...c,visits:Number(c.visits||0)+1,spend:Number(c.spend||0)+(allPaid?grand:0),loyaltyPoints:Number(c.loyaltyPoints??Math.floor(Number(c.spend||0)))+earnedPoints}:c);
  persist("customers",nc,setCustomers);
  if(settings.order.showReceiptDialog===false){setLastSale(null);if(paymentInfo.printReceipt!==false)printReceipt(sale)}else setLastSale(sale);if(paymentInfo.openCashDrawer===true)setTimeout(()=>cashDrawer(),0);
  setCart([]);setDiscount(0);setDiscountFixed(0);setNotice("Sale completed successfully: "+sale.no+" — "+money(grand));setPage("POS / Sales");
 };
 const saveOpenOrder=({newSale=false,name="",comment="",serviceType="",table=""}={})=>{
  if(!cart.length){if(newSale){setNotice("There is no active sale to save.");}return false;}
  const order={id:uid(),name:String(name||posOrderMeta.name||("Order "+String(uid()).slice(-6))).trim(),date:new Date().toISOString(),customerId:customer,items:cart,discount:Number(discount||0),discountFixed:Number(discountFixed||0),taxRate:Number(taxRate||0),status:"Open",confirmed:true,comment:String(comment||posOrderMeta.comment||""),serviceType:String(serviceType||posOrderMeta.serviceType||""),table:String(table||posOrderMeta.table||"")};
  const next=[...orders,order];persist("orders",next,setOrders);setCart([]);setDiscount(0);setDiscountFixed(0);setPosOrderMeta({name:"",comment:"",serviceType:"Dine In",table:""});setNotice("Sale saved successfully: "+order.name);setPage("POS / Sales");return true;
 };
 const retrieveOpenOrder=(orderId)=>{
  const order=orders.find(o=>o.id===orderId);
  if(!order)return false;
  const normalized=(order.items||[]).map(i=>({...i,id:i.productId??i.id,productId:i.productId??i.id,lineId:i.lineId??i.id,qty:Math.max(1,Number(i.qty||1)),price:Number(i.price??0),originalPrice:Number(i.originalPrice??i.price??0)}));
  if(!normalized.length){setNotice("This open order has no items.");return false;}
  if(cart.length&&!window.confirm("Current sale contains items. Replace it with "+(order.name||"the selected order")+"?"))return false;
  setCart(normalized);setCustomer(order.customerId||1);setDiscount(Number(order.discount||0));setDiscountFixed(Number(order.discountFixed||0));setTaxRate(Number(order.taxRate||taxRate||0));setPosOrderMeta({name:order.name||"",comment:order.comment||"",serviceType:order.serviceType||"Dine In",table:order.table||""});
  const remaining=orders.filter(o=>o.id!==order.id);persist("orders",remaining,setOrders);setPage("POS / Sales");setNotice("Open order "+(order.name||"")+" loaded into POS.");return true;
 };
 const clearCurrentSale=()=>{setCart([]);setDiscount(0);setDiscountFixed(0);setNotice("Current sale cleared.");};
 const updateSaleNote=(sale,note,internalNote="")=>{
  const next=sales.map(x=>x.id===sale.id?{...x,note,internalNote}:x);persist("sales",next,setSales);setLastSale({...sale,note,internalNote});
 };
 const hardwareRequest=async(path,body)=>{
  const base=String(settings?.hardware?.agentUrl||"http://127.0.0.1:18765").replace(/\/$/,"");
  const r=await fetch(base+path,{method:body?"POST":"GET",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
  if(!r.ok)throw new Error("Hardware agent HTTP "+r.status);
  return r.json();
 };
 const cashDrawer=async()=>{
  try{const printer=settings?.hardware?.cashDrawerPrinter||settings?.print?.printer||"";if(!printer)throw new Error("No cash drawer printer configured.");await hardwareRequest("/cash-drawer",{printer,bytes:settings?.hardware?.cashDrawerPulse||[27,112,0,25,250]});setNotice("Cash drawer opened successfully.");}
  catch(e){setNotice("Cash drawer unavailable: "+e.message+". Check SP-Manager Local Agent and printer settings.");}
 };
 const recordCashMovement=(type,amount,reason)=>{
  const value=Number(amount);
  if(!Number.isFinite(value)||value<=0){setNotice("Enter a valid amount for Cash In / Out.");return false}
  const row={id:uid(),date:new Date().toISOString(),type,amount:value,reason:String(reason||"").trim()||"<No description>",user:activeUser?.name||activeUser?.username||"User"};
  const next=[row,...cashMovements];
  persist("cashMovements",next,setCashMovements);
  setNotice(`Cash ${type} recorded successfully.`);
  return true;
 };
 const openCashInOut=()=>{if(!isPermissionAllowed(activeUser,"cashInOut")){setNotice("You do not have permission to use Cash In / Out.");return}setShowCashInOutModal(true)};
 const printReceipt=(sale)=>{
  const c=customers.find(x=>x.id===sale.customerId);
  const prt=settings?.print||{};
  const loc=prt.localize||{};
  const receiptItems=settings?.order?.mergeItemsOnReceipt===false?(sale.items||[]):Object.values((sale.items||[]).reduce((m,i)=>{const k=String(i.id)+"|"+Number(i.price||0).toFixed(6);const old=m[k];m[k]=old?{...old,qty:Number(old.qty||0)+Number(i.qty||0)}:{...i};return m},{}));
  const decimals=Math.max(0,Math.min(4,Number(prt.decimalPlaces??2)));
  const fmt=n=>`RM${Number(n||0).toFixed(decimals)}`;
  const printedNo=prt.shortReceiptNumber?String(sale.no||"").split("-").pop():String(sale.no||"");
  const qtyTotal=receiptItems.reduce((a,i)=>a+Number(i.qty||0),0);
  const itemCount=receiptItems.length;
  const taxTotal=Number(sale.tax||0);
  const addressTokens={STREET_NAME:c?.streetName||"",BUILDING_NUMBER:c?.buildingNumber||"",ADDITIONAL_STREET_NAME:c?.additionalStreetName||"",ADDITIONAL_BUILDING_NUMBER:c?.additionalBuildingNumber||"",DISTRICT:c?.district||"",CITY:c?.city||"",POSTAL_CODE:c?.postalCode||"",COUNTRY_SUBENTITY:c?.state||"",COUNTRY:c?.country||""};
  const customerAddress=String(prt.addressFormat||"").replace(/%([A-Z_]+)%/g,(_,k)=>addressTokens[k]??"").split("\n").map(x=>x.trim()).filter(Boolean).join("\n");
  const label=(k,fallback)=>String(loc[k]??fallback);
  const receiptLines=[
   prt.header||"",
   company?.name||"Shining Pearl Tinted",
   company?.phoneNumber||"",
   company?.taxNumber?`${label("companyTaxNumber","Tax No.")}: ${company.taxNumber}`:"",
   "--------------------------------",
   `${label("receiptNumber","Receipt No.")}: ${printedNo}`,
   `${label("user","User")}: ${sale.user||""}`.replace(/: $/,""),
   prt.printOrderNumber&&sale.orderNumber?`${label("orderNumber","Order No.")}: ${sale.orderNumber}`:"",
   "Date: "+new Date(sale.date).toLocaleString(),
   prt.customerName!==false?`${label("customer","Customer")}: ${c?.name||"Walk-in Customer"}`:"",
   prt.customerAddress&&customerAddress?`${prt.customerLabelAddress!==false?label("address","Address")+": ":""}${customerAddress}`:"",
   prt.customerTaxNumber&&c?.taxNumber?`${prt.customerLabelTaxNumber!==false?label("taxNumber","Tax No.")+": ":""}${c.taxNumber}`:"",
   prt.customerCode&&c?.code?`${prt.customerLabelCode!==false?label("code","Code")+": ":""}${c.code}`:"",
   prt.customerPhone&&c?.phone?`${prt.customerLabelPhone!==false?label("phone","Phone")+": ":""}${c.phone}`:"",
   prt.customerEmail&&c?.email?`${prt.customerLabelEmail!==false?label("email","Email")+": ":""}${c.email}`:"",
   "--------------------------------",
   ...receiptItems.map(i=>`${String(i.qty||0).padStart(3)} ${String(i.name||"").slice(0,24).padEnd(24)} ${fmt(Number(i.price||0)*Number(i.qty||0))}`),
   "--------------------------------",
   prt.printItemsCount?`${label("itemsCount","Items count")}: ${prt.printTotalQuantity?qtyTotal:itemCount}`:"",
   `${label("subtotal","Subtotal")}: ${fmt(sale.subtotal)}`,
   Number(sale.discount||0)>0?`${label("discount","Cart discount")}: ${fmt(sale.discount)}`:"",
   prt.printTaxTotals&&taxTotal?`${label("taxRate","Tax")}: ${fmt(taxTotal)}`:"",
   `${label("total","TOTAL")}: ${fmt(sale.total)}`,
   `${label("paidAmount","Paid amount")}: ${fmt(sale.paymentAmount)}`,
   `${label("change","Change")}: ${fmt(sale.change)}`,
   prt.printOutstandingBalance&&Number(sale.outstandingBalance||0)>0?`${label("outstandingBalance","Outstanding balance")}: ${fmt(sale.outstandingBalance)}`:"",
   `Payment: ${sale.payment||"Cash"}`,
   prt.footer||"Thank you", ...(Array.from({length:Math.max(0,Number(prt.feedLines||0))},()=>""))
  ].filter(Boolean).join("\n");
  const printer=prt.printerReceipt||settings?.hardware?.printer||prt.printer||"";
  if(prt.printReceipt!==false&&printer){
   hardwareRequest("/print",{printer,text:receiptLines,copies:Number(prt.copies||1),options:{printerType:prt.printerType,paperSize:prt.paperSize,charactersPerLine:prt.charactersPerLine,rightToLeft:prt.rightToLeft,feedLines:prt.feedLines,cutPaper:prt.cutPaper,printBitmap:prt.printBitmap,richFormatting:prt.richFormatting,printBarcode:prt.printBarcode,printLogoFullWidth:prt.printLogoFullWidth,alignment:prt.alignment,codePage:prt.codePage,characterSet:prt.characterSet,marginTop:prt.marginTop,marginRight:prt.marginRight,marginBottom:prt.marginBottom,marginLeft:prt.marginLeft,fontFamily:prt.fontFamily,fontSize:prt.fontSize,logoData:prt.printBitmap?(company?.logo||""):"",barcodeData:prt.printBarcode?String(sale.orderNumber||sale.no||""):""}}).then(()=>setNotice("Receipt printed successfully.")).catch(()=>{const w=window.open("","_blank","width=420,height=720");if(!w){alert("Please allow pop-ups to print the receipt.");return}w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${sale.no}</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:18px;color:#111}pre{white-space:pre-wrap}</style></head><body><pre>${receiptLines.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</pre><script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`);w.document.close();});
   return;
  }
  const w=window.open("","_blank","width=420,height=720");if(!w){alert("Please allow pop-ups to print the receipt.");return}w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${sale.no}</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:18px;color:#111}pre{white-space:pre-wrap}</style></head><body><pre>${receiptLines.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</pre><script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`);w.document.close();
 };
 const refund=id=>{
  const s=sales.find(x=>x.id===id);if(!s||s.refunded||s.voided)return;
  const ns=sales.map(x=>x.id===id?{...x,refunded:true}:x);
  const np=products.map(p=>{const i=s.items.find(x=>x.id===p.id);return i?{...p,stock:p.stock+i.qty}:p});
  persist("sales",ns,setSales);persist("products",np,setProducts);recordStockHistory(s.items.map(i=>({id:uid(),date:new Date().toISOString(),productId:i.id,productName:i.name,code:i.code||"",type:"Refund",change:Number(i.qty),quantityAfter:Number(products.find(p=>p.id===i.id)?.stock||0)+Number(i.qty),reference:s.no})));setNotice("Refund completed successfully for "+s.no);
 };
 const voidSale=id=>{
  const s=sales.find(x=>x.id===id);if(!s||s.voided||s.refunded)return;
  let reason="";
  if(settings.order.requireVoidReason){
    const answer=window.prompt("Void reason","");
    if(answer===null)return;
    reason=String(answer).trim();
    if(!reason){setNotice("Void reason is required.");return}
  }else if(settings.order.trackUnconfirmedVoids){
    const answer=window.prompt("Void reason (optional)","");
    if(answer!==null)reason=String(answer).trim();
  }
  const ns=sales.map(x=>x.id===id?{...x,voided:true,voidReason:reason,voidConfirmed:settings.order.trackUnconfirmedVoids?Boolean(reason):true,voidedBy:activeUser?.name||activeUser?.username||"User",voidedAt:new Date().toISOString()}:x);
  const np=products.map(p=>{const i=s.items.find(x=>x.id===p.id);return i?{...p,stock:p.stock+i.qty}:p});
  persist("sales",ns,setSales);persist("products",np,setProducts);recordStockHistory(s.items.map(i=>({id:uid(),date:new Date().toISOString(),productId:i.id,productName:i.name,code:i.code||"",type:"Void",change:Number(i.qty),quantityAfter:Number(products.find(p=>p.id===i.id)?.stock||0)+Number(i.qty),reference:s.no})));setNotice("Transaction "+s.no+" has been voided."+(reason?" Reason: "+reason:""));
 };
 const addProduct=p=>{
  const np=[...products,normalizeProductStockControl({...p,id:uid(),price:Number(p.price),cost:Number(p.cost),stock:Number(p.stock),reorder:Number(p.reorder),preferredQuantity:Number(p.preferredQuantity),lowStockWarning:Boolean(p.lowStockWarning),lowStockWarningQuantity:Number(p.lowStockWarningQuantity),supplierId:String(p.supplierId||""),priceChangeAllowed:Boolean(p.priceChangeAllowed),isService:Boolean(p.isService),defaultQuantity:Boolean(p.defaultQuantity),active:p.active!==false})];
  persist("products",np,setProducts);setNotice("Product added successfully.");
 };
 const updateProduct=p=>{
  const np=products.map(x=>x.id===p.id?normalizeProductStockControl({...p}):x);persist("products",np,setProducts);setEditing(null);setNotice("Product updated successfully.");
 };
 const addCustomer=c=>{
  const nc=[...customers,{...c,id:uid(),visits:0,spend:0}];persist("customers",nc,setCustomers);setNotice("Customer added successfully.");
 };
 const receivePurchase=(supplierId,items,total,documentOverride=null)=>{
  const po=documentOverride||{id:uid(),no:"PO-"+String(uid()).slice(-7),date:new Date().toISOString(),supplierId,items,total,status:"Received"};
  const np=products.map(p=>{
    const i=items.find(x=>x.productId===p.id);
    if(!i)return p;
    const qty=Number(i.qty||0),purchaseCost=Number(i.cost||p.lastPurchasePrice||p.cost||0),oldStock=Math.max(0,Number(p.stock||0)),oldCost=Number(p.cost||0),newStock=oldStock+qty;
    let newCost=oldCost;
    if(settings.products.autoUpdateCost){
      newCost=settings.products.movingAverage&&newStock>0?((oldCost*oldStock)+(purchaseCost*qty))/newStock:purchaseCost;
    }
    let newPrice=Number(p.price||0);
    if(settings.products.costMarkup&&settings.products.updateSalePriceMarkup&&oldCost>0){
      const markup=(Number(p.price||0)/oldCost)-1;
      newPrice=Math.max(0,newCost*(1+markup));
    }
    return {...p,stock:newStock,cost:newCost,lastPurchasePrice:purchaseCost,price:newPrice,updatedAt:new Date().toISOString()};
  });
  persist("purchases",[...purchases,po],setPurchases);persist("products",np,setProducts);recordStockHistory(items.map(i=>{const p=products.find(x=>x.id===i.productId);return {id:uid(),date:new Date().toISOString(),productId:i.productId,productName:p?.name||"",code:p?.code||"",type:"Purchase",change:Number(i.qty),quantityAfter:Number(p?.stock||0)+Number(i.qty),reference:po.no}}));setNotice("Purchase received and stock updated successfully.");
 };
 const savePromo=p=>{const np=p.id?promos.map(x=>x.id===p.id?{...p}:x):[...promos,{...p,id:uid()}];persist("promos",np,setPromos);setNotice("Promotion saved successfully.")};
 const toggleBusiness=()=>{
  const closing=businessDay.open;
  const b={...businessDay,open:!businessDay.open,closedAt:closing?new Date().toISOString():null};
  if(closing&&settings.order.resetOrderNumberOnClose)save("orderCounter",0);
  persist("businessDay",b,setBusinessDay);setNotice(b.open?"Business day opened successfully.":"Business day closed successfully.");
 };
 useEffect(()=>{if(!businessDay.open&&settings.order.resetOrderNumberOnClose)save("orderCounter",0)},[businessDay.open,settings.order.resetOrderNumberOnClose]);

 if(!signedIn)return <Login users={users} company={company} onLogin={u=>{save("activeUser",u);sessionStorage.setItem("sp_auth","1");sessionStorage.setItem("sp_auth_version",AUTH_VERSION);setCurrentUser(u);setSignedIn(true);setPage("POS / Sales")}}/>;
 return <div className={"app app-theme-"+String(settings.general.colorScheme||"Light").toLowerCase().replace(/\s+/g,"-")} dir={settings.general.direction||"ltr"} style={{zoom:Number(settings.general.zoom||100)/100}}>
  <aside className={mobileNavOpen?"mobile-nav is-open":"mobile-nav"}><div className="brand"><button type="button" className="mobile-nav-close" aria-label="Close menu" onClick={()=>setMobileNavOpen(false)}>×</button><b>SP</b><span><strong>SP-Manager</strong><small>Shining Pearl Tinted</small></span></div><label>MODULES</label>
   {nav.filter(n=>{const map={"Products":"manageProducts","Inventory":"manageInventory","Customers":"manageCustomers","Purchases":"managePurchases","Payments":"managePayments","Payment Types":"managePayments","Refund / Void":"managePayments","Discount / Promotion":"manageDiscount","Tax":"manageTax","Loyalty":"manageLoyalty","Users & Permissions":"manageUsers","Reports":"manageReports","X / Z Report":"endOfDay","Named Order / Takeaway":"viewOpenSales","My company":"manageSettings","Settings":"manageSettings"};return n==="Management"?hasManagementAccess(activeUser):(!map[n]||isPermissionAllowed(activeUser,map[n]))}).map(n=><button className={page===n?"active":""} onClick={()=>{setPage(n);setQ("");setMobileNavOpen(false)}} key={n}>▸ {n}</button>)}
  </aside>
  <main><header><button type="button" className="mobile-nav-open" aria-label="Open menu" onClick={()=>setMobileNavOpen(true)}>☰</button><div><small>SHINING PEARL TINTED</small><h1>{page}</h1></div><div className="head-actions"><span className={"header-status-pill header-status-business "+(businessDay.open?"is-open":"is-closed")}><i/> {businessDay.open?"Business Day Open":"Closed"}</span><span className="header-status-pill header-status-online"><i/> Online</span></div></header>
   {notice&&<div className={"notice notice-"+String(settings.general.notificationPosition||settings.general.messagePosition||"Top").toLowerCase()+(settings.general.slideIn?" notice-slide-in":"")} onClick={()=>settings.general.clickToClose&&setNotice("")}>
    <span>{notice}</span>{settings.general.showClose!==false&&<button onClick={e=>{e.stopPropagation();setNotice("")}}>×</button>}
   </div>}
   {page==="Dashboard"&&<Dashboard sales={activeSales} total={today} products={products} customers={customers} lowStock={lowStock} setPage={setPage} businessDay={businessDay} toggleBusiness={toggleBusiness}/>}
   {page==="Management"&&hasManagementAccess(activeUser)&&<Management activeUser={activeUser} setPage={setPage}/>}
   {page==="POS / Sales"&&<POS setCart={setCart} updateLinePrice={updateLinePrice} activeUser={activeUser} posOrderMeta={posOrderMeta} setPosOrderMeta={setPosOrderMeta} retrieveOpenOrder={retrieveOpenOrder} signOut={signOut} filtered={filtered} q={q} setQ={setQ} posSearchMode={posSearchMode} setPosSearchMode={setPosSearchMode} add={add} cart={cart} changeQty={changeQty} customers={customers} setCustomers={v=>{persist("customers",v,setCustomers)}} customer={customer} setCustomer={setCustomer} discount={discount} setDiscount={setDiscount} discountFixed={discountFixed} setDiscountFixed={setDiscountFixed} payment={payment} setPayment={setPayment} paymentTypes={paymentTypes} subtotal={subtotal} disc={disc} taxRate={taxRate} setTaxRate={setTaxRate} tax={tax} grand={grand} sale={completeSale} saveOpenOrder={saveOpenOrder} orders={orders} setOrders={setOrders} updateSaleNote={updateSaleNote} setNoteBox={setNoteBox} clearCurrentSale={clearCurrentSale} printReceipt={printReceipt} closeLastSale={()=>setLastSale(null)} categories={categories} settings={settings} posCategory={posCategory} setPosCategory={setPosCategory} products={products} company={company} lastSale={lastSale} menuOpen={posMenu} setMenuOpen={setPosMenu} setPage={setPage} sales={sales} emailReceipt={emailReceipt} openCashInOut={openCashInOut} openCashDrawer={cashDrawer} openEndOfDayFromPOS={openEndOfDayFromPOS}/>}
   {page==="Products"&&<Products products={products} setProducts={setProducts} addProduct={addProduct} updateProduct={updateProduct} editing={editing} setEditing={setEditing} categories={categories} setCategories={setCategories} productGroups={productGroups} setProductGroups={setProductGroups} suppliers={suppliers} setNotice={setNotice} settings={settings}/>}
   {page==="Inventory"&&<Inventory products={products} setProducts={setProducts} stockHistory={stockHistory} setStockHistory={setStockHistory} categories={categories}/>}
   {page==="Customers"&&<Customers customers={customers} addCustomer={addCustomer} setCustomers={setCustomers} sales={sales}/>}
   {page==="Purchases"&&<Purchases products={products} suppliers={suppliers} receivePurchase={receivePurchase} purchases={purchases} setPurchases={setPurchases} setNotice={setNotice} paymentTypes={paymentTypes}/>}
   {page==="Payments"&&<Payments sales={sales} customers={customers} emailReceipt={emailReceipt} company={company} settings={settings}/>}
   {page==="Payment Types"&&<PaymentTypes paymentTypes={paymentTypes} setPaymentTypes={v=>{persist("paymentTypes",v,setPaymentTypes);setNotice("Payment type settings saved successfully.")}} onRefresh={()=>setPaymentTypes(load("paymentTypes",paymentTypes))}/>}
   {page==="Refund / Void"&&isPermissionAllowed(activeUser,"managePayments")&&<RefundVoid sales={sales} refund={refund} voidSale={voidSale}/>}
   {page==="Discount / Promotion"&&<Promotions promos={promos} savePromo={savePromo} products={products} categories={categories} productGroups={productGroups} onRefresh={()=>setPromos(load("promos",promos))}/>} 
   {page==="Tax"&&<Tax rate={taxRate} setRate={r=>{setTaxRate(r);save("taxRate",r);setNotice("Tax rate saved successfully.")}}/>}
  {page==="Loyalty"&&<Loyalty customers={customers} setCustomers={setCustomers}/>}
   {page==="Users & Permissions"&&isPermissionAllowed(activeUser,"manageUsers")&&<Users users={users} setUsers={u=>{persist("users",u,setUsers);setNotice("User updated successfully.")}} activeUser={activeUser} setCurrentUser={setCurrentUser}/>}
   {page==="Cash In / Out"&&isPermissionAllowed(activeUser,"cashInOut")&&<CashInOut movements={cashMovements} setMovements={v=>{persist("cashMovements",v,setCashMovements)}} setNotice={setNotice}/>}
   {page==="Credit payments"&&isPermissionAllowed(activeUser,"creditPayments")&&<CreditPayments sales={sales} setSales={v=>{persist("sales",v,setSales)}} paymentTypes={paymentTypes} setNotice={setNotice}/>}
   {page==="Reports"&&<Reports sales={sales} products={products} customers={customers} purchases={purchases} businessDay={businessDay} users={users} suppliers={suppliers} paymentTypes={paymentTypes}/>}
   {page==="End of day"&&isPermissionAllowed(activeUser,"endOfDay")&&<EndOfDay sales={sales} businessDay={businessDay} paymentTypes={paymentTypes} activeUser={activeUser} orders={orders} cashMovements={cashMovements} setCashMovements={setCashMovements} setSales={setSales} setBusinessDay={setBusinessDay} setNotice={setNotice} onClose={()=>{sessionStorage.removeItem("sp_eod_source");setPage("POS / Sales")}}/> }
   {page==="POS / Sales"&&showEndOfDay&&isPermissionAllowed(activeUser,"endOfDay")&&<div className="eod-pos-overlay" role="dialog" aria-modal="true" aria-label="End of day"><EndOfDay sales={sales} businessDay={businessDay} paymentTypes={paymentTypes} activeUser={activeUser} orders={orders} cashMovements={cashMovements} setCashMovements={setCashMovements} setSales={setSales} setBusinessDay={setBusinessDay} setNotice={setNotice} onClose={()=>{sessionStorage.removeItem("sp_eod_source");setShowEndOfDay(false)}}/></div>}
   {page==="X / Z Report"&&<XZ sales={sales} businessDay={businessDay} paymentTypes={paymentTypes}/> }
   {page==="Named Order / Takeaway"&&<NamedOrders orders={orders} setOrders={o=>{persist("orders",o,setOrders);setNotice("Order saved successfully.")}} customers={customers} onOpenOrder={retrieveOpenOrder}/>}
   {page==="My company"&&<MyCompany company={company} setCompany={v=>{persist("company",v,setCompany);setNotice("Company data saved successfully.")}}/>}
   {page==="Settings"&&isPermissionAllowed(activeUser,"manageSettings")&&<Settings settings={settings} setSettings={updateSettings} businessDay={businessDay} toggleBusiness={toggleBusiness} taxRate={taxRate} setTaxRate={r=>{setTaxRate(r);save("taxRate",r)}} company={company} onCancel={()=>setPage("POS / Sales")}/>}
   {!nav.includes(page)&&page!=="Management"&&!['Cash In / Out','Credit payments','End of day'].includes(page)&&<div className="panel"><div className="eyebrow">SP-MANAGER</div><h2>Page not available</h2><p>The selected module could not be loaded.</p><button className="primary" onClick={()=>setPage("POS / Sales")}>Back to POS / Sales</button></div>}
   {showCashInOutModal&&page==="POS / Sales"&&<CashInOutModal movements={cashMovements} activeUser={activeUser} onClose={()=>setShowCashInOutModal(false)} onSave={recordCashMovement} onCashDrawer={cashDrawer}/>}
   {lowStockAlert&&page==="POS / Sales"&&<div className="ar-low-stock-backdrop" role="dialog" aria-modal="true" aria-labelledby="ar-low-stock-title"><div className="ar-low-stock-dialog"><div className="ar-low-stock-icon" aria-hidden="true">!</div><div className="ar-low-stock-content"><h2 id="ar-low-stock-title">Products are reaching low stock quantity</h2><p>Some products have reached their reorder point.</p><p>Consider purchasing the following items: <b>{lowStockAlert.map(p=>p.name).join(", ")}</b>.</p></div><button className="ar-low-stock-ok" onClick={()=>setLowStockAlert(null)}>OK</button></div></div>}
   {messageBox&&<div className="sp-messagebox-backdrop" role="dialog" aria-modal="true" aria-labelledby="sp-messagebox-title"><div className="sp-messagebox"><div className={"sp-messagebox-icon "+(messageBox.type||"warning")} aria-hidden="true">{messageBox.type==="error"?"!":"i"}</div><div className="sp-messagebox-content"><div className="sp-messagebox-kicker">SP-MANAGER</div><h2 id="sp-messagebox-title">{messageBox.title||"Message"}</h2><p>{messageBox.message}</p></div><button type="button" className="sp-messagebox-close" aria-label="Close" onClick={()=>setMessageBox(null)}>×</button><div className="sp-messagebox-actions"><button type="button" className="sp-messagebox-ok" onClick={()=>setMessageBox(null)}>OK</button></div></div></div>}
   {noteBox&&<div className="sp-notes-backdrop" role="dialog" aria-modal="true" aria-labelledby="sp-notes-title"><div className="sp-notes-modal"><div className="sp-notes-header"><div><div className="sp-notes-kicker">SP-MANAGER</div><h2 id="sp-notes-title">Notes</h2></div><button type="button" className="sp-notes-close" aria-label="Close" onClick={()=>setNoteBox(null)}>×</button></div><div className="sp-notes-body"><section className="sp-notes-section sp-notes-document"><div className="sp-notes-section-title">Document</div><div className="sp-notes-document-grid"><div><span>Document number:</span><b>{noteBox.sale?.no||"—"}</b></div><div><span>Customer:</span><b>{(customers||[]).find(c=>c.id===noteBox.sale?.customerId)?.name||"Walk-in customer"}</b></div><div><span>Total:</span><b>{money(noteBox.sale?.total||0)}</b></div></div></section><section className="sp-notes-section"><label className="sp-notes-label">Public note <span>Printed on invoice / receipt</span></label><textarea autoFocus className="sp-notes-textarea" value={noteBox.note||""} onChange={e=>setNoteBox({...noteBox,note:e.target.value})} placeholder="Enter public note..." /></section><section className="sp-notes-section"><label className="sp-notes-label">Internal note <span>For internal reference only</span></label><textarea className="sp-notes-textarea" value={noteBox.internalNote||""} onChange={e=>setNoteBox({...noteBox,internalNote:e.target.value})} placeholder="Enter internal note..." /></section></div><div className="sp-notes-footer"><button type="button" className="sp-notes-cancel" onClick={()=>setNoteBox(null)}>✕&nbsp; Cancel</button><button type="button" className="sp-notes-ok" onClick={()=>{updateSaleNote(noteBox.sale,noteBox.note||"",noteBox.internalNote||"");setNoteBox(null)}}>✓&nbsp; OK</button></div></div></div>}
  </main>
 </div>
}

function Login({users,company,onLogin}){
 const[username,setUsername]=useState("");const[password,setPassword]=useState("");const[showPassword,setShowPassword]=useState(false);const[error,setError]=useState("");const[busy,setBusy]=useState(false);
 const companyLogo=company?.loginLogo||company?.logo||"";
 const submit=async e=>{e.preventDefault();setError("");setBusy(true);const u=users.find(x=>String(x.username||"").toLowerCase()===username.trim().toLowerCase()&&x.enabled);await new Promise(r=>setTimeout(r,180));if(!u||u.password!==password){setError("Invalid username or password.");setBusy(false);return}onLogin(u);setBusy(false)};
 return <div className="login-screen"><div className="login-glow login-glow-a"></div><div className="login-glow login-glow-b"></div><div className="login-card login-card-premium"><div className={"login-brand-mark "+(companyLogo?"login-brand-mark-image":"login-brand-mark-fallback")}>{companyLogo?<img src={companyLogo} alt="Company logo"/>:<span>SP</span>}</div><div className="login-brand-name login-company-title">SHINING PEARL TINTED</div><form onSubmit={submit}><label><span>Username</span><div className="login-input-wrap"><i>◉</i><input autoFocus value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" placeholder="Enter your username"/></div></label><label><span>Password</span><div className="login-password-wrap login-input-wrap"><i>●</i><input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password"/><button type="button" className="login-password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?"Hide":"Show"}</button></div></label>{error&&<div className="login-error">⚠ {error}</div>}<button className="login-submit" type="submit" disabled={busy}>{busy?<><span className="login-spinner"></span>Signing in…</>:<>Sign in <span>→</span></>}</button></form><div className="login-footer"><span>●</span> Offline-ready business system</div></div></div>
}


function NamedOrders({orders,setOrders,customers,onOpenOrder}){
 const refreshOrders=()=>{const latest=load("orders",orders);setOrders(Array.isArray(latest)?latest:orders)};
 const[name,setName]=useState("");const[customerId,setCustomerId]=useState(1);const[search,setSearch]=useState("");
 const visible=orders.filter(o=>String(o.name||o.orderName||"").toLowerCase().includes(search.toLowerCase()));
 const add=()=>{if(!name.trim())return;setOrders([...orders,{id:uid(),name:name.trim(),customerId,date:new Date().toISOString(),status:"Open",items:[]}]);setName("")};
 const closeOrder=id=>setOrders(orders.filter(x=>x.id!==id));
 return <section className="named-orders-page">
  <div className="named-orders-topbar">
   <div><div className="eyebrow">OPEN ORDERS</div><h2>Named Order / Takeaway</h2><p>Create, retrieve and manage open orders.</p></div>
   <div className="named-orders-actions"><button type="button" onClick={refreshOrders} title="Refresh">↻<span>Refresh</span></button><button type="button" onClick={add} title="New order">＋<span>New order</span></button></div>
  </div>
  <div className="named-orders-toolbar">
   <div className="named-order-create"><input placeholder="Order name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add()}}/><select value={customerId} onChange={e=>setCustomerId(Number(e.target.value))}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="primary" onClick={add}>＋ New order</button></div>
   <div className="named-order-search"><span>⌕</span><input placeholder="Search open orders…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
  </div>
  <div className="named-orders-card">
   <div className="named-orders-card-head"><div><b>Open orders</b><small>{visible.length} order{visible.length===1?"":"s"}</small></div><span>Orders remain available until closed.</span></div>
   <div className="named-orders-table-wrap"><table className="named-orders-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{visible.map(o=>{const c=customers.find(x=>x.id===o.customerId);return <tr key={o.id}><td><div className="order-name-cell"><span className="order-icon">▤</span><div><b>{o.name}</b><small>#{String(o.id).slice(-6)}</small></div></div></td><td>{c?.name||"Walk-in Customer"}</td><td>{new Date(o.date).toLocaleString("en-MY")}</td><td><span className="order-status">● {o.status||"Open"}</span></td><td><button className="table-action" onClick={()=>onOpenOrder?.(o.id)}>Open in POS</button><button className="table-action" onClick={()=>closeOrder(o.id)}>Close</button></td></tr>})}</tbody></table>{!visible.length&&<div className="named-orders-empty"><div>▤</div><b>No named orders</b><span>Create a new order above to see it here.</span></div>}</div>
  </div>
 </section>
}
function Field({label,children,wide=false}){return <label className={"settings-field"+(wide?" wide":"")}><span>{label}</span>{children}</label>}
function CashInOutModal({movements,activeUser,onClose,onSave,onCashDrawer}){
 const[type,setType]=useState("In");
 const[amount,setAmount]=useState("");
 const[reason,setReason]=useState("");
 useEffect(()=>{const onKey=e=>{if(e.key==="Escape")onClose();if(e.key==="Enter"&&document.activeElement?.tagName!=="TEXTAREA")e.preventDefault()};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[onClose]);
 const balance=movements.reduce((a,x)=>a+(x.type==="In"?Number(x.amount):-Number(x.amount)),0);
 const save=()=>{if(onSave(type,amount,reason))setAmount("");if(Number(amount)>0){setReason("")}};
 return <div className="sp-cash-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sp-cash-modal-title" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="sp-cash-modal" onMouseDown={e=>e.stopPropagation()}>
   <div className="sp-cash-modal-head"><div><span className="eyebrow">POS / CASH MANAGEMENT</span><h2 id="sp-cash-modal-title">Cash In / Out</h2><small>{activeUser?.name||activeUser?.username||"User"} · {new Date().toLocaleDateString("en-GB")}</small></div><button type="button" className="sp-cash-close" onClick={onClose} aria-label="Close">×</button></div>
   <div className="sp-cash-modal-body">
    <div className="sp-cash-actions"><button type="button" className={type==="In"?"is-active":""} onClick={()=>setType("In")}><span>↓</span><b>Add cash</b></button><button type="button" className={type==="Out"?"is-active is-out":""} onClick={()=>setType("Out")}><span>↑</span><b>Remove cash</b></button><button type="button" className="sp-cash-drawer" onClick={()=>onCashDrawer?.()}><span>▤</span><b>Cash drawer</b></button></div>
    <div className="sp-cash-form-grid"><label><span>Amount</span><input autoFocus type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" onKeyDown={e=>{if(e.key==="Enter")save()}}/></label><label className="wide"><span>Description</span><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Enter the reason for adding or removing cash..."></textarea></label></div>
    <div className="sp-cash-entry-head"><div><b>Cash entries ({movements.length})</b><small>Current balance: {money(balance)}</small></div><span>{activeUser?.name||activeUser?.username||"User"}</span></div>
    <div className="sp-cash-entry-list">{movements.length?movements.slice(0,50).map(x=><div className="sp-cash-entry" key={x.id}><span className={x.type==="In"?"in":"out"}>{x.type==="In"?"↓":"↑"}</span><div><b>{money(x.amount)} · {x.reason||"<No description>"}</b><small>{x.user||activeUser?.name||activeUser?.username||"User"} @ {new Date(x.date).toLocaleString("en-MY")}</small></div></div>):<div className="sp-cash-empty">No cash entries recorded.</div>}</div>
   </div>
   <div className="sp-cash-modal-foot"><span>Balance <b>{money(balance)}</b></span><div><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={!Number(amount)||Number(amount)<=0} onClick={save}>✓ Save</button></div></div>
  </div>
 </div>
}

function CashInOut({movements,setMovements,setNotice}){
 const[type,setType]=useState("In");
 const[amount,setAmount]=useState("");
 const[reason,setReason]=useState("");
 const saveMovement=()=>{
  const value=Number(amount);
  if(!Number.isFinite(value)||value<=0){setNotice("Enter a valid amount for Cash In / Out.");return}
  const row={id:uid(),date:new Date().toISOString(),type,amount:value,reason:reason.trim()||"Manual cash movement"};
  const next=[row,...movements];persist("cashMovements",next,setMovements);setAmount("");setReason("");setNotice(`Cash ${type} recorded successfully.`);
 };
 const balance=movements.reduce((a,x)=>a+(x.type==="In"?Number(x.amount):-Number(x.amount)),0);
 return <section className="content"><div className="panel"><div className="toolbar"><div><div className="eyebrow">MANAGEMENT</div><h2>Cash In / Out</h2><small>Record non-sales cash movements for the current business day.</small></div><div className="cards"><Card t="Cash balance" v={money(balance)}/></div></div><div className="settings-grid">
  <label className="settings-field"><span>Type</span><select value={type} onChange={e=>setType(e.target.value)}><option>In</option><option>Out</option></select></label>
  <label className="settings-field"><span>Amount</span><input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label>
  <label className="settings-field wide"><span>Reason</span><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Petty cash, cash deposit, expense"/></label>
 </div><button className="primary" onClick={saveMovement}>＋ Record Cash {type}</button><div className="table-wrap" style={{marginTop:16}}><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Reason</th></tr></thead><tbody>{movements.map(x=><tr key={x.id}><td>{new Date(x.date).toLocaleString("en-MY")}</td><td>{x.type}</td><td>{money(x.amount)}</td><td>{x.reason}</td></tr>)}</tbody></table>{!movements.length&&<Empty text="No cash movements recorded."/>}</div></div></section>
}
function CreditPayments({sales,setSales,paymentTypes,setNotice}){
 const[amounts,setAmounts]=useState({});
 const unpaid=sales.filter(s=>!s.voided&&!s.refunded&&!s.paid&&Number(s.total||0)>Number(s.paymentAmount||0));
 const collect=(sale)=>{
  const amount=Number(amounts[sale.id]||0);
  const outstanding=Math.max(0,Number(sale.total||0)-Number(sale.paymentAmount||0));
  if(!Number.isFinite(amount)||amount<=0||amount>outstanding){setNotice("Enter a payment amount not greater than the outstanding balance.");return}
  const pt=paymentTypes.find(x=>x.enabled&&x.name!=="Unpaid")||paymentTypes.find(x=>x.enabled)||paymentTypes[0];
  const newPaid=Number(sale.paymentAmount||0)+amount;
  const fullyPaid=newPaid>=Number(sale.total||0);
  const entry={paymentTypeId:pt?.id,payment:pt?.name||"Cash",amount,paid:true,date:new Date().toISOString(),creditPayment:true};
  const next=sales.map(x=>x.id===sale.id?{...x,paymentAmount:newPaid,paid:fullyPaid,payments:[...(x.payments||[]),entry],creditPayments:[...(x.creditPayments||[]),entry]}:x);
  persist("sales",next,setSales);setAmounts(a=>({...a,[sale.id]:""}));setNotice(`Credit payment recorded for ${sale.no}.`);
 };
 return <section className="content"><div className="panel"><div className="eyebrow">MANAGEMENT</div><h2>Credit payments</h2><p>Collect outstanding balances from unpaid POS sales.</p><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Payment</th><th>Action</th></tr></thead><tbody>{unpaid.map(s=>{const outstanding=Math.max(0,Number(s.total||0)-Number(s.paymentAmount||0));return <tr key={s.id}><td>{s.no}</td><td>{s.customerName||s.customer||s.customerId||"Walk-in"}</td><td>{money(s.total)}</td><td>{money(s.paymentAmount||0)}</td><td><b>{money(outstanding)}</b></td><td><input type="number" min="0" max={outstanding} step="0.01" value={amounts[s.id]??outstanding} onChange={e=>setAmounts(a=>({...a,[s.id]:e.target.value}))}/></td><td><button onClick={()=>collect(s)}>Collect</button></td></tr>})}</tbody></table>{!unpaid.length&&<Empty text="No outstanding credit payments."/>}</div></div></section>
}
function Reports({sales,products,customers,purchases,businessDay,users,suppliers,paymentTypes}){
 const total=sales.filter(s=>!s.voided&&!s.refunded).reduce((a,s)=>a+Number(s.total||0),0);const tx=sales.filter(s=>!s.voided&&!s.refunded).length;const unpaid=sales.filter(s=>s.payment==="Unpaid").reduce((a,s)=>a+Number(s.total||0),0);const profit=sales.filter(s=>!s.voided&&!s.refunded).reduce((a,s)=>a+s.items.reduce((q,i)=>{const p=products.find(x=>x.id===i.id);return q+(Number(i.price||0)-Number(p?.cost||0))*Number(i.qty||0)},0),0);
 return <section className="content"><div className="panel"><div className="eyebrow">REPORTING</div><h2>Reports</h2><p>Sales and business summaries from the current local database.</p><div className="cards"><Card t="Sales" v={money(total)}/><Card t="Transactions" v={tx}/><Card t="Gross margin" v={money(profit)}/><Card t="Unpaid" v={money(unpaid)}/></div><Table cols={["Report","Value"]} rows={[["Products",products.length],["Customers",customers.length],["Purchases",purchases.length],["Users",users.length],["Suppliers",suppliers.length],["Payment types",paymentTypes.length],["Business day",businessDay.open?"Open":"Closed"]]}/></div></section>
}
function EndOfDay({sales,businessDay,paymentTypes,activeUser,orders,cashMovements,setCashMovements,setSales,setBusinessDay,setNotice,onClose}){
 const [tab,setTab]=useState("End of day");
 const [option,setOption]=useState("");
 const [busy,setBusy]=useState(false);
 const [reports,setReports]=useState(()=>load("zReports",[]));
 const active=sales.filter(s=>!s.voided&&!s.refunded);
 const openOrders=orders.filter(o=>String(o.status||"Open").toLowerCase()==="open");
 const userName=activeUser?.name||activeUser?.username||"User";
 const currentUserSales=active.filter(s=>{
  const owner=s.userName||s.cashier||s.user||"";
  return !owner||owner===userName;
 });
 const baseSales=currentUserSales.length?currentUserSales:active;
 const cashSales=baseSales.filter(s=>s.payment==="Cash"||Array.isArray(s.payments)&&s.payments.some(p=>p.payment==="Cash"));
 const tenderRows=paymentTypes.filter(p=>p.enabled!==false).map(p=>{
  const rows=baseSales.filter(s=>s.payment===p.name||(Array.isArray(s.payments)&&s.payments.some(x=>x.payment===p.name)));
  const amount=rows.reduce((sum,s)=>sum+(Array.isArray(s.payments)&&s.payments.length?s.payments.filter(x=>x.payment===p.name).reduce((a,x)=>a+Number(x.amount||0),0):Number(s.total||0)),0);
  return {name:p.name,count:rows.length,amount};
 });
 const total=baseSales.reduce((a,s)=>a+Number(s.total||0),0);
 const cashTotal=cashSales.reduce((a,s)=>a+(Array.isArray(s.payments)&&s.payments.length?s.payments.filter(x=>x.payment==="Cash").reduce((q,x)=>q+Number(x.amount||0),0):Number(s.total||0)),0);
 const formatDate=d=>new Date(d).toLocaleDateString("en-GB");
 const createReport=()=>({id:uid(),number:reports.length+1,date:new Date().toISOString(),user:userName,total, cashTotal, transactions:baseSales.length,tenders:tenderRows});
 const persistReports=next=>{save("zReports",next);setReports(next)};
 const cashOutUser=()=>{
  if(!baseSales.length){setNotice("No completed transactions to cash out.");return}
  const row={id:uid(),date:new Date().toISOString(),type:"Out",amount:cashTotal,reason:`End of day cash out - ${userName}`,user:userName};
  const next=[row,...cashMovements];save("cashMovements",next);setCashMovements(next);
  setNotice(`${userName} cashed out successfully.`);
  setOption("");
 };
 const cashOutAll=()=>{
  if(!active.length){setNotice("No completed transactions to cash out.");return}
  const allCash=active.reduce((sum,s)=>sum+(Array.isArray(s.payments)&&s.payments.length?s.payments.filter(x=>x.payment==="Cash").reduce((a,x)=>a+Number(x.amount||0),0):(s.payment==="Cash"?Number(s.total||0):0)),0);
  const row={id:uid(),date:new Date().toISOString(),type:"Out",amount:allCash,reason:"End of day cash out - all users",user:userName};
  const next=[row,...cashMovements];save("cashMovements",next);setCashMovements(next);
  setNotice("All users successfully cashed out.");setOption("");
 };
 const closeRegister=()=>{
  if(openOrders.length){setNotice("There are users with open orders! All orders must be closed before closing the day.");return}
  setBusy(true);
  const report=createReport();
  const nextReports=[report,...reports];
  persistReports(nextReports);
  const closed={...businessDay,open:false,closedAt:new Date().toISOString(),lastZReport:report.number};
  save("businessDay",closed);setBusinessDay(closed);
  setNotice("Register successfully closed");setBusy(false);setOption("");
 };
 const continueAction=()=>{if(option==="user")cashOutUser();else if(option==="all")cashOutAll();else if(option==="close")closeRegister();};
 const printReport=report=>{if(!report)return;window.print();};
 return <section className="eod-page">
  <div className="eod-shell">
   <div className="eod-head"><div><div className="eyebrow">POS / CLOSING</div><h2>End of day</h2><p>{userName} · {formatDate(new Date())} · {businessDay.open?"Business day open":"Business day closed"}</p></div><button className="eod-close" onClick={onClose||(()=>{})} aria-label="Close">×</button></div>
   <div className="eod-alert"><span>!</span><div><b>Printer status</b><small>Printer is disabled or not selected. Reports may not be printed.</small></div></div>
   <div className="eod-tabs"><button className={tab==="End of day"?"active":""} onClick={()=>setTab("End of day")}>End of day</button><button className={tab==="History"?"active":""} onClick={()=>setTab("History")}>History</button></div>
   {tab==="End of day"&&<div className="eod-body">
    <div className="eod-section-title">Select cash out option</div>
    <div className="eod-options">
      <button className={option==="user"?"selected":""} onClick={()=>setOption("user")}><span>♟</span><b>Cash out</b><small>{userName}</small></button>
      <button className={option==="all"?"selected":""} onClick={()=>setOption("all")}><span>♟♟</span><b>Cash out all users</b><small>All active users</small></button>
      <button className={option==="close"?"selected":""} onClick={()=>setOption("close")}><span>⇥</span><b>Close register</b><small>Create Z report & close business day</small></button>
      <button className="eod-report" onClick={()=>{const r=reports[0]||createReport();printReport(r)}}><span>×</span><b>REPORT</b><small>Print latest Z report</small></button>
    </div>
    <div className="eod-summary-grid">
      <div className="eod-summary-card"><small>Open transactions</small><strong>{openOrders.length}</strong><span>{openOrders.length?"Must be closed before register close":"Ready to close"}</span></div>
      <div className="eod-summary-card"><small>Transactions</small><strong>{baseSales.length}</strong><span>Current user / shift</span></div>
      <div className="eod-summary-card"><small>Day total</small><strong>{money(total)}</strong><span>Sales for this closing</span></div>
      <div className="eod-summary-card"><small>Cash</small><strong>{money(cashTotal)}</strong><span>Cash tender total</span></div>
    </div>
    <div className="eod-tender-panel"><div className="eod-panel-head"><b>Tender types</b><span>{baseSales.length} transactions</span></div>{tenderRows.map(x=><div className="eod-tender-row" key={x.name}><span>{x.name}</span><small>{x.count} transaction{x.count===1?"":"s"}</small><b>{money(x.amount)}</b></div>)}</div>
    {option==="close"&&openOrders.length>0&&<div className="eod-warning"><b>Open orders</b><span>There are users with open orders. All orders must be closed before closing the day.</span></div>}
   </div>}
   {tab==="History"&&<div className="eod-history"><div className="eod-info">ⓘ <span>Use the list below to select and print a copy of any previously generated Z report.</span></div><div className="eod-history-toolbar"><b>{reports.length?`${formatDate(reports[reports.length-1].date)} - ${formatDate(reports[0].date)}`:"No reports yet"}</b><div><button disabled={!reports.length} onClick={()=>printReport(reports[0])}>▣ Print</button><button disabled={!reports.length} onClick={()=>{if(!reports.length)return;const r=reports[0];const csv=[["Z Report",r.number],["Date",new Date(r.date).toLocaleString("en-GB")],["User",r.user||"User"],["Total",Number(r.total||0).toFixed(2)],[],["Tender type","Transactions","Amount"],...(r.tenders||[]).map(x=>[x.name,x.count,Number(x.amount||0).toFixed(2)])].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Z-Report-${String(r.number).padStart(4,"0")}.csv`;a.click();URL.revokeObjectURL(a.href)}}>⌁ Save</button></div></div><div className="eod-history-table"><div className="eod-history-head"><span>Number</span><span>Date</span><span>User</span><span>Total</span><span>Action</span></div>{reports.length?reports.map(r=><div className="eod-history-row" key={r.id}><span>{String(r.number).padStart(4,"0")}</span><span>{new Date(r.date).toLocaleString("en-GB")}</span><span>{r.user||"User"}</span><span>{money(r.total)}</span><button onClick={()=>printReport(r)}>Print</button></div>):<div className="eod-empty">No Z reports generated yet.</div>}</div></div>}
   <div className="eod-foot"><span>{option?`Selected: ${option==="user"?"Cash out":option==="all"?"Cash out all users":"Close register"}`:"Choose one of the options above to continue"}</span><div><button className="eod-cancel" onClick={onClose||(()=>{})}>Cancel</button><button className="eod-continue" disabled={!option||busy} onClick={continueAction}>✓ Continue</button></div></div>
  </div>
 </section>
}
function XZ({sales,businessDay,paymentTypes}){
 const active=sales.filter(s=>!s.voided&&!s.refunded);const total=active.reduce((a,s)=>a+Number(s.total||0),0);const cash=active.filter(s=>s.payment==="Cash").reduce((a,s)=>a+Number(s.total||0),0);
 return <section className="content"><div className="panel"><div className="eyebrow">END OF DAY</div><h2>X / Z Report</h2><p>Current business-day totals.</p><div className="cards"><Card t="Transactions" v={active.length}/><Card t="Total sales" v={money(total)}/><Card t="Cash sales" v={money(cash)}/><Card t="Business day" v={businessDay.open?"OPEN":"CLOSED"}/></div><Table cols={["Payment type","Transactions","Amount"]} rows={paymentTypes.map(p=>{const a=active.filter(s=>s.payment===p.name);return [p.name,a.length,money(a.reduce((x,s)=>x+Number(s.total||0),0))]})}/></div></section>
}
function MyCompany({company,setCompany}){
 const[draft,setDraft]=useState(()=>({...company}));
 const[tab,setTab]=useState("General");
 const[logoName,setLogoName]=useState("");
 const[loginLogoName,setLoginLogoName]=useState("");
 const[message,setMessage]=useState("");
 useEffect(()=>setDraft({...company}),[company]);
 const update=(key,value)=>setDraft(v=>({...v,[key]:value}));
 const saveCompany=()=>{setCompany({...draft});setMessage("Company information saved successfully.");setTimeout(()=>setMessage(""),2600)};
 const removeLogo=()=>{update("logo","");setLogoName("")};
 const handleLogo=e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){setMessage("Please select an image file.");return}if(file.size>2*1024*1024){setMessage("Logo image must be 2 MB or smaller.");return}const reader=new FileReader();reader.onload=()=>{update("logo",String(reader.result||""));setLogoName(file.name)};reader.readAsDataURL(file)};
 const handleLoginLogo=e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){setMessage("Please select an image file.");return}if(file.size>2*1024*1024){setMessage("Login logo image must be 2 MB or smaller.");return}const reader=new FileReader();reader.onload=()=>{update("loginLogo",String(reader.result||""));setLoginLogoName(file.name)};reader.readAsDataURL(file)};
 const removeLoginLogo=()=>{update("loginLogo","");setLoginLogoName("")};
 const addressFields=[
  ["streetName","Street"],["buildingNumber","Building number"],["additionalStreetName","Additional street name"],["plotIdentification","Plot identification"],
  ["district","District"],["postalCode","Postal code"],["city","City"],["state","State / Province"],["country","Country"]
 ];
 return <section className="my-company-page">
  <div className="company-shell company-shell-ar">
   <div className="company-topbar">
    <div><div className="eyebrow">BUSINESS PROFILE</div><h2>My company</h2><p>Company information used on receipts, invoices and business documents.</p></div>
    <div className="company-top-actions"><span className="company-status"><i></i> Local data</span><button className="company-save" onClick={saveCompany}>✓ Save</button></div>
   </div>
   <div className="company-tabs company-tabs-ar">
    {["General","Address","Logo","Login screen logo","Bank details"].map(x=><button key={x} type="button" className={tab===x?"active":""} onClick={()=>setTab(x)}>{x}</button>)}
   </div>
   {message&&<div className="company-message">✓ {message}</div>}
   {tab==="General"&&<div className="company-body company-general-layout">
    <div className="company-form-block">
     <div className="company-section-title">Company information</div>
     <div className="company-grid company-grid-ar">
      <label>Company name<input value={draft.name||""} onChange={e=>update("name",e.target.value)} placeholder="Company name"/></label>
      <label>Tax number<input value={draft.taxNumber||""} onChange={e=>update("taxNumber",e.target.value)} placeholder="Tax number"/></label>
      <label>Phone<input value={draft.phoneNumber||""} onChange={e=>update("phoneNumber",e.target.value)} placeholder="Phone number"/></label>
      <label>Email<input type="email" value={draft.email||""} onChange={e=>update("email",e.target.value)} placeholder="Email address"/></label>
     </div>
     <div className="company-section-title">Receipt / document identity</div>
     <div className="company-grid company-grid-ar">
      <label>Document company name<input value={draft.name||""} onChange={e=>update("name",e.target.value)}/></label>
      <label>Country<select value={draft.country||"Malaysia"} onChange={e=>update("country",e.target.value)}><option>Malaysia</option><option>Singapore</option><option>Thailand</option><option>Indonesia</option><option>Other</option></select></label>
     </div>
     <div className="company-section-title">Address</div>
     <div className="company-grid company-grid-ar">
      {addressFields.slice(0,4).map(([k,l])=><label key={k}>{l}<input value={draft[k]||""} onChange={e=>update(k,e.target.value)}/></label>)}
     </div>
    </div>
    <div className="company-side-card">
     <div className="company-side-title">Company logo</div>
     <div className="company-logo-mini">{draft.logo?<img src={draft.logo} alt="Company logo"/>:<div className="logo-placeholder"><b>SP</b><span>No logo added</span></div>}</div>
     <label className="logo-add logo-add-ar">＋ Add logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogo}/></label>
     <button type="button" className="logo-remove-ar" disabled={!draft.logo} onClick={removeLogo}>Remove logo</button>
     <small>PNG, JPG, WEBP or SVG · Maximum 2 MB</small>
    </div>
   </div>}
   {tab==="Address"&&<div className="company-body"><div className="company-section-title">Business address</div><div className="company-grid company-grid-ar">{addressFields.map(([k,l])=><label key={k}>{l}<input value={draft[k]||""} onChange={e=>update(k,e.target.value)} /></label>)}</div></div>}
   {tab==="Logo"&&<div className="company-body company-logo-tab"><div className="company-section-title">Company logo</div><div className="company-logo-large">{draft.logo?<img src={draft.logo} alt="Company logo"/>:<div className="logo-placeholder large"><b>SP</b><span>Add your company logo</span></div>}</div><div className="logo-actions logo-actions-ar"><label className="logo-add logo-add-ar">＋ Add logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogo}/></label><button type="button" className="logo-remove-ar" disabled={!draft.logo} onClick={removeLogo}>Remove</button></div>{logoName&&<div className="logo-file-name">Selected: {logoName}</div>}<p className="company-help">The logo is stored locally with this SP-Manager installation and can be used on receipts and business documents.</p></div>}
   {tab==="Login screen logo"&&<div className="company-body company-logo-tab company-login-logo-tab"><div className="company-section-title">Login screen logo</div><p className="company-help company-login-intro">Set a separate logo for the SP-Manager login screen. If no login logo is set, the Company logo will be used automatically.</p><div className="company-logo-large company-login-logo-preview">{draft.loginLogo?<img src={draft.loginLogo} alt="Login screen logo"/>:draft.logo?<img src={draft.logo} alt="Company logo fallback"/>:<div className="logo-placeholder large"><b>SP</b><span>No login logo set</span></div>}</div><div className="logo-actions logo-actions-ar"><label className="logo-add logo-add-ar">＋ Add login logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLoginLogo}/></label><button type="button" className="logo-remove-ar" disabled={!draft.loginLogo} onClick={removeLoginLogo}>Remove</button></div>{loginLogoName&&<div className="logo-file-name">Selected: {loginLogoName}</div>}<p className="company-help">Recommended: transparent PNG or SVG · Maximum 2 MB</p></div>}
   {tab==="Bank details"&&<div className="company-body"><div className="company-section-title">Bank information</div><div className="company-grid company-grid-ar"><label className="wide">Bank account number<input value={draft.bankAccountNumber||""} onChange={e=>update("bankAccountNumber",e.target.value)} /></label><label className="wide">Bank details<textarea value={draft.bankDetails||""} onChange={e=>update("bankDetails",e.target.value)} placeholder="Bank name, branch and payment details"/></label></div></div>}
   <div className="company-footer"><span>Changes are not applied until you press the <b>Save</b> button above.</span><span className="company-save-note">All company and logo changes are saved together.</span></div>
  </div>
 </section>
}
function Management({activeUser,setPage}){
 const items=[
  ["▣","View sales history","Payments","viewSalesHistory"],
  ["▱","View open sales","Named Order / Takeaway","viewOpenSales"],
  ["↕","Cash In / Out","Cash In / Out","cashInOut"],
  ["▤","Credit payments","Credit payments","creditPayments"],
  ["♙","User info","Users & Permissions","userInfo"],
  ["⚙","Users & Permissions","Users & Permissions","manageUsers"],
  ["◈","Products","Products","manageProducts"],
  ["◫","Inventory","Inventory","manageInventory"],
  ["♙","Customers","Customers","manageCustomers"],
  ["▤","Purchases","Purchases","managePurchases"],
  ["◉","Payments","Payments","managePayments"],
  ["%","Discount / Promotion","Discount / Promotion","manageDiscount"],
  ["#","Tax","Tax","manageTax"],
  ["★","Loyalty","Loyalty","manageLoyalty"],
  ["▥","Reports","Reports","manageReports"],
  ["▰","Settings","Settings","manageSettings"]
 ];
 const safePermission=key=>isPermissionAllowed(activeUser,key);
 return (
  <section className="management-page">
   <div className="management-head">
    <div><div className="eyebrow">MANAGEMENT</div><h2>Management</h2><p>Manage business functions available to <b>{activeUser?.name||activeUser?.username||"User"}</b>.</p></div>
    <span className="management-role">{activeUser?.role||"User"}</span>
   </div>
   <div className="management-grid">
    {items.filter(([,label])=>label!=="End of day").map(([ic,label,target,perm])=>{
     const allowed=safePermission(perm);
     return <button type="button" key={label} className={"management-card "+(allowed?"":"is-disabled")} disabled={!allowed} onClick={()=>{if(allowed)setPage(target)}}>
      <span>{ic}</span><div><b>{label}</b><small>{allowed?"Open function":"Permission required"}</small></div><strong>›</strong>
     </button>;
    })}
   </div>
  </section>
 );
}

function Dashboard({sales,total,products,customers,lowStock,setPage,businessDay,toggleBusiness}){
 const now=new Date();
 const currentYear=now.getFullYear();
 const[dashboardYear,setDashboardYear]=useState(currentYear);
 const[showPreviousYear,setShowPreviousYear]=useState(true);
 const[hourOption,setHourOption]=useState("Amount");
 const[periodStart,setPeriodStart]=useState(()=>new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10));
 const[periodEnd,setPeriodEnd]=useState(()=>new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10));
 const activeSales=sales.filter(s=>!s.voided&&!s.refunded);
 const inPeriod=s=>{const d=new Date(s.date);return d>=new Date(periodStart+"T00:00:00")&&d<=new Date(periodEnd+"T23:59:59")};
 const periodSales=activeSales.filter(inPeriod);
 const monthly=Array.from({length:12},(_,i)=>activeSales.filter(s=>{const d=new Date(s.date);return d.getFullYear()===dashboardYear&&d.getMonth()===i}).reduce((a,s)=>a+s.total,0));
 const previousMonthly=Array.from({length:12},(_,i)=>activeSales.filter(s=>{const d=new Date(s.date);return d.getFullYear()===dashboardYear-1&&d.getMonth()===i}).reduce((a,s)=>a+s.total,0));
 const yearTotal=monthly.reduce((a,v)=>a+v,0);
 const previousYearTotal=previousMonthly.reduce((a,v)=>a+v,0);
 const max=Math.max(1,...monthly,...(showPreviousYear?previousMonthly:[]));
 const topMonthValue=Math.max(...monthly,0);
 const topMonthIndex=monthly.indexOf(topMonthValue);
 const topMonth=topMonthValue?new Date(dashboardYear,topMonthIndex,1).toLocaleString("en-GB",{month:"short"}).toUpperCase():"-";
 const topProducts=[...products].map(p=>({p,total:periodSales.reduce((sum,s)=>sum+s.items.filter(i=>i.id===p.id).reduce((q,i)=>q+Number(i.price||0)*Number(i.qty||0),0),0)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total).slice(0,5);
 const topGroups=Object.entries(periodSales.flatMap(s=>s.items).reduce((acc,item)=>{const p=products.find(x=>x.id===item.id);const g=item.group||p?.group||item.category||p?.category||"Uncategorised";acc[g]=(acc[g]||0)+Number(item.price||0)*Number(item.qty||0);return acc},{})).sort((a,b)=>b[1]-a[1]);
 const groupTotal=topGroups.reduce((a,[,v])=>a+v,0);
 const groupColors=["#1b9fd1","#4b9bc8","#8bc34a","#76a843","#a8c66c","#f28aa8","#f47f7f","#7890a8","#46a7df","#d18ac4","#48a6a0","#7a8dd8"];
 const donutGradient=groupTotal?(()=>{let cursor=0;return topGroups.slice(0,12).map(([,v],i)=>{const next=cursor+(v/groupTotal)*100;const part=`${groupColors[i%groupColors.length]} ${cursor}% ${next}%`;cursor=next;return part}).join(",")})():"#e2e8f0 0 100%";
 const customerTotals=Object.entries(periodSales.reduce((acc,s)=>{const customer=customers.find(c=>c.id===s.customerId);const name=s.customerName||s.customer||customer?.name||"Walk-in Customer";acc[name]=(acc[name]||0)+Number(s.total||0);return acc},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const customerMax=Math.max(1,...customerTotals.map(([,v])=>v));
 const hourly=Array.from({length:24},(_,h)=>periodSales.filter(s=>new Date(s.date).getHours()===h));
 const hourlyValues=hourly.map(items=>hourOption==="Count"?items.length:items.reduce((a,s)=>a+s.total,0));
 const hourlyMax=Math.max(1,...hourlyValues);
 const periodTotal=periodSales.reduce((a,s)=>a+s.total,0);
 const compactPeriodTotal=(periodTotal/1000).toFixed(2)+"K";
 const formatDate=d=>new Date(d).toLocaleDateString("en-GB");
 return <section className="content dashboard-modern spmanager-dashboard">
  <div className="ar-dashboard-monthly">
   <div className="panel monthly-main">
    <div className="panel-title monthly-title"><div><h3>Monthly Sales - {dashboardYear}</h3><small>Sales data grouped by month</small></div><div className="monthly-tools"><button className="icon-btn" title="Previous year" onClick={()=>setDashboardYear(y=>y-1)}>‹</button><button className="icon-btn" title="Next year" onClick={()=>setDashboardYear(y=>y+1)}>›</button></div></div>
    <div className="monthly-chart">
     <div className="monthly-gridlines"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0</span></div>
     <div className="monthly-bars">{monthly.map((v,i)=><div className="month-col" key={i}><div className="month-bar-pair"><div className="month-bar current" style={{height:Math.max(v?4:0,(v/max)*100)+"%"}}><span>{v?Math.round(v):""}</span></div>{showPreviousYear&&<div className="month-bar previous" style={{height:Math.max(previousMonthly[i]?4:0,(previousMonthly[i]/max)*100)+"%"}}><span>{previousMonthly[i]?Math.round(previousMonthly[i]):""}</span></div>}</div><small>{new Date(dashboardYear,i,1).toLocaleString("en-GB",{month:"short"})}</small></div>)}</div>
    </div>
    <div className="monthly-legend"><label><input type="checkbox" checked={showPreviousYear} onChange={e=>setShowPreviousYear(e.target.checked)}/> Previous year ({dashboardYear-1})</label><span><i className="legend-dot current-dot"></i>{dashboardYear}</span><span><i className="legend-dot previous-dot"></i>{dashboardYear-1}</span></div>
   </div>
   <div className="panel monthly-total"><div><h3>Total Sales</h3><strong>{money(yearTotal)}</strong></div><div className="top-month-label">Top performing month:<b>{topMonth}</b><strong>{money(topMonthValue)}</strong></div></div>
  </div>
  <div className="periodic-heading"><h3>Periodic Reports ({formatDate(periodStart)} - {formatDate(periodEnd)})</h3><div className="period-controls"><label>From <input type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)}/></label><label>To <input type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)}/></label></div></div>
  <div className="ar-dashboard-grid">
   <div className="panel ar-panel top-products-panel"><div className="panel-title"><div><h3>Top Products</h3></div><span className="report-limit">5</span></div>{topProducts.length?topProducts.map(x=><div className="report-row" key={x.p.id}><div><b>{x.p.name}</b></div><strong>{money(x.total).replace("RM ","")}</strong></div>):<Empty text="No data to display"/>}</div>
   <div className="panel ar-panel hourly-panel"><div className="panel-title"><div><h3>Hourly Sales</h3><small>Sales data grouped by hours</small></div><select value={hourOption} onChange={e=>setHourOption(e.target.value)}><option>Amount</option><option>Count</option></select></div><div className="hourly-chart">{hourlyValues.map((v,h)=><div className="hour-col" key={h}><div className="hour-bar" style={{height:(v/hourlyMax)*100+"%"}}><span>{v?hourOption==="Count"?v:Math.round(v):""}</span></div><small>{String(h).padStart(2,"0")}</small></div>)}</div></div>
  <div className="panel ar-panel total-sales-panel"><div className="panel-title"><h3>Total Sales (Amount)</h3></div><div className="big-sales-value">{compactPeriodTotal}</div></div>
   <div className="panel ar-panel groups-panel"><div className="panel-title"><div><h3>Top Product Groups</h3><small>Top selling product groups in selected period</small></div></div><div className="groups-content"><div className="donut" style={{background:`conic-gradient(${donutGradient})`}}><div className="donut-hole"></div></div><div className="group-legend">{topGroups.slice(0,12).map(([g,v],i)=><div key={g}><i style={{background:groupColors[i%groupColors.length]}}></i><span>{g}</span><b>{money(v).replace("RM ","")}</b></div>)}</div></div></div>
   <div className="panel ar-panel customers-panel"><div className="panel-title"><div><h3>Top Customers</h3><small>Lead customers in selected period (top 5)</small></div></div><div className="customer-bars">{customerTotals.length?customerTotals.map(([name,v])=><div className="customer-bar-row" key={name}><span title={name}>{name}</span><div><i style={{width:(v/customerMax)*100+"%"}}></i><b>{Math.round(v)}</b></div></div>):<Empty text="No data to display"/>}</div></div>
  </div>
  <div className="ar-dashboard-footer"><div>Previous year total: <b>{money(previousYearTotal)}</b></div><div>Selected period transactions: <b>{periodSales.length}</b></div><button className="linkbtn" onClick={()=>setPage("Reports")}>Open Reporting</button></div>
 </section>
}
function Card({t,v}){return <div className="card"><small>{t}</small><strong>{v}</strong></div>}
function POS({setCart,updateLinePrice,posOrderMeta,setPosOrderMeta,retrieveOpenOrder,filtered,q,setQ,posSearchMode,setPosSearchMode,add,cart,changeQty,customers,setCustomers,customer,setCustomer,discount,setDiscount,discountFixed,setDiscountFixed,payment,setPayment,paymentTypes,subtotal,disc,taxRate,setTaxRate,tax,grand,sale,saveOpenOrder,orders,setOrders,occupiedTables,updateSaleNote,setNoteBox,clearCurrentSale,printReceipt,closeLastSale,categories,posCategory,setPosCategory,products,company,lastSale,menuOpen,setMenuOpen,setPage,sales,emailReceipt,settings,activeUser,signOut,openCashInOut,openCashDrawer,openEndOfDayFromPOS}){
 const[catLevel,setCatLevel]=useState("root");
 const[group,setGroup]=useState("");
 const[showCustomer,setShowCustomer]=useState(false);
 const[customerSearch,setCustomerSearch]=useState("");
 const[showAddCustomer,setShowAddCustomer]=useState(false);
 const[newCustomer,setNewCustomer]=useState({name:"",phone:"",email:"",vehicleNumber:""});
 const[paymentScreen,setPaymentScreen]=useState(false);
 const[splitScreen,setSplitScreen]=useState(false);
 const[discountScreen,setDiscountScreen]=useState(false);
 const[transferScreen,setTransferScreen]=useState(false);
 const[savedScreen,setSavedScreen]=useState(false);
 const[paidAmount,setPaidAmount]=useState(0);
 const[splitPayments,setSplitPayments]=useState([]);
 const[splitType,setSplitType]=useState(paymentTypes.find(x=>x.enabled)?.name||"Cash");
 const[splitAmount,setSplitAmount]=useState(0);
 const[discountMode,setDiscountMode]=useState(settings.order.defaultDiscountType==="Fixed"?"fixed":"percent");
 const[discountValue,setDiscountValue]=useState(discount||0);
 const[transferSelection,setTransferSelection]=useState(()=>new Set());
 const[noticeLocal,setNoticeLocal]=useState("");
  const[quantityScreen,setQuantityScreen]=useState(false);
  const[priceScreen,setPriceScreen]=useState(false);
  const[priceValue,setPriceValue]=useState("");
  const[pendingPriceProduct,setPendingPriceProduct]=useState(null);
  const[pendingPriceQuantity,setPendingPriceQuantity]=useState(1);
  const[quantityValue,setQuantityValue]=useState("");
  const[nextQuantity,setNextQuantity]=useState(Math.max(1,Number(settings.order.defaultQuantity||1)));
  const[selectedLineId,setSelectedLineId]=useState(null);
  const[saleLocked,setSaleLocked]=useState(false);
  const[virtualKeyboard,setVirtualKeyboard]=useState(!!settings.general.virtualKeyboard);
 const[posFullscreen,setPosFullscreen]=useState(false);
 const[showUserMenu,setShowUserMenu]=useState(false);
 const[permissionError,setPermissionError]=useState(null);
 const[orderNameScreen,setOrderNameScreen]=useState(false);
 const[orderNameSaveMode,setOrderNameSaveMode]=useState(false);
 const[commentScreen,setCommentScreen]=useState(false);
 const[serviceTypeScreen,setServiceTypeScreen]=useState(false);
 const[ageGateProduct,setAgeGateProduct]=useState(null);
 const[tableScreen,setTableScreen]=useState(false);
 const[orderNameValue,setOrderNameValue]=useState(posOrderMeta?.name||"");
 const[commentValue,setCommentValue]=useState(posOrderMeta?.comment||"");
 const[serviceTypeValue,setServiceTypeValue]=useState(posOrderMeta?.serviceType||"Dine In");
 const[tableValue,setTableValue]=useState(posOrderMeta?.table||"");
 useEffect(()=>setVirtualKeyboard(!!settings.general.virtualKeyboard),[settings.general.virtualKeyboard]);
 const[roundNotice,setRoundNotice]=useState(false);
 useEffect(()=>{if(!noticeLocal)return;const t=setTimeout(()=>setNoticeLocal(""),2500);return()=>clearTimeout(t)},[noticeLocal]);
 const syncOrderMeta=(patch)=>{const next={name:String(orderNameValue||posOrderMeta?.name||""),comment:String(commentValue||posOrderMeta?.comment||""),serviceType:String(serviceTypeValue||posOrderMeta?.serviceType||"Dine In"),table:String(tableValue||posOrderMeta?.table||""),...patch};setOrderNameValue(next.name);setCommentValue(next.comment);setServiceTypeValue(next.serviceType);setTableValue(next.table);setPosOrderMeta(next);return next};
 const resolveWeighingBarcode=value=>{
  const w=settings?.weighing||{};const raw=String(value||"").replace(/\s/g,"");
  if(!w.enabled||!raw.startsWith(String(w.prefix||"20")))return null;
  const codeLen=Math.max(1,Number(w.productCodeLength||5));const prefixLen=String(w.prefix||"20").length;
  if(raw.length<prefixLen+codeLen+1)return null;
  let code=raw.slice(prefixLen,prefixLen+codeLen);if(w.trimZeros)code=code.replace(/^0+/g,"")||"0";
  const product=products.find(p=>String(p.code||"")===String(code)||String(p.plu||"")===String(code));if(!product)return null;
  const decimals=Math.max(0,Number(w.decimalPlaces??3));const valueDigits=raw.slice(prefixLen+codeLen);const measured=Number(valueDigits)/(10**decimals);
  if(!Number.isFinite(measured)||measured<=0)return null;
  if(w.usePriceBarcode){const total=measured;const qty=Number(product.price)>0?total/Number(product.price):0;return qty>0?{product,qty}:null}
  return {product,qty:measured};
 };
 const addResolvedProduct=(product,qty)=>{if(!product)return;setNextQuantity(Math.max(1,Number(qty||1)));if(product.ageRestriction){setAgeGateProduct({product,qty});return}if(priceChangeAllowedFor(product)){setPendingPriceProduct(product);setPendingPriceQuantity(Math.max(1,Number(qty||1)));setPriceValue(String(Number(product.price||0)));setPriceScreen(true);return}const ok=add(product,qty);if(ok){setNextQuantity(1);setSelectedLineId(product?.id??null);if(settings.order.sounds&&settings.order.soundItemAdded)playPosBeep("ok")}};
 const addPos=p=>{if(saleLocked){setNoticeLocal("Sale is locked. Unlock the sale before changing items.");return}const product=products.find(x=>String(x.id)===String(p?.productId??p?.id))||p;addResolvedProduct(product,nextQuantity)};
 const lockSale=()=>{if(!cart.length){setNoticeLocal("Add at least one item before locking the sale.");return}const receipt=[company?.name||"Shining Pearl Tinted","LOCKED SALE","--------------------------------",...(cart||[]).map(i=>`${i.qty} x ${i.name}    RM${(Number(i.price||0)*Number(i.qty||0)).toFixed(2)}`),"--------------------------------",`Subtotal: RM${Number(subtotal||0).toFixed(2)}`,`Discount: RM${Number(disc||0).toFixed(2)}`,`Tax: RM${Number(tax||0).toFixed(2)}`,`TOTAL: RM${Number(grand||0).toFixed(2)}`,"","This is an order preview. Payment has not been completed."].join("\n");const w=window.open("","_blank","width=420,height=720");if(w){w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Locked Sale</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:18px;color:#111}pre{white-space:pre-wrap}</style></head><body><pre>${receipt.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</pre><script>window.onload=()=>setTimeout(()=>window.print(),150)</script></body></html>`);w.document.close()}setSaleLocked(true);setNoticeLocal("Sale locked. Use Unlock to continue editing.")};
 const defaultPayment=paymentTypes.filter(x=>x.enabled).sort((a,b)=>a.position-b.position)[0];
 const enabledPayments=paymentTypes.filter(x=>x.enabled).sort((a,b)=>a.position-b.position);
 const totalPaid=splitPayments.reduce((a,x)=>a+Number(x.amount||0),0);
 const paymentRemaining=Math.max(0,grand-totalPaid);
 useEffect(()=>{if(lastSale){setSelectedLineId(null);setSaleLocked(false)}},[lastSale]);
 useEffect(()=>{if(paymentScreen)setPaidAmount(paymentTypes.find(x=>x.name===payment)?.markPaid===false?0:grand)},[paymentScreen,grand,payment,paymentTypes]);
 useEffect(()=>{const onKey=e=>{
   const functionKey=e.code||e.key;
   if(functionKey==="F10"||e.key==="F10"){e.preventDefault();if(cart.length&&!saleLocked)setPaymentScreen(true);return}
   if(functionKey==="F12"||e.key==="F12"){e.preventDefault();if(cart.length&&!saleLocked){const pt=paymentTypes.find(x=>x.enabled&&String(x.name).toLowerCase()==="cash")||defaultPayment;if(pt){quickPay(pt);}}return}
   if(e.key==="F9"){e.preventDefault();saveCurrentOpenOrder();return}
   if(e.key==="F8"){e.preventDefault();saveOpenOrder({newSale:true});return}
   if(e.key==="F7"){e.preventDefault();if(cart.length&&!saleLocked){setTransferSelection(new Set());setTransferScreen(true)}return}
   if(e.key==="F3"){e.preventDefault();document.querySelector('.ar-search-input')?.focus();return}
   if(e.key==="F2"){e.preventDefault();if(!saleLocked)openDiscount();return}
   if(e.key==="F4"){e.preventDefault();const i=cart.find(x=>(x.lineId||x.id)===selectedLineId||x.productId===selectedLineId);setQuantityValue(String(i?.qty||nextQuantity||1));setQuantityScreen(true);return}
   if(e.key==="F11"){e.preventDefault();if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.();return}
   if(e.key==="Delete"){e.preventDefault();const i=cart.find(x=>(x.lineId||x.id)===selectedLineId||x.productId===selectedLineId);if(i&&!saleLocked)changeQty(i.lineId||i.id,-i.qty);return}
   if(e.ctrlKey&&e.key.toLowerCase()==="d"){e.preventDefault();openCashDrawer?.();return}
   if(e.ctrlKey&&e.key.toLowerCase()==="t"){e.preventDefault();const modes=["All","Barcode","Code","Name"];const idx=modes.indexOf(posSearchMode);setPosSearchMode(modes[(idx+1)%modes.length]);setNoticeLocal("Search type: "+modes[(idx+1)%modes.length]);return}
   if(e.key==="Escape"){setPaymentScreen(false);setSplitScreen(false);setDiscountScreen(false);setTransferScreen(false);setSavedScreen(false);setQuantityScreen(false);setPriceScreen(false);setPendingPriceProduct(null);setPendingPriceQuantity(1);setSelectedLineId(null);document.querySelector('.ar-search-input')?.focus()}
   if(!e.ctrlKey)return;const key=e.key.toUpperCase();const pt=paymentTypes.find(x=>x.enabled&&x.shortcutKey&&x.shortcutKey.toUpperCase()===key);if(pt){e.preventDefault();setPayment(pt.name);setPaymentScreen(true)}
 };window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[cart,defaultPayment,payment,sale,saveOpenOrder,paymentTypes,changeQty,grand]);
 const rootCats=categories.length?categories:["Accessories","Car Detailing","Coating","Installation Service","PPF","Tint","Wrapping"];
 const categoryProducts=products.filter(p=>posCategory==="All Categories"||(p.category||p.group||"")===posCategory||(p.group||"")===posCategory);
 const groups=[...new Set(categoryProducts.map(p=>p.group||p.category).filter(Boolean))];
 const groupProducts=group?categoryProducts.filter(p=>(p.group||p.category||"")===group):categoryProducts;
 const shown=groupProducts;
 const iconFor=name=>({"Accessories":"🧰","Car Detailing":"✨","Coating":"◈","Installation Service":"🛠","PPF":"◆","Tint":"◉","Wrapping":"◇","Windscreen":"▱","Glass":"◫","Security":"⬡","Protection":"✦"}[name]||"✦");
 const applyDiscount=()=>{
   if(!cart.length){setNoticeLocal("Add at least one item before discount.");setDiscountScreen(false);return}
   const n=Math.max(0,Number(discountValue||0));
   if(discountMode==="percent"){setDiscount(Math.min(100,n));setDiscountFixed(0)}
   else {const fixed=Math.min(subtotal,n);const pct=subtotal>0?(fixed/subtotal)*100:0;setDiscount(0);setDiscountFixed(fixed)}
   setDiscountScreen(false);
 };
 const openDiscount=()=>{if(!cart.length){setNoticeLocal("Add at least one item before discount.");return}const preferred=settings.order.defaultDiscountType==="Fixed"?"fixed":"percent";setDiscountValue(preferred==="fixed"?(discountFixed||0):(discount||0));setDiscountMode(discountFixed>0?"fixed":preferred);setDiscountScreen(true)};
 const applyPrice=()=>{const n=Number(priceValue);if(!Number.isFinite(n)||n<0){setNoticeLocal("Enter a valid sale price.");return}if(pendingPriceProduct){const ok=add(pendingPriceProduct,pendingPriceQuantity,n);if(ok){setSelectedLineId(pendingPriceProduct.id);setNextQuantity(1);if(settings.order.sounds&&settings.order.soundItemAdded)playPosBeep("ok");setPriceScreen(false);setPendingPriceProduct(null);setPendingPriceQuantity(1)}return}const i=cart.find(x=>(x.lineId||x.id)===selectedLineId||x.productId===selectedLineId);if(!i){setPriceScreen(false);return}const product=products.find(p=>String(p.id)===String(i.productId??i.id))||i;if(!priceChangeAllowedFor(product)){setNoticeLocal("Price change is not allowed for this product.");setPriceScreen(false);return}if(updateLinePrice(i.lineId||i.id,n))setPriceScreen(false)};
 const addCustomer=()=>{const name=newCustomer.name.trim().toUpperCase();if(!name){setNoticeLocal("Enter customer name before saving.");return}const c={id:uid(),name,phone:newCustomer.phone.trim().toUpperCase()||"-",email:newCustomer.email.trim().toUpperCase()||"-",vehicleNumber:newCustomer.vehicleNumber.trim().toUpperCase()||"",visits:0,spend:0,loyaltyPoints:0};const next=[...customers,c];save("customers",next);setCustomers(next);setCustomer(c.id);setNewCustomer({name:"",phone:"",email:"",vehicleNumber:""});setShowAddCustomer(false);setShowCustomer(false);setNoticeLocal("Customer added successfully: "+name)};
 const startPayment=()=>{if(!cart.length){setNoticeLocal("Add at least one item before payment.");return}setPaidAmount(paymentTypes.find(x=>x.name===payment)?.markPaid===false?0:grand);setSplitPayments([]);setPaymentScreen(true)};
 const finishPayment=()=>{
   const pt=paymentTypes.find(x=>x.name===payment)||defaultPayment;
   const amount=splitPayments.length?totalPaid:Number(paidAmount||0);
   if(pt?.markPaid!==false && !splitPayments.length && amount<grand){setNoticeLocal("Paid amount is less than the total. Enter the amount received or use Split payments.");return}
   if(splitPayments.length && totalPaid<grand && pt?.markPaid!==false){setNoticeLocal("Split payment is incomplete. Remaining: "+money(paymentRemaining));return}
   if(!splitPayments.length && pt?.changeAllowed===false && amount>grand){setNoticeLocal("This payment type does not allow change.");return} const payments=splitPayments.length?splitPayments:[{paymentTypeId:pt?.id,payment:pt?.name||payment,amount,paid:Boolean(pt?.markPaid)}];
   const meta=syncOrderMeta({});const paymentPrintAllowed=payments.every(x=>paymentTypes.find(t=>t.id===x.paymentTypeId)?.printReceipt!==false);const paymentDrawerAllowed=payments.some(x=>paymentTypes.find(t=>t.id===x.paymentTypeId)?.openCashDrawer===true);sale({payment:pt?.name||payment,paidAmount:amount,payments,printReceipt:paymentPrintAllowed,openCashDrawer:paymentDrawerAllowed,note:meta.comment,orderName:meta.name,serviceType:meta.serviceType,table:meta.table});setPaymentScreen(false);setSplitScreen(false);
 };
 const addSplit=()=>{const n=Math.min(Number(splitAmount||0),paymentRemaining);if(n<=0)return;const pt=paymentTypes.find(x=>x.name===splitType);setSplitPayments(a=>[...a,{paymentTypeId:pt?.id,payment:splitType,amount:n,paid:Boolean(pt?.markPaid)}]);setSplitAmount(Math.max(0,paymentRemaining-n))};
 const saveCurrentOpenOrder=()=>{if(!cart.length){setNoticeLocal("There is no active sale to save.");return}if(settings.order.customOrderName!==false&&(settings.order.requestOrderName||settings.order.orderNameRequired)){setOrderNameValue(posOrderMeta?.name||"");setOrderNameSaveMode(true);setOrderNameScreen(true);return}saveOpenOrder({name:posOrderMeta?.name,comment:posOrderMeta?.comment,serviceType:posOrderMeta?.serviceType,table:posOrderMeta?.table});};
 const quickPay=pt=>{if(!cart.length)return;if(pt?.customerRequired&&!customer){setNoticeLocal("Please select a customer for this payment type.");setShowCustomer(true);return}setPayment(pt.name);const meta=syncOrderMeta({});sale({payment:pt.name,paidAmount:pt.markPaid?grand:0,payments:[{paymentTypeId:pt.id,payment:pt.name,amount:pt.markPaid?grand:0,paid:Boolean(pt.markPaid)}],printReceipt:pt.printReceipt!==false,openCashDrawer:pt.openCashDrawer===true,note:meta.comment,orderName:meta.name,serviceType:meta.serviceType,table:meta.table})};
 const saveAndNew=()=>{if(cart.length){setNoticeLocal("Current sale cleared. Use F9 Save sale if you want to keep it as an open sale.")}setCart([]);setDiscount(0);setDiscountFixed(0);setSelectedLineId(null);setSaleLocked(false);setCatLevel("root");setGroup("");setPosCategory("All Categories");setQ("")};
 const stockOnHandText=p=>{const n=Number(p?.stock);return Number.isFinite(n)?n.toLocaleString('en-MY',{maximumFractionDigits:2}):'0'};
 const categoryTile=name=><button type="button" className="ar-category-tile" key={name} onClick={()=>{setPosCategory(name);setGroup("");setCatLevel("group")}}><div className="ar-cat-icon"><span>{iconFor(name)}</span></div><strong>{name}</strong><small>{products.filter(p=>(p.category||p.group)===name).length} products</small></button>;
 const groupTile=name=><button type="button" className="ar-category-tile ar-group-tile" key={name} onClick={()=>{setGroup(name);setCatLevel("items")}}><div className="ar-cat-icon"><span>{iconFor(name)}</span></div><strong>{name}</strong><small>{categoryProducts.filter(p=>(p.group||p.category)===name).length} products</small></button>;
 const selectedTransfer=cart.filter(i=>transferSelection.has(i.lineId||i.id));
 const makeTransfer=()=>{if(saleLocked){setNoticeLocal("Sale is locked. Unlock the sale before transferring items.");return}if(!selectedTransfer.length){setNoticeLocal("Select at least one item to transfer.");return}const order={id:Date.now(),name:"Transfer "+String(Date.now()).slice(-6),date:new Date().toISOString(),customerId:customer,items:selectedTransfer,status:"Open",transferred:true};save("orders",[...orders,order]);setOrders([...orders,order]);selectedTransfer.forEach(i=>changeQty(i.lineId||i.id,-Number(i.qty||0)));setTransferSelection(new Set());setTransferScreen(false);setNoticeLocal("Selected items transferred to "+order.name+".")};
 useEffect(()=>{
   const syncFullscreen=()=>setPosFullscreen(Boolean(document.fullscreenElement));
   document.addEventListener("fullscreenchange",syncFullscreen);
   document.addEventListener("webkitfullscreenchange",syncFullscreen);
   syncFullscreen();
   return()=>{document.removeEventListener("fullscreenchange",syncFullscreen);document.removeEventListener("webkitfullscreenchange",syncFullscreen)};
 },[]);
 useEffect(()=>{
   const updatePosViewport=()=>{
     const h=(window.visualViewport?.height||window.innerHeight||0);
     const w=(window.visualViewport?.width||window.innerWidth||0);
     document.documentElement.style.setProperty("--sp-pos-viewport-h",`${h}px`);
     document.documentElement.style.setProperty("--sp-pos-viewport-w",`${w}px`);
   };
   updatePosViewport();
   window.addEventListener("resize",updatePosViewport,{passive:true});
   window.visualViewport?.addEventListener("resize",updatePosViewport,{passive:true});
   return()=>{window.removeEventListener("resize",updatePosViewport);window.visualViewport?.removeEventListener("resize",updatePosViewport)};
 },[]);
 const togglePosFullscreen=async()=>{
   try{
     const shell=document.querySelector(".ar-pos-shell");
     if(document.fullscreenElement){await document.exitFullscreen?.();setPosFullscreen(false);return}
     if(shell?.requestFullscreen){await shell.requestFullscreen({navigationUI:"hide"});setPosFullscreen(true);return}
     if(shell?.webkitRequestFullscreen){shell.webkitRequestFullscreen();setPosFullscreen(true);return}
     setPosFullscreen(v=>!v);
   }catch(e){
     setPosFullscreen(v=>!v);
     setNoticeLocal("Full screen is not available in this browser.");
   }
 };
 const exitPosApplication=()=>{try{if(document.fullscreenElement)document.exitFullscreen?.();window.close()}catch(e){}setTimeout(()=>{if(!window.closed)setNoticeLocal("The browser does not allow this tab to close automatically.")},120)};
 const pushCustomerDisplay=async()=>{const cd=settings?.customerDisplay||{};const hw=settings?.hardware||{};if(!cd.enabled&&!hw.customerDisplayEnabled)return;const base=String(hw.agentUrl||"http://127.0.0.1:18765").replace(/\/$/,"");const c=customers.find(x=>x.id===customer);const item=cart[cart.length-1];const payload={port:cd.comPort||hw.customerDisplayPort,baud:Number(cd.baudRate||hw.customerDisplayBaud||9600),dataBits:Number(cd.dataBits||8),stopBits:Number(cd.stopBits||1),line1:cart.length?(item?.name||"TOTAL"):String(cd.topLine||hw.customerDisplayTop||"WELCOME!"),line2:cart.length?money(grand):String(cd.bottomLine||hw.customerDisplayBottom||""),itemName:cart.length?(item?.name||"TOTAL"):String(cd.topLine||hw.customerDisplayTop||"WELCOME!"),total:cart.length?Number(grand||0):0,brandName:String(company?.name||"SHINING PEARL TINTED"),logoData:String(company?.logo||""),footerLeft:"Premium automotive care",footerRight:cart.length?"Thank you":"Thank you",chars:Number(cd.characters||hw.customerDisplayChars||20),mode:cd.secondaryMonitor?"secondary":String(hw.customerDisplayMode||"COM").toLowerCase()};try{const endpoint=cd.secondaryMonitor?"/display-window":"/display";const r=await fetch(base+endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!r.ok)throw Error();}catch{};if(!r.ok)throw Error((data&&data.error)||("HTTP "+r.status));return data||{ok:true}};
 const save=()=>{setSettings(draft);setNotice("Settings saved successfully.")};
 const testPrinter=()=>{const printer=pr.printerReceipt||hw.printer||pr.printer||"";if(!printer){setNotice("Select a receipt printer before printing the test page.");return}hardwareRequestLocal(hw.agentUrl,"/print",{printer,text:(pr.header?pr.header+"\n":"")+"SP-Manager\nPrinter test\n"+(pr.footer||"")+"\n",copies:Number(pr.copies||1),options:{printerType:pr.printerType,paperSize:pr.paperSize,charactersPerLine:pr.charactersPerLine,rightToLeft:pr.rightToLeft,feedLines:pr.feedLines,cutPaper:pr.cutPaper,printBitmap:pr.printBitmap,richFormatting:pr.richFormatting,printBarcode:pr.printBarcode,printLogoFullWidth:pr.printLogoFullWidth,alignment:pr.alignment,codePage:pr.codePage,characterSet:pr.characterSet,marginTop:pr.marginTop,marginRight:pr.marginRight,marginBottom:pr.marginBottom,marginLeft:pr.marginLeft,fontFamily:pr.fontFamily,fontSize:pr.fontSize}}).then(()=>setNotice("Printer test sent successfully.")).catch(e=>setNotice("Printer test failed: "+e.message))};
 const testDrawer=()=>hardwareRequestLocal(hw.agentUrl,"/cash-drawer",{printer:hw.cashDrawerPrinter||hw.printer||pr.printer,bytes:hw.cashDrawerPulse||[27,112,0,25,250]}).then(()=>setNotice("Cash drawer test sent successfully.")).catch(e=>setNotice("Cash drawer test failed: "+e.message));
 const testDisplay=()=>{const mode=cd.secondaryMonitor?"secondary":String(hw.customerDisplayMode||"COM").toLowerCase();const payload={port:cd.comPort||hw.customerDisplayPort,baud:Number(cd.baudRate||hw.customerDisplayBaud||9600),dataBits:Number(cd.dataBits||8),stopBits:Number(cd.stopBits||1),line1:cd.topLine||hw.customerDisplayTop||"WELCOME!",line2:cd.bottomLine||hw.customerDisplayBottom||"",itemName:cd.topLine||"WELCOME!",total:0,brandName:String(company?.name||"SHINING PEARL TINTED"),logoData:String(company?.logo||""),footerLeft:"Premium automotive care",footerRight:"Thank you",chars:Number(cd.characters||20),mode};const request=mode==="secondary"?hardwareRequestLocal(hw.agentUrl,"/display-window",payload):hardwareRequestLocal(hw.agentUrl,"/display",payload);request.then(result=>setNotice(mode==="secondary"?(result?.details?.windowFound===false?"Customer display opened on monitor 2, but the browser window handle was not detected. Check the second monitor.":"Customer display opened on the secondary monitor successfully."):"Customer display test sent successfully.")).catch(e=>setNotice("Customer display test failed: "+e.message));};
 const buttonLabels={search:"Search",transfer:"Transfer",customer:"Customer",discount:"Discount",comment:"Comment",newSale:"New sale",refund:"Refund",cashDrawer:"Cash drawer",serviceType:"Service type",orderName:"Order name"};
 const printTabs=["Printer selection","Customize receipt","Localize receipt text","Print templates"];
 const printOperations=[["receipt","Print receipt","printerReceipt"],["creditPayments","Print credit payments","printerCreditPayments"],["lockedSale","Print locked sale","printerLockedSale"],["kitchenTicket","Print kitchen ticket","printerKitchenTicket"],["serviceMessages","Print service messages","printerServiceMessages"]];
 const printerForOperation=(key)=>pr[key]||pr.printer||"";
 const localize=pr.localize||{};
 const updateLocalize=(key,value)=>setDraft(d=>({...d,print:{...d.print,localize:{...(d.print?.localize||{}),[key]:value}}}));
 return <section className="settings-page"><div className="settings-shell">
  <aside className="settings-nav"><div className="settings-title">Settings</div>{tabs.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</aside>
  <div className="settings-main">
   {notice&&<div className={"settings-inline-notice "+(/failed|invalid|error/i.test(notice)?"error":"success")} aria-live="polite">{notice}<button type="button" onClick={()=>setNotice("")}>×</button></div>}
   {tab==="General"&&<>
    <h2>Application style</h2><div className="settings-grid">
     <Field label="Language"><select value={general.language||"English"} onChange={e=>patch("general","language",e.target.value)}><option>English</option><option>Bahasa Melayu</option></select></Field>
     <Field label="Writing direction"><select value={general.direction||"ltr"} onChange={e=>patch("general","direction",e.target.value)}><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></Field>
     <Field label="Color scheme"><select value={general.colorScheme||"Light"} onChange={e=>patch("general","colorScheme",e.target.value)}>{["Dark","Light","Dimmed","High contrast","Gray","Night"].map(x=><option key={x}>{x}</option>)}</select></Field>
     <Field label="Layout"><select value={general.layout||"Visual"} onChange={e=>patch("general","layout",e.target.value)}><option>Visual</option><option>Standard</option></select></Field>
     <Field label="Number of rows / columns"><div className="settings-pair"><input type="number" min="1" max="12" value={general.rows??5} onChange={e=>patch("general","rows",Number(e.target.value))}/><span>/</span><input type="number" min="1" max="12" value={general.columns??5} onChange={e=>patch("general","columns",Number(e.target.value))}/></div></Field>
     <Field label="Enable virtual keyboard"><Toggle checked={general.virtualKeyboard} onChange={v=>patch("general","virtualKeyboard",v)}/></Field>
     <Field label="Zoom"><select value={general.zoom??100} onChange={e=>patch("general","zoom",Number(e.target.value))}>{[80,90,100,110,125].map(x=><option value={x} key={x}>{x}%</option>)}</select></Field>
    </div>
    <h2>Messages</h2><div className="settings-grid"><Field label={'Show "Close" button'}><Toggle checked={general.showClose} onChange={v=>patch("general","showClose",v)}/></Field><Field label="Click to close"><Toggle checked={general.clickToClose} onChange={v=>patch("general","clickToClose",v)}/></Field><Field label="Slide in"><Toggle checked={general.slideIn} onChange={v=>patch("general","slideIn",v)}/></Field><Field label="Message duration (sec.)"><input type="number" min="1" max="60" value={general.messageDuration??5} onChange={e=>patch("general","messageDuration",Number(e.target.value))}/></Field><Field label="Position"><select value={general.messagePosition||"Top"} onChange={e=>{patch("general","messagePosition",e.target.value);patch("general","notificationPosition",e.target.value)}}><option>Top</option><option>Bottom</option></select></Field></div>
    <h2>Business day</h2><div className="settings-grid"><Field label="Show cash in on application start"><Toggle checked={general.showCashIn} onChange={v=>patch("general","showCashIn",v)}/></Field><Field label="Select business day on application start"><Toggle checked={general.selectBusinessDay} onChange={v=>patch("general","selectBusinessDay",v)}/></Field></div><div className="settings-business"><b>Current business day:</b> {businessDay.date||new Date().toISOString().slice(0,10)} · {businessDay.open?"Open":"Closed"}<button onClick={toggleBusiness}>{businessDay.open?"Close business day":"Open business day"}</button></div>
    <h2>Button bar</h2><p className="settings-help">Select actions to appear in the POS button bar. This follows SP-Manager's visual-layout button-bar concept.</p><div className="settings-check-grid">{Object.entries(general.buttonBar||{}).map(([k,v])=><label key={k}><input type="checkbox" checked={!!v} onChange={e=>patchNested("general",k,e.target.checked)}/>{buttonLabels[k]||k}</label>)}</div>
   </>}
   {tab==="Order & payment"&&<>
    <h2>Basic operations</h2><div className="settings-grid"><Field label="Use floor plans"><Toggle checked={order.floorPlans} onChange={v=>patch("order","floorPlans",v)}/></Field><Field label="Sounds"><Toggle checked={order.sounds} onChange={v=>patch("order","sounds",v)}/></Field><Field label="Navigation sound (Visual layout only)"><Toggle checked={order.soundNavigation} onChange={v=>patch("order","soundNavigation",v)}/></Field><Field label="Item added sound"><Toggle checked={order.soundItemAdded} onChange={v=>patch("order","soundItemAdded",v)}/></Field><Field label="Item not found sound"><Toggle checked={order.soundItemNotFound} onChange={v=>patch("order","soundItemNotFound",v)}/></Field><Field label="Default product search"><select value={order.defaultSearch||"Name"} onChange={e=>patch("order","defaultSearch",e.target.value)}>{["All fields","Barcode","Code","Name"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Show search options"><Toggle checked={order.showSearchOptions} onChange={v=>patch("order","showSearchOptions",v)}/></Field><Field label="Default quantity"><input type="number" min="1" step="1" value={order.defaultQuantity??1} onChange={e=>patch("order","defaultQuantity",Math.max(1,Number(e.target.value)))}/></Field><Field label="Default discount type"><select value={order.defaultDiscountType||"Percentage"} onChange={e=>patch("order","defaultDiscountType",e.target.value)}><option>Percentage</option><option>Fixed</option></select></Field><Field label="Separate row for each item"><Toggle checked={order.separateRow} onChange={v=>patch("order","separateRow",v)}/></Field><Field label="Prevent sale below cost price"><Toggle checked={order.preventSaleBelowCost} onChange={v=>patch("order","preventSaleBelowCost",v)}/></Field><Field label="Prevent negative inventory"><Toggle checked={order.preventNegativeInventory} onChange={v=>patch("order","preventNegativeInventory",v)}/></Field><Field label="Single user"><Toggle checked={order.singleUser} onChange={v=>patch("order","singleUser",v)}/></Field></div>
    <h2>Payment</h2><div className="settings-grid"><Field label="Show items on payment form"><Toggle checked={order.showItemsOnPayment} onChange={v=>patch("order","showItemsOnPayment",v)}/></Field><Field label="Display receipt print dialog"><Toggle checked={order.showReceiptDialog} onChange={v=>patch("order","showReceiptDialog",v)}/></Field><Field label="Default due date (days)"><input type="number" min="0" value={order.defaultDueDate??0} onChange={e=>patch("order","defaultDueDate",Math.max(0,Number(e.target.value)))}/></Field><Field label="Merge items on receipt"><Toggle checked={order.mergeItemsOnReceipt} onChange={v=>patch("order","mergeItemsOnReceipt",v)}/></Field><Field label="Single item discount allowed"><Toggle checked={order.singleItemDiscount} onChange={v=>patch("order","singleItemDiscount",v)}/></Field><Field label="Shortcut keys payment confirmation"><Toggle checked={order.shortcutPaymentConfirmation} onChange={v=>patch("order","shortcutPaymentConfirmation",v)}/></Field><Field label="Number of payment type rows"><input type="number" min="0" max="10" value={order.paymentRows??0} onChange={e=>patch("order","paymentRows",Math.max(0,Number(e.target.value)))}/></Field></div>
    <h2>Void items</h2><div className="settings-grid"><Field label="Require reason on void"><Toggle checked={order.requireVoidReason} onChange={v=>patch("order","requireVoidReason",v)}/></Field><Field label="Track unconfirmed voided items"><Toggle checked={order.trackUnconfirmedVoids} onChange={v=>patch("order","trackUnconfirmedVoids",v)}/></Field></div>
    <h2>Advanced</h2><div className="settings-grid"><Field label="Reset order number on day close"><Toggle checked={order.resetOrderNumberOnClose} onChange={v=>patch("order","resetOrderNumberOnClose",v)}/></Field><Field label="Show all occupied tables in floor plans"><Toggle checked={order.showAllOccupiedTables} onChange={v=>patch("order","showAllOccupiedTables",v)}/></Field></div>
   </>}
   {tab==="Products"&&<><h2>Products</h2><div className="settings-grid"><Field label="Display and print items with tax included"><Toggle checked={prod.taxInclusive} onChange={v=>patch("products","taxInclusive",v)}/></Field><Field label="Discount apply rule"><select value={prod.discountRule||"After tax"} onChange={e=>patch("products","discountRule",e.target.value)}><option>Before tax</option><option>After tax</option></select></Field><Field label="Sorting"><select value={prod.sorting||"Name"} onChange={e=>patch("products","sorting",e.target.value)}><option>Name</option><option>Code</option></select></Field><Field label="Allow negative price"><Toggle checked={prod.allowNegativePrice} onChange={v=>patch("products","allowNegativePrice",v)}/></Field><Field label="Default tax rate"><input type="number" min="0" step="0.01" value={taxRate} onChange={e=>{const v=Math.max(0,Number(e.target.value));setTaxRate(v);localStorage.setItem("sp_taxRate",JSON.stringify(v))}}/></Field><Field label="Cost price based markup"><Toggle checked={prod.costMarkup} onChange={v=>patch("products","costMarkup",v)}/></Field><Field label="Automatically update cost price on purchase"><Toggle checked={prod.autoUpdateCost} onChange={v=>patch("products","autoUpdateCost",v)}/></Field><Field label="Update sale price based on markup"><Toggle checked={prod.updateSalePriceMarkup} onChange={v=>patch("products","updateSalePriceMarkup",v)}/></Field><Field label="Enable moving average price"><Toggle checked={prod.movingAverage} onChange={v=>patch("products","movingAverage",v)}/></Field></div></>}
   {tab==="Documents"&&<><h2>Document number format</h2><div className="settings-grid single"><Field label="Default document number format"><input value={doc.numberFormat||"%YEAR%-%TYPE%-%COUNTER%"} onChange={e=>patch("documents","numberFormat",e.target.value)}/></Field></div><p className="settings-help">Default format is used when no document-specific override exists. Supported tokens: %YEAR%, %TYPE%, %COUNTER%.</p><div className="settings-business"><b>Sample:</b> {(doc.numberFormat||"%YEAR%-%TYPE%-%COUNTER%").replace(/%YEAR%/g,String(new Date().getFullYear())).replace(/%TYPE%/g,"INV").replace(/%COUNTER%/g,"000001")}</div><h3>Overrides</h3><button onClick={()=>{const type=prompt("Document type", "Invoice");if(!type)return;patch("documents","overrides",{...(doc.overrides||{}),[type]:doc.numberFormat||"%YEAR%-%TYPE%-%COUNTER%"})}}>＋ Add format override</button>{Object.entries(doc.overrides||{}).map(([k,v])=><div className="settings-row" key={k}><b>{k}</b><input value={v} onChange={e=>patch("documents","overrides",{...doc.overrides,[k]:e.target.value})}/><button className="danger-text" onClick={()=>{const x={...(doc.overrides||{})};delete x[k];patch("documents","overrides",x)}}>Remove</button></div>)}</>}
   {tab==="Weighing scale"&&<><h2>Weighing scales barcode</h2><div className="settings-grid"><Field label="Enable weighing scales barcode"><Toggle checked={w.enabled} onChange={v=>patch("weighing","enabled",v)}/></Field><Field label="First two digits / prefix"><input value={w.prefix||"20"} onChange={e=>patch("weighing","prefix",e.target.value.replace(/\D/g,""))}/></Field><Field label="Number of digits for product code"><input type="number" min="1" max="10" value={w.productCodeLength??5} onChange={e=>patch("weighing","productCodeLength",Math.max(1,Number(e.target.value)))}/></Field><Field label="Number of decimal places"><input type="number" min="0" max="6" value={w.decimalPlaces??3} onChange={e=>patch("weighing","decimalPlaces",Math.max(0,Number(e.target.value)))}/></Field><Field label="Remove zeros from product code (trim zeros)"><Toggle checked={w.trimZeros} onChange={v=>patch("weighing","trimZeros",v)}/></Field><Field label="Scale prints price instead of quantity"><Toggle checked={w.usePriceBarcode} onChange={v=>patch("weighing","usePriceBarcode",v)}/></Field></div></>}
   {tab==="Customer display"&&<><h2>Customer display</h2><div className="settings-grid"><Field label="Enabled"><Toggle checked={cd.enabled} onChange={v=>patch("customerDisplay","enabled",v)}/></Field><Field label="Secondary monitor"><Toggle checked={cd.secondaryMonitor} onChange={v=>patch("customerDisplay","secondaryMonitor",v)}/></Field><Field label="COM port"><input value={cd.comPort||""} onChange={e=>patch("customerDisplay","comPort",e.target.value)} placeholder="COM3"/></Field><Field label="Baud rate"><input type="number" min="300" value={cd.baudRate??9600} onChange={e=>patch("customerDisplay","baudRate",Number(e.target.value))}/></Field><Field label="Data bits"><select value={cd.dataBits??8} onChange={e=>patch("customerDisplay","dataBits",Number(e.target.value))}><option value="7">7</option><option value="8">8</option></select></Field><Field label="Stop bits"><select value={cd.stopBits??1} onChange={e=>patch("customerDisplay","stopBits",Number(e.target.value))}><option value="1">1</option><option value="2">2</option></select></Field><Field label="Number of characters"><input type="number" min="8" max="80" value={cd.characters??20} onChange={e=>patch("customerDisplay","characters",Number(e.target.value))}/></Field><Field label="Welcome top line"><input value={cd.topLine||"WELCOME!"} onChange={e=>patch("customerDisplay","topLine",e.target.value)}/></Field><Field label="Welcome bottom line"><input value={cd.bottomLine||""} onChange={e=>patch("customerDisplay","bottomLine",e.target.value)}/></Field></div><button onClick={testDisplay}>▤ Test customer display</button><p className="settings-help">SP-Manager's native customer display is serial/COM based; a normal second monitor is not the same feature. SP-Manager keeps the secondary-monitor option separate so it does not falsely claim native SP-Manager parity.</p></>}
   {tab==="Email"&&<><h2>General</h2><div className="settings-grid"><Field label="Host"><input value={email.host||""} onChange={e=>patch("email","host",e.target.value)}/></Field><Field label="Port"><input type="number" value={email.port??465} onChange={e=>patch("email","port",Number(e.target.value))}/></Field><Field label="Email address"><input type="email" value={email.emailAddress||""} onChange={e=>patch("email","emailAddress",e.target.value)}/></Field><Field label="Display name"><input value={email.displayName||""} onChange={e=>patch("email","displayName",e.target.value)}/></Field><Field label="Username"><input value={email.username||""} onChange={e=>patch("email","username",e.target.value)}/></Field><Field label="Password"><input type="password" value={email.password||""} onChange={e=>patch("email","password",e.target.value)}/></Field><Field label="SSL enabled"><Toggle checked={email.ssl!==false} onChange={v=>patch("email","ssl",v)}/></Field><Field label="Bcc recipients"><input value={email.bcc||""} onChange={e=>patch("email","bcc",e.target.value)}/></Field><Field label="Subject" wide><input value={email.subject||""} onChange={e=>patch("email","subject",e.target.value)}/></Field><Field label="Message" wide><textarea rows="5" value={email.message||""} onChange={e=>patch("email","message",e.target.value)}/></Field></div><p className="settings-help">Leave subject/message blank to allow automatically generated receipt email text. Placeholders supported by SP-Manager: {'{receipt}'}, {'{date}'}, {'{total}'}.</p></>}
   {tab==="Print"&&<div className="print-settings-module">
    <div className="print-settings-tabs">{printTabs.map(x=><button key={x} type="button" className={printTab===x?"active":""} onClick={()=>setPrintTab(x)}>{x}</button>)}</div>
    {printTab==="Printer selection"&&<div className="print-settings-content">
      <div className="print-info-banner"><span>ⓘ</span><div>Enable a print operation and choose its Windows printer. The available printer list comes from the SP-Manager Local Agent.</div></div>
      <div className="print-operation-list">
       {printOperations.map(([key,labelName,printerKey])=><div className={"print-operation-row"+(printOperation===key?" selected":"")} key={key}>
        <div className="print-operation-main"><Toggle checked={prt[key==="receipt"?"printReceipt":key==="creditPayments"?"printCreditPayments":key==="lockedSale"?"printLockedSale":key==="kitchenTicket"?"printKitchenTicket":"printServiceMessages"]} onChange={v=>patch("print",key==="receipt"?"printReceipt":key==="creditPayments"?"printCreditPayments":key==="lockedSale"?"printLockedSale":key==="kitchenTicket"?"printKitchenTicket":"printServiceMessages",v)}/><b>{labelName}</b></div>
        <select value={printerForOperation(printerKey)} onChange={e=>patch("print",printerKey,e.target.value)}><option value="">Select printer</option>{printers.map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</select>
        <button type="button" className="print-gear" title="Printer settings" aria-label={`Printer settings for ${labelName}`} onClick={()=>openPrintSettings(key)}>⚙</button>
       </div>)}
      </div>
      <div className="print-selected-card">
       <div><span className="eyebrow">PRINTER SETTINGS</span><h3>{printOperations.find(x=>x[0]===printOperation)?.[1]||"Print receipt"}</h3><p>Configure the selected printer type and common receipt output options without changing other application screens.</p></div>
       <div className="settings-grid">
        <Field label="Printer type"><select value={prt.printerType||"Windows printer"} onChange={e=>patch("print","printerType",e.target.value)}><option>Windows printer</option><option>Generic / Text only</option><option>Standard A4</option></select></Field>
        <Field label="Paper size"><select value={prt.paperSize||"80 mm"} onChange={e=>patch("print","paperSize",e.target.value)}><option>58 mm</option><option>80 mm</option><option>A4</option></select></Field>
        <Field label="Number of copies"><input type="number" min="1" value={prt.copies??1} onChange={e=>patch("print","copies",Math.max(1,Number(e.target.value)))}/></Field>
        <Field label="Characters per line"><input type="number" min="20" value={prt.charactersPerLine??42} onChange={e=>patch("print","charactersPerLine",Number(e.target.value))}/></Field>
        <Field label="Right to left"><Toggle checked={prt.rightToLeft} onChange={v=>patch("print","rightToLeft",v)}/></Field>
        <Field label="Feed lines"><input type="number" min="0" max="20" value={prt.feedLines??3} onChange={e=>patch("print","feedLines",Math.max(0,Number(e.target.value)))}/></Field>
        <Field label="Cut paper"><Toggle checked={prt.cutPaper} onChange={v=>patch("print","cutPaper",v)}/></Field>
        <Field label="Print bitmap / logo"><Toggle checked={prt.printBitmap} onChange={v=>patch("print","printBitmap",v)}/></Field>
        <Field label="Rich formatting"><Toggle checked={prt.richFormatting} onChange={v=>patch("print","richFormatting",v)}/></Field>
        <Field label="Print barcode"><Toggle checked={prt.printBarcode} onChange={v=>patch("print","printBarcode",v)}/></Field>
        <Field label="Print logo full width"><Toggle checked={prt.printLogoFullWidth} onChange={v=>patch("print","printLogoFullWidth",v)}/></Field>
        <Field label="Alignment"><select value={prt.alignment||"Left"} onChange={e=>patch("print","alignment",e.target.value)}><option>Left</option><option>Center</option><option>Right</option></select></Field>
        <Field label="Code page"><input value={prt.codePage||"437"} onChange={e=>patch("print","codePage",e.target.value)}/></Field>
        <Field label="Character set"><select value={prt.characterSet||"None"} onChange={e=>patch("print","characterSet",e.target.value)}>{["None","USA","France","Germany","UK","Denmark I","Sweden","Italy","Spain I","Japan","Norway","Denmark II","Spain II","Latin America","Korea","Slovenia / Croatia","China","Vietnam","Arabia"].map(x=><option key={x}>{x}</option>)}</select></Field>
       </div>
       <h2>Margins (millimeters)</h2><div className="settings-grid">
        <Field label="Top"><input type="number" value={prt.marginTop??0} onChange={e=>patch("print","marginTop",Number(e.target.value))}/></Field>
        <Field label="Right"><input type="number" value={prt.marginRight??0} onChange={e=>patch("print","marginRight",Number(e.target.value))}/></Field>
        <Field label="Bottom"><input type="number" value={prt.marginBottom??0} onChange={e=>patch("print","marginBottom",Number(e.target.value))}/></Field>
        <Field label="Left"><input type="number" value={prt.marginLeft??0} onChange={e=>patch("print","marginLeft",Number(e.target.value))}/></Field>
       </div>
       <div className="settings-database-actions"><button onClick={()=>{const printer=printerForOperation(printOperation);if(!printer){setNotice("Select a printer before printing the test page.");return}hardwareRequestLocal(hw.agentUrl,"/print",{printer,text:(prt.header?prt.header+"\n":"")+"SP-Manager\nPrinter test\n"+(prt.footer||"")+"\n",copies:Number(prt.copies||1)}).then(()=>setNotice("Printer test sent successfully.")).catch(e=>setNotice("Printer test failed: "+e.message))}}>▣ Print test page</button></div>
      </div>
    </div>}
    {printTab==="Customize receipt"&&<div className="print-settings-content">
      <div className="print-info-banner"><span>ⓘ</span><div>Receipt formatting and customer-detail options, following the Aronium Print Options structure.</div></div>
      <h2>Receipt</h2><div className="settings-grid">
       <Field label="Use system currency format"><Toggle checked={prt.useSystemCurrencyFormat} onChange={v=>patch("print","useSystemCurrencyFormat",v)}/></Field>
       <Field label="Print tax totals"><Toggle checked={prt.printTaxTotals} onChange={v=>patch("print","printTaxTotals",v)}/></Field>
       <Field label="Print tax name"><Toggle checked={prt.printTaxName} onChange={v=>patch("print","printTaxName",v)}/></Field>
       <Field label="Print items count"><Toggle checked={prt.printItemsCount} onChange={v=>patch("print","printItemsCount",v)}/></Field>
       <Field label="Print total quantity"><Toggle checked={prt.printTotalQuantity} onChange={v=>patch("print","printTotalQuantity",v)}/></Field>
       <Field label="Short receipt number"><Toggle checked={prt.shortReceiptNumber} onChange={v=>patch("print","shortReceiptNumber",v)}/></Field>
       <Field label="Print order number"><Toggle checked={prt.printOrderNumber} onChange={v=>patch("print","printOrderNumber",v)}/></Field>
       <Field label="Print outstanding balance"><Toggle checked={prt.printOutstandingBalance} onChange={v=>patch("print","printOutstandingBalance",v)}/></Field>
       <Field label="Decimal places"><input type="number" min="0" max="4" value={prt.decimalPlaces??2} onChange={e=>patch("print","decimalPlaces",Math.max(0,Math.min(4,Number(e.target.value))))}/></Field>
       <Field label="Receipt counter"><input type="number" min="0" value={prt.receiptCounter??0} onChange={e=>patch("print","receiptCounter",Math.max(0,Number(e.target.value)))}/></Field>
      </div>
      <h2>Customer details</h2><p className="settings-help">Choose which customer data is printed on receipts. Customer name remains available by default.</p><div className="settings-grid">
       <Field label="Name"><Toggle checked={prt.customerName!==false} onChange={v=>patch("print","customerName",v)}/></Field>
       <Field label="Code"><Toggle checked={prt.customerCode} onChange={v=>patch("print","customerCode",v)}/></Field>
       <Field label="Tax number"><Toggle checked={prt.customerTaxNumber} onChange={v=>patch("print","customerTaxNumber",v)}/></Field>
       <Field label="Address"><Toggle checked={prt.customerAddress} onChange={v=>patch("print","customerAddress",v)}/></Field>
       <Field label="Phone number"><Toggle checked={prt.customerPhone} onChange={v=>patch("print","customerPhone",v)}/></Field>
       <Field label="Email"><Toggle checked={prt.customerEmail} onChange={v=>patch("print","customerEmail",v)}/></Field>
      </div>
      <h2>Address format</h2><div className="settings-grid"><Field label="Address format" wide><textarea rows="4" value={prt.addressFormat||""} onChange={e=>patch("print","addressFormat",e.target.value)}/></Field></div>
      <p className="settings-help">%STREET_NAME% %BUILDING_NUMBER% %ADDITIONAL_STREET_NAME% %ADDITIONAL_BUILDING_NUMBER% %DISTRICT% %CITY% %POSTAL_CODE% %COUNTRY_SUBENTITY% %COUNTRY%</p>
    </div>}
    {printTab==="Localize receipt text"&&<div className="print-settings-content">
      <div className="print-info-banner"><span>ⓘ</span><div>Use this section to translate or modify labels printed on receipts. Customer-detail switches control whether each label is printed before the actual customer value.</div></div>
      <h2>Receipt labels</h2><div className="settings-localize-grid">
       {[
        ["companyTaxNumber","Company tax number"],["receiptNumber","Receipt number"],["refundNumber","Refund number"],["orderNumber","Order number"],["user","User"],["itemsCount","Items count"],["discount","Discount"],["subtotal","Subtotal"],["taxRate","Tax rate"],["total","Total"],["paidAmount","Paid amount"],["amountDue","Amount due"],["change","Change"],["totalSavings","Total savings"],["outstandingBalance","Outstanding balance"]
       ].map(([k,l])=><Field key={k} label={l}><input value={localize[k]??""} onChange={e=>updateLocalize(k,e.target.value)}/></Field>)}
      </div>
      <h2>Customer details</h2><div className="settings-localize-grid">
       {[["customer","Customer"],["address","Address"],["taxNumber","Tax number"],["code","Code"],["phone","Phone number"],["email","Email"]].map(([k,l])=><Field key={k} label={l}><div className="localize-label-control"><input value={localize[k]??""} onChange={e=>updateLocalize(k,e.target.value)}/><Toggle checked={prt["customerLabel"+k.charAt(0).toUpperCase()+k.slice(1)]!==false} onChange={v=>patch("print","customerLabel"+k.charAt(0).toUpperCase()+k.slice(1),v)}/></div></Field>)}
      </div>
    </div>}
    {printTab==="Print templates"&&<div className="print-settings-content">
      <div className="print-info-banner"><span>ⓘ</span><div>The selected font is used in A4 invoice and report templates. Invoice options below follow the Aronium Print templates structure.</div></div>
      <h2>Print templates</h2><div className="settings-grid">
       <Field label="Font"><select value={prt.fontFamily||"Arial"} onChange={e=>patch("print","fontFamily",e.target.value)}><option>Arial</option><option>Segoe UI</option><option>Calibri</option><option>Tahoma</option><option>Times New Roman</option><option>Courier New</option></select></Field>
      </div>
      <h2>Invoice settings</h2><div className="settings-grid">
       <Field label="Title"><input value={prt.invoiceTitle||""} onChange={e=>patch("print","invoiceTitle",e.target.value)} placeholder="Invoice"/></Field>
       <Field label="Print in A5 size"><Toggle checked={prt.printA5} onChange={v=>patch("print","printA5",v)}/></Field>
       <Field label="Tax column"><Toggle checked={prt.taxColumn} onChange={v=>patch("print","taxColumn",v)}/></Field>
       <Field label="Discount column"><Toggle checked={prt.discountColumn} onChange={v=>patch("print","discountColumn",v)}/></Field>
       <Field label="Tax number"><Toggle checked={prt.customerTaxNumber} onChange={v=>patch("print","customerTaxNumber",v)}/></Field>
       <Field label="Code"><Toggle checked={prt.customerCode} onChange={v=>patch("print","customerCode",v)}/></Field>
       <Field label="Phone number"><Toggle checked={prt.customerPhone} onChange={v=>patch("print","customerPhone",v)}/></Field>
       <Field label="Email"><Toggle checked={prt.customerEmail} onChange={v=>patch("print","customerEmail",v)}/></Field>
       <Field label="Payment methods"><Toggle checked={prt.paymentTypes} onChange={v=>patch("print","paymentTypes",v)}/></Field>
       <Field label="Outstanding balance"><Toggle checked={prt.outstandingBalance} onChange={v=>patch("print","outstandingBalance",v)}/></Field>
       <Field label="Footer invoice only"><Toggle checked={prt.footerInvoiceOnly} onChange={v=>patch("print","footerInvoiceOnly",v)}/></Field>
       <Field label="Font size (%)"><input type="number" min="50" max="200" value={prt.fontSize??100} onChange={e=>patch("print","fontSize",Number(e.target.value))}/></Field>
       <Field label="Footer" wide><textarea rows="4" value={prt.footer||""} onChange={e=>patch("print","footer",e.target.value)}/></Field>
      </div>
      <div className="settings-database-actions"><button onClick={testPrinter}>▣ Print test page</button></div>
    </div>}
   </div>}
   {printSettingsOpen&&<div className="print-printer-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)cancelPrintSettings()}}><div className="print-printer-modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="print-printer-modal-head"><div><div className="eyebrow">PRINTER SETTINGS</div><h3>{printOperations.find(x=>x[0]===printOperation)?.[1]||"Print receipt"}</h3><p>Adjust printer settings for the selected print operation.</p></div><button type="button" onClick={cancelPrintSettings}>×</button></div>
    <div className="print-printer-modal-tabs"><button type="button" className={printDialogTab==="General"?"active":""} onClick={()=>setPrintDialogTab("General")}>General</button><button type="button" className={printDialogTab==="Cash drawer"?"active":""} onClick={()=>setPrintDialogTab("Cash drawer")}>Cash drawer</button><button type="button" className={printDialogTab==="Advanced"?"active":""} onClick={()=>setPrintDialogTab("Advanced")}>Advanced</button></div>
    <div className="print-printer-modal-body">
      {printDialogTab==="General"&&<><h4>General</h4><div className="settings-grid">
       <Field label="Printer type"><select value={prt.printerType||"Windows printer"} onChange={e=>patch("print","printerType",e.target.value)}><option>Windows printer</option><option>Generic / Text only</option><option>Standard A4</option></select></Field>
       <Field label="Paper size"><select value={prt.paperSize||"80 mm"} onChange={e=>patch("print","paperSize",e.target.value)}><option>58 mm</option><option>80 mm</option><option>A4</option></select></Field>
       <Field label="Number of copies"><input type="number" min="1" value={prt.copies??1} onChange={e=>patch("print","copies",Math.max(1,Number(e.target.value)))}/></Field>
       <Field label="Characters per line"><input type="number" min="20" value={prt.charactersPerLine??42} onChange={e=>patch("print","charactersPerLine",Number(e.target.value))}/></Field>
       <Field label="Right to left"><Toggle checked={prt.rightToLeft} onChange={v=>patch("print","rightToLeft",v)}/></Field>
       <Field label="Header" wide><textarea rows="3" value={prt.header||""} onChange={e=>patch("print","header",e.target.value)}/></Field>
       <Field label="Footer" wide><textarea rows="3" value={prt.footer||""} onChange={e=>patch("print","footer",e.target.value)}/></Field>
       <Field label="Feed lines"><input type="number" min="0" max="20" value={prt.feedLines??3} onChange={e=>patch("print","feedLines",Math.max(0,Number(e.target.value)))}/></Field>
       <Field label="Cut paper"><Toggle checked={prt.cutPaper} onChange={v=>patch("print","cutPaper",v)}/></Field>
       <Field label="Print bitmap"><Toggle checked={prt.printBitmap} onChange={v=>patch("print","printBitmap",v)}/></Field>
       <Field label="Rich formatting"><Toggle checked={prt.richFormatting} onChange={v=>patch("print","richFormatting",v)}/></Field>
       <Field label="Print barcode"><Toggle checked={prt.printBarcode} onChange={v=>patch("print","printBarcode",v)}/></Field>
       <Field label="Print logo full width"><Toggle checked={prt.printLogoFullWidth} onChange={v=>patch("print","printLogoFullWidth",v)}/></Field>
       <Field label="Alignment"><select value={prt.alignment||"Left"} onChange={e=>patch("print","alignment",e.target.value)}><option>Left</option><option>Center</option></select></Field>
      </div>
      <h4>Margins (in millimeters)</h4><div className="settings-grid"><Field label="Top"><input type="number" value={prt.marginTop??0} onChange={e=>patch("print","marginTop",Number(e.target.value))}/></Field><Field label="Right"><input type="number" value={prt.marginRight??0} onChange={e=>patch("print","marginRight",Number(e.target.value))}/></Field><Field label="Bottom"><input type="number" value={prt.marginBottom??0} onChange={e=>patch("print","marginBottom",Number(e.target.value))}/></Field><Field label="Left"><input type="number" value={prt.marginLeft??0} onChange={e=>patch("print","marginLeft",Number(e.target.value))}/></Field></div></>}
      {printDialogTab==="Cash drawer"&&<><h4>Cash drawer</h4><div className="settings-grid"><Field label="Open cash drawer"><Toggle checked={!!hw.cashDrawerEnabled} onChange={v=>patch("hardware","cashDrawerEnabled",v)}/></Field><Field label="Cash drawer printer"><select value={hw.cashDrawerPrinter||""} onChange={e=>patch("hardware","cashDrawerPrinter",e.target.value)}><option value="">Use receipt printer</option>{printers.map(x=><option key={"drawer"+x.name} value={x.name}>{x.name}</option>)}</select></Field><Field label="Cash drawer command" wide><input value={(hw.cashDrawerPulse||[27,112,0,25,250]).join(",")} onChange={e=>patch("hardware","cashDrawerPulse",e.target.value.split(",").map(x=>Number(x.trim())).filter(x=>Number.isFinite(x)))}/></Field></div><p className="settings-help">The cash drawer is opened through the selected receipt printer when enabled. The command is sent as raw printer bytes.</p></>}
      {printDialogTab==="Advanced"&&<><h4>Advanced</h4><div className="settings-grid">{prt.printerType==="Generic / Text only"?<><Field label="Code page"><input value={prt.codePage||"437"} onChange={e=>patch("print","codePage",e.target.value)}/></Field><Field label="Character set"><select value={prt.characterSet||"None"} onChange={e=>patch("print","characterSet",e.target.value)}>{["None","USA","France","Germany","UK","Denmark I","Sweden","Italy","Spain I","Japan","Norway","Denmark II","Spain II","Latin America","Korea","Slovenia / Croatia","China","Vietnam","Arabia"].map(x=><option key={x}>{x}</option>)}</select></Field></>:<div className="print-info-banner"><span>ⓘ</span><div>Additional options are not available for the selected printer type. Select Generic / Text only to configure code page and character set.</div></div>}</div></>}
      <div className="settings-database-actions"><button type="button" onClick={()=>{const printer=printerForOperation(printOperation);if(!printer){setNotice("Select a printer before printing the test page.");return}hardwareRequestLocal(hw.agentUrl,"/print",{printer,text:(prt.header?prt.header+"\n":"")+"SP-Manager\nPrinter test\n"+(prt.footer||"")+"\n",copies:Number(prt.copies||1)}).then(()=>setNotice("Printer test sent successfully.")).catch(e=>setNotice("Printer test failed: "+e.message))}}>▣ Print test page</button><button type="button" onClick={revertPrintSettings}>↶ Revert changes</button></div>
    </div>
    <div className="print-printer-modal-foot"><button type="button" className="settings-cancel" onClick={cancelPrintSettings}>Cancel</button><button type="button" className="settings-save" onClick={savePrintSettingsDialog}>✓ Save</button></div>
   </div></div>}
   {tab==="Hardware"&&<><h2>Local hardware</h2><p className="settings-help">SP-Manager Local Agent connects the browser to Windows printers, cash drawers and serial customer displays.</p><div className="hardware-status-card"><div className="hardware-status-head"><div><b>SP-Manager Local Agent</b><span className="settings-help">Hardware bridge</span></div><button type="button" onClick={()=>refreshHardware(true).catch(()=>{})} disabled={hardwareRefreshing} aria-busy={hardwareRefreshing}>{hardwareRefreshing?<><span className="hardware-refresh-spinner" aria-hidden="true">↻</span> Refreshing...</>:<>↻ Refresh</>}</button></div>{hardwareStatus?.connected?<div className="hardware-status-state ok"><span className="hardware-dot">●</span><div><strong>CONNECTED</strong><small>Agent is running on this POS computer · v{hardwareStatus.version||"1.0.5"}</small></div></div>:<div className="hardware-status-state error"><span className="hardware-dot">●</span><div><strong>AGENT NOT DETECTED</strong><small>Local Agent is not reachable.</small></div></div>}<div className="hardware-status-hint">Install/start the Local Agent on the Windows POS computer, then press Refresh.</div></div><div className="settings-grid"><Field label="Local Agent enabled"><Toggle checked={!!hw.agentEnabled} onChange={v=>patch("hardware","agentEnabled",v)}/></Field><Field label="Local Agent URL"><input value={hw.agentUrl||"http://127.0.0.1:18765"} onChange={e=>patch("hardware","agentUrl",e.target.value)}/></Field><Field label="Windows receipt printer"><select value={hw.printer||""} onChange={e=>patch("hardware","printer",e.target.value)}><option value="">Select printer</option>{printers.map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</select></Field><Field label="Cash drawer enabled"><Toggle checked={!!hw.cashDrawerEnabled} onChange={v=>patch("hardware","cashDrawerEnabled",v)}/></Field><Field label="Cash drawer printer"><select value={hw.cashDrawerPrinter||""} onChange={e=>patch("hardware","cashDrawerPrinter",e.target.value)}><option value="">Use receipt printer</option>{printers.map(x=><option key={"d"+x.name} value={x.name}>{x.name}</option>)}</select></Field><Field label="Cash drawer command"><input value={(hw.cashDrawerPulse||[27,112,0,25,250]).join(",")} onChange={e=>patch("hardware","cashDrawerPulse",e.target.value.split(",").map(x=>Number(x.trim())).filter(x=>Number.isFinite(x)))}/></Field><Field label="Customer display enabled"><Toggle checked={!!hw.customerDisplayEnabled} onChange={v=>patch("hardware","customerDisplayEnabled",v)}/></Field></div><div className="settings-database-actions"><button onClick={testPrinter}>▣ Test printer</button><button onClick={testDrawer}>▤ Test cash drawer</button><button onClick={testDisplay}>▤ Test customer display</button></div></>}
   {tab==="Database"&&<><h2>Database</h2><div className="settings-database-actions"><button onClick={backup}>▣ Backup database</button><label className="settings-upload">↥ Restore database<input type="file" accept="application/json,.json" onChange={restore}/></label></div><h2>Automatic backups</h2><div className="settings-grid"><Field label="Enable automatic backups"><Toggle checked={db.autoBackup} onChange={v=>patch("database","autoBackup",v)}/></Field><Field label="Backup database on application start"><Toggle checked={db.backupOnStart} onChange={v=>patch("database","backupOnStart",v)}/></Field><Field label="Backup database on application close"><Toggle checked={db.backupOnClose} onChange={v=>patch("database","backupOnClose",v)}/></Field><Field label="Back up automatically every (hours)"><input type="number" min="1" value={db.backupEveryHours??24} onChange={e=>patch("database","backupEveryHours",Math.max(1,Number(e.target.value)))}/></Field><Field label="Delete old backups automatically"><Toggle checked={db.deleteOldBackups} onChange={v=>patch("database","deleteOldBackups",v)}/></Field><Field label="Delete backups older than (days)"><input type="number" min="1" value={db.deleteAfterDays??30} onChange={e=>patch("database","deleteAfterDays",Math.max(1,Number(e.target.value)))}/></Field></div><div className="settings-business"><b>Last backup:</b> {db.lastBackup?new Date(db.lastBackup).toLocaleString("en-MY"):"Never"}</div><h2>Maintenance</h2><button onClick={()=>{setSettings(draft);localStorage.setItem("sp_settings",JSON.stringify(draft));setNotice("Settings and local database cache saved successfully.")}}>⚙ Optimize / save local database</button><p className="settings-help">Browser storage does not expose a direct SQLite optimize command; this action persists the current local database/settings state.</p></>}
   {tab==="License"&&<><h2>License</h2><div className="settings-info-card"><b>SP-Manager</b><span>Business Management System</span><p>Local / Development mode.</p><div className="license-status">● Active local application</div></div></>}
   {tab==="About"&&<><h2>About SP-Manager</h2><div className="settings-info-card"><b>SP-Manager</b><span>Shining Pearl Tinted</span><p>SP-Manager-inspired business management functions with a modern web interface.</p><p>Version: 1.0.17</p><p>Company: {company?.name||"Shining Pearl Tinted"}</p><button onClick={()=>setNotice?.("SP-Manager help is available in the project documentation.")}>Open help center</button></div></>}
   <div className="settings-actions"><button type="button" className="settings-cancel" onClick={onCancel}>Cancel</button><button type="button" className="settings-save" onClick={save}>✓ Save</button></div>
  </div></div></section>
}

function Table({cols,rows}){return <div className="table"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j}>{x}</td>)}</tr>)}</tbody></table></div>}
function Empty({text}){return <div className="empty">{text}</div>}
class AppErrorBoundary extends React.Component{constructor(props){super(props);this.state={error:null}}static getDerivedStateFromError(error){return{error}}componentDidCatch(error,info){console.error("SP-Manager render error",error,info)}render(){if(this.state.error)return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,fontFamily:"Segoe UI,Arial,sans-serif",background:"#0f172a",color:"#f8fafc"}}><div style={{maxWidth:760,width:"100%",background:"#111827",border:"1px solid #334155",borderRadius:18,padding:24}}><h2 style={{marginTop:0}}>SP-Manager could not render</h2><p style={{color:"#cbd5e1"}}>The application stopped because of a JavaScript error. Reload after deploying the latest build.</p><pre style={{whiteSpace:"pre-wrap",background:"#020617",padding:14,borderRadius:10,overflow:"auto",color:"#fca5a5"}}>{String(this.state.error?.stack||this.state.error||"Unknown error")}</pre><button onClick={()=>location.reload()} style={{padding:"10px 16px",border:0,borderRadius:10,cursor:"pointer"}}>Reload</button></div></div>;return this.props.children}}

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App/></AppErrorBoundary>);
