<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import coloquioImg from '../assets/COLOQUIO ENFERMERIA 2026.png'
import {
  registrarInscripcion,
  getConfiguracion,
  validarDocumento,
  PROGRAMAS,
  CICLOS,
  PARTICIPACIONES,
  type Inscripcion,
  type NuevaInscripcion
} from '../services/supabase'
import { getSesion, cerrarSesion, buscarInscripcion, actualizarMisDatos } from '../services/participante'

const router = useRouter()

const inscripcionesAbiertas = ref(true)
const currentUser = ref(getSesion()?.participante ?? null)

// Formulario principal de inscripción (Supabase)
const emptyInscripcion = (): NuevaInscripcion => ({
  tipo_documento: 'dni',
  documento: '',
  correo: '',
  nombres: '',
  apellidos: '',
  programa: '',
  ciclo: '',
  participacion: ''
})
const inscripcion = ref<NuevaInscripcion>(emptyInscripcion())
const isRegistering = ref(false)
const registroError = ref('')
const registroSuccess = ref('')

const registrar = async () => {
  registroError.value = ''
  registroSuccess.value = ''

  const data: NuevaInscripcion = {
    ...inscripcion.value,
    documento: inscripcion.value.documento.trim(),
    correo: inscripcion.value.correo.trim().toLowerCase(),
    nombres: inscripcion.value.nombres.trim(),
    apellidos: inscripcion.value.apellidos.trim()
  }

  const errorDocumento = validarDocumento(data.tipo_documento, data.documento)
  if (errorDocumento) {
    registroError.value = errorDocumento
    return
  }

  isRegistering.value = true
  try {
    const response = await registrarInscripcion(data)
    if (!response.success) {
      registroError.value = response.message
      return
    }
    registroSuccess.value = response.message
    inscripcion.value = emptyInscripcion()
  } finally {
    isRegistering.value = false
  }
}

const logout = () => {
  cerrarSesion()
  currentUser.value = null
}

// Modal: editar datos (requiere correo + documento)
const showEditModal = ref(false)
const editStep = ref(1)
const editCorreo = ref('')
const editDocumento = ref('')
const editError = ref('')
const userData = ref<Inscripcion | null>(null)
const isSearching = ref(false)
const isSavingChanges = ref(false)
const successMessage = ref('')

const openEditModal = () => {
  showEditModal.value = true
  editStep.value = 1
  editCorreo.value = ''
  editDocumento.value = ''
  editError.value = ''
  successMessage.value = ''
  userData.value = null
}

const closeEditModal = () => {
  showEditModal.value = false
}

const buscarMisDatos = async () => {
  editError.value = ''
  if (!editCorreo.value.trim() || !editDocumento.value.trim()) {
    editError.value = 'Ingresa tu correo y tu número de documento'
    return
  }

  isSearching.value = true
  try {
    const response = await buscarInscripcion(editCorreo.value, editDocumento.value)
    if (!response.success) {
      editError.value = response.message
      return
    }
    userData.value = response.participante
    editStep.value = 2
  } finally {
    isSearching.value = false
  }
}

const guardarCambios = async () => {
  if (!userData.value) return

  isSavingChanges.value = true
  editError.value = ''
  try {
    const response = await actualizarMisDatos(userData.value)
    if (!response.success) {
      editError.value = response.message
      return
    }
    if (currentUser.value?.id === response.participante.id) currentUser.value = response.participante
    successMessage.value = '¡Cambios guardados correctamente!'
    setTimeout(closeEditModal, 1200)
  } finally {
    isSavingChanges.value = false
  }
}

// Cuenta regresiva: 10 de noviembre de 2026, 8:30 a.m. (hora de Lima)
const FECHA_EVENTO = new Date('2026-11-10T08:30:00-05:00').getTime()
const countdown = ref({ dias: '00', horas: '00', minutos: '00', segundos: '00' })
let countdownTimer: ReturnType<typeof setInterval> | undefined

