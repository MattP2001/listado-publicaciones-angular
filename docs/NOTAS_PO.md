# Notas de la reunión con el PO (Gonzalo)

## Volumen y paginación

- La API devuelve lotes de hasta 2.000 registros por página.
- El frontend hoy no tiene paginación ni scroll virtual.
- El backend **no soporta paginación por offset**: sólo cursor-based streaming.

## Filtros

- Los operadores combinan: fecha, estado, tipo de operación y monto.
- Al combinarlos la pantalla se congela.
- El PO no sabe si hoy se filtra en el navegador o en el backend.

## Edición en lote

- Acciones más comunes: cambios de estado (aprobar, cancelar) y reasignaciones masivas.
- Hasta **500 registros** en una sola tanda.
- El endpoint es **asíncrono**: devuelve un `task_id` y el estado se consulta aparte.
- El PO no sabe si el backend informa qué ítems fallaron o si hace rollback total: **duda abierta**.
- Hoy los fallos son silenciosos y la vista queda desincronizada: el operador no sabe si terminó.
