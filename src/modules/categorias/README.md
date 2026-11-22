# Categorías

Responsable: Román Strizzi. Base: `/api/v1/categorias`.

Contrato del DER: `id`, `nombre`, `descripcion`.
Los IDs se alinean con las referencias del mock de Suscripciones:

| ID  | Nombre         |
| --- | -------------- |
| 1   | Video          |
| 2   | Música         |
| 3   | Juegos         |
| 4   | Almacenamiento |
| 5   | Educación      |
| 6   | Productividad  |

La asignación 5–6 debe confirmarse con Nicolás al integrar los contratos.

| Método | Ruta relativa | Resultado              |
| ------ | ------------- | ---------------------- |
| GET    | `/`           | Listado paginado       |
| GET    | `/:id`        | Detalle                |
| POST   | `/`           | Alta, 201              |
| PUT    | `/:id`        | Actualización completa |
| PATCH  | `/:id`        | Actualización parcial  |
| DELETE | `/:id`        | Baja en memoria, 200   |

Listado: `page=1&limit=10&sortBy=id&order=desc&q=texto`.
Búsqueda en nombre y descripción; límite máximo 100.

POST y PUT exigen:

```json
{
  "nombre": "Noticias",
  "descripcion": "Diarios y revistas digitales"
}
```

PATCH acepta uno o ambos campos. La descripción puede ser texto vacío, pero
no `null`. No se aceptan campos fuera del contrato.
Se detectan nombres duplicados ignorando mayúsculas, espacios exteriores y
tildes. Errores: 400 para datos inválidos, 404 para ID inexistente y 409 para
nombre duplicado.

DELETE elimina el registro del array. El GET posterior devuelve 404, el ID
no se reutiliza y el siguiente reinicio restaura los mocks. Las cascadas o
restricciones sobre suscripciones se acordarán al integrar la base real.

Servicios públicos: `list`, `getById`, `create`, `update`, `remove`.
`update(id, dto)` es parcial; `update(id, dto, false)` exige el cuerpo completo.
Las respuestas son copias para evitar modificaciones externas del estado.

Pendiente de Nazareno: login para lectura y rol admin para escritura.

```bash
node --import tsx --test src/modules/categorias/categorias.test.ts
```
