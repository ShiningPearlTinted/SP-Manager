# SP-Manager 1.0.31 – Products Render Fix V1.1.11

## Root cause
The Product Groups patch left three existing Products handlers out of `Products()`:
- `exportProducts`
- `importProducts`
- `movingAverage`

The Products toolbar still referenced these functions. React evaluates `onClick={movingAverage}` while rendering the Products component, so the page crashed with:

`ReferenceError: movingAverage is not defined`

## Fix
Restored the existing handlers from the previous SP-Manager build without changing their behavior.

## Scope
Only restores the missing Products handlers. Product Groups, POS, Customer Display, Email, printing, pricing and other functions are otherwise unchanged.
