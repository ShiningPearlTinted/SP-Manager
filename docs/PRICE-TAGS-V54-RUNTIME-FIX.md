# V54 Runtime Fix

Fixed the PriceTagsModal React initialization error:

`ReferenceError: Cannot access 'pages' before initialization`

The `pages` calculation is now completed before the `useEffect` that depends on it. No Price Tags UI/functionality was intentionally changed by this fix.
