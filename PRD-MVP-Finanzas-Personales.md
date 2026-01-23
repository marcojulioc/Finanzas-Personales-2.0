# 📋 PRD - MVP Aplicación de Finanzas Personales

---

## 1. VISIÓN DEL PRODUCTO

### Objetivo
Crear una aplicación web responsive que permita a usuarios registrar y visualizar sus transacciones financieras diarias de manera simple y rápida, con acceso desde cualquier dispositivo.

### Problema que Resuelve
Las personas pierden el control de sus gastos diarios porque:
- No tienen una forma rápida de registrar transacciones en el momento
- Las apps existentes son muy complejas o requieren instalación
- No tienen visibilidad clara de en qué gastan su dinero

### Propuesta de Valor
Una aplicación web simple, rápida y accesible desde cualquier navegador que permite registrar gastos/ingresos en segundos y ver el balance actual de forma clara.

---

## 2. ALCANCE DEL MVP

### ✅ Incluido en MVP
- Sistema de autenticación básico
- Registro rápido de transacciones
- Lista de transacciones
- Balance actual
- Categorías predefinidas
- Vista responsive (mobile + desktop)

### ✅ Implementado en Fase 2
- ✅ Presupuestos mensuales por categoría
- ✅ Reportes avanzados/gráficos
- ✅ Múltiples cuentas bancarias
- ✅ Tarjetas de crédito
- ✅ Transacciones recurrentes
- ✅ Notificaciones in-app
- ✅ Categorías personalizadas
- ✅ Multi-moneda (28 monedas)
- ✅ PWA (Progressive Web App)

### ❌ Pendiente (Fase 3)
- Exportación de datos (CSV/PDF)
- Compartir con familia
- Adjuntar recibos/fotos
- Metas de ahorro
- Transferencias entre cuentas
- Conversión de monedas automática

---

## 3. USUARIOS Y CASOS DE USO

### Usuario Principal
**Persona de 25-45 años** que quiere controlar sus gastos personales sin complejidad.

### Casos de Uso Principales

#### CU-01: Registrar Gasto Rápido
```
Como usuario
Quiero registrar un gasto en menos de 10 segundos
Para no olvidar mis transacciones del día
```

#### CU-02: Ver Balance Actual
```
Como usuario
Quiero ver mi balance actual al entrar
Para saber cuánto dinero tengo disponible
```

#### CU-03: Ver Historial
```
Como usuario
Quiero ver mis últimas transacciones
Para recordar en qué he gastado
```

#### CU-04: Editar/Eliminar Transacción
```
Como usuario
Quiero corregir una transacción mal registrada
Para mantener mis datos precisos
```

---

## 4. FUNCIONALIDADES DETALLADAS

### F1. Autenticación

**Registro de Usuario**
- Email + Contraseña
- Nombre completo
- Validación de email único
- Contraseña mínimo 8 caracteres

**Login**
- Email + Contraseña
- Recordar sesión (opcional)
- Mensaje de error claro

**Recuperar Contraseña**
- No incluido en MVP (usar email manual)

---

### F2. Dashboard Principal

**Componentes:**

```
┌─────────────────────────────────────┐
│  Header (Logo + Usuario + Logout)   │
├─────────────────────────────────────┤
│                                     │
│  💰 BALANCE ACTUAL: $1,234.56      │
│  ↗️ Ingresos: $2,000               │
│  ↘️ Gastos: -$765.44               │
│                                     │
│  [+ Nueva Transacción]             │
│                                     │
├─────────────────────────────────────┤
│  📋 TRANSACCIONES RECIENTES        │
│                                     │
│  🍔 Almuerzo      -$12.50          │
│  💼 Salario      +$2,000.00        │
│  ☕ Café         -$4.50            │
│  ...                                │
│                                     │
│  [Ver Todas]                        │
└─────────────────────────────────────┘
```

**Reglas:**
- Balance = Total Ingresos - Total Gastos (del mes actual)
- Mostrar últimas 10 transacciones
- Ordenadas por fecha (más reciente primero)
- Colores: Verde (ingreso), Rojo (gasto)

