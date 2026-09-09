/**
 * Motor de liquidación de nómina — Servimos Limitada
 * Colombia, vigencia 2026. Portado del paquete de especificación
 * "Portal Servimos Limitada" (payroll-engine.ts) sin cambios de lógica —
 * ver lib/servimos/parametros.ts para de dónde salen los `ParametrosNomina`
 * reales (tablas ya existentes de LIP en `public`, no una copia paralela).
 *
 * Cálculo puro, sin I/O — se usa tanto en server actions como directamente
 * en el cliente (previsualización en vivo de la franja de turnos).
 *
 * Reglas que suelen implementarse mal y aquí están resueltas:
 *  1. Las horas extra se calculan POR SEMANA (lo que pasa de 42), no por día.
 *  2. Un día con novedad bloqueante no genera turno ni recargos.
 *  3. El valor hora es salario / divisorHora (210 en 2026 — jornada de 42h).
 *  4. El descanso se descuenta proporcionalmente entre diurnas y nocturnas.
 *
 * Simplificación conocida, dejada intacta a propósito (ver plan de Fase 2):
 * la incapacidad IEG siempre aplica el factor 66,67% en vez de modelar
 * "empleador paga 100% días 1-2, EPS paga 66,67% días 3-90" — la
 * liquidación/recobro detallado es una fase futura.
 */

export interface ParametrosNomina {
  smlmv: number;
  auxilioTransporte: number;
  divisorHora: number;          // 210
  jornadaSemanal: number;       // 42
  nocturnoIni: number;          // 19
  nocturnoFin: number;          // 30 (06:00 del día siguiente)
  recNocturno: number;          // 0.35
  recDominical: number;         // 0.90
  recExtraDiurna: number;       // 0.25
  recExtraNocturna: number;     // 0.75
  apSalud: number; apPension: number; apCaja: number;
  provCesantias: number; provIntCesantias: number;
  provPrima: number; provVacaciones: number;
}

// Fallback para pruebas/desarrollo sin conexión a BD — el motor real usa
// lib/servimos/parametros.ts → getParametrosNominaAnio(), que lee de las
// tablas de LIP en `public`.
export const PARAMS_2026: ParametrosNomina = {
  smlmv: 1_750_905, auxilioTransporte: 249_095,
  divisorHora: 210, jornadaSemanal: 42,
  nocturnoIni: 19, nocturnoFin: 30,
  recNocturno: 0.35, recDominical: 0.90,
  recExtraDiurna: 0.25, recExtraNocturna: 0.75,
  apSalud: 0.085, apPension: 0.12, apCaja: 0.04,
  provCesantias: 0.0833, provIntCesantias: 0.12,
  provPrima: 0.0833, provVacaciones: 0.0417,
};

export interface TurnoDef {
  codigo: string;
  horaInicio: string | null;   // '06:00'
  horaFin: string | null;      // '14:00'
  descansoMin: number;
}

export interface TurnoCalculado {
  horas: number; nocturnas: number; diurnas: number; etiqueta: string;
}

export interface DiaCalendario {
  fecha: string;               // ISO
  esDomingo: boolean;
  esFestivo: boolean;
}

export interface Trabajador {
  id: string; salario: number;
}

export interface Asignacion {
  trabajadorId: string; fecha: string; turno: string;
}

/** Novedad que impide ejecutar el turno de ese día. */
export interface NovedadBloqueante {
  trabajadorId: string; fecha: string;
  tipo: 'AUS' | 'IEG' | 'IAT' | 'PNR' | 'SUS' | 'VAC' | 'LIC' | 'PRE';
}

/** Novedad que suma horas al devengado. */
export interface NovedadHoras {
  trabajadorId: string; tipo: 'HED' | 'HEN' | 'RN' | 'DOM'; cantidad: number;
}

const hNum = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h + (m || 0) / 60;
};

const solape = (a1: number, a2: number, b1: number, b2: number): number =>
  Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Reparte las horas de un turno entre diurnas y nocturnas.
 * La franja nocturna es 19:00–06:00 (Ley 2466 de 2025). El descanso se
 * descuenta de forma proporcional, no todo de un solo lado.
 */
