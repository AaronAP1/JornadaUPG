import { supabase, type Inscripcion } from './supabase'

export interface SalaParticipante {
  id: string
  nombre: string
  descripcion: string
  principal: boolean
  activa: boolean
  link: string | null
}

export interface SesionParticipante {
  participante: Inscripcion
  asistencia: { fecha: string; registrado_en: string } | null
  salas: SalaParticipante[]
}

const SESSION_KEY = 'jornada_session'
const NO_CONFIG = 'Supabase no está configurado (revisa el archivo .env)'

export const getSesion = (): SesionParticipante | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    const session = raw ? (JSON.parse(raw) as SesionParticipante) : null
    // Descarta sesiones del formato anterior (localStorage sin Supabase)
    return session?.participante?.correo ? session : null
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export const cerrarSesion = () => localStorage.removeItem(SESSION_KEY)

// Valida correo + documento, registra la asistencia del día y guarda la sesión.
export const loginParticipante = async (correo: string, documento: string) => {
  if (!supabase) return { success: false as const, message: NO_CONFIG }

  const { data, error } = await supabase.rpc('login_participante', {
    p_correo: correo,
    p_documento: documento
  })
  if (error) {
    console.error('Error en login:', error)
    return { success: false as const, message: 'Ocurrió un error al iniciar sesión' }
  }
  if (!data?.success) {
    return { success: false as const, message: (data?.message as string) || 'Correo o documento incorrectos' }
  }

  const session: SesionParticipante = {
    participante: data.participante,
    asistencia: data.asistencia,
    salas: data.salas
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { success: true as const, session }
}

// Vuelve a validar la sesión guardada (salas y habilitación pueden haber cambiado).
export const refrescarSesion = async () => {
  const session = getSesion()
  if (!session) return { success: false as const, message: 'Sesión no encontrada' }
  const result = await loginParticipante(session.participante.correo, session.participante.documento)
  if (!result.success) cerrarSesion()
  return result
}

export const buscarInscripcion = async (correo: string, documento: string) => {
  if (!supabase) return { success: false as const, message: NO_CONFIG }

  const { data, error } = await supabase.rpc('buscar_inscripcion', {
    p_correo: correo,
    p_documento: documento
  })
  if (error) {
    console.error('Error buscando inscripción:', error)
    return { success: false as const, message: 'Error al buscar la inscripción' }
  }
  if (!data) return { success: false as const, message: 'No encontramos una inscripción con ese correo y documento' }
  return { success: true as const, participante: data as Inscripcion }
}

export const actualizarMisDatos = async (datos: Inscripcion) => {
  if (!supabase) return { success: false as const, message: NO_CONFIG }

  const { data, error } = await supabase.rpc('actualizar_mis_datos', {
    p_correo: datos.correo,
    p_documento: datos.documento,
    p_nombres: datos.nombres,
    p_apellidos: datos.apellidos,
    p_programa: datos.programa,
    p_ciclo: datos.ciclo,
    p_participacion: datos.participacion
  })
  if (error || !data?.success) {
    if (error) console.error('Error actualizando datos:', error)
    return { success: false as const, message: (data?.message as string) || 'Error al guardar cambios' }
  }

  // Mantener sincronizada la sesión activa
  const session = getSesion()
  if (session && session.participante.id === data.participante.id) {
    session.participante = data.participante
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
  return { success: true as const, participante: data.participante as Inscripcion }
}
