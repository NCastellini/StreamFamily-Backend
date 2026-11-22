# Métricas de administración

Responsable: Román Strizzi. Endpoint: `GET /api/v1/admin/metricas`.

## Estado de integración

El router, el controlador, la lectura paginada y los cálculos están implementados.
Los proveedores de Grupos y Suscripciones aún no están conectados en esta rama.
Grupos ya tiene service en el remoto revisado; Suscripciones todavía no.
Hasta conectar ambos, el endpoint responde **503** con un mensaje explícito.
No devuelve cifras ficticias ni interpreta dependencias faltantes como cero.

Cuando ambos services estén disponibles, configurar una vez durante el inicio:

```ts
import * as gruposService from '../grupos/grupos.service';
import * as suscripcionesService from '../suscripciones/suscripciones.service';
import { configureMetricasSources } from './metricas.service';

configureMetricasSources({
  listGrupos: (query) => gruposService.list(query),
  listSuscripciones: (query) => suscripcionesService.list(query),
});
```

Este ejemplo debe incorporarse al código de integración cuando existan los
imports. Los services deben cumplir `ListResult<T>` y aceptar las consultas
comunes. Se leen todas las páginas, no solo los primeros 10 o 100 registros.
Usuarios se consulta mediante su service. No se importan mocks externos.

## Definición acordada de los cálculos

- `totalUsuarios`: cuentas activas y bloqueadas, incluido admin; excluye inactivos.
- `totalGrupos`: todos los grupos actuales.
- `suscripcionesActivas`: solo estado `activa`.
- `plataformasMasContratadas`: ranking de suscripciones activas por plataforma,
  ignorando mayúsculas y espacios exteriores, con desempate alfabético.
- `gastoPromedioPorUsuario`: gasto mensual equivalente de suscripciones activas
  cuyos titulares son clientes activos o bloqueados, dividido por la cantidad
  de esos clientes. Incluye clientes sin suscripciones en el denominador;
  excluye administradores e inactivos del gasto y del denominador.
  Sin clientes computables devuelve 0. Cada suscripción compartida se cuenta
  una sola vez, sin multiplicar por los miembros del grupo.
- El conteo de suscripciones activas y el ranking son globales: no se filtran
  por rol o estado del titular. Ese filtro se aplica únicamente al gasto promedio.
- Normalización: costo mensual / 1, trimestral / 3 y anual / 12.
- Moneda de referencia ARS, cotización provisional de demostración **1 USD = 1200 ARS**.
  El resultado se redondea a dos decimales al final.

Se incluyen `monedaReferencia`, `periodo` y `cotizacionUsdArs` para que el
frontend pueda interpretar el importe. No se incluyen datos de clientes.
La cotización debe acordarse con Julián y compartirse con Dashboard;
el valor provisional no representa una cotización real. Se calcula gasto contratado, no pagos efectivamente
realizados; por eso no se consulta Pagos para este indicador.

Pendiente de Nazareno: protección con JWT y rol admin.

```bash
node --import tsx --test src/modules/metricas/metricas.test.ts
```
