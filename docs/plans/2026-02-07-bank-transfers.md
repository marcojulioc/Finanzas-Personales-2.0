# Bank-to-Bank Transfers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to transfer money between their own bank accounts (same currency only).

**Architecture:** Extend the existing `Transaction` model with a `transfer` type and a `targetAccountId` field pointing to the destination account. A transfer is a single transaction record that atomically decrements the source account and increments the destination account. This follows the existing card-payment pattern (`isCardPayment` + `targetCardId`) for consistency.

**Tech Stack:** Prisma (schema migration), Zod (validation), Next.js API routes, React Hook Form + shadcn/ui (form)

**Key Constraint:** App is in production. All changes must be backwards-compatible. Existing `income`/`expense` transactions must continue working exactly as before.

---

## Impact Analysis

Files that will be modified:

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `transfer` to `TransactionType` enum, add `targetAccountId` + relation to `Transaction` and `RecurringTransaction` |
| `src/lib/validations.ts` | Add `transfer` to type enum, add `targetAccountId` field |
| `src/app/api/transactions/route.ts` | Handle transfer creation + balance updates on both accounts |
| `src/app/api/transactions/[id]/route.ts` | Handle transfer edit + delete with balance revert on both accounts |
| `src/app/(dashboard)/transactions/page.tsx` | Add "Transferencia" tab in form, destination account selector, show transfers differently |
| `src/components/swipeable-transaction-item.tsx` | Display transfers with arrow icon and both account names |
| `src/hooks/use-transactions.ts` | Add `transfer` to Transaction type |
| `src/components/global-search.tsx` | Add `transfer` to Transaction type |
| `src/app/api/reports/route.ts` | Exclude transfers from income/expense totals |
| `src/lib/recurring-utils.ts` | Handle transfer type in recurring generation |

Files that will NOT change (safe zones):
- Authentication, middleware, bank account CRUD, credit card CRUD, budgets, categories, notifications

---

## Task 1: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add `transfer` to TransactionType enum and add `targetAccountId` fields**

In `prisma/schema.prisma`, update:

```prisma
enum TransactionType {
  income
  expense
  transfer
}
```

Add to `Transaction` model (after the `targetCard` relation):

```prisma
  // Para transferencias entre cuentas
  targetAccountId String?
  targetAccount   BankAccount? @relation("TransferDestination", fields: [targetAccountId], references: [id])
```

Update `BankAccount` model to include the inverse relation:

```prisma
  transfersReceived Transaction[] @relation("TransferDestination")
```

Also update the existing `transactions` relation in BankAccount to have a name:

```prisma
  transactions Transaction[] @relation("AccountTransactions")
```

And update Transaction's `bankAccount` relation to match:

```prisma
  bankAccount   BankAccount? @relation("AccountTransactions", fields: [bankAccountId], references: [id])
```

Add index:

```prisma
  @@index([targetAccountId])
```

Add same fields to `RecurringTransaction`:

```prisma
  targetAccountId   String?
  targetAccount     BankAccount? @relation("RecurringTransferDestination", fields: [targetAccountId], references: [id])
```

And in `BankAccount`:

```prisma
  recurringTransfersReceived RecurringTransaction[] @relation("RecurringTransferDestination")
```

Similarly, name the existing recurring relation in BankAccount:

```prisma
  recurringTransactions RecurringTransaction[] @relation("RecurringAccountTransactions")
```

And in RecurringTransaction:

```prisma
  bankAccount       BankAccount?        @relation("RecurringAccountTransactions", fields: [bankAccountId], references: [id])
```

**Step 2: Run migration**

```bash
npx prisma migrate dev --name add-transfers
```

**Step 3: Verify migration applied cleanly**

