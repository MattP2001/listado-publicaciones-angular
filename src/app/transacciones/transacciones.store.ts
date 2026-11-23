import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { TransaccionesApi } from './transacciones.api';
import { EstadoTransaccion, Filtros, Transaccion } from './transaccion.model';
import { EstadoLote } from './lote.model';

export type EstadoItem = 'OK' | 'PENDIENTE' | 'FALLIDO';

/** Máximo de transacciones en memoria (laptops de 4 GB, jornadas de horas). */
export const MAX_EN_MEMORIA = 10_000;

/**
 * Store de la pantalla con signals.
 *
 * - Los filtros se resuelven en el backend: al cambiarlos se descarta lo cargado y se
 *   vuelve a pedir desde el primer cursor. El navegador nunca filtra miles de filas.
 * - Lo cargado se acota a MAX_EN_MEMORIA: si se supera, se descartan las más viejas.
 * - Toda suscripción se corta al destruir la pantalla o al cambiar los filtros,
 *   para que no se acumulen en una jornada larga.
 * - `pendientes` y `fallidos` hacen que la vista no mienta: una fila sólo muestra el
 *   estado nuevo cuando el backend lo confirmó.
 */
@Injectable()
export class TransaccionesStore {
  private readonly api = inject(TransaccionesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly filtrosCambiaron = new Subject<void>();

  readonly transacciones = signal<Transaccion[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly hayMas = signal(true);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly filtros = signal<Filtros>({ estados: [], tipos: [] });
  readonly seleccion = signal<ReadonlySet<string>>(new Set());
  readonly pendientes = signal<ReadonlySet<string>>(new Set());
  readonly fallidos = signal<ReadonlyMap<string, string>>(new Map());
  readonly ultimoLote = signal<EstadoLote | null>(null);

  readonly visibles = this.transacciones.asReadonly();
  readonly cantidadSeleccionada = computed(() => this.seleccion().size);

  cargarSiguiente(): void {
    if (this.cargando() || !this.hayMas()) return;
    this.cargando.set(true);
    this.api
      .pagina(this.filtros(), this.cursor())
      .pipe(takeUntil(this.filtrosCambiaron), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.transacciones.update((t) => [...t, ...p.items].slice(-MAX_EN_MEMORIA));
          this.cursor.set(p.nextCursor);
          this.hayMas.set(p.nextCursor !== null);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las transacciones. Reintentá.');
          this.cargando.set(false);
        },
      });
  }

  aplicarFiltros(f: Filtros): void {
    this.filtrosCambiaron.next(); // corta la carga en curso
    this.filtros.set(f);
    this.transacciones.set([]);
    this.cursor.set(null);
    this.hayMas.set(true);
    this.cargando.set(false);
    this.seleccion.set(new Set());
    this.cargarSiguiente();
  }

  alternarSeleccion(id: string): void {
    this.seleccion.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < 500) n.add(id);
      return n;
    });
  }

  cambiarEstadoEnLote(nuevoEstado: EstadoTransaccion): void {
    const ids = [...this.seleccion()];
    if (!ids.length) return;
    this.pendientes.update((p) => new Set([...p, ...ids]));
    this.seleccion.set(new Set());

    this.api
      .iniciarLote({ ids, nuevoEstado })
      .pipe(
        switchMap(({ taskId }) => this.api.seguirLote(taskId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (estado) => {
          this.ultimoLote.set(estado);
          if (estado.estado !== 'EN_PROCESO') this.reconciliar(estado, nuevoEstado, ids);
        },
        error: () => this.marcarFallidos(ids, 'No se pudo confirmar el resultado del lote'),
      });
  }

  /** Aplica sólo lo que el backend confirmó; lo que falló queda visible con su motivo. */
  private reconciliar(estado: EstadoLote, nuevoEstado: EstadoTransaccion, ids: string[]): void {
    const exitosos = new Set(estado.exitosos);
    this.transacciones.update((t) =>
      t.map((tx) => (exitosos.has(tx.id) ? { ...tx, estado: nuevoEstado, version: tx.version + 1 } : tx)),
    );
    const sinRespuesta = ids.filter(
      (id) => !exitosos.has(id) && !estado.fallidos.some((f) => f.id === id),
    );
    this.fallidos.update((f) => {
      const n = new Map(f);
      estado.fallidos.forEach((x) => n.set(x.id, x.motivo));
      sinRespuesta.forEach((id) => n.set(id, 'El backend no informó el resultado'));
      exitosos.forEach((id) => n.delete(id));
      return n;
    });
    this.quitarPendientes(ids);
  }

  private marcarFallidos(ids: string[], motivo: string): void {
    this.fallidos.update((f) => {
      const n = new Map(f);
      ids.forEach((id) => n.set(id, motivo));
      return n;
    });
    this.quitarPendientes(ids);
  }

  private quitarPendientes(ids: string[]): void {
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