---

### F3. Registrar Transacción

**Modal/Página con Formulario:**

```
Tipo: [Gasto] [Ingreso]  (Toggle)
Monto: $ _____ (requerido, número positivo)
Categoría: [Selector] (requerido)
Descripción: _____ (opcional, max 100 chars)
Fecha: [📅] (default: hoy)

[Cancelar]  [Guardar]
```

**Validaciones:**
- Monto > 0
- Categoría seleccionada
- Fecha no futura

**Comportamiento:**
- Al guardar: cierra modal y actualiza lista
- Muestra mensaje de éxito
- Si hay error, muestra mensaje claro

---

### F4. Categorías

**Categorías Predefinidas (MVP):**

**Gastos:**
- 🍔 Alimentación
- 🚗 Transporte
- 🏠 Vivienda
- 💊 Salud
- 🎮 Entretenimiento
- 🛍️ Compras
- 💳 Servicios
- ❓ Otros

**Ingresos:**
- 💼 Salario
- 💰 Bono
- 🎁 Regalo
- 💸 Otros ingresos

**Nota:** En MVP las categorías son fijas, no personalizables.

---

### F5. Lista de Transacciones

**Vista Completa (Ruta: /transactions)**

**Componentes:**
- Filtro por mes (opcional en MVP)
- Tabla/Lista con:
  - Fecha
  - Categoría (con icono)
  - Descripción
  - Monto (color según tipo)
  - Acciones: [✏️ Editar] [🗑️ Eliminar]

**Funcionalidad:**
- Paginación: 20 transacciones por página
- Click en fila para ver detalles
- Confirmación antes de eliminar

---

### F6. Editar Transacción

**Modal similar a crear, pre-llenado con datos:**
- Permite cambiar todos los campos
- Validaciones iguales a crear
- Botón "Actualizar" en lugar de "Guardar"
- Al guardar: actualiza lista y balance

---

### F7. Eliminar Transacción

**Confirmación:**
```
⚠️ ¿Eliminar transacción?

"Almuerzo - $12.50"

Esta acción no se puede deshacer.

[Cancelar]  [Eliminar]
```

**Comportamiento:**
- Al confirmar: elimina y actualiza balance
- Muestra mensaje de éxito
- No permite deshacer (en MVP)

---

## 5. DISEÑO DE INTERFAZ

### Paleta de Colores
```css
Primario: #3b82f6 (Azul)
Secundario: #8b5cf6 (Violeta)
Éxito: #10b981 (Verde)
Peligro: #ef4444 (Rojo)
Advertencia: #f59e0b (Naranja)
Neutral: #6b7280 (Gris)
Fondo: #f9fafb (Gris claro)
```

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Navegación Mobile
```
┌─────────────────────┐
│  ☰  Logo    👤      │  Header sticky
├─────────────────────┤
│                     │
│    Contenido        │
│                     │
├─────────────────────┤
│ [🏠] [➕] [📊] [⚙️] │  Bottom Nav
└─────────────────────┘
```

### Navegación Desktop
```
Sidebar izquierdo con:
- Dashboard
- Transacciones
- Configuración
- Cerrar Sesión
```

---

## 6. MODELO DE DATOS

### Entidades Principales

```typescript
// Usuario
User {
  id: string
  email: string (unique)
  name: string
  password: string (hash)
  createdAt: datetime
  updatedAt: datetime
}

// Transacción
Transaction {
  id: string
  userId: string (FK)
  type: enum ["income", "expense"]
  amount: decimal (2 decimales)
  category: string
  description: string (optional)
  date: date
  createdAt: datetime
  updatedAt: datetime
}
```

### Índices de Base de Datos
- `User.email` (unique)
- `Transaction.userId` + `Transaction.date` (compuesto)
- `Transaction.createdAt`

---

## 7. REGLAS DE NEGOCIO

### RN-01: Cálculo de Balance
```
Balance del Mes = Σ(Ingresos) - Σ(Gastos)
Donde: mes actual = fecha de transacción en mes/año actual
```