```bash
npx prisma generate
```

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add transfer type and targetAccountId to schema"
```

---

## Task 2: Validation Schema

**Files:**
- Modify: `src/lib/validations.ts`

**Step 1: Update transactionSchema**

Add `transfer` to the type enum and add `targetAccountId`:

```typescript
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer'], {
    message: 'Tipo de transaccion invalido',
  }),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: currencyEnum,
  category: z
    .string()
    .min(1, 'La categoria es requerida')
    .max(30, 'La categoria no puede exceder 30 caracteres'),
  description: z
    .string()
    .max(100, 'La descripcion no puede exceder 100 caracteres')
    .optional(),
  date: z.coerce.date(),
  bankAccountId: z.string().cuid().optional(),
  creditCardId: z.string().cuid().optional(),
  isCardPayment: z.boolean().default(false),
  targetCardId: z.string().cuid().optional(),
  targetAccountId: z.string().cuid().optional(),
})
```

Do the same for `recurringTransactionSchema` - add `transfer` to type and add `targetAccountId`.

**Step 2: Update inferred types**

No extra work needed - `TransactionInput` is auto-inferred.

**Step 3: Commit**

```bash
git add src/lib/validations.ts
git commit -m "feat: add transfer type and targetAccountId to validation schemas"
```

---

## Task 3: API - Create Transfer (POST)

**Files:**
- Modify: `src/app/api/transactions/route.ts`

**Step 1: Add transfer validation after existing card payment validation (~line 135)**

After the `isCardPayment` validation block, add:

```typescript
// Validar transferencias
if (data.type === 'transfer') {
  if (!data.bankAccountId || !data.targetAccountId) {
    return NextResponse.json(
      { error: 'La transferencia requiere cuenta origen y cuenta destino' },
      { status: 422 }
    )
  }
  if (data.bankAccountId === data.targetAccountId) {
    return NextResponse.json(
      { error: 'La cuenta origen y destino deben ser diferentes' },
      { status: 422 }
    )
  }
}
```

**Step 2: Add targetAccountId ownership check (after existing ownership checks)**

```typescript
if (data.targetAccountId) {
  const targetAccount = await db.bankAccount.findFirst({
    where: { id: data.targetAccountId, userId: session.user.id, isActive: true },
  })
  if (!targetAccount) {
    return NextResponse.json(
      { error: 'Cuenta destino no encontrada' },
      { status: 404 }
    )
  }
  // Validate same currency
  const sourceAccount = await db.bankAccount.findFirst({
    where: { id: data.bankAccountId!, userId: session.user.id },
    select: { currency: true },
  })
  if (sourceAccount && targetAccount.currency !== sourceAccount.currency) {
    return NextResponse.json(
      { error: 'Las cuentas deben tener la misma moneda para transferir' },
      { status: 422 }
    )
  }
}
```

**Step 3: Add transfer balance logic inside the `db.$transaction` block**

After the card payment balance logic, add:

```typescript
// Si es transferencia, incrementar cuenta destino
if (data.type === 'transfer' && data.targetAccountId) {
  await tx.bankAccount.update({
    where: { id: data.targetAccountId },
    data: {
      balance: {
        increment: data.amount,
      },
    },
  })
}
```

Note: The source account decrement is already handled by the existing bank account logic. When `type === 'transfer'`, `bankAccountId` is set, and the existing code does:
```typescript
const balanceChange = data.type === 'income' ? data.amount : -data.amount
```
Since `transfer` is not `income`, it will do `-data.amount` on the source account. This is correct.

**Step 4: Update the transaction include to return targetAccount info**

Add `targetAccount` to the `include` in the create call:

```typescript
include: {
  bankAccount: { select: { id: true, name: true, color: true } },
  creditCard: { select: { id: true, name: true, color: true } },
  targetAccount: { select: { id: true, name: true, color: true } },
},
```

**Step 5: Also update GET route include to return targetAccount**

```typescript
include: {
  bankAccount: { select: { id: true, name: true, color: true } },
  creditCard: { select: { id: true, name: true, color: true } },
  targetAccount: { select: { id: true, name: true, color: true } },
},
```

**Step 6: Add `transfer` to type filter support in GET**

The existing filter line:
```typescript
const type = searchParams.get('type') as 'income' | 'expense' | null
```
Update to:
```typescript
const type = searchParams.get('type') as 'income' | 'expense' | 'transfer' | null
```

**Step 7: Commit**

```bash
git add src/app/api/transactions/route.ts
git commit -m "feat: handle transfers in transaction POST and GET API"
```

---

## Task 4: API - Update and Delete Transfers

**Files:**
- Modify: `src/app/api/transactions/[id]/route.ts`

**Step 1: Update GET include to return targetAccount**

Add to include:
```typescript
targetAccount: { select: { id: true, name: true, color: true } },
```

**Step 2: Update PUT - Revert old transfer balance**

After the existing "revert card payment" block, add:

```typescript
// Revertir transferencia anterior
if (existingTransaction.type === 'transfer' && existingTransaction.targetAccountId) {
  await tx.bankAccount.update({
    where: { id: existingTransaction.targetAccountId },
    data: {
      balance: {
        decrement: Number(existingTransaction.amount),
      },
    },
  })
}
```

**Step 3: Update PUT - Apply new transfer balance**

After the existing "apply new card payment" block, add:

```typescript
// Aplicar nueva transferencia
if (data.type === 'transfer' && data.targetAccountId) {
  await tx.bankAccount.update({
    where: { id: data.targetAccountId },
    data: {
      balance: {
        increment: data.amount,
      },
    },
  })
}
```

**Step 4: Add transfer validation in PUT (same as POST - source != destination, same currency)**

Add after Zod validation:

```typescript
if (data.type === 'transfer') {
  if (!data.bankAccountId || !data.targetAccountId) {
    return NextResponse.json(
      { error: 'La transferencia requiere cuenta origen y cuenta destino' },
      { status: 422 }
    )
  }
  if (data.bankAccountId === data.targetAccountId) {
    return NextResponse.json(
      { error: 'La cuenta origen y destino deben ser diferentes' },
      { status: 422 }
    )
  }
}
```

**Step 5: Update PUT include to return targetAccount**

**Step 6: Update DELETE - Revert transfer balance**

After the existing "revert card payment" block, add:

```typescript
// Revertir transferencia
if (existingTransaction.type === 'transfer' && existingTransaction.targetAccountId) {
  await tx.bankAccount.update({
    where: { id: existingTransaction.targetAccountId },
    data: {
      balance: {
        decrement: Number(existingTransaction.amount),
      },
    },
  })
}
```

**Step 7: Commit**

```bash
git add src/app/api/transactions/[id]/route.ts
git commit -m "feat: handle transfers in transaction PUT and DELETE API"
```

---

## Task 5: Frontend Types Update

**Files:**
- Modify: `src/hooks/use-transactions.ts`
- Modify: `src/components/global-search.tsx`

**Step 1: Update Transaction interface in use-transactions.ts**

Change `type` field from:
```typescript
type: 'income' | 'expense'
```
To:
```typescript
type: 'income' | 'expense' | 'transfer'
```

Add field:
```typescript
targetAccountId: string | null
targetAccount: { id: string; name: string; color: string | null } | null
```

**Step 2: Update Transaction interface in global-search.tsx**

Same change to the type field.

**Step 3: Commit**

```bash
git add src/hooks/use-transactions.ts src/components/global-search.tsx
git commit -m "feat: add transfer type to frontend Transaction interfaces"
```

---

## Task 6: Transaction Form - Add Transfer UI

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`

