<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  listarInscripciones,
  crearInscripcion,
  actualizarInscripcion,
  eliminarInscripcion,
  marcarAsistencia,
  type InscripcionAdmin
} from '../../services/admin'
import { validarDocumento, PROGRAMAS, CICLOS, PARTICIPACIONES, type NuevaInscripcion } from '../../services/supabase'

const inscripciones = ref<InscripcionAdmin[]>([])
const isLoading = ref(true)
const errorMessage = ref('')
const aviso = ref('')

const busqueda = ref('')
const filtroPrograma = ref('')
const filtroParticipacion = ref('')
const filtroAsistencia = ref<'' | 'si' | 'no'>('')

const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
const asistioHoy = (i: InscripcionAdmin) => i.asistencias.some((a) => a.fecha === hoy)

const filtradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return inscripciones.value.filter((i) => {
    if (filtroPrograma.value && i.programa !== filtroPrograma.value) return false
    if (filtroParticipacion.value && i.participacion !== filtroParticipacion.value) return false
    if (filtroAsistencia.value === 'si' && !asistioHoy(i)) return false
    if (filtroAsistencia.value === 'no' && asistioHoy(i)) return false
    if (!q) return true
    return [i.documento, i.correo, i.nombres, i.apellidos].some((v) => v.toLowerCase().includes(q))
  })
})

const mostrarAviso = (texto: string) => {
  aviso.value = texto
  setTimeout(() => (aviso.value = ''), 2500)
}

const cargar = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    inscripciones.value = await listarInscripciones()
  } catch (error: any) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

// ============ MODAL CREAR / EDITAR ============
const vacia = (): NuevaInscripcion => ({
  tipo_documento: 'dni', documento: '', correo: '', nombres: '', apellidos: '',
  programa: '', ciclo: '', participacion: ''
})
const showModal = ref(false)
const editandoId = ref<string | null>(null)
const form = ref<NuevaInscripcion>(vacia())
const formError = ref('')
const isSaving = ref(false)

const abrirNueva = () => {
  editandoId.value = null
  form.value = vacia()
  formError.value = ''
  showModal.value = true
}

const abrirEdicion = (i: InscripcionAdmin) => {
  editandoId.value = i.id
  form.value = {
    tipo_documento: i.tipo_documento, documento: i.documento, correo: i.correo,
    nombres: i.nombres, apellidos: i.apellidos, programa: i.programa,
    ciclo: i.ciclo, participacion: i.participacion
  }
  formError.value = ''
  showModal.value = true
}

const guardar = async () => {
  const datos: NuevaInscripcion = {
    ...form.value,
    documento: form.value.documento.trim(),
    correo: form.value.correo.trim().toLowerCase(),
    nombres: form.value.nombres.trim(),
    apellidos: form.value.apellidos.trim()
  }
  if (!datos.correo || !datos.nombres || !datos.apellidos || !datos.programa || !datos.ciclo || !datos.participacion) {
    formError.value = 'Completa todos los campos'
    return
  }
  const errorDocumento = validarDocumento(datos.tipo_documento, datos.documento)
  if (errorDocumento) {
    formError.value = errorDocumento
    return
  }

  isSaving.value = true
  formError.value = ''
  try {
    if (editandoId.value) await actualizarInscripcion(editandoId.value, datos)
    else await crearInscripcion(datos)
    showModal.value = false
    mostrarAviso(editandoId.value ? 'Inscripción actualizada' : 'Inscripción creada')
    await cargar()
  } catch (error: any) {
    formError.value = error.message
  } finally {
    isSaving.value = false
  }
}

// ============ ACCIONES ============
const eliminar = async (i: InscripcionAdmin) => {
  if (!confirm(`¿Eliminar la inscripción de ${i.nombres} ${i.apellidos}? También se borrarán sus asistencias.`)) return
  try {
    await eliminarInscripcion(i.id)
    inscripciones.value = inscripciones.value.filter((x) => x.id !== i.id)
    mostrarAviso('Inscripción eliminada')
  } catch (error: any) {
    errorMessage.value = error.message
  }
}

const registrarAsistencia = async (i: InscripcionAdmin) => {
  try {
    await marcarAsistencia(i.id, hoy)
    i.asistencias.push({ fecha: hoy })
    mostrarAviso(`Asistencia registrada: ${i.nombres}`)
  } catch (error: any) {
    errorMessage.value = error.message
  }
}

