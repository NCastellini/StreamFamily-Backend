# Acceso a suscripciones

Las rutas de `/api/v1/suscripciones` requieren un token. El administrador del sistema ve y modifica todas las suscripciones. Un cliente ve las suyas y las de los grupos familiares de los que es miembro, pero solo modifica las suyas. En el listado de un cliente se ignora `usuarioId` en la consulta: siempre se filtra por el usuario del token, antes de paginar.

| Situación                                                                                  | Respuesta                                                       |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Un cliente consulta, modifica, cambia el estado o elimina una suscripción que no puede ver | 404, igual que para una suscripción inexistente (mismo mensaje) |
| Un cliente modifica, cambia el estado o elimina una suscripción de su grupo que no es suya | 403                                                             |
| Un cliente crea una suscripción a nombre de otro usuario, o la mueve a otro usuario        | 403                                                             |
| Un cliente crea una suscripción en un grupo del que no es miembro, o la mueve a ese grupo  | 403                                                             |
| Se asigna la suscripción a un usuario bloqueado o dado de baja                             | 400                                                             |
| Se elimina una suscripción que tiene pagos o alertas                                       | 409; primero hay que cancelarla con `PATCH /:id/estado`         |

`GET /api/v1/medios-pago/:id/suscripciones` aplica las mismas reglas de visibilidad.

## Funciones para otros módulos

`suscripciones.service.ts` exporta dos funciones de visibilidad para Pagos, Alertas y Dashboard:

| Función                        | Devuelve `true` si                                                      |
| ------------------------------ | ----------------------------------------------------------------------- |
| `puedeVer(actor, suscripcion)` | El actor es admin, es el dueño o es miembro del grupo de la suscripción |
| `esDueno(actor, suscripcion)`  | El actor es admin o es el dueño                                         |

Las funciones de sistema (`list`, `getAll`, `getById`, `create`, `update`, `changeEstado` y `remove`) no filtran por usuario. Las rutas usan las versiones `...For`, que reciben el usuario del token.
