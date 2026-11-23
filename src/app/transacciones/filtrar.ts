import { Filtros, Transaccion } from './transaccion.model';

/**
 * Filtro puro y sin efectos: se puede testear aislado y, si hace falta,
 * moverlo a un Web Worker sin cambiarlo.
 */
export function filtrar(items: readonly Transaccion[], f: Filtros): Transaccion[] {
  const estados = f.estados.length ? new Set(f.estados) : null;
  const tipos = f.tipos.length ? new Set(f.tipos) : null;
  return items.filter(
    (t) =>
      (!f.desde || t.fecha >= f.desde) &&
      (!f.hasta || t.fecha <= f.hasta) &&
      (!estados || estados.has(t.estado)) &&
      (!tipos || tipos.has(t.tipo)) &&
      (f.montoMin == null || t.monto >= f.montoMin) &&
      (f.montoMax == null || t.monto <= f.montoMax),
  );
}
