from pathlib import Path
p=Path('/mnt/data/v14work/frontend/src/styles.css')
s=p.read_text()
patch=r'''

/* ============================================================
   CUSTOMER DISPLAY — V14 FINAL SPACING / FULL WIDTH SAFETY
   UI ONLY. No POS/API/database/transaction logic changes.
   Keep the title fully visible and reserve breathing room on
   both sides of the promotion and transaction columns.
   ============================================================ */
.cd-customer-display-v9 .customer-display-brand{
  padding:6px 16px 7px !important;
  box-sizing:border-box !important;
  overflow:visible !important;
}
.cd-customer-display-v9 .customer-display-brand-name{
  display:block !important;
  width:100% !important;
  max-width:none !important;
  min-width:0 !important;
  overflow:visible !important;
  text-overflow:clip !important;
  white-space:nowrap !important;
  font-size:clamp(24px,2.15vw,40px) !important;
  line-height:1.08 !important;
  letter-spacing:.01em !important;
}

/* Small breathing room before the image. */
.cd-customer-display-v9 .customer-display-main{
  padding-left:14px !important;
  padding-right:14px !important;
  box-sizing:border-box !important;
  gap:16px !important;
}
.cd-customer-display-v9 .customer-display-media{
  padding:12px 14px 20px !important;
  box-sizing:border-box !important;
}
.cd-customer-display-v9 .customer-display-media img{
  display:block !important;
  margin:0 auto !important;
  max-width:100% !important;
  max-height:100% !important;
}

/* One exact shared width for header + rows + totals.
   The right reserve guarantees AMOUNT never touches the edge. */
.cd-customer-display-v9 .cd-v9-table-head,
.cd-customer-display-v9 .cd-v9-items,
.cd-customer-display-v9 .customer-display-totals,
.cd-customer-display-v9 .customer-display-payment{
  width:calc(100% - 120px) !important;
  max-width:calc(100% - 120px) !important;
  margin-left:0 !important;
  margin-right:120px !important;
  box-sizing:border-box !important;
  min-width:0 !important;
  flex:0 1 auto !important;
  align-self:flex-start !important;
}

.cd-customer-display-v9 .cd-v9-table-head,
.cd-customer-display-v9 .cd-v9-row{
  grid-template-columns:minmax(0,1fr) 64px 175px !important;
  column-gap:10px !important;
  box-sizing:border-box !important;
}
.cd-customer-display-v9 .cd-v9-row{
  width:100% !important;
  max-width:100% !important;
  margin:0 !important;
  min-width:0 !important;
}
.cd-customer-display-v9 .cd-v9-product{
  min-width:0 !important;
  overflow:visible !important;
}
.cd-customer-display-v9 .cd-v9-product b{
  display:block !important;
  max-width:100% !important;
  overflow:visible !important;
  text-overflow:clip !important;
  white-space:normal !important;
  overflow-wrap:break-word !important;
}
.cd-customer-display-v9 .cd-v9-qty{
  width:auto !important;
  min-width:0 !important;
  text-align:center !important;
  justify-self:stretch !important;
}
.cd-customer-display-v9 .cd-v9-amount{
  width:auto !important;
  min-width:0 !important;
  text-align:right !important;
  justify-self:stretch !important;
  white-space:nowrap !important;
}
.cd-customer-display-v9 .customer-display-totals > div,
.cd-customer-display-v9 .customer-display-payment > div{
  grid-template-columns:minmax(0,1fr) 175px !important;
  column-gap:10px !important;
  box-sizing:border-box !important;
}
.cd-customer-display-v9 .customer-display-totals > div b,
.cd-customer-display-v9 .customer-display-payment > div b{
  width:auto !important;
  min-width:0 !important;
  text-align:right !important;
  white-space:nowrap !important;
}

@media(max-width:1100px) and (min-width:801px){
  .cd-customer-display-v9 .cd-v9-table-head,
  .cd-customer-display-v9 .cd-v9-items,
  .cd-customer-display-v9 .customer-display-totals,
  .cd-customer-display-v9 .customer-display-payment{
    width:calc(100% - 70px) !important;
    max-width:calc(100% - 70px) !important;
    margin-right:70px !important;
  }
  .cd-customer-display-v9 .cd-v9-table-head,
  .cd-customer-display-v9 .cd-v9-row{
    grid-template-columns:minmax(0,1fr) 58px 150px !important;
  }
  .cd-customer-display-v9 .customer-display-totals > div,
  .cd-customer-display-v9 .customer-display-payment > div{
    grid-template-columns:minmax(0,1fr) 150px !important;
  }
}

@media(max-width:800px){
  .cd-customer-display-v9 .customer-display-main{
    padding-left:8px !important;
    padding-right:8px !important;
    gap:10px !important;
  }
  .cd-customer-display-v9 .customer-display-brand{
    padding-left:12px !important;
    padding-right:12px !important;
  }
  .cd-customer-display-v9 .cd-v9-table-head,
  .cd-customer-display-v9 .cd-v9-items,
  .cd-customer-display-v9 .customer-display-totals,
  .cd-customer-display-v9 .customer-display-payment{
    width:100% !important;
    max-width:100% !important;
    margin-right:0 !important;
  }
  .cd-customer-display-v9 .cd-v9-table-head,
  .cd-customer-display-v9 .cd-v9-row{
    grid-template-columns:minmax(0,1fr) 50px 120px !important;
    column-gap:8px !important;
  }
  .cd-customer-display-v9 .customer-display-totals > div,
  .cd-customer-display-v9 .customer-display-payment > div{
    grid-template-columns:minmax(0,1fr) 125px !important;
  }
}
'''
p.write_text(s+patch)
