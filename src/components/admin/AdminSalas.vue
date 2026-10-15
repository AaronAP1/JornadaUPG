<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listarSalas, guardarSala, eliminarSala, type Sala } from '../../services/admin'

const salas = ref<Sala[]>([])
const isLoading = ref(true)
const errorMessage = ref('')
const aviso = ref('')

const mostrarAviso = (texto: string) => {
  aviso.value = texto
  setTimeout(() => (aviso.value = ''), 2500)
}

const cargar = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    salas.value = await listarSalas()
  } catch (error: any) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

const toggleActiva = async (sala: Sala) => {
  const anterior = sala.activa
  sala.activa = !anterior
  try {
    await guardarSala({ ...sala })
    mostrarAviso(`${sala.nombre}: ${sala.activa ? 'habilitada' : 'bloqueada'}`)
  } catch (error: any) {
    sala.activa = anterior
    errorMessage.value = error.message
  }
}

const setActivaTodas = async (activa: boolean) => {
  if (!confirm(activa ? '¿Habilitar todas las salas?' : '¿Bloquear todas las salas?')) return
  try {
    await Promise.all(salas.value.filter((s) => s.activa !== activa).map((s) => guardarSala({ ...s, activa })))
    mostrarAviso(activa ? 'Todas las salas habilitadas' : 'Todas las salas bloqueadas')
  } catch (error: any) {
    errorMessage.value = error.message
  }
  await cargar()
}

// ============ MODAL ============
const vacia = (): Omit<Sala, 'id'> & { id?: string } => ({
  nombre: '', descripcion: '', link: '', orden: salas.value.length, principal: false, activa: true
})
const showModal = ref(false)
const form = ref(vacia())
const formError = ref('')
const isSaving = ref(false)

const abrirNueva = () => {
  form.value = vacia()
  formError.value = ''
  showModal.value = true
}

const abrirEdicion = (sala: Sala) => {
  form.value = { ...sala }
  formError.value = ''
  showModal.value = true
}

const guardar = async () => {
  const datos = { ...form.value, nombre: form.value.nombre.trim(), link: form.value.link.trim() }
  if (!datos.nombre || !datos.link) {
    formError.value = 'El nombre y el link son obligatorios'
    return
  }
  if (!/^https?:\/\//.test(datos.link)) {
    formError.value = 'El link debe empezar con https://'
    return
  }

  isSaving.value = true
  formError.value = ''
  try {
    // Solo puede haber una sala principal
    if (datos.principal) {
      await Promise.all(
        salas.value.filter((s) => s.principal && s.id !== datos.id).map((s) => guardarSala({ ...s, principal: false }))
      )
    }
    await guardarSala(datos)
    showModal.value = false
    mostrarAviso(datos.id ? 'Sala actualizada' : 'Sala creada')
    await cargar()
  } catch (error: any) {
    formError.value = error.message
  } finally {
    isSaving.value = false
  }
}

const eliminar = async (sala: Sala) => {
  if (!confirm(`¿Eliminar "${sala.nombre}"?`)) return
  try {
    await eliminarSala(sala.id)
    salas.value = salas.value.filter((s) => s.id !== sala.id)
    mostrarAviso('Sala eliminada')
  } catch (error: any) {
    errorMessage.value = error.message
  }
}

onMounted(cargar)
</script>

<template>
  <div v-if="errorMessage" class="warning-box mb-2"><i class="fas fa-exclamation-circle"></i> {{ errorMessage }}</div>
  <div v-if="aviso" class="success-box mb-2"><i class="fas fa-check-circle"></i> {{ aviso }}</div>

  <div class="admin-card">
    <div class="flex-between mb-2">
      <h3 style="margin:0;"><i class="fas fa-video"></i> {{ salas.length }} salas</h3>
      <div class="flex-row">
        <button class="btn btn-sm btn-outline" style="color: var(--success);" @click="setActivaTodas(true)">Habilitar todas</button>
        <button class="btn btn-sm btn-outline" style="color: var(--danger);" @click="setActivaTodas(false)">Bloquear todas</button>
        <button class="btn btn-sm btn-navy" @click="abrirNueva"><i class="fas fa-plus"></i> Nueva sala</button>
      </div>
    </div>

    <p class="text-small text-muted mb-2">
      Los participantes ven las salas bloqueadas con un candado y sin link. Los cambios se aplican cuando el participante recarga la página.
    </p>

    <div v-if="isLoading" class="text-muted"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
    <div v-else-if="!salas.length" class="info-box">No hay salas. Crea la primera con “Nueva sala”.</div>

    <div class="zoom-control-grid">
      <div v-for="sala in salas" :key="sala.id" :class="['zoom-toggle-card', { enabled: sala.activa }]">
        <div class="flex-between">
          <h4>
            {{ sala.nombre }}
            <span v-if="sala.principal" class="badge badge-gold" style="margin-left:4px;">Principal</span>
          </h4>
          <label class="toggle" :title="sala.activa ? 'Bloquear' : 'Habilitar'">
            <input type="checkbox" :checked="sala.activa" @change="toggleActiva(sala)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="sala.descripcion" class="text-small text-muted">{{ sala.descripcion }}</div>
        <a :href="sala.link" target="_blank" rel="noopener" class="text-small sala-link">{{ sala.link }}</a>
        <div class="flex-between">
          <span :class="['badge', sala.activa ? 'badge-success' : 'badge-danger']">{{ sala.activa ? 'Habilitada' : 'Bloqueada' }}</span>
          <div>
            <button class="icon-btn" title="Editar" @click="abrirEdicion(sala)"><i class="fas fa-pen"></i></button>
            <button class="icon-btn danger" title="Eliminar" @click="eliminar(sala)"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal crear / editar -->
  <div :class="['modal-overlay', { show: showModal }]" @click.self="showModal = false">
    <div class="modal-box" style="max-width:520px;">
      <div class="modal-header">
        <h3><i class="fas fa-video"></i> {{ form.id ? 'Editar sala' : 'Nueva sala' }}</h3>
        <button class="modal-close" @click="showModal = false"><i class="fas fa-times"></i></button>
      </div>
      <form class="modal-body" @submit.prevent="guardar">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input v-model="form.nombre" type="text" class="form-control" placeholder="Sala 1">
        </div>
        <div class="form-group">
          <label class="form-label">Descripción / tema</label>
          <input v-model="form.descripcion" type="text" class="form-control" placeholder="Opcional">
        </div>
        <div class="form-group">
          <label class="form-label">Link de Zoom</label>
          <input v-model="form.link" type="url" class="form-control" placeholder="https://us02web.zoom.us/j/...">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Orden</label>
            <input v-model.number="form.orden" type="number" min="0" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">Opciones</label>
            <label class="toggle-switch text-small">
              <span class="toggle"><input v-model="form.activa" type="checkbox"><span class="toggle-slider"></span></span>
              Habilitada
            </label>
            <label class="toggle-switch text-small" style="margin-top:8px;">
              <span class="toggle"><input v-model="form.principal" type="checkbox"><span class="toggle-slider"></span></span>
              Sala principal
            </label>
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
.sala-link {
  color: var(--teal);
  word-break: break-all;
}

.icon-btn {
  background: var(--bg);
  border: none;
  width: 32px;
  height: 32px;
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
</style>