export function calcularTurno(t: TurnoDef, p: ParametrosNomina = PARAMS_2026): TurnoCalculado {
  if (!t.horaInicio || !t.horaFin) {
    return { horas: 0, nocturnas: 0, diurnas: 0, etiqueta: 'descanso' };
  }
  const ini = hNum(t.horaInicio);
  let fin = hNum(t.horaFin);
  if (fin <= ini) fin += 24;              // el turno cruza la medianoche

  const bruto = fin - ini;
  const descanso = (t.descansoMin || 0) / 60;
  const factor = bruto ? (bruto - descanso) / bruto : 0;

  const nocturnaBruta =
    solape(ini, fin, p.nocturnoIni, p.nocturnoFin) +
    solape(ini, fin, p.nocturnoIni + 24, p.nocturnoFin + 24) +
    solape(ini, fin, 0, 6);

  const horas = round2(bruto - descanso);
  const nocturnas = round2(nocturnaBruta * factor);
  return {
    horas, nocturnas, diurnas: round2(horas - nocturnas),
    etiqueta: `${t.horaInicio}–${t.horaFin}`,
  };
}

export interface ResultadoLiquidacion {
  horasOrdinarias: number; valorOrdinarias: number;
  horasNocturnas: number;  valorNocturnas: number;
  horasDominicales: number; valorDominicales: number;
  horasExtraDiurnas: number; valorExtraDiurnas: number;
  horasExtraNocturnas: number; valorExtraNocturnas: number;
  diasAusencia: number; valorAusencias: number;
  diasIncapacidad: number; valorIncapacidades: number;
  diasVacaciones: number; valorVacaciones: number;
  auxilioTransporte: number;
  devengado: number;
  salud: number; pension: number; arl: number; caja: number;
  cesantias: number; intCesantias: number; prima: number; provVacaciones: number;
  prestacional: number;
  costoTotal: number;
  porTurno: Record<string, { turnos: number; horas: number; horasOrdinarias: number; valor: number }>;
  turnosNoEjecutados: number;
}