**Step 1: Update local Transaction interface**

Add `transfer` to type, add `targetAccountId` and `targetAccount` fields.

**Step 2: Update form schema**

Add `transfer` to type enum:
```typescript
type: z.enum(['income', 'expense', 'transfer']),
```

Add field:
```typescript
targetAccountId: z.string().optional(),
```

**Step 3: Add "Transferencia" button in type selection**

After the "Ingreso" button, add:
```tsx
<Button
  type="button"
  variant={watchType === 'transfer' ? 'default' : 'outline'}
  className="flex-1"
  onClick={() => {
    setValue('type', 'transfer')
    setValue('category', 'Transferencia')
    setValue('sourceType', 'account')
  }}
>
  Transferencia
</Button>
```

**Step 4: Show destination account selector when type is transfer**

After the source account selector, add conditional block:
```tsx
{watchType === 'transfer' && accounts.length > 1 && (
  <div className="space-y-2">
    <Label>Cuenta destino</Label>
    <Select
      value={watch('targetAccountId')}
      onValueChange={(value) => setValue('targetAccountId', value)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecciona cuenta destino" />
      </SelectTrigger>
      <SelectContent>
        {accounts
          .filter((a) => a.id !== watch('bankAccountId'))
          .map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>
)}
```

**Step 5: Hide irrelevant fields when transfer is selected**

- Hide "Pagar con" label and card/cash options (only show account)
- Hide category selector (auto-set to "Transferencia")
- Hide card payment checkbox

When `watchType === 'transfer'`:
- Source type is forced to `account`
- Category is auto-set to "Transferencia"
- `isCardPayment` stays false
- `creditCardId` is cleared

**Step 6: Update onSubmit payload**

Add `targetAccountId` to payload:
```typescript
const payload = {
  ...existingFields,
  targetAccountId: data.type === 'transfer' ? data.targetAccountId : undefined,
}
```

**Step 7: Update openEditDialog to handle transfers**

When editing a transfer, populate `targetAccountId` from the transaction.

**Step 8: Update filter dropdown to include transfers**

Add to the filter Select:
```tsx
<SelectItem value="transfer">Transferencias</SelectItem>
```

**Step 9: Commit**

```bash
git add src/app/(dashboard)/transactions/page.tsx
git commit -m "feat: add transfer UI to transaction form"
```

---

## Task 7: Transaction Display - Show Transfers

**Files:**
- Modify: `src/components/swipeable-transaction-item.tsx`

**Step 1: Update transaction prop type**

Add `transfer` to type, add `targetAccount` field.

**Step 2: Update amount color logic**

Transfers should use a neutral color (not red/green):
```tsx
transaction.type === 'income'
  ? 'text-success'
  : transaction.type === 'transfer'
  ? 'text-primary'
  : 'text-danger'
```

