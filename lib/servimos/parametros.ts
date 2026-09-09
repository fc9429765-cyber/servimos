"use server"

// Lee los parámetros legales de nómina YA EXISTENTES de LIP (`public`
// schema) para que Servimos no mantenga una copia paralela de la misma ley
// colombiana. Ver el plan de Fase 2 (§5) — investigado antes de decidir:
//   - public.parametros_legales_anio: SMLMV, auxilio de transporte, y
//     (vía extend_parametros_nomina.sql) dias_calendario/jornada_horas
//     (30×7=210, el divisor Ley 2101/2021) y los % de HED/HEN/HN/dominical.
//   - public.parametros_parafiscales: aportes salud/pensión/caja.
//   - public.parametros_prestaciones: provisiones cesantías/prima/vacaciones
//     (fila única, no versionada por año).
//
// La franja nocturna (19:00–06:00, Ley 2466/2025) no vive en ninguna tabla
// de `public` — LIP nunca la modeló como columna porque su propio cálculo
// de horas extra no hace reparto diurno/nocturno automático (ver
// fn_calcular_y_asignar_horas_extras.sql). Se deja fija aquí: es un valor
// de la ley, no un parámetro configurable por año.

import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { ParametrosNomina } from "./payroll-engine"

const NOCTURNO_INI = 19 // 19:00, Ley 2466/2025
const NOCTURNO_FIN = 30 // 06:00 del día siguiente (30 = 24 + 6)

/**
 * Arma los ParametrosNomina del año dado leyendo las tablas de LIP en
 * `public`. Si el año no está parametrizado, cae al año más reciente
 * disponible (mismo criterio de fallback que lib/parametros-nomina-actions.ts).
 */
export async function getParametrosNominaAnio(anio: number): Promise<ParametrosNomina> {
  const admin = await getSupabaseAdmin()

  const [legalesRes, parafiscalesRes, prestacionesRes] = await Promise.all([
    admin.from("parametros_legales_anio").select("*").eq("anio", anio).maybeSingle(),
    admin.from("parametros_parafiscales").select("*").eq("anio", anio).maybeSingle(),
    admin.from("parametros_prestaciones").select("*").eq("id", 1).maybeSingle(),
  ])

  let legales = legalesRes.data
  if (!legales) {
    // Fallback: año más reciente disponible (activo primero).
    const { data } = await admin
      .from("parametros_legales_anio")
      .select("*")
      .order("anio", { ascending: false })
      .limit(1)
      .maybeSingle()
    legales = data
  }
  if (!legales) {
    throw new Error(`No hay parámetros legales configurados en public.parametros_legales_anio (año ${anio})`)
  }

  let parafiscales = parafiscalesRes.data
  if (!parafiscales) {
    const { data } = await admin
      .from("parametros_parafiscales")
      .select("*")
      .order("anio", { ascending: false })
      .limit(1)
      .maybeSingle()
    parafiscales = data
  }

  const prestaciones = prestacionesRes.data

  const diasCalendario = legales.dias_calendario ?? 30
  const jornadaHoras = legales.jornada_horas ?? 7

  return {
    smlmv: Number(legales.smlv),
    auxilioTransporte: Number(legales.auxilio_transporte),
    divisorHora: diasCalendario * jornadaHoras,
    jornadaSemanal: jornadaHoras * 6,
    nocturnoIni: NOCTURNO_INI,
    nocturnoFin: NOCTURNO_FIN,
    recNocturno: Number(legales.pct_hn ?? 35) / 100,
    recDominical: Number(legales.pct_recargo_dominical ?? 90) / 100,
    recExtraDiurna: Number(legales.pct_hed ?? 25) / 100,
    recExtraNocturna: Number(legales.pct_hen ?? 75) / 100,
    apSalud: Number(parafiscales?.pct_salud_empleador ?? 8.5) / 100,
    apPension: Number(parafiscales?.pct_pension_empleador ?? 12) / 100,
    apCaja: Number(parafiscales?.pct_caja ?? 4) / 100,
    provCesantias: Number(prestaciones?.pct_cesantias ?? 8.33) / 100,
    provIntCesantias: Number(prestaciones?.pct_intereses_cesantias ?? 12) / 100,
    provPrima: Number(prestaciones?.pct_prima ?? 8.33) / 100,
    provVacaciones: Number(prestaciones?.pct_vacaciones ?? 4.17) / 100,
  }
}