### RN-02: Formato de Moneda
- Siempre mostrar 2 decimales
- Símbolo de moneda: $ (dólar por defecto)
- Formato: $1,234.56

### RN-03: Fechas
- Por defecto: fecha actual
- No permitir fechas futuras
- Mostrar formato: DD/MM/YYYY

### RN-04: Montos
- Siempre valores positivos en DB
- El tipo (income/expense) define el signo
- Monto mínimo: $0.01
- Monto máximo: $999,999.99

### RN-05: Seguridad
- Usuario solo ve sus propias transacciones
- Token JWT válido por 7 días
- Sesión se cierra al cerrar navegador (sin remember)

---

## 8. FLUJOS DE USUARIO

### Flujo 1: Primer Uso
```
1. Usuario entra a landing page
2. Click en "Registrarse"
3. Completa formulario de registro
4. Confirmación por email (opcional en MVP, auto-login)
5. Redirige a dashboard vacío
6. Mensaje de bienvenida con CTA "Agrega tu primera transacción"
7. Abre modal de nueva transacción
8. Registra primera transacción
9. Ve transacción en lista y balance actualizado
```

### Flujo 2: Uso Diario
```
1. Usuario entra (ya logueado)
2. Ve dashboard con balance actual
3. Click en botón "+" flotante
4. Modal de nueva transacción
5. Selecciona tipo (Gasto/Ingreso)
6. Ingresa monto
7. Selecciona categoría
8. (Opcional) Agrega descripción
9. Click "Guardar"
10. Modal se cierra
11. Ve transacción agregada en lista
12. Balance actualizado automáticamente
```

### Flujo 3: Corrección
```
1. Usuario ve lista de transacciones
2. Identifica transacción incorrecta
3. Click en botón "Editar" (✏️)
4. Modal pre-llenado
5. Modifica campos necesarios
6. Click "Actualizar"
7. Confirmación de cambio
8. Lista y balance actualizados
```

---

## 9. EXPERIENCIA MOBILE

### Optimizaciones Mobile:
- **Input de monto**: Teclado numérico automático
- **Botón flotante "+"**: Siempre accesible
- **Gestos**: Swipe izquierda para eliminar (opcional)
- **Carga rápida**: < 2 segundos
- ✅ **PWA**: Implementado - App instalable en dispositivos

### PWA (Progressive Web App) - ✅ IMPLEMENTADO
```yaml
Características:
  - Instalable en móvil y desktop
  - Icono personalizado ($ en fondo teal)
  - Modo standalone (sin barra de navegador)
  - Caché agresivo para navegación rápida
  - Service Worker para rendimiento

Manifest:
  - name: "Finanzas - Control de Gastos"
  - theme_color: "#0d9488"
  - background_color: "#0f172a"
  - display: "standalone"
  - orientation: "portrait-primary"

Iconos generados:
  - 72x72, 96x96, 128x128, 144x144
  - 152x152, 192x192, 384x384, 512x512
  - apple-touch-icon (180x180)
```

### Navegación Mobile:
```
Bottom Navigation Bar:
┌──────┬──────┬──────┬──────┐
│  🏠  │  ➕  │  📋  │  ⚙️  │
│ Home │ Add  │ List │ Conf │
└──────┴──────┴──────┴──────┘
```

---

## 10. MÉTRICAS DE ÉXITO (MVP)

### Métricas Técnicas:
- ✅ Tiempo de carga inicial < 2 segundos
- ✅ Registro de transacción < 10 segundos
- ✅ Uptime > 99%
- ✅ Errores críticos = 0

### Métricas de Producto:
- 📊 Usuarios registrados
- 📊 Transacciones creadas por usuario
- 📊 Tasa de retención día 7
- 📊 Tiempo promedio de sesión

### KPIs del MVP:
- **Objetivo**: 50 usuarios en primer mes
- **Engagement**: Promedio 5+ transacciones/usuario/semana
- **Retención D7**: > 40%

---

## 11. REQUERIMIENTOS NO FUNCIONALES