**Step 3: Update amount prefix**

```tsx
{transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '' : '-'}
```

**Step 4: Show both accounts for transfers**

In the badge area, when `transaction.type === 'transfer'`:
```tsx
{transaction.type === 'transfer' && transaction.targetAccount ? (
  <>
    <span>•</span>
    <Badge variant="outline" className="font-normal" style={{ borderColor: transaction.bankAccount?.color || undefined }}>
      {transaction.bankAccount?.name}
    </Badge>
    <span>→</span>
    <Badge variant="outline" className="font-normal" style={{ borderColor: transaction.targetAccount?.color || undefined }}>
      {transaction.targetAccount?.name}
    </Badge>
  </>
) : (
  // existing badge logic
)}
```

**Step 5: Commit**

```bash
git add src/components/swipeable-transaction-item.tsx
git commit -m "feat: display transfers with both account names"
```

---

## Task 8: Reports - Exclude Transfers from Income/Expense Totals

**Files:**
- Modify: `src/app/api/reports/route.ts`

**Step 1: Update reports logic**

Transfers should NOT count as income or expense. Update the forEach:

```typescript
transactions.forEach((t) => {
  const amount = new Decimal(t.amount).toNumber()
  if (t.type === 'expense') {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount
    totalExpenses += amount
  } else if (t.type === 'income') {
    totalIncome += amount
  }
  // transfers are excluded from both totals
})
```

Similarly, update the monthly summary and balance trend to exclude transfers. Transfers move money between accounts but don't change the user's total wealth.

In the monthly summary:
```typescript
if (t.type === 'income') {
  monthlyData[monthKey].income += amount
} else if (t.type === 'expense') {
  monthlyData[monthKey].expenses += amount
}
// transfers excluded
```

In the balance trend:
```typescript
const change = t.type === 'income' ? amount : t.type === 'expense' ? -amount : 0
```

In daily spending (already filtered to expense only - safe).

In previous transactions balance:
```typescript
return t.type === 'income' ? acc + amount : t.type === 'expense' ? acc - amount : acc
```

**Step 2: Commit**

```bash
git add src/app/api/reports/route.ts
git commit -m "feat: exclude transfers from income/expense report totals"
```

---

## Task 9: Recurring Transactions - Support Transfers

**Files:**
- Modify: `src/lib/recurring-utils.ts`

**Step 1: Add transfer balance logic in generatePendingTransactions**

After the card payment block (~line 187), add:

```typescript
// If transfer, increment target account balance
if (recurring.type === 'transfer' && recurring.targetAccountId) {
  await tx.bankAccount.update({
    where: { id: recurring.targetAccountId },
    data: {
      balance: { increment: amount },
    },
  })
}
```

The source account decrement is already handled by the existing logic (same reasoning as Task 3).

Also update the transaction creation to include `targetAccountId`:
```typescript
await tx.transaction.create({
  data: {
    ...existingFields,
    targetAccountId: recurring.targetAccountId,
  },
})
```

**Step 2: Commit**

```bash
git add src/lib/recurring-utils.ts
git commit -m "feat: support transfers in recurring transaction generation"
```

---

## Task 10: Build Verification and Manual Test

**Step 1: Run build**

```bash
npm run build
```

Ensure zero TypeScript errors and zero build failures.

**Step 2: Run existing tests**

```bash
npm run test:run
```

Ensure all existing tests still pass (no regressions).

**Step 3: Manual test checklist**

1. Create a transfer between two same-currency accounts - verify both balances update
2. Edit a transfer (change amount) - verify balances revert and re-apply correctly
3. Delete a transfer - verify both balances revert
4. Create a normal expense - verify it still works as before
5. Create a normal income - verify it still works as before
6. Check reports page - verify transfers don't appear in income/expense totals
7. Check transaction list with "Transferencias" filter

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete bank-to-bank transfers feature"
```

---

## Backwards Compatibility Notes

1. **Existing transactions are untouched**: `income` and `expense` types continue to work. The new `transfer` value is additive to the enum.
2. **`targetAccountId` is nullable**: Existing transactions have `null` for this field.
3. **Balance logic is additive**: The existing `if (data.bankAccountId)` block handles transfers correctly because `transfer` is neither `income` (so it decrements the source). The new block only adds the increment to the destination.
4. **Reports are safe**: The explicit `if (t.type === 'expense')` / `if (t.type === 'income')` checks naturally exclude `transfer` already in most places. We just need to verify the `else` branches.
5. **Category "Transferencia"**: Auto-set in the form. Even if the user doesn't have this category, the transaction stores the string directly (not a foreign key), so it works.
