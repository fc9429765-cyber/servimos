// Mapeo ÁREA (grupo del menú) → indicadores del BSC que le corresponden, y
// la definición de presentación de cada indicador (nombre, formato, meta).
// Las CLAVES coinciden con las que produce `getIndicadoresValores` (sig-actions).
// Es config pura (client-safe): NO consulta datos.

export interface KpiDef {
  nombre: string
  fmt: "pct" | "num" | "ton" | "min"
  meta?: number
  /** true = más alto es mejor (default); false = más bajo es mejor. */
  higherBetter?: boolean
}

export const KPI_DEFS: Record<string, KpiDef> = {
  sla_tiempos: { nombre: "SLA de tiempos", fmt: "pct", meta: 90, higherBetter: true },
  sla_global: { nombre: "Nivel de servicio", fmt: "pct", meta: 90, higherBetter: true },
  desp_cumplimiento: { nombre: "Cumplim. de cargues", fmt: "pct", meta: 98, higherBetter: true },
  desp_ciclo_cerrado: { nombre: "Ciclo cerrado", fmt: "pct", meta: 100, higherBetter: true },
  desp_meta_ton: { nombre: "Cumpl. meta toneladas", fmt: "pct", meta: 100, higherBetter: true },
  desp_ordenes: { nombre: "Órdenes", fmt: "num" },
  desp_toneladas: { nombre: "Toneladas", fmt: "ton" },
  vehiculos_atendidos: { nombre: "Vehículos atendidos", fmt: "num" },
  lip_tiempo_cargue: { nombre: "Tiempo de cargue", fmt: "min", higherBetter: false },
  lip_evidencia: { nombre: "Evidencia de cargue", fmt: "pct", meta: 90, higherBetter: true },
  lip_facturacion: { nombre: "Facturación gestionada", fmt: "pct", meta: 95, higherBetter: true },
  inv_exactitud: { nombre: "Exactitud de inventario", fmt: "pct", meta: 98, higherBetter: true },
  inv_rechazos: { nombre: "Rechazos", fmt: "num", higherBetter: false },
  gh_activos: { nombre: "Colaboradores activos", fmt: "num" },
  gh_ausentismo: { nombre: "Ausentismo médico", fmt: "pct", meta: 5, higherBetter: false },
  gh_cobertura: { nombre: "Cobertura de planta", fmt: "pct", meta: 100, higherBetter: true },
  gh_recobro: { nombre: "Recobro de incapacidades", fmt: "pct", meta: 90, higherBetter: true },
  sat_conductor: { nombre: "Satisfacción conductor", fmt: "pct", meta: 85, higherBetter: true },
  sat_cliente: { nombre: "Satisfacción cliente", fmt: "pct", meta: 85, higherBetter: true },
  // SST (BSC del área): SG-SST 0312, accidentalidad y IPEVR.
  // Meta = 86% (umbral "aceptable" de la Res. 0312, Art. 28). Debe coincidir con
  // la ficha del BSC en sig_indicadores (IND-SST-0312), que es la fuente oficial.
  sgsst_0312: { nombre: "Cumplimiento SG-SST 0312", fmt: "pct", meta: 86, higherBetter: true },
  sst_at_count: { nombre: "Accidentes de trabajo", fmt: "num", meta: 0, higherBetter: false },
  sst_at_dias: { nombre: "Días perdidos por AT", fmt: "num", meta: 0, higherBetter: false },
  sst_ipevr_cumpl: { nombre: "Intervención de peligros (IPEVR)", fmt: "pct", meta: 90, higherBetter: true },
}

// Qué indicadores muestra cada grupo del menú (por su `key`).
export const AREA_KPIS: Record<string, string[]> = {
  financiera: ["lip_facturacion"],
  rrhh: ["gh_activos", "gh_ausentismo", "gh_cobertura", "gh_recobro"],
  certificaciones_lip: ["sla_global", "sat_cliente", "sat_conductor"],
  sst: ["sgsst_0312", "sst_at_count", "sst_at_dias", "sst_ipevr_cumpl"],
  // servimos_mision / integral / configuracion: sin indicadores de área en el
  // BSC todavía → no muestran tira de KPIs (Torre de Control usa su propio
  // panel de KPIs de Servimos, ver CuadroControlServimos).
}

// Preguntas SUGERIDAS propias de cada área (grupo del menú). Cada una está
// alineada a datos que LIPbot puede consultar/gestionar EN ESE módulo, para no
// mostrar sugerencias fuera de contexto (ej. no ofrecer "pedidos" en RRHH).
export const AREA_SUGERENCIAS: Record<string, string[]> = {
  servimos_mision: ["¿Cuántas solicitudes de personal están pendientes?", "¿Cómo va el cumplimiento de SLA?", "¿Qué turnos hay programados hoy?"],
  integral: ["¿Qué requiere mi atención hoy?", "¿Cómo va el cumplimiento de SLA?"],
  financiera: ["¿Qué facturas hay por solicitar?", "¿Cuánto suman los gastos del mes?", "Registrar un gasto"],
  rrhh: ["¿Cuántos colaboradores activos hay?", "Registrar una novedad a un trabajador", "¿Cómo va el ausentismo del mes?"],
  certificaciones_lip: ["¿Cómo va la satisfacción del cliente?"],
  sst: ["¿Cómo va el cumplimiento del SG-SST 0312?", "¿Cuántos accidentes de trabajo hay?", "¿Cómo va la intervención de peligros (IPEVR)?"],
  configuracion: ["Crear un cliente nuevo", "Editar un usuario"],
}

// Sugerencias genéricas (Inicio / sin grupo específico).
const SUGERENCIAS_GENERICAS = [
  "¿Qué requiere mi atención hoy?",
  "¿Cuántas solicitudes de personal están pendientes?",
  "¿Cómo va el cumplimiento de SLA?",
]

/** Sugerencias para un grupo del menú; si no hay mapeo, usa las genéricas. */
export function sugerenciasDe(groupKey?: string): string[] {
  if (groupKey && AREA_SUGERENCIAS[groupKey]) return AREA_SUGERENCIAS[groupKey]
  return SUGERENCIAS_GENERICAS
}

export function formatKpi(def: KpiDef, valor: number): string {
  switch (def.fmt) {
    case "pct":
      return `${valor}%`
    case "ton":
      return `${valor} t`
    case "min":
      return `${valor} min`
    default:
      return `${valor}`
  }
}

export type KpiSev = "good" | "warn" | "crit" | "none"

export function kpiSev(def: KpiDef, valor: number): KpiSev {
  if (def.meta == null) return "none"
  const higher = def.higherBetter !== false
  if (higher) {
    if (valor >= def.meta) return "good"
    if (valor >= def.meta * 0.9) return "warn"
    return "crit"
  }
  // menor es mejor (ausentismo, tiempo de cargue, rechazos)
  if (valor <= def.meta) return "good"
  if (valor <= def.meta * 1.2) return "warn"
  return "crit"
}