const exportarCsv = () => {
  const columnas = ['Tipo doc.', 'Documento', 'Correo', 'Nombres', 'Apellidos', 'Programa', 'Ciclo', 'Participación', 'Inscrito el', 'Días asistidos', 'Fechas de asistencia']
  const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const filas = filtradas.value.map((i) => [
    i.tipo_documento.toUpperCase(), i.documento, i.correo, i.nombres, i.apellidos,
    i.programa, i.ciclo, i.participacion, new Date(i.created_at).toLocaleString(),
    i.asistencias.length, i.asistencias.map((a) => a.fecha).sort().join(' ')
  ])
  const csv = [columnas, ...filas].map((fila) => fila.map(escapar).join(',')).join('\r\n')
  // BOM para que Excel respete las tildes
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inscripciones-${hoy}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(cargar)
</script>

<template>
  <div v-if="errorMessage" class="warning-box mb-2"><i class="fas fa-exclamation-circle"></i> {{ errorMessage }}</div>
  <div v-if="aviso" class="success-box mb-2"><i class="fas fa-check-circle"></i> {{ aviso }}</div>

  <div class="table-card">
    <div class="table-card-header">
      <h3>{{ filtradas.length }} de {{ inscripciones.length }} inscripciones</h3>
      <div class="flex-row">
        <button class="btn btn-sm btn-outline" style="color: var(--teal);" @click="cargar" :disabled="isLoading">
          <i :class="['fas fa-sync-alt', { 'fa-spin': isLoading }]"></i> Actualizar
        </button>
        <button class="btn btn-sm btn-outline" style="color: var(--teal);" @click="exportarCsv" :disabled="!filtradas.length">
          <i class="fas fa-file-csv"></i> Exportar CSV
        </button>
        <button class="btn btn-sm btn-navy" @click="abrirNueva"><i class="fas fa-plus"></i> Nueva</button>
      </div>
    </div>

    <div class="filtros">
      <div class="search-bar">
        <i class="fas fa-search"></i>
        <input v-model="busqueda" type="search" placeholder="Buscar por nombre, documento o correo">
      </div>
      <select v-model="filtroPrograma" class="form-select">
        <option value="">Todos los programas</option>
        <option v-for="p in PROGRAMAS" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="filtroParticipacion" class="form-select">
        <option value="">Toda participación</option>
        <option v-for="p in PARTICIPACIONES" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="filtroAsistencia" class="form-select">
        <option value="">Asistencia hoy: todos</option>
        <option value="si">Asistió hoy</option>
        <option value="no">No asistió hoy</option>
      </select>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Participante</th>
            <th>Documento</th>
            <th>Programa</th>
            <th>Participación</th>
            <th>Asistencia</th>
            <th style="text-align:right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in filtradas" :key="i.id">
            <td>
              <div style="font-weight:600;">{{ i.nombres }} {{ i.apellidos }}</div>
              <div class="text-small text-muted">{{ i.correo }}</div>
            </td>
            <td>
              <div>{{ i.documento }}</div>
              <div class="text-small text-muted">{{ i.tipo_documento === 'dni' ? 'DNI' : 'Carnet' }}</div>
            </td>
            <td>
              <div>{{ i.programa }}</div>
              <div class="text-small text-muted">Ciclo {{ i.ciclo }}</div>
            </td>
            <td>
              <span :class="['badge', i.participacion === 'Ponente' ? 'badge-gold' : 'badge-info']">{{ i.participacion }}</span>
            </td>
            <td>
              <span v-if="asistioHoy(i)" class="badge badge-success"><i class="fas fa-check"></i> Hoy</span>
              <button v-else class="btn btn-sm btn-outline" style="color: var(--success);" @click="registrarAsistencia(i)">
                <i class="fas fa-user-check"></i> Marcar
              </button>
              <div class="text-small text-muted" style="margin-top:4px;">{{ i.asistencias.length }} día(s)</div>
            </td>
            <td style="text-align:right;white-space:nowrap;">
              <button class="icon-btn" title="Editar" @click="abrirEdicion(i)"><i class="fas fa-pen"></i></button>
              <button class="icon-btn danger" title="Eliminar" @click="eliminar(i)"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
          <tr v-if="!isLoading && !filtradas.length">
            <td colspan="6" class="text-center text-muted">No hay inscripciones que coincidan</td>
          </tr>
          <tr v-if="isLoading && !inscripciones.length">
            <td colspan="6" class="text-center text-muted"><i class="fas fa-spinner fa-spin"></i> Cargando...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal crear / editar -->
  <div :class="['modal-overlay', { show: showModal }]" @click.self="showModal = false">
    <div class="modal-box" style="max-width:560px;">
      <div class="modal-header">
        <h3><i class="fas fa-user-edit"></i> {{ editandoId ? 'Editar inscripción' : 'Nueva inscripción' }}</h3>
        <button class="modal-close" @click="showModal = false"><i class="fas fa-times"></i></button>
      </div>
      <form class="modal-body" @submit.prevent="guardar">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo de documento</label>
            <select v-model="form.tipo_documento" class="form-select">
              <option value="dni">DNI</option>
              <option value="carnet">Carnet de Extranjería</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Documento</label>
            <input v-model="form.documento" type="text" class="form-control" maxlength="12">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Correo</label>
          <input v-model="form.correo" type="email" class="form-control">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombres</label>
            <input v-model="form.nombres" type="text" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">Apellidos</label>
            <input v-model="form.apellidos" type="text" class="form-control">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Programa</label>
          <select v-model="form.programa" class="form-select">
            <option value="" disabled>Selecciona...</option>
            <option v-for="p in PROGRAMAS" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Ciclo</label>
            <select v-model="form.ciclo" class="form-select">
              <option value="" disabled>Selecciona...</option>
              <option v-for="c in CICLOS" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Participación</label>
            <select v-model="form.participacion" class="form-select">
              <option value="" disabled>Selecciona...</option>
              <option v-for="p in PARTICIPACIONES" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>
        <div v-if="formError" class="warning-box"><i class="fas fa-exclamation-circle"></i> {{ formError }}</div>
        <button type="submit" hidden></button>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" style="color:var(--muted);background:var(--bg);" @click="showModal = false">Cancelar</button>
        <button class="btn btn-gold" @click="guardar" :disabled="isSaving">
          <i class="fas fa-save"></i> {{ isSaving ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filtros {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr;
  gap: 10px;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--bg);
}

.filtros .search-bar input {
  width: 100%;
}

.filtros .form-select {
  padding: 8px 12px;
  font-size: 0.88rem;
}

.icon-btn {
  background: var(--bg);
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--teal);
  cursor: pointer;
  margin-left: 6px;
}

.icon-btn:hover {
  background: var(--bg2);
}

.icon-btn.danger {
  color: var(--danger);
}

@media (max-width: 900px) {
  .filtros {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
}
</style>
