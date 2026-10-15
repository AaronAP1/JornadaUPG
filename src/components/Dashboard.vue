<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSesion, refrescarSesion, cerrarSesion, type SesionParticipante } from '../services/participante'

const route = useRoute()
const router = useRouter()

const session = ref<SesionParticipante | null>(getSesion())
const sidebarOpen = ref(false)

type Seccion = 'inicio' | 'salas' | 'perfil'
const SECCIONES: Record<Seccion, string> = { inicio: 'Inicio', salas: 'Salas Zoom', perfil: 'Mi Perfil' }
const activeSection = computed<Seccion>(() => (route.params.seccion as Seccion) || 'inicio')

const participante = computed(() => session.value?.participante)
const userInitial = computed(() => participante.value?.nombres?.charAt(0).toUpperCase() || 'U')
const userFullName = computed(() =>
  participante.value ? `${participante.value.nombres} ${participante.value.apellidos}` : 'Participante'
)

const salas = computed(() => session.value?.salas ?? [])
const mainRoom = computed(() => salas.value.find((s) => s.principal) ?? null)
const secondaryRooms = computed(() => salas.value.filter((s) => !s.principal))
const salasActivas = computed(() => salas.value.filter((s) => s.activa).length)
// Color de acento por tarjeta de sala
const ACENTOS = ['#0A4C6E', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6']

const asistencia = computed(() => session.value?.asistencia ?? null)
const asistenciaTexto = computed(() =>
  asistencia.value?.registrado_en ? new Date(asistencia.value.registrado_en).toLocaleString() : ''
)

const joinLink = (link: string | null) => {
  if (link) window.open(link, '_blank', 'noopener')
}

const logout = () => {
  cerrarSesion()
  router.replace('/')
}

const showSection = (seccion: Seccion) => {
  router.push(seccion === 'inicio' ? '/evento' : `/evento/${seccion}`)
  sidebarOpen.value = false
}

onMounted(async () => {
  // Revalida la sesión: salas, habilitación del ingreso y asistencia del día
  const result = await refrescarSesion()
  if (!result.success) {
    router.replace({ name: 'Login', query: { motivo: result.message } })
    return
  }
  session.value = result.session
})
</script>

<template>
  <div class="dashboard-page" v-if="participante">
    <!-- Overlay para cerrar sidebar en mobile -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <!-- Mobile topbar -->
    <div class="mobile-topbar">
      <button class="burger-btn" @click="sidebarOpen = !sidebarOpen">
        <i class="fas fa-bars"></i>
      </button>
      <h3>{{ SECCIONES[activeSection] }}</h3>
      <div style="width: 40px;"></div>
    </div>

    <!-- Layout del dashboard -->
    <div class="dash-layout">
      <!-- Sidebar -->
      <aside class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-name">{{ participante.nombres }}</div>
          <div class="user-role">{{ participante.participacion }} · Coloquio de Enfermería</div>
        </div>

        <span class="sidebar-section-label">Menú principal</span>
        <button class="sidebar-nav-item" :class="{ active: activeSection === 'inicio' }" @click="showSection('inicio')">
          <i class="fas fa-home"></i> Inicio
        </button>
        <button class="sidebar-nav-item" :class="{ active: activeSection === 'salas' }" @click="showSection('salas')">
          <i class="fas fa-video"></i> Salas Zoom
        </button>
        <button class="sidebar-nav-item" :class="{ active: activeSection === 'perfil' }" @click="showSection('perfil')">
          <i class="fas fa-user-circle"></i> Mi Perfil
        </button>

        <span class="sidebar-section-label">Sesión</span>
        <button class="sidebar-nav-item" @click="router.push('/')">
          <i class="fas fa-globe"></i> Página principal
        </button>
        <button class="sidebar-nav-item" @click="logout">
          <i class="fas fa-sign-out-alt"></i> Cerrar sesión
        </button>
      </aside>

      <!-- Contenido principal -->
      <main class="dash-content">
        <div class="dash-topbar">
          <h2>{{ SECCIONES[activeSection] }}</h2>
          <div class="flex-row">
            <span class="badge badge-success"><i class="fas fa-circle" style="font-size:0.5rem;"></i> En vivo</span>
          </div>
        </div>

        <!-- SECCIÓN: INICIO -->
        <div v-if="activeSection === 'inicio'" class="dash-section-content">
          <div class="admin-card mb-2">
            <h3><i class="fas fa-calendar-alt"></i> Estado del Evento</h3>
            <div class="info-box">
              <i class="fas fa-check-circle" style="color: var(--success);"></i>
              <strong>Coloquio activo</strong> · El evento está en curso
            </div>
          </div>

          <div v-if="asistencia" class="attendance-banner success">
            <div class="att-icon"><i class="fas fa-check-circle"></i></div>
            <div>
              <h3>Asistencia registrada</h3>
              <p>Registrado: {{ asistenciaTexto }}</p>
            </div>
          </div>
          <div v-else class="attendance-banner pending">
            <div class="att-icon"><i class="fas fa-clock"></i></div>
            <div>
              <h3>Verificando asistencia...</h3>
              <p>Validando tu estado de asistencia</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon success"><i class="fas fa-check-circle"></i></div>
              <div>
                <div class="stat-val">{{ asistencia ? 'Presente' : '—' }}</div>
                <div class="stat-label">Asistencia de hoy</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon info"><i class="fas fa-video"></i></div>
              <div>
                <div class="stat-val">{{ salasActivas }}</div>
                <div class="stat-label">Salas disponibles</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon gold"><i class="fas fa-microphone-alt"></i></div>
              <div>
                <div class="stat-val">{{ participante.participacion }}</div>
                <div class="stat-label">Tipo de participación</div>
              </div>
            </div>
          </div>

          <div class="admin-card">
            <h3><i class="fas fa-info-circle"></i> Información del evento</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;">
              <div>
                <span class="text-muted text-small">Fecha</span>
                <div style="font-weight:600;margin-top:2px;">10 – 11 Noviembre 2026</div>
              </div>
              <div>
                <span class="text-muted text-small">Modalidad</span>
                <div style="font-weight:600;margin-top:2px;">Virtual (Zoom)</div>
              </div>
              <div>
                <span class="text-muted text-small">Salas Zoom</span>
                <div style="font-weight:600;margin-top:2px;">{{ salas.length }} salas</div>
              </div>
              <div>
                <span class="text-muted text-small">Certificado</span>
                <div style="font-weight:600;margin-top:2px;">Sí, al finalizar</div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN: SALAS ZOOM -->
        <div v-if="activeSection === 'salas'" class="dash-section-content">
          <div class="salas-resumen">
            <span class="salas-chip salas-chip--live"><span class="live-dot"></span> {{ salasActivas }} activas</span>
            <span v-if="salas.length - salasActivas" class="salas-chip"><i class="fas fa-lock"></i> {{ salas.length - salasActivas }} por abrir</span>
            <span class="salas-hint">Las salas bloqueadas se habilitan cuando inicia su sesión.</span>
          </div>

          <div v-if="!salas.length" class="warning-box">Aún no hay salas configuradas.</div>

          <!-- Sala principal -->
          <article v-if="mainRoom" :class="['sala-hero', { 'is-locked': !mainRoom.activa }]">
            <i class="fas fa-video sala-hero-bg"></i>
            <div class="sala-hero-body">
              <span class="sala-hero-tag">
                <template v-if="mainRoom.activa"><span class="live-dot"></span> EN VIVO · Sala principal</template>
                <template v-else><i class="fas fa-lock"></i> Sala principal · Próximamente</template>
              </span>
              <h3>{{ mainRoom.nombre }}</h3>
              <p v-if="mainRoom.descripcion">{{ mainRoom.descripcion }}</p>
            </div>
            <button v-if="mainRoom.activa" class="sala-hero-btn" @click="joinLink(mainRoom.link)">
              <i class="fas fa-play"></i> Unirse ahora
            </button>
            <span v-else class="sala-hero-locked"><i class="fas fa-lock"></i> Bloqueada</span>
          </article>

          <!-- Salas paralelas -->
          <h4 v-if="secondaryRooms.length" class="salas-subtitulo">Salas paralelas</h4>
          <div class="sala-grid">
            <article
              v-for="(room, index) in secondaryRooms"
              :key="room.id"
              :class="['sala-card', { 'is-locked': !room.activa }]"
              :style="{ '--accent': ACENTOS[index % ACENTOS.length] }"
            >
              <div class="sala-card-top">
                <span class="sala-card-num">{{ String(index + 1).padStart(2, '0') }}</span>
                <span v-if="room.activa" class="sala-card-status"><span class="live-dot"></span> Activa</span>
                <span v-else class="sala-card-status sala-card-status--locked"><i class="fas fa-lock"></i> Bloqueada</span>
              </div>
              <h5>{{ room.nombre }}</h5>
              <p>{{ room.descripcion || 'Sesión simultánea' }}</p>
              <button class="sala-card-btn" :disabled="!room.activa" @click="joinLink(room.link)">
                <template v-if="room.activa"><i class="fas fa-video"></i> Unirse</template>
                <template v-else><i class="fas fa-clock"></i> Aún no disponible</template>
              </button>
            </article>
          </div>
        </div>

        <!-- SECCIÓN: PERFIL -->
        <div v-if="activeSection === 'perfil'" class="dash-section-content">
          <div class="profile-card mb-2">
            <div class="profile-avatar">{{ userInitial }}</div>
            <div class="profile-info">
              <h3>{{ userFullName }}</h3>
              <span class="badge badge-info">{{ participante.participacion }}</span>
              <div class="profile-meta">
                <div><strong>{{ participante.tipo_documento === 'dni' ? 'DNI' : 'Carnet' }}:</strong> {{ participante.documento }}</div>
                <div><strong>Email:</strong> {{ participante.correo }}</div>
                <div><strong>Programa:</strong> {{ participante.programa }}</div>
                <div><strong>Ciclo:</strong> {{ participante.ciclo }}</div>
              </div>
            </div>
          </div>

          <div class="info-box mb-2">
            <i class="fas fa-certificate"></i>
            <strong>Consulta de Certificados</strong><br>
            Para consultar y descargar tu certificado de participación, accede al portal oficial de certificados.
          </div>

          <button class="btn btn-gold" @click="logout">
            <i class="fas fa-sign-out-alt"></i> Cerrar sesión
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background: var(--bg);
}

