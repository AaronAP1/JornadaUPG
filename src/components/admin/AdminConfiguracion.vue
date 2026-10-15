<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { actualizarConfiguracion } from '../../services/admin'
import { getConfiguracion, type Configuracion } from '../../services/supabase'

const config = ref<Configuracion | null>(null)
const bannerUrl = ref('')
const errorMessage = ref('')
const aviso = ref('')
const isSaving = ref(false)

const mostrarAviso = (texto: string) => {
  aviso.value = texto
  setTimeout(() => (aviso.value = ''), 2500)
}

const toggle = async (campo: 'inscripciones_abiertas' | 'ingreso_habilitado') => {
  if (!config.value) return
  const valor = !config.value[campo]
  config.value[campo] = valor
  errorMessage.value = ''
  try {
    await actualizarConfiguracion({ [campo]: valor })
    mostrarAviso('Configuración guardada')
  } catch (error: any) {
    config.value[campo] = !valor
    errorMessage.value = error.message
  }
}

const guardarBanner = async () => {
  const url = bannerUrl.value.trim()
  if (url && !/^https?:\/\//.test(url)) {
    errorMessage.value = 'La URL del banner debe empezar con https://'
    return
  }
  isSaving.value = true
  errorMessage.value = ''
  try {
    await actualizarConfiguracion({ banner_url: url || null })
    if (config.value) config.value.banner_url = url || null
    mostrarAviso('Banner actualizado')
  } catch (error: any) {
    errorMessage.value = error.message
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  config.value = await getConfiguracion()
  if (!config.value) errorMessage.value = 'No se pudo cargar la configuración. ¿Ejecutaste la migración 002?'
  bannerUrl.value = config.value?.banner_url ?? ''
})
</script>

<template>
  <div v-if="errorMessage" class="warning-box mb-2"><i class="fas fa-exclamation-circle"></i> {{ errorMessage }}</div>
  <div v-if="aviso" class="success-box mb-2"><i class="fas fa-check-circle"></i> {{ aviso }}</div>

  <template v-if="config">
    <div class="admin-card">
      <h3><i class="fas fa-toggle-on"></i> Habilitaciones</h3>
      <div class="zoom-control-grid">
        <div :class="['zoom-toggle-card', { enabled: config.inscripciones_abiertas }]">
          <div class="flex-between">
            <h4>Inscripciones</h4>
            <label class="toggle">
              <input type="checkbox" :checked="config.inscripciones_abiertas" @change="toggle('inscripciones_abiertas')">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p class="text-small text-muted">
            {{ config.inscripciones_abiertas
              ? 'Abiertas: el formulario de la página principal acepta nuevas inscripciones.'
              : 'Cerradas: el formulario muestra “Inscripciones cerradas” y la base rechaza nuevos registros.' }}
          </p>
        </div>

        <div :class="['zoom-toggle-card', { enabled: config.ingreso_habilitado }]">
          <div class="flex-between">
            <h4>Ingreso al evento</h4>
            <label class="toggle">
              <input type="checkbox" :checked="config.ingreso_habilitado" @change="toggle('ingreso_habilitado')">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p class="text-small text-muted">
            {{ config.ingreso_habilitado
              ? 'Habilitado: los inscritos pueden entrar, ver las salas y se registra su asistencia.'
              : 'Deshabilitado: nadie puede entrar al evento; las sesiones abiertas se cierran al recargar.' }}
          </p>
        </div>
      </div>
    </div>

    <div class="admin-card">
      <h3><i class="fas fa-image"></i> Banner de la página principal</h3>
      <form class="flex-row" @submit.prevent="guardarBanner">
        <input v-model="bannerUrl" type="url" class="form-control" style="flex:1;min-width:220px;" placeholder="https://... (vacío = imagen por defecto)">
        <button type="submit" class="btn btn-navy" :disabled="isSaving">
          <i class="fas fa-save"></i> {{ isSaving ? 'Guardando...' : 'Guardar' }}
        </button>
      </form>
      <img v-if="config.banner_url" :src="config.banner_url" alt="Vista previa del banner" class="banner-preview">
    </div>
  </template>
</template>

<style scoped>
.banner-preview {
  margin-top: 1rem;
  max-width: 100%;
  max-height: 240px;
  border-radius: 12px;
  object-fit: cover;
}
</style>
