import { filtrar } from './filtrar';
import { generarTransacciones } from './datos-falsos';

describe('filtrar', () => {
  const datos = generarTransacciones(1_000);

  it('sin filtros devuelve todo', () => {
    expect(filtrar(datos, { estados: [], tipos: [] }).length).toBe(1_000);
  });

  it('combina estado, tipo y monto', () => {
    const r = filtrar(datos, { estados: ['APROBADA'], tipos: ['PAGO'], montoMin: 100, montoMax: 1_000 });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((t) => t.estado === 'APROBADA' && t.tipo === 'PAGO' && t.monto >= 100 && t.monto <= 1_000)).toBeTrue();
  });

  it('filtra por rango de fechas', () => {
    const r = filtrar(datos, { estados: [], tipos: [], desde: '2026-10-02', hasta: '2026-10-03' });
    expect(r.every((t) => t.fecha >= '2026-10-02' && t.fecha <= '2026-10-03')).toBeTrue();
  });
});
