<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginParticipante } from '../services/participante'

const router = useRouter()
const route = useRoute()

const email = ref('')
const dni = ref('')
const errorMessage = ref((route.query.motivo as string) || '')
const isLoading = ref(false)

const handleLogin = async () => {
  if (!email.value || !dni.value) {
    errorMessage.value = 'Por favor completa todos los campos'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await loginParticipante(email.value, dni.value)
    if (!response.success) {
      errorMessage.value = response.message
      return
    }
    const redirect = route.query.redirect as string | undefined
    router.replace(redirect?.startsWith('/evento') ? redirect : '/evento')
  } finally {
    isLoading.value = false
  }
}

const handleKeyPress = (field: 'email' | 'dni', event: KeyboardEvent) => {
  if (event.key === 'Enter' && field === 'email') {
    event.preventDefault()
    document.getElementById('dniInput')?.focus()
  }
}
</script>

<template>
  <!-- NOTIFICATION SYSTEM -->
  <div class="notification-container" id="notificationContainer"></div>
  <div class="toast-container" id="toastContainer"></div>

  <!-- APP LOADER -->
  <div v-if="isLoading" class="app-loader">
    <div class="loader-logo"><i class="fas fa-dna"></i></div>
    <div class="loader-title">Coloquio de Enfermería · UPeU</div>
    <div class="loader-sub">Escuela de Posgrado · Unidad de Ciencias de la Salud</div>
    <div class="loader-bar-wrap">
      <div class="loader-bar"></div>
    </div>
  </div>

  <!-- LOGIN PAGE -->
  <div class="login-page">
    <!-- LEFT PANEL -->
    <div class="login-left">
      <span class="login-left-bg-text">UPeU</span>
      <div class="login-left-badge"><i class="fas fa-dna"></i> Coloquio de Enfermería 2026</div>
      
      <h1>
        X Coloquio Internacional de Investigación en Enfermería
      </h1>
      
      <p>
        Del Proceso Enfermero a la Publicación Científica: Evidencia, Sistematización y Difusión del Cuidado · Escuela de Posgrado ·
        <span class="login-date">10 – 11 de noviembre de 2026</span>
      </p>
      
      <div class="login-stats">
        <div class="login-stat">
          <span class="login-stat-num">8</span>
          <span class="login-stat-label">Salas Zoom</span>
        </div>
        <div class="login-stat">
          <span class="login-stat-num">2</span>
          <span class="login-stat-label">Días</span>
        </div>
        <div class="login-stat">
          <span class="login-stat-num">2</span>
          <span class="login-stat-label">Ponentes</span>
        </div>
      </div>
    </div>

    <!-- RIGHT PANEL -->
    <div class="login-right">
      <div class="login-brand" @click="router.push('/')" style="cursor: pointer;">
        <div class="login-brand-icon"><i class="fas fa-microscope"></i></div>
        <div class="login-brand-name">
          Coloquio de Enfermería UPeU
          <span>Escuela de Posgrado · Ciencias de la Salud</span>
        </div>
      </div>

      <div class="login-form-box">
        <div class="login-welcome">
          <h2>Bienvenido 👋</h2>
          <p>Ingresa el correo y el documento con los que te inscribiste.</p>
        </div>

        <div v-if="errorMessage" class="login-error-msg">
          <i class="fas fa-exclamation-circle"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label">Correo</label>
            <div class="input-icon-wrap">
              <i class="fas fa-user input-icon-left"></i>
              <input
                v-model="email"
                type="email"
                class="form-control"
                placeholder="tu@correo.com"
                autocomplete="username"
                @keydown="handleKeyPress('email', $event)"
              >
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">DNI / Carnet (contraseña)</label>
            <div class="input-icon-wrap">
              <i class="fas fa-lock input-icon-left"></i>
              <input
                id="dniInput"
                v-model="dni"
                type="text"
                class="form-control"
                placeholder="12345678"
                autocomplete="current-password"
                maxlength="12"
                @keydown="handleKeyPress('dni', $event)"
              >
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-navy btn-full"
            :disabled="isLoading"
          >
            <i class="fas fa-sign-in-alt"></i> Ingresar
          </button>
        </form>

        <div class="login-footer">
          <i class="fas fa-shield-alt"></i> Tus datos están protegidos · Universidad Peruana Unión
        </div>
      </div>
    </div>
  </div>
</template>

