# 📋 PRD - MVP Aplicación de Finanzas Personales

**Versión**: 2.2  
**Fecha**: Enero 2026  
**Estado**: Aprobado para desarrollo  
**Método de desarrollo**: Claude Code + Superpowers + Frontend-Design

---

## 1. VISIÓN DEL PRODUCTO

### Objetivo
Crear una aplicación web responsive que permita a usuarios registrar y visualizar sus transacciones financieras diarias de manera simple y rápida, con acceso desde cualquier dispositivo y visibilidad completa de sus cuentas y tarjetas.

### Problema que Resuelve
Las personas pierden el control de sus gastos diarios porque:
- No tienen una forma rápida de registrar transacciones en el momento
- Las apps existentes son muy complejas o requieren instalación
- No tienen visibilidad clara de en qué gastan su dinero
- No tienen un panorama consolidado de sus cuentas y tarjetas

### Propuesta de Valor
Una aplicación web simple, rápida y accesible desde cualquier navegador que permite:
- Configurar tus cuentas y tarjetas al inicio
- Registrar gastos/ingresos en segundos
- Ver el balance actual de forma clara por cuenta/tarjeta
- Tener control total de tus finanzas desde el día 1

---

## 2. DESARROLLO CON CLAUDE CODE

### Herramienta Principal
Esta aplicación será desarrollada utilizando **Claude Code**, la herramienta de línea de comandos de Anthropic para desarrollo asistido por IA.

### Skills Requeridos

#### 🎨 frontend-design
**Propósito**: Crear interfaces distintivas y de alta calidad que eviten la estética genérica de "AI slop".

**Aplicación en este proyecto**:
- Landing page con identidad visual memorable
- Dashboard con diseño profesional y único
- Componentes con atención al detalle estético
- Animaciones y micro-interacciones significativas
- Tipografía distintiva (NO Inter, Roboto, Arial)
- Paleta de colores cohesiva y con personalidad

#### ⚡ superpowers
**Propósito**: Sistema completo de workflow de desarrollo de software que transforma a Claude Code en un agente de desarrollo estructurado y autónomo.

