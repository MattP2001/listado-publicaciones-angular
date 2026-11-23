import { EstadoTransaccion, TipoOperacion, Transaccion } from './transaccion.model';

const ESTADOS: EstadoTransaccion[] = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'EN_REVISION'];
const TIPOS: TipoOperacion[] = ['PAGO', 'REEMBOLSO', 'TRANSFERENCIA', 'CONTRACARGO'];

/** Datos deterministas para el prototipo y los tests. */
export function generarTransacciones(n: number): Transaccion[] {
  const base = Date.UTC(2026, 9, 1);
  return Array.from({ length: n }, (_, i) => ({
    id: `TX-${String(i + 1).padStart(6, '0')}`,
    fecha: new Date(base + i * 3_600_000).toISOString(),
    estado: ESTADOS[i % ESTADOS.length],
    tipo: TIPOS[(i * 7) % TIPOS.length],
    monto: Math.round(((i * 7919) % 500_000) / 10) / 10,
    version: 1,
  }));
}