.mobile-topbar {
  display: none;
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(90deg, var(--navy) 0%, var(--teal) 100%);
  padding: 1rem;
  color: white;
  align-items: center;
  justify-content: space-between;
}

.burger-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 90;
}

.dash-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: linear-gradient(180deg, var(--navy) 0%, var(--navy2) 100%);
  color: white;
  padding: 2rem 1.5rem;
  overflow-y: auto;
  position: sticky;
  top: 0;
  max-height: 100vh;
}

.sidebar-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--gold);
  color: var(--navy);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  margin: 0 auto 1rem;
}

.user-name {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.user-role {
  font-size: 0.85rem;
  opacity: 0.8;
}

.sidebar-section-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.6;
  margin: 1.5rem 0 0.75rem;
  font-weight: 600;
}

.sidebar-nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.8rem 1rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  font-weight: 500;
  text-align: left;
}

.sidebar-nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.sidebar-nav-item.active {
  background: var(--gold);
  color: var(--navy);
}

.dash-content {
  padding: 2rem;
  overflow-y: auto;
  max-height: 100vh;
}

.dash-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--bg2);
}

.dash-topbar h2 {
  font-size: 1.8rem;
  color: var(--navy);
}

.flex-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.badge-success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.badge-info {
  background: rgba(59, 130, 246, 0.1);
  color: var(--info);
}