export function liquidar(args: {
  trabajadores: Trabajador[];
  dias: DiaCalendario[];
  turnos: Record<string, TurnoDef>;
  asignaciones: Asignacion[];
  bloqueantes: NovedadBloqueante[];
  novedadesHoras: NovedadHoras[];
  tarifaArl: number;
  params?: ParametrosNomina;
}): ResultadoLiquidacion {
  const p = args.params ?? PARAMS_2026;
  const r = nuevoResultado();

  const asigPorClave = new Map(
    args.asignaciones.map(a => [`${a.trabajadorId}|${a.fecha}`, a.turno]),
  );
  const bloqPorClave = new Map(
    args.bloqueantes.map(b => [`${b.trabajadorId}|${b.fecha}`, b.tipo]),
  );
  const turnoCache = new Map<string, TurnoCalculado>();
  const info = (codigo: string) => {
    if (!turnoCache.has(codigo)) {
      turnoCache.set(codigo, calcularTurno(args.turnos[codigo] ?? vacio(codigo), p));
    }
    return turnoCache.get(codigo)!;
  };

  for (const w of args.trabajadores) {
    const vh = w.salario / p.divisorHora;
    let acumSemana = 0;

    args.dias.forEach((d, idx) => {
      // Reinicio del contador semanal cada 7 días del periodo.
      if (idx % 7 === 0 && idx > 0) acumSemana = 0;

      const codigo = asigPorClave.get(`${w.id}|${d.fecha}`) ?? 'D';
      const t = info(codigo);
      if (!t.horas) return;

      const bloqueo = bloqPorClave.get(`${w.id}|${d.fecha}`);
      if (bloqueo) {
        r.turnosNoEjecutados++;
        const valorDia = w.salario / 30;
        if (bloqueo === 'AUS' || bloqueo === 'PNR' || bloqueo === 'SUS') {
          r.diasAusencia++; r.valorAusencias += valorDia;
        } else if (bloqueo === 'IEG') {
          // Enfermedad general: 66,67% desde el día 3. Los 2 primeros los
          // asume el empleador; el resto se recobra a la EPS.
          r.diasIncapacidad++; r.valorIncapacidades += valorDia * 0.6667;
        } else if (bloqueo === 'IAT') {
          r.diasIncapacidad++; r.valorIncapacidades += valorDia;   // ARL 100%
        } else if (bloqueo === 'VAC') {
          r.diasVacaciones++; r.valorVacaciones += valorDia;
        }
        return;
      }

      // Extras por semana: lo que supera la jornada legal.
      const disponible = Math.max(0, p.jornadaSemanal - acumSemana);
      const ordinarias = Math.min(t.horas, disponible);
      const extras = t.horas - ordinarias;
      acumSemana += t.horas;

      const pt = (r.porTurno[codigo] ??= { turnos: 0, horas: 0, horasOrdinarias: 0, valor: 0 });
      pt.turnos++; pt.horas += t.horas; pt.horasOrdinarias += ordinarias;
      pt.valor += ordinarias * vh;

      r.horasOrdinarias += ordinarias;
      r.valorOrdinarias += ordinarias * vh;

      if (extras > 0) {
        // La proporción nocturna de la extra sale de la composición del turno.
        const propNoc = t.horas ? t.nocturnas / t.horas : 0;
        const extraNoc = extras * propNoc;
        const extraDiu = extras - extraNoc;
        r.horasExtraDiurnas += extraDiu;
        r.valorExtraDiurnas += extraDiu * vh * (1 + p.recExtraDiurna);
        r.horasExtraNocturnas += extraNoc;
        r.valorExtraNocturnas += extraNoc * vh * (1 + p.recExtraNocturna);
      }

      if (t.nocturnas > 0) {
        r.horasNocturnas += t.nocturnas;
        r.valorNocturnas += t.nocturnas * vh * p.recNocturno;
      }
      if (d.esDomingo || d.esFestivo) {
        r.horasDominicales += t.horas;
        r.valorDominicales += t.horas * vh * p.recDominical;
      }
    });

    if (w.salario <= 2 * p.smlmv) r.auxilioTransporte += p.auxilioTransporte / 2;
  }

  // Novedades reportadas en horas (extras autorizadas, recargos puntuales).
  const salarioPorId = new Map(args.trabajadores.map(w => [w.id, w.salario]));
  for (const n of args.novedadesHoras) {
    const salario = salarioPorId.get(n.trabajadorId);
    if (!salario) continue;
    const vh = salario / p.divisorHora;
    if (n.tipo === 'HED') {
      r.horasExtraDiurnas += n.cantidad;
      r.valorExtraDiurnas += n.cantidad * vh * (1 + p.recExtraDiurna);
    } else if (n.tipo === 'HEN') {
      r.horasExtraNocturnas += n.cantidad;
      r.valorExtraNocturnas += n.cantidad * vh * (1 + p.recExtraNocturna);
    } else if (n.tipo === 'RN') {
      r.horasNocturnas += n.cantidad;
      r.valorNocturnas += n.cantidad * vh * p.recNocturno;
    } else if (n.tipo === 'DOM') {
      r.horasDominicales += n.cantidad;
      r.valorDominicales += n.cantidad * vh * p.recDominical;
    }
  }

  r.devengado =
    r.valorOrdinarias + r.valorNocturnas + r.valorDominicales +
    r.valorExtraDiurnas + r.valorExtraNocturnas +
    r.valorIncapacidades + r.valorVacaciones + r.auxilioTransporte -
    r.valorAusencias;

  // El auxilio de transporte no es factor salarial para aportes,
  // pero sí para cesantías y prima.
  const baseSalarial =
    r.valorOrdinarias + r.valorNocturnas + r.valorDominicales +
    r.valorExtraDiurnas + r.valorExtraNocturnas + r.valorVacaciones -
    r.valorAusencias;
  const basePrestacional = baseSalarial + r.auxilioTransporte;

  r.salud    = baseSalarial * p.apSalud;
  r.pension  = baseSalarial * p.apPension;
  r.arl      = baseSalarial * args.tarifaArl;
  r.caja     = baseSalarial * p.apCaja;
  r.cesantias    = basePrestacional * p.provCesantias;
  r.intCesantias = r.cesantias * p.provIntCesantias;
  r.prima        = basePrestacional * p.provPrima;
  r.provVacaciones = baseSalarial * p.provVacaciones;

  r.prestacional =
    r.salud + r.pension + r.arl + r.caja +
    r.cesantias + r.intCesantias + r.prima + r.provVacaciones;

  r.costoTotal = r.devengado + r.prestacional;
  return r;
}

