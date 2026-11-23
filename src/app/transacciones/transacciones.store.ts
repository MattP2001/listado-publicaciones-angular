import { Injectable, computed, inject, signal } from '@angular/core';
import { TransaccionesApi } from './transacciones.api';
import { EstadoTransaccion, Filtros, Transaccion } from './transaccion.model';
import { EstadoLote } from './lote.model';
import { filtrar } from './filtrar';

export type EstadoItem = 'OK' | 'PENDIENTE' | 'FALLIDO';

/**
 * Store de la pantalla con signals.
 *
 * - `transacciones` es la única fuente de verdad (lo último confirmado por el backend).
 * - `pendientes` marca las filas con una mutación en curso: se muestran como
 *   "procesando", nunca con el estado nuevo hasta que el backend lo confirma.
 * - `fallidos` guarda el motivo por fila, para que el operador lo vea.
 */
@Injectable({ providedIn: 'root' })
export class TransaccionesStore {
  private readonly api = inject(TransaccionesApi);

  readonly transacciones = signal<Transaccion[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly hayMas = signal(true);
  readonly cargando = signal(false);
  readonly filtros = signal<Filtros>({ estados: [], tipos: [] });
  readonly seleccion = signal<ReadonlySet<string>>(new Set());
  readonly pendientes = signal<ReadonlySet<string>>(new Set());
  readonly fallidos = signal<ReadonlyMap<string, string>>(new Map());
  readonly ultimoLote = signal<EstadoLote | null>(null);

  /** Derivado y memoizado: sólo se recalcula si cambian los datos o los filtros. */
  readonly visibles = computed(() => filtrar(this.transacciones(), this.filtros()));

  readonly cantidadSeleccionada = computed(() => this.seleccion().size);

  cargarSiguiente(): void {
    if (this.cargando() || !this.hayMas()) return;
    this.cargando.set(true);
    this.api.pagina(this.filtros(), this.cursor()).subscribe({
      next: (p) => {
        this.transacciones.update((t) => [...t, ...p.items]);
        this.cursor.set(p.nextCursor);
        this.hayMas.set(p.nextCursor !== null);
      },
      complete: () => this.cargando.set(false),
      error: () => this.cargando.set(false),
    });
  }

  aplicarFiltros(f: Filtros): void {
    this.filtros.set(f);
    this.seleccion.set(new Set());
  }

  alternarSeleccion(id: string): void {
    this.seleccion.update((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  cambiarEstadoEnLote(nuevoEstado: EstadoTransaccion): void {
    const ids = [...this.seleccion()].slice(0, 500);
    if (!ids.length) return;
    this.pendientes.update((p) => new Set([...p, ...ids]));
    this.seleccion.set(new Set());

    this.api.iniciarLote({ ids, nuevoEstado }).subscribe(({ taskId }) => {
      this.api.seguirLote(taskId).subscribe((estado) => {
        this.ultimoLote.set(estado);
        if (estado.estado === 'EN_PROCESO') return;
        this.reconciliar(estado, nuevoEstado, ids);
      });
    });
  }

  /** Aplica sólo lo que el backend confirmó; lo que falló queda visible con su motivo. */
  private reconciliar(estado: EstadoLote, nuevoEstado: EstadoTransaccion, ids: string[]): void {
    const exitosos = new Set(estado.exitosos);
    this.transacciones.update((t) =>
      t.map((tx) => (exitosos.has(tx.id) ? { ...tx, estado: nuevoEstado, version: tx.version + 1 } : tx)),
    );
    this.fallidos.update((f) => {
      const n = new Map(f);
      estado.fallidos.forEach((x) => n.set(x.id, x.motivo));
      return n;
    });
    this.pendientes.update((p) => {
      const n = new Set(p);
      ids.forEach((id) => n.delete(id));
      return n;
    });
  }

  estadoDeFila(id: string): EstadoItem {
    if (this.pendientes().has(id)) return 'PENDIENTE';
    if (this.fallidos().has(id)) return 'FALLIDO';
    return 'OK';
  }
}