const pad = (n: number) => String(n).padStart(2, '0')
const actualizarCountdown = () => {
  const restante = Math.max(0, FECHA_EVENTO - Date.now())
  const totalSeg = Math.floor(restante / 1000)
  countdown.value = {
    dias: pad(Math.floor(totalSeg / 86400)),
    horas: pad(Math.floor((totalSeg % 86400) / 3600)),
    minutos: pad(Math.floor((totalSeg % 3600) / 60)),
    segundos: pad(totalSeg % 60)
  }
  if (restante === 0 && countdownTimer) clearInterval(countdownTimer)
}

onUnmounted(() => clearInterval(countdownTimer))

onMounted(async () => {
  actualizarCountdown()
  countdownTimer = setInterval(actualizarCountdown, 1000)
  const config = await getConfiguracion()
  inscripcionesAbiertas.value = config?.inscripciones_abiertas ?? true
})
</script>

<template>
  <!-- PAGE: LANDING (REGISTRO) -->
  <div class="page-landing">
    <nav class="navbar">
      <router-link to="/" class="navbar-brand">
        <div class="brand-icon"><i class="fas fa-microscope"></i></div>
        <div class="brand-text">UPeU Posgrado<span>Unidad de Ciencias de la Salud</span></div>
      </router-link>
      <div class="navbar-actions">
        <!-- Si no está logueado -->
        <div v-if="!currentUser" style="display: flex; gap: 10px; align-items: center;">
          <button class="btn btn-gold blink" @click="router.push('/login')"><i class="fas fa-play-circle"></i> Ingresar al evento</button>
          <button class="btn btn-ghost" @click="openEditModal"><i class="fas fa-edit"></i> Editar datos</button>
        </div>

        <!-- Si está logueado -->
        <div v-else style="display: flex; gap: 10px; align-items: center;">
          <span style="color: white; font-weight: 500;">Bienvenido, {{ currentUser.nombres }}</span>
          <button class="btn btn-gold" @click="router.push('/evento')"><i class="fas fa-door-open"></i> Volver al evento</button>
          <button class="btn btn-ghost" @click="logout"><i class="fas fa-sign-out-alt"></i> Salir</button>
        </div>
      </div>
    </nav>

    <section class="hero">
      <span class="hero-badge"><i class="fas fa-calendar-alt"></i> 10 – 11 Noviembre 2026</span>
      <h1>X Coloquio Internacional de Investigación en Enfermería</h1>
      <p>Del Proceso Enfermero a la Publicación Científica: Evidencia, Sistematización y Difusión del Cuidado</p>
      <div class="hero-tags">
        <span class="hero-tag"><i class="fas fa-video"></i> Vía Zoom</span>
        <span class="hero-tag"><i class="fas fa-clock"></i> 8:30 – 12:15 y 14:00 – 18:00 hrs</span>
        <span class="hero-tag"><i class="fas fa-user-pen"></i> Inscripciones: 05 oct. al 09 nov.</span>
        <span class="hero-tag"><i class="fas fa-ticket"></i> Participantes externos: S/ 20.00</span>
      </div>
      <div class="countdown-bar">
        <div class="countdown-unit"><span class="countdown-num">{{ countdown.dias }}</span><span class="countdown-label">Días</span></div>
        <span class="countdown-sep">:</span>
        <div class="countdown-unit"><span class="countdown-num">{{ countdown.horas }}</span><span class="countdown-label">Horas</span></div>
        <span class="countdown-sep">:</span>
        <div class="countdown-unit"><span class="countdown-num">{{ countdown.minutos }}</span><span class="countdown-label">Minutos</span></div>
        <span class="countdown-sep">:</span>
        <div class="countdown-unit"><span class="countdown-num">{{ countdown.segundos }}</span><span class="countdown-label">Segundos</span></div>
      </div>
    </section>

    <div class="reg-container">
      <div class="reg-card">
        <div class="reg-img-side reg-img-side--poster">
          <img :src="coloquioImg" alt="X Coloquio Internacional de Investigación en Enfermería 2026" class="reg-evento-img">
        </div>
        <div class="reg-form-side">
          <div class="form-title"><i class="fas fa-user-plus"></i> Inscripción al evento</div>
          <form @submit.prevent="registrar">
            <fieldset :disabled="!inscripcionesAbiertas" style="border: none;">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label"><i class="far fa-id-card"></i> Tipo de Documento</label>
                  <select v-model="inscripcion.tipo_documento" class="form-select" required>
                    <option value="dni">DNI</option>
                    <option value="carnet">Carnet de Extranjería</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label"><i class="far fa-id-card"></i> {{ inscripcion.tipo_documento === 'dni' ? 'DNI' : 'N° de Carnet' }}</label>
                  <input v-model="inscripcion.documento" type="text" class="form-control" :maxlength="inscripcion.tipo_documento === 'dni' ? 8 : 12" required>
                </div>
                <div class="form-group">
                  <label class="form-label"><i class="fas fa-envelope"></i> Correo</label>
                  <input v-model="inscripcion.correo" type="email" class="form-control" autocomplete="email" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label"><i class="fas fa-user"></i> Nombres</label>
                  <input v-model="inscripcion.nombres" type="text" class="form-control" autocomplete="given-name" required>
                </div>
                <div class="form-group">
                  <label class="form-label"><i class="fas fa-user"></i> Apellidos</label>
                  <input v-model="inscripcion.apellidos" type="text" class="form-control" autocomplete="family-name" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label"><i class="fas fa-graduation-cap"></i> Programa Académico</label>
                <select v-model="inscripcion.programa" class="form-select" required>
                  <option value="" disabled>Selecciona un programa...</option>
                  <option v-for="prog in PROGRAMAS" :key="prog" :value="prog">{{ prog }}</option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label"><i class="fas fa-layer-group"></i> Ciclo / Condición</label>
                  <select v-model="inscripcion.ciclo" class="form-select" required>
                    <option value="" disabled>Selecciona ciclo...</option>
                    <option v-for="ciclo in CICLOS" :key="ciclo" :value="ciclo">{{ ciclo }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label"><i class="fas fa-microphone-alt"></i> Tipo de participación</label>
                  <select v-model="inscripcion.participacion" class="form-select" required>
                    <option value="" disabled>Selecciona tipo...</option>
                    <option v-for="part in PARTICIPACIONES" :key="part" :value="part">{{ part }}</option>
                  </select>
                </div>
              </div>
            </fieldset>
            <div v-if="registroError" class="warning-box mb-2"><i class="fas fa-exclamation-circle"></i> {{ registroError }}</div>
            <div v-if="registroSuccess" class="success-box mb-2"><i class="fas fa-check-circle"></i> {{ registroSuccess }}</div>
            <button v-if="inscripcionesAbiertas" type="submit" class="btn btn-navy btn-full" :disabled="isRegistering">
              <i :class="isRegistering ? 'fas fa-spinner fa-spin' : 'fas fa-user-check'"></i>
              {{ isRegistering ? 'REGISTRANDO...' : 'INSCRIBIRME' }}
            </button>
            <button v-else type="button" class="btn btn-navy btn-full" disabled>
              <i class="fas fa-lock"></i> INSCRIPCIONES CERRADAS
            </button>
            <p class="text-center text-small text-muted mt-1"><i class="fas fa-lock"></i> Tus datos están protegidos</p>
          </form>
        </div>
      </div>
    </div>

    <footer>
      <p>Universidad Peruana Unión · Escuela de Posgrado · Unidad de Ciencias de la Salud</p>
      <p class="mt-1">
        © 2026 · X Coloquio Internacional de Investigación en Enfermería · <a href="#">Política de privacidad</a>
        · <router-link to="/admin">Administración</router-link>
      </p>
    </footer>
  </div>

  <!-- Modal: Editar Datos -->
  <div :class="['modal-overlay', { show: showEditModal }]" @click.self="closeEditModal">
    <div class="modal-box" style="max-width:500px;">
      <div class="modal-header">
        <h3><i class="fas fa-user-edit"></i> Editar mis datos</h3>
        <button class="modal-close" @click="closeEditModal"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <!-- PASO 1: identificación -->
        <form v-if="editStep === 1" @submit.prevent="buscarMisDatos">
          <div class="info-box mb-2"><i class="fas fa-info-circle"></i> Ingresa el correo y el documento con los que te inscribiste</div>
          <div class="form-group">
            <label class="form-label"><i class="fas fa-envelope"></i> Correo electrónico</label>
            <input v-model="editCorreo" type="email" class="form-control" placeholder="tu@correo.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label"><i class="far fa-id-card"></i> DNI / Carnet</label>
            <input v-model="editDocumento" type="text" class="form-control" placeholder="12345678" maxlength="12">
          </div>
          <button type="submit" hidden></button>
        </form>

        <!-- PASO 2: datos editables -->
        <div v-if="editStep === 2 && userData">
          <div class="form-group">
            <label class="form-label">Documento</label>
            <input type="text" class="form-control" :value="userData.documento" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">Correo</label>
            <input type="email" class="form-control" :value="userData.correo" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">Nombres</label>
            <input type="text" class="form-control" v-model="userData.nombres">
          </div>
          <div class="form-group">
            <label class="form-label">Apellidos</label>
            <input type="text" class="form-control" v-model="userData.apellidos">
          </div>
          <div class="form-group">
            <label class="form-label">Programa</label>
            <select class="form-select" v-model="userData.programa">
              <option v-for="prog in PROGRAMAS" :key="prog" :value="prog">{{ prog }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ciclo</label>
            <select class="form-select" v-model="userData.ciclo">
              <option v-for="ciclo in CICLOS" :key="ciclo" :value="ciclo">{{ ciclo }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Participación</label>
            <select class="form-select" v-model="userData.participacion">
              <option v-for="part in PARTICIPACIONES" :key="part" :value="part">{{ part }}</option>
            </select>
          </div>
        </div>

        <div v-if="editError" class="warning-box mt-1"><i class="fas fa-exclamation-circle"></i> {{ editError }}</div>
        <div v-if="successMessage" class="success-box mt-1"><i class="fas fa-check-circle"></i> {{ successMessage }}</div>
      </div>

      <div class="modal-footer">
        <template v-if="editStep === 1">
          <button class="btn btn-ghost" style="color:var(--muted);background:var(--bg);border-radius:12px;padding:10px 20px;" @click="closeEditModal">Cancelar</button>
          <button class="btn btn-gold" style="border-radius:12px;padding:10px 24px;" @click="buscarMisDatos" :disabled="isSearching">
            <i class="fas fa-arrow-right"></i> {{ isSearching ? 'Buscando...' : 'Continuar' }}
          </button>
        </template>
        <template v-else>
          <button class="btn btn-ghost" style="color:var(--muted);background:var(--bg);border-radius:12px;padding:10px 20px;" @click="editStep = 1" :disabled="isSavingChanges">Atrás</button>
          <button class="btn btn-gold" style="border-radius:12px;padding:10px 24px;" @click="guardarCambios" :disabled="isSavingChanges">
            <i class="fas fa-save"></i> {{ isSavingChanges ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-landing {
  min-height: 100vh;
}

.reg-img-side--poster {
  padding: 0;
  min-height: 0;
  justify-content: flex-start;
}

.reg-form-side {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.reg-evento-img {
  width: 100%;
  height: auto;
  display: block;
}
</style>
