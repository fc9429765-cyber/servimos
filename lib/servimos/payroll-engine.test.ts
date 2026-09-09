import { describe, expect, it } from "vitest"
import { PARAMS_2026, calcularTurno, liquidar, type DiaCalendario, type TurnoDef } from "./payroll-engine"

// Turnos usados en las pruebas (mismos códigos que el seed de demo,
// scripts/servimos/07_seed_nomina_demo.sql).
const T1: TurnoDef = { codigo: "T1", horaInicio: "06:00", horaFin: "14:00", descansoMin: 60 } // 100% diurno
const T2: TurnoDef = { codigo: "T2", horaInicio: "14:00", horaFin: "22:00", descansoMin: 60 } // mixto día/noche
const T3: TurnoDef = { codigo: "T3", horaInicio: "22:00", horaFin: "06:00", descansoMin: 60 } // 100% nocturno

function diasSemana(desde: string, n: number): DiaCalendario[] {
  const dias: DiaCalendario[] = []
  const base = new Date(`${desde}T00:00:00Z`)
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + i)
    const dow = d.getUTCDay() // 0 = domingo
    dias.push({ fecha: d.toISOString().slice(0, 10), esDomingo: dow === 0, esFestivo: false })
  }
  return dias
}

describe("calcularTurno", () => {
  it("turno nocturno completo (22:00–06:00): todas las horas trabajadas son nocturnas", () => {
    const r = calcularTurno(T3, PARAMS_2026)
    expect(r.horas).toBe(7) // 8h brutas - 1h de descanso
    expect(r.nocturnas).toBe(7)
    expect(r.diurnas).toBe(0)
  })

  it("turno con descanso de 60 minutos: el descuento se reparte proporcional, no todo de un lado", () => {
    const r = calcularTurno(T2, PARAMS_2026) // 14:00–22:00: 5h diurnas + 3h nocturnas brutas
    expect(r.horas).toBe(7)
    // Si el descanso se descontara ENTERO del lado nocturno, nocturnas sería 2 (3-1) y diurnas 5.
    // El reparto proporcional (factor 7/8) da ~2.63 nocturnas y ~4.37 diurnas.
    expect(r.nocturnas).toBeCloseTo(2.63, 1)
    expect(r.diurnas).toBeCloseTo(4.37, 1)
    expect(r.nocturnas).not.toBe(2)
    expect(r.diurnas).not.toBe(5)
    expect(round2(r.diurnas + r.nocturnas)).toBe(r.horas)
  })
})

describe("liquidar — semana que supera 42h", () => {
  it("las horas extra salen del día donde se cruza el umbral semanal, con la proporción del turno de ese día", () => {
    const trabajadorId = "w1"
    const dias = diasSemana("2026-08-03", 7) // lunes a domingo, 1 sola semana (7 días)
    const asignaciones = dias.map((d) => ({ trabajadorId, fecha: d.fecha, turno: "T1" }))

    const resultado = liquidar({
      trabajadores: [{ id: trabajadorId, salario: 1_750_905 }],
      dias,
      turnos: { T1 },
      asignaciones,
      bloqueantes: [],
      novedadesHoras: [],
      tarifaArl: 0.00522,
      params: PARAMS_2026,
    })

    // 7 turnos T1 de 7h = 49h. Jornada semanal = 42h → 7h de extra.
    expect(resultado.horasOrdinarias).toBe(42)
    expect(resultado.horasExtraDiurnas + resultado.horasExtraNocturnas).toBeCloseTo(7, 2)
    // T1 es 100% diurno (06:00–14:00 no toca la franja 19:00–06:00) → toda la
    // extra debe salir diurna, nada nocturno.
    expect(resultado.horasExtraNocturnas).toBe(0)
    expect(resultado.horasExtraDiurnas).toBeCloseTo(7, 2)
  })
})

describe("liquidar — día con incapacidad", () => {
  const trabajadorId = "w2"
  const dias = diasSemana("2026-08-03", 1)
  const salario = 1_750_905

  it("incapacidad general (IEG): el día paga 66,67% (empleador días 1-2, EPS desde el día 3)", () => {
    const resultado = liquidar({
      trabajadores: [{ id: trabajadorId, salario }],
      dias,
      turnos: { T1 },
      asignaciones: [{ trabajadorId, fecha: dias[0].fecha, turno: "T1" }],
      bloqueantes: [{ trabajadorId, fecha: dias[0].fecha, tipo: "IEG" }],
      novedadesHoras: [],
      tarifaArl: 0.00522,
      params: PARAMS_2026,
    })

    expect(resultado.diasIncapacidad).toBe(1)
    expect(resultado.turnosNoEjecutados).toBe(1)
    expect(resultado.horasOrdinarias).toBe(0) // el día bloqueante no genera turno
    expect(resultado.valorIncapacidades).toBeCloseTo((salario / 30) * 0.6667, 2)
  })

  it("accidente de trabajo (IAT): la ARL asume el 100% del día desde el primer día", () => {
    const resultado = liquidar({
      trabajadores: [{ id: trabajadorId, salario }],
      dias,
      turnos: { T1 },
      asignaciones: [{ trabajadorId, fecha: dias[0].fecha, turno: "T1" }],
      bloqueantes: [{ trabajadorId, fecha: dias[0].fecha, tipo: "IAT" }],
      novedadesHoras: [],
      tarifaArl: 0.00522,
      params: PARAMS_2026,
    })

    expect(resultado.diasIncapacidad).toBe(1)
    expect(resultado.valorIncapacidades).toBeCloseTo(salario / 30, 2)
  })
})

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
