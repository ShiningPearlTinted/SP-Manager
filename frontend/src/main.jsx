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
 const[groupMeta,setGroupMeta]=useState(()=>load("productGroupMeta",{}));
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
   {page==="POS / Sales"&&<POS setCart={setCart} updateLinePrice={updateLinePrice} activeUser={activeUser} posOrderMeta={posOrderMeta} setPosOrderMeta={setPosOrderMeta} retrieveOpenOrder={retrieveOpenOrder} signOut={signOut} filtered={filtered} q={q} setQ={setQ} posSearchMode={posSearchMode} setPosSearchMode={setPosSearchMode} add={add} cart={cart} changeQty={changeQty} customers={customers} setCustomers={v=>{persist("customers",v,setCustomers)}} customer={customer} setCustomer={setCustomer} discount={discount} setDiscount={setDiscount} discountFixed={discountFixed} setDiscountFixed={setDiscountFixed} payment={payment} setPayment={setPayment} paymentTypes={paymentTypes} subtotal={subtotal} disc={disc} taxRate={taxRate} setTaxRate={setTaxRate} tax={tax} grand={grand} sale={completeSale} saveOpenOrder={saveOpenOrder} orders={orders} setOrders={setOrders} updateSaleNote={updateSaleNote} setNoteBox={setNoteBox} clearCurrentSale={clearCurrentSale} printReceipt={printReceipt} closeLastSale={()=>setLastSale(null)} categories={categories} settings={settings} posCategory={posCategory} setPosCategory={setPosCategory} products={products} productGroups={productGroups} company={company} lastSale={lastSale} menuOpen={posMenu} setMenuOpen={setPosMenu} setPage={setPage} sales={sales} emailReceipt={emailReceipt} openCashInOut={openCashInOut} openCashDrawer={cashDrawer} openEndOfDayFromPOS={openEndOfDayFromPOS} groupMeta={groupMeta}/>}
   {page==="Products"&&<Products products={products} setProducts={setProducts} addProduct={addProduct} updateProduct={updateProduct} editing={editing} setEditing={setEditing} categories={categories} setCategories={setCategories} productGroups={productGroups} setProductGroups={setProductGroups} groupMeta={groupMeta} setGroupMeta={setGroupMeta} suppliers={suppliers} setNotice={setNotice} settings={settings}/>}
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
function POS({setCart,updateLinePrice,posOrderMeta,setPosOrderMeta,retrieveOpenOrder,filtered,q,setQ,posSearchMode,setPosSearchMode,add,cart,changeQty,customers,setCustomers,customer,setCustomer,discount,setDiscount,discountFixed,setDiscountFixed,payment,setPayment,paymentTypes,subtotal,disc,taxRate,setTaxRate,tax,grand,sale,saveOpenOrder,orders,setOrders,occupiedTables,updateSaleNote,setNoteBox,clearCurrentSale,printReceipt,closeLastSale,categories,posCategory,setPosCategory,products,productGroups,company,lastSale,menuOpen,setMenuOpen,setPage,sales,emailReceipt,settings,activeUser,signOut,openCashInOut,openCashDrawer,openEndOfDayFromPOS,groupMeta}){
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
 const iconFor=name=>({"Accessories":"🧰","Car Detailing":"✨","Coating":"◈","Installation Service":"🛠","PPF":"◆","Tint":"◉","Wrapping":"◇","Windscreen":"▱","Glass":"◫","Security":"⬡","Protection":"✦"}[name]||"✦");
 // POS Product Group Navigation V1.1.23
 // IMPORTANT: Product Management stores the hierarchy in productGroups + productGroupMeta.
 // productGroups must be included here; using only groupMeta makes a root group such as
 // "Tinted Film" disappear from the POS navigation even though Product Management shows it.
 // Build the POS hierarchy from the complete Product Group dataset first.
 // Do not filter products before resolving parents/children: a child group can
 // contain products whose Category field differs from the parent category.
 const allGroupNames=[...new Set([...(Array.isArray(productGroups)?productGroups:[]),...products.map(p=>p.group||p.category).filter(Boolean),...Object.keys(groupMeta||{})])];
 const parentOf=name=>String(groupMeta?.[name]?.parent||"");
 const rootOf=name=>{let cur=String(name||"");const seen=new Set();while(cur&&parentOf(cur)&&!seen.has(cur)){seen.add(cur);cur=parentOf(cur)}return cur};
 const productGroupName=p=>String(p?.group||p?.category||"");
 const productBelongsToPosCategory=p=>{
   if(!posCategory||posCategory==="All Categories")return true;
   const directCategory=String(p?.category||"");
   const groupName=productGroupName(p);
   const rootGroup=groupName?rootOf(groupName):"";
   const rootMetaCategory=String(groupMeta?.[rootGroup]?.category||"");
   const groupMetaCategory=String(groupMeta?.[groupName]?.category||"");
   return directCategory===String(posCategory)||groupName===String(posCategory)||rootGroup===String(posCategory)||rootMetaCategory===String(posCategory)||groupMetaCategory===String(posCategory);
 };
 const categoryProducts=products.filter(productBelongsToPosCategory);
 const childrenOf=name=>allGroupNames.filter(g=>String(groupMeta?.[g]?.parent||"")===String(name));
 const groupProductCount=name=>{const descendants=[];const walk=n=>{if(descendants.includes(n))return;descendants.push(n);childrenOf(n).forEach(walk)};walk(name);return categoryProducts.filter(p=>descendants.includes(String(p.group||p.category||""))).length};
 const groupHasItems=name=>groupProductCount(name)>0;
 const groupOrder=name=>{const rank=Number(groupMeta?.[name]?.rank);if(Number.isFinite(rank)&&rank>0)return rank;const i=allGroupNames.indexOf(name);return i<0?999999:i};
 const categoryGroupNames=()=>{
   const candidates=allGroupNames.filter(Boolean);
   const roots=candidates.filter(g=>!parentOf(g));
   return roots.filter(g=>{
     const metaCat=String(groupMeta?.[g]?.category||"");
     const rootProduct=categoryProducts.find(p=>rootOf(p.group||p.category)===g);
     const directProduct=categoryProducts.find(p=>String(p.group||p.category||"")===g);
     const catMatch=!posCategory||posCategory==="All Categories"||metaCat===posCategory||String(rootProduct?.category||directProduct?.category||"")===posCategory;
     return catMatch&&groupHasItems(g);
   }).sort((a,b)=>groupOrder(a)-groupOrder(b)||String(a).localeCompare(String(b)));
 };
 const childGroupNames=name=>childrenOf(name).filter(groupHasItems).sort((a,b)=>groupOrder(a)-groupOrder(b)||String(a).localeCompare(String(b)));
 const groupProducts=group?categoryProducts.filter(p=>String(p.group||p.category||"")===String(group)):categoryProducts;
 const shown=groupProducts;
 const currentGroup=group?String(group):"";
 const currentChildren=currentGroup?childGroupNames(currentGroup):categoryGroupNames();
 const parentGroup=currentGroup?parentOf(currentGroup):"";
 const openPosGroup=name=>{const children=childGroupNames(name);setGroup(name);setCatLevel(children.length?"group":"items")};
 const goBackGroup=()=>{
   // Locked POS navigation: Product -> Third Group -> Second Group -> Main Group -> Categories.
   // Back from a root/Main Group must open the complete Categories level, never a
   // single-category screen.
   if(!currentGroup){setGroup("");setPosCategory("All Categories");setCatLevel("root");return;}
   const parent=parentOf(currentGroup);
   if(parent){setGroup(parent);setCatLevel("group");return}
   setGroup("");
   setPosCategory("All Categories");
   setCatLevel("root");
 };
 const groupTile=name=><button type="button" className="ar-category-tile ar-group-tile" key={name} onClick={()=>openPosGroup(name)}><div className="ar-cat-icon">{groupMeta?.[name]?.image?<img className="group-tile-image" src={groupMeta[name].image} alt=""/>:<span>{iconFor(name)}</span>}</div><strong>{name}</strong><small>{groupProductCount(name)} products</small></button>;
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
 const categoryTile=name=><button type="button" className="ar-category-tile" key={name} onClick={()=>{
   const categoryName=String(name||"");
   setPosCategory(categoryName);
   // The category itself is the POS entry point. If a root Product Group has
   // the same name, enter that Main Group immediately instead of rendering a
   // duplicate one-tile screen. This is the original V1.1.16 navigation flow.
   const sameNameRoot=allGroupNames.find(g=>String(g)===categoryName&&!parentOf(g));
   if(sameNameRoot&&groupHasItems(sameNameRoot)){
     const children=childGroupNames(sameNameRoot);
     setGroup(sameNameRoot);
     setCatLevel(children.length?"group":"items");
   }else{
     setGroup("");
     setCatLevel("group");
   }
 }}><div className="ar-cat-icon">{groupMeta?.[name]?.image?<img className="group-tile-image" src={groupMeta[name].image} alt=""/>:<span>{iconFor(name)}</span>}</div><strong>{name}</strong><small>{products.filter(p=>(p.category||p.group)===String(name)).length} products</small></button>;
 const selectedTransfer=cart.filter(i=>transferSelection.has(i.lineId||i.id));
 const makeTransfer=()=>{if(saleLocked){setNoticeLocal("Sale is locked. Unlock the sale before transferring items.");return}if(!selectedTransfer.length){setNoticeLocal("Select at least one item to transfer.");return}const order={id:Date.now(),name:"Transfer "+String(Date.now()).slice(-6),date:new Date().toISOString(),customerId:customer,items:selectedTransfer,status:"Open",transferred:true};save("orders",[...orders,order]);setOrders([...orders,order]);selectedTransfer.forEach(i=>changeQty(i.lineId||i.id,-Number(i.qty||0)));setTransferSelection(new Set());setTransferScreen(false);setNoticeLocal("Selected items transferred to "+order.name+".")};
 useEffect(()=>{
   const syncFullscreen=()=>setPosFullscreen(Boolean(document.fullscreenElement));
   document.addEventListener("fullscreenchange",syncFullscreen);
   document.addEventListener("webkitfullscreenchange",syncFullscreen);
   syncFullscreen();
   return()=>{document.removeEventListener("fullscreenchange",syncFullscreen);document.removeEventListener("webkitfullscreenchange",syncFullscreen)};
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
 const pushCustomerDisplay=async()=>{const cd=settings?.customerDisplay||{};const hw=settings?.hardware||{};if(!cd.enabled&&!hw.customerDisplayEnabled)return;const base=String(hw.agentUrl||"http://127.0.0.1:18765").replace(/\/$/,"");const c=customers.find(x=>x.id===customer);const item=cart[cart.length-1];const payload={port:cd.comPort||hw.customerDisplayPort,baud:Number(cd.baudRate||hw.customerDisplayBaud||9600),dataBits:Number(cd.dataBits||8),stopBits:Number(cd.stopBits||1),line1:cart.length?(item?.name||"TOTAL"):String(cd.topLine||hw.customerDisplayTop||"WELCOME!"),line2:cart.length?money(grand):String(cd.bottomLine||hw.customerDisplayBottom||""),chars:Number(cd.characters||hw.customerDisplayChars||20),mode:cd.secondaryMonitor?"secondary":String(hw.customerDisplayMode||"COM").toLowerCase(),companyName:company?.name||"Shining Pearl Tinted",logo:company?.logo||"",items:cart.map(i=>({name:i.name,qty:Number(i.qty||1),price:Number(i.price||0)})),total:Number(grand||0),currency:"RM",customerName:c?.name||""};try{const r=await fetch(base+"/display",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!r.ok)throw Error();if(cd.secondaryMonitor)await fetch(base+"/display-window",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({width:window.screen?.availWidth||1024,height:window.screen?.availHeight||768})}).catch(()=>{});}catch{}};
 useEffect(()=>{pushCustomerDisplay()},[cart,grand,customer,settings.customerDisplay?.enabled,settings.hardware?.customerDisplayEnabled]);
 const openPosSettings=()=>{if(!isPermissionAllowed(activeUser,"manageSettings")){setNoticeLocal("You do not have permission to access Settings.");return}setShowUserMenu(false);setMenuOpen(false);setPage("Settings")};
 const virtualKey=(key)=>{if(key==="BACKSPACE"){setQ(v=>v.slice(0,-1));return}if(key==="SPACE"){setQ(v=>v+" ");return}if(key==="ENTER"){const weighed=resolveWeighingBarcode(q);if(weighed){addResolvedProduct(weighed.product,weighed.qty);setQ("");return}const exact=filtered.length===1?filtered[0]:null;if(exact){addPos(exact);setQ("");setNoticeLocal("Added "+exact.name+" to the sale.")}else if(filtered.length>1){setNoticeLocal("Select a product from the search results.")}else{setNoticeLocal("No matching product found.")}return}if(key==="SHIFT"||key==="&123"){return}if(key==="DOWN"||key==="PREV"||key==="NEXT"||key==="LEFT"||key==="RIGHT"){return}setQ(v=>v+key)};
 const virtualKeyboardRows=[["Q","W","E","R","T","Y","U","I","O","P","BACKSPACE"],["A","S","D","F","G","H","J","K","L","ENTER"],["SHIFT","Z","X","C","V","B","N","M",",",".","?","SHIFT"],["DOWN","&123","@","SPACE","PREV","NEXT","LEFT","RIGHT"]];
 const paymentIcon=name=>{
   const key=String(name||"").toLowerCase();
   const paths=key.includes("cash") ? "M3 7h18v10H3zM6 10h.01M18 14h.01M8 12h8"
     : key==="card" ? "M3 6h18v12H3zM3 10h18M7 15h4"
     : key==="qr" ? "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM19 17v3h-3"
     : key.includes("bank") ? "M3 9l9-5 9 5M5 10v7M9 10v7M15 10v7M19 10v7M3 19h18"
     : key==="check" ? "M5 4h14v16H5zM8 8h8M8 12h8M8 16l2 2 5-5"
     : key==="unpaid" ? "M4 5h16v14H4zM8 9h8M8 13h5"
     : "M4 5h16v14H4zM7 9h10M7 13h6";
   return <svg className="ar-payment-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths}/></svg>;
 };
 return <section className={"ar-pos-shell "+(posFullscreen?"pos-browser-fullscreen":"")}>
  <div className="ar-topbar">
   {[['⌕','Search'],['♙','Customer'],['⇄','Transfer'],['%','Discount'],['＋','New sale'],['↶','Refund'],['✎','Comment'],['◉','Service type'],...(settings.order.customOrderName===false?[]:[['#','Order name']]),['▤','Cash drawer'],['F9','Save sale'],['F10','Payment'],...enabledPayments.filter(x=>x.quickPayment).map(x=>['PAYMENT_ICON',String(x.name).toLowerCase()==='cash'?'F12 Cash':x.name])].filter(([,label])=>{const m={Search:"search",Customer:"customer",Transfer:"transfer",Discount:"discount","New sale":"newSale",Refund:"refund",Comment:"comment","Service type":"serviceType","Order name":"orderName","Cash drawer":"cashDrawer","Save sale":"newSale",Payment:"payment"};const key=label.replace(/^F10 /,"").replace(/^F12 .*/,"Cash");return m[key]===undefined||settings.general.buttonBar[m[key]]!==false||label.includes(" ")}).map(([ic,label])=><button key={label} className={'ar-action '+(label==='F10 Payment'?'selected':'')} onClick={()=>{
     if(label==='Search'){document.querySelector('.ar-search-input')?.focus();return}
     if(label==='Customer'){if(saleLocked){setNoticeLocal('Sale is locked. Unlock the sale before changing customer.');return}setShowCustomer(true);return}
     if(label==='Transfer'){setTransferSelection(new Set());setTransferScreen(true);return}
     if(label==='Discount'){if(saleLocked){setNoticeLocal('Sale is locked. Unlock the sale before changing discount.');return}openDiscount();return}
     if(label==='New sale'){saveAndNew();return}
     if(label==='Refund'){if(!isPermissionAllowed(activeUser,'managePayments')){setNoticeLocal('You do not have permission to use Refund / Void.');return}setPage('Refund / Void');return}
     if(label==='Comment'){if(saleLocked){setNoticeLocal('Sale is locked. Unlock the sale before changing comment.');return}setCommentValue(posOrderMeta?.comment||'');setCommentScreen(true);return}
     if(label==='Service type'){if(saleLocked){setNoticeLocal('Sale is locked. Unlock the sale before changing service type.');return}setServiceTypeValue(posOrderMeta?.serviceType||'Dine In');setServiceTypeScreen(true);return}
     if(label==='Order name'){if(settings.order.customOrderName===false)return;if(saleLocked){setNoticeLocal('Sale is locked. Unlock the sale before changing order name.');return}setOrderNameValue(posOrderMeta?.name||'');setOrderNameSaveMode(false);setOrderNameScreen(true);return}
     if(label==='Cash drawer'){openCashDrawer?.();return}
     if(label==='Save sale'){saveCurrentOpenOrder();return}
     if(label==='Payment'||label==='F10 Payment'){startPayment();return}
     const paymentLabel=label.replace(/^F12 /,'');const pt=enabledPayments.find(x=>x.name===paymentLabel);if(pt)quickPay(pt);
   }}><span className={ic==='PAYMENT_ICON'?'ar-payment-icon-wrap':''}>{ic==='PAYMENT_ICON'?paymentIcon(label.replace(/^F12 /,'')):ic}</span><b>{label==='Save sale'?'F9 Save sale':label==='Payment'?'F10 Payment':label==='Cash'?'F12 Cash':label}</b></button>)}
   <button className="ar-menu-btn" onClick={()=>setMenuOpen(!menuOpen)}>☰</button>
  </div>
  <div className="ar-main">
   <div className="ar-order-panel">
    <div className="ar-order-tools"><button onClick={()=>{if(saleLocked){setNoticeLocal("Sale is locked. Unlock the sale before deleting items.");return}const i=cart.find(x=>(x.lineId||x.id)===selectedLineId||x.productId===selectedLineId);if(i)changeQty(i.lineId||i.id,-i.qty)}}>× Delete</button><button onClick={()=>{if(saleLocked){setNoticeLocal("Sale is locked. Unlock the sale before changing quantity.");return}const i=cart.find(x=>(x.lineId||x.id)===selectedLineId||x.productId===selectedLineId);setQuantityValue(String(i?.qty||nextQuantity||1));if(i)setSelectedLineId(i.lineId||i.id);setQuantityScreen(true)}}>Quantity</button></div>
    <div className="ar-order-customer"><span>Customer</span><button onClick={()=>setShowCustomer(true)}>{customers.find(c=>c.id===customer)?.name||'Walk-in Customer'} <b>⌄</b></button></div>
    <div className="ar-order-items">{cart.map(i=><div className={"ar-order-item "+((i.lineId||i.id)===selectedLineId?"selected":"")} key={i.lineId||i.id} onClick={()=>{const key=i.lineId||i.id;setSelectedLineId(key)}}><button className="ar-item-plus" onClick={(e)=>{e.stopPropagation();addPos(i)}}>＋</button><div><b>{i.name}</b><small>{i.code||'—'} · {money(i.price)} × {i.qty}</small></div><strong>{money(i.price*i.qty)}</strong></div>)}{!cart.length&&<div className="ar-no-items"><span>🛒</span><b>No items</b><small>Select a category or search for a product</small></div>}</div>
    <div className="ar-order-total"><span>Subtotal <b>{money(subtotal)}</b></span><span>Discount <b>{money(disc)}</b></span><span>Tax <b>{money(tax)}</b></span><strong>Total <b>{money(grand)}</b></strong></div>
    <div className="ar-bottom-actions"><button onClick={()=>{if(cart.length){if(saleLocked){setNoticeLocal("Sale is locked. Unlock the sale before voiding the order.");return}if(window.confirm("Void current order?")){clearCurrentSale();setSelectedLineId(null);}}}}>▣<small>Void order</small></button><button className={saleLocked?"locked":""} onClick={()=>{if(saleLocked){setSaleLocked(false);setNoticeLocal("Sale unlocked.")}else{lockSale()}}}>♙<small>{saleLocked?"Unlock":"Lock"}</small></button><button onClick={()=>{if(saleLocked){setNoticeLocal("Sale is locked. Unlock the sale before repeating a round.");return}if(!cart.length){setRoundNotice(true);return}const i=cart.find(x=>(x.lineId||x.id)===selectedLineId||x.productId===selectedLineId)||cart[cart.length-1];if(i)addPos(products.find(p=>p.id===i.id)||i);}}>⇄<small>Repeat round</small></button></div>
   </div>
   <div className={"ar-product-panel "+(virtualKeyboard?"keyboard-open":"")}>
    <div className="ar-search-row"><button style={{display:settings.order.showSearchOptions?undefined:"none"}} title="Search by name, code or barcode" className={posSearchMode==="All"?"search-mode-active":""} onClick={()=>{setPosSearchMode("All");setQ("")}}>✳</button><button style={{display:settings.order.showSearchOptions?undefined:"none"}} title="Search by barcode" className={posSearchMode==="Barcode"?"search-mode-active":""} onClick={()=>{setPosSearchMode("Barcode");setQ("")}}>▥</button><button style={{display:settings.order.showSearchOptions?undefined:"none"}} title="Search by code" className={posSearchMode==="Code"?"search-mode-active":""} onClick={()=>{setPosSearchMode("Code");setQ("")}}>#</button><button style={{display:settings.order.showSearchOptions?undefined:"none"}} title="Search by name" className={posSearchMode==="Name"?"search-mode-active":""} onClick={()=>{setPosSearchMode("Name");setQ("")}}>◆</button><input className="ar-search-input" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){const weighed=resolveWeighingBarcode(q);if(weighed){e.preventDefault();addResolvedProduct(weighed.product,weighed.qty);setQ("")}}}} placeholder={posSearchMode==="All"?"Search products by name, code or barcode":"Search products by "+String(posSearchMode||"Name").toLowerCase()}/><span>⌕</span><button type="button" className={"ar-keyboard-btn "+(virtualKeyboard?"active":"")} title="Open virtual keyboard" aria-label="Open virtual keyboard" onClick={()=>{setVirtualKeyboard(v=>!v);setTimeout(()=>document.querySelector('.ar-search-input')?.focus(),0)}}>⌨</button></div>
    {q&&<div className="ar-search-hint">{filtered.length} product(s) found</div>}
    {settings.general.layout==="Standard" ? <div className="ar-standard-list">{filtered.length?<div className="ar-standard-table">{filtered.map(p=><button type="button" key={p.id} className="ar-standard-product-button" onClick={e=>{e.preventDefault();e.stopPropagation();addPos(p)}}><span className="pos-stock-badge">{stockOnHandText(p)}</span><span><b>{p.name}</b><small>{p.code||"No code"}{p.barcode?" · "+p.barcode:""}</small></span><strong>{money(p.price)}</strong></button>)}</div>:<Empty text="No products found."/>}</div> : <>
    {q?<><div className="ar-breadcrumb"><span>Products</span><b>›</b><strong>Search results</strong></div><div className="ar-grid-wrap" style={{gridTemplateColumns:`repeat(${Math.max(1,Number(settings.general.columns||5))},minmax(0,1fr))`}}>{filtered.length?filtered.map(p=><button type="button" className="ar-product-tile" key={p.id} onClick={e=>{e.preventDefault();e.stopPropagation();addPos(p)}}><span className="pos-stock-badge">{stockOnHandText(p)}</span><div className="ar-product-image"><img src={productImageSrc(p)} alt=""/></div><div className="product-card-body"><strong>{p.name}</strong><small>{p.code||'No code'}{p.barcode?" · "+p.barcode:""}</small><b>{money(p.price)}</b></div></button>):<Empty text="No products found."/>}</div></>:null}
    {!q&&catLevel==='root'&&<><div className="ar-breadcrumb"><span>Products</span><b>›</b><strong>Categories</strong></div><div className="ar-category-grid" style={{gridTemplateColumns:`repeat(${Math.max(1,Number(settings.general.columns||5))},minmax(0,1fr))`}}>{rootCats.map(categoryTile)}</div></>}
    {catLevel==='group'&&<><div className="ar-breadcrumb"><button type="button" className="ar-back-link" onClick={goBackGroup}>← {currentGroup?(parentGroup||posCategory):'Categories'}</button>{currentGroup&&<><b>›</b><strong>{currentGroup}</strong></>}</div><div className="ar-grid-wrap" style={{gridTemplateColumns:`repeat(${Math.max(1,Number(settings.general.columns||5))},minmax(0,1fr))`}}><button type="button" className="ar-back-tile ar-back-primary" onClick={goBackGroup}><span>←</span><small>Back to {currentGroup?(parentGroup||posCategory):'Categories'}</small></button>{currentChildren.length?currentChildren.map(groupTile):(!currentGroup&&shown.length?shown.map(p=><button type="button" className="ar-product-tile" key={p.id} onClick={e=>{e.preventDefault();e.stopPropagation();addPos(p)}}><span className="pos-stock-badge">{stockOnHandText(p)}</span><div className="ar-product-image"><img src={productImageSrc(p)} alt=""/></div><div className="product-card-body"><strong>{p.name}</strong><small>{p.code||'No code'}</small><b>{money(p.price)}</b></div></button>):<Empty text="No groups found in this category."/>)}</div></>}
    {catLevel==='items'&&<><div className="ar-breadcrumb"><button type="button" className="ar-back-link" onClick={goBackGroup}>← {parentGroup||posCategory}</button><b>›</b><strong>{currentGroup}</strong></div><div className="ar-grid-wrap" style={{gridTemplateColumns:`repeat(${Math.max(1,Number(settings.general.columns||5))},minmax(0,1fr))`}}><button type="button" className="ar-back-tile" onClick={goBackGroup}><span>←</span><small>Back to {parentGroup||posCategory}</small></button>{shown.map(p=><button type="button" className="ar-product-tile" key={p.id} onClick={e=>{e.preventDefault();e.stopPropagation();addPos(p)}}><span className="pos-stock-badge">{stockOnHandText(p)}</span><div className="ar-product-image"><img src={productImageSrc(p)} alt=""/></div><div className="product-card-body"><strong>{p.name}</strong><small>{p.code||'No code'}</small><b>{money(p.price)}</b></div></button>)}</div></>}
    </>}
    {catLevel==='items'&&!shown.length&&<Empty text="No products found in this group."/>}
    <div className="ar-page-footer">
     <button type="button" className="ar-user-footer-btn" onClick={()=>{setShowUserMenu(v=>!v);setMenuOpen(false)}} title="Open user menu"><span><b>{activeUser?.name||activeUser?.username||"User"}</b></span><i>⌃</i></button>
     <span className="footer-home">⌂</span><span>Page 1 / 1　│‹　‹　›　›│</span>
    </div>
   </div>
  </div>
  {menuOpen&&<div className="ar-menu-panel"><div className="ar-menu-title">POS - {activeUser?.name||activeUser?.username||"User"} <b onClick={()=>setMenuOpen(false)}>→</b></div><div className="ar-user-identity" aria-label="Current user"><div><b>{activeUser?.username||activeUser?.name||"User"}</b></div></div>{[["⚒","Management","Management","__management"],["↕","Cash In / Out","Cash In / Out","cashInOut"],["⚑","End of day","End of day","endOfDay"],["⇥","Sign out",null,"__signout"]].map(([ic,label,target,perm])=>{const allowed=perm==="__management"?hasManagementAccess(activeUser):perm==="__signout"||isPermissionAllowed(activeUser,perm);return <button key={label} disabled={!allowed} className={!allowed?"permission-disabled":""} onClick={()=>{if(!allowed)return;setMenuOpen(false);if(perm==="__signout")signOut();else if(perm==="cashInOut")openCashInOut?.();else if(perm==="endOfDay")openEndOfDayFromPOS();else if(target)setPage(target)}}><span>{ic}</span>{label}</button>})}<div className="ar-menu-date">{new Date().toLocaleDateString('en-GB')}</div><div className="ar-menu-footer spmanager-footer-controls" aria-label="POS controls">
 <button type="button" title="Settings" aria-label="Settings" onClick={openPosSettings}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16M9 4v4M15 10v4M8 16v4"/></svg></button>
 <button type="button" title="Toggle full screen" aria-label="Toggle full screen" onClick={togglePosFullscreen}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/></svg></button>
 <button type="button" title="Exit application" aria-label="Exit application" onClick={exitPosApplication}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9M6.2 5.8a8 8 0 1 0 11.6 0"/></svg></button>
</div></div>}
  {showCustomer&&<div className="ar-modal-backdrop" onMouseDown={()=>setShowCustomer(false)}><div className="ar-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>POS CUSTOMER</small><h3>Select Customer</h3></div><button onClick={()=>setShowCustomer(false)}>×</button></div><div className="customer-modal-tools"><input autoFocus placeholder="Search customer name, phone or email..." value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/><button onClick={()=>setShowAddCustomer(true)}>＋ Add customer</button></div><div className="ar-customer-list">{customers.filter(c=>(c.name+" "+(c.phone||"")+" "+(c.email||"")+" "+(c.vehicleNumber||"")).toLowerCase().includes(customerSearch.toLowerCase())).map(c=><button key={c.id} className={c.id===customer?'chosen':''} onClick={()=>{setCustomer(c.id);setShowCustomer(false);setCustomerSearch("")}}><span>♙</span><div><b>{c.name}</b><small>{c.phone} · {c.email}{c.vehicleNumber?" · "+c.vehicleNumber:""}</small></div><strong>{c.id===customer?'✓':''}</strong></button>)}{!customers.some(c=>(c.name+" "+(c.phone||"")+" "+(c.email||"")+" "+(c.vehicleNumber||"")).toLowerCase().includes(customerSearch.toLowerCase()))&&<div className="customer-empty">No customers found.</div>}</div></div></div>}
  {showAddCustomer&&<div className="ar-modal-backdrop customer-add-backdrop" onMouseDown={()=>setShowAddCustomer(false)}><div className="ar-modal customer-add-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>CUSTOMER MASTER</small><h3>Add customer</h3></div><button onClick={()=>setShowAddCustomer(false)}>×</button></div><div className="customer-add-form"><label>Name<input autoFocus value={newCustomer.name} onChange={e=>setNewCustomer({...newCustomer,name:e.target.value.toUpperCase()})} onKeyDown={e=>{if(e.key==='Enter')addCustomer();if(e.key==='Escape')setShowAddCustomer(false)}} placeholder="Customer name"/></label><label>Phone<input value={newCustomer.phone} onChange={e=>setNewCustomer({...newCustomer,phone:e.target.value.toUpperCase()})} placeholder="012-xxx xxxx"/></label><label>Email<input value={newCustomer.email} onChange={e=>setNewCustomer({...newCustomer,email:e.target.value.toUpperCase()})} placeholder="customer@email.com"/></label><label>Vehicle Number<input value={newCustomer.vehicleNumber} onChange={e=>setNewCustomer({...newCustomer,vehicleNumber:e.target.value.toUpperCase()})} onKeyDown={e=>{if(e.key==='Enter')addCustomer();if(e.key==='Escape')setShowAddCustomer(false)}} placeholder="e.g. VXX 1234"/></label></div><div className="modal-actions"><button className="secondary" onClick={()=>setShowAddCustomer(false)}>Cancel</button><button onClick={addCustomer}>✓ Save customer</button></div></div></div>}
  {discountScreen&&<div className="ar-modal-backdrop" onMouseDown={()=>setDiscountScreen(false)}><div className="ar-modal discount-screen" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head discount-head"><div><small>POS DISCOUNT</small><h3>Apply discount</h3><p>Choose a percentage or fixed RM discount for this sale.</p></div><button className="discount-close" onClick={()=>setDiscountScreen(false)}>×</button></div><div className="discount-body"><div className="discount-toggle"><button className={discountMode==='percent'?'chosen':''} onClick={()=>{setDiscountMode('percent');setDiscountValue(discount||0)}}><span>%</span><b>Percentage</b><small>Discount by %</small></button><button className={discountMode==='fixed'?'chosen':''} onClick={()=>{setDiscountMode('fixed');setDiscountValue(discountFixed||0)}}><span>RM</span><b>Fixed amount</b><small>Discount by RM</small></button></div><label className="discount-value-field"><span>Discount value</span><div className="discount-input-wrap"><strong>{discountMode==='percent'?'%':'RM'}</strong><input autoFocus type="text" inputMode="decimal" value={discountValue} onChange={e=>setDiscountValue(e.target.value.replace(/[^0-9.]/g,''))} onKeyDown={e=>{if(e.key==='Enter')applyDiscount();if(e.key==='Escape')setDiscountScreen(false)}} placeholder="0.00"/></div></label><div className="discount-preview"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>New discount</span><b>{money(discountMode==='percent'?Math.min(subtotal,subtotal*Number(discountValue||0)/100):Math.min(subtotal,Number(discountValue||0)))}</b></div><div className="discount-after"><span>Amount after discount</span><strong>{money(Math.max(0,subtotal-(discountMode==='percent'?Math.min(subtotal,subtotal*Number(discountValue||0)/100):Math.min(subtotal,Number(discountValue||0)))))}</strong></div></div><div className="modal-actions discount-actions"><button className="secondary" onClick={()=>setDiscountScreen(false)}>Cancel</button><button className="discount-apply" onClick={applyDiscount}>✓ Apply discount</button></div></div></div></div>}
  {transferScreen&&<div className="ar-modal-backdrop" onMouseDown={()=>setTransferScreen(false)}><div className="ar-modal transfer-screen" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>TRANSFER / SPLIT ORDER</small><h3>Select items to transfer</h3></div><button onClick={()=>setTransferScreen(false)}>×</button></div><div className="transfer-items">{cart.map(i=><label key={i.lineId||i.id}><input type="checkbox" checked={transferSelection.has(i.lineId||i.id)} onChange={e=>setTransferSelection(a=>{const n=new Set(a);e.target.checked?n.add(i.lineId||i.id):n.delete(i.lineId||i.id);return n})}/><span>{i.name}</span><b>{i.qty} × {money(i.price)}</b></label>)}</div><div className="modal-actions transfer-modal-actions"><button className="secondary" onClick={()=>setTransferScreen(false)}>Cancel</button><button className="transfer-primary" onClick={makeTransfer}>Transfer selected</button></div></div></div>}
  {showUserMenu&&<div className="ar-user-menu-panel">
   <div className="ar-user-menu-head"><div><b>{activeUser?.name||activeUser?.username||"User"}</b><small>{activeUser?.role||"Staff"}</small></div><button type="button" onClick={()=>setShowUserMenu(false)}>×</button></div>
<div className="ar-user-menu-footer spmanager-footer-controls">
 <button type="button" title="Settings" aria-label="Settings" onClick={openPosSettings}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16M9 4v4M15 10v4M8 16v4"/></svg></button>
 <button type="button" title="Toggle full screen" aria-label="Toggle full screen" onClick={togglePosFullscreen}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/></svg></button>
 <button type="button" title="Exit application" aria-label="Exit application" onClick={exitPosApplication}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9M6.2 5.8a8 8 0 1 0 11.6 0"/></svg></button>
</div>
  </div>}
  {permissionError&&<div className="permission-error-backdrop" onMouseDown={()=>setPermissionError(null)}>
    <div className="permission-error-dialog" onMouseDown={e=>e.stopPropagation()}>
      <div className="permission-error-icon">◉</div>
      <h2>{permissionError==='Management'?'Management access restricted':'Access denied'}</h2>
      <p>{permissionError==='Management'?`There are no management modules available for user ${activeUser?.name||activeUser?.username||'User'}. Please log in with a user that has access to at least one management module to continue.`:`User ${activeUser?.name||activeUser?.username||'User'} does not have permission to access ${permissionError}.`}</p>
      <button type="button" onClick={()=>setPermissionError(null)}>Close</button>
    </div>
  </div>}
  {virtualKeyboard&&<div className="virtual-keyboard-dock"><div className="virtual-keyboard-body">{virtualKeyboardRows.map((row,ri)=><div className="virtual-keyboard-row" key={ri}>{row.map(key=><button key={key} className={"virtual-key "+(key==="ENTER"?"enter":"")+(key==="BACKSPACE"?"backspace":"")+(key==="SPACE"?"space":"")+(key==="SHIFT"?"shift":"")+(key==="&123"?"symbols":"")+(key==="DOWN"?"down":"")+(key==="PREV"||key==="NEXT"?"nav":"")+(key==="LEFT"||key==="RIGHT"?"arrow":"")} onClick={()=>virtualKey(key)}>{key==="BACKSPACE"?"⌫":key==="ENTER"?"enter":key==="SPACE"?"":key==="SHIFT"?"⇧":key==="DOWN"?"▼":key==="PREV"?"prev":key==="NEXT"?"next":key==="LEFT"?"‹":key==="RIGHT"?"›":key}</button>)}</div>)}</div></div>}
  {paymentScreen&&<div className="ar-payment-screen"><div className="ar-payment-header"><div><span>Items</span><small>{cart.length} item line(s)</small></div><div className="payment-screen-actions"><button onClick={()=>setPaymentScreen(false)}>✕ Cancel</button><button onClick={()=>setTaxRate(Number(prompt("Tax rate (%)",String(taxRate)))||0)}>⌁ Taxes</button><button onClick={openDiscount}>% Discount</button><button onClick={()=>setNoticeLocal("Rounds selection is available when a sale contains multiple rounds.")}>▱ Rounds</button><button onClick={()=>setShowCustomer(true)}>♙ Customer</button></div></div><div className="ar-payment-body"><aside className="payment-type-column"><h3>Payment type</h3><div className="payment-type-buttons" style={settings.order.paymentRows>0?{display:"grid",gridTemplateRows:`repeat(${Math.max(1,Number(settings.order.paymentRows||1))},minmax(42px,auto))`,gridAutoFlow:"column"}:undefined}>{enabledPayments.map(x=><button className={payment===x.name?'chosen':''} key={x.id} onClick={()=>{setPayment(x.name);setPaidAmount(x.markPaid?grand:0)}}>{x.name}</button>)}</div><button className="split-button" onClick={()=>{setSplitScreen(true);setSplitType(payment);setSplitAmount(paymentRemaining)}}>☷ Split payments</button></aside><main className="payment-main"><div className="payment-total-line"><span>Total:</span><b>{money(grand)}</b></div><label className="paid-entry">Paid:<input autoFocus type="text" inputMode="decimal" value={paidAmount} onChange={e=>{const v=e.target.value.replace(/[^0-9.\-]/g,"");setPaidAmount(v)}} onKeyDown={e=>{if(e.key==='Enter')finishPayment()}}/><span>↗</span></label><div className="payment-rule-line"><span>Selected: <b>{payment}</b></span><span>{paymentTypes.find(x=>x.name===payment)?.changeAllowed?'Change allowed':'No change'}</span></div><div className="change-display"><span>Change:</span><b>{money(Math.max(0,Number(paidAmount||0)-grand))}</b></div><div className="payment-items-preview" style={{display:settings.order.showItemsOnPayment===false?"none":undefined}}>{cart.map(i=><div key={i.id}><span>{i.qty} × {i.name}</span><b>{money(i.price*i.qty)}</b></div>)}</div><button className="payment-complete ar-green" onClick={finishPayment}>OK / Complete payment</button></main><div className="payment-numpad">{['1','2','3','⌫','4','5','6','C','7','8','9','↵','-','0','.',''].map((k,i)=><button key={i} onClick={()=>{if(!k)return;if(k==='C')setPaidAmount(0);else if(k==='⌫')setPaidAmount(String(paidAmount).slice(0,-1));else if(k==='↵')finishPayment();else setPaidAmount(String(paidAmount||'')+k)}}>{k}</button>)}</div></div></div>}
  {splitScreen&&<div className="ar-modal-backdrop"><div className="ar-modal split-payment-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>SPLIT PAYMENTS</small><h3>{money(grand)}</h3></div><button onClick={()=>setSplitScreen(false)}>×</button></div><div className="split-list">{splitPayments.map((x,i)=><div key={i}><span>{x.payment}</span><b>{money(x.amount)}</b></div>)}{!splitPayments.length&&<Empty text="No split payments added yet."/>}</div><div className="split-form"><select value={splitType} onChange={e=>setSplitType(e.target.value)}>{enabledPayments.map(x=><option key={x.id}>{x.name}</option>)}</select><input type="number" min="0" step="0.01" value={splitAmount} onChange={e=>setSplitAmount(e.target.value)}/><button onClick={addSplit}>Add payment</button></div><div className="payment-summary"><span>Paid <b>{money(totalPaid)}</b></span><span>Remaining <b>{money(paymentRemaining)}</b></span></div><div className="modal-actions"><button className="secondary" onClick={()=>setSplitScreen(false)}>Done</button></div></div></div>}
  {ageGateProduct&&<div className="ar-modal-backdrop"><div className="ar-modal pos-integration-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>AGE RESTRICTION</small><h3>Age verification</h3></div><button type="button" onClick={()=>setAgeGateProduct(null)}>×</button></div><p>This product requires age restriction <b>{ageGateProduct.product.ageRestriction}</b>. Confirm the customer meets the required age before adding the item.</p><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setAgeGateProduct(null)}>Cancel</button><button type="button" onClick={()=>{const x=ageGateProduct;setAgeGateProduct(null);if(priceChangeAllowedFor(x.product)){setPendingPriceProduct(x.product);setPendingPriceQuantity(x.qty);setPriceValue(String(Number(x.product.price||0)));setPriceScreen(true)}else{const ok=add(x.product,x.qty);if(ok){setNextQuantity(1);setSelectedLineId(x.product.id)}}}}>Confirm & Add</button></div></div></div>}
  {orderNameScreen&&<div className="ar-modal-backdrop"><div className="ar-modal pos-integration-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>OPEN SALE</small><h3>Order name</h3></div><button type="button" onClick={()=>setOrderNameScreen(false)}>×</button></div><label>Order name<input autoFocus value={orderNameValue} onChange={e=>setOrderNameValue(e.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setOrderNameScreen(false)}>Cancel</button><button type="button" onClick={()=>{const name=orderNameValue.trim();if(settings.order.orderNameRequired&&!name){setNoticeLocal('Order name is required.');return}const meta=syncOrderMeta({name});setOrderNameScreen(false);if(orderNameSaveMode)saveOpenOrder(meta)}}>{orderNameSaveMode?'Save sale':'Apply'}</button></div></div></div>}
  {commentScreen&&<div className="ar-modal-backdrop"><div className="ar-modal pos-integration-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>COMMENT</small><h3>Add comment</h3></div><button type="button" onClick={()=>setCommentScreen(false)}>×</button></div><label>Comment<textarea autoFocus rows="5" value={commentValue} onChange={e=>setCommentValue(e.target.value)} placeholder="Write comment here..."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setCommentScreen(false)}>Cancel</button><button type="button" onClick={()=>{syncOrderMeta({comment:commentValue});const key=selectedLineId;if(key)setCart(c=>c.map(x=>(x.lineId||x.id)===key?{...x,comment:commentValue}:x));setCommentScreen(false)}}>Apply comment</button></div></div></div>}
  {serviceTypeScreen&&<div className="ar-modal-backdrop"><div className="ar-modal pos-integration-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>ORDER</small><h3>Service type</h3></div><button type="button" onClick={()=>setServiceTypeScreen(false)}>×</button></div><select autoFocus value={serviceTypeValue} onChange={e=>setServiceTypeValue(e.target.value)}><option>Dine In</option><option>Takeaway</option><option>Delivery</option><option>Pickup</option><option>Installation</option><option>Service</option></select>{settings.order.floorPlans&&<button type="button" className="secondary" onClick={()=>{setTableScreen(true);setServiceTypeScreen(false)}}>Select table {tableValue?"(Table "+tableValue+")":""}</button>}<div className="modal-actions"><button type="button" className="secondary" onClick={()=>setServiceTypeScreen(false)}>Cancel</button><button type="button" onClick={()=>{syncOrderMeta({serviceType:serviceTypeValue});setServiceTypeScreen(false)}}>Apply</button></div></div></div>}
  {settings.order.floorPlans&&tableScreen&&<div className="ar-modal-backdrop"><div className="ar-modal pos-integration-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>FLOOR PLAN</small><h3>Select table</h3></div><button type="button" onClick={()=>setTableScreen(false)}>×</button></div><div className="table-picker-grid">{Array.from({length:12},(_,i)=>String(i+1)).map(t=>{const occupied=occupiedTables?.has?.(t);return <button type="button" className={(tableValue===t?'chosen ':'')+(occupied?'occupied':'')} key={t} onClick={()=>setTableValue(t)}>Table {t}{occupied?<small style={{display:"block",fontSize:10,opacity:.75}}>Occupied</small>:null}</button>})}</div>{settings.order.showAllOccupiedTables&&occupiedTables?.size?<small style={{display:"block",marginTop:8,opacity:.7}}>Occupied tables: {[...occupiedTables].join(", ")}</small>:null}<div className="modal-actions"><button type="button" className="secondary" onClick={()=>setTableScreen(false)}>Cancel</button><button type="button" onClick={()=>{syncOrderMeta({table:tableValue});setTableScreen(false)}}>Apply</button></div></div></div>}
  {savedScreen&&<div className="ar-modal-backdrop"><div className="ar-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>OPEN SALES</small><h3>Saved sales</h3></div><button onClick={()=>setSavedScreen(false)}>×</button></div>{orders.length?<div className="transfer-items">{orders.slice().reverse().map(o=><button key={o.id} onClick={()=>{setSavedScreen(false);retrieveOpenOrder?.(o.id)}}><span>{o.name}</span><b>{o.items?.length||0} item(s)</b></button>)}</div>:<Empty text="No saved sales."/>}</div></div>}
  {priceScreen&&<div className="ar-modal-backdrop price-keypad-backdrop" onMouseDown={()=>{setPriceScreen(false);setPendingPriceProduct(null);setPendingPriceQuantity(1)}}><div className="ar-modal price-keypad-modal" onMouseDown={e=>e.stopPropagation()}><div className="price-keypad-head"><div><small>POS / PRICE</small><h3>Change price</h3>{(()=>{const i=pendingPriceProduct||cart.find(x=>(x.lineId||x.id)===selectedLineId||x.productId===selectedLineId);return i?<p>Product <b>"{i.name}"</b><br/><span>Price: {money(i.originalPrice??i.price)}</span></p>:null})()}</div><button type="button" aria-label="Close" onClick={()=>{setPriceScreen(false);setPendingPriceProduct(null);setPendingPriceQuantity(1)}}>×</button></div><div className="price-keypad-display"><input autoFocus aria-label="New price" type="text" inputMode="decimal" value={priceValue} onChange={e=>setPriceValue(e.target.value.replace(/[^0-9.\-]/g,""))} onKeyDown={e=>{if(e.key==="Enter")applyPrice();if(e.key==="Escape"){setPriceScreen(false);setPendingPriceProduct(null);setPendingPriceQuantity(1)}}}/><span>RM</span></div><div className="price-keypad-grid">{['1','2','3','⌫','4','5','6','Esc','7','8','9','Enter','−','0','.'].map((k,i)=><button key={i} type="button" className={k==='Enter'?'enter-key':k==='Esc'?'esc-key':k==='⌫'?'backspace-key':k==='−'?'minus-key':''} onClick={()=>{if(!k)return;if(k==='Enter'){applyPrice();return}if(k==='Esc'){setPriceScreen(false);return}if(k==='⌫'){setPriceValue(v=>String(v).slice(0,-1));return}if(k==='−'){setPriceValue(v=>v.startsWith('-')?v.slice(1):'-'+v);return}setPriceValue(v=>String(v||'')+k)}}>{k}</button>)}</div><div className="price-keypad-footer"><button type="button" className="secondary" onClick={()=>{setPriceScreen(false);setPendingPriceProduct(null);setPendingPriceQuantity(1)}}>Cancel</button><button type="button" onClick={applyPrice}>Apply price</button></div></div></div>}
  {quantityScreen&&<div className="ar-modal-backdrop quantity-modal-backdrop" onMouseDown={()=>setQuantityScreen(false)}><div className="ar-modal quantity-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head quantity-modal-head"><div><h3>Change quantity</h3></div><button type="button" onClick={()=>setQuantityScreen(false)}>×</button></div><div className="quantity-modal-body"><label>Quantity<input autoFocus type="number" min="1" step="1" value={quantityValue} onChange={e=>setQuantityValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){const n=Number(quantityValue);if(n>0){const i=cart.find(x=>(x.lineId||x.id)===selectedLineId||x.productId===selectedLineId);if(i){changeQty(i.lineId||i.id,n-i.qty)}else{setNextQuantity(n)}setQuantityScreen(false)}}if(e.key==="Escape")setQuantityScreen(false)}} /></label></div><div className="modal-actions quantity-modal-actions"><button type="button" className="secondary" onClick={()=>setQuantityScreen(false)}>Cancel</button><button type="button" onClick={()=>{const n=Number(quantityValue);if(n>0){const i=cart.find(x=>(x.lineId||x.id)===selectedLineId||x.productId===selectedLineId);if(i){changeQty(i.lineId||i.id,n-i.qty)}else{setNextQuantity(n)}setQuantityScreen(false)}}}>OK</button></div></div></div>}
  {noticeLocal&&<div className="ar-local-notice" onClick={()=>setNoticeLocal("")}>{noticeLocal}</div>}
  {roundNotice&&<div className="ar-round-notice" role="alert"><span className="ar-round-notice-icon">i</span><span>No items on order.<br/>Repeat round can be done only if the round exists.</span><button aria-label="Close" onClick={()=>setRoundNotice(false)}>×</button></div>}
  {lastSale&&<div className="receipt-modal-backdrop"><div className="receipt-modal receipt-choice-modal"><div className="receipt-change"><span>💵 Change:</span><b>{money(lastSale.change||0)}</b></div><h2>How would the customer like their receipt?</h2><div className="receipt-choice-grid">{lastSale.receiptAllowed!==false&&<button onClick={()=>printReceipt(lastSale)}>▤<span>Print receipt</span></button>}<button onClick={()=>printInvoice(lastSale,company,customers,settings)}>▣<span>Print invoice</span></button><button onClick={()=>emailReceipt(lastSale)}>✉<span>Send email</span></button><button onClick={()=>printInvoice(lastSale,company,customers,settings)}>⌁<span>Save as PDF</span></button><button onClick={()=>setNoteBox({sale:lastSale,note:lastSale.note||"",internalNote:lastSale.internalNote||""})}>✎<span>Add notes</span></button></div><div className="receipt-done-row"><button onClick={closeLastSale}>Done</button></div></div></div>}
 </section>
}
const BARCODE_TYPES=["EAN8","EAN13","UPC A","UPC E0","UPC E1","CODE 39","CODE 128","CODE 93","Interleaved 2 of 5 (ITF)","CODABAR"];
const CODE128B_PATTERNS=["11011001100","11001101100","11001100110","10010011000","10010001100","10001001100","10011001000","10011000100","10001100100","11001001000","11001000100","11000100100","10110011100","10011011100","10011001110","10111001100","10011101100","10011100110","11001110010","11001011100","11001001110","11011100100","11001110100","11101101110","11101001100","11100101100","11100100110","11101100100","11100110100","11100110010","11011011000","11011000110","11000110110","10100011000","10001011000","10001000110","10110001000","10001101000","10001100010","11010001000","11000101000","11000100010","10110111000","10110001110","10001101110","10111011000","10111000110","10001110110","11101110110","11010001110","11000101110","11011101000","11011100010","11011101110","11101011000","11101000110","11100010110","11101101000","11101100010","11100011010","11101111010","11001000010","11110001010","10110000100","10110010000","10011010000","10011000010","10000110010","11000010010","11001010000","11110111010","11000010100","10001111010","10100111100","10000111100","10000101110","11101011100","11101001110","11100101110","11101110100","11101110010","11101011010","11111011010","11110101110","11110100110","11110100010","11011011110","11011001110","11011110110","11110110110","10101111000","10100011110","10001011110","10111101000","10111100010","11110101000","11110100010","11110110010","11111010100","11111010010","11111011010","11001000010","11111001010","11111000100","11110000100","11110010000","11110001000","11100010100","11100010010","11101111010","11001000010","11110011010","11110000110","11110001110","11101000010","11101001000","11101000100","11100010110","11100010010","11101101010","11101100110","11100110110","11100110010","11101101110","11100101110","11101110110","11101111010","11101111010","11001000010"];
const EAN_L=["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const EAN_G=["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
const EAN_R=["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
const EAN_PARITY=["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];
const CODE39={"0":"101001101101","1":"110100101011","2":"101100101011","3":"110110010101","4":"101001101011","5":"110100110101","6":"101100110101","7":"101001011011","8":"110100101101","9":"101100101101","A":"110101001011","B":"101101001011","C":"110110100101","D":"101011001011","E":"110101100101","F":"101101100101","G":"101010011011","H":"110101001101","I":"101101001101","J":"101011001101","K":"110101010011","L":"101101010011","M":"110110101001","N":"101011010011","O":"110101101001","P":"101101101001","Q":"101010110011","R":"110101011001","S":"101101011001","T":"101011011001","U":"110010101011","V":"100110101011","W":"110011010101","X":"100101101011","Y":"110010110101","Z":"100110110101","-":"100101011011",".":"110010101101"," ":"100110101101","$":"100100100101","/":"100100101001","+":"100101001001","%":"101001001001","*":"100101101101"};
function checksumEAN13(v){const d=String(v).replace(/\D/g,"").slice(0,12).padStart(12,"0");let sum=0;for(let i=0;i<12;i++)sum+=Number(d[i])*(i%2?3:1);return d+((10-(sum%10))%10)}
function checksumEAN8(v){const d=String(v).replace(/\D/g,"").slice(0,7).padStart(7,"0");let sum=0;for(let i=0;i<7;i++)sum+=Number(d[i])*(i%2?1:3);return d+((10-(sum%10))%10)}
function code128Pattern(text){let t=String(text||"").replace(/[^\x20-\x7E]/g,"");if(!t)t="0";const vals=[104,...[...t].map(ch=>ch.charCodeAt(0)-32)];let sum=104;for(let i=1;i<vals.length;i++)sum+=vals[i]*i;vals.push(sum%103,106);return vals.map(v=>CODE128B_PATTERNS[v]||CODE128B_PATTERNS[0]).join("")}
function eanPattern(value,type){if(type==="EAN8"){const d=checksumEAN8(value);return "101"+d.slice(0,4).split("").map(x=>EAN_L[Number(x)]).join("")+"01010"+d.slice(4).split("").map(x=>EAN_R[Number(x)]).join("")+"101"}const d=checksumEAN13(value),p=EAN_PARITY[Number(d[0])];return "101"+d.slice(1,7).split("").map((x,i)=>p[i]==="L"?EAN_L[Number(x)]:EAN_G[Number(x)]).join("")+"01010"+d.slice(7).split("").map(x=>EAN_R[Number(x)]).join("")+"101"}
function code39Pattern(text){const t="*"+String(text||"").toUpperCase().replace(/[^0-9A-Z. $/+\-%-]/g,"-")+"*";return [...t].map(ch=>CODE39[ch]||CODE39["-"]).join("0")}
function itfPattern(text){let d=String(text||"").replace(/\D/g,"");if(d.length%2)d="0"+d;const map=["nnwwn","wnnnw","nwnnw","wwnnn","nnwnw","wnwnn","nwwnn","nnnww","wnnwn","nwnwn"];let out="1010";for(let i=0;i<d.length;i+=2){const a=map[Number(d[i])],b=map[Number(d[i+1])];for(let j=0;j<5;j++){const wa=a[j]==="w"?3:1,wb=b[j]==="w"?3:1;out+=("1".repeat(wa)+"0".repeat(wb))}}return out+"11101"}
function barcodeBits(value,type){if(type==="EAN13"||type==="EAN8")return eanPattern(value,type);if(type==="CODE 39")return code39Pattern(value);if(type==="Interleaved 2 of 5 (ITF)")return itfPattern(value);if(type==="UPC A"){const d=String(value||"").replace(/\D/g,"").slice(-12).padStart(12,"0");return eanPattern("0"+d,"EAN13")}return code128Pattern(value)}
function BarcodeGraphic({value,type,height=60}){
 const h=Math.max(8,Number(height)||20);
 const label=barcodeTextForPreview(value,type);
 const typeLabel=String(type||"BARCODE");
 const common={className:"pt-barcode-svg",style:{width:"42mm",height:`${h}mm`,"--pt-barcode-h":`${h}mm`},preserveAspectRatio:"none",role:"img","aria-label":`${typeLabel} ${label}`};
 const human=<div className="pt-barcode-human" style={{fontFamily:"Arial,Helvetica,sans-serif",fontWeight:400,marginTop:"1px",lineHeight:1}}>{label}</div>;
 if(type==="EAN13"||type==="EAN8"){
  const d=type==="EAN13"?checksumEAN13(value):checksumEAN8(value),bits=eanPattern(d,type),w=type==="EAN13"?95:67,barW=w/bits.length;
  return <div className="pt-barcode-stack">
   <svg {...common} viewBox={`0 0 ${w} 100`} aria-label={`${typeLabel} ${d}`}>
    {[...bits].map((b,i)=>b==="1"?<rect key={i} x={i*barW} y="0" width={barW+0.01} height="84" fill="#000"/>:null)}
   </svg>
   {human}
  </div>;
 }
 const bits=barcodeBits(value,type)||"";
 return <div className="pt-barcode-stack">
  <svg {...common} viewBox={`0 0 ${Math.max(bits.length,1)} 100`} aria-label={`${typeLabel} ${label}`}>
   {[...bits].map((b,i)=>b==="1"?<rect key={i} x={i} y="0" width="1" height="82" fill="#000"/>:null)}
  </svg>
  {human}
 </div>;
}

const barcodeTextForPreview=(value,type)=>{
 const raw=String(value||"").replace(/\D/g,"");
 if(type==="EAN13") return checksumEAN13(value);
 if(type==="EAN8") return checksumEAN8(value);
 if(type==="UPC A") return raw.slice(-12).padStart(12,"0");
 if(type==="UPC E0"||type==="UPC E1") return raw.slice(-6).padStart(6,"0");
 return String(value||"");
};
const PRICE_TAGS_STORAGE_KEY="sp-manager-pos-price-tags-settings-v23-sp-manager-original-roll-controls";
const loadPriceTagSetting=(key,fallback)=>{try{const raw=localStorage.getItem(PRICE_TAGS_STORAGE_KEY);if(!raw)return fallback;const saved=JSON.parse(raw);return Object.prototype.hasOwnProperty.call(saved,key)?saved[key]:fallback}catch(_){return fallback}};

function PriceTagsModal({products,groups,money,onClose,setNotice,settings}){
 const [paper,setPaper]=useState(()=>loadPriceTagSetting("paper","A4")),[roll,setRoll]=useState(()=>loadPriceTagSetting("roll",true)),[pageW,setPageW]=useState(()=>Math.max(1,Number(loadPriceTagSetting("pageW",210))||210)),[pageH,setPageH]=useState(()=>Math.max(1,Number(loadPriceTagSetting("pageH",297))||297)),[margins,setMargins]=useState(()=>loadPriceTagSetting("margins",{top:0,left:0,right:0,bottom:0})),[columns,setColumns]=useState(()=>Math.max(1,Number(loadPriceTagSetting("columns",2))||2)),[labelW,setLabelW]=useState(()=>Math.max(1,Number(loadPriceTagSetting("labelW",50))||50)),[labelH,setLabelH]=useState(()=>Math.max(1,Number(loadPriceTagSetting("labelH",35))||35)),[rowGap,setRowGap]=useState(()=>loadPriceTagSetting("rowGap",0)),[colGap,setColGap]=useState(()=>loadPriceTagSetting("colGap",0));
 const [showName,setShowName]=useState(()=>loadPriceTagSetting("showName",true)),[showPrice,setShowPrice]=useState(()=>loadPriceTagSetting("showPrice",true)),[showCode,setShowCode]=useState(()=>loadPriceTagSetting("showCode",true)),[showBarcode,setShowBarcode]=useState(()=>loadPriceTagSetting("showBarcode",true)),[taxInclusive,setTaxInclusive]=useState(()=>loadPriceTagSetting("taxInclusive",true)),[borders,setBorders]=useState(()=>loadPriceTagSetting("borders",true)),[barcodeType,setBarcodeType]=useState(()=>loadPriceTagSetting("barcodeType","EAN13")),[nameSize,setNameSize]=useState(()=>Math.max(6,Number(loadPriceTagSetting("nameSize",16))||16)),[priceSize,setPriceSize]=useState(()=>Math.max(6,Number(loadPriceTagSetting("priceSize",16))||16)),[barcodeHeight,setBarcodeHeight]=useState(()=>{const v=Number(loadPriceTagSetting("barcodeHeight",40));return Math.max(10,Math.min(80,v||40))}),[query,setQuery]=useState(()=>loadPriceTagSetting("query","")),[group,setGroup]=useState(()=>loadPriceTagSetting("group","All groups")),[selected,setSelected]=useState(()=>loadPriceTagSetting("selected",[])),[copies,setCopies]=useState(()=>loadPriceTagSetting("copies",1)),[printerLanguage,setPrinterLanguage]=useState(()=>loadPriceTagSetting("printerLanguage","TSPL")),[productMode,setProductMode]=useState(()=>loadPriceTagSetting("productMode","all")),[previewZoom,setPreviewZoom]=useState(1),[previewPage,setPreviewPage]=useState(1);
 useEffect(()=>{try{localStorage.setItem(PRICE_TAGS_STORAGE_KEY,JSON.stringify({paper,roll,pageW,pageH,margins,columns,labelW,labelH,rowGap,colGap,showName,showPrice,showCode,showBarcode,taxInclusive,borders,barcodeType,nameSize,priceSize,barcodeHeight,query,group,selected,copies,printerLanguage,productMode}))}catch(_){ }},[paper,roll,pageW,pageH,margins,columns,labelW,labelH,rowGap,colGap,showName,showPrice,showCode,showBarcode,taxInclusive,borders,barcodeType,nameSize,priceSize,barcodeHeight,query,group,selected,copies,printerLanguage,productMode]);
 const candidates=useMemo(()=>products.filter(p=>{const q=String(query||"").trim().toLowerCase();const name=String(p.name||"").toLowerCase();const code=String(p.code||"").toLowerCase();const barcodes=[p.barcode,...(Array.isArray(p.barcodes)?p.barcodes:[])].filter(Boolean).map(String).join(" ").toLowerCase();const g=group==="All groups"||(p.group||p.category)===group;if(productMode==="selected"&&!selected.includes(p.id))return false;if(q){if(productMode==="barcode"&&!barcodes.includes(q))return false;if(productMode==="code"&&!code.includes(q))return false;if((productMode==="all"||productMode==="selected")&&!name.includes(q))return false}return g}),[products,query,group,productMode,selected]);
const productModeLabel=productMode==="barcode"?"Barcode search":productMode==="code"?"Code search":productMode==="selected"?"Selected products":"All products";
 const productSearchPlaceholder=productMode==="barcode"?"Scan / enter barcode":productMode==="code"?"Enter product code":productMode==="selected"?"Search selected products":"Product name";
 const setProductModeAndQuery=(mode)=>{setProductMode(mode);setQuery("");if(mode==="all")setSelected([])};
 const toggleProduct=(id)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
 const selectedProducts=selected.length?products.filter(p=>selected.includes(p.id)):candidates;
 const labels=selectedProducts.flatMap(p=>Array.from({length:Math.max(1,Number(copies)||1)},()=>p));
 const previewBarcodeHeight=Math.max(10,Number(barcodeHeight)||40);
 const effectiveLabelH=showBarcode?Math.max(Number(labelH)||35,previewBarcodeHeight+18):Math.max(1,Number(labelH)||35);
 const totalLabels=labels.length; const pageCols=roll?1:Math.max(1,Number(columns)||1);
 const availableH=Math.max(1,Number(pageH)-Number(margins.top)-Number(margins.bottom));
 const rowsPerPage=roll?Math.max(1,totalLabels):Math.max(1,Math.floor((availableH+Number(rowGap))/(Math.max(1,effectiveLabelH)+Number(rowGap))));
 const perPage=Math.max(1,rowsPerPage*pageCols); const pages=roll?1:Math.max(1,Math.ceil(totalLabels/perPage));
 useEffect(()=>{setPreviewPage(p=>Math.min(Math.max(1,p),pages))},[pages]);
 const escapeHtml=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
 const barcodeValue=p=>String(p?.barcode||p?.barcodes?.[0]||p?.code||"000000");
 const barcodeText=(value,type)=>type==="EAN13"?checksumEAN13(value):type==="EAN8"?checksumEAN8(value):type==="UPC A"?String(value||"").replace(/\D/g,"").slice(-12).padStart(12,"0"):String(value||"");
 const zplEsc=v=>String(v??"").replace(/[\^~\\]/g," ").replace(/\r?\n/g," ");
 const tsplEsc=v=>String(v??"").replace(/"/g,"'").replace(/\r?\n/g," ");
 const mmToDots=mm=>Math.max(1,Math.round(Number(mm||0)*8));
 const printerBarcodeData=(value,type)=>{const raw=String(value||"");if(type==="EAN13")return raw.replace(/\D/g,"").slice(0,12).padStart(12,"0");if(type==="EAN8")return raw.replace(/\D/g,"").slice(0,7).padStart(7,"0");if(type==="UPC A")return raw.replace(/\D/g,"").slice(-11).padStart(11,"0");return raw};
 const barcodeCommand=(lang,value,type,x,y,wMm,hMm)=>{
   const h=Math.max(10,mmToDots(hMm));
   const width=Math.max(1,Math.round(mmToDots(wMm)/95));
   const data=printerBarcodeData(value,type);
   if(lang==="ZPL"){
     if(type==="EAN13")return `^FO${x},${y}^BY${width},2,${h}^BE${width},${h},Y,N^FD${data}^FS`;
     if(type==="EAN8")return `^FO${x},${y}^BY${width},2,${h}^B8${width},${h},Y,N^FD${data}^FS`;
     if(type==="UPC A")return `^FO${x},${y}^BY${width},2,${h}^BU${width},${h},Y,N^FD${data}^FS`;
     if(type==="UPC E0"||type==="UPC E1")return `^FO${x},${y}^BY${width},2,${h}^B9${width},${h},Y,N^FD${data}^FS`;
     if(type==="CODE 39")return `^FO${x},${y}^BY${width},2,${h}^B3N,N,${h},N,N^FD${zplEsc(data)}^FS`;
     if(type==="CODE 93")return `^FO${x},${y}^BY${width},2,${h}^BAN,N,${h},N,N^FD${zplEsc(data)}^FS`;
     if(type==="Interleaved 2 of 5 (ITF)")return `^FO${x},${y}^BY${width},2,${h}^B2N,${h},N,N^FD${String(data).replace(/\D/g,"")}^FS`;
     if(type==="CODABAR")return `^FO${x},${y}^BY${width},2,${h}^BKN,${h},N,N^FD${zplEsc(data)}^FS`;
     return `^FO${x},${y}^BY${width},2,${h}^BCN,${h},Y,N,N^FD${zplEsc(data)}^FS`;
   }
   const barType=type==="EAN13"?"EAN13":type==="EAN8"?"EAN8":type==="UPC A"?"UPCA":(type==="UPC E0"||type==="UPC E1")?"UPCE":type==="CODE 39"?"39":type==="CODE 93"?"93":type==="Interleaved 2 of 5 (ITF)"?"25":"CODA";
   return `BARCODE ${x},${y},"${barType}",${h},1,0,2,4,"${tsplEsc(data)}"`;
 };
 const buildRaw=(lang)=>{
   const paperWidth=Math.max(1,Number(pageW)||210), paperHeight=Math.max(1,Number(pageH)||297);
   const lw=Math.max(1,Number(labelW)||50), lh=Math.max(1,Number(labelH)||35);
   const leftM=Math.max(0,Number(margins.left)||0), rightM=Math.max(0,Number(margins.right)||0), topM=Math.max(0,Number(margins.top)||0), bottomM=Math.max(0,Number(margins.bottom)||0);
   const cols=roll?1:Math.max(1,Number(columns)||1), rg=roll?0:Math.max(0,Number(rowGap)||0), cg=roll?0:Math.max(0,Number(colGap)||0);
   const contentW=Math.max(1,paperWidth-leftM-rightM);
   const rollH=Math.max(1,topM+bottomM+(labels.length?labels.length*lh+Math.max(0,labels.length-1)*rg:lh));
   const chunks=roll?[labels]:Array.from({length:pages},(_,pi)=>labels.slice(pi*perPage,(pi+1)*perPage));
   const out=[];
   chunks.forEach(chunk=>{
     const sheetH=roll?rollH:paperHeight;
     if(lang==="ZPL") out.push(`^XA^PW${mmToDots(paperWidth)}^LL${mmToDots(sheetH)}^LH0,0`);
     else out.push(`SIZE ${paperWidth.toFixed(2)} mm,${sheetH.toFixed(2)} mm\nGAP 0 mm,0\nCLS`);
     chunk.forEach((p,idx)=>{
       const col=roll?0:(idx%cols), row=roll?idx:Math.floor(idx/cols);
       const cellX=roll?leftM+(contentW-lw)/2:leftM+col*(lw+cg);
       const cellY=roll?topM+row*(lh+rg):topM+row*(lh+rg);
       const baseX=mmToDots(cellX), baseY=mmToDots(cellY), labelWidthDots=mmToDots(lw);
       const xName=mmToDots(5), nameY=0, priceY=mmToDots(7.5), effectiveBarcodeHeight=Math.max(10,Math.min(Number(barcodeHeight)||60,Math.max(10,lh-10))), barcodeY=Math.max(mmToDots(12.5),mmToDots(lh)-mmToDots(effectiveBarcodeHeight)-mmToDots(4)), barcodeW=Math.min(44,Math.max(20,lw-6));
       if(borders&&lang==="ZPL")out.push(`^FO${baseX},${baseY}^GB${mmToDots(lw)},${mmToDots(lh)},2^FS`);
       if(borders&&lang==="TSPL")out.push(`BOX ${baseX},${baseY},${baseX+mmToDots(lw)},${baseY+mmToDots(lh)},2`);
       const value=barcodeValue(p); const name=String(p?.name||""); const price=money(p?.price||0);
       const centeredBarcodeX=Math.max(0,Math.round((labelWidthDots-mmToDots(barcodeW))/2));
       if(lang==="ZPL"){
         if(showName)out.push(`^FO${baseX+mmToDots(xName)},${baseY+mmToDots(nameY)}^A0N,${Math.max(10,Number(nameSize)*8)},${Math.max(10,Number(nameSize)*8)}^FB${Math.max(1,labelWidthDots-mmToDots(xName)*2)},1,0,C,0^FD${zplEsc(name)}^FS`);
         if(showPrice)out.push(`^FO${baseX+mmToDots(xName)},${baseY+mmToDots(priceY)}^A0N,${Math.max(10,Number(priceSize)*8)},${Math.max(10,Number(priceSize)*8)}^FB${Math.max(1,labelWidthDots-mmToDots(xName)*2)},1,0,C,0^FD${zplEsc(price)}^FS`);
         if(showBarcode)out.push(barcodeCommand(lang,value,barcodeType,baseX+centeredBarcodeX,baseY+mmToDots(barcodeY),barcodeW,effectiveBarcodeHeight));
         if(showCode)out.push(`^FO${baseX+Math.max(0,Math.round((labelWidthDots-mmToDots(30))/2))},${baseY+Math.min(mmToDots(lh)-20,mmToDots(barcodeY)+mmToDots(barcodeHeight)+8)}^A0N,64,64^FB${mmToDots(30)},1,0,C,0^FD${zplEsc(p?.code||"")}^FS`);
       }else{
         if(showName)out.push(`TEXT ${baseX+mmToDots(xName)},${baseY+mmToDots(nameY)},"3",0,${Math.max(1,Math.round(Number(nameSize)/10))},${Math.max(1,Math.round(Number(nameSize)/10))},2,"${tsplEsc(name)}"`);
         if(showPrice)out.push(`TEXT ${baseX+mmToDots(xName)},${baseY+mmToDots(priceY)},"3",0,${Math.max(1,Math.round(Number(priceSize)/10))},${Math.max(1,Math.round(Number(priceSize)/10))},2,"${tsplEsc(price)}"`);
         if(showBarcode){
           const bx=baseX+centeredBarcodeX, by=baseY+mmToDots(barcodeY);
           out.push(barcodeCommand(lang,value,barcodeType,bx,by,barcodeW,barcodeHeight));
           const human=barcodeText(value,barcodeType), textW=mmToDots(Math.min(lw-4,44));
           out.push(`^FO${baseX+Math.max(0,Math.round((labelWidthDots-textW)/2))},${by+mmToDots(barcodeHeight)+2}^A0N,22,22^FB${textW},1,0,C,0^FD${zplEsc(human)}^FS`);
         }
         if(showCode)out.push(`TEXT ${baseX+Math.max(0,Math.round((labelWidthDots-mmToDots(30))/2))},${baseY+Math.min(mmToDots(lh)-20,mmToDots(barcodeY)+mmToDots(barcodeHeight)+8)},"3",0,1,1,2,"${tsplEsc(p?.code||"")}"`);
       }
     });
     if(lang==="ZPL") out.push(`^XZ`); else out.push(`PRINT 1,1`);
   });
   return out.join("\n")+"\n";
 };
 const reportCss=`@page{size:${pageW}mm ${roll?Math.max(100,effectiveLabelH*totalLabels):pageH}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}.pt-page{display:grid;align-content:start;grid-template-columns:${roll?`${Math.max(1,pageW-margins.left-margins.right)}mm`:Array(pageCols).fill(`${labelW}mm`).join(" ")};grid-auto-rows:${effectiveLabelH}mm;column-gap:${colGap}mm;row-gap:${rowGap}mm;page-break-after:always;break-after:page;overflow:visible}.pt-label{position:relative;overflow:visible;background:#fff;color:#111;height:${effectiveLabelH}mm;width:${labelW}mm;font-family:Arial,Helvetica,sans-serif}.pt-code{position:absolute;left:1mm;top:0;width:4mm;height:100%;display:flex;align-items:flex-end;justify-content:center;transform:rotate(-90deg);font:8pt Arial,sans-serif}.pt-name{position:absolute;left:0;right:0;top:0;height:7.5mm;text-align:center;padding:1mm 1mm;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;font-weight:400;line-height:1.05;overflow:hidden}.pt-price{position:absolute;left:0;right:0;top:7.5mm;height:6mm;text-align:center;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;font-weight:400;line-height:1}.pt-barcode{position:absolute;left:0;right:0;top:14mm;width:100%;display:flex;justify-content:center;align-items:flex-start;margin:0;padding:0;overflow:visible}.pt-barcode-stack{width:42mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;font-family:Arial,Helvetica,sans-serif;font-weight:400;line-height:1;overflow:visible}.pt-barcode-stack svg{display:block;width:42mm;height:${previewBarcodeHeight}mm;margin:0;overflow:visible}.pt-barcode-human{display:block;width:100%;margin-top:1px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:11px;font-weight:400;color:#111;white-space:nowrap;overflow:visible}.pt-empty{padding:20mm;text-align:center}`;
 const barcodeSvgMarkup=(value,type,height)=>{const h=Math.max(10,Number(height)||20);const label=escapeHtml(barcodeText(value,type));if(type==="EAN13"||type==="EAN8"){const d=type==="EAN13"?checksumEAN13(value):checksumEAN8(value),bits=eanPattern(d,type),w=type==="EAN13"?95:67,bw=w/bits.length;const bars=[...bits].map((b,i)=>b==="1"?`<rect x="${(i*bw).toFixed(3)}" y="0" width="${(bw+.01).toFixed(3)}" height="84"/>`:"").join("");return `<div class="pt-barcode-stack"><svg viewBox="0 0 ${w} 100" preserveAspectRatio="none" style="width:42mm;height:${h}mm"><g fill="#000">${bars}</g></svg><div class="pt-barcode-human">${label}</div></div>`}const bits=barcodeBits(value,type)||"";const bars=bits.split("").map((b,i)=>b==="1"?`<rect x="${i}" y="0" width="1" height="82"/>`:"").join("");return `<div class="pt-barcode-stack"><svg viewBox="0 0 ${Math.max(bits.length,1)} 100" preserveAspectRatio="none" style="width:42mm;height:${h}mm"><g fill="#000">${bars}</g></svg><div class="pt-barcode-human">${label}</div></div>`};
 const labelHtml=p=>{if(!p)return `<div class="pt-label"><div class="pt-empty">No products selected</div></div>`;const value=barcodeValue(p);return `<div class="pt-label" style="${borders?"border:1px solid #111;":""}">${showCode?`<div class="pt-code">SKU: ${escapeHtml(p.code||"")}</div>`:""}${showName?`<div class="pt-name" style="font-size:${nameSize}px">${escapeHtml(p.name)}</div>`:""}${showPrice?`<div class="pt-price" style="font-size:${priceSize}px">${escapeHtml(money(p.price))}</div>`:""}${showBarcode?`<div class="pt-barcode">${barcodeSvgMarkup(value,barcodeType,previewBarcodeHeight)}</div>`:""}</div>`};
 const labelReact=p=>{if(!p)return <div className="pt-label"><div className="pt-empty">No products selected</div></div>;const value=barcodeValue(p);return <div className="pt-label" style={borders?{border:"1px solid #888"}:{}}>{showCode&&<div className="pt-code">SKU: {p.code||""}</div>}{showName&&<div className="pt-name" style={{fontSize:`${nameSize}px`}}>{p.name}</div>}{showPrice&&<div className="pt-price" style={{fontSize:`${priceSize}px`}}>{money(p.price)}</div>}{showBarcode&&<div className="pt-barcode"><BarcodeGraphic value={value} type={barcodeType} height={previewBarcodeHeight}/></div>}</div>};
 const buildPrintDocument=()=>{const chunks=roll?[labels]:Array.from({length:pages},(_,pi)=>labels.slice(pi*perPage,(pi+1)*perPage));const pageSections=chunks.map(c=>`<section class="pt-page" style="width:${pageW}mm;height:${roll?Math.max(effectiveLabelH*totalLabels+Number(margins.top)+Number(margins.bottom)+Math.max(0,totalLabels-1)*Number(rowGap),100):pageH}mm;padding:${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;grid-template-columns:${roll?`${labelW}mm`:Array(pageCols).fill(`${labelW}mm`).join(" ")};grid-auto-rows:${effectiveLabelH}mm;column-gap:${colGap}mm;row-gap:${rowGap}mm;justify-content:center">${(c.length?c:[null]).map(labelHtml).join("")}</section>`).join("");return `<!doctype html><html><head><meta charset="utf-8"><title>Price Tags</title><style>${reportCss}</style></head><body>${pageSections}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script></body></html>`};
 const paperSizes={A4:[210,297],A5:[148,210],A6:[105,148],Letter:[215.9,279.4],Legal:[215.9,355.6],"4 x 6 in":[101.6,152.4]};
 const changePaper=value=>{setPaper(value);const size=paperSizes[value];if(size&&!roll){setPageW(size[0]);setPageH(size[1])}else if(size){setPageW(size[0]);setPageH(size[1])}};
 const toggleRoll=value=>{setRoll(value);if(value){setColumns(1);setRowGap(0);setColGap(0)}};
 const downloadRaw=lang=>{const text=buildRaw(lang);const blob=new Blob([text],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Price-Tags.${lang.toLowerCase()}`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);setNotice(`${lang} Price Tags generated successfully.`)};
 const printRaw=async()=>{const base=String(settings?.hardware?.agentUrl||"http://127.0.0.1:18765").replace(/\/$/,"");const printer=settings?.hardware?.printer||settings?.print?.printer||"";if(!printer){setNotice("Please select a printer in Settings first.");return}try{const r=await fetch(base+"/price-tags/raw",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({printer,language:printerLanguage,data:buildRaw(printerLanguage),copies:1})});if(!r.ok){const x=await r.json().catch(()=>({}));throw Error(x.error||`HTTP ${r.status}`)}setNotice(`${printerLanguage} Price Tags sent to printer successfully.`)}catch(e){setNotice(`Price Tags print failed: ${e.message}`)}};
 const previewPrint=()=>{const w=window.open("","_blank","width=1000,height=800");if(!w){setNotice("Please allow pop-ups to preview Price Tags.");return}w.document.open();w.document.write(buildPrintDocument());w.document.close()};
 return <div className="price-tags-overlay">
  <div className="price-tags-shell" onMouseDown={e=>e.stopPropagation()}>
   <div className="price-tags-titlebar">
    <button type="button" className="price-tags-back" onClick={onClose} aria-label="Back to Products"><span aria-hidden="true">←</span><span>Price tags</span></button>
    <button type="button" className="price-tags-close" onClick={onClose} aria-label="Close Price tags">×</button>
   </div>
   <div className="price-tags-body">
    <aside className="price-tags-settings SP-Manager reference-price-settings">
     <section className="pt-ar-section">
      <h3>Layout</h3>
      <label>Paper size<select value={paper} onChange={e=>changePaper(e.target.value)}><option>A4</option><option>A5</option><option>A6</option><option>Letter</option><option>Legal</option><option>4 x 6 in</option></select></label>
      <div className="pt-two pt-page-size"><label>Page width<input type="number" value={pageW} min="1" step="0.1" onChange={e=>setPageW(Math.max(1,Number(e.target.value)||1))}/></label><label className={roll?'pt-disabled':''}>Page height<input type="number" value={pageH} min="1" step="0.1" disabled={roll} onChange={e=>setPageH(Math.max(1,Number(e.target.value)||1))}/></label></div>
      <label className="pt-roll-toggle"><span>Print on roll paper (unlimited height)</span><button type="button" role="switch" aria-checked={roll} className={`pt-switch ${roll?'on':''}`} onClick={()=>toggleRoll(!roll)}><i/></button></label>
      <div className="pt-margins-block"><div className="pt-subtitle">Margins (in millimeters)</div><div className="pt-margin-grid">
       <label className="m-top">Top<input type="number" value={margins.top} min="0" step="0.1" onChange={e=>setMargins(m=>({...m,top:Number(e.target.value)||0}))}/></label>
       <label className="m-left">Left<input type="number" value={margins.left} min="0" step="0.1" onChange={e=>setMargins(m=>({...m,left:Number(e.target.value)||0}))}/></label>
       <span className="m-center"> </span>
       <label className="m-right">Right<input type="number" value={margins.right} min="0" step="0.1" onChange={e=>setMargins(m=>({...m,right:Number(e.target.value)||0}))}/></label>
       <label className="m-bottom">Bottom<input type="number" value={margins.bottom} min="0" step="0.1" onChange={e=>setMargins(m=>({...m,bottom:Number(e.target.value)||0}))}/></label>
      </div></div>
      <label className={`pt-slider-row ${roll?'pt-disabled':''}`}>Columns ({columns})<input className="pt-range" type="range" min="1" max="6" step="1" value={columns} disabled={roll} onChange={e=>setColumns(Number(e.target.value))}/></label>
      <div className="pt-two pt-label-size"><label className={roll?'pt-disabled':''}>Label width<input type="number" value={labelW} min="1" step="0.1" disabled={roll} onChange={e=>setLabelW(Math.max(1,Number(e.target.value)||1))}/></label><label>Label height<input type="number" value={labelH} min="1" step="0.1" onChange={e=>setLabelH(Math.max(1,Number(e.target.value)||1))}/></label></div>
      <div className="pt-two"><label className={roll?'pt-disabled':''}>Row spacing<input type="number" value={rowGap} min="0" step="0.1" disabled={roll} onChange={e=>setRowGap(Math.max(0,Number(e.target.value)||0))}/></label><label className={roll?'pt-disabled':''}>Column spacing<input type="number" value={colGap} min="0" step="0.1" disabled={roll} onChange={e=>setColGap(Math.max(0,Number(e.target.value)||0))}/></label></div>
     </section>
     <section className="pt-ar-section">
      <h3>Display</h3>
      <div className="pt-display-grid pt-display-ar">
       <label className="pt-check"><input type="checkbox" checked={showName} onChange={e=>setShowName(e.target.checked)}/><span>Product name</span></label>
       <label className="pt-check"><input type="checkbox" checked={showPrice} onChange={e=>setShowPrice(e.target.checked)}/><span>Price</span></label>
       <label className="pt-check"><input type="checkbox" checked={showCode} onChange={e=>setShowCode(e.target.checked)}/><span>Code (SKU)</span></label>
       <label className="pt-check"><input type="checkbox" checked={showBarcode} onChange={e=>setShowBarcode(e.target.checked)}/><span>Barcode</span></label>
       <label className="pt-check"><input type="checkbox" checked={taxInclusive} onChange={e=>setTaxInclusive(e.target.checked)}/><span>Tax inclusive price</span></label>
       <label className="pt-check"><input type="checkbox" checked={borders} onChange={e=>setBorders(e.target.checked)}/><span>Borders</span></label>
      </div>
      <label>Barcode type<select value={barcodeType} onChange={e=>setBarcodeType(e.target.value)}><option>EAN13</option><option>EAN8</option><option>UPC A</option><option>UPC E0</option><option>UPC E1</option><option>CODE 39</option><option>CODE 128</option><option>CODE 93</option><option>Interleaved 2 of 5 (ITF)</option><option>CODABAR</option></select></label>
      <label>Printer language<select value={printerLanguage} onChange={e=>setPrinterLanguage(e.target.value)}><option value="TSPL">TSPL (TSC / compatible)</option><option value="ZPL">ZPL (Zebra / compatible)</option></select></label>
      <label className="pt-slider-row">Product name size ({nameSize}px)<input aria-label="Product name size" className="pt-range" type="range" min="6" max="48" step="1" value={nameSize} onChange={e=>setNameSize(Number(e.target.value))}/></label>
      <label className="pt-slider-row">Price size ({priceSize}px)<input aria-label="Price size" className="pt-range" type="range" min="6" max="48" step="1" value={priceSize} onChange={e=>setPriceSize(Number(e.target.value))}/></label>
      <label className="pt-slider-row">Barcode height ({barcodeHeight} mm)<input aria-label="Barcode height" className="pt-range" type="range" min="10" max="80" step="1" value={barcodeHeight} onChange={e=>setBarcodeHeight(Number(e.target.value))}/></label>
     </section>
     <section className="pt-ar-section pt-products-section">
      <h3>Products</h3>
      <div className="pt-products-ar-toolbar" role="toolbar" aria-label="Product selection">
       <button title="All products" className={productMode==="all"?'active':''} onClick={()=>setProductModeAndQuery("all")}>✳</button>
       <button title="Barcode search" className={productMode==="barcode"?'active':''} onClick={()=>setProductModeAndQuery("barcode")}>▥</button>
       <button title="Code search" className={productMode==="code"?'active':''} onClick={()=>setProductModeAndQuery("code")}>123</button>
       <button title="Selected products" className={productMode==="selected"?'active':''} onClick={()=>setProductModeAndQuery("selected")}>◆</button>
       <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={productSearchPlaceholder} aria-label={productModeLabel}/>
       <button title="Search" className="pt-search-button">⌕</button>
      </div>
      <div className="pt-product-mode-pill"><span>{productModeLabel}</span><b>{candidates.length}</b></div>
      <div className="pt-product-summary"><span className="pt-info-icon">i</span><span>{selected.length?`${selected.length} products selected`:'No products selected'}<small>{selected.length?'Selected products will be printed':'All products will be printed'}</small></span></div>
      <div className="pt-product-results">{candidates.slice(0,60).map(p=><label className={`pt-product-result ${selected.includes(p.id)?'selected':''}`} key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggleProduct(p.id)}/><span><b>{p.name||'Unnamed product'}</b><small>{p.code||'No code'}{p.barcode?` · ${p.barcode}`:''}</small></span></label>)}{!candidates.length&&<div className="pt-no-results">No products found</div>}</div>
      <div className="pt-product-advanced"><select value={group} onChange={e=>setGroup(e.target.value)}><option>All groups</option>{groups.map(g=><option key={g}>{g}</option>)}</select><button onClick={()=>setSelected(candidates.map(p=>p.id))}>Select all</button><button onClick={()=>setSelected([])}>Clear</button></div>
     </section>
     <section className="pt-ar-section pt-copies-section"><label>Number of copies<div className="pt-stepper"><button onClick={()=>setCopies(Math.max(1,Number(copies)-1))}>−</button><input type="number" min="1" max="999" value={copies} onChange={e=>setCopies(Math.max(1,Number(e.target.value)||1))}/><button onClick={()=>setCopies(Math.min(999,Number(copies)+1))}>+</button></div></label></section>
     <button type="button" className="pt-print-preview-button" onClick={previewPrint}>👁 Print preview</button>
    </aside>
    <main className="price-tags-preview-area">
     <div className="pt-preview-toolbar SP-Manager reference-preview-toolbar">
      <button className="pt-toolbar-primary" onClick={previewPrint}>👁 Print preview</button>
      <button className="pt-toolbar-pdf" onClick={previewPrint}>📄 Save as PDF</button>
      <span className="pt-toolbar-separator"/>
      <button className="pt-nav-btn" disabled={previewPage<=1} onClick={()=>setPreviewPage(1)}>|◀</button><button className="pt-nav-btn" disabled={previewPage<=1} onClick={()=>setPreviewPage(p=>Math.max(1,p-1))}>◀</button>
      <span className="pt-page-counter"><input value={previewPage} onChange={e=>{const n=Math.min(pages,Math.max(1,Number(e.target.value)||1));setPreviewPage(n)}}/> of {pages}</span>
      <button className="pt-nav-btn" disabled={previewPage>=pages} onClick={()=>setPreviewPage(p=>Math.min(pages,p+1))}>▶</button><button className="pt-nav-btn" disabled={previewPage>=pages} onClick={()=>setPreviewPage(pages)}>▶|</button>
      <span className="pt-toolbar-spacer"/><button className="pt-nav-btn" title="Zoom out" onClick={()=>setPreviewZoom(z=>Math.max(.5,Number((z-.1).toFixed(2))))}>−</button><span className="pt-zoom-label">{Math.round(previewZoom*100)}%</span><input className="pt-zoom-range" aria-label="Preview zoom" type="range" min="50" max="200" step="10" value={Math.round(previewZoom*100)} onChange={e=>setPreviewZoom(Number(e.target.value)/100)}/><button className="pt-nav-btn" title="Zoom in" onClick={()=>setPreviewZoom(z=>Math.min(2,Number((z+.1).toFixed(2))))}>+</button><button className="pt-nav-btn" title="Reset zoom" onClick={()=>setPreviewZoom(1)}>Fit</button>
     </div>
     <div className="pt-native-preview">{(() => {const chunk=roll?labels:labels.slice((previewPage-1)*perPage,previewPage*perPage);return <section className="pt-page" style={{width:`${pageW}mm`,height:`${roll?Math.max(effectiveLabelH*totalLabels+Number(margins.top)+Number(margins.bottom)+Math.max(0,totalLabels-1)*Number(rowGap),100):pageH}mm`,padding:`${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,gridTemplateColumns:roll?`${labelW}mm`:`repeat(${pageCols},${labelW}mm)`,gridAutoRows:`${effectiveLabelH}mm`,columnGap:`${colGap}mm`,rowGap:`${rowGap}mm`,justifyContent:'center',zoom:previewZoom}}>{(chunk.length?chunk:[null]).map((p,j)=><div key={j} className="pt-label" style={{border:borders?"1px solid #888":"0"}}>{labelReact(p)}</div>)}</section>})()}</div>
    </main>
   </div>
  </div>
 </div>;
}

function Products({products,setProducts,addProduct,updateProduct,editing,setEditing,categories,setCategories,productGroups,setProductGroups,groupMeta,setGroupMeta,suppliers=[],setNotice,settings=defaultSettings}){
 const blank={code:"",barcode:"",barcodes:[],name:"",category:"",group:"",plu:"",unit:"pcs",price:0,cost:0,margin:0,stock:0,reorder:5,supplierId:"",preferredQuantity:0,lowStockWarning:false,lowStockWarningQuantity:0,taxInclusive:true,priceChangeAllowed:false,isService:false,defaultQuantity:true,active:true,description:"",image:"",rank:0,ageRestriction:"",lastPurchasePrice:0,comments:"",warrantyEnabled:false,warrantyYears:1,maintenanceEnabled:false,maintenanceCount:1};
 const[form,setForm]=useState(blank);
 const[showPriceTags,setShowPriceTags]=useState(false);
  const[productDeleteTarget,setProductDeleteTarget]=useState(null);
 const handleProductImage=event=>{const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){setNotice("Please select a valid product image.");event.target.value="";return}if(file.size>8*1024*1024){setNotice("Product image is too large. Please use an image below 8 MB.");event.target.value="";return}const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=900;const scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));canvas.height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL("image/jpeg",.82);setForm(f=>({...f,image:data}));};img.onerror=()=>setNotice("Unable to read the selected product image.");img.src=reader.result};reader.readAsDataURL(file);event.target.value=""};
 const clearProductImage=()=>setForm(f=>({...f,image:""}));
 const[selectedCategory,setSelectedCategory]=useState("All Products");
 const[selectedGroup,setSelectedGroup]=useState("All Groups");
 const[selectedProductId,setSelectedProductId]=useState(null);
 const[expandedCategories,setExpandedCategories]=useState(()=>new Set());
 const[groupCategories,setGroupCategories]=useState(()=>load("productGroupCategories",{}));
 const[groupImageFile,setGroupImageFile]=useState("");
 const[filter,setFilter]=useState("");
 const[showCategory,setShowCategory]=useState(false);
 const[showGroup,setShowGroup]=useState(false);
 const[showEditGroup,setShowEditGroup]=useState(false);
 const[groupConfirm,setGroupConfirm]=useState(null);
 const[newCategory,setNewCategory]=useState("");
 const[newGroup,setNewGroup]=useState("");
 const[groupError,setGroupError]=useState("");
 const[editGroupName,setEditGroupName]=useState("");
 const[showEditor,setShowEditor]=useState(false);
 const[editorTab,setEditorTab]=useState("General");
 const groups=[...new Set([...(Array.isArray(productGroups)?productGroups:[]),...products.map(p=>p.group||p.category).filter(Boolean),...Object.keys(groupMeta||{})])];
 const childrenOf=name=>groups.filter(g=>String(groupMeta?.[g]?.parent||"")===String(name));
 const rootGroup=name=>{let current=String(name||"");const seen=new Set();while(current&&groupMeta?.[current]?.parent&&!seen.has(current)){seen.add(current);current=String(groupMeta[current].parent||"")}return current};
 const inferGroupCategory=name=>{const direct=products.find(p=>String(p.group||"")===String(name)&&String(p.category||"").trim());if(direct?.category)return direct.category;let root=rootGroup(name);const rootProduct=products.find(p=>String(p.group||"")===String(root)&&String(p.category||"").trim());if(rootProduct?.category)return rootProduct.category;const metaCat=groupMeta?.[name]?.category||groupMeta?.[root]?.category;if(metaCat)return metaCat;const mapped=groupCategories?.[name];if(mapped&&categories.includes(mapped))return mapped;const rootMapped=groupCategories?.[root];if(rootMapped&&categories.includes(rootMapped))return rootMapped;return selectedCategory!=="All Products"?selectedCategory:""};
 const mainGroups=groups.filter(g=>!groupMeta?.[g]?.parent);
 const groupDescendants=name=>{const out=[];const walk=n=>{childrenOf(n).forEach(c=>{out.push(c);walk(c)})};walk(name);return out};
 const groupProductCount=name=>products.filter(p=>p.group===name||groupDescendants(name).includes(p.group)).length;
 const renderGroupTree=(name,level=0)=>{const kids=childrenOf(name);const expanded=expandedCategories.has(name);return <div key={name} className="tree-category"><button className={selectedGroup===name?"tree-item selected":"tree-item"} style={{paddingLeft:`${12+level*18}px`}} onClick={()=>{setSelectedCategory("All Products");setSelectedGroup(name);setExpandedCategories(a=>{const n=new Set(a);n.has(name)?n.delete(name):n.add(name);return n})}}>{kids.length?(expanded?"▾":"▸"):"▪"} <span className="tree-label-with-image">{groupMeta?.[name]?.image?<img src={groupMeta[name].image} alt=""/>:null}<span>{name}</span></span><em>{groupProductCount(name)}</em></button>{expanded&&kids.map(child=>renderGroupTree(child,level+1))}</div>};
 const assignedGroups=new Set(products.map(p=>p.group||p.category).filter(Boolean));
 const unassignedGroups=groups.filter(g=>!assignedGroups.has(g)&&!groupMeta?.[g]?.parent);
 const categoryGroups=selectedCategory==="All Products"?groups:groups.filter(g=>groupCategories[g]===selectedCategory||groupMeta?.[g]?.category===selectedCategory||rootGroup(g)===g&&groupMeta?.[g]?.category===selectedCategory||products.some(p=>(p.category||"")===selectedCategory&&(p.group||p.category)===g));
 const editorGroups=form.category?groups.filter(g=>g===form.group||groupMeta?.[g]?.category===form.category||groupMeta?.[rootGroup(g)]?.category===form.category||groupCategories?.[g]===form.category||groupCategories?.[rootGroup(g)]===form.category||products.some(p=>(p.category||"")===form.category&&rootGroup(p.group||p.category)===rootGroup(g))):groups;
 const visible=products.filter(p=>{
  const text=(p.name+" "+(p.code||"")+" "+(p.barcode||"")+" "+(Array.isArray(p.barcodes)?p.barcodes.join(" "):"")+" "+(p.group||"")+" "+(p.category||"")).toLowerCase();
  const c=selectedCategory==="All Products"||(p.category||p.group||"")===selectedCategory;
  const g=selectedGroup==="All Groups"||p.group===selectedGroup||(mainGroups.includes(selectedGroup)&&groupDescendants(selectedGroup).includes(p.group));
  return c&&g&&text.includes(filter.toLowerCase());
 });
 const nextProductCode=()=>{
  const nums=products.map(p=>String(p.code||"").trim()).map(v=>{const m=v.match(/^(\d+)$/);return m?Number(m[1]):0}).filter(Number.isFinite);
  const next=Math.max(100000,...nums,100000)+1;
  return String(next);
 };
 const generateBarcode=()=>{
  const now=new Date();
  const base=String(now.getFullYear()).slice(-2)+String(now.getMonth()+1).padStart(2,"0")+String(now.getDate()).padStart(2,"0")+String(now.getHours()).padStart(2,"0")+String(now.getMinutes()).padStart(2,"0")+String(now.getSeconds()).padStart(2,"0");
  let candidate12=base;
  let n=0;
  const existing=new Set(products.flatMap(p=>Array.isArray(p.barcodes)?p.barcodes:[p.barcode]).filter(Boolean).map(String));
  while(existing.has(candidate12+((10-(candidate12.split("").reduce((sum,d,i)=>sum+(Number(d)*(i%2===0?1:3)),0)%10))%10))){
   n=(n+1)%100;
   const tail=String((Number(base.slice(-2))+n)%100).padStart(2,"0");
   candidate12=base.slice(0,-2)+tail;
  }
  const sum=candidate12.split("").reduce((a,d,i)=>a+Number(d)*(i%2===0?1:3),0);
  const check=(10-(sum%10))%10;
  const code=candidate12+check;
  setForm(f=>{const current=(f.barcodes||[]).map(String).filter(Boolean);const all=f.barcode&&!current.includes(String(f.barcode))?[String(f.barcode),...current]:current;return {...f,barcode:f.barcode||code,barcodes:[...all,code].filter((x,i,a)=>a.indexOf(x)===i)}});
 };
 const refreshProducts=()=>{
  const nextProducts=load("products",products).map(normalizeProductStockControl);
  const nextCategories=load("categories",categories);
  const nextGroups=load("productGroups",productGroups);
  const nextGroupCategories=load("productGroupCategories",groupCategories);
  const nextGroupMeta=load("productGroupMeta",groupMeta);
  setProducts(nextProducts);
  setCategories(Array.isArray(nextCategories)?nextCategories:categories);
  setProductGroups(Array.isArray(nextGroups)?nextGroups:productGroups);
  setGroupCategories(nextGroupCategories&&typeof nextGroupCategories==="object"?nextGroupCategories:groupCategories);
  setGroupMeta(nextGroupMeta&&typeof nextGroupMeta==="object"?nextGroupMeta:groupMeta);
  setSelectedProductId(null);
 };
 const requestDeleteProduct=()=>{
  const product=products.find(p=>p.id===selectedProductId);
  if(!product){setNotice("Please select a product first.");return}
  setProductDeleteTarget(product);
 };
 const confirmDeleteProduct=()=>{
  if(!productDeleteTarget)return;
  const next=products.filter(p=>p.id!==productDeleteTarget.id);
  save("products",next);
  setProducts(next);
  if(editing?.id===productDeleteTarget.id){setEditing(null);setShowEditor(false)}
  setSelectedProductId(null);
  setProductDeleteTarget(null);
  setNotice("Product deleted successfully.");
 };
 const openNew=()=>{setEditing(null);setEditorTab("General");const presetGroup=selectedGroup!=="All Groups"?selectedGroup:"";const presetCategory=selectedCategory!=="All Products"?selectedCategory:(presetGroup?inferGroupCategory(presetGroup):"");setForm({...blank,code:nextProductCode(),category:presetCategory,group:presetGroup});setShowEditor(true)};
 const openEdit=p=>{setEditing(p);setEditorTab("General");const rawPriceChange=p?.priceChangeAllowed??p?.allowPriceChangeAtPOS??p?.allowPriceChange??p?.priceChangeAtPOS;const priceChangeAllowed=rawPriceChange===true||rawPriceChange===1||String(rawPriceChange??"").trim().toLowerCase()==="true"||String(rawPriceChange??"").trim()==="1";setForm({...blank,...p,priceChangeAllowed,barcode:p.barcode||p.barcodes?.[0]||"",barcodes:Array.isArray(p.barcodes)?p.barcodes:(p.barcode?[p.barcode]:[]),category:p.category||"",group:p.group||p.category||"",warrantyEnabled:Boolean(p.warrantyEnabled),warrantyYears:Math.max(1,Number(p.warrantyYears)||1),maintenanceEnabled:Boolean(p.maintenanceEnabled),maintenanceCount:Math.max(1,Number(p.maintenanceCount)||1)});setShowEditor(true)};
 const editSelectedProduct=()=>{const product=products.find(p=>p.id===selectedProductId);if(product)openEdit(product);else setNotice("Please select a product first.");};
 const exportProducts=()=>{const head=["Code","Name","Category","Group","Barcode","Unit","Cost Price","Sale Price","Tax Inclusive","Active","Stock","Reorder Level","Preferred Quantity","Low Stock Warning","Low Stock Warning Quantity","Supplier"];const body=products.map(p=>[p.code||"",p.name,p.category||"",p.group||"",(p.barcodes?.length?p.barcodes:[p.barcode]).filter(Boolean).join(" | "),p.unit||"pcs",Number(p.cost||0).toFixed(2),Number(p.price||0).toFixed(2),p.taxInclusive===false?"No":"Yes",p.active===false?"No":"Yes",p.stock||0,p.reorder||0,p.preferredQuantity||0,p.lowStockWarning===false?"No":"Yes",p.lowStockWarningQuantity||0,suppliers.find(s=>s.id===p.supplierId)?.name||""]);const csv=[head,...body].map(row=>row.map(value=>'"'+String(value??"").replaceAll('"','""')+'"').join(";")).join("\r\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="sp-manager-products.csv";a.click();URL.revokeObjectURL(a.href);setNotice("Product data exported to Excel successfully.");};
 const importProducts=()=>{const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=()=>{const file=input.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!Array.isArray(data.products))throw new Error("Invalid file");const np=data.products.map(x=>({...x,id:x.id||uid()}));save("products",np);if(Array.isArray(data.categories)){save("categories",data.categories);setCategories(data.categories)}const ng=Array.isArray(data.productGroups)?data.productGroups:[...new Set(np.map(x=>x.group||x.category).filter(Boolean))];save("productGroups",ng);setProductGroups(ng);setNotice("Product data imported successfully.");}catch{setNotice("The selected file is not a valid SP-Manager product file.");}};r.readAsText(file)};input.click();};
 const movingAverage=()=>{if(!visible.length){setNotice("No products available for moving average price.");return}const np=products.map(p=>visible.some(v=>v.id===p.id)?{...p,lastPurchasePrice:Number(p.lastPurchasePrice||p.cost||0),cost:Number(p.lastPurchasePrice||p.cost||0),updatedAt:new Date().toISOString()}:p);save("products",np);setProducts(np);setNotice("Moving average price updated for "+visible.length+" product(s). Refreshing product data is required to display the result.");};
 const resetGroupForm=()=>{setGroupImageFile("");setNewGroup("");setGroupError("")};
 const handleGroupImage=event=>{const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){setGroupError("Please select a valid image.");event.target.value="";return}if(file.size>8*1024*1024){setGroupError("Image is too large. Please use an image below 8 MB.");event.target.value="";return}const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=700;const scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));canvas.height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);setGroupImageFile(canvas.toDataURL("image/jpeg",.82));};img.onerror=()=>setGroupError("Unable to read the selected image.");img.src=reader.result};reader.readAsDataURL(file);event.target.value=""};
 const openGroupModal=()=>{const parent=selectedGroup!=="All Groups"&&!groupMeta?.[selectedGroup]?.parent?selectedGroup:"";resetGroupForm();setGroupForm({name:"",parent,image:""});setGroupFormLevel(parent?"Second group":"Main group");setShowGroup(true)};
 const [groupForm,setGroupForm]=useState({name:"",parent:"",image:""});
 const [groupFormLevel,setGroupFormLevel]=useState("Main group");
 const editGroup=()=>{if(selectedGroup==="All Groups"){setNotice("Please select a product group first.");return}const meta=groupMeta?.[selectedGroup]||{};setGroupForm({name:selectedGroup,parent:meta.parent||"",image:meta.image||""});setGroupImageFile(meta.image||"");setGroupFormLevel(meta.parent?"Second group":"Main group");setGroupError("");setShowEditGroup(true)};
 const saveEditGroup=()=>{const name=String(groupForm.name||"").trim();if(!name){setGroupError("Enter a product group name.");return}const oldName=selectedGroup;if(name!==oldName&&groups.some(g=>g.toLowerCase()===name.toLowerCase())){setGroupError("This product group already exists.");return}const parent=String(groupForm.parent||"").trim();if(parent===oldName||groupDescendants(oldName).includes(parent)){setGroupError("Invalid parent group.");return}setGroupConfirm({type:"edit",oldName,name,parent,image:groupImageFile||groupForm.image||"",category:inferGroupCategory(oldName)});};
 const deleteGroup=()=>{if(selectedGroup==="All Groups"){setNotice("Please select a product group first.");return}const children=childrenOf(selectedGroup);const count=products.filter(p=>p.group===selectedGroup||groupDescendants(selectedGroup).includes(p.group)).length;if(children.length){setNotice("This main group contains second group(s). Delete or move the second group(s) first.");return}if(count){setNotice("This group contains product(s). Move or remove the products before deleting the group.");return}setGroupConfirm({type:"delete",name:selectedGroup});};
 const saveGroup=e=>{e?.preventDefault();const name=String(groupForm.name||"").trim();if(!name){setGroupError("Enter a product group name.");return}if(groups.some(g=>g.toLowerCase()===name.toLowerCase())){setGroupError("This product group already exists.");return}const parent=String(groupForm.parent||"").trim();if(parent===name||groupDescendants(name).includes(parent)){setGroupError("Invalid parent group.");return}const category=parent?inferGroupCategory(parent):(selectedCategory!=="All Products"?selectedCategory:"");setGroupConfirm({type:"save",name,parent,image:groupImageFile||"",category});};
 const confirmGroupAction=()=>{if(!groupConfirm)return;const {type,name,parent,image,oldName,category}=groupConfirm;if(type==="save"){const next=[...groups,name];const categoryMap={...groupCategories,...(parent?{[name]:parent}:{})};const meta={...groupMeta,[name]:{parent:parent||"",image:image||"",rank:groups.length+1,category:category||""}};save("productGroups",next);save("productGroupCategories",categoryMap);save("productGroupMeta",meta);setProductGroups(next);setGroupCategories(categoryMap);setGroupMeta(meta);setNewGroup("");setGroupError("");setShowGroup(false);setForm(f=>({...f,group:name,category:category||inferGroupCategory(name)||f.category}));setSelectedGroup(name);if(parent)setExpandedCategories(a=>new Set(a).add(parent));setNotice((parent?"Second group":"Main group")+" added successfully.")}if(type==="edit"){const next=groups.map(g=>g===oldName?name:g);const np=products.map(p=>{let q=p;if(p.group===oldName)q={...q,group:name,updatedAt:new Date().toISOString()};if(p.category===oldName&&!parent)q={...q,category:name,updatedAt:new Date().toISOString()};return q});const meta={...groupMeta};const oldMeta=meta[oldName]||{};delete meta[oldName];meta[name]={parent:parent||"",image:image||oldMeta.image||"",rank:oldMeta.rank||0,category:category||oldMeta.category||inferGroupCategory(parent)||""};Object.keys(meta).forEach(k=>{if(meta[k]?.parent===oldName)meta[k]={...meta[k],parent:name}});save("productGroups",next);save("products",np);save("productGroupMeta",meta);setProductGroups(next);setProducts(np);setGroupMeta(meta);setSelectedGroup(name);setShowEditGroup(false);setNotice("Product group updated successfully.")}if(type==="delete"){const next=groups.filter(g=>g!==name);const meta={...groupMeta};delete meta[name];save("productGroups",next);save("productGroupMeta",meta);setProductGroups(next);setGroupMeta(meta);setSelectedGroup("All Groups");setNotice("Product group deleted successfully.")}setGroupConfirm(null)};
 const addCat=()=>{const name=newCategory.trim();if(!name)return;if(categories.includes(name)){setNotice("This category already exists.");return}const next=[...categories,name];save("categories",next);setCategories(next);setNewCategory("");setShowCategory(false);setForm(f=>({...f,category:name}));setNotice("Category added successfully.")};
 const submit=e=>{e.preventDefault();if(!form.name.trim()){setNotice("Product name is required.");return}if(!form.category){setNotice("Please select a product category.");return}if(!form.group){setNotice("Please select or create a product group.");return}const bars=[form.barcode,...(form.barcodes||[])].map(x=>String(x||"").trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);const payload={...form,barcode:bars[0]||"",barcodes:bars,price:Number(form.price)||0,cost:Number(form.cost)||0,margin:Number(form.margin)||0,stock:Number(form.stock)||0,reorder:Number(form.reorder)||0,supplierId:String(form.supplierId||""),preferredQuantity:Number(form.preferredQuantity)||0,lowStockWarning:Boolean(form.lowStockWarning),lowStockWarningQuantity:Number(form.lowStockWarningQuantity)||0,rank:Number(form.rank)||0,lastPurchasePrice:Number(form.lastPurchasePrice)||0,priceChangeAllowed:Boolean(form.priceChangeAllowed),isService:Boolean(form.isService),defaultQuantity:Boolean(form.defaultQuantity),active:Boolean(form.active),warrantyEnabled:Boolean(form.warrantyEnabled),warrantyYears:Math.max(1,Number(form.warrantyYears)||1),maintenanceEnabled:Boolean(form.maintenanceEnabled),maintenanceCount:Math.max(1,Number(form.maintenanceCount)||1)};if(!groups.includes(payload.group)){const next=[...groups,payload.group];save("productGroups",next);setProductGroups(next)}editing?updateProduct(payload):addProduct(payload);setForm(blank);setShowEditor(false)};
 return <section className="content product-master-modern">
  <div className="toolbar product-master-toolbar"><div><h3>Products</h3><small>Product master, product groups, barcodes, pricing and stock control</small></div><div className="product-action-strip"><button type="button" title="Refresh" onClick={refreshProducts}>↻ <span>Refresh</span></button><button type="button" title="New group" onClick={(e)=>{e.stopPropagation();openGroupModal()}}>＋ <span>New group</span></button><button title="Edit group" onClick={editGroup}>✎ <span>Edit group</span></button><button title="Delete group" onClick={deleteGroup}>▢ <span>Delete group</span></button><button title="New product" onClick={openNew}>＋ <span>New product</span></button><button type="button" title="Edit product" onClick={editSelectedProduct}>✎ <span>Edit product</span></button><button type="button" title="Delete product" disabled={!selectedProductId} onClick={requestDeleteProduct}>⌫ <span>Delete product</span></button><button title="Print" onClick={()=>window.print()}>▣ <span>Print</span></button><button title="Save as PDF" onClick={()=>downloadReportPDF("Products",["Code","Name","Group","Barcode","Cost","Sale Price"],visible.map(p=>[p.code||"-",p.name,p.group||p.category||"-",p.barcode||"-",money(p.cost),money(p.price)]))}>PDF <span>Save as PDF</span></button><button title="Price tags" onClick={()=>setShowPriceTags(true)}>▤ <span>Price tags</span></button><button title="Moving average price" onClick={movingAverage}>↯ <span>Mov. avg. price</span></button><button title="Import" onClick={importProducts}>↓ <span>Import</span></button><button title="Export to Excel" onClick={exportProducts}>↑ <span>Export to Excel</span></button><button title="Help" onClick={()=>setNotice("Products supports categories, groups, multiple products per group, multiple barcodes, pricing, stock, tax settings and product details." )}>? <span>Help</span></button></div></div>
  <div className="product-master-shell">
  <aside className="product-tree"><div className="tree-title">Product Groups</div><button className={selectedGroup==="All Groups"?"tree-item selected":"tree-item"} onClick={()=>{setSelectedCategory("All Products");setSelectedGroup("All Groups")}}>▣ <span>All Products</span><em>{products.length}</em></button>{mainGroups.map(main=>renderGroupTree(main,0))}</aside>
   <div className="product-master-main">
    <div className="product-master-toolbar2"><div><b>{selectedGroup!=="All Groups"?selectedGroup:"All Products"}</b><span>{visible.length} product(s)</span></div><div className="product-list-actions"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search name, code, barcode..."/><button className="secondary smallbtn" onClick={()=>{setSelectedCategory("All Products");setSelectedGroup("All Groups");setFilter("")}}>Reset</button></div></div>
    <div className="product-table-wrap"><table className="product-master-table"><thead><tr><th>Code</th><th>Name</th><th>Group</th><th>Barcode</th><th>Cost</th><th>Sale price</th><th>Tax</th><th>Active</th><th>Stock</th><th>Updated</th><th></th></tr></thead><tbody>{visible.map(p=><tr key={p.id} className={selectedProductId===p.id?"selected-product":""} onClick={()=>setSelectedProductId(p.id)} onDoubleClick={()=>openEdit(p)}><td>{p.code||"-"}</td><td><b>{p.name}</b><small>{p.description||p.unit||""}</small></td><td>{p.group||p.category||"-"}</td><td>{(p.barcodes?.length?p.barcodes:[p.barcode]).filter(Boolean).join(", ")||"-"}</td><td>{money(p.cost)}</td><td>{money(p.price)}</td><td>{p.taxInclusive===false?"Exclusive":"Inclusive"}</td><td>{p.active===false?"—":"✓"}</td><td>{p.stock}</td><td>{p.updatedAt?new Date(p.updatedAt).toLocaleDateString("en-GB"):"-"}</td><td><button className="smallbtn" onClick={e=>{e.stopPropagation();openEdit(p)}}>Edit</button></td></tr>)}</tbody></table>{!visible.length&&<Empty text="No products found."/>}</div>
   </div>
  </div>
  {showEditor&&<div className="ar-modal-backdrop" onMouseDown={()=>setShowEditor(false)}><div className="ar-modal product-editor-modal" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>PRODUCT MASTER</small><h3>{editing?"Edit Product":"New Product"}</h3></div><button onClick={()=>setShowEditor(false)}>×</button></div><form onSubmit={submit} className="product-editor-form">
   <div className="product-editor-tabs" role="tablist" aria-label="Product sections">{["General","Image","Pricing","Stock","Warranty & Maintenance","Details"].map(x=><button key={x} type="button" role="tab" aria-selected={editorTab===x} className={editorTab===x?"active":""} onClick={()=>setEditorTab(x)}>{x}</button>)}</div>
   <div className="product-editor-tab-content">
    {editorTab==="General"&&<div className="editor-section"><h4>General</h4><div className="editor-grid"><label>Product Name*<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Product Code<input value={form.code} readOnly={!editing} onChange={e=>setForm({...form,code:e.target.value})}/></label><label>PLU<input value={form.plu} onChange={e=>setForm({...form,plu:e.target.value})}/></label><label>Measurement Unit<input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></label><label>Category*<div className="inline-field"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value,group:""})}><option value="">Select category...</option>{categories.map(c=><option key={c}>{c}</option>)}</select><button type="button" className="secondary smallbtn" onClick={(e)=>{e.stopPropagation();setShowCategory(true)}}>+</button></div></label><label>Product Group*<div className="inline-field"><select value={form.group} onChange={e=>setForm({...form,group:e.target.value})}><option value="">Select group...</option>{editorGroups.map(g=><option key={g}>{g}</option>)}</select><button type="button" className="secondary smallbtn" onClick={(e)=>{e.stopPropagation();setShowGroup(true)}}>+</button></div></label></div></div>}
    {editorTab==="Image"&&<div className="editor-section product-image-section"><h4>Product Image</h4><div className="product-image-editor"><div className="product-image-preview"><img src={form.image||DEFAULT_PRODUCT_IMAGE} alt="Product preview"/></div><div className="product-image-controls"><div><b>POS product image</b><small>Upload an image to display this product in POS. If no image is uploaded, SP-Manager uses the default image automatically.</small></div><div className="product-image-buttons"><label className="secondary image-upload-btn">＋ Add image<input type="file" accept="image/*" onChange={handleProductImage}/></label>{form.image&&<button type="button" className="secondary image-remove-btn" onClick={clearProductImage}>Remove image</button>}</div></div></div></div>}
    {editorTab==="Pricing"&&<div className="editor-section"><h4>Barcodes & Pricing</h4><div className="editor-grid"><label className="full">Barcode<div className="barcode-tags-editor">{(form.barcodes||[]).map(b=><span key={b}>{b}<button type="button" onClick={()=>setForm(f=>{const next=(f.barcodes||[]).filter(x=>x!==b);return {...f,barcode:next[0]||"",barcodes:next}})}>×</button></span>)}<input value="" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const b=e.currentTarget.value.replace(/\D/g,"");if(b){setForm(f=>{const next=[...(f.barcodes||[]),b].filter((x,i,a)=>a.indexOf(x)===i);return {...f,barcode:next[0]||"",barcodes:next}});e.currentTarget.value=""}}}} placeholder="Enter barcode and press Enter"/></div><button type="button" className="secondary barcode-generate-btn" onClick={generateBarcode}>Generate barcode</button></label><label>Selling Price (RM)<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Cost Price (RM)<input type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></label><label>Markup / Margin<input type="number" step="0.01" value={form.margin} onChange={e=>setForm({...form,margin:e.target.value})}/></label><label>Last Purchase Price<input type="number" min="0" step="0.01" value={form.lastPurchasePrice} onChange={e=>setForm({...form,lastPurchasePrice:e.target.value})}/></label></div><div className="check-grid"><label><input type="checkbox" checked={!!form.taxInclusive} onChange={e=>setForm({...form,taxInclusive:e.target.checked})}/> Tax inclusive price</label><label><input type="checkbox" checked={!!form.priceChangeAllowed} onChange={e=>setForm({...form,priceChangeAllowed:e.target.checked})}/> Allow price change at POS</label><label><input type="checkbox" checked={!!form.isService} onChange={e=>setForm({...form,isService:e.target.checked})}/> Service item</label><label><input type="checkbox" checked={!!form.defaultQuantity} onChange={e=>setForm({...form,defaultQuantity:e.target.checked})}/> Use default quantity</label><label><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active</label></div></div>}
    {editorTab==="Stock"&&<div className="editor-section stock-control-editor-section"><h4>Stock control</h4><div className="stock-control-info"><span>i</span><div>Set low stock quantity rules that can be used as a stock reorder point.<br/><a href="#" target="_blank" rel="noreferrer">Learn more</a></div></div><div className="editor-grid"><label>Supplier<select value={form.supplierId||""} onChange={e=>setForm({...form,supplierId:e.target.value})}><option value="">(none)</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Reorder point<input type="number" min="0" step="1" value={form.reorder} onChange={e=>setForm({...form,reorder:e.target.value})}/></label><label>Preferred quantity<input type="number" min="0" step="1" value={form.preferredQuantity} onChange={e=>setForm({...form,preferredQuantity:e.target.value})}/></label><label className="toggle-field"><span>Low stock warning</span><input type="checkbox" checked={!!form.lowStockWarning} onChange={e=>setForm({...form,lowStockWarning:e.target.checked})}/></label><label>Low stock warning quantity<input type="number" min="0" step="1" value={form.lowStockWarningQuantity} onChange={e=>setForm({...form,lowStockWarningQuantity:e.target.value})}/></label></div></div>}
    {editorTab==="Warranty & Maintenance"&&<div className="editor-section product-warranty-section"><h4>Warranty & Maintenance</h4><p className="settings-help">Enable only the services that should appear on the invoice for this product.</p><div className="warranty-maintenance-grid"><div className="warranty-card"><label className="warranty-toggle"><input type="checkbox" checked={!!form.warrantyEnabled} onChange={e=>setForm({...form,warrantyEnabled:e.target.checked})}/><span><b>Warranty</b><small>Show warranty information on invoice</small></span></label><label>Warranty period (years)<input type="number" min="1" step="1" disabled={!form.warrantyEnabled} value={form.warrantyYears??1} onChange={e=>setForm({...form,warrantyYears:Math.max(1,Number(e.target.value)||1)})}/></label><div className="warranty-preview">Invoice: <b>Warranty {Math.max(1,Number(form.warrantyYears)||1)} Year</b></div></div><div className="warranty-card"><label className="warranty-toggle"><input type="checkbox" checked={!!form.maintenanceEnabled} onChange={e=>setForm({...form,maintenanceEnabled:e.target.checked})}/><span><b>Free Maintenance</b><small>Show free maintenance on invoice</small></span></label><label>Free maintenance (times)<input type="number" min="1" step="1" disabled={!form.maintenanceEnabled} value={form.maintenanceCount??1} onChange={e=>setForm({...form,maintenanceCount:Math.max(1,Number(e.target.value)||1)})}/></label><div className="warranty-preview">Invoice: <b>Free Maintenance {Math.max(1,Number(form.maintenanceCount)||1)} x</b></div></div></div></div>}
    {editorTab==="Details"&&<div className="editor-section"><h4>Stock & Details</h4><div className="editor-grid"><label>Opening / Current Stock<input type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label><label>Rank / Sort Order<input type="number" value={form.rank} onChange={e=>setForm({...form,rank:e.target.value})}/></label><label>Age Restriction<input value={form.ageRestriction} onChange={e=>setForm({...form,ageRestriction:e.target.value})}/></label><label className="full">Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="full">Product Comment<textarea value={form.comments} onChange={e=>setForm({...form,comments:e.target.value})}/></label></div></div>}
   </div>
   <div className="form-actions"><button type="submit">{editing?"Save Changes":"Create Product"}</button><button type="button" className="secondary" onClick={()=>setShowEditor(false)}>Cancel</button></div>
  </form></div></div>}
  {productDeleteTarget&&<div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-product-title" onMouseDown={()=>setProductDeleteTarget(null)}><div className="modal group-confirm-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">PRODUCT MASTER</span><h3 id="delete-product-title">Delete Product</h3></div><button type="button" className="iconbtn" aria-label="Close" onClick={()=>setProductDeleteTarget(null)}>×</button></div><div className="group-confirm-body"><div className="confirm-icon danger">!</div><p>Are you sure you want to delete <b>"{productDeleteTarget.name}"</b>?</p><small className="muted">This removes the product from Product Master and POS. Existing sales history is not changed.</small></div><div className="group-confirm-actions"><button type="button" className="secondary" onClick={()=>setProductDeleteTarget(null)}>No</button><button type="button" className="danger-button" onClick={confirmDeleteProduct}>Yes, delete</button></div></div></div>}
  {showPriceTags&&<PriceTagsModal products={products} groups={groups} money={money} settings={settings} onClose={()=>setShowPriceTags(false)} setNotice={setNotice}/>}
  {showCategory&&<div className="modal-backdrop" onMouseDown={()=>setShowCategory(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>Product Categories</h3><button className="iconbtn" onClick={()=>setShowCategory(false)}>×</button></div><div className="category-list">{categories.map(c=><div key={c}><span>{c}</span><small>{products.filter(p=>(p.category||p.group)===c).length} product(s)</small></div>)}</div><div className="inline-field"><input value={newCategory} placeholder="New category name" onChange={e=>setNewCategory(e.target.value)}/><button onClick={addCat}>Add Category</button></div></div></div>}
  {showGroup&&<div className="modal-backdrop" onMouseDown={()=>setShowGroup(false)}><form className="modal group-editor-modal" onSubmit={saveGroup} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">PRODUCT GROUPS</span><h3>New {groupFormLevel}</h3></div><button type="button" className="iconbtn" onClick={()=>setShowGroup(false)}>×</button></div><div className="group-editor-grid"><label>Parent group<select value={groupForm.parent} onChange={e=>{setGroupForm(f=>({...f,parent:e.target.value}));setGroupFormLevel(e.target.value?"Subgroup":"Main group");setGroupError("")}}><option value="">No parent (Main group)</option>{groups.filter(g=>g!==groupForm.name).map(g=><option key={g} value={g}>{"↳ ".repeat(Math.min(6,Math.max(0,(String(g).length>0?0:0))))}{g}</option>)}</select></label><label>Group name<input autoFocus value={groupForm.name} onChange={e=>{setGroupForm(f=>({...f,name:e.target.value}));setGroupError("")}} placeholder="Enter group name"/></label><div className="group-image-field"><span>Group image</span><div className="group-image-row">{(groupImageFile||groupForm.image)?<img src={groupImageFile||groupForm.image} alt=""/>:<div className="group-image-empty">No image</div>}<div><input id="new-group-image" type="file" accept="image/*" onChange={handleGroupImage}/><button type="button" className="secondary smallbtn" onClick={()=>{setGroupImageFile("");setGroupForm(f=>({...f,image:""}));const el=document.getElementById("new-group-image");if(el)el.value=""}}>Clear image</button></div></div><small>Image is optional and stored with the group.</small></div></div>{groupError&&<p className="modal-inline-error">{groupError}</p>}<div className="group-editor-actions"><button type="button" className="secondary" onClick={()=>setShowGroup(false)}>Cancel</button><button type="submit">Create group</button></div></form></div>}
  {groupConfirm&&<div className="modal-backdrop group-confirm-backdrop" onMouseDown={()=>setGroupConfirm(null)}><div className="modal group-confirm-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">PRODUCT GROUPS</span><h3>{groupConfirm.type==="save"?"Save new group":groupConfirm.type==="edit"?"Save group changes":"Delete group"}</h3></div><button type="button" className="iconbtn" aria-label="Close" onClick={()=>setGroupConfirm(null)}>×</button></div><div className="group-confirm-body"><div className={groupConfirm.type==="delete"?"confirm-icon danger":"confirm-icon"}>{groupConfirm.type==="delete"?"!":"✓"}</div><p>{groupConfirm.type==="save"?`Save "${groupConfirm.name}" as a product group?`:groupConfirm.type==="edit"?`Rename "${groupConfirm.oldName}" to "${groupConfirm.name}"?`:`Delete the empty product group "${groupConfirm.name}"?`}</p></div><div className="group-confirm-actions"><button type="button" className="secondary" onClick={()=>setGroupConfirm(null)}>Cancel</button><button type="button" className={groupConfirm.type==="delete"?"danger-button":"primary-button"} onClick={confirmGroupAction}>{groupConfirm.type==="delete"?"Delete":"Confirm"}</button></div></div></div>}
  {showEditGroup&&<div className="modal-backdrop" onMouseDown={()=>setShowEditGroup(false)}><form className="modal group-editor-modal" onSubmit={e=>{e.preventDefault();saveEditGroup()}} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">PRODUCT GROUPS</span><h3>Edit {groupFormLevel}</h3></div><button type="button" className="iconbtn" aria-label="Close" onClick={()=>setShowEditGroup(false)}>×</button></div><div className="group-editor-grid"><label>Parent group<select value={groupForm.parent} onChange={e=>{setGroupForm(f=>({...f,parent:e.target.value}));setGroupFormLevel(e.target.value?"Subgroup":"Main group");setGroupError("")}}><option value="">No parent (Main group)</option>{groups.filter(g=>g!==selectedGroup&&!groupDescendants(selectedGroup).includes(g)).map(g=><option key={g} value={g}>{g}</option>)}</select></label><label>Group name<input autoFocus value={groupForm.name} onChange={e=>{setGroupForm(f=>({...f,name:e.target.value}));setGroupError("")}}/></label><div className="group-image-field"><span>Group image</span><div className="group-image-row">{(groupImageFile||groupForm.image)?<img src={groupImageFile||groupForm.image} alt=""/>:<div className="group-image-empty">No image</div>}<div><input id="edit-group-image" type="file" accept="image/*" onChange={handleGroupImage}/><button type="button" className="secondary smallbtn" onClick={()=>{setGroupImageFile("");setGroupForm(f=>({...f,image:""}));const el=document.getElementById("edit-group-image");if(el)el.value=""}}>Clear image</button></div></div><small>Image is optional. The same image is used in the product-group tree and POS group tile.</small></div></div>{groupError&&<p className="modal-inline-error">{groupError}</p>}<div className="group-editor-actions"><button type="button" className="secondary" onClick={()=>setShowEditGroup(false)}>Cancel</button><button type="submit">Save changes</button></div></form></div>}
 </section>
}
function Inventory({products,setProducts,stockHistory,setStockHistory,categories}){
 const refreshInventory=()=>{const latestProducts=load("products",products).map(normalizeProductStockControl);const latestHistory=load("stockHistory",stockHistory);setProducts(latestProducts);setStockHistory(Array.isArray(latestHistory)?latestHistory:stockHistory)};
 const [category,setCategory]=useState("All Products");
 const [search,setSearch]=useState("");
 const [negative,setNegative]=useState(false);
 const [nonZero,setNonZero]=useState(false);
 const [zero,setZero]=useState(false);
 const [modal,setModal]=useState(null);
 const [selectedId,setSelectedId]=useState(null);
 const [desired,setDesired]=useState(0);
 const [countRows,setCountRows]=useState({});
 const filtered=products.filter(p=>{
  const text=[p.code,p.name,p.category,p.group,p.barcode].filter(Boolean).join(" ").toLowerCase();
  if(category!=="All Products"&&(p.category||p.group)!==category)return false;
  if(search&&!text.includes(search.toLowerCase()))return false;
  if(negative&&Number(p.stock)>=0)return false;
  if(nonZero&&Number(p.stock)===0)return false;
  if(zero&&Number(p.stock)!==0)return false;
  return true;
 });
 const neg=products.filter(p=>Number(p.stock)<0).length;
 const zeroCount=products.filter(p=>Number(p.stock)===0).length;
 const positive=products.filter(p=>Number(p.stock)>0).length;
 const totalCost=filtered.reduce((a,p)=>a+Number(p.stock||0)*Number(p.cost||0),0);
 const totalValue=filtered.reduce((a,p)=>a+Number(p.stock||0)*Number(p.price||0),0);
 const selected=products.find(p=>p.id===selectedId);
 const openQuick=p=>{setSelectedId(p.id);setDesired(Number(p.stock||0));setModal("quick")};
 const applyQuick=()=>{if(!selected)return;const qty=Number(desired)||0;const old=Number(selected.stock||0);const next=products.map(p=>p.id===selected.id?{...p,stock:qty,updatedAt:new Date().toISOString()}:p);save("products",next);setProducts(next);const entry={id:uid(),date:new Date().toISOString(),productId:selected.id,productName:selected.name,code:selected.code||"",type:"Inventory Count",change:qty-old,quantityAfter:qty,reference:"IC-"+String(uid()).slice(-7)};const hs=[entry,...stockHistory].slice(0,2000);save("stockHistory",hs);setStockHistory(hs);setModal(null);setNoticeText("Stock quantity changed successfully. Inventory count document "+entry.reference+" created.")};
 const [noticeText,setNoticeText]=useState("");
 useEffect(()=>{if(!noticeText)return;const t=setTimeout(()=>setNoticeText(""),5000);return()=>clearTimeout(t)},[noticeText]);
 const applyCount=()=>{const updates=[];const next=products.map(p=>{if(countRows[p.id]===undefined||countRows[p.id]==="")return p;const q=Number(countRows[p.id]);const old=Number(p.stock||0);if(q===old)return p;const ref="IC-"+String(uid()).slice(-7);updates.push({id:uid(),date:new Date().toISOString(),productId:p.id,productName:p.name,code:p.code||"",type:"Inventory Count",change:q-old,quantityAfter:q,reference:ref});return {...p,stock:q,updatedAt:new Date().toISOString()}});if(!updates.length){setModal(null);return}save("products",next);setProducts(next);const hs=[...updates,...stockHistory].slice(0,2000);save("stockHistory",hs);setStockHistory(hs);setCountRows({});setModal(null);setNoticeText("Inventory count completed successfully. "+updates.length+" product(s) updated.")};
 const recalc=()=>{const next=products.map(p=>({...p,stock:Number(p.stock||0),updatedAt:new Date().toISOString()}));save("products",next);setProducts(next);setNoticeText("Stock quantities recalculated successfully.")};
 const exportCsv=()=>{const head=["Code","Name","Category","Group","Quantity","Unit","Cost Price","Total Cost","Sale Price","Total Value","Status"];const body=filtered.map(p=>{const quantity=Number(p.stock||0);const cost=Number(p.cost||0);const price=Number(p.price||0);return [p.code||"",p.name,p.category||"",p.group||"",quantity,p.unit||"pcs",cost.toFixed(2),(quantity*cost).toFixed(2),price.toFixed(2),(quantity*price).toFixed(2),quantity<0?"Negative":quantity===0?"Zero":"OK"]});const csv=[head,...body].map(row=>row.map(value=>'"'+String(value??"").replaceAll('"','""')+'"').join(";")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}));a.download="sp-manager-inventory.csv";a.click();URL.revokeObjectURL(a.href);setNoticeText("Inventory data exported to Excel successfully.")};
 return <section className="inventory-modern">
  {noticeText&&<div className="inventory-inline-notice">{noticeText}<button onClick={()=>setNoticeText("")}>×</button></div>}
  <div className="inventory-topbar"><div><div className="eyebrow">INVENTORY MANAGEMENT</div><h2>Stock</h2><p>Stock quantities, inventory counts, stock history and stock control.</p></div><div className="inventory-actions"><button type="button" onClick={refreshInventory}>↻<span>Refresh</span></button><button onClick={()=>setModal("history")}>◷<span>Stock history</span></button><button onClick={()=>window.print()}>▣<span>Print</span></button><button onClick={()=>downloadReportPDF("Inventory",["Code","Name","Quantity","Cost","Value"],filtered.map(p=>[p.code||"",p.name,p.stock,money(p.cost),money(p.stock*p.price)]))}>PDF<span>Save as PDF</span></button><button title="Export to Excel" onClick={exportCsv}>▦<span>Export to Excel</span></button><button onClick={()=>setModal("count")}>☷<span>Inventory count report</span></button><button onClick={()=>selected?openQuick(selected):setModal("quick")}>↯<span>Quick inventory</span></button><button onClick={()=>setNoticeText("Inventory supports stock history, quick inventory, inventory counts, negative/zero quantity filters, cost/value totals and low stock control.")}>?<span>Help</span></button></div></div>
  <div className="inventory-summary"><div className="inventory-stat negative"><b>{neg}</b><span>Negative quantity</span></div><div className="inventory-stat positive"><b>{positive}</b><span>Positive quantity</span></div><div className="inventory-stat zero"><b>{zeroCount}</b><span>Zero quantity</span></div><div className="inventory-total"><span>Cost price</span><b>Total cost: {money(totalCost)}</b><b>Total value: {money(totalValue)}</b></div></div>
  <div className="inventory-shell">
   <aside className="inventory-tree"><div className="tree-title">Products</div><button className={category==="All Products"?"tree-item selected":"tree-item"} onClick={()=>setCategory("All Products")}>▣ <span>Products</span><em>{products.length}</em></button>{categories.map(c=><button key={c} className={category===c?"tree-item selected":"tree-item"} onClick={()=>setCategory(c)}>▾ <span>{c}</span><em>{products.filter(p=>(p.category||p.group)===c).length}</em></button>)}</aside>
   <div className="inventory-main"><div className="inventory-filterbar"><div className="inventory-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product name, code, barcode..."/></div><label><input type="checkbox" checked={negative} onChange={e=>{setNegative(e.target.checked);if(e.target.checked){setNonZero(false);setZero(false)}}}/> Negative quantity</label><label><input type="checkbox" checked={nonZero} onChange={e=>{setNonZero(e.target.checked);if(e.target.checked){setNegative(false);setZero(false)}}}/> Non zero quantity</label><label><input type="checkbox" checked={zero} onChange={e=>{setZero(e.target.checked);if(e.target.checked){setNegative(false);setNonZero(false)}}}/> Zero quantity</label></div>
    <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th></th><th>Code</th><th>Name</th><th>Quantity</th><th>Unit</th><th>Cost price</th><th>Cost</th><th>Sale price</th><th>Value</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map(p=>{const q=Number(p.stock||0);return <tr key={p.id} className={selectedId===p.id?"selected":""} onClick={()=>setSelectedId(p.id)} onDoubleClick={()=>openQuick(p)}><td><i className={q<0?"stock-dot red":q===0?"stock-dot blue":"stock-dot green"}></i></td><td>{p.code||"—"}</td><td><b>{p.name}</b><small>{p.category||p.group||""}</small></td><td className={q<0?"qty-negative":q===0?"qty-zero":""}>{q}</td><td>{p.unit||"pcs"}</td><td>{money(p.cost)}</td><td>{money(q*Number(p.cost||0))}</td><td>{money(p.price)}</td><td>{money(q*Number(p.price||0))}</td><td><span className={q<0?"inventory-badge danger":q===0?"inventory-badge zero":"inventory-badge ok"}>{q<0?"Negative":q===0?"Zero":"OK"}</span></td><td><button className="inventory-row-btn" onClick={e=>{e.stopPropagation();openQuick(p)}}>Adjust</button></td></tr>})}</tbody></table>{!filtered.length&&<div className="inventory-empty">No products found.</div>}</div><div className="inventory-footer"><span>Products count: <b>{filtered.length}</b></span><span>Cost price <b>{money(totalCost)}</b></span><span>Sale price <b>{money(totalValue)}</b></span></div></div>
  </div>
  {modal==="quick"&&<div className="inventory-modal-backdrop" onMouseDown={()=>setModal(null)}><div className="inventory-modal small" onMouseDown={e=>e.stopPropagation()}><div className="inventory-modal-head"><div><span className="eyebrow">QUICK INVENTORY</span><h3>Update stock quantity</h3></div><button onClick={()=>setModal(null)}>×</button></div><div className="inventory-modal-body"><label>Product<select value={selectedId||""} onChange={e=>{const id=Number(e.target.value);const p=products.find(x=>x.id===id);setSelectedId(id);setDesired(Number(p?.stock||0))}}>{products.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>{selected&&<div className="inventory-current"><span>Current quantity</span><b>{selected.stock}</b></div>}<label>New quantity<input type="number" step="1" value={desired} onChange={e=>setDesired(e.target.value)}/></label><p className="inventory-help">An inventory count document will be created automatically.</p></div><div className="inventory-modal-foot"><button className="secondary" onClick={()=>setModal(null)}>Cancel</button><button onClick={applyQuick}>Update quantity</button></div></div></div>}
  {modal==="count"&&<div className="inventory-modal-backdrop" onMouseDown={()=>setModal(null)}><div className="inventory-modal count" onMouseDown={e=>e.stopPropagation()}><div className="inventory-modal-head"><div><span className="eyebrow">INVENTORY COUNT</span><h3>Inventory count report</h3></div><button onClick={()=>setModal(null)}>×</button></div><div className="inventory-count-table"><table><thead><tr><th>Code</th><th>Product</th><th>Current</th><th>Actual quantity</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td>{p.code}</td><td>{p.name}</td><td>{p.stock}</td><td><input type="number" step="1" value={countRows[p.id]??""} placeholder={String(p.stock)} onChange={e=>setCountRows({...countRows,[p.id]:e.target.value})}/></td></tr>)}</tbody></table></div><div className="inventory-modal-foot"><button className="secondary" onClick={()=>setModal(null)}>Cancel</button><button onClick={applyCount}>Complete inventory count</button></div></div></div>}
  {modal==="history"&&<div className="inventory-modal-backdrop" onMouseDown={()=>setModal(null)}><div className="inventory-modal history" onMouseDown={e=>e.stopPropagation()}><div className="inventory-modal-head"><div><span className="eyebrow">STOCK HISTORY</span><h3>Stock history</h3></div><button onClick={()=>setModal(null)}>×</button></div><div className="inventory-history-list">{stockHistory.length?<table><thead><tr><th>Date</th><th>Type</th><th>Product</th><th>Change</th><th>In stock</th><th>Reference</th></tr></thead><tbody>{stockHistory.slice(0,300).map(h=><tr key={h.id}><td>{new Date(h.date).toLocaleString("en-GB")}</td><td>{h.type}</td><td>{h.code} · {h.productName}</td><td className={h.change<0?"qty-negative":"qty-positive"}>{h.change>0?"+":""}{h.change}</td><td>{h.quantityAfter}</td><td>{h.reference||"—"}</td></tr>)}</tbody></table>:<div className="inventory-empty">No stock history yet.</div>}</div><div className="inventory-modal-foot"><button onClick={recalc}>Recalculate stock quantities</button><button className="secondary" onClick={()=>setModal(null)}>Close</button></div></div></div>}
 </section>
}
function Customers({customers,addCustomer,setCustomers,sales}){
 const empty={name:"",code:"",taxNumber:"",streetName:"",buildingNumber:"",additionalStreetName:"",plotIdentification:"",district:"",postalCode:"",city:"",state:"",country:"Malaysia",phone:"",email:"",vehicleNumber:"",enabled:true,isCustomer:true,isSupplier:false,taxExempt:false,dueDatePeriod:0,discount:0,loyaltyCard:""};
 const [search,setSearch]=useState(""); const [kind,setKind]=useState("All"); const [editing,setEditing]=useState(null); const [selectedCustomerId,setSelectedCustomerId]=useState(null); const [form,setForm]=useState(empty); const [tab,setTab]=useState("General"); const [deleteTarget,setDeleteTarget]=useState(null);
 const rows=customers.filter(c=>{const q=search.toLowerCase();const text=[c.name,c.code,c.taxNumber,c.phone,c.email,c.city,c.country].join(" ").toLowerCase();const type=kind==="All"||(kind==="Customers"&&c.isCustomer!==false)||(kind==="Suppliers"&&c.isSupplier);return type&&text.includes(q)});
  const generateCustomerCode=()=>{
   const numbers=customers.map(c=>{const match=String(c.code||"").match(/^SP(\d{6})$/i);return match?Number(match[1]):null}).filter(Number.isFinite);
   const next=numbers.length?Math.max(...numbers)+1:0;
   return `SP${String(next).padStart(6,"0")}`;
  };
 useEffect(()=>{
  const missing=customers.some(c=>!String(c.code||"").trim());
  if(!missing)return;
  let counter=customers.map(c=>{const m=String(c.code||"").match(/^SP(\d{6})$/i);return m?Number(m[1]):-1}).reduce((a,b)=>Math.max(a,b),0);
  const next=customers.map(c=>{
   if(String(c.code||"").trim())return c;
   counter+=1;
   return {...c,code:`SP${String(counter).padStart(6,"0")}`};
  });
  save("customers",next);
  setCustomers(next);
 },[customers]);
 const openNew=()=>{setSelectedCustomerId(null);setForm({...empty,code:generateCustomerCode()});setTab("General");setEditing("new")};
 const selectCustomer=c=>{if(!c)return;setSelectedCustomerId(c.id);setEditing(null)};
 const openEdit=c=>{if(!c)return;setSelectedCustomerId(c.id);setForm({...empty,...c});setTab("General");setEditing(c.id)};
 const update=k=>e=>{
  const value=e.target.type==="checkbox"?e.target.checked:e.target.value;
  const upper=(typeof value==="string"&&e.target.type!=="number")?value.toUpperCase():value;
  setForm(f=>({...f,[k]:upper}));
 };
 const saveCustomer=e=>{e.preventDefault();if(!form.name.trim())return;const prepared={...form,name:String(form.name||"").toUpperCase(),code:form.code||generateCustomerCode()};let next;if(editing==="new") next=[...customers,{...prepared,id:uid(),visits:0,spend:0}];else next=customers.map(c=>c.id===editing?{...c,...prepared}:c);save("customers",next);setCustomers(next);setEditing(null)};
 const remove=id=>{if(id===1)return;const next=customers.filter(c=>c.id!==id);save("customers",next);setCustomers(next);setEditing(null);setSelectedCustomerId(null);setDeleteTarget(null)};
 const requestDelete=id=>{if(id===1)return;const target=customers.find(c=>c.id===id);if(target)setDeleteTarget(target)};
 const exportCsv=()=>{const head=["Code","Name","Tax Number","Street Name","Building Number","Additional Street Name","Plot Identification","District","Postcode","City","State / Province","Country","Phone","Email","Vehicle Number","Customer","Supplier","Active","Discount (%)","Due Date Period (days)","Loyalty Card"];const body=rows.map(c=>[c.code||"",c.name,c.taxNumber||"",c.streetName||"",c.buildingNumber||"",c.additionalStreetName||"",c.plotIdentification||"",c.district||"",c.postalCode||"",c.city||"",c.state||"",c.country||"",c.phone||"",c.email||"",c.vehicleNumber||"",c.isCustomer!==false?"Yes":"No",c.isSupplier?"Yes":"No",c.enabled!==false?"Yes":"No",Number(c.discount||0).toFixed(2),Number(c.dueDatePeriod||0),c.loyaltyCard||""]);const csv=[head,...body].map(row=>row.map(value=>'"'+String(value??"").replaceAll('"','""')+'"').join(";")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}));a.download="sp-manager-customers.csv";a.click();URL.revokeObjectURL(a.href)};
 return <section className="customer-master">
  <div className="customer-topbar"><div><div className="eyebrow">CUSTOMERS & SUPPLIERS</div><h2>Customer Master</h2><p>Manage customer records, contact details, discounts, loyalty and payment terms.</p></div><div className="customer-actions"><button type="button" onClick={()=>{const latest=load("customers",customers);setCustomers(latest);if(selectedCustomerId&&!latest.some(c=>c.id===selectedCustomerId))setSelectedCustomerId(null);setEditing(null);setForm({...empty});setTab("General")}}>↻ <span>Refresh</span></button><button onClick={openNew}>＋ <span>Add</span></button><button disabled={!selectedCustomerId} onClick={()=>selectedCustomerId&&openEdit(customers.find(c=>c.id===selectedCustomerId))}>✎ <span>Edit</span></button><button disabled={!selectedCustomerId||selectedCustomerId===1} onClick={()=>selectedCustomerId&&requestDelete(selectedCustomerId)}>⌫ <span>Delete</span></button><button title="Export to Excel" onClick={exportCsv}>↓ <span>Export to Excel</span></button><button onClick={()=>window.print()}>▣ <span>Print</span></button></div></div>
  <div className="customer-workspace">
   <div className="customer-list-panel"><div className="customer-list-head"><div><b>{rows.length} record(s)</b><small>Customers & suppliers</small></div><select value={kind} onChange={e=>setKind(e.target.value)}><option>All</option><option>Customers</option><option>Suppliers</option></select></div><div className="customer-search"><select><option>Name</option><option>Code</option><option>Phone</option><option>Email</option></select><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers & suppliers..."/><span>⌕</span></div><div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Code</th><th>Name</th><th>Tax number</th><th>Address</th><th>Country</th><th>Phone</th><th>Email</th><th>Status</th></tr></thead><tbody>{rows.map(c=><tr key={c.id} className={selectedCustomerId===c.id?"selected": ""} onClick={()=>selectCustomer(c)} onDoubleClick={()=>openEdit(c)}><td>{c.code||"—"}</td><td><b>{c.name}</b><small>{c.isSupplier?"Customer · Supplier":"Customer"}</small></td><td>{c.taxNumber||"(none)"}</td><td>{[c.streetName,c.buildingNumber,c.city,c.state,c.postalCode].filter(Boolean).join(", ")||"(none)"}</td><td>{c.country||"Malaysia"}</td><td>{c.phone||"(none)"}</td><td>{c.email||"(none)"}</td><td><span className={c.enabled===false?"status off":"status"}>{c.enabled===false?"Inactive":"Active"}</span></td></tr>)}</tbody></table>{!rows.length&&<div className="customer-empty">No customers found.</div>}</div></div>
   <div className="customer-summary"><div className="customer-summary-head"><div><span className="eyebrow">CUSTOMER</span><h3>{selectedCustomerId?customers.find(c=>c.id===selectedCustomerId)?.name||"Customer": "Customer details"}</h3></div><button onClick={openNew}>＋ New</button></div>{selectedCustomerId?<><div className="customer-profile"><div><b>{customers.find(c=>c.id===selectedCustomerId)?.name}</b><small>{customers.find(c=>c.id===selectedCustomerId)?.email||"No email address"}</small></div></div><div className="customer-stats"><div><b>{customers.find(c=>c.id===selectedCustomerId)?.visits||0}</b><small>Visits</small></div><div><b>{money(customers.find(c=>c.id===selectedCustomerId)?.spend||0)}</b><small>Total spend</small></div><div><b>{customers.find(c=>c.id===selectedCustomerId)?.loyaltyCard||"—"}</b><small>Loyalty card</small></div><div><b>{Number(customers.find(c=>c.id===selectedCustomerId)?.loyaltyPoints??0)}</b><small>Loyalty points</small></div></div><button className="customer-edit-main" onClick={()=>openEdit(customers.find(c=>c.id===selectedCustomerId))}>Edit customer</button></>:<div className="customer-placeholder">Select a customer from the list or click <b>+ New</b> to create a customer.</div>}</div>
  </div>
  {editing&&<div className="customer-modal-backdrop" onMouseDown={()=>setEditing(null)}><form className="customer-modal" onSubmit={saveCustomer} onMouseDown={e=>e.stopPropagation()}><div className="customer-modal-head"><div><span className="eyebrow">CUSTOMER MASTER</span><h3>{editing==="new"?"New customer / supplier":"Edit customer / supplier"}</h3></div><button type="button" onClick={()=>setEditing(null)}>×</button></div><div className="customer-tabs">{["General","Discounts","Loyalty cards","Payment terms"].map(t=><button type="button" className={tab===t?"active":""} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div><div className="customer-form-body">
   {tab==="General"&&<><div className="customer-form-section"><h4>General information</h4><div className="customer-form-grid"><label>Name*<input value={form.name} onChange={update("name")} autoFocus/></label><label>Code<input value={form.code} onChange={update("code")} readOnly/></label><label>Tax number<input value={form.taxNumber} onChange={update("taxNumber")}/></label><label>Country<select value={form.country} onChange={update("country")}><option>Malaysia</option><option>Singapore</option><option>Indonesia</option><option>Thailand</option><option>Other</option></select></label></div></div><div className="customer-form-section"><h4>Address</h4><div className="customer-form-grid"><label>Street name<input value={form.streetName} onChange={update("streetName")}/></label><label>Building number<input value={form.buildingNumber} onChange={update("buildingNumber")}/></label><label>Additional street name<input value={form.additionalStreetName} onChange={update("additionalStreetName")}/></label><label>Plot identification<input value={form.plotIdentification} onChange={update("plotIdentification")}/></label><label>District<input value={form.district} onChange={update("district")}/></label><label>Postcode<input value={form.postalCode} onChange={update("postalCode")}/></label><label>City<input value={form.city} onChange={update("city")}/></label><label>State / Province<input value={form.state} onChange={update("state")}/></label></div></div><div className="customer-form-section"><h4>Contact & status</h4><div className="customer-form-grid"><label>Phone number<input value={form.phone} onChange={update("phone")}/></label><label>Email<input type="email" value={form.email} onChange={update("email")}/></label><label>Vehicle Number<input value={form.vehicleNumber||""} onChange={update("vehicleNumber")} placeholder="e.g. VXX 1234"/></label></div><div className="customer-checks"><label><input type="checkbox" checked={!!form.enabled} onChange={update("enabled")}/> Active</label><label><input type="checkbox" checked={form.isCustomer!==false} onChange={update("isCustomer")}/> Customer</label><label><input type="checkbox" checked={!!form.isSupplier} onChange={update("isSupplier")}/> Supplier</label><label><input type="checkbox" checked={!!form.taxExempt} onChange={update("taxExempt")}/> Tax exempt</label></div></div></>}
   {tab==="Discounts"&&<div className="customer-form-section"><h4>Customer discount</h4><div className="customer-form-grid"><label>Discount (%)<input type="number" min="0" max="100" value={form.discount} onChange={update("discount")}/></label></div><p className="customer-help">Set a customer-specific discount. This can be applied to eligible sales.</p></div>}
   {tab==="Loyalty cards"&&<div className="customer-form-section"><h4>Loyalty cards</h4><div className="customer-form-grid"><label>Card number<input value={form.loyaltyCard} onChange={update("loyaltyCard")} placeholder="Scan or enter card number"/></label></div><p className="customer-help">One customer can have a loyalty card number associated with the account.</p></div>}
   {tab==="Payment terms"&&<div className="customer-form-section"><h4>Payment terms</h4><div className="customer-form-grid"><label>Due date period (days)<input type="number" min="0" value={form.dueDatePeriod} onChange={update("dueDatePeriod")}/></label></div><p className="customer-help">Use 0 for immediate payment. A positive value defines the allowed credit period.</p></div>}
  </div><div className="customer-modal-foot"><button type="button" className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button type="submit">Save customer</button></div></form></div>}
  {deleteTarget&&<div className="customer-delete-backdrop" onMouseDown={()=>setDeleteTarget(null)}><div className="customer-delete-modal" onMouseDown={e=>e.stopPropagation()}><div className="customer-delete-icon">⌫</div><div className="customer-delete-content"><h3>Delete customer?</h3><p>Are you sure you want to delete <b>{deleteTarget.name}</b>?</p><small>This action cannot be undone.</small></div><div className="customer-delete-actions"><button type="button" className="delete-no" onClick={()=>setDeleteTarget(null)}>No</button><button type="button" className="delete-yes" onClick={()=>remove(deleteTarget.id)}>Yes, delete</button></div></div></div>}
 </section>
}
function Suppliers({suppliers,setSuppliers}){
 const[form,setForm]=useState({name:"",phone:"",email:""});
 return <section className="content"><div className="grid2"><div className="panel"><h3>New Supplier</h3><form className="formgrid" onSubmit={e=>{e.preventDefault();const ns=[...suppliers,{...form,id:uid(),balance:0}];save("suppliers",ns);setSuppliers(ns);setForm({name:"",phone:"",email:""})}}>{["name","phone","email"].map(k=><input key={k} value={form[k]} placeholder={k} onChange={e=>setForm({...form,[k]:e.target.value})} required={k==="name"}/>)}<button>Add Supplier</button></form></div><div className="panel"><h3>Supplier Database</h3><Table cols={["Supplier","Phone","Email","Balance"]} rows={suppliers.map(s=>[s.name,s.phone,s.email,money(s.balance)])}/></div></div></section>
}
function Purchases({products,suppliers,receivePurchase,purchases,setPurchases,setNotice,paymentTypes}){
 const empty={supplierId:suppliers[0]?.id||"",number:"",externalDocument:"",date:new Date().toISOString().slice(0,10),dueDate:new Date().toISOString().slice(0,10),stockDate:new Date().toISOString().slice(0,16),paid:true,items:[],discount:0,discountType:"percent",paymentType:"Cash",paymentAmount:0,internalNote:"",note:""};
 const [view,setView]=useState("list");
 const [editing,setEditing]=useState(null);
 const [form,setForm]=useState(empty);
 const [tab,setTab]=useState("Document items");
 const [search,setSearch]=useState("");
 const [supplierFilter,setSupplierFilter]=useState("All suppliers");
 const [paidFilter,setPaidFilter]=useState("All transactions");
 const [selected,setSelected]=useState(null);
 const [itemSearch,setItemSearch]=useState("");
 const [itemCategory,setItemCategory]=useState("All products");
 const cats=["All products",...[...new Set(products.map(p=>p.category||p.group).filter(Boolean))]];
 const filteredPurchases=purchases.filter(x=>{
   const supplier=suppliers.find(s=>s.id===x.supplierId)?.name||"";
   const a=supplierFilter==="All suppliers"||supplier===supplierFilter;
   const b=paidFilter==="All transactions"||(paidFilter==="Paid"?x.paid!==false:x.paid===false);
   return a&&b;
 }).slice().reverse();
 const openNew=()=>{setForm({...empty,supplierId:suppliers[0]?.id||"",items:[]});setTab("Document items");setItemSearch("");setItemCategory("All products");setEditing("new");setView("editor")};
 const openEdit=p=>{setForm({...empty,...p,items:(p.items||[]).map(i=>({...i})),paymentAmount:Number(p.paymentAmount||p.total||0)});setTab("Document items");setEditing(p.id);setView("editor")};
 const addItem=p=>setForm(f=>{const found=f.items.find(i=>i.productId===p.id);return {...f,items:found?f.items.map(i=>i.productId===p.id?{...i,qty:Number(i.qty||0)+1}:i):[...f.items,{productId:p.id,qty:1,cost:Number(p.lastPurchasePrice??p.cost??0),taxRate:Number(p.taxRate||0),discount:0}]}});
 const updateItem=(id,key,val)=>setForm(f=>({...f,items:f.items.map(i=>i.productId===id?{...i,[key]:val}:i)}));
 const removeItem=id=>setForm(f=>({...f,items:f.items.filter(i=>i.productId!==id)}));
 const subtotal=form.items.reduce((sum,i)=>sum+Number(i.qty||0)*Number(i.cost||0),0);
 const discount=form.discountType==="percent"?subtotal*Number(form.discount||0)/100:Number(form.discount||0);
 const taxable=Math.max(0,subtotal-discount);
 const tax=form.items.reduce((sum,i)=>sum+Math.max(0,Number(i.qty||0)*Number(i.cost||0)-discount*(Number(i.qty||0)*Number(i.cost||0)/(subtotal||1)))*Number(i.taxRate||0)/100,0);
 const total=Math.max(0,taxable+tax);
 const savePurchase=()=>{
   if(!form.supplierId||!form.items.length)return;
   const no=form.number.trim()||"PUR-"+String(uid()).slice(-8);
   const doc={...form,id:form.id||uid(),no,number:no,date:form.date,stockDate:form.stockDate||new Date().toISOString(),total,subtotal,discount,tax,paid:Boolean(form.paid),paymentAmount:Number(form.paymentAmount||0),status:"Received",dateUpdated:new Date().toISOString()};
   const existing=purchases.find(x=>x.id===doc.id);
   if(existing){
     // Editing a received purchase is kept simple and safe: preserve stock movements already posted.
     const next=purchases.map(x=>x.id===doc.id?doc:x);persist("purchases",next,setPurchases);setNotice("Purchase document updated successfully.");
   }else{
     receivePurchase(Number(form.supplierId),form.items.map(i=>({productId:i.productId,qty:Number(i.qty),cost:Number(i.cost||0),taxRate:Number(i.taxRate||0),discount:Number(i.discount||0)})),total,doc);
   }
   setEditing(null);setView("list");
 };
 const printPurchase=p=>downloadReportPDF("Purchase-"+(p.no||p.number||p.id),["Qty","Product","Cost","Total"],(p.items||[]).map(i=>{const pr=products.find(x=>x.id===i.productId);return [i.qty,pr?.name||i.productName||"",money(i.cost||0),money(Number(i.qty||0)*Number(i.cost||0))]}));
 const visibleProducts=products.filter(p=>{const q=itemSearch.toLowerCase();const c=itemCategory==="All products"||(p.category||p.group)===itemCategory;return c&&(!q||[p.name,p.code,p.barcode,p.category,p.group].join(" ").toLowerCase().includes(q))});
 if(view==="editor") return <section className="purchase-modern purchase-editor-page">
   <div className="purchase-editor-top"><button className="back-link" onClick={()=>{setView("list");setEditing(null)}}>← Purchases</button><div><div className="eyebrow">PURCHASE DOCUMENT</div><h2>{editing==="new"?"New purchase":"Edit purchase"}</h2></div><div className="purchase-editor-actions"><button className="secondary" onClick={()=>printPurchase(form)}>Save as PDF</button><button className="secondary" onClick={()=>window.print()}>Print preview</button><button onClick={savePurchase}>Save</button></div></div>
   <div className="purchase-document-head"><div className="purchase-meta-grid"><label>Number<input value={form.number} placeholder="Auto generated" onChange={e=>setForm({...form,number:e.target.value})}/></label><label>External document<input value={form.externalDocument} onChange={e=>setForm({...form,externalDocument:e.target.value})}/></label><label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Due date<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label><label>Supplier<select value={form.supplierId} onChange={e=>setForm({...form,supplierId:e.target.value})}>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Stock date<input type="datetime-local" value={form.stockDate} onChange={e=>setForm({...form,stockDate:e.target.value})}/></label></div><label className="purchase-paid"><input type="checkbox" checked={!!form.paid} onChange={e=>setForm({...form,paid:e.target.checked})}/> Paid</label></div>
   <div className="purchase-tabs">{["Document items","Payments"].map(t=><button className={tab===t?"active":""} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div>
   {tab==="Document items"?<div className="purchase-builder"><div className="purchase-product-picker"><div className="picker-toolbar"><b>Products</b><input placeholder="Product name, code or barcode..." value={itemSearch} onChange={e=>setItemSearch(e.target.value)}/></div><div className="purchase-category-row">{cats.map(c=><button className={itemCategory===c?"active":""} key={c} onClick={()=>setItemCategory(c)}>{c}</button>)}</div><div className="purchase-product-list">{visibleProducts.map(p=><button key={p.id} onClick={()=>addItem(p)}><div><b>{p.name}</b><small>{p.code||"-"} · {p.category||p.group||"-"}</small></div><strong>{money(p.lastPurchasePrice??p.cost??0)}</strong></button>)}</div></div><div className="purchase-items-panel"><div className="panel-title"><div><h3>Document items</h3><small>{form.items.length} item(s)</small></div></div><div className="purchase-items-table"><table><thead><tr><th>Code</th><th>Name</th><th>Unit</th><th>Quantity</th><th>Cost price</th><th>Tax %</th><th>Discount</th><th>Total</th><th></th></tr></thead><tbody>{form.items.map(i=>{const p=products.find(x=>x.id===i.productId);return <tr key={i.productId}><td>{p?.code||"-"}</td><td><b>{p?.name||i.productName||"Product"}</b></td><td>{p?.unit||"pcs"}</td><td><input className="table-input" type="number" min="0.001" step="0.001" value={i.qty} onChange={e=>updateItem(i.productId,"qty",e.target.value)}/></td><td><input className="table-input" type="number" min="0" step="0.01" value={i.cost} onChange={e=>updateItem(i.productId,"cost",e.target.value)}/></td><td><input className="table-input short" type="number" min="0" step="0.01" value={i.taxRate||0} onChange={e=>updateItem(i.productId,"taxRate",e.target.value)}/></td><td><input className="table-input short" type="number" min="0" step="0.01" value={i.discount||0} onChange={e=>updateItem(i.productId,"discount",e.target.value)}/></td><td>{money(Number(i.qty||0)*Number(i.cost||0))}</td><td><button className="smallbtn" onClick={()=>removeItem(i.productId)}>Delete</button></td></tr>})}</tbody></table>{!form.items.length&&<div className="purchase-empty">Select products from the left to add them to this purchase.</div>}</div><div className="purchase-summary"><div className="purchase-discount"><select value={form.discountType} onChange={e=>setForm({...form,discountType:e.target.value})}><option value="percent">Discount percent</option><option value="fixed">Discount amount</option></select><input type="number" min="0" step="0.01" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})}/></div><div><span>Total before tax</span><b>{money(subtotal)}</b></div><div><span>Tax</span><b>{money(tax)}</b></div><div className="grand"><span>Total</span><b>{money(total)}</b></div></div><div className="purchase-notes"><label>Internal note<textarea value={form.internalNote} onChange={e=>setForm({...form,internalNote:e.target.value})}/></label><label>Note<textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label></div></div></div>
   :<div className="purchase-payments"><div className="payment-card"><h3>Payments</h3><label>Payment type<select value={form.paymentType} onChange={e=>setForm({...form,paymentType:e.target.value})}>{paymentTypes.filter(x=>x.enabled).sort((a,b)=>a.position-b.position).map(x=><option key={x.id}>{x.name}</option>)}</select></label><label>Amount<input type="number" min="0" step="0.01" value={form.paymentAmount} onChange={e=>setForm({...form,paymentAmount:e.target.value})}/></label><div className="payment-total"><span>Document total</span><b>{money(total)}</b></div><p className="muted">Payment records are linked to this purchase document. A purchase may remain unpaid when credit terms are used.</p></div></div>}
   <div className="purchase-bottom-actions"><button className="secondary" onClick={()=>{setView("list");setEditing(null)}}>Cancel</button><button onClick={savePurchase}>Save purchase</button></div>
 </section>;
 return <section className="purchase-modern"><div className="purchase-toolbar"><div><div className="eyebrow">MANAGEMENT · PURCHASES</div><h2>Purchases</h2><p>Purchase documents, goods received, supplier records and stock movements.</p></div><div className="purchase-actions"><button onClick={()=>{const latest=load("purchases",purchases);setPurchases(latest);if(selected&&!latest.some(x=>x.id===selected.id))setSelected(null)}}>↻<span>Refresh</span></button><button onClick={openNew}>＋<span>Add</span></button><button disabled={!selected} onClick={()=>selected&&openEdit(selected)}>✎<span>Edit</span></button><button disabled={!selected} onClick={()=>{if(selected){const n=purchases.filter(x=>x.id!==selected.id);persist("purchases",n,setPurchases);setSelected(null);}}}>⌫<span>Delete</span></button><button disabled={!selected} onClick={()=>selected&&printPurchase(selected)}>▣<span>Print</span></button></div></div><div className="purchase-filterbar"><select value={supplierFilter} onChange={e=>setSupplierFilter(e.target.value)}><option>All suppliers</option>{suppliers.map(s=><option key={s.id}>{s.name}</option>)}</select><select value={paidFilter} onChange={e=>setPaidFilter(e.target.value)}><option>All transactions</option><option>Paid</option><option>Unpaid</option></select><input placeholder="Search document, supplier or product..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="purchase-list-card"><div className="purchase-list-head"><b>Purchases ({filteredPurchases.length})</b><span>Goods received are posted to Inventory automatically.</span></div><div className="purchase-table-wrap"><table><thead><tr><th></th><th>Number</th><th>External document</th><th>Document type</th><th>Paid</th><th>Supplier</th><th>Date</th><th>Stock date</th><th>Discount</th><th>Tax</th><th>Total</th><th>Internal note</th></tr></thead><tbody>{filteredPurchases.filter(x=>!search||[x.no,x.number,x.externalDocument,suppliers.find(s=>s.id===x.supplierId)?.name,...(x.items||[]).map(i=>products.find(p=>p.id===i.productId)?.name)].join(" ").toLowerCase().includes(search.toLowerCase())).map(x=><tr key={x.id} className={selected?.id===x.id?"selected":""} onClick={()=>setSelected(x)} onDoubleClick={()=>openEdit(x)}><td><input type="checkbox" checked={selected?.id===x.id} readOnly/></td><td><b>{x.no||x.number}</b></td><td>{x.externalDocument||"—"}</td><td>Purchase</td><td>{x.paid!==false?"Yes":"No"}</td><td>{suppliers.find(s=>s.id===x.supplierId)?.name||"—"}</td><td>{x.date?new Date(x.date).toLocaleDateString("en-GB"):"—"}</td><td>{x.stockDate?new Date(x.stockDate).toLocaleString("en-GB"):"—"}</td><td>{money(x.discount)}</td><td>{money(x.tax)}</td><td><b>{money(x.total)}</b></td><td>{x.internalNote||"—"}</td></tr>)}</tbody></table>{!filteredPurchases.length&&<div className="purchase-empty">No purchase documents found.</div>}</div></div><div className="purchase-item-card"><div className="purchase-list-head"><b>Document items ({selected?.items?.length||0})</b><span>{selected?selected.no:"Select a purchase document"}</span></div>{selected?<table><thead><tr><th>ID</th><th>Code</th><th>Name</th><th>Unit of measure</th><th>Quantity</th><th>Cost price</th><th>Tax</th><th>Price</th><th>Total before discount</th><th>Discount</th><th>Total</th></tr></thead><tbody>{(selected.items||[]).map((i,n)=>{const p=products.find(x=>x.id===i.productId);const line=Number(i.qty||0)*Number(i.cost||0);return <tr key={i.productId||n}><td>{n+1}</td><td>{p?.code||"-"}</td><td>{p?.name||i.productName||"-"}</td><td>{p?.unit||"pcs"}</td><td>{i.qty}</td><td>{money(i.cost)}</td><td>{money(i.taxRate||0)}%</td><td>{money(i.cost)}</td><td>{money(line)}</td><td>{money(i.discount||0)}</td><td>{money(line)}</td></tr>})}</tbody></table>:<div className="purchase-empty">Select a document to view its items.</div>}</div></section>
}

function PaymentTypes({paymentTypes,setPaymentTypes,onRefresh}){
 const[editing,setEditing]=useState(null);
 const[form,setForm]=useState(null);
 const ordered=[...paymentTypes].sort((a,b)=>a.position-b.position);
 const openNew=()=>{setForm({name:"",code:"",position:(ordered.length?Math.max(...ordered.map(x=>x.position)):0)+1,enabled:true,quickPayment:true,customerRequired:false,changeAllowed:true,markPaid:true,printReceipt:true,shortcutKey:"",openCashDrawer:false});setEditing("new")};
 const openEdit=x=>{setForm({...x});setEditing(x.id)};
 const saveForm=e=>{e.preventDefault();if(!form.name.trim())return;const clean={...form,name:form.name.trim(),position:Math.max(1,Number(form.position||1))};const next=editing==="new"?[...paymentTypes,{...clean,id:uid()}]:paymentTypes.map(x=>x.id===editing?clean:x);setPaymentTypes(next);setEditing(null);setForm(null)};
 const remove=()=>{
  if(editing==="new"||!form)return;
  if(paymentTypes.length<=1)return;
  if(window.confirm("Delete this payment type? Existing transactions may depend on it.")){setPaymentTypes(paymentTypes.filter(x=>x.id!==form.id));setEditing(null);setForm(null)}
 };
 return <section className="payment-types-modern">
  <div className="payment-types-top"><div><div className="eyebrow">MANAGEMENT</div><h2>Payment Types</h2><p>Configure payment methods used by POS, sales, receipts and credit transactions.</p></div><div className="payment-types-actions"><button type="button" onClick={()=>onRefresh?.()}>↻<span>Refresh</span></button><button onClick={openNew}>＋<span>New payment type</span></button><button disabled={!form} onClick={()=>form&&openEdit(form)}>✎<span>Edit</span></button><button disabled={!form||editing==="new"} onClick={remove}>⌫<span>Delete</span></button><button onClick={()=>window.print()}>▣<span>Print</span></button><button onClick={()=>alert("Payment Types control how each payment method behaves in POS. Use Quick payment for one-click POS buttons.")}>?<span>Help</span></button></div></div>
  <div className="payment-types-layout">
   <div className="payment-types-table panel"><div className="payment-types-count"><b>{ordered.length}</b><span>payment type(s)</span></div><div className="table"><table><thead><tr><th>Name</th><th>Position</th><th>Code</th><th>Enabled</th><th>Quick payment</th><th>Customer required</th><th>Change allowed</th><th>Mark transaction as paid</th><th>Print receipt</th><th>Shortcut key</th><th>Cash drawer</th></tr></thead><tbody>{ordered.map(x=><tr key={x.id} className={form?.id===x.id?"selected-row":""} onClick={()=>{setForm(x);setEditing(x.id)}}><td><b>{x.name}</b></td><td>{x.position}</td><td>{x.code||"—"}</td><td>{x.enabled?"✓":"—"}</td><td>{x.quickPayment?"✓":"—"}</td><td>{x.customerRequired?"✓":"—"}</td><td>{x.changeAllowed?"✓":"—"}</td><td>{x.markPaid?"✓":"—"}</td><td>{x.printReceipt?"✓":"—"}</td><td>{x.shortcutKey?`Ctrl+${x.shortcutKey}`:"—"}</td><td>{x.openCashDrawer?"✓":"—"}</td></tr>)}</tbody></table></div></div>
   <div className="payment-types-info panel"><div className="eyebrow">PAYMENT TYPE</div><h3>{form?form.name||"New payment type":"Select a payment type"}</h3>{form?<div className="payment-preview"><div><b>{form.markPaid?"Paid transaction":"Credit / Unpaid"}</b><span>{form.quickPayment?"Quick payment enabled":"Manual payment only"}</span></div><div><b>{form.changeAllowed?"Change allowed":"Change not allowed"}</b><span>{form.customerRequired?"Customer required":"Customer optional"}</span></div><div><b>{form.printReceipt?"Receipt enabled":"Receipt disabled"}</b><span>{form.openCashDrawer?"Cash drawer opens":"Cash drawer stays closed"}</span></div></div>:<p className="muted">Select a row to edit, or click New payment type.</p>}</div>
  </div>
  {editing&&form&&<div className="payment-type-modal-backdrop" onMouseDown={()=>{setEditing(null);setForm(null)}}><form className="payment-type-modal" onSubmit={saveForm} onMouseDown={e=>e.stopPropagation()}><div className="payment-type-modal-head"><div><span className="eyebrow">PAYMENT TYPE</span><h3>{editing==="new"?"New payment type":"Edit payment type"}</h3></div><button type="button" onClick={()=>{setEditing(null);setForm(null)}}>×</button></div><div className="payment-type-form"><div className="payment-type-fields"><label>Name*<input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Code<input value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label><label>Shortcut key<input maxLength="1" value={form.shortcutKey} onChange={e=>setForm({...form,shortcutKey:e.target.value.toUpperCase()})}/><small>Used as Ctrl + key in POS.</small></label><label>Position<input type="number" min="1" value={form.position} onChange={e=>setForm({...form,position:e.target.value})}/><small>Lower position appears first and becomes the default payment.</small></label></div><div className="payment-switch-grid">{[["enabled","Enabled"],["quickPayment","Quick payment"],["customerRequired","Customer required"],["printReceipt","Print receipt"],["changeAllowed","Change allowed"],["markPaid","Mark transaction as paid"],["openCashDrawer","Open cash drawer"]].map(([k,l])=><label className="payment-switch" key={k}><input type="checkbox" checked={!!form[k]} onChange={e=>setForm({...form,[k]:e.target.checked})}/><span></span>{l}</label>)}</div><div className="payment-type-help"><b>POS behaviour</b><p>Quick payment adds this method to the POS quick-payment buttons. If Mark transaction as paid is off, the sale is treated as unpaid/credit. Customer required forces a customer before completing the sale. Change allowed controls whether change can be calculated for this method.</p></div></div><div className="payment-type-modal-foot"><button type="button" className="secondary" onClick={()=>{setEditing(null);setForm(null)}}>Cancel</button><button type="submit">Save</button></div></form></div>}
 </section>
}

function Payments({sales,emailReceipt,company,customers,settings}){return <section className="content"><div className="panel"><div className="toolbar"><div><h3>Payments / Receipt</h3><small>Sales history, receipt PDF and customer email</small></div></div><Table cols={["Document","Date","Payment Type","Amount","Status","Receipt"]} rows={sales.slice().reverse().map(s=>[s.no,new Date(s.date).toLocaleString(),s.payment,money(s.total),s.refunded?"Refunded":s.voided?"Voided":"Paid",<span className="actions"><button onClick={()=>printInvoice(s,company,customers,settings)}>Invoice</button><button onClick={()=>downloadReportPDF("Receipt-"+s.no,["Qty","Description","Amount"],s.items.map(i=>[i.qty,i.name,money(i.price*i.qty)]))}>PDF</button><button onClick={()=>emailReceipt(s)}>Email</button></span>])}/></div></section>}
function RefundVoid({sales,refund,voidSale}){return <section className="content"><div className="panel"><h3>Refund / Void</h3><Table cols={["Document","Date","Total","Status","Action"]} rows={sales.slice().reverse().map(s=>[s.no,new Date(s.date).toLocaleString(),money(s.total),s.refunded?"Refunded":s.voided?"Voided":"Completed",<span className="actions">{!s.refunded&&!s.voided&&<><button onClick={()=>refund(s.id)}>Refund</button><button onClick={()=>voidSale(s.id)}>Void</button></>}</span>])}/></div></section>}
function Promotions({promos,savePromo,products,categories,productGroups,onRefresh}){
 const blank={id:null,name:"",active:true,startDate:"",startTime:"",endDate:"",endTime:"",daysOfWeek:[0,1,2,3,4,5,6],items:[]};
 const[editing,setEditing]=useState(null); const[productFilter,setProductFilter]=useState(""); const[tree,setTree]=useState("All Products");
 const openNew=()=>setEditing({...blank});
 const openEdit=p=>setEditing({...blank,...p,items:(p.items||[]).map(i=>({...i})),daysOfWeek:p.daysOfWeek||[0,1,2,3,4,5,6]});
 const toggleProduct=id=>setEditing(e=>{const has=e.items.some(i=>i.productId===id);return {...e,items:has?e.items.filter(i=>i.productId!==id):[...e.items,{productId:id,priceType:"discount",value:0,conditional:false,quantity:0,quantityLimit:0}]}});
 const updateItem=(id,key,val)=>setEditing(e=>({...e,items:e.items.map(i=>i.productId===id?{...i,[key]:val}:i)}));
 const filtered=products.filter(p=>{const q=productFilter.toLowerCase();const group=tree==="All Products"||p.category===tree||p.group===tree;return group&&(!q||[p.name,p.code,p.barcode,p.group,p.category].join(" ").toLowerCase().includes(q))});
 const save=()=>{if(!editing.name.trim())return; if(!editing.items.length)return; savePromo({...editing,daysOfWeek:[...editing.daysOfWeek],items:editing.items.map(i=>({...i,value:Number(i.value||0),quantity:Number(i.quantity||0),quantityLimit:Number(i.quantityLimit||0)}))});setEditing(null)};
 const remove=p=>{if(!window.confirm(`Are you sure you want to delete promotion "${p.name}"?`))return;const next=promos.filter(x=>x.id!==p.id);localStorage.setItem("sp_promos",JSON.stringify(next));window.location.reload()};
 return <section className="promotion-modern">
  <div className="promotion-toolbar"><div><div className="eyebrow">LOYALTY / PROMOTIONS</div><h2>Promotions</h2><p>Create time-based discounts, fixed prices and quantity conditions.</p></div><div className="promotion-actions"><button type="button" onClick={()=>onRefresh?.()}>↻<span>Refresh</span></button><button onClick={openNew}>＋<span>Add promotion</span></button><button disabled={!editing} onClick={()=>editing&&save()}>✎<span>Edit</span></button><button disabled={!editing} onClick={()=>editing&&remove(editing)}>⌫<span>Delete</span></button><button onClick={()=>alert("Promotions can be scheduled by date, time and day, with product-level discounts, fixed prices and quantity conditions.")}>?<span>Help</span></button></div></div>
  <div className="promotion-list-panel"><div className="promotion-list-head"><div><b>{promos.length} promotion(s)</b><small>Promotion rules and schedules</small></div></div>{promos.length?<div className="promotion-table-wrap"><table className="promotion-table"><thead><tr><th></th><th>Name</th><th>Days of week</th><th>Start</th><th>End</th><th>Status</th></tr></thead><tbody>{promos.map(p=><tr key={p.id} className={editing?.id===p.id?"selected":""} onClick={()=>setEditing({...blank,...p})} onDoubleClick={()=>openEdit(p)}><td><input type="checkbox" checked={p.active!==false} readOnly/></td><td><b>{p.name}</b><small>{(p.items||[]).length} item(s)</small></td><td>{p.daysOfWeek?.length===7||!p.daysOfWeek?"All days":p.daysOfWeek.map(d=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")}</td><td>{p.startDate||"—"} {p.startTime||""}</td><td>{p.endDate||"—"} {p.endTime||""}</td><td><span className={p.active===false?"promo-status off":"promo-status"}>{p.active===false?"Disabled":"Enabled"}</span></td></tr>)}</tbody></table></div>:<div className="promotion-empty"><div className="promotion-empty-icon">◉</div><h3>No promotions</h3><button onClick={openNew}>Create new promotion</button></div>}</div>
  {editing&&<div className="promotion-modal-backdrop" onMouseDown={()=>setEditing(null)}><div className="promotion-modal" onMouseDown={e=>e.stopPropagation()}><div className="promotion-modal-head"><div><span className="eyebrow">PROMOTION MASTER</span><h3>{editing.id?`Edit promotion "${editing.name}"`:"New promotion"}</h3></div><button onClick={()=>setEditing(null)}>×</button></div><div className="promotion-form-top"><label>Promotion name<input autoFocus value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label className="toggle-label"><input type="checkbox" checked={editing.active!==false} onChange={e=>setEditing({...editing,active:e.target.checked})}/> Active</label></div><div className="promotion-schedule"><div className="promotion-fieldset"><h4>Schedule</h4><div className="promotion-grid"><label>Start date<input type="date" value={editing.startDate} onChange={e=>setEditing({...editing,startDate:e.target.value})}/></label><label>Start time<input type="time" value={editing.startTime} onChange={e=>setEditing({...editing,startTime:e.target.value})}/></label><label>End date<input type="date" value={editing.endDate} onChange={e=>setEditing({...editing,endDate:e.target.value})}/></label><label>End time<input type="time" value={editing.endTime} onChange={e=>setEditing({...editing,endTime:e.target.value})}/></label></div><div className="days-row"><b>Days of week</b>{[[0,"Sun"],[1,"Mon"],[2,"Tue"],[3,"Wed"],[4,"Thu"],[5,"Fri"],[6,"Sat"]].map(([d,n])=><label key={d}><input type="checkbox" checked={editing.daysOfWeek.includes(d)} onChange={()=>setEditing(e=>({...e,daysOfWeek:e.daysOfWeek.includes(d)?e.daysOfWeek.filter(x=>x!==d):[...e.daysOfWeek,d]}))}/>{n}</label>)}</div></div></div><div className="promotion-builder"><div className="promotion-product-picker"><div className="promotion-picker-head"><h4>Products</h4><input placeholder="Search product..." value={productFilter} onChange={e=>setProductFilter(e.target.value)}/></div><div className="promotion-category-tabs"><button className={tree==="All Products"?"active":""} onClick={()=>setTree("All Products")}>All Products</button>{categories.map(c=><button key={c} className={tree===c?"active":""} onClick={()=>setTree(c)}>{c}</button>)}</div><div className="promotion-products">{filtered.map(p=><button key={p.id} className={editing.items.some(i=>i.productId===p.id)?"chosen":""} onClick={()=>toggleProduct(p.id)}><span>{editing.items.some(i=>i.productId===p.id)?"✓":"＋"}</span><div><b>{p.name}</b><small>{p.code} · {p.group||p.category} · {money(p.price)}</small></div></button>)}</div></div><div className="promotion-items"><div className="promotion-items-head"><div><h4>Promotion items</h4><small>{editing.items.length} item(s) added</small></div></div>{editing.items.length?editing.items.map(i=>{const p=products.find(x=>x.id===i.productId);return <div className="promotion-item" key={i.productId}><div className="promotion-item-title"><b>{p?.name||"Product"}</b><button onClick={()=>toggleProduct(i.productId)}>Remove</button></div><div className="promotion-item-grid"><label>Price type<select value={i.priceType} onChange={e=>updateItem(i.productId,"priceType",e.target.value)}><option value="discount">Discount</option><option value="fixed">Fixed price</option></select></label><label>Value<input type="number" min="0" step="0.01" value={i.value} onChange={e=>updateItem(i.productId,"value",e.target.value)}/></label></div><label className="condition-row"><input type="checkbox" checked={!!i.conditional} onChange={e=>updateItem(i.productId,"conditional",e.target.checked)}/> Conditional quantity</label>{i.conditional&&<div className="promotion-item-grid"><label>Required quantity<input type="number" min="1" value={i.quantity||0} onChange={e=>updateItem(i.productId,"quantity",e.target.value)}/></label><label>Apply to next quantity limit<input type="number" min="0" value={i.quantityLimit||0} onChange={e=>updateItem(i.productId,"quantityLimit",e.target.value)}/></label></div>}</div>}) : <div className="promotion-no-items">Select products from the left to add them to this promotion.</div>}</div></div><div className="promotion-modal-foot"><button className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button onClick={save}>Save promotion</button></div></div></div>}
 </section>
}
function Tax({rate,setRate}){const[v,setV]=useState(rate);return <section className="content"><div className="panel narrow"><h3>Tax Configuration</h3><p>Set the default tax rate applied to POS sales.</p><input type="number" value={v} min="0" onChange={e=>setV(e.target.value)}/><button onClick={()=>setRate(+v)}>Save Tax Rate</button></div></section>}
function Loyalty({customers,setCustomers}){
 const[search,setSearch]=useState("");
 const[selectedId,setSelectedId]=useState(null);
 const[cardNumber,setCardNumber]=useState("");
 const ranking=[...customers].sort((a,b)=>Number(b.spend||0)-Number(a.spend||0));
 const visible=ranking.filter(c=>(c.name+" "+(c.phone||"")+" "+(c.loyaltyCard||"")).toLowerCase().includes(search.toLowerCase()));
 const selected=customers.find(c=>c.id===selectedId);
 const selectCustomer=c=>{setSelectedId(c.id);setCardNumber(c.loyaltyCard||"")};
 const saveCard=()=>{if(!selected)return;const value=cardNumber.trim();const duplicate=customers.some(c=>c.id!==selected.id&&value&&c.loyaltyCard===value);if(duplicate)return;const next=customers.map(c=>c.id===selected.id?{...c,loyaltyCard:value}:c);save("customers",next);setCustomers(next)};
 return <section className="loyalty-modern">
  <div className="loyalty-topbar"><div><div className="eyebrow">CUSTOMER LOYALTY</div><h2>Loyalty</h2><p>Manage loyalty cards and customer reward points.</p></div><div className="loyalty-stats"><div><b>{customers.filter(c=>c.loyaltyCard).length}</b><span>Cards assigned</span></div><div><b>{customers.length}</b><span>Customers</span></div></div></div>
  <div className="loyalty-workspace">
   <div className="loyalty-ranking panel"><div className="loyalty-panel-head"><div><h3>Customer ranking</h3><small>Points are earned at 1 point per RM1 on paid sales.</small></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer or card..."/></div><div className="loyalty-table-wrap"><table><thead><tr><th>Customer</th><th>Visits</th><th>Spend</th><th>Points</th><th>Loyalty card</th></tr></thead><tbody>{visible.map((c,i)=><tr key={c.id} className={selectedId===c.id?"selected":""} onClick={()=>selectCustomer(c)}><td><span className="loyalty-rank">{i+1}</span><b>{c.name}</b></td><td>{c.visits||0}</td><td>{money(c.spend)}</td><td>{Number(c.loyaltyPoints??Math.floor(Number(c.spend||0)))}</td><td>{c.loyaltyCard||<span className="loyalty-unassigned">Not assigned</span>}</td></tr>)}</tbody></table>{!visible.length&&<Empty text="No customers found."/>}</div></div>
   <div className="loyalty-card-panel panel"><div className="loyalty-panel-head"><div><h3>Loyalty card</h3><small>One card can be assigned to a customer.</small></div></div>{selected?<><div className="loyalty-selected"><span className="loyalty-avatar">{selected.name.slice(0,1).toUpperCase()}</span><div><b>{selected.name}</b><small>{selected.email||"No email address"}</small><small>Points: <b>{Number(selected.loyaltyPoints??Math.floor(Number(selected.spend||0)))}</b></small></div></div><label className="loyalty-card-field">Card number<input value={cardNumber} onChange={e=>setCardNumber(e.target.value)} placeholder="Scan or enter card number"/></label><div className="loyalty-card-actions"><button className="secondary" onClick={()=>{setCardNumber("");const next=customers.map(c=>c.id===selected.id?{...c,loyaltyCard:""}:c);save("customers",next);setCustomers(next)}} disabled={!selected.loyaltyCard}>Clear card</button><button onClick={saveCard}>Save card</button></div></>:<div className="loyalty-placeholder">Select a customer to assign or update a loyalty card.</div>}</div>
  </div>
 </section>
}
function Users({users,setUsers,activeUser,setCurrentUser}){
 const[editing,setEditing]=useState(null);const[showPassword,setShowPassword]=useState(false);
 const blank={name:"",username:"",role:"Cashier",enabled:true,password:"",permissions:{...CASHIER_PERMISSIONS}};
 const begin=u=>{setEditing({...u,password:u.password||"",permissions:{...CASHIER_PERMISSIONS,...(u.permissions||{}),...(u.role==="Administrator"?ALL_PERMISSIONS:{})}});setShowPassword(false)};
 const saveUser=()=>{if(!editing?.name?.trim()||!editing?.username?.trim()||(!editing.id&&!editing.password)){alert("Name, username and password are required.");return}const next={...editing,name:editing.name.trim(),username:editing.username.trim().toLowerCase(),password:editing.password||"",permissions:editing.role==="Administrator"?{...ALL_PERMISSIONS}:{...editing.permissions}};const out=next.id?users.map(u=>u.id===next.id?next:u):[...users,{...next,id:uid()}];setUsers(out);setEditing(null)};
 const remove=u=>{if(u.role==="Administrator"&&users.filter(x=>x.role==="Administrator"&&x.enabled).length<=1){alert("At least one enabled Administrator must remain.");return}if(window.confirm("Delete user "+u.name+"?"))setUsers(users.filter(x=>x.id!==u.id))};
 return <section className="users-modern"><div className="users-topbar"><div><div className="eyebrow">SECURITY & ACCESS</div><h2>Users & Permissions</h2><p>Control which users can access Management functions.</p></div><button className="users-add" onClick={()=>{setEditing({...blank});setShowPassword(false)}}>＋ Add user</button></div>
 <div className="users-role-note"><b>Administrator</b><span>Full access to all functions.</span><b>Cashier</b><span>POS-focused access with controlled Management permissions.</span></div>
 <div className="users-table panel"><table><thead><tr><th>User</th><th>Username</th><th>Role</th><th>Status</th><th>Management access</th><th>Actions</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><b>{u.name}</b></td><td>{u.username}</td><td><span className={"role-badge "+u.role.toLowerCase()}>{u.role}</span></td><td><span className={u.enabled?"status-on":"status-off"}>{u.enabled?"Enabled":"Disabled"}</span></td><td>{u.role==="Administrator"?"Full access":PERMISSION_KEYS.filter(k=>u.permissions?.[k]).length+" permissions"}</td><td><button onClick={()=>begin(u)}>Edit</button><button className="danger" onClick={()=>remove(u)}>Delete</button></td></tr>)}</tbody></table></div>
 {editing&&<div className="users-modal-backdrop"><div className="users-modal"><div className="users-modal-head"><div><div className="eyebrow">USER ACCOUNT</div><h3>{editing.id?"Edit user":"Add user"}</h3></div><button onClick={()=>setEditing(null)}>×</button></div><div className="users-form-grid"><label>Name<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label>Username<input value={editing.username} onChange={e=>setEditing({...editing,username:e.target.value})}/></label><label>Role<select value={editing.role} onChange={e=>setEditing({...editing,role:e.target.value,permissions:e.target.value==="Administrator"?{...ALL_PERMISSIONS}:{...CASHIER_PERMISSIONS}})}><option>Administrator</option><option>Manager</option><option>Cashier</option><option>Staff</option></select></label><label>Password<div className="password-input"><input type={showPassword?"text":"password"} value={editing.password||""} onChange={e=>setEditing({...editing,password:e.target.value})} placeholder={editing.id?"Leave unchanged":"Enter password"}/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?"Hide":"Show"}</button></div></label><label className="user-enabled">Enabled<input type="checkbox" checked={!!editing.enabled} onChange={e=>setEditing({...editing,enabled:e.target.checked})}/></label></div><h4>Permissions</h4><div className="permission-grid">{PERMISSION_KEYS.map(k=><label key={k} className={editing.role==="Administrator"?"permission-locked":""}><input type="checkbox" checked={editing.role==="Administrator"||!!editing.permissions?.[k]} disabled={editing.role==="Administrator"} onChange={e=>setEditing({...editing,permissions:{...editing.permissions,[k]:e.target.checked}})}/><span>{PERMISSION_LABELS[k]}</span></label>)}</div><div className="users-modal-actions"><button className="settings-cancel" onClick={()=>setEditing(null)}>Cancel</button><button className="settings-save" onClick={saveUser}>✓ Save user</button></div></div></div>}
 </section>
}
function Settings({settings,setSettings,businessDay,toggleBusiness,taxRate,setTaxRate,company,onCancel}){
 const [tab,setTab]=useState("General");
 const [printTab,setPrintTab]=useState("Printer selection");
 const [printOperation,setPrintOperation]=useState("receipt");
 const [draft,setDraft]=useState(settings);
 const [notice,setNotice]=useState("");
 useEffect(()=>setDraft(settings),[settings]);
 useEffect(()=>{if(!notice)return;const ms=Math.max(1,Number(settings?.general?.messageDuration||5))*1000;const t=setTimeout(()=>setNotice(""),ms);return()=>clearTimeout(t)},[notice,settings?.general?.messageDuration]);
 const patch=(section,key,value)=>setDraft(d=>({...d,[section]:{...d[section],[key]:value}}));
 const patchNested=(section,key,value)=>setDraft(d=>({...d,[section]:{...d[section],buttonBar:{...d[section].buttonBar,[key]:value}}}));
 const backup=()=>{const data={createdAt:new Date().toISOString(),data:{}};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith("sp_"))data.data[k]=localStorage.getItem(k)};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="SP-Manager-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);setDraft(d=>({...d,database:{...d.database,lastBackup:new Date().toISOString()}}));setNotice("Database backup exported successfully.")};
 const restore=e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const obj=JSON.parse(r.result);const data=obj.data||obj;if(!data||typeof data!=="object")throw Error();Object.entries(data).forEach(([k,v])=>{if(k.startsWith("sp_"))localStorage.setItem(k,v)});setNotice("Backup restored. Reloading application...");setTimeout(()=>location.reload(),800)}catch{setNotice("Invalid SP-Manager backup file.")}};r.readAsText(file)};
 const tabs=["General","Order & payment","Products","Documents","Weighing scale","Customer display","Email","Print","Hardware","Database","License","About"];
 const Toggle=({checked,onChange})=><input type="checkbox" checked={!!checked} onChange={e=>onChange(e.target.checked)}/>;
 const general=draft.general||{},order=draft.order||{},prod=draft.products||{},doc=draft.documents||{},w=draft.weighing||{},cd=draft.customerDisplay||{},email=draft.email||{},pr=draft.print||{},db=draft.database||{},hw=draft.hardware||{};
 const prt=pr;
 const [hardwareStatus,setHardwareStatus]=useState(null); const [printers,setPrinters]=useState([]); const [hardwareRefreshing,setHardwareRefreshing]=useState(false); const [autoStartInstalling,setAutoStartInstalling]=useState(false);
 const [printSettingsOpen,setPrintSettingsOpen]=useState(false);
 const [printDialogTab,setPrintDialogTab]=useState("General");
 const [printSettingsSnapshot,setPrintSettingsSnapshot]=useState(null);
 const openPrintSettings=(key)=>{setPrintOperation(key);setPrintDialogTab("General");setPrintSettingsSnapshot({print:JSON.parse(JSON.stringify(pr||{})),hardware:JSON.parse(JSON.stringify(hw||{}))});setPrintSettingsOpen(true)};
 const cancelPrintSettings=()=>{if(printSettingsSnapshot){setDraft(d=>({...d,print:printSettingsSnapshot.print,hardware:printSettingsSnapshot.hardware}))}setPrintSettingsOpen(false);setPrintSettingsSnapshot(null)};
 const savePrintSettingsDialog=()=>{setPrintSettingsOpen(false);setPrintSettingsSnapshot(null);setNotice("Printer settings updated. Click Save to apply the changes.")};
 const revertPrintSettings=()=>{if(printSettingsSnapshot){setDraft(d=>({...d,print:printSettingsSnapshot.print,hardware:printSettingsSnapshot.hardware}));setNotice("Previously saved printer settings restored.")}};
 const refreshHardware=async(showLoading=false)=>{if(showLoading)setHardwareRefreshing(true);const base=hw.agentUrl||"http://127.0.0.1:18765";try{const x=await hardwareRequestLocal(base,"/status");setHardwareStatus(x);const p=await hardwareRequestLocal(base,"/printers");setPrinters(p.printers||[]);return x}catch(e){setHardwareStatus({connected:false,agentDetected:false,autoStartInstalled:false,printers:[]});setPrinters([]);throw e}finally{if(showLoading)setHardwareRefreshing(false)}};
 const installAutoStart=async()=>{setAutoStartInstalling(true);const base=hw.agentUrl||"http://127.0.0.1:18765";try{if(!hardwareStatus?.connected){const a=document.createElement("a");a.href=new URL((import.meta.env.BASE_URL||"/")+"RESTART-SP-MANAGER-LOCAL-AGENT.bat",window.location.origin).href;a.download="RESTART-SP-MANAGER-LOCAL-AGENT.bat";document.body.appendChild(a);a.click();a.remove();setNotice("Local Agent installer downloaded. Run the BAT file once on this Windows POS computer.");return}await hardwareRequestLocal(base,"/install-autostart",{});const x=await hardwareRequestLocal(base,"/status");setHardwareStatus(x);setNotice("Local Agent Auto-start + Auto-restart installed successfully.")}catch(e){setNotice("Local Agent install failed: "+e.message)}finally{setAutoStartInstalling(false)}};
 useEffect(()=>{if(tab!=="Hardware")return;refreshHardware();const id=setInterval(refreshHardware,5000);return()=>clearInterval(id)},[tab,hw.agentUrl]);
 const hardwareRequestLocal=async(base,path,body)=>{const r=await fetch(String(base||"http://127.0.0.1:18765").replace(/\/$/,"")+path,{method:body?"POST":"GET",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json()}catch{};if(!r.ok)throw Error((data&&data.error)||("HTTP "+r.status));return data||{ok:true}};
 const save=()=>{setSettings(draft);setNotice("Settings saved successfully.")};
 const testPrinter=()=>{const printer=pr.printerReceipt||hw.printer||pr.printer||"";if(!printer){setNotice("Select a receipt printer before printing the test page.");return}hardwareRequestLocal(hw.agentUrl,"/print",{printer,text:(pr.header?pr.header+"\n":"")+"SP-Manager\nPrinter test\n"+(pr.footer||"")+"\n",copies:Number(pr.copies||1),options:{printerType:pr.printerType,paperSize:pr.paperSize,charactersPerLine:pr.charactersPerLine,rightToLeft:pr.rightToLeft,feedLines:pr.feedLines,cutPaper:pr.cutPaper,printBitmap:pr.printBitmap,richFormatting:pr.richFormatting,printBarcode:pr.printBarcode,printLogoFullWidth:pr.printLogoFullWidth,alignment:pr.alignment,codePage:pr.codePage,characterSet:pr.characterSet,marginTop:pr.marginTop,marginRight:pr.marginRight,marginBottom:pr.marginBottom,marginLeft:pr.marginLeft,fontFamily:pr.fontFamily,fontSize:pr.fontSize}}).then(()=>setNotice("Printer test sent successfully.")).catch(e=>setNotice("Printer test failed: "+e.message))};
 const testDrawer=()=>hardwareRequestLocal(hw.agentUrl,"/cash-drawer",{printer:hw.cashDrawerPrinter||hw.printer||pr.printer,bytes:hw.cashDrawerPulse||[27,112,0,25,250]}).then(()=>setNotice("Cash drawer test sent successfully.")).catch(e=>setNotice("Cash drawer test failed: "+e.message));
 const testDisplay=()=>{const mode=cd.secondaryMonitor?"secondary":String(hw.customerDisplayMode||"COM").toLowerCase();const payload={port:cd.comPort||hw.customerDisplayPort,baud:Number(cd.baudRate||hw.customerDisplayBaud||9600),dataBits:Number(cd.dataBits||8),stopBits:Number(cd.stopBits||1),line1:cd.topLine||hw.customerDisplayTop||"WELCOME!",line2:cd.bottomLine||hw.customerDisplayBottom||"",chars:Number(cd.characters||20),mode,companyName:company?.name||"Shining Pearl Tinted",logo:company?.logo||"",items:[],total:0,currency:"RM"};const request=mode==="secondary"?hardwareRequestLocal(hw.agentUrl,"/display-window",payload):hardwareRequestLocal(hw.agentUrl,"/display",payload);request.then(result=>setNotice(mode==="secondary"?(result?.details?.windowFound===false?"Customer display opened on monitor 2, but the browser window handle was not detected. Check the second monitor.":"Customer display opened on the secondary monitor successfully."):"Customer display test sent successfully.")).catch(e=>setNotice("Customer display test failed: "+e.message));};
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
      <div className="print-info-banner"><span>ⓘ</span><div>Receipt formatting and customer-detail options, following the SP-Manager reference Print Options structure.</div></div>
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
      <div className="print-info-banner"><span>ⓘ</span><div>The selected font is used in A4 invoice and report templates. Invoice options below follow the SP-Manager reference Print templates structure.</div></div>
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
   {tab==="Hardware"&&<><h2>Local hardware</h2><p className="settings-help">SP-Manager Local Agent connects the browser to Windows printers, cash drawers and serial customer displays.</p><div className="hardware-status-card"><div className="hardware-status-head"><div><b>SP-Manager Local Agent</b><span className="settings-help">Hardware bridge</span></div><div className="hardware-head-actions"><button type="button" onClick={()=>refreshHardware(true).catch(()=>{})} disabled={hardwareRefreshing} aria-busy={hardwareRefreshing}>{hardwareRefreshing?<><span className="hardware-refresh-spinner" aria-hidden="true">↻</span> Refreshing...</>:<>↻ Refresh</>}</button><button type="button" className="hardware-install-button" onClick={installAutoStart} disabled={!!hardwareStatus?.autoStartInstalled||autoStartInstalling} title={hardwareStatus?.autoStartInstalled?"Local Agent Auto-start is already installed.":"Install Local Agent Auto-start + Auto-restart"}>{hardwareStatus?.autoStartInstalled?<>✓ Installed</>:autoStartInstalling?<>Installing...</>:<>Install</>}</button></div></div>{hardwareStatus?.connected?<div className="hardware-status-state ok"><span className="hardware-dot">●</span><div><strong>CONNECTED</strong><small>Agent is running on this POS computer · v{hardwareStatus.version||"1.1.10"}</small></div></div>:<div className="hardware-status-state error"><span className="hardware-dot">●</span><div><strong>AGENT NOT DETECTED</strong><small>Local Agent is not reachable.</small></div></div>}<div className="hardware-status-hint">{hardwareStatus?.autoStartInstalled?"Auto-start + Auto-restart is installed. You do not need to restart the Local Agent manually after Windows login.":"Install the Local Agent once, then use Install to enable Windows Auto-start + Auto-restart."}</div></div><div className="settings-grid"><Field label="Local Agent enabled"><Toggle checked={!!hw.agentEnabled} onChange={v=>patch("hardware","agentEnabled",v)}/></Field><Field label="Local Agent URL"><input value={hw.agentUrl||"http://127.0.0.1:18765"} onChange={e=>patch("hardware","agentUrl",e.target.value)}/></Field><Field label="Windows receipt printer"><select value={hw.printer||""} onChange={e=>patch("hardware","printer",e.target.value)}><option value="">Select printer</option>{printers.map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</select></Field><Field label="Cash drawer enabled"><Toggle checked={!!hw.cashDrawerEnabled} onChange={v=>patch("hardware","cashDrawerEnabled",v)}/></Field><Field label="Cash drawer printer"><select value={hw.cashDrawerPrinter||""} onChange={e=>patch("hardware","cashDrawerPrinter",e.target.value)}><option value="">Use receipt printer</option>{printers.map(x=><option key={"d"+x.name} value={x.name}>{x.name}</option>)}</select></Field><Field label="Cash drawer command"><input value={(hw.cashDrawerPulse||[27,112,0,25,250]).join(",")} onChange={e=>patch("hardware","cashDrawerPulse",e.target.value.split(",").map(x=>Number(x.trim())).filter(x=>Number.isFinite(x)))}/></Field><Field label="Customer display enabled"><Toggle checked={!!hw.customerDisplayEnabled} onChange={v=>patch("hardware","customerDisplayEnabled",v)}/></Field></div><div className="settings-database-actions"><button onClick={testPrinter}>▣ Test printer</button><button onClick={testDrawer}>▤ Test cash drawer</button><button onClick={testDisplay}>▤ Test customer display</button></div></>}
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
