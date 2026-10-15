import { supabase, mensajeError, type Configuracion, type Inscripcion, type NuevaInscripcion } from './supabase'

export interface Sala {
  id: string
  nombre: string
  descripcion: string
  link: string
  orden: number
  principal: boolean
  activa: boolean
}

export interface InscripcionAdmin extends Inscripcion {
  created_at: string
  asistencias: { fecha: string }[]
}

const NO_CONFIG = 'Supabase no está configurado (revisa el archivo .env)'

const client = () => {
  if (!supabase) throw new Error(NO_CONFIG)
  return supabase
}

// ============ AUTENTICACIÓN ============

export const esAdmin = async () => {
  if (!supabase) return false
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { data, error } = await supabase.rpc('is_admin')
  return !error && data === true
}

export const loginAdmin = async (email: string, password: string) => {
  if (!supabase) return { success: false, message: NO_CONFIG }

  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) return { success: false, message: 'Correo o contraseña incorrectos' }

  if (!(await esAdmin())) {
    await supabase.auth.signOut()
    return { success: false, message: 'Esta cuenta no tiene permisos de administrador' }
  }
  return { success: true, message: '' }
}

export const logoutAdmin = async () => {
  await supabase?.auth.signOut()
}

export const getAdminEmail = async () => {
  const { data } = await client().auth.getUser()
  return data.user?.email ?? ''
}

// ============ INSCRIPCIONES ============

export const listarInscripciones = async () => {
  const { data, error } = await client()
    .from('inscripciones')
    .select('*, asistencias(fecha)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(mensajeError(error, 'No se pudieron cargar las inscripciones'))
  return data as InscripcionAdmin[]
}

export const crearInscripcion = async (datos: NuevaInscripcion) => {
  const { error } = await client().from('inscripciones').insert(datos)
  if (error) throw new Error(mensajeError(error, 'No se pudo crear la inscripción'))
}

export const actualizarInscripcion = async (id: string, datos: NuevaInscripcion) => {
  const { error } = await client().from('inscripciones').update(datos).eq('id', id)
  if (error) throw new Error(mensajeError(error, 'No se pudo actualizar la inscripción'))
}

export const eliminarInscripcion = async (id: string) => {
  const { error } = await client().from('inscripciones').delete().eq('id', id)
  if (error) throw new Error(mensajeError(error, 'No se pudo eliminar la inscripción'))
}

export const marcarAsistencia = async (inscripcionId: string, fecha: string) => {
  const { error } = await client()
    .from('asistencias')
    .upsert({ inscripcion_id: inscripcionId, fecha }, { onConflict: 'inscripcion_id,fecha', ignoreDuplicates: true })
  if (error) throw new Error(mensajeError(error, 'No se pudo registrar la asistencia'))
}

// ============ SALAS ============

export const listarSalas = async () => {
  const { data, error } = await client()
    .from('salas')
    .select('id, nombre, descripcion, link, orden, principal, activa')
    .order('principal', { ascending: false })
    .order('orden')
  if (error) throw new Error(mensajeError(error, 'No se pudieron cargar las salas'))
  return data as Sala[]
}

export const guardarSala = async (sala: Omit<Sala, 'id'> & { id?: string }) => {
  const { id, ...datos } = sala
  const query = id
    ? client().from('salas').update(datos).eq('id', id)
    : client().from('salas').insert(datos)
  const { error } = await query
  if (error) throw new Error(mensajeError(error, 'No se pudo guardar la sala'))
}

export const eliminarSala = async (id: string) => {
  const { error } = await client().from('salas').delete().eq('id', id)
  if (error) throw new Error(mensajeError(error, 'No se pudo eliminar la sala'))
}

// ============ CONFIGURACIÓN ============

export const actualizarConfiguracion = async (cambios: Partial<Configuracion>) => {
  const { error } = await client()
    .from('configuracion')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw new Error(mensajeError(error, 'No se pudo guardar la configuración'))
}