### Rendimiento
- Tiempo de respuesta API: < 500ms
- Carga inicial: < 2 segundos
- Transición entre páginas: < 100ms

### Seguridad
- HTTPS obligatorio
- Passwords hasheados (bcrypt)
- Validación en frontend y backend
- Protección contra SQL injection (Prisma ORM)
- Rate limiting en endpoints de auth

### Usabilidad
- Accesible desde cualquier navegador moderno
- Responsive: mobile, tablet, desktop
- Mensajes de error claros
- Estados de carga visibles

### Compatibilidad
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile: iOS 14+, Android 10+

---

## 12. STACK TÉCNICO (Confirmado)

```yaml
Frontend:
  - Next.js 16 (App Router + Turbopack)
  - React 19
  - TypeScript
  - Tailwind CSS v4
  - shadcn/ui
  - Recharts (gráficos)
  - next-pwa (PWA)

Backend:
  - Next.js API Routes
  - Prisma ORM
  - NextAuth.js v5

Database:
  - PostgreSQL

Deployment:
  - Railway (app + database)

Repositorio:
  - GitHub (CI/CD automático)

PWA:
  - @ducanh2912/next-pwa
  - Service Worker
  - Web App Manifest
```

---

## 13. CRONOGRAMA MVP

### Sprint 1 (Semana 1): Setup + Auth
- ✅ Setup proyecto Next.js
- ✅ Configurar Prisma + PostgreSQL
- ✅ Implementar autenticación (registro/login)
- ✅ Página de landing básica
- ✅ Deploy inicial en Railway

### Sprint 2 (Semana 2): Core Features
- ✅ Modelo de datos Transaction
- ✅ CRUD de transacciones (backend)
- ✅ Dashboard con balance
- ✅ Formulario crear transacción
- ✅ Lista de transacciones

### Sprint 3 (Semana 3): UI/UX + Polish
- ✅ Implementar componentes shadcn/ui
- ✅ Responsive design (mobile + desktop)
- ✅ Editar/eliminar transacciones
- ✅ Validaciones y manejo de errores
- ✅ Loading states y feedback

### Sprint 4 (Semana 4): Testing + Launch
- ✅ Testing manual completo
- ✅ Corrección de bugs
- ✅ Optimización de performance
- ✅ Deploy a producción
- ✅ Documentación básica

**Total: 4 semanas para MVP funcional**

---

## 14. CRITERIOS DE ACEPTACIÓN

### Historia 1: Usuario puede registrarse
```
DADO que soy un nuevo usuario
CUANDO completo el formulario de registro con email y contraseña válidos
ENTONCES se crea mi cuenta y soy redirigido al dashboard
Y puedo empezar a usar la aplicación inmediatamente
```

### Historia 2: Usuario puede registrar gasto
```
DADO que estoy logueado en el dashboard
CUANDO hago click en "Nueva Transacción"
Y selecciono tipo "Gasto"
Y ingreso monto $25.50
Y selecciono categoría "Alimentación"
Y hago click en "Guardar"
ENTONCES veo la transacción en mi lista
Y mi balance se actualiza restando $25.50
Y veo un mensaje de confirmación
```

### Historia 3: Usuario puede ver su balance
```
DADO que tengo transacciones registradas
CUANDO entro al dashboard
ENTONCES veo mi balance actual calculado correctamente
Y veo el total de ingresos del mes
Y veo el total de gastos del mes
Y los números están formateados como moneda ($X,XXX.XX)
```

### Historia 4: Usuario puede editar transacción
```
DADO que veo mi lista de transacciones
CUANDO hago click en "Editar" en una transacción
Y modifico el monto de $20 a $25
Y hago click en "Actualizar"
ENTONCES la transacción se actualiza
Y mi balance refleja el cambio
Y veo la transacción actualizada en la lista
```

---

