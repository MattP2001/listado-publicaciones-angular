export type EstadoTransaccion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'EN_REVISION';
export type TipoOperacion = 'PAGO' | 'REEMBOLSO' | 'TRANSFERENCIA' | 'CONTRACARGO';

export interface Transaccion {
  id: string;
  fecha: string; // ISO-8601
  estado: EstadoTransaccion;
  tipo: TipoOperacion;
  monto: number;
  /** Versión para detectar que otro operador la modificó (control optimista). */
  version: number;
}

export interface Filtros {
  desde?: string;
  hasta?: string;
  estados: EstadoTransaccion[];
  tipos: TipoOperacion[];
  montoMin?: number;
  montoMax?: number;
}

/** Página que devuelve el backend: sólo soporta cursor, no offset. */
export interface PaginaTransacciones {
  items: Transaccion[];
  nextCursor: string | null;
}
