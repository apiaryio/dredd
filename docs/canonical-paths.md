## Canonical path convention for transaction names

- when processing multiple blueprint, `API Name` is a part of the transaction name
  - when there is no API Name in the blueprint, it will use `filename` instead
- when group is not present, transaction starts with a space (bug #168)
- when resource name and action name is empty, URI and method is used instead
- when multiple request response pairs are present, it uses generic sequential example names

## Fundamental indeterminism
- When there are compiled duplicate paths, it does not throw any error

