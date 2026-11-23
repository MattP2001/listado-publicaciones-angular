import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BarraFiltrosComponent } from './barra-filtros.component';
import { TablaTransaccionesComponent } from './tabla-transacciones.component';
import { TransaccionesStore } from './transacciones.store';

/**
 * Pantalla contenedora: provee el store con alcance de pantalla, así al salir de la
 * consola se destruye con todo lo cargado y sus suscripciones.
 */
@Component({
  selector: 'app-pantalla-transacciones',
  standalone: true,
  imports: [BarraFiltrosComponent, TablaTransaccionesComponent],
  providers: [TransaccionesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Consola de transacciones</h1>
    <app-barra-filtros />
    @if (store.error(); as error) { <p role="alert">{{ error }}</p> }
    <app-tabla-transacciones />
  `,
})
export class PantallaTransaccionesComponent {
  readonly store = inject(TransaccionesStore);
}
