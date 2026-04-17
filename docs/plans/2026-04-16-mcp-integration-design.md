# Diseño: Integración MCP para Control por Voz/Texto desde Claude

**Fecha:** 2026-04-16
**Estado:** Diseño aprobado, pendiente de implementación
**Autor:** Marco + Claude

## Problema

Hoy, para registrar una transacción, hay que abrir la app web, navegar a transacciones, llenar un formulario y enviarlo. Queremos poder hacer lo mismo desde el teléfono (app móvil de Claude) usando comandos naturales por voz o texto:

> "Agrega un pago recibido en mi cuenta Popular de 500 por concepto de bono"

## Solución

Construir un **MCP (Model Context Protocol) server** separado que exponga las APIs de la app como tools que Claude puede invocar. El usuario habla con Claude, Claude llama al MCP server, el MCP server llama a la API existente.

## Arquitectura

```
┌──────────────────────┐
│  Claude app (móvil)  │
└──────────┬───────────┘
           │ Protocolo MCP sobre HTTP (Streamable HTTP)
           │ Bearer: MCP_PUBLIC_KEY
           ▼
┌──────────────────────────────────────────┐
│  Railway Project: Finanzas-Personales    │
│                                          │
│  ┌──────────────────┐  ┌──────────────┐ │
│  │  Next.js app     │  │  MCP Server  │ │
│  │  (existente)     │◄─┤  (nuevo)     │ │
│  │                  │  │              │ │
│  │  /api/*          │  │  Node.js +   │ │
│  │                  │  │  @mcp/sdk    │ │
│  └────────┬─────────┘  └──────────────┘ │
│           │ Red privada de Railway      │
│           │ X-API-Key: INTERNAL_API_KEY │
│           ▼                             │
│  ┌──────────────────┐                   │
│  │   PostgreSQL     │                   │
│  └──────────────────┘                   │
└──────────────────────────────────────────┘
```

**Servicios:**
- **Servicio 1 (existente):** App Next.js. Recibe cambios mínimos en middleware de auth.
- **Servicio 2 (nuevo):** MCP server. Node.js/TypeScript, stateless, se comunica con la app Next.js por red privada.

**Comunicación:**
- Claude app → MCP server: HTTPS público con Bearer token.
- MCP server → Next.js API: Red privada de Railway (no sale a internet) con API key en header.

### Estructura de carpetas (monorepo)

```
Finanzas-Personales-2.0/
├── src/                     # App Next.js (existente)
├── prisma/
├── mcp-server/              # NUEVO
│   ├── src/
│   │   ├── index.ts         # Entry point, servidor HTTP
│   │   ├── server.ts        # Registro de tools MCP
│   │   ├── api-client.ts    # Wrapper fetch a la API
│   │   ├── tools/
│   │   │   ├── list-accounts.ts
│   │   │   ├── get-balance.ts
│   │   │   ├── create-transaction.ts
│   │   │   └── list-transactions.ts
│   │   └── types.ts
│   ├── package.json
│   ├── Dockerfile
│   └── railway.json
└── package.json
```

## Autenticación y seguridad

### Flujo de 2 capas

```
Claude app ──[Authorization: Bearer MCP_PUBLIC_KEY]──► MCP Server
MCP Server ──[X-API-Key: INTERNAL_API_KEY]──────────► Next.js API
```

### Capa 1: Claude app → MCP Server

- MCP server valida el Bearer token contra `process.env.MCP_PUBLIC_KEY`.
- Si no coincide → 401, rechazado antes de tocar la app.

### Capa 2: MCP Server → Next.js API

- MCP server agrega `X-API-Key` a cada request.
- El middleware de Next.js valida contra `process.env.INTERNAL_API_KEY`.
- Si es válido, trata el request como autenticado con `OWNER_USER_ID` (hardcodeado en env var — solo hay un usuario).

### Cambios en la app Next.js

Agregar helper en `src/lib/auth.ts`:

```typescript
export async function authenticateRequest(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
    return { userId: process.env.OWNER_USER_ID!, via: "mcp" as const };
  }
  const session = await auth();
  return session ? { userId: session.user.id, via: "session" as const } : null;
}
```

Reemplazar `auth()` por `authenticateRequest()` en los endpoints que consume el MCP:
- `POST /api/transactions`
- `GET /api/transactions` (listado)
- `GET /api/accounts`
- `GET /api/cards`
- `GET /api/categories`

El resto de endpoints **no se modifican**.

### Por qué es seguro

- Keys viven en variables de entorno de Railway (cifradas en reposo).
- Tráfico MCP ↔ Next.js por red privada de Railway (nunca sale a internet).
- Si MCP_PUBLIC_KEY se filtra: atacante puede crear transacciones pero no accede a DB ni a NextAuth.
- Rotación: cambiar la variable en Railway toma segundos.

### Generación de keys

```bash
openssl rand -base64 32  # MCP_PUBLIC_KEY
openssl rand -base64 32  # INTERNAL_API_KEY
```

## Tools del MVP

### 1. `list_accounts`

Lista cuentas bancarias activas, tarjetas y categorías disponibles. Claude lo llama al iniciar conversación para tener contexto.

**Input:** ninguno

**Output:**
```typescript
{
  bankAccounts: Array<{ id, name, currency, balance }>,
  creditCards: Array<{ id, name, currency, debt }>,
  categories: string[]
}
```

### 2. `get_balance`

Consulta saldo de una cuenta por nombre (fuzzy match).

**Input:** `{ accountName: string }`

**Output:** `{ account, balance, currency }`

### 3. `create_transaction`

Crea ingreso, gasto, transferencia o pago de tarjeta.