**Cómo funciona el skill:**
1. **Especificación primero**: No salta a escribir código. Primero pregunta qué se quiere lograr realmente.
2. **Spec en chunks**: Muestra la especificación en partes digeribles para revisión humana.
3. **Plan de implementación**: Crea un plan tan claro que "un junior entusiasta sin contexto podría seguir".
4. **Principios de desarrollo**:
   - 🔴🟢 **TDD** (Test-Driven Development) - Tests primero, código después
   - 🚫 **YAGNI** (You Aren't Gonna Need It) - No implementar features innecesarios
   - ♻️ **DRY** (Don't Repeat Yourself) - Eliminar duplicación
5. **Subagent-driven development**: Lanza subagentes para cada tarea, inspecciona y revisa su trabajo.
6. **Autonomía**: Puede trabajar autónomamente por horas sin desviarse del plan.

**Aplicación en este proyecto**:
- Especificación detallada de cada feature antes de codificar
- Plan de implementación por sprint con tareas atómicas
- Tests escritos ANTES del código de producción
- Revisión automática de código entre subagentes
- Desarrollo autónomo siguiendo el PRD aprobado
- Cada componente/feature pasa por: Test → Implementación → Refactor

### Diseño Visual

#### 🎨 Figma para Mockups
Los diseños de alta fidelidad serán creados en **Figma** antes del desarrollo:

**Entregables de Diseño:**
```
📁 Figma Project: "Finanzas Personales MVP"
├── 🎨 Design System
│   ├── Colors & Typography
│   ├── Components Library
│   ├── Icons & Illustrations
│   └── Spacing & Grid System
├── 📱 Mobile Screens
│   ├── Onboarding Flow
│   ├── Auth (Login/Register)
│   ├── Dashboard
│   ├── Transactions
│   └── Settings
├── 💻 Desktop Screens
│   ├── Dashboard
│   ├── Transactions List
│   └── Account Management
└── 🔄 Prototypes
    ├── Onboarding Flow
    ├── Add Transaction Flow
    └── Edit Account Flow
```

**Proceso de Diseño:**
1. Wireframes de baja fidelidad → Revisión
2. Mockups de alta fidelidad → Revisión
3. Prototipo interactivo → Testing
4. Handoff a desarrollo con especificaciones

### Directivas para Claude Code

```yaml
Workflow (superpowers):
  fase_1_spec: "No codificar hasta tener spec aprobada"
  fase_2_plan: "Crear plan de implementación detallado"
  fase_3_tdd: "Test primero, código después"
  fase_4_review: "Subagentes revisan código entre sí"
  principios:
    - TDD (Red → Green → Refactor)
    - YAGNI (solo lo necesario)
    - DRY (eliminar duplicación)
    - KISS (mantener simple)

Desarrollo:
  enfoque: "Iterativo por sprints"
  estilo_codigo: "Clean Code + TypeScript strict"
  testing: "TDD obligatorio"
  diseño: "Implementar según mockups de Figma"
  autonomia: "Subagentes trabajan tareas atómicas"
  
Diseño:
  skill: "frontend-design"
  mockups: "Figma"
  evitar:
    - Gradientes morados genéricos
    - Inter/Roboto/Arial como fuentes
    - Layouts predecibles
    - Componentes cookie-cutter
  priorizar:
    - Fidelidad a mockups de Figma
    - Tipografía distintiva
    - Animaciones con propósito
    - Composición espacial interesante

Convenciones:
  nombrado_archivos: "kebab-case"
  nombrado_componentes: "PascalCase"
  nombrado_funciones: "camelCase"
  nombrado_constantes: "UPPER_SNAKE_CASE"
  nombrado_tests: "*.test.ts o *.spec.ts"
  idioma_codigo: "inglés"
  idioma_comentarios: "español"
```

---

## 3. ALCANCE DEL MVP

### ✅ Incluido en MVP
- Sistema de autenticación (email + Google OAuth)
- **🆕 Onboarding inicial con configuración de cuentas y tarjetas**
- **🆕 Gestión de cuentas bancarias con balances**
- **🆕 Gestión de tarjetas de crédito con límites y cortes**
- Registro rápido de transacciones (asociadas a cuenta/tarjeta)
- Lista de transacciones con filtros
- Balance actual por cuenta y consolidado
- Categorías predefinidas
- Vista responsive (mobile + desktop)
- Dark mode

### ❌ NO Incluido en MVP (Fase 2)
- Presupuestos
- Reportes avanzados/gráficos
- Sincronización automática con bancos
- Exportación de datos
- Notificaciones
- Compartir con familia
- Adjuntar recibos/fotos
- Transacciones recurrentes automáticas

---

## 4. USUARIOS Y CASOS DE USO

### Usuario Principal
**Persona de 25-45 años** que quiere controlar sus gastos personales sin complejidad, con visibilidad de todas sus cuentas y tarjetas en un solo lugar.

### Casos de Uso Principales

#### CU-01: Configurar Cuentas Iniciales (Onboarding)
```
Como usuario nuevo
Quiero configurar mis cuentas bancarias y tarjetas de crédito al registrarme
Para tener un punto de partida real de mi situación financiera
```

#### CU-02: Registrar Gasto Rápido
```
Como usuario
Quiero registrar un gasto en menos de 10 segundos seleccionando la cuenta/tarjeta
Para no olvidar mis transacciones y saber de dónde salió el dinero
```

#### CU-03: Ver Balance Consolidado
```
Como usuario
Quiero ver mi balance total y por cuenta/tarjeta al entrar
Para saber exactamente cuánto dinero tengo disponible y cuánto debo
```

#### CU-04: Ver Historial por Cuenta
```
Como usuario
Quiero filtrar mis transacciones por cuenta o tarjeta
Para entender el movimiento de cada una
```

#### CU-05: Editar/Eliminar Transacción
```
Como usuario
Quiero corregir una transacción mal registrada
Para mantener mis datos precisos
```

#### CU-06: Gestionar Cuentas y Tarjetas
```
Como usuario
Quiero agregar, editar o eliminar cuentas y tarjetas
Para mantener actualizada mi información financiera
```

---

## 5. FLUJO DE ONBOARDING (🆕 NUEVO)

### Descripción General
Cuando un usuario se registra por primera vez, **DEBE** completar un formulario de configuración inicial antes de acceder al dashboard. Este proceso asegura que el usuario tenga datos reales desde el día 1.

### Pantallas del Onboarding

#### Pantalla 1: Bienvenida
```
┌─────────────────────────────────────┐
│                                     │
│  🎉 ¡Bienvenido a [App Name]!      │
│                                     │
│  Antes de comenzar, configuremos    │
│  tus cuentas y tarjetas para que    │
│  tengas una visión real de tus      │
│  finanzas desde el primer día.      │
│                                     │
│  Esto solo tomará 2 minutos.        │
│                                     │
│         [Comenzar →]                │
│                                     │
└─────────────────────────────────────┘
```

#### Pantalla 2: Cuentas Bancarias
```
┌─────────────────────────────────────┐
│  ← Paso 1 de 3                      │
│                                     │
│  🏦 Tus Cuentas Bancarias           │
│                                     │
│  Agrega las cuentas de donde        │
│  manejas tu dinero:                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Nombre: [Cuenta Principal  ]│   │
│  │ Banco:  [Banco XYZ ▼      ] │   │
│  │ Tipo:   [◉Ahorro ○Corriente]│   │
│  │ Moneda: [◉Pesos ○Dólares  ] │   │
│  │ Balance actual: [$_______  ]│   │
│  │              [🗑️ Eliminar]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [+ Agregar otra cuenta]            │
│                                     │
│  ───────────────────────────────   │
│  💡 Tip: Puedes agregar más         │
│  cuentas después en Configuración   │
│                                     │
│  [Saltar]         [Continuar →]     │
└─────────────────────────────────────┘
```

#### Pantalla 3: Tarjetas de Crédito
```
┌─────────────────────────────────────┐
│  ← Paso 2 de 3                      │
│                                     │
│  💳 Tus Tarjetas de Crédito         │
│                                     │
│  Agrega tus tarjetas para llevar    │
│  control de tus gastos a crédito:   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Nombre: [Visa Oro         ] │   │
│  │ Banco:  [Banco XYZ ▼      ] │   │
│  │                              │   │
│  │ 📅 Fecha de corte: [15 ▼]   │   │
│  │ 📅 Fecha de pago:  [25 ▼]   │   │
│  │                              │   │
│  │ Límites de crédito:          │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ 🇲🇽 Pesos:  [$50,000   ]│ │   │
│  │ │ 🇺🇸 Dólares: [$2,000   ]│ │   │
│  │ └─────────────────────────┘ │   │
│  │                              │   │
│  │ Balance actual (deuda):      │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ 🇲🇽 Pesos:  [$12,500   ]│ │   │
│  │ │ 🇺🇸 Dólares: [$350     ]│ │   │
│  │ └─────────────────────────┘ │   │
│  │              [🗑️ Eliminar]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [+ Agregar otra tarjeta]           │
│                                     │
│  [Saltar]         [Continuar →]     │
└─────────────────────────────────────┘
```

#### Pantalla 4: Resumen y Confirmación
```
┌─────────────────────────────────────┐
│  ← Paso 3 de 3                      │
│                                     │
│  ✅ ¡Todo listo!                    │
│                                     │
│  Resumen de tu situación inicial:   │
│                                     │
│  🏦 CUENTAS BANCARIAS               │
│  ├─ Cuenta Principal    $15,000.00  │
│  └─ Cuenta Dólares       $1,200.00  │
│  ────────────────────────────────   │
│  Total disponible:      $16,200.00  │
│                                     │
│  💳 TARJETAS DE CRÉDITO             │
│  ├─ Visa Oro                        │
│  │  └─ Deuda: $12,500 + $350 USD   │
│  └─ MasterCard                      │
│     └─ Deuda: $5,200               │
│  ────────────────────────────────   │
│  Total deuda:           $17,700.00  │
│  Crédito disponible:    $32,300.00  │
│                                     │
│  📊 BALANCE NETO: -$1,500.00       │
│                                     │
│  [← Editar]    [Comenzar a usar →] │
└─────────────────────────────────────┘
```

### Reglas del Onboarding

| Regla | Descripción |
|-------|-------------|
| **Obligatorio** | El usuario DEBE completar al menos 1 cuenta O 1 tarjeta |
| **Saltable** | Cada paso individual puede saltarse, pero no todos |
| **Editable** | El resumen permite volver a editar antes de confirmar |
| **Persistente** | Si el usuario cierra, al volver continúa donde quedó |
| **Una sola vez** | Solo se muestra en el primer acceso después del registro |

### Validaciones del Onboarding

**Cuentas Bancarias:**
- Nombre: requerido, 2-50 caracteres
- Banco: requerido (selector de bancos comunes + "Otro")
- Tipo: requerido (Ahorro/Corriente)
- Moneda: requerido (Pesos/Dólares)
- Balance: requerido, número >= 0

**Tarjetas de Crédito:**
- Nombre: requerido, 2-50 caracteres
- Banco: requerido
- Fecha de corte: requerido, día 1-31
- Fecha de pago: requerido, día 1-31
- Límite Pesos: opcional, número >= 0
- Límite Dólares: opcional, número >= 0
- Balance Pesos: opcional, número >= 0 (deuda actual)
- Balance Dólares: opcional, número >= 0 (deuda actual)

---

## 6. FUNCIONALIDADES DETALLADAS

### F1. Autenticación

**Registro de Usuario**
- Email + Contraseña
- Nombre completo
- Validación de email único
- Contraseña mínimo 8 caracteres
- Google OAuth

**Login**
- Email + Contraseña
- Google OAuth
- Recordar sesión (opcional)
- Mensaje de error claro

**Post-Login (Primera vez):**
- Redirigir a Onboarding
- Marcar `onboardingCompleted: false`

**Post-Login (Usuario existente):**
- Si `onboardingCompleted: false` → Onboarding
- Si `onboardingCompleted: true` → Dashboard

---

### F2. Dashboard Principal

**Componentes:**

```
┌─────────────────────────────────────┐
│  Header (Logo + Usuario + Logout)   │
├─────────────────────────────────────┤
│                                     │
│  💰 BALANCE TOTAL: $16,200.00      │
│     (sumando todas las cuentas)     │
│                                     │
│  💳 DEUDA TOTAL: -$17,700.00       │
│     (sumando todas las tarjetas)    │
│                                     │
│  📊 BALANCE NETO: -$1,500.00       │
│                                     │
├─────────────────────────────────────┤
│  🏦 MIS CUENTAS           [Ver más]│
│  ┌────────┐ ┌────────┐            │
│  │Principal│ │Dólares │            │
│  │$15,000  │ │$1,200  │            │
│  └────────┘ └────────┘            │
├─────────────────────────────────────┤
│  💳 MIS TARJETAS          [Ver más]│
│  ┌────────┐ ┌────────┐            │
│  │Visa Oro │ │Master  │            │
│  │-$12,850 │ │-$5,200 │            │
│  │Corte:15 │ │Corte:20│            │
│  └────────┘ └────────┘            │
├─────────────────────────────────────┤
│                                     │
│       [+ Nueva Transacción]         │
│                                     │
├─────────────────────────────────────┤
│  📋 TRANSACCIONES RECIENTES        │
│                                     │
│  🍔 Almuerzo    Visa Oro  -$12.50  │
│  💼 Salario     Principal +$2,000  │
│  ☕ Café        Efectivo  -$4.50   │
│                                     │
│  [Ver Todas]                        │
└─────────────────────────────────────┘
```

**Reglas:**
- Balance Total = Suma de todas las cuentas bancarias
- Deuda Total = Suma de balances de todas las tarjetas
- Balance Neto = Balance Total - Deuda Total
- Mostrar últimas 10 transacciones
- Cada transacción muestra la cuenta/tarjeta asociada
- Colores: Verde (ingreso), Rojo (gasto)
- Alertas visuales si una tarjeta está cerca del límite

---

### F3. Registrar Transacción

**Modal/Página con Formulario:**

```
┌─────────────────────────────────────┐
│  ✕                Nueva Transacción │
├─────────────────────────────────────┤
│                                     │
│  Tipo: [●Gasto] [○Ingreso]         │
│                                     │
│  💳 Origen/Destino:                 │
│  ┌─────────────────────────────┐   │
│  │ [● Cuenta Principal      ▼] │   │
│  │ [○ Visa Oro                ]│   │
│  │ [○ MasterCard              ]│   │
│  │ [○ Efectivo (sin cuenta)   ]│   │
│  └─────────────────────────────┘   │
│                                     │
│  Monto: $ [________]               │
│                                     │
│  Moneda: [●Pesos] [○Dólares]       │
│  (solo si la cuenta/tarjeta tiene  │
│   ambas monedas)                    │
│                                     │
│  Categoría: [Alimentación ▼]       │
│                                     │
│  Descripción: [______________]     │
│               (opcional)            │
│                                     │
│  Fecha: [📅 20/01/2026]            │
│                                     │
│  [Cancelar]        [Guardar]       │
└─────────────────────────────────────┘
```

**Validaciones:**
- Monto > 0
- Cuenta/Tarjeta seleccionada (o "Efectivo")
- Categoría seleccionada
- Fecha no futura
- Si es tarjeta: verificar que no exceda límite (warning, no bloqueo)

**Comportamiento:**
- Al guardar: actualiza balance de la cuenta/tarjeta
- Muestra mensaje de éxito
- Si gasto con tarjeta supera límite: mostrar advertencia

---

### F4. Gestión de Cuentas Bancarias

**Ruta: /accounts**

**Lista de Cuentas:**
```
┌─────────────────────────────────────┐
│  🏦 Mis Cuentas Bancarias           │
│                     [+ Nueva Cuenta]│
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ 🏦 Cuenta Principal          │   │
│  │ Banco XYZ • Ahorro • Pesos   │   │
│  │ Balance: $15,000.00          │   │
│  │ 15 transacciones este mes    │   │
│  │         [✏️ Editar] [🗑️]     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🏦 Cuenta Dólares            │   │
│  │ Banco ABC • Ahorro • USD     │   │
│  │ Balance: $1,200.00 USD       │   │
│  │ 3 transacciones este mes     │   │
│  │         [✏️ Editar] [🗑️]     │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Crear/Editar Cuenta:**
- Nombre de la cuenta
- Banco (selector)
- Tipo (Ahorro/Corriente)
- Moneda (Pesos/Dólares)
- Balance actual
- Color identificador (opcional)

**Eliminar Cuenta:**
- Confirmación requerida
- Opción de mover transacciones a otra cuenta o eliminarlas
- No permitir eliminar si es la única cuenta

---

### F5. Gestión de Tarjetas de Crédito

**Ruta: /cards**

**Lista de Tarjetas:**
```
┌─────────────────────────────────────┐
│  💳 Mis Tarjetas de Crédito         │
│                    [+ Nueva Tarjeta]│
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ 💳 Visa Oro                  │   │
│  │ Banco XYZ                    │   │
│  │                              │   │
│  │ Corte: día 15 | Pago: día 25 │   │
│  │                              │   │
│  │ PESOS                        │   │
│  │ ████████████░░░░ 70%         │   │
│  │ $35,000 / $50,000            │   │
│  │ Deuda actual: $35,000        │   │
│  │                              │   │
│  │ DÓLARES                      │   │
│  │ █████░░░░░░░░░░░ 25%         │   │
│  │ $500 / $2,000                │   │
│  │ Deuda actual: $500 USD       │   │
│  │                              │   │
│  │ ⚠️ Próximo corte en 5 días   │   │
│  │         [✏️ Editar] [🗑️]     │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Crear/Editar Tarjeta:**
- Nombre de la tarjeta
- Banco emisor
- Fecha de corte (día del mes)
- Fecha de pago (día del mes)
- Límite en Pesos
- Límite en Dólares
- Balance actual Pesos (deuda)
- Balance actual Dólares (deuda)
- Color identificador (opcional)

**Indicadores Visuales:**
- Barra de progreso de uso del crédito
- Color verde (<50%), amarillo (50-80%), rojo (>80%)
- Alerta de próximo corte (5 días antes)
- Alerta de próximo pago (5 días antes)

---

### F6. Categorías

**Categorías Predefinidas (MVP):**

**Gastos:**
| Icono | Nombre | Color |
|-------|--------|-------|
| 🍔 | Alimentación | #f97316 |
| 🚗 | Transporte | #3b82f6 |
| 🏠 | Vivienda | #8b5cf6 |
| 💊 | Salud | #ef4444 |
| 🎮 | Entretenimiento | #ec4899 |
| 🛍️ | Compras | #14b8a6 |
| 💳 | Servicios | #6366f1 |
| 💰 | Pago Tarjeta | #10b981 |
| ❓ | Otros | #6b7280 |

**Ingresos:**
| Icono | Nombre | Color |
|-------|--------|-------|
| 💼 | Salario | #10b981 |
| 💰 | Bono | #22c55e |
| 🎁 | Regalo | #84cc16 |
| 💸 | Otros ingresos | #a3e635 |

**Nota:** En MVP las categorías son fijas, no personalizables.

---

### F7. Lista de Transacciones

**Vista Completa (Ruta: /transactions)**

**Filtros disponibles:**
- Por mes/rango de fechas
- Por cuenta/tarjeta
- Por tipo (ingreso/gasto)
- Por categoría
- Búsqueda por descripción

**Tabla/Lista:**
- Fecha
- Cuenta/Tarjeta (con icono)
- Categoría (con icono y color)
- Descripción
- Monto (color según tipo)
- Moneda
- Acciones: [✏️ Editar] [🗑️ Eliminar]

**Funcionalidad:**
- Paginación: 20 transacciones por página
- Click en fila para ver detalles
- Confirmación antes de eliminar

---

### F8. Pago de Tarjeta de Crédito

**Caso especial de transacción:**

Cuando el usuario registra un pago a tarjeta de crédito:
1. Es un GASTO desde una cuenta bancaria
2. Reduce la deuda de la tarjeta
3. Reduce el balance de la cuenta

```
Tipo: Pago de Tarjeta

Desde: [Cuenta Principal ▼]
Hacia: [Visa Oro ▼]

Monto: $[10,000]
Moneda: [●Pesos] [○Dólares]

Descripción: [Pago mensual]
Fecha: [📅 25/01/2026]

[Cancelar]        [Registrar Pago]
```

**Resultado:**
- Cuenta Principal: -$10,000
- Visa Oro (deuda): -$10,000

---

## 7. MODELO DE DATOS

### Entidades Principales

```typescript
// Usuario
interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  image?: string;
  emailVerified?: Date;
  onboardingCompleted: boolean;  // 🆕
  createdAt: Date;
  updatedAt: Date;
}

// Cuenta Bancaria 🆕
interface BankAccount {
  id: string;
  userId: string;
  name: string;              // "Cuenta Principal"
  bankName: string;          // "Banco XYZ"
  accountType: "savings" | "checking";
  currency: "MXN" | "USD";
  balance: number;           // Balance actual
  color?: string;            // Color para UI
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tarjeta de Crédito 🆕
interface CreditCard {
  id: string;
  userId: string;
  name: string;              // "Visa Oro"
  bankName: string;          // "Banco XYZ"
  cutOffDay: number;         // 1-31
  paymentDueDay: number;     // 1-31
  limitMXN: number;          // Límite en pesos
  limitUSD: number;          // Límite en dólares
  balanceMXN: number;        // Deuda actual en pesos
  balanceUSD: number;        // Deuda actual en dólares
  color?: string;            // Color para UI
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Transacción (actualizada)
interface Transaction {
  id: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  currency: "MXN" | "USD";
  category: string;
  description?: string;
  date: Date;
  
  // 🆕 Relaciones opcionales (una u otra)
  bankAccountId?: string;    // Si es desde/hacia cuenta
  creditCardId?: string;     // Si es desde/hacia tarjeta
  
  // 🆕 Para pagos de tarjeta
  isCardPayment: boolean;
  targetCardId?: string;     // Tarjeta que se paga
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Schema Prisma

```prisma
model User {
  id                  String        @id @default(cuid())
  email               String        @unique
  name                String
  password            String?
  image               String?
  emailVerified       DateTime?
  onboardingCompleted Boolean       @default(false)
  accounts            Account[]     // OAuth
  bankAccounts        BankAccount[]
  creditCards         CreditCard[]
  transactions        Transaction[]
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  @@index([email])
}

model BankAccount {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String        @db.VarChar(50)
  bankName     String        @db.VarChar(50)
  accountType  AccountType
  currency     Currency
  balance      Decimal       @db.Decimal(12, 2)
  color        String?       @db.VarChar(7)
  isActive     Boolean       @default(true)
  transactions Transaction[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([userId])
}

model CreditCard {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String        @db.VarChar(50)
  bankName        String        @db.VarChar(50)
  cutOffDay       Int           @db.SmallInt
  paymentDueDay   Int           @db.SmallInt
  limitMXN        Decimal       @db.Decimal(12, 2)
  limitUSD        Decimal       @db.Decimal(12, 2)
  balanceMXN      Decimal       @db.Decimal(12, 2)
  balanceUSD      Decimal       @db.Decimal(12, 2)
  color           String?       @db.VarChar(7)
  isActive        Boolean       @default(true)
  transactions    Transaction[] @relation("CardTransactions")
  paymentsReceived Transaction[] @relation("CardPayments")
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([userId])
}

model Transaction {
  id            String       @id @default(cuid())
  userId        String
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  type          TransactionType
  amount        Decimal      @db.Decimal(12, 2)
  currency      Currency
  category      String       @db.VarChar(30)
  description   String?      @db.VarChar(100)
  date          DateTime     @db.Date
  
  bankAccountId String?
  bankAccount   BankAccount? @relation(fields: [bankAccountId], references: [id])
  
  creditCardId  String?
  creditCard    CreditCard?  @relation("CardTransactions", fields: [creditCardId], references: [id])
  
  isCardPayment Boolean      @default(false)
  targetCardId  String?
  targetCard    CreditCard?  @relation("CardPayments", fields: [targetCardId], references: [id])
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([userId, date])
  @@index([bankAccountId])
  @@index([creditCardId])
}

enum TransactionType {
  income
  expense
}

enum AccountType {
  savings
  checking
}

enum Currency {
  MXN
  USD
}
```

---

## 8. API ENDPOINTS

### Autenticación
```
POST /api/auth/register
POST /api/auth/signin
POST /api/auth/signout
GET  /api/auth/session
```

### Onboarding 🆕
```
GET  /api/onboarding/status        # Verificar si completó onboarding
POST /api/onboarding/complete      # Marcar como completado
```

### Cuentas Bancarias 🆕
```
GET    /api/accounts               # Listar cuentas del usuario
GET    /api/accounts/:id           # Obtener una cuenta
POST   /api/accounts               # Crear cuenta
PUT    /api/accounts/:id           # Actualizar cuenta
DELETE /api/accounts/:id           # Eliminar cuenta
GET    /api/accounts/:id/balance   # Balance actual
```

### Tarjetas de Crédito 🆕
```
GET    /api/cards                  # Listar tarjetas del usuario
GET    /api/cards/:id              # Obtener una tarjeta
POST   /api/cards                  # Crear tarjeta
PUT    /api/cards/:id              # Actualizar tarjeta
DELETE /api/cards/:id              # Eliminar tarjeta
GET    /api/cards/:id/usage        # Uso del crédito
POST   /api/cards/:id/payment      # Registrar pago
```

### Transacciones
```
GET    /api/transactions           # Listar (con filtros)
GET    /api/transactions/:id       # Obtener una
POST   /api/transactions           # Crear
PUT    /api/transactions/:id       # Actualizar
DELETE /api/transactions/:id       # Eliminar
GET    /api/transactions/summary   # Resumen/totales
```

### Dashboard
```
GET    /api/dashboard/summary      # Balances consolidados
GET    /api/dashboard/alerts       # Alertas de cortes/pagos
```

---

## 9. DISEÑO DE INTERFAZ

### Dirección Estética (Usando frontend-design skill)

**Concepto**: "Fintech Minimal Elegante"
- Limpio pero con personalidad
- Profesional pero accesible
- Moderno sin ser frío

**Tipografía:**
```css
--font-display: 'Outfit', sans-serif;
--font-body: 'Plus Jakarta Sans', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

**Paleta de Colores:**
```css
/* Light Mode */
--background: #fafafa;
--foreground: #0a0a0a;
--card: #ffffff;

/* Acentos */
--primary: #0d9488;      /* Teal profundo */
--secondary: #f97316;    /* Naranja cálido */

/* Semánticos */
--success: #059669;
--danger: #dc2626;
--warning: #d97706;

/* Dark Mode */
--background-dark: #09090b;
--foreground-dark: #fafafa;
--card-dark: #18181b;
```

### Responsive Breakpoints
```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

---

## 10. ESTRATEGIA DE TESTING (TDD con Superpowers)

### Filosofía de Testing

El skill **superpowers** requiere TDD (Test-Driven Development) estricto:

```
┌─────────────────────────────────────────┐
│           CICLO TDD                      │
├─────────────────────────────────────────┤
│                                          │
│   🔴 RED                                 │
│   └─► Escribir test que describe        │
│       el comportamiento deseado         │
│   └─► Ejecutar: test FALLA              │
│                                          │
│   🟢 GREEN                               │
│   └─► Escribir código MÍNIMO            │
│       para pasar el test                │
│   └─► Ejecutar: test PASA               │
│                                          │
│   🔵 REFACTOR                            │
│   └─► Mejorar código sin cambiar        │
│       comportamiento                     │
│   └─► Ejecutar: test sigue PASANDO      │
│                                          │
│   ↻ Repetir para siguiente feature      │
│                                          │
└─────────────────────────────────────────┘
```

### Pirámide de Tests

```
           /\
          /  \
         / E2E \        5-10% - Flujos críticos completos
        /______\
       /        \
      / Integration\    20-30% - APIs, DB, Auth
     /______________\
    /                \
   /      Unit        \  60-70% - Lógica de negocio, utils
  /____________________\
```

### Tests por Feature

| Feature | Unit Tests | Integration Tests | E2E Tests |
|---------|------------|-------------------|-----------|
| Auth | Validaciones, utils | API endpoints, NextAuth | Login/Register flow |
| Onboarding | Validaciones, cálculos | API, persistencia | Flujo completo 4 pasos |
| Cuentas | Balance calculations | CRUD API | Crear/editar cuenta |
| Tarjetas | Límites, uso crédito | CRUD API, alerts | Gestión completa |
| Transacciones | Formateo, filtros | CRUD API | Crear transacción |
| Dashboard | Cálculo totales | Agregaciones | Vista completa |

### Ejemplos de Tests

**Unit Test - Cálculo de balance:**
```typescript
// tests/unit/lib/calculations.test.ts
describe('calculateBalance', () => {
  it('should sum all account balances', () => {
    const accounts = [
      { balance: 15000, currency: 'MXN' },
      { balance: 5000, currency: 'MXN' },
    ];
    
    expect(calculateTotalBalance(accounts)).toBe(20000);
  });

  it('should handle empty accounts', () => {
    expect(calculateTotalBalance([])).toBe(0);
  });

  it('should separate by currency', () => {
    const accounts = [
      { balance: 15000, currency: 'MXN' },
      { balance: 1000, currency: 'USD' },
    ];
    
    const result = calculateBalanceByCurrency(accounts);
    expect(result.MXN).toBe(15000);
    expect(result.USD).toBe(1000);
  });
});
```

**Integration Test - API de transacciones:**
```typescript
// tests/integration/api/transactions.test.ts
describe('POST /api/transactions', () => {
  it('should create transaction and update account balance', async () => {
    // Arrange
    const account = await createTestAccount({ balance: 10000 });
    
    // Act
    const response = await request(app)
      .post('/api/transactions')
      .send({
        type: 'expense',
        amount: 500,
        bankAccountId: account.id,
        category: 'food',
        date: '2026-01-20',
      });
    
    // Assert
    expect(response.status).toBe(201);
    expect(response.body.data.amount).toBe(500);
    
    const updatedAccount = await getAccount(account.id);
    expect(updatedAccount.balance).toBe(9500);
  });

  it('should reject transaction without required fields', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({ type: 'expense' });
    
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

**E2E Test - Flujo de onboarding:**
```typescript
// tests/e2e/onboarding.spec.ts
test('complete onboarding with account and card', async ({ page }) => {
  // Registro
  await page.goto('/register');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123');
  await page.click('button[type="submit"]');
  
  // Paso 1: Bienvenida
  await expect(page.getByText('¡Bienvenido!')).toBeVisible();
  await page.click('text=Comenzar');
  
  // Paso 2: Cuenta bancaria
  await page.fill('[name="accountName"]', 'Cuenta Principal');
  await page.selectOption('[name="bank"]', 'BBVA');
  await page.fill('[name="balance"]', '15000');
  await page.click('text=Continuar');
  
  // Paso 3: Tarjeta
  await page.fill('[name="cardName"]', 'Visa Oro');
  await page.fill('[name="cutOffDay"]', '15');
  await page.fill('[name="limitMXN"]', '50000');
  await page.fill('[name="balanceMXN"]', '12500');
  await page.click('text=Continuar');
  
  // Paso 4: Resumen
  await expect(page.getByText('$15,000.00')).toBeVisible();
  await expect(page.getByText('$12,500.00')).toBeVisible();
  await page.click('text=Comenzar a usar');
  
  // Dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Balance Total')).toBeVisible();
});
```

### Herramientas de Testing

```yaml
Unit & Integration:
  runner: Vitest
  assertions: Vitest built-in
  mocking: Vitest mocks + MSW
  coverage: @vitest/coverage-v8
  
E2E:
  framework: Playwright
  browsers: Chromium, Firefox, WebKit
  
Database Testing:
  strategy: Test database con Prisma
  cleanup: Truncate entre tests
  
CI:
  github_actions: true
  parallel: true
  coverage_threshold: 70%
```

### Coverage Goals

| Área | Objetivo | Crítico |
|------|----------|---------|
| Lógica de negocio (lib/) | 90% | ✅ |
| API Routes | 85% | ✅ |
| Hooks personalizados | 80% | ✅ |
| Componentes UI | 60% | ⚠️ |
| **Total** | **75%** | ✅ |

---

## 11. CRONOGRAMA MVP (Actualizado)

### Sprint 1 (Semana 1): Setup + Auth + Onboarding
```
Tareas:
- [ ] Setup proyecto Next.js 15 + TypeScript
- [ ] Configurar Tailwind + shadcn/ui
- [ ] Setup Prisma + PostgreSQL (Railway)
- [ ] Implementar NextAuth.js (email + Google)
- [ ] Crear páginas login/register
- [ ] 🆕 Implementar flujo de Onboarding completo
- [ ] 🆕 Modelos: User, BankAccount, CreditCard
- [ ] Landing page básica
- [ ] Deploy inicial en Railway

Entregable: Auth + Onboarding funcional
```

### Sprint 2 (Semana 2): Core Features
```
Tareas:
- [ ] Modelo de datos Transaction
- [ ] API CRUD de transacciones
- [ ] 🆕 API CRUD de cuentas bancarias
- [ ] 🆕 API CRUD de tarjetas de crédito
- [ ] Dashboard con balances consolidados
- [ ] Formulario crear transacción (con selector cuenta/tarjeta)
- [ ] Lista de transacciones

Entregable: CRUD completo funcionando
```

### Sprint 3 (Semana 3): UI/UX + Polish
```
Tareas:
- [ ] Diseño distintivo (implementar mockups de Figma)
- [ ] Dark mode
- [ ] Responsive completo
- [ ] 🆕 Páginas de gestión de cuentas y tarjetas
- [ ] 🆕 Indicadores visuales de uso de crédito
- [ ] 🆕 Alertas de cortes y pagos
- [ ] Editar/eliminar transacciones
- [ ] Validaciones + errores
- [ ] Loading states
- [ ] Animaciones

Entregable: UI pulida y responsive
```

### Sprint 4 (Semana 4): Testing + Launch
```
Tareas:
- [ ] Tests unitarios críticos
- [ ] Tests E2E flujos principales
- [ ] Testing manual completo
- [ ] Corrección de bugs
- [ ] Optimización de performance
- [ ] Setup Sentry
- [ ] Deploy final
- [ ] Documentación

Entregable: MVP listo para usuarios
```

**Total: 4 semanas para MVP funcional**

---

## 12. STACK TÉCNICO

```yaml
Frontend:
  framework: Next.js 15 (App Router)
  ui_library: React 19
  language: TypeScript (strict mode)
  styling: Tailwind CSS v4
  components: shadcn/ui
  forms: React Hook Form + Zod
  icons: Lucide React
  animations: Framer Motion

Backend:
  runtime: Node.js (via Next.js)
  api: Next.js Route Handlers
  orm: Prisma
  auth: NextAuth.js v5

Database:
  primary: PostgreSQL
  provider: Railway

Design:
  tool: Figma
  mockups: High-fidelity antes de desarrollo

Development:
  tool: Claude Code
  skills:
    - frontend-design
    - superpowers

Deployment:
  platform: Railway
  ci_cd: GitHub Actions
```

---

## 13. CRITERIOS DE ACEPTACIÓN

### Historia: Usuario completa onboarding
```gherkin
Scenario: Completar onboarding con cuenta y tarjeta
  Given soy un usuario nuevo que acaba de registrarse
  When completo el formulario de bienvenida
  And agrego una cuenta bancaria:
    | Campo   | Valor           |
    | Nombre  | Cuenta Nómina   |
    | Banco   | BBVA            |
    | Tipo    | Ahorro          |
    | Moneda  | Pesos           |
    | Balance | 15000           |
  And agrego una tarjeta de crédito:
    | Campo         | Valor     |
    | Nombre        | Visa Oro  |
    | Banco         | BBVA      |
    | Corte         | 15        |
    | Pago          | 25        |
    | Límite Pesos  | 50000     |
    | Balance Pesos | 12500     |
  And confirmo en el resumen
  Then soy redirigido al dashboard
  And veo mi balance total de $15,000
  And veo mi deuda total de $12,500
  And veo mi balance neto de $2,500
```

### Historia: Registrar gasto con tarjeta
```gherkin
Scenario: Registrar gasto con tarjeta de crédito
  Given estoy en el dashboard
  And mi tarjeta "Visa Oro" tiene deuda de $12,500 con límite de $50,000
  When registro un gasto:
    | Campo       | Valor       |
    | Tipo        | Gasto       |
    | Origen      | Visa Oro    |
    | Monto       | 500         |
    | Categoría   | Alimentación|
  Then la transacción se guarda
  And la deuda de "Visa Oro" ahora es $13,000
  And veo la barra de uso actualizada (26%)
```

---

## 14. RESUMEN EJECUTIVO

| Aspecto | Detalle |
|---------|---------|
| **Producto** | App web de finanzas personales |
| **Objetivo** | MVP funcional en 4 semanas |
| **Usuario** | Persona 25-45 años que quiere controlar gastos |
| **Core Features** | Onboarding inicial + Cuentas/Tarjetas + Transacciones + Balance consolidado |
| **Diferenciador** | Visión completa desde el día 1, diseño distintivo, multi-moneda |
| **Stack** | Next.js 15 + TypeScript + PostgreSQL + Railway |
| **Diseño** | Figma (mockups) + frontend-design skill |
| **Desarrollo** | Claude Code + superpowers (TDD, YAGNI, DRY) |
| **Testing** | TDD obligatorio, 75% coverage mínimo |
| **Inversión inicial** | $0 (planes gratuitos) |

### Skills de Claude Code Utilizados

| Skill | Propósito | Aplicación |
|-------|-----------|------------|
| **superpowers** | Workflow de desarrollo estructurado | Spec → Plan → TDD → Review → Deploy |
| **frontend-design** | UI distintiva y de alta calidad | Tipografía, colores, animaciones, layouts únicos |

---

## 📝 INSTRUCCIONES PARA CLAUDE CODE

### Flujo de Desarrollo con Superpowers

El desarrollo seguirá el workflow del skill **superpowers** en cada sprint:

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW SUPERPOWERS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣ ESPECIFICACIÓN                                          │
│     └─► Claude pregunta: "¿Qué quieres lograr?"             │
│     └─► Spec en chunks digeribles                           │
│     └─► Humano aprueba antes de continuar                   │
│                                                              │
│  2️⃣ PLAN DE IMPLEMENTACIÓN                                  │
│     └─► Tareas atómicas y claras                            │
│     └─► Orden de dependencias                               │
│     └─► Tests definidos para cada tarea                     │
│     └─► Humano revisa y aprueba plan                        │
│                                                              │
│  3️⃣ DESARROLLO TDD (por cada tarea)                         │
│     └─► 🔴 RED: Escribir test que falla                     │
│     └─► 🟢 GREEN: Código mínimo para pasar                  │
│     └─► 🔵 REFACTOR: Limpiar sin romper tests               │
│                                                              │
│  4️⃣ REVISIÓN AUTOMÁTICA                                     │
│     └─► Subagente revisa código                             │
│     └─► Verifica principios (YAGNI, DRY, KISS)              │
│     └─► Sugiere mejoras                                      │
│                                                              │
│  5️⃣ SIGUIENTE TAREA                                         │
│     └─► Continúa autónomamente                              │
│     └─► Reporta progreso periódicamente                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de Tests (TDD)

```
tests/
├── unit/                     # Tests unitarios
│   ├── lib/
│   │   ├── utils.test.ts
│   │   └── validations.test.ts
│   └── hooks/
│       └── use-balance.test.ts
├── integration/              # Tests de integración
│   ├── api/
│   │   ├── transactions.test.ts
│   │   ├── accounts.test.ts
│   │   └── cards.test.ts
│   └── auth/
│       └── auth-flow.test.ts
└── e2e/                      # Tests end-to-end
    ├── onboarding.spec.ts
    ├── transactions.spec.ts
    └── dashboard.spec.ts
```

### Prompts sugeridos por Sprint:

**Sprint 1 - Inicio:**
```
"Vamos a construir una app de finanzas personales. Usa los skills 
superpowers y frontend-design. 

El PRD está en [ruta del archivo].

Comencemos con Sprint 1: Setup, Auth y Onboarding.

Antes de escribir código:
1. Revisa el PRD completo
2. Hazme preguntas si algo no está claro
3. Muéstrame la especificación técnica en chunks
4. Propón el plan de implementación con tareas atómicas
5. Espera mi aprobación antes de empezar

Stack: Next.js 15, TypeScript strict, Tailwind v4, shadcn/ui, 
Prisma, PostgreSQL, NextAuth.js v5.

Diseño: Implementar según mockups de Figma, usar frontend-design 
skill para UI distintiva (NO Inter/Roboto, NO gradientes genéricos)."
```

**Sprint 1 - Ejecución (después de aprobar plan):**
```
"Aprobado el plan. Ejecuta Sprint 1 usando TDD:

Para cada tarea:
1. Escribe el test primero (RED)
2. Implementa el código mínimo (GREEN)  
3. Refactoriza si es necesario (REFACTOR)

Trabaja autónomamente y repórtame cuando:
- Completes un grupo de tareas relacionadas
- Encuentres una decisión de diseño importante
- Tengas dudas sobre el PRD

Empieza con el setup del proyecto y los modelos de Prisma."
```

**Sprint 2:**
```
"Continuemos con Sprint 2: Core Features.

Según el PRD, necesitamos:
- CRUD de transacciones (asociadas a cuenta/tarjeta)
- CRUD de cuentas bancarias
- CRUD de tarjetas de crédito
- Dashboard con balances consolidados

Muéstrame el plan de implementación con TDD para este sprint.
Incluye los tests que escribirás para cada API endpoint."
```

**Sprint 3:**
```
"Sprint 3: UI/UX y Polish.

Ahora aplicamos el skill frontend-design intensivamente:
- Implementar mockups de Figma con precisión
- Dark mode completo
- Responsive mobile-first
- Animaciones y microinteracciones
- Indicadores visuales de uso de crédito
- Alertas de cortes y pagos

Muéstrame el plan para pulir la UI. Cada componente debe 
pasar por revisión de diseño."
```

**Sprint 4:**
```
"Sprint 4 final: Testing completo y Launch.

Necesito:
1. Completar cobertura de tests (unit + integration + e2e)
2. Testing manual de todos los flujos
3. Optimización de Core Web Vitals
4. Configurar Sentry para errores
5. Deploy a producción en Railway
6. README documentado

Genera un checklist de pre-launch y ejecuta cada item."
```

### Checklist Pre-Launch

```markdown
## Pre-Launch Checklist

### Funcionalidad
- [ ] Registro/Login funcionando (email + Google)
- [ ] Onboarding completo sin errores
- [ ] CRUD de cuentas bancarias
- [ ] CRUD de tarjetas de crédito
- [ ] CRUD de transacciones
- [ ] Pago de tarjeta funciona correctamente
- [ ] Dashboard muestra balances correctos
- [ ] Filtros de transacciones funcionando
- [ ] Dark mode sin bugs visuales

### Testing
- [ ] Tests unitarios pasando (>80% coverage en lógica)
- [ ] Tests de integración de APIs pasando
- [ ] Tests E2E de flujos críticos pasando
- [ ] Testing manual en Chrome, Firefox, Safari
- [ ] Testing manual en iOS y Android

### Performance
- [ ] LCP < 2.0s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Bundle size < 100KB (first load)

### Seguridad
- [ ] HTTPS configurado
- [ ] Variables de entorno seguras
- [ ] Rate limiting en auth
- [ ] Validación en frontend Y backend

### Infraestructura
- [ ] Railway configurado (app + DB)
- [ ] Dominio configurado (si aplica)
- [ ] Sentry configurado
- [ ] Backups automáticos activos

### Documentación
- [ ] README actualizado
- [ ] Variables de entorno documentadas
- [ ] Instrucciones de desarrollo local
```

---

**Versión**: 2.2  
**Fecha**: Enero 2026  
**Estado**: Listo para desarrollo con Claude Code + Superpowers
