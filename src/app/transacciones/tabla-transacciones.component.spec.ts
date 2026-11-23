import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';
import { TablaTransaccionesComponent } from './tabla-transacciones.component';
import { TransaccionesStore } from './transacciones.store';
import { TransaccionesApi } from './transacciones.api';
import { generarTransacciones } from './datos-falsos';

describe('TablaTransaccionesComponent', () => {
  const datos = generarTransacciones(3);

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TablaTransaccionesComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        TransaccionesStore,
        {
          provide: TransaccionesApi,
          useValue: { pagina: () => of({ items: datos, nextCursor: null }) },
        },
      ],
    });
  });

  it('una fila con error muestra el motivo', async () => {
    const fixture = TestBed.createComponent(TablaTransaccionesComponent);
    const store = TestBed.inject(TransaccionesStore);
    fixture.detectChanges();
    store.fallidos.set(new Map([[datos[0].id, 'Otro operador la modificó antes']]));
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Otro operador la modificó antes');
  });

  it('una fila pendiente no se puede seleccionar', async () => {
    const fixture = TestBed.createComponent(TablaTransaccionesComponent);
    const store = TestBed.inject(TransaccionesStore);
    fixture.detectChanges();
    store.pendientes.set(new Set([datos[1].id]));
    await fixture.whenStable();

    const check = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      `input[aria-label="Seleccionar ${datos[1].id}"]`,
    );
    expect(check?.disabled).toBeTrue();
  });
});