/**
 * AIU e IVA. El IVA del 19% grava únicamente el AIU, con base gravable
 * mínima del 10% del valor del contrato (art. 462-1 del Estatuto Tributario).
 * El reembolso de nómina no genera IVA.
 */
export function calcularFactura(args: {
  costoNomina: number;
  aiuModo: 'pct' | 'cargo' | 'escalonado' | 'fijo';
  aiuPct?: number;
  aiuFijo?: number;
  personas?: number;
  pctPorCargo?: Record<string, number>;
  costoPorCargo?: Record<string, number>;
}) {
  const { costoNomina } = args;
  let aiu = 0;

  switch (args.aiuModo) {
    case 'fijo':
      aiu = (args.aiuFijo ?? 0) * (args.personas ?? 0);
      break;
    case 'cargo':
      aiu = Object.entries(args.costoPorCargo ?? {}).reduce(
        (acc, [cargo, costo]) => acc + costo * ((args.pctPorCargo?.[cargo] ?? 9.5) / 100), 0);
      break;
    case 'escalonado': {
      const pct = costoNomina > 900_000_000 ? 7 : costoNomina > 500_000_000 ? 8.5 : 10;
      aiu = costoNomina * (pct / 100);
      break;
    }
    default:
      aiu = costoNomina * ((args.aiuPct ?? 9.5) / 100);
  }

  const baseIva = Math.max(aiu, costoNomina * 0.10);
  const iva = baseIva * 0.19;
  return { aiu, baseIva, iva, total: costoNomina + aiu + iva };
}

function vacio(codigo: string): TurnoDef {
  return { codigo, horaInicio: null, horaFin: null, descansoMin: 0 };
}

function nuevoResultado(): ResultadoLiquidacion {
  return {
    horasOrdinarias: 0, valorOrdinarias: 0,
    horasNocturnas: 0, valorNocturnas: 0,
    horasDominicales: 0, valorDominicales: 0,
    horasExtraDiurnas: 0, valorExtraDiurnas: 0,
    horasExtraNocturnas: 0, valorExtraNocturnas: 0,
    diasAusencia: 0, valorAusencias: 0,
    diasIncapacidad: 0, valorIncapacidades: 0,
    diasVacaciones: 0, valorVacaciones: 0,
    auxilioTransporte: 0, devengado: 0,
    salud: 0, pension: 0, arl: 0, caja: 0,
    cesantias: 0, intCesantias: 0, prima: 0, provVacaciones: 0,
    prestacional: 0, costoTotal: 0,
    porTurno: {}, turnosNoEjecutados: 0,
  };
}

/**
 * Genera el archivo plano de novedades para Novasoft GTH.
 * OJO: los códigos de concepto deben ser los reales de la instalación
 * de Servimos, no los del paquete de referencia (placeholder).
 */
export function archivoNovasoft(filas: Array<{
  cedula: string; codConcepto: string; desde: string; hasta: string;
  cantidad: number; centroCosto: string; observacion: string;
}>): string {
  return filas
    .map(f => [
      f.cedula.replace(/\./g, ''), f.codConcepto, f.desde, f.hasta,
      f.cantidad.toFixed(2), f.centroCosto, f.observacion.slice(0, 40),
    ].join('|'))
    .join('\n');
}
