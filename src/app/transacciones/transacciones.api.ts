import { Injectable } from '@angular/core';
import { Observable, of, delay, timer, map, takeWhile } from 'rxjs';
import { Filtros, PaginaTransacciones } from './transaccion.model';
import { EstadoLote, SolicitudLote } from './lote.model';
import { generarTransacciones } from './datos-falsos';
import { filtrar } from './filtrar';

/**
 * Cliente del backend. En el prototipo está simulado en memoria con el contrato que
 * describió el PO: páginas de hasta 2.000 por cursor (sin offset), filtros resueltos
 * del lado del servidor y lotes asíncronos con task_id.
 *
 * En producción: GET /transacciones?cursor=…&estado=…&tipo=…&desde=…&hasta=…&montoMin=…
 *                POST /transacciones/lotes → { task_id }
 *                GET  /transacciones/lotes/{task_id}
 */
@Injectable({ providedIn: 'root' })
export class TransaccionesApi {
  private readonly todas = generarTransacciones(50_000);
  private readonly tamPagina = 2_000;
  private readonly tareas = new Map<string, SolicitudLote>();

  pagina(filtros: Filtros, cursor: string | null): Observable<PaginaTransacciones> {
    // Simula el filtrado del backend: el navegador sólo recibe lo que ya coincide.
    const coincidentes = filtrar(this.todas, filtros);
    const desde = cursor ? Number(cursor) : 0;
    const siguiente = desde + this.tamPagina;
    return of({
      items: coincidentes.slice(desde, siguiente),
      nextCursor: siguiente < coincidentes.length ? String(siguiente) : null,
    }).pipe(delay(150));
  }

  iniciarLote(solicitud: SolicitudLote): Observable<{ taskId: string }> {
    const taskId = crypto.randomUUID();
    this.tareas.set(taskId, solicitud);
    return of({ taskId }).pipe(delay(100));
  }

  /** Consulta el estado de la tarea cada 1 s; completa sola cuando termina. */
  seguirLote(taskId: string): Observable<EstadoLote> {
    return timer(0, 1000).pipe(
      map((n) => this.estadoSimulado(taskId, n)),
      takeWhile((e) => e.estado === 'EN_PROCESO', true),
    );
  }

  private estadoSimulado(taskId: string, intento: number): EstadoLote {
    const solicitud = this.tareas.get(taskId)!;
    if (intento < 2) {
      return { taskId, estado: 'EN_PROCESO', exitosos: [], fallidos: [] };
    }
    this.tareas.delete(taskId);
    // Simula fallos parciales: ~5 % de los ítems rechazados por conflicto.
    const fallidos = solicitud.ids
      .filter((_, i) => i % 20 === 7)
      .map((id) => ({ id, motivo: 'Otro operador la modificó antes' }));
    const idsFallidos = new Set(fallidos.map((f) => f.id));
    return {
      taskId,
      estado: 'COMPLETADA',
      exitosos: solicitud.ids.filter((id) => !idsFallidos.has(id)),
      fallidos,
    };
  }
}
