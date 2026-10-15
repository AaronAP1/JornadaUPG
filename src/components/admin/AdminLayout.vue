<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAdminEmail, logoutAdmin } from '../../services/admin'

const route = useRoute()
const router = useRouter()

const adminEmail = ref('')
const sidebarOpen = ref(false)

const NAV = [
  { to: '/admin', icon: 'fas fa-chart-pie', label: 'Resumen' },
  { to: '/admin/inscripciones', icon: 'fas fa-users', label: 'Inscripciones' },
  { to: '/admin/salas', icon: 'fas fa-video', label: 'Salas Zoom' },
  { to: '/admin/configuracion', icon: 'fas fa-sliders-h', label: 'Configuración' }
]

const logout = async () => {
  await logoutAdmin()
  router.replace('/admin/login')
}

onMounted(async () => {
  adminEmail.value = await getAdminEmail()
})
</script>

<template>
  <div class="admin-page">
    <div v-if="sidebarOpen" class="admin-overlay" @click="sidebarOpen = false"></div>

    <div class="admin-mobile-topbar">
      <button class="burger-btn" @click="sidebarOpen = !sidebarOpen"><i class="fas fa-bars"></i></button>
      <h3>{{ route.meta.title }}</h3>
      <div style="width: 40px;"></div>
    </div>

    <div class="dash-layout">
      <aside class="sidebar admin-sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <div class="user-avatar"><i class="fas fa-user-shield"></i></div>
          <div class="user-name">Administrador</div>
          <div class="user-role">{{ adminEmail }}</div>
        </div>

        <span class="sidebar-section-label">Gestión</span>
        <router-link
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="sidebar-nav-item"
          :class="{ active: route.path === item.to }"
          @click="sidebarOpen = false"
        >
          <i :class="item.icon"></i> {{ item.label }}
        </router-link>

        <span class="sidebar-section-label">Sesión</span>
        <router-link to="/" class="sidebar-nav-item"><i class="fas fa-globe"></i> Ver página pública</router-link>
        <button class="sidebar-nav-item" @click="logout"><i class="fas fa-sign-out-alt"></i> Cerrar sesión</button>
      </aside>

      <main class="dash-content">
        <div class="dash-topbar">
          <h2>{{ route.meta.title }}</h2>
          <span class="badge badge-navy"><i class="fas fa-user-shield"></i> Admin</span>
        </div>
        <div class="dash-section">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--bg);
}

.admin-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.admin-sidebar .sidebar-nav-item {
  text-decoration: none;
}

.admin-sidebar .user-avatar {
  font-size: 1.2rem;
}

.admin-mobile-topbar {
  display: none;
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--navy);
  padding: 0.8rem 1rem;
  color: white;
  align-items: center;
  justify-content: space-between;
}

.admin-mobile-topbar h3 {
  font-size: 1rem;
}

.admin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 140;
}

.dash-content {
  min-width: 0;
}

@media (max-width: 900px) {
  .admin-mobile-topbar {
    display: flex;
  }

  .admin-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 260px;
    z-index: 150;
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .admin-sidebar.open {
    transform: translateX(0);
  }

  .dash-section {
    padding: 1rem;
  }

  .dash-topbar {
    display: none;
  }
}
</style>
