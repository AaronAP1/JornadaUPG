<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listarInscripciones, listarSalas, type InscripcionAdmin, type Sala } from '../../services/admin'
import { getConfiguracion, type Configuracion } from '../../services/supabase'

const inscripciones = ref<InscripcionAdmin[]>([])
const salas = ref<Sala[]>([])
const config = ref<Configuracion | null>(null)
const isLoading = ref(true)
const errorMessage = ref('')

const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

const asistentesHoy = computed(
  () => inscripciones.value.filter((i) => i.asistencias.some((a) => a.fecha === hoy)).length
)
const ponentes = computed(() => inscripciones.value.filter((i) => i.participacion === 'Ponente').length)
const salasActivas = computed(() => salas.value.filter((s) => s.activa).length)

const porPrograma = computed(() => {
  const conteo = new Map<string, number>()
  for (const i of inscripciones.value) conteo.set(i.programa, (conteo.get(i.programa) ?? 0) + 1)
  return [...conteo.entries()].sort((a, b) => b[1] - a[1])
})

onMounted(async () => {
  try {
    const [i, s, c] = await Promise.all([listarInscripciones(), listarSalas(), getConfiguracion()])
    inscripciones.value = i
    salas.value = s
    config.value = c
  } catch (error: any) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div v-if="errorMessage" class="warning-box mb-2"><i class="fas fa-exclamation-circle"></i> {{ errorMessage }}</div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon navy"><i class="fas fa-users"></i></div>
      <div>
        <div class="stat-val">{{ isLoading ? '…' : inscripciones.length }}</div>
        <div class="stat-label">Inscritos</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon success"><i class="fas fa-user-check"></i></div>
      <div>
        <div class="stat-val">{{ isLoading ? '…' : asistentesHoy }}</div>
        <div class="stat-label">Asistentes hoy</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon gold"><i class="fas fa-microphone-alt"></i></div>
      <div>
        <div class="stat-val">{{ isLoading ? '…' : ponentes }}</div>
        <div class="stat-label">Ponentes</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon info"><i class="fas fa-video"></i></div>
      <div>
        <div class="stat-val">{{ isLoading ? '…' : `${salasActivas}/${salas.length}` }}</div>
        <div class="stat-label">Salas activas</div>
      </div>
    </div>
  </div>

  <div class="admin-card">
    <h3><i class="fas fa-toggle-on"></i> Estado del evento</h3>
    <div v-if="config" class="flex-row">
      <span :class="['badge', config.inscripciones_abiertas ? 'badge-success' : 'badge-danger']">
        <i :class="config.inscripciones_abiertas ? 'fas fa-lock-open' : 'fas fa-lock'"></i>
        Inscripciones {{ config.inscripciones_abiertas ? 'abiertas' : 'cerradas' }}
      </span>
      <span :class="['badge', config.ingreso_habilitado ? 'badge-success' : 'badge-danger']">
        <i :class="config.ingreso_habilitado ? 'fas fa-door-open' : 'fas fa-door-closed'"></i>
        Ingreso al evento {{ config.ingreso_habilitado ? 'habilitado' : 'deshabilitado' }}
      </span>
      <router-link to="/admin/configuracion" class="btn btn-sm btn-outline" style="color: var(--teal);">Cambiar</router-link>
    </div>
  </div>

  <div class="table-card">
    <div class="table-card-header">
      <h3>Inscritos por programa</h3>
      <router-link to="/admin/inscripciones" class="btn btn-sm btn-outline" style="color: var(--teal);">Ver inscripciones</router-link>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Programa</th><th style="text-align:right;">Inscritos</th></tr>
        </thead>
        <tbody>
          <tr v-for="[programa, total] in porPrograma" :key="programa">
            <td>{{ programa }}</td>
            <td style="text-align:right;font-weight:700;">{{ total }}</td>
          </tr>
          <tr v-if="!isLoading && !porPrograma.length">
            <td colspan="2" class="text-center text-muted">Aún no hay inscripciones</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
