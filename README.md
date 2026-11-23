# Consola de transacciones — propuesta y prototipo (Angular)

Propuesta para la consola de gestión de transacciones de Operaciones, que hoy se congela al
filtrar, se vuelve lenta tras horas de uso y deja la vista desincronizada cuando falla una
edición en lote.

Lo que relevé con el PO está en [`docs/NOTAS_PO.md`](docs/NOTAS_PO.md). Lo que condiciona el
diseño:

| Restricción | De dónde sale |
|---|---|
| Páginas de hasta 2.000 registros, **sólo por cursor** (sin offset) | Limitación de la base distribuida del backend |
| Filtros combinables: fecha, estado, tipo de operación y monto | Uso real de los operadores |
| Lotes de hasta **500** registros, **asíncronos con `task_id`** | Endpoint de acciones en lote |
| Más de 1.500 operadores en simultáneo: puede haber conflictos | Operación |
| Laptops de **4 GB de RAM**, Chromium fijo, jornadas de horas | Equipos corporativos |
| "La vista no puede mentir" | Requisito del PO |

---

## 1. Arquitectura y manejo de estado

**Causas probables de los síntomas**

- *Se congela al filtrar:* se filtran y renderizan miles de filas en el navegador, con el DOM
  completo de cada una.
- *Se vuelve lenta tras horas:* se acumulan páginas en memoria y suscripciones (polling,
  listeners) que nunca se cortan. Con 4 GB, eso termina en GC constante.
- *Lotes silenciosos o desincronizados:* la UI asume éxito (o espera una respuesta síncrona) en
  un endpoint que es asíncrono y puede fallar parcialmente.

**Propuesta**

- **Filtros en el backend.** Cada cambio de filtros (con debounce de 400 ms) descarta lo cargado
  y pide desde el primer cursor con los filtros como parámetros. El navegador nunca filtra
  miles de filas.
- **Scroll virtual** (`@angular/cdk/scrolling`): sólo existen en el DOM las filas visibles. La
  página siguiente se pide por cursor al acercarse al final.
- **Memoria acotada:** como máximo `MAX_EN_MEMORIA` (10.000) transacciones; si se supera se
  descartan las más viejas.
- **Store por pantalla con signals** (`TransaccionesStore`): provisto en el componente
  contenedor, así al salir de la consola se destruye con sus datos. `computed` para derivados,
  `OnPush` en todos los componentes y zoneless.
- **Sin suscripciones colgadas:** toda suscripción usa `takeUntilDestroyed`, y la carga en curso
  se corta al cambiar los filtros. El polling del lote completa solo al terminar la tarea.
- **Lotes que no mienten:** la fila seleccionada pasa a *Procesando* y **no muestra el estado
  nuevo** hasta que el backend lo confirma. Al terminar el `task_id`:
  - lo confirmado se aplica;
  - lo rechazado queda marcado con su motivo;
  - lo que el backend no informó también se marca con error (nunca se asume éxito).
- **Concurrencia:** cada transacción lleva `version`. La propuesta es que el backend la use
  para control optimista y la devuelva como fallo por ítem ("otro operador la modificó").

```
PantallaTransacciones (provee TransaccionesStore)
├── BarraFiltros ── aplicarFiltros() ──┐
└── TablaTransacciones (scroll virtual)│
                                        ▼
                              TransaccionesStore (signals)
                                        │
                              TransaccionesApi
                     GET /transacciones?cursor&filtros
                     POST /transacciones/lotes → task_id
                     GET /transacciones/lotes/{task_id}
```

## 2. Prototipo del filtrado y la edición en lote

En `src/app/transacciones/`. El backend está simulado en `TransaccionesApi` con el mismo
contrato (cursor, filtros en el servidor, lotes con `task_id` y ~5 % de fallos parciales), sobre
50.000 transacciones generadas.

```bash
npm install
npm start          # http://localhost:4200
```

Flujo: filtrar → seleccionar hasta 500 filas → Aprobar/Rechazar → ver *Procesando…* → ver el
resultado por fila y el resumen del lote.

## 3. Estrategia de testing

| Nivel | Qué cubre | Dónde |
|---|---|---|
| Unitario puro | `filtrar`: combinación de filtros y rangos | `filtrar.spec.ts` |
| Unitario del store (API falsa) | cursor, tope de memoria, reinicio al cambiar filtros, tope de 500, lote parcial, lote en proceso, error al consultar el lote | `transacciones.store.spec.ts` |
| Componentes | la fila pendiente no se puede volver a seleccionar; la fila fallida muestra el motivo | `tabla-transacciones.component.spec.ts` |
| Contrato | respuestas reales del endpoint de lotes (éxito, parcial, rollback total) contra el modelo `EstadoLote` | propuesto, cuando backend confirme el formato |
| E2E (Playwright en el Chromium corporativo) | filtrar y editar 500 filas sin congelar la UI | propuesto |
| Performance / memoria | sesión simulada de varias horas: heap estable (Chrome DevTools / `performance.memory`) y tiempo de respuesta del filtro | propuesto |

```bash
npm test
```

## Dudas abiertas (para backend)

- ¿El resultado del lote informa éxito/fallo por ítem, o es todo o nada? El prototipo soporta
  ambos casos: si es todo o nada, llegan todos como fallidos o todos como exitosos.
- ¿Qué responde el backend ante un conflicto entre operadores? Se propone control optimista por
  `version`.
- ¿Los filtros ya se pueden mandar como parámetros del endpoint por cursor? Es la pieza clave
  para que el navegador no filtre.