**Input:**
```typescript
{
  type: "income" | "expense" | "transfer",
  amount: number,
  description: string,
  accountName: string,
  category?: string,
  currency?: string,         // default: moneda de la cuenta
  date?: string,             // default: hoy (ISO)
  targetAccountName?: string, // solo para transfer
  targetCardName?: string,   // solo si es pago de tarjeta
}
```

**Output:** `{ id, type, amount, account, newBalance, success: true }`

**Comportamiento:**
- Fuzzy match de nombres (`.includes()` case-insensitive).
- Si falta info o la cuenta no existe → error descriptivo que Claude reporta al usuario.
- **Descripción del tool instruye a Claude a pedir confirmación explícita antes de invocarlo.**

### 4. `list_transactions`

Consulta las últimas transacciones.

**Input:** `{ limit?: number, accountName?: string, days?: number }`

**Output:** `Array<{ date, type, amount, description, category, account }>`

## Ambigüedad y confirmación

Las transacciones financieras afectan balances — el costo de una transacción incorrecta es alto comparado con el costo de una confirmación extra. Por eso:

**Todas las operaciones de escritura requieren confirmación explícita.**

La confirmación no se implementa en el MCP server — se delega a Claude vía la **descripción del tool**:

> "Before calling this tool, always summarize the transaction in natural language to the user (type, amount, currency, account, category, date) and wait for explicit confirmation (yes/no). Only call this tool after the user confirms."

**Flujo típico:**
1. Usuario: *"Agrega 500 a Popular por bono"*
2. Claude: *"Voy a crear: Ingreso de $500 DOP a Banco Popular Dominicano, categoría 'Ingresos varios', descripción 'Bono', hoy. ¿Confirmas?"*
3. Usuario: *"Sí"*
4. Claude invoca `create_transaction`

## Despliegue

### Railway — servicio MCP

**Variables de entorno:**
```
MCP_PUBLIC_KEY=<generated>
INTERNAL_API_KEY=<generated>
OWNER_USER_ID=<user id de la DB>
APP_URL=http://<servicio-nextjs>.railway.internal:3000
PORT=3333
```

**Variables adicionales en servicio Next.js:**
```
INTERNAL_API_KEY=<mismo valor>
OWNER_USER_ID=<tu user id>
```

**Dominio público:**
Railway → servicio MCP → Settings → Generate Domain → `finanzas-mcp.up.railway.app`

### Claude app — conexión

1. Settings → Connectors / MCP Servers → Add custom
2. URL: `https://finanzas-mcp.up.railway.app/mcp`
3. Authentication: Bearer Token → pegar `MCP_PUBLIC_KEY`

### Costo estimado

~$1-3/mes adicionales en Railway. MCP server es liviano, sin DB, sin estado.

### Rollback

Si algo falla, pausar el servicio MCP en Railway. La app Next.js sigue corriendo intacta.

## Testing

- **Unit tests del MCP server:** parseo de inputs, fuzzy match, construcción de requests.
- **Integration tests:** MCP Inspector (oficial de Anthropic) para invocar tools contra el MCP local conectado al Next.js local.
- **Manual smoke test post-deploy:** cURL al endpoint MCP con auth, luego conexión real desde Claude web, luego desde móvil.

## Plan de desarrollo (alto nivel)

El plan de implementación detallado vive en un documento separado.

**Fases:**
1. **Preparar app Next.js** (~45 min) — Helper de auth, modificar 5 endpoints, probar con cURL.
2. **MCP server local** (~2h) — Scaffolding, 4 tools, probar con MCP Inspector.
3. **Desplegar a Railway** (~30 min) — Dockerfile, segundo servicio, variables, dominio.
4. **Conectar Claude app** (~15 min) — Configurar connector, probar comandos.
5. **Iterar** — Ajustar descripciones de tools según UX real.

**Checkpoints:**
- ✅ Fase 1: App web sigue funcionando normal
- ✅ Fase 2: MCP Inspector puede invocar los 4 tools
- ✅ Fase 3: Endpoint MCP responde 401 sin auth y 200 con auth
- ✅ Fase 4: Crear transacción real por voz funciona

**Tiempo total estimado:** 3-4 horas.

## Decisiones de diseño y alternativas descartadas

| Decisión | Alternativas consideradas | Razón |
|----------|---------------------------|-------|
| Desplegar en Railway (mismo proyecto) | MCP local (stdio), Vercel/Cloudflare | Móvil requiere remoto; Railway ya pagado y simplifica gestión |
| MVP con 4 tools | Scope completo (12+ tools) | 80% del valor con 20% del esfuerzo; menos superficie de riesgo |
| API Key estática en env var | API keys en DB, JWT largo | Simplicidad; 1 usuario no justifica tabla ApiKey todavía |
| Confirmación vía prompt del tool | Tool `preview_` separado, ejecución directa | Delega complejidad a Claude; más seguro que ejecución directa |
| Fuzzy match con `.includes()` | Fuse.js, embeddings | Suficiente para pocos nombres de cuentas |

## Trabajos futuros (fuera de alcance)

- Migrar auth a tabla `ApiKey` en DB (cuando se necesite revocar sin reiniciar).
- Tools de consulta avanzada (gastos por categoría, reportes).
- Tools de escritura adicionales (recurrentes, pagos de préstamos, pagos de tarjeta).
- Webhooks para notificar al MCP cuando algo cambia (vs. polling).
- Rate limiting por API key.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| MCP_PUBLIC_KEY se filtra | Rotación inmediata en Railway env vars |
| Claude crea transacción incorrecta por mal prompt | Confirmación explícita obligatoria via tool description |
| MCP server cae | App Next.js sigue funcional; solo se pierde control por voz |
| Cambios en API rompen el MCP | Tests de integración en CI para MCP server |
