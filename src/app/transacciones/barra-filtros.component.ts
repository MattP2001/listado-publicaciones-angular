import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TransaccionesStore } from './transacciones.store';
import { EstadoTransaccion, TipoOperacion } from './transaccion.model';

/**
 * Filtros combinables. Se aplican con debounce de 400 ms para no pedirle al backend
 * una página por cada tecla mientras el operador escribe un monto.
 */
@Component({
  selector: 'app-barra-filtros',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" class="filtros">
      <label>Desde <input type="date" formControlName="desde" /></label>
      <label>Hasta <input type="date" formControlName="hasta" /></label>
      <label>Estado
        <select formControlName="estado">
          <option value="">Todos</option>
          @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
        </select>
      </label>
      <label>Tipo
        <select formControlName="tipo">
          <option value="">Todos</option>
          @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }
        </select>
      </label>
      <label>Monto mín. <input type="number" formControlName="montoMin" /></label>
      <label>Monto máx. <input type="number" formControlName="montoMax" /></label>
    </form>
  `,
  styles: [`.filtros { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 0; }`],
})
export class BarraFiltrosComponent {
  private readonly store = inject(TransaccionesStore);

  readonly estados: EstadoTransaccion[] = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'EN_REVISION'];
  readonly tipos: TipoOperacion[] = ['PAGO', 'REEMBOLSO', 'TRANSFERENCIA', 'CONTRACARGO'];

  readonly form = inject(FormBuilder).nonNullable.group({
    desde: '',
    hasta: '',
    estado: '',
    tipo: '',
    montoMin: '',
    montoMax: '',
  });

  constructor() {
    this.form.valueChanges.pipe(debounceTime(400), takeUntilDestroyed()).subscribe((v) =>
      this.store.aplicarFiltros({
        desde: v.desde || undefined,
        hasta: v.hasta || undefined,
        estados: v.estado ? [v.estado as EstadoTransaccion] : [],
        tipos: v.tipo ? [v.tipo as TipoOperacion] : [],
        montoMin: v.montoMin === '' || v.montoMin == null ? undefined : Number(v.montoMin),
        montoMax: v.montoMax === '' || v.montoMax == null ? undefined : Number(v.montoMax),
      }),
    );
  }
}
