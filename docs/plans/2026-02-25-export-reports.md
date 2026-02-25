# Exportar Reportes en PDF y Excel

**Fecha:** 2026-02-25
**Estado:** Aprobado

## Objetivo

Permitir al usuario descargar reportes de sus transacciones en formato PDF y Excel desde la página de reportes. Los reportes incluyen un resumen (ingresos, gastos, balance, cantidad de transacciones) seguido de una tabla detallada de todas las transacciones del período seleccionado.

## Decisiones de diseño

- **Generación en cliente (browser):** No se consume Railway. Las librerías generan el archivo localmente y disparan la descarga.
- **Librerías:** `jspdf` + `jspdf-autotable` para PDF, `xlsx` (SheetJS) para Excel.
- **Datos:** Se reutiliza el endpoint `/api/transactions` existente con un nuevo parámetro `limit=all` para traer todas las transacciones sin paginación.
- **Resumen:** Se calcula en el cliente a partir de las transacciones descargadas (no depende de `/api/reports`).
- **Transferencias:** Excluidas de totales de ingresos/gastos, pero incluidas en la tabla de detalle.

## Estructura del documento exportado

### Encabezado
- Título: "Reporte de Finanzas Personales"
- Período: "Febrero 2026" / "Q1 2026 (Enero - Marzo)" / "Todo el historial"
- Fecha de generación: "Generado el 25 de febrero de 2026"

### Resumen (4 métricas)
- Total de ingresos
- Total de gastos
- Balance neto
- Número de transacciones

### Tabla de transacciones

| Columna     | Formato                              |
|-------------|--------------------------------------|
| Fecha       | dd/MM/yyyy                           |
| Tipo        | Ingreso / Gasto / Transferencia      |
| Categoría   | Nombre de la categoría               |
| Descripción | Texto libre (puede estar vacío)      |
| Cuenta      | Nombre de cuenta bancaria o tarjeta  |
| Moneda      | Código (MXN, USD, etc.)             |
| Monto       | 2 decimales                          |

Orden: fecha descendente (más reciente primero).

En Excel se agrega fila final con fórmulas `SUM` nativas para ingresos y gastos.

## UI: Diálogo de exportación

Botón "Exportar" en el header de reportes (al lado del selector de período).

Al hacer clic se abre un `Dialog` con:
- **Tipo de período:** Radio group — Mes / Trimestre / Todo
- **Selector de período:** Mes+año o Trimestre+año (oculto si "Todo")
- **Formato:** Radio group — PDF / Excel
- **Acciones:** Cancelar / Descargar reporte (con spinner)

Pre-selección inteligente: mapea el filtro activo de reportes al tipo de período más cercano.

## Nombres de archivo

- `reporte-mensual-febrero-2026.pdf`
- `reporte-trimestral-Q1-2026.xlsx`
- `reporte-completo.pdf`

## Archivos a crear

| Archivo                                  | Propósito                                    |
|------------------------------------------|----------------------------------------------|
| `src/lib/export-pdf.ts`                  | Genera PDF con jspdf + autotable             |
| `src/lib/export-excel.ts`               | Genera Excel con xlsx                        |
| `src/components/export-report-dialog.tsx`| Diálogo de exportación con selección de período y formato |

## Archivos a modificar

| Archivo                                        | Cambio                                              |
|------------------------------------------------|-----------------------------------------------------|
| `src/app/(dashboard)/reports/page.tsx`         | Agregar botón "Exportar" e importar diálogo         |
| `src/app/api/transactions/route.ts`            | Soportar `limit=all` para exportación               |

## Lo que NO se toca

- API de reportes (`/api/reports`)
- Gráficas existentes
- Schema de Prisma
- Ningún otro endpoint o página
