# Budget Module Improvements: CategoryId + Summary Card

**Fecha**: 2026-01-26
**Estado**: Aprobado

## Objetivo

1. Cambiar `Budget.category` (string) a `Budget.categoryId` (foreign key) para integridad de datos
2. Agregar tarjeta resumen con totales en la página de presupuestos

## Decisiones de Diseño

- **Alcance**: Solo Budget, no Transaction (menor riesgo)
- **Migración**: Automática - buscar/crear categoría, asignar ID
- **Resumen**: Básico - total presupuestado, gastado, disponible, barra de progreso

---

## 1. Cambios en Base de Datos

### Schema Prisma (Budget)

```prisma
model Budget {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  categoryId String
  category   Category  @relation(fields: [categoryId], references: [id])

  amount     Decimal   @db.Decimal(12, 2)
  month      DateTime  @db.Date

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([userId, categoryId, month])
  @@index([userId])
  @@index([categoryId])
}
```

### Schema Prisma (Category - agregar relación)

```prisma
model Category {
  // ... campos existentes ...
  budgets   Budget[]
}
```

---

## 2. Cambios en API

### GET /api/budgets

```typescript
// Nueva respuesta
{
  id,
  userId,
  categoryId,
  category: { id, name, icon, color, type },
  amount,
  month,
  spent
}
```

- Usar `include: { category: true }` en Prisma
- Cálculo de `spent`: agrupa transacciones donde `transaction.category === budget.category.name`

### POST /api/budgets

```typescript
// Nuevo body
{ categoryId: string, amount: number, month: Date }
```

- Validar que categoryId exista y pertenezca al usuario

### POST /api/budgets/copy

- Copiar usando `categoryId` en lugar de string

---

## 3. UI: Tarjeta Resumen

### Ubicación
Arriba del grid de presupuestos, después de navegación de mes.

### Contenido
- Total Presupuestado: Suma de `amount`
- Total Gastado: Suma de `spent`
- Disponible: Presupuestado - Gastado
- Barra de progreso global

### Colores
- Verde: < 80%
- Ámbar: 80-99%
- Rojo: >= 100%

### Responsive
- Desktop: 3 métricas horizontales + barra
- Mobile: métricas apiladas verticalmente

---

## 4. UI: Budget Form

- Dropdown de categoría envía `categoryId` (no nombre)
- Muestra icono + nombre
- Solo categorías tipo `expense`

---

## 5. Script de Migración

```typescript
async function migrateBudgetCategories() {
  const budgets = await db.budget.findMany()

  for (const budget of budgets) {
    let category = await db.category.findFirst({
      where: { userId: budget.userId, name: budget.category }
    })

    if (!category) {
      const staticCat = getCategoryById(budget.category)
      category = await db.category.create({
        data: {
          userId: budget.userId,
          name: budget.category,
          icon: staticCat?.icon ?? '📦',
          color: staticCat?.color ?? '#6b7280',
          type: 'expense',
          isDefault: false
        }
      })
    }

    await db.budget.update({
      where: { id: budget.id },
      data: { categoryId: category.id }
    })
  }
}
```

---

## 6. Orden de Implementación

1. Schema: Agregar `categoryId` nullable + relación Category.budgets
2. Migración DB: `npx prisma migrate dev`
3. Script: Ejecutar migración de datos existentes
4. Schema: Hacer `categoryId` required, eliminar `category` string
5. Migración DB: Segunda migración
6. Validaciones: Actualizar Zod schema
7. API: Actualizar endpoints (GET, POST, copy)
8. UI: Formulario con categoryId
9. UI: Tarjeta resumen (usar skill frontend-design)

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `prisma/schema.prisma` | Budget.categoryId, Category.budgets |
| `src/lib/validations.ts` | budgetSchema: category → categoryId |
| `src/app/api/budgets/route.ts` | GET con include, POST con categoryId |
| `src/app/api/budgets/[id]/route.ts` | Validación con categoryId |
| `src/app/api/budgets/copy/route.ts` | Copiar con categoryId |
| `src/components/budget-form.tsx` | Selector envía categoryId |
| `src/app/(dashboard)/budgets/page.tsx` | SummaryCard + usar category object |

## Archivos Nuevos

| Archivo | Propósito |
|---------|-----------|
| `scripts/migrate-budget-categories.ts` | Migración de datos |
| `src/components/budget-summary-card.tsx` | Componente resumen |

---

## Riesgos y Mitigación

- **Datos huérfanos**: Script crea categorías faltantes
- **Downtime**: categoryId nullable inicialmente permite migración sin downtime
- **Rollback**: Backup antes de eliminar columna category
