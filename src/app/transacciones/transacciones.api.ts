import { Injectable } from '@angular/core';
import { Observable, of, delay, timer, map, takeWhile, switchMap } from 'rxjs';
import { Filtros, PaginaTransacciones } from './transaccion.model';
import { EstadoLote, SolicitudLote } from './lote.model';
import { generarTransacciones } from './datos-falsos';

/**
 * Cliente del backend. En el prototipo está simulado en memoria con el mismo
 * contrato que describió el PO: páginas de hasta 2.000 por cursor y lotes
 * asíncronos con task_id.
 */
@Injectable({ providedIn: 'root' })
export class TransaccionesApi {
  private readonly todas = generarTransacciones(10_000);
  private readonly tamPagina = 2_000;

  pagina(_filtros: Filtros, cursor: string | null): Observable<PaginaTransacciones> {
    const desde = cursor ? Number(cursor) : 0;
    const items = this.todas.slice(desde, desde + this.tamPagina);
    const siguiente = desde + this.tamPagina;
    return of({
      items,
      nextCursor: siguiente < this.todas.length ? String(siguiente) : null,
    }).pipe(delay(150));
  }

  iniciarLote(solicitud: SolicitudLote): Observable<{ taskId: string }> {
    const taskId = crypto.randomUUID();
    this.tareas.set(taskId, solicitud);
    return of({ taskId }).pipe(delay(100));
  }

  /** Consulta el estado de la tarea cada 1 s hasta que termina. */
  seguirLote(taskId: string): Observable<EstadoLote> {
    return timer(0, 1000).pipe(
      switchMap((n) => of(this.estadoSimulado(taskId, n))),
      takeWhile((e) => e.estado === 'EN_PROCESO', true),
      map((e) => e),
    );
  }

  private readonly tareas = new Map<string, SolicitudLote>();

  private estadoSimulado(taskId: string, intento: number): EstadoLote {
    const solicitud = this.tareas.get(taskId)!;
    if (intento < 2) {
      return { taskId, estado: 'EN_PROCESO', exitosos: [], fallidos: [] };
    }
    // Simula fallos parciales: ~5 % de los ítems rechazados.
    const fallidos = solicitud.ids
      .filter((_, i) => i % 20 === 7)
      .map((id) => ({ id, motivo: 'La transacción cambió de estado en otro proceso' }));
    const idsFallidos = new Set(fallidos.map((f) => f.id));
    return {
      taskId,
      estado: 'COMPLETADA',
      exitosos: solicitud.ids.filter((id) => !idsFallidos.has(id)),
      fallidos,
    };
  }
}
