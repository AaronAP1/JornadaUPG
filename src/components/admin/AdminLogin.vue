<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginAdmin } from '../../services/admin'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor completa todos los campos'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await loginAdmin(email.value, password.value)
    if (!response.success) {
      errorMessage.value = response.message
      return
    }
    const redirect = route.query.redirect as string | undefined
    router.replace(redirect?.startsWith('/admin') ? redirect : '/admin')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-left">
      <span class="login-left-bg-text">UPeU</span>
      <div class="login-left-badge"><i class="fas fa-user-shield"></i> Panel de administración</div>
      <h1>X Coloquio Internacional de Investigación en Enfermería</h1>
      <p>Gestiona inscripciones, salas Zoom y la configuración del evento.</p>
    </div>

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
          <h2>Administración</h2>
          <p>Ingresa con tu cuenta de administrador.</p>
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
              <input v-model="email" type="email" class="form-control" placeholder="admin@upeu.edu.pe" autocomplete="username">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div class="input-icon-wrap">
              <i class="fas fa-lock input-icon-left"></i>
              <input v-model="password" type="password" class="form-control" placeholder="••••••••" autocomplete="current-password">
            </div>
          </div>

          <button type="submit" class="btn btn-navy btn-full" :disabled="isLoading">
            <i :class="isLoading ? 'fas fa-spinner fa-spin' : 'fas fa-sign-in-alt'"></i>
            {{ isLoading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>

        <div class="login-footer">
          <i class="fas fa-shield-alt"></i> Acceso restringido · Universidad Peruana Unión
        </div>
      </div>
    </div>
  </div>
</template>
