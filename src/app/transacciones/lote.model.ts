import { EstadoTransaccion } from './transaccion.model';

export interface SolicitudLote {
  ids: string[];
  nuevoEstado: EstadoTransaccion;
}

export type EstadoTarea = 'EN_PROCESO' | 'COMPLETADA' | 'FALLIDA';

/**
 * Estado de la tarea asíncrona que devuelve el backend (task_id).
 * Se asume el peor caso: el resultado puede traer éxitos y fallos por ítem
 * (duda abierta con backend, ver docs/NOTAS_PO.md).
 */
export interface EstadoLote {
  taskId: string;
  estado: EstadoTarea;
  exitosos: string[];
  fallidos: { id: string; motivo: string }[];
}
