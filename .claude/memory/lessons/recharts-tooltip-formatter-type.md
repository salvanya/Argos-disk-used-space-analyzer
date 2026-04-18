# Lesson: Recharts `<Tooltip formatter>` type mismatch

## Symptom
`tsc` error on `<Tooltip formatter={(value: number) => ...} />`:
> Type '(value: number) => string' is not assignable to type 'Formatter<ValueType, NameType>'.
> Type 'ValueType | undefined' is not assignable to type 'number'.

## Root cause
Recharts' `Formatter` types the first arg as `ValueType | undefined` (where `ValueType` is `number | string | Array<number | string>`). Annotating the parameter as `number` narrows it incompatibly.

## Fix
Let the parameter infer and coerce inside the body:
```tsx
formatter={(value) => formatSize(Number(value))}
```

## How to recognize it next time
Any Recharts `formatter` / `labelFormatter` prop that explicitly types the incoming value. Remove the annotation and coerce.
