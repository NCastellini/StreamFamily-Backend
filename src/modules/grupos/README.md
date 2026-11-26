# Acceso a grupos

Las rutas de `/api/v1/grupos` requieren un token. Un cliente solo puede listar sus grupos y consultar su detalle y resumen. El listado usa el ID del token aunque la consulta incluya `usuarioId`. El administrador del sistema puede consultar y gestionar todos los grupos y filtrar el listado por usuario.

| Situación | Respuesta |
| --- | --- |
| Un cliente consulta o intenta modificar un grupo ajeno, incluso para agregarse como miembro | 404, igual que para un grupo inexistente |
| Un cliente crea un grupo a nombre de otro administrador | 403 |
| Un miembro que no administra el grupo intenta editarlo, eliminarlo, agregar miembros o quitar a otro | 403 |
| Un miembro que no administra el grupo se quita a sí mismo | 200; pierde el acceso al grupo |

El administrador del grupo puede editarlo, eliminarlo y gestionar sus miembros. Para quitar al administrador actual, primero hay que transferir la administración a otro miembro. De lo contrario se devuelve 409, incluso con rol de administrador del sistema.
