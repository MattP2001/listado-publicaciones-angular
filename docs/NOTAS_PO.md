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

## Concurrencia

- Más de 1.500 operadores usan la herramienta al mismo tiempo: dos pueden tocar lo mismo.
- El PO no sabe qué responde hoy el sistema ante ese conflicto.
- Requisito de negocio: **la vista no puede mentir**. Si una transacción ya no está en el estado
  que el operador cree, o la acción falló, tiene que enterarse claramente.

## Performance y equipos

- No hay una métrica fija; las quejas: se congela al filtrar y **se vuelve lenta tras horas de uso**
  (síntoma de fuga de memoria o de datos que se acumulan).
- Laptops corporativas con **4 GB de RAM**.
- Chromium de versión fija, cerrado por política: no se puede pedir otro navegador.
