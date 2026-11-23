import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TransaccionesStore } from './transacciones.store';
import { EstadoTransaccion } from './transaccion.model';

/**
 * Tabla con scroll virtual (CDK): sólo se renderizan las filas visibles,
 * así 10.000 transacciones no congelan el DOM.
 */
@Component({
  selector: 'app-tabla-transacciones',
  standalone: true,
  imports: [ScrollingModule, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="acciones">
      <span>{{ store.cantidadSeleccionada() }} seleccionadas (máx. 500)</span>
      <button (click)="cambiar('APROBADA')" [disabled]="!store.cantidadSeleccionada()">Aprobar</button>
      <button (click)="cambiar('RECHAZADA')" [disabled]="!store.cantidadSeleccionada()">Rechazar</button>
      @if (store.ultimoLote(); as lote) {
        <span class="lote" role="status">
          @if (lote.estado === 'EN_PROCESO') { Procesando lote… }
          @else { Lote terminado: {{ lote.exitosos.length }} ok, {{ lote.fallidos.length }} con error }
        </span>
      }
    </div>

    <cdk-virtual-scroll-viewport itemSize="36" class="viewport" (scrolledIndexChange)="alScrollear($event)">
      <div *cdkVirtualFor="let tx of store.visibles(); trackBy: porId"
           class="fila" [class.pendiente]="store.estadoDeFila(tx.id) === 'PENDIENTE'"
           [class.fallido]="store.estadoDeFila(tx.id) === 'FALLIDO'">
        <input type="checkbox" [checked]="store.seleccion().has(tx.id)"
               [disabled]="store.estadoDeFila(tx.id) === 'PENDIENTE'"
               (change)="store.alternarSeleccion(tx.id)" [attr.aria-label]="'Seleccionar ' + tx.id" />
        <span>{{ tx.id }}</span>
        <span>{{ tx.fecha | date: 'short' }}</span>
        <span>{{ tx.tipo }}</span>
        <span>{{ tx.monto | currency: 'ARS' }}</span>
        <span>
          @switch (store.estadoDeFila(tx.id)) {
            @case ('PENDIENTE') { Procesando… }
            @case ('FALLIDO') { {{ tx.estado }} · Error: {{ store.fallidos().get(tx.id) }} }
            @default { {{ tx.estado }} }
          }
        </span>
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  styles: [`
    .viewport { height: 70vh; }
    .fila { display: grid; grid-template-columns: 32px 120px 160px 140px 140px 1fr; height: 36px; align-items: center; }
    .pendiente { opacity: .6; }
    .fallido { background: #fdecea; }
    .acciones { display: flex; gap: 8px; align-items: center; padding: 8px 0; }
  `],
})
export class TablaTransaccionesComponent implements OnInit {
  readonly store = inject(TransaccionesStore);

  ngOnInit(): void {
    this.store.cargarSiguiente();
  }

  /** Pide la página siguiente por cursor cuando el operador se acerca al final. */
  alScrollear(indice: number): void {
    if (indice > this.store.visibles().length - 200) this.store.cargarSiguiente();
  }

  cambiar(estado: EstadoTransaccion): void {
    this.store.cambiarEstadoEnLote(estado);
  }

  porId = (_: number, tx: { id: string }) => tx.id;
}