.dash-section-content {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.admin-card {
  background: white;
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  margin-bottom: 1.5rem;
}

.admin-card h3 {
  font-size: 1.1rem;
  color: var(--navy);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-box {
  background: rgba(59, 130, 246, 0.05);
  border-left: 4px solid var(--info);
  padding: 1rem;
  border-radius: 6px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--navy);
  font-size: 0.95rem;
}

.mb-2 {
  margin-bottom: 1.5rem;
}

.attendance-banner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1.5rem;
  align-items: center;
  padding: 1.5rem;
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 1.5rem;
}

.attendance-banner.pending {
  border-left: 4px solid var(--warning);
}

.attendance-banner.success {
  border-left: 4px solid var(--success);
}

.attendance-banner.success .att-icon {
  color: var(--success);
}

.att-icon {
  font-size: 2.5rem;
  color: var(--warning);
}

.attendance-banner h3 {
  font-size: 1rem;
  color: var(--navy);
  margin-bottom: 0.25rem;
}

.attendance-banner p {
  color: var(--muted);
  font-size: 0.9rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  display: flex;
  gap: 1rem;
  align-items: center;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-icon.success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.stat-icon.info {
  background: rgba(59, 130, 246, 0.1);
  color: var(--info);
}

.stat-icon.gold {
  background: rgba(255, 200, 87, 0.1);
  color: var(--gold);
}

.stat-val {
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--navy);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--muted);
  margin-top: 0.25rem;
}

.profile-card {
  background: white;
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1.5rem;
  align-items: center;
}

.profile-avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: var(--gold);
  color: var(--navy);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.5rem;
}

