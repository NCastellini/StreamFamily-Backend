# Métricas de administración

Responsable: Román Strizzi. Endpoint: `GET /api/v1/admin/metricas`.

## Estado de integración

El router, el controlador, la lectura paginada y los cálculos están implementados.
Los proveedores de Grupos y Suscripciones están conectados por defecto con
sus services. El endpoint devuelve **200** con los datos agregados actuales
para un administrador autenticado. No importa mocks externos.

Para sustituir los proveedores (por ejemplo, en pruebas) se puede utilizar:

```ts
import * as gruposService from '../grupos/grupos.service';
import * as suscripcionesService from '../suscripciones/suscripciones.service';
import { configureMetricasSources } from './metricas.service';

configureMetricasSources({
  listGrupos: (query) => gruposService.list(query),
  listSuscripciones: (query) => suscripcionesService.list(query),
});
```

No es necesario configurar los proveedores durante el inicio: ya están
inicializados en el service de Métricas. Deben cumplir `ListResult<T>` y
aceptar las consultas comunes. Se leen todas las páginas de Usuarios,
Grupos y Suscripciones, no solo los primeros 10 o 100 registros.
Si las fuentes se desconfiguran o devuelven paginación inconsistente,
responde **503** en lugar de publicar totales parciales.

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
- Moneda de presentación acordada para el prototipo: **ARS**.
  Los costos en ARS no se convierten; los costos en USD se convierten con
  la cotización mock fija **1 USD = 1200 ARS**, utilizada también por Dashboard.
  El resultado se redondea a dos decimales al final.

Se incluyen `monedaReferencia`, `periodo` y `cotizacionUsdArs` para que el
frontend pueda interpretar el importe. No se incluyen datos de clientes.
La cotización mock se conserva para el prototipo: no representa una cotización
real ni se actualiza automáticamente. Actualmente está definida en cada módulo;
si se modifica, debe mantenerse el mismo valor en Métricas y Dashboard.
Se calcula gasto contratado, no pagos efectivamente realizados; por eso no se
consulta Pagos para este indicador.

Protección integrada con `verifyToken` y `requireRole('admin')` del middleware
compartido: sin JWT válido devuelve 401 y con rol cliente devuelve 403.
Las pruebas incluyen login real, el endpoint conectado por defecto,
cambios en los services y respuestas sin detalles individuales.

```bash
node --import tsx --test src/modules/metricas/metricas.test.ts
```
