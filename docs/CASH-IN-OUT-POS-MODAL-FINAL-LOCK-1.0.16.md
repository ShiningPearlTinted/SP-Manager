# SP-Manager 1.0.16 — Cash In / Out POS Modal Final Lock

## Base

Base package preserved: SP-Manager 1.0.16 / V2 Cash In / Out fix.

## Requested behavior

When Cash In / Out is selected from the POS action menu:

- remain on `POS / Sales`;
- do not navigate to `Management`;
- show only the Cash In / Out modal over the POS;
- Management Cash In / Out remains a separate page.

## Aronium reference checked

The uploaded `Aronium(8).zip` was inspected. `Lang/en.lang` defines the Starting Cash UI as:

- Cash In / Out
- Add cash
- Remove cash
- Amount
- Description
- reason tooltip
- Cash entries
- No description / No records
- Starting cash saved successfully

The Aronium workflow uses `Aronium.Pos.Common.Tasks.BusinessDay.StartingCashTask` and `StartingCashTaskView.xaml`. The database migration defines `StartingCash` with UserId, Amount, Description, StartingCashType, ZReportNumber and DateCreated.

SP-Manager retains those core movement semantics while using its modern UI and existing Local Agent cash-drawer action.

## Scope lock

Only the POS Cash In / Out modal presentation and its POS-only opening path were adjusted. The standalone Management Cash In / Out module and other POS functions remain unchanged.
