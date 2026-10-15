import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from './components/Home.vue'
import Login from './components/Login.vue'
import Dashboard from './components/Dashboard.vue'
import { getSesion } from './services/participante'
import { esAdmin } from './services/admin'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresParticipant?: boolean
    guestParticipant?: boolean
    requiresAdmin?: boolean
    guestAdmin?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Home', component: Home },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: 'Ingresar', guestParticipant: true }
  },
  {
    path: '/evento/:seccion(inicio|salas|perfil)?',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: 'Evento', requiresParticipant: true }
  },
  { path: '/dashboard', redirect: '/evento' },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('./components/admin/AdminLogin.vue'),
    meta: { title: 'Administración', guestAdmin: true }
  },
  {
    path: '/admin',
    component: () => import('./components/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      { path: '', name: 'AdminResumen', component: () => import('./components/admin/AdminResumen.vue'), meta: { title: 'Resumen' } },
      { path: 'inscripciones', name: 'AdminInscripciones', component: () => import('./components/admin/AdminInscripciones.vue'), meta: { title: 'Inscripciones' } },
      { path: 'salas', name: 'AdminSalas', component: () => import('./components/admin/AdminSalas.vue'), meta: { title: 'Salas Zoom' } },
      { path: 'configuracion', name: 'AdminConfiguracion', component: () => import('./components/admin/AdminConfiguracion.vue'), meta: { title: 'Configuración' } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
  if (to.meta.requiresParticipant && !getSesion()) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestParticipant && getSesion()) {
    return { name: 'Dashboard' }
  }
  if (to.meta.requiresAdmin && !(await esAdmin())) {
    return { name: 'AdminLogin', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestAdmin && (await esAdmin())) {
    return { name: 'AdminResumen' }
  }
})

router.afterEach((to) => {
  const base = 'Coloquio de Enfermería UPeU'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
