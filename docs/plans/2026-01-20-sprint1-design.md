# Sprint 1: Setup + Auth + Onboarding - Design Document

**Fecha**: 2026-01-20
**Estado**: Aprobado para implementación

---

## Estructura del Proyecto

```
finanzas-app/
├── src/
│   ├── app/                    # App Router (Next.js 15)
│   │   ├── (auth)/            # Grupo de rutas de autenticación
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/       # Rutas protegidas
│   │   │   ├── dashboard/
│   │   │   ├── accounts/
│   │   │   ├── cards/
│   │   │   └── transactions/
│   │   ├── onboarding/        # Flujo de onboarding
│   │   ├── api/               # Route Handlers
│   │   ├── layout.tsx
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── features/          # Componentes de negocio
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   └── validations.ts     # Zod schemas
│   └── hooks/                 # Custom hooks
├── prisma/
│   └── schema.prisma
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    └── plans/
```

---

## Modelo de Datos

### Enums
- AccountType: savings, checking
- Currency: MXN, USD
- TransactionType: income, expense

### User
- onboardingCompleted controla flujo post-registro
- Soporta OAuth y Credentials

### BankAccount
- Balance con Decimal(12,2)
- Una moneda por cuenta

### CreditCard
- Límites y balances separados por moneda (MXN/USD)
- cutOffDay y paymentDueDay para alertas

---

## Flujo de Autenticación

1. Usuario se autentica (Google o Email+Password)
2. Middleware verifica onboardingCompleted
3. Si false → /onboarding
4. Si true → /dashboard

---

## Flujo de Onboarding

| Paso | Ruta | Descripción |
|------|------|-------------|
| 1 | /onboarding | Bienvenida |
| 2 | /onboarding/accounts | Cuentas bancarias |
| 3 | /onboarding/cards | Tarjetas de crédito |
| 4 | /onboarding/summary | Resumen y confirmación |

**Regla**: Al menos 1 cuenta O 1 tarjeta requerida.

---

## Plan de Tareas

### FASE 1: Setup Base
- T1.1 Inicializar Next.js 15 + TypeScript strict
- T1.2 Configurar Tailwind CSS v4 + fuentes
- T1.3 Instalar y configurar shadcn/ui
- T1.4 Configurar Vitest + Testing Library

### FASE 2: Base de Datos
- T2.1 Setup Prisma + schema base
- T2.2 Agregar modelos BankAccount y CreditCard
- T2.3 Configurar PostgreSQL local + Railway
- T2.4 Tests de conexión DB

### FASE 3: Autenticación
- T3.1 Configurar NextAuth.js v5
- T3.2 Provider Credentials
- T3.3 Provider Google OAuth
- T3.4 Página /login
- T3.5 Página /register
- T3.6 Middleware de protección
- T3.7 Tests de auth

### FASE 4: Onboarding
- T4.1 Página bienvenida
- T4.2 Formulario cuentas
- T4.3 Formulario tarjetas
- T4.4 Página resumen
- T4.5 API /api/onboarding/complete
- T4.6 Persistencia y validación
- T4.7 Tests E2E

### FASE 5: Landing + Deploy
- T5.1 Landing page
- T5.2 Variables en Railway
- T5.3 Deploy inicial