.profile-info h3 {
  font-size: 1.2rem;
  color: var(--navy);
  margin-bottom: 0.5rem;
}

.profile-meta {
  display: grid;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--muted);
}

.text-muted {
  color: var(--muted);
}

.text-small {
  font-size: 0.85rem;
}

.btn {
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-gold {
  background: var(--gold);
  color: var(--navy);
}

.btn-gold:hover {
  background: var(--gold2);
  transform: translateY(-2px);
}

/* ========== SALAS ZOOM ========== */
.salas-resumen {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 1.25rem;
}

.salas-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: white;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(2, 27, 46, 0.06);
}

.salas-chip--live {
  color: var(--success);
}

.salas-hint {
  font-size: 0.85rem;
  color: var(--muted);
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
  animation: livePulse 1.6s ease-in-out infinite;
}

@keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.75); }
}

.sala-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 2rem 2.25rem;
  margin-bottom: 2rem;
  border-radius: 22px;
  color: white;
  background:
    radial-gradient(circle at 85% 20%, rgba(255, 200, 87, 0.35), transparent 45%),
    linear-gradient(135deg, var(--navy) 0%, var(--teal) 100%);
  box-shadow: 0 16px 40px rgba(2, 27, 46, 0.25);
}

.sala-hero-bg {
  position: absolute;
  right: -10px;
  bottom: -30px;
  font-size: 11rem;
  color: rgba(255, 255, 255, 0.06);
  transform: rotate(-12deg);
  pointer-events: none;
}

.sala-hero-body {
  position: relative;
  min-width: 0;
}

.sala-hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.9);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
}

.sala-hero h3 {
  margin-top: 0.9rem;
  font-size: 1.9rem;
  line-height: 1.15;
  color: white;
}

.sala-hero p {
  margin-top: 0.5rem;
  color: rgba(255, 255, 255, 0.75);
  max-width: 520px;
}

.sala-hero-btn {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 28px;
  border: none;
  border-radius: 14px;
  background: var(--gold);
  color: var(--navy);
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(255, 200, 87, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

.sala-hero-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 12px 30px rgba(255, 200, 87, 0.55);
}

.sala-hero-locked {
  position: relative;
  padding: 12px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
  font-weight: 700;
}

.sala-hero.is-locked {
  background: linear-gradient(135deg, #3a4a5c 0%, #5f7a94 100%);
}

.sala-hero.is-locked .sala-hero-tag {
  background: rgba(255, 255, 255, 0.18);
}

.salas-subtitulo {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--muted);
  margin-bottom: 1rem;
}

.sala-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1.1rem;
}

.sala-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.3rem;
  border-radius: 18px;
  background: white;
  border-top: 4px solid var(--accent);
  box-shadow: 0 4px 16px rgba(2, 27, 46, 0.07);
  transition: transform 0.2s, box-shadow 0.2s;
}

.sala-card:not(.is-locked):hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 30px rgba(2, 27, 46, 0.12);
}

.sala-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}

.sala-card-num {
  position: relative;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: var(--accent);
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  isolation: isolate;
}

/* Fondo suave del color de acento */
.sala-card-num::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--accent);
  opacity: 0.12;
  z-index: -1;
}

.sala-card-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--success);
}

.sala-card-status--locked {
  color: var(--muted);
}

.sala-card h5 {
  font-size: 1.05rem;
  color: var(--navy);
}

.sala-card p {
  flex: 1;
  font-size: 0.85rem;
  color: var(--muted);
}

.sala-card-btn {
  margin-top: 0.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.2s;
}

.sala-card-btn:hover:not(:disabled) {
  filter: brightness(1.12);
}

.sala-card-btn:disabled {
  background: var(--bg2);
  color: var(--muted);
  cursor: not-allowed;
}

.sala-card.is-locked {
  background: #f7f9fc;
  border-top-color: #cfd8e3;
}

.sala-card.is-locked .sala-card-num {
  color: var(--muted);
}

.sala-card.is-locked .sala-card-num::before {
  background: var(--muted);
}

/* Responsive */
@media (max-width: 768px) {
  .mobile-topbar {
    display: flex;
  }

  .dash-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    width: 260px;
    z-index: 95;
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .dash-content {
    padding: 1rem;
  }

  .dash-topbar {
    margin-bottom: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .profile-card {
    grid-template-columns: 1fr;
  }

  .sala-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.5rem;
  }

  .sala-hero h3 {
    font-size: 1.5rem;
  }

  .sala-hero-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>