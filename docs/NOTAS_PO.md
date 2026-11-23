# Notas de la reunión con el PO (Gonzalo)

## Volumen y paginación

- La API devuelve lotes de hasta 2.000 registros por página.
- El frontend hoy no tiene paginación ni scroll virtual.
- El backend **no soporta paginación por offset**: sólo cursor-based streaming.

## Filtros

- Los operadores combinan: fecha, estado, tipo de operación y monto.
- Al combinarlos la pantalla se congela.
- El PO no sabe si hoy se filtra en el navegador o en el backend.