## 15. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Usuario olvida contraseña | Alta | Medio | Función recuperar contraseña (Fase 2) |
| Errores de cálculo de balance | Baja | Alto | Testing exhaustivo + validaciones |
| Lentitud en mobile | Media | Alto | Optimización, lazy loading |
| Superar límite gratis Railway | Media | Medio | Monitorear uso, plan de upgrade |
| Pérdida de datos | Baja | Crítico | Backups automáticos de Railway |

---

## 16. PREGUNTAS ABIERTAS

- [x] ¿Moneda única ($) o soporte multi-moneda? → ✅ **Multi-moneda implementado (28 monedas)**
- [x] ¿Permitir transacciones en fechas pasadas? → ✅ **Sí, permitido**
- [ ] ¿Límite máximo de transacciones por usuario?
- [ ] ¿Google OAuth además de email/password?
- [x] ¿Dark mode desde MVP o Fase 2? → ✅ **Implementado con next-themes**

---

## 17. FASE 2 - IMPLEMENTADO

### Funcionalidades Implementadas:
1. ✅ **Presupuestos mensuales por categoría** - Con navegación por mes y copia
2. ✅ **Gráficos y reportes visuales** - Recharts con múltiples vistas
3. ✅ **Múltiples cuentas bancarias** - CRUD completo con colores
4. ✅ **Tarjetas de crédito** - Con fechas de corte y pago
5. ✅ **Transacciones recurrentes** - Diario, semanal, quincenal, mensual, anual
6. ✅ **Notificaciones in-app** - Campana con alertas de presupuestos, tarjetas, recurrentes
7. ✅ **Categorías personalizadas** - Crear, editar, eliminar con iconos y colores
8. ✅ **Multi-moneda** - 28 monedas (Caribe, América, Europa)
9. ✅ **PWA** - App instalable en móvil y desktop

---

## 18. FASE 3 - PENDIENTE

### Funcionalidades Futuras:
1. **Exportar a CSV/PDF** - Descargar historial de transacciones
2. **Compartir con familia** - Cuentas compartidas
3. **Adjuntar recibos/fotos** - Guardar comprobantes
4. **Metas de ahorro** - Objetivos financieros con progreso
5. **Transferencias entre cuentas** - Mover dinero entre cuentas propias
6. **Conversión de monedas** - Tasas de cambio automáticas
7. **Calendario de pagos** - Vista calendario de recurrentes y tarjetas
8. **App móvil nativa (React Native)** - Versión nativa opcional

---

## 📊 RESUMEN EJECUTIVO

**Producto**: App web de finanzas personales  
**Objetivo**: MVP funcional en 4 semanas  
**Usuario**: Persona que quiere controlar gastos diarios  
**Core Feature**: Registro rápido de transacciones + balance actual  
**Stack**: Next.js + TypeScript + PostgreSQL + Railway  
**Inversión inicial**: $0 (plan gratuito Railway)  
**Métrica de éxito**: 50 usuarios en mes 1, 5+ transacciones/semana/usuario  

---

## 📝 NOTAS FINALES

Este PRD define el alcance mínimo viable para una aplicación de finanzas personales funcional y útil. El enfoque está en la simplicidad y velocidad de uso, permitiendo a los usuarios registrar transacciones en segundos y ver su balance actual de forma clara.

El MVP se puede completar en 4 semanas con un desarrollador full-stack y sirve como base sólida para iteraciones futuras basadas en feedback real de usuarios.

---

**Versión**: 2.0
**Fecha**: Enero 2026
**Autor**: Equipo de Producto
**Estado**: Fase 2 Completada

---

## 📜 CHANGELOG

### v2.0 (Enero 2026) - Fase 2 Completa
- ✅ PWA (Progressive Web App) - App instalable
- ✅ Multi-moneda (28 monedas)
- ✅ Categorías personalizables
- ✅ Notificaciones in-app
- ✅ Transacciones recurrentes
- ✅ Presupuestos mensuales
- ✅ Reportes con gráficos
- ✅ Múltiples cuentas bancarias
- ✅ Tarjetas de crédito

### v1.0 (Enero 2026) - MVP
- Sistema de autenticación
- CRUD de transacciones
- Dashboard con balance
- Categorías predefinidas
- Vista responsive
