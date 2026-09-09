import { ClipboardCheck, Package, FileText, BarChart3, ArrowRightLeft, LayoutDashboard, Activity, FileCheck, Receipt, Clock, Users, Eye, Settings, Type as type, LucideIcon, CreditCard, UserCheck, Store, Gauge, Sparkles, BadgeCheck, BookOpen, Lock, ClipboardList, CalendarDays, NotebookPen, GraduationCap, Wallet, Banknote, Calculator, CalendarClock, FolderOpen, FolderArchive, UserCog, HeartHandshake, ShieldCheck, Stethoscope, AlertTriangle, Landmark } from "lucide-react"

export interface Module {
  name: string
  icon: LucideIcon
  // Texto visible opcional en el sidebar. `name` sigue siendo la clave de
  // ruteo y permisos; si `label` existe, se pinta en lugar de `name`.
  label?: string
}

export interface Subgroup {
  title: string
  modules: Module[]
}

export interface Group {
  key: GroupKey
  title: string
  icon: LucideIcon
  modules?: Module[]
  subgroups?: Subgroup[]
}

export type GroupKey =
  | "integral"
  | "rrhh"
  | "certificaciones_lip"
  | "sst"
  | "configuracion"
  | "financiera"

export const groups: Group[] = [
  {
    key: "integral",
    title: "Torre de Control",
    icon: LayoutDashboard,
    modules: [
      { name: "Dashboard Operacion", icon: Gauge, label: "Cuadro de Control" },
      { name: "Asistente IA", icon: Sparkles },
    ],
  },
  {
    key: "rrhh",
    title: "Gestión Humana",
    icon: Users,
    // REORG (2026-07-06): navegación ordenada por el CICLO DE VIDA del colaborador.
    // Se consolidó el subgrupo delgado "Gestión de Contratación" (1 módulo) dentro
    // de Selección, y "Gestión de Solicitudes" (solicitud de personal) volvió a
    // Selección desde Bienestar. Todos los módulos CONSERVAN su name/permiso.
    subgroups: [
      {
        title: "Reclutamiento, Selección y Contratación",
        modules: [
          { name: "Gestión de Solicitudes", icon: ClipboardList },
          { name: "Aprobación de Solicitudes de Personal", icon: BadgeCheck },
          { name: "Hojas de Vida", icon: BookOpen },
          { name: "Antecedentes", icon: ShieldCheck },
          { name: "Entrevistas", icon: FileCheck },
          { name: "Gestión de Contratos", icon: FileText },
        ],
      },
      {
        title: "Directorio y Expediente",
        modules: [
          { name: "Gestión de Colaboradores", icon: UserCog, label: "Directorio de Colaboradores" },
          { name: "Head Count", icon: Users },
          { name: "Carpetas de Trabajadores", icon: FolderOpen, label: "Expediente del Colaborador" },
          { name: "Panel LIP Gestión Humana", icon: BarChart3, label: "Panel LIP · Gestión Humana (SIG)" },
        ],
      },
      {
        title: "Inducción, Formación y Desempeño",
        modules: [
          { name: "Inducciones", icon: GraduationCap },
          { name: "Evidencia de Inducciones", icon: BookOpen },
          { name: "Gestión de Capacitaciones", icon: GraduationCap },
          { name: "Asistencia a Capacitaciones", icon: ClipboardList },
          { name: "Evaluaciones de Desempeño", icon: BadgeCheck },
        ],
      },
      {
        title: "Asistencia, Turnos y Tiempos",
        modules: [
          { name: "Tabla Asistencia", icon: ClipboardList, label: "Tabla de Asistencia" },
          { name: "Visor", icon: Eye, label: "Visor de Asistencia" },
          { name: "Turnos", icon: Clock, label: "Turnos por Puesto" },
          { name: "Asignación horas extra", icon: Clock, label: "Asignación de Horas Extra" },
        ],
      },
      {
        title: "Relaciones Laborales y Ausentismo",
        modules: [
          { name: "Novedades de personal", icon: NotebookPen, label: "Novedades de Personal" },
          // Matriz SST-MAT-06 de ausentismo laboral (EG / AT). Comparte el
          // permiso de "Novedades de personal".
          { name: "Ausentismos", icon: Activity },
          // Seguimiento del costo recuperable de incapacidades (EPS/ARL).
          // Comparte el permiso de "Ausentismos".
          { name: "Recobro de Incapacidades", icon: CreditCard },
        ],
      },
      {
        title: "Bienestar",
        modules: [
          { name: "Programa de Bienestar", icon: HeartHandshake },
          { name: "Participación y Evidencias", icon: ClipboardList },
        ],
      },
      {
        title: "Nómina",
        modules: [
          { name: "Nominapersonal", icon: Banknote, label: "Nómina de Personal" },
          { name: "Liquidaciones", icon: Receipt, label: "Liquidaciones" },
          // Aportes de seguridad social y parafiscales del mes (guía de la planilla PILA).
          { name: "Parafiscales", icon: Landmark, label: "Parafiscales y Seguridad Social" },
          { name: "Proyecciones", icon: Calculator, label: "Proyecciones de Nómina" },
        ],
      },
    ],
  },
  {
    // Módulo de Gestión Financiera. Los submódulos CONSERVAN sus permisos ya
    // otorgados (facturacion_proyectos, tarifas, gastos, estadoresultados).
    key: "financiera",
    title: "Gestión Financiera",
    icon: Wallet,
    modules: [],
    subgroups: [
      {
        title: "Facturación",
        modules: [
          { name: "Indicador de Facturación por Proyectos", icon: BarChart3 },
          { name: "Facturación Proyectos", icon: CreditCard },
          { name: "Tarifas", icon: CreditCard },
        ],
      },
      {
        title: "Resultados",
        modules: [
          { name: "Estado de Resultados", icon: BarChart3 },
        ],
      },
      {
        title: "Gastos",
        modules: [
          { name: "Registrar Gasto", icon: Receipt },
          { name: "Dashboard Gastos", icon: BarChart3 },
        ],
      },
    ],
  },
  {
    // Modulo de certificaciones. Agrupa el sistema SST 0312 y el centro
    // de evidencia ISO 9001 (movido desde Auditoria) como submodulos.
    key: "certificaciones_lip",
    title: "Certificaciones · SIG (Calidad · Ambiente · SST)",
    icon: BadgeCheck,
    // Submódulos agrupados POR NORMA para que se vea claro a cuál pertenece
    // cada uno: SIG transversal, luego una sección por norma certificable.
    subgroups: [
      {
        // Transversal: aplica a las 3 normas a la vez.
        title: "Sistema Integrado (SIG) · Transversal",
        modules: [
          { name: "Dashboard SIG", icon: BarChart3, label: "Dashboard SIG (Auditoría)" },
          { name: "Análisis de Contexto DOFA", icon: ClipboardCheck, label: "Análisis de Contexto (DOFA)" },
          { name: "Matriz Integrada SIG", icon: ClipboardCheck, label: "Matriz Integrada (ISO 9001·14001·45001)" },
          { name: "Repositorio por Norma SIG", icon: FolderArchive, label: "Repositorio Documental por Norma" },
          { name: "Repositorio Universal", icon: FolderArchive, label: "Repositorio Universal de Documentos" },
          { name: "Objetivos y Metas SIG", icon: ClipboardList, label: "Objetivos y Metas (6.2)" },
          { name: "No Conformidades SIG", icon: ClipboardList, label: "No Conformidades (10.2)" },
          { name: "Indicadores SIG", icon: Gauge, label: "BSC · Cuadro de Mando Integral" },
          { name: "Mapa de Interacción del Proceso", icon: ClipboardCheck, label: "Mapa de Interacción del Proceso" },
          { name: "Satisfacción y PQRSF", icon: ClipboardList, label: "Satisfacción y PQRSF (9.1.2)" },
        ],
      },
      {
        title: "ISO 9001:2015 · Calidad",
        modules: [
          { name: "Centro de Evidencia ISO 9001", icon: BadgeCheck, label: "Centro de Evidencia" },
          { name: "Repositorio ISO 9001", icon: FolderArchive, label: "Repositorio Documental" },
        ],
      },
      {
        title: "ISO 14001:2015 · Ambiental",
        modules: [
          { name: "Aspectos e Impactos ISO 14001", icon: Gauge, label: "Aspectos e Impactos Ambientales" },
          { name: "Matriz Legal Ambiental", icon: ClipboardCheck, label: "Matriz Legal Ambiental" },
        ],
      },
    ],
  },
  {
    // SST es su PROPIO módulo (grupo), área calificable por sí misma y
    // conectada al BSC por área. Los submódulos CONSERVAN su `name` y permiso
    // (sst_auditoria, sst_autoevaluacion, sst_epp, sst_incidentes, sst_medevac…),
    // así que los accesos ya otorgados no cambian.
    key: "sst",
    title: "Seguridad y Salud en el Trabajo (SST)",
    icon: ShieldCheck,
    subgroups: [
      {
        title: "Autoevaluación y Mejora (Dec. 0312)",
        modules: [
          { name: "Auditoría 0312", icon: ShieldCheck, label: "Auditoría 0312" },
          { name: "Matriz de Estándares", icon: ClipboardCheck, label: "Matriz 60 Estándares" },
          { name: "Repositorio de Soportes", icon: FolderArchive, label: "Repositorio de Soportes (Matriz)" },
          { name: "Plan de Mejoramiento", icon: ClipboardList, label: "Plan de Mejoramiento" },
          { name: "Indicadores SST", icon: BarChart3, label: "Indicadores SG-SST" },
        ],
      },
      {
        title: "Peligros, Riesgos y Operación Segura",
        modules: [
          { name: "IPEVR", icon: Gauge, label: "IPEVR (GTC 45)" },
          { name: "Registro Preoperacional", icon: ClipboardCheck },
          { name: "Equipos y Mantenimiento", icon: Settings, label: "Equipos y Mantenimiento" },
          { name: "Entrega de EPP", icon: ShieldCheck, label: "Entrega de EPP" },
          { name: "Gestión de Dotación EPP", icon: Package, label: "Dotación de EPP" },
        ],
      },
      {
        title: "Accidentalidad y Salud en el Trabajo",
        modules: [
          { name: "Investigación AT", icon: Activity, label: "Investigación de AT (SST-FOR-21)" },
          { name: "Alertas de AT", icon: AlertTriangle, label: "Alertas de AT (Ausentismo)" },
          { name: "Investigaciones Realizadas", icon: FolderArchive, label: "Repositorio de Investigaciones" },
          { name: "Examenes Médicos", icon: Stethoscope },
          { name: "MEDEVAC", icon: Stethoscope, label: "MEDEVAC (Plan de Emergencias Médicas)" },
          { name: "Perfil Sociodemográfico", icon: Users, label: "Perfil Sociodemográfico (SST-FOR-32)" },
        ],
      },
      {
        title: "Comunicación, Cambio y Cultura",
        modules: [
          { name: "Comunicación SST", icon: NotebookPen, label: "Comunicación / Autorreporte / PQRSF" },
          { name: "Gestión del Cambio", icon: ArrowRightLeft, label: "Gestión del Cambio" },
          { name: "Actividades y Comités", icon: GraduationCap, label: "Actividades y Comités" },
        ],
      },
    ],
  },
  {
    key: "configuracion",
    title: "Configuración",
    icon: Settings,
    subgroups: [
      {
        title: "Gestión de Clientes",
        modules: [
          { name: "Clientes", icon: Users },
          { name: "Sucursales", icon: Store },
        ],
      },
      {
        title: "General",
        modules: [
          { name: "Condiciones Pago", icon: CreditCard },
          { name: "Vendedores", icon: UserCheck },
          { name: "Gestión de Usuarios", icon: Users },
          { name: "Accesos de Usuario", icon: Lock },
        ],
      },
    ],
  },
]
