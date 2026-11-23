import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { MAX_EN_MEMORIA, TransaccionesStore } from './transacciones.store';
import { TransaccionesApi } from './transacciones.api';
import { generarTransacciones } from './datos-falsos';
import { EstadoLote } from './lote.model';
import { PaginaTransacciones } from './transaccion.model';

class ApiFalsa {
  paginas: PaginaTransacciones[] = [];
  lote: Observable<EstadoLote> = of();
  pagina = jasmine.createSpy('pagina').and.callFake(() => of(this.paginas.shift()!));
  iniciarLote = jasmine.createSpy('iniciarLote').and.returnValue(of({ taskId: 't-1' }));
  seguirLote = jasmine.createSpy('seguirLote').and.callFake(() => this.lote);
}

describe('TransaccionesStore', () => {
  let store: TransaccionesStore;
  let api: ApiFalsa;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideExperimentalZonelessChangeDetection(),
        TransaccionesStore,
        { provide: TransaccionesApi, useClass: ApiFalsa },
      ],
    });
    store = TestBed.inject(TransaccionesStore);
    api = TestBed.inject(TransaccionesApi) as unknown as ApiFalsa;
  });

  it('pide la página siguiente con el cursor que devolvió el backend', () => {
    api.paginas = [
      { items: generarTransacciones(2), nextCursor: 'c-2' },
      { items: generarTransacciones(1), nextCursor: null },
    ];
    store.cargarSiguiente();
    store.cargarSiguiente();
    expect(api.pagina.calls.argsFor(1)[1]).toBe('c-2');
    expect(store.hayMas()).toBeFalse();
  });

  it('no guarda más de MAX_EN_MEMORIA transacciones', () => {
    const muchas = generarTransacciones(MAX_EN_MEMORIA + 500);
    api.paginas = [{ items: muchas, nextCursor: 'x' }];
    store.cargarSiguiente();
    expect(store.transacciones().length).toBe(MAX_EN_MEMORIA);
  });

  it('al cambiar filtros descarta lo cargado y vuelve al primer cursor', () => {
    api.paginas = [
      { items: generarTransacciones(5), nextCursor: 'c-5' },
      { items: generarTransacciones(1), nextCursor: null },
    ];
    store.cargarSiguiente();
    store.aplicarFiltros({ estados: ['APROBADA'], tipos: [] });
    expect(api.pagina.calls.mostRecent().args[1]).toBeNull();
    expect(store.transacciones().length).toBe(1);
  });

  it('no deja seleccionar más de 500', () => {
    generarTransacciones(600).forEach((t) => store.alternarSeleccion(t.id));
    expect(store.cantidadSeleccionada()).toBe(500);
  });

  it('un lote con fallos parciales aplica sólo lo confirmado y marca lo fallido', () => {
    const [a, b] = generarTransacciones(2);
    api.paginas = [{ items: [a, b], nextCursor: null }];
    store.cargarSiguiente();
    store.alternarSeleccion(a.id);
    store.alternarSeleccion(b.id);
    api.lote = of(
      { taskId: 't-1', estado: 'EN_PROCESO', exitosos: [], fallidos: [] },
      { taskId: 't-1', estado: 'COMPLETADA', exitosos: [a.id], fallidos: [{ id: b.id, motivo: 'conflicto' }] },
    );

    store.cambiarEstadoEnLote('APROBADA');

    expect(store.transacciones().find((t) => t.id === a.id)!.estado).toBe('APROBADA');
    expect(store.transacciones().find((t) => t.id === b.id)!.estado).toBe(b.estado);
    expect(store.estadoDeFila(b.id)).toBe('FALLIDO');
    expect(store.fallidos().get(b.id)).toBe('conflicto');
    expect(store.pendientes().size).toBe(0);
  });

  it('mientras el lote está en proceso la fila no muestra el estado nuevo', () => {
    const [a] = generarTransacciones(1);
    api.paginas = [{ items: [a], nextCursor: null }];
    store.cargarSiguiente();
    store.alternarSeleccion(a.id);
    api.lote = of({ taskId: 't-1', estado: 'EN_PROCESO', exitosos: [], fallidos: [] });

    store.cambiarEstadoEnLote('RECHAZADA');

    expect(store.estadoDeFila(a.id)).toBe('PENDIENTE');
    expect(store.transacciones()[0].estado).toBe(a.estado);
  });

  it('si no se puede consultar el lote, las filas quedan marcadas con error', () => {
    const [a] = generarTransacciones(1);
    api.paginas = [{ items: [a], nextCursor: null }];
    store.cargarSiguiente();
    store.alternarSeleccion(a.id);
    api.lote = throwError(() => new Error('red'));

    store.cambiarEstadoEnLote('APROBADA');

    expect(store.estadoDeFila(a.id)).toBe('FALLIDO');
  });
});
