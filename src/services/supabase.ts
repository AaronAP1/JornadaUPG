import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null

export const PROGRAMAS = [
  'Asistente externo',
  'Doctorado en Enfermería',
  'Maestría en Enfermería – Adm. y Gestión',
  'Maestría en Nutrición Humana',
  'SEE Cuidados Quirúrgicos',
  'SEE Gineco Obstetricia',
  'SEE Traumatología y ortopedia',
  'SEE Centro Quirúrgico',
  'SEE Oncología',
  'SEE Cardiología',
  'SEE Geriatría',
  'SEE Inmunizaciones',
  'SEE UCI Neonatal',
  'SEE UCI',
  'SEE UCI Pediátrico',
  'SEE Emergencias',
  'SEE Central Esterilización',
  'SEE Cuidado Infantil',
  'SEE Neurología',
  'SEE Salud Ocupacional',
  'SEE Administración',
  'SEE Diabetes',
  'SEE Cuidados Quirúrgicos - Recuperación Posanestésica'
]
export const CICLOS = ['I', 'II', 'III']
export const PARTICIPACIONES = ['Asistente', 'Ponente']

export interface NuevaInscripcion {
  tipo_documento: 'dni' | 'carnet'
  documento: string
  correo: string
  nombres: string
  apellidos: string
  programa: string
  ciclo: string
  participacion: string
}

export interface Inscripcion extends NuevaInscripcion {
  id: string
  created_at?: string
}

export interface Configuracion {
  inscripciones_abiertas: boolean
  ingreso_habilitado: boolean
  banner_url: string | null
}

const NO_CONFIG = 'Supabase no está configurado (revisa el archivo .env)'

// Valida el documento según su tipo. Devuelve el mensaje de error o null.
export const validarDocumento = (tipo: string, documento: string) => {
  if (tipo === 'dni' && !/^\d{8}$/.test(documento)) return 'El DNI debe tener 8 dígitos'
  if (tipo === 'carnet' && !/^[A-Za-z0-9]{6,12}$/.test(documento)) {
    return 'El carnet de extranjería debe tener entre 6 y 12 caracteres alfanuméricos'
  }
  return null
}

// Traduce errores de Postgres a mensajes legibles.
export const mensajeError = (error: { code?: string; message: string }, fallback: string) => {
  // 23505 = unique_violation (documento o correo ya registrado)
  if (error.code === '23505') {
    const campo = error.message.includes('correo') ? 'correo' : 'documento'
    return `Ya existe una inscripción con este ${campo}`
  }
  // 42501 = RLS rechazó la operación (p. ej. inscripciones cerradas)
  if (error.code === '42501') return 'Las inscripciones están cerradas'
  console.error(fallback, error)
  return fallback
}

// Inserta una inscripción en la tabla "inscripciones".
export const registrarInscripcion = async (data: NuevaInscripcion) => {
  if (!supabase) return { success: false, message: NO_CONFIG }

  const { error } = await supabase.from('inscripciones').insert(data)
  if (error) {
    return { success: false, message: mensajeError(error, 'No se pudo registrar la inscripción. Intenta nuevamente.') }
  }
  return { success: true, message: '¡Inscripción registrada correctamente!' }
}

export const getConfiguracion = async (): Promise<Configuracion | null> => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('configuracion')
    .select('inscripciones_abiertas, ingreso_habilitado, banner_url')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    console.error('Error leyendo configuración:', error)
    return null
  }
  return data
}
