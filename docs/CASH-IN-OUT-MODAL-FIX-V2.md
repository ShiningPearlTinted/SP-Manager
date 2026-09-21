# SP-Manager Cash In / Out Modal Fix V2

Base locked: SP-Manager 1.0.16 Cash In / Out Modal Fixed package.

The browser error was caused by `showCashInOutModal` being declared inside `POS`, while `App` renders the modal and references that state. The state is now owned by `App`.

Only this state ownership was corrected. POS/Management business logic and Cash In / Out data functions were not changed.
