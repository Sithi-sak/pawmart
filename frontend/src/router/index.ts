import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import AdminAuthLayout from '../layouts/AdminAuthLayout.vue'
import StoreOwnerLayout from '../layouts/StoreOwnerLayout.vue'
import { useAuthStore } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
    requiresStoreOwner?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [
        { path: '', name: 'home', component: () => import('../views/HomeView.vue') },
        {
          path: 'products',
          name: 'products',
          component: () => import('../views/ProductCatalogView.vue'),
        },
        {
          path: 'collections',
          name: 'collections',
          component: () => import('../views/CollectionsView.vue'),
        },
        {
          path: 'products/:slug',
          name: 'product-detail',
          component: () => import('../views/ProductDetailView.vue'),
          props: true,
        },
        { path: 'cart', name: 'cart', component: () => import('../views/CartView.vue') },
        {
          path: 'checkout',
          name: 'checkout',
          component: () => import('../views/CheckoutView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'order/confirm',
          name: 'order-confirm',
          component: () => import('../views/OrderConfirmationView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'orders/:id',
          name: 'order-tracking',
          component: () => import('../views/OrderTrackingView.vue'),
          props: true,
          meta: { requiresAuth: true },
        },
        {
          path: 'account',
          name: 'account',
          component: () => import('../views/AccountView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'account/pets',
          name: 'pet-profiles',
          component: () => import('../views/PetProfilesView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'account/orders',
          name: 'order-history',
          component: () => import('../views/OrderHistoryView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'store/:slug',
          name: 'store-detail',
          component: () => import('../views/StoreDetailView.vue'),
          props: true,
        },
        { path: 'about', name: 'about', component: () => import('../views/AboutView.vue') },
        {
          path: 'sell',
          name: 'become-seller',
          component: () => import('../views/BecomeSellerView.vue'),
        },
        {
          path: 'privacy',
          name: 'privacy',
          component: () => import('../views/PrivacyPolicyView.vue'),
        },
        {
          path: 'terms',
          name: 'terms',
          component: () => import('../views/TermsOfServiceView.vue'),
        },
      ],
    },
    {
      path: '/khqr-pay',
      name: 'khqr-pay-confirm',
      component: () => import('../views/KhqrPayConfirmView.vue'),
    },
    {
      path: '/',
      component: AuthLayout,
      children: [
        { path: 'login', name: 'login', component: () => import('../views/auth/LoginView.vue') },
        {
          path: 'signup',
          name: 'signup',
          component: () => import('../views/auth/SignupView.vue'),
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('../views/auth/ForgotPasswordView.vue'),
        },
        {
          path: 'reset-password',
          name: 'reset-password',
          component: () => import('../views/auth/ResetPasswordView.vue'),
        },
      ],
    },
    {
      path: '/admin/login',
      component: AdminAuthLayout,
      children: [
        {
          path: '',
          name: 'admin-login',
          component: () => import('../views/auth/AdminLoginView.vue'),
        },
      ],
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('../views/admin/AdminDashboardView.vue'),
        },
        {
          path: 'stores',
          name: 'admin-stores',
          component: () => import('../views/admin/AdminStoresView.vue'),
        },
        {
          path: 'store-requests',
          name: 'admin-store-requests',
          component: () => import('../views/admin/AdminStoreRequestsView.vue'),
        },
      ],
    },
    {
      path: '/store/manage',
      component: StoreOwnerLayout,
      meta: { requiresStoreOwner: true },
      children: [
        {
          path: '',
          name: 'store-manage-dashboard',
          component: () => import('../views/store/StoreOwnerDashboardView.vue'),
        },
        {
          path: 'products',
          name: 'store-manage-products',
          component: () => import('../views/store/StoreOwnerProductsView.vue'),
        },
        {
          path: 'orders',
          name: 'store-manage-orders',
          component: () => import('../views/store/StoreOwnerOrdersView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && !to.meta.requiresAdmin && !to.meta.requiresStoreOwner) return true

  const auth = useAuthStore()
  await auth.init()

  if (to.meta.requiresAdmin) {
    if (!auth.isAuthenticated || !auth.isAdmin) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
    return true
  }

  if (to.meta.requiresStoreOwner) {
    if (!auth.isAuthenticated || !auth.isStoreOwner) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // Staff credentials are a separate identity from any customer account —
  // don't let an admin or store-owner session render customer-facing
  // account pages.
  if (auth.isAdmin) {
    return { name: 'admin-dashboard' }
  }
  if (auth.isStoreOwner) {
    return { name: 'store-manage-dashboard' }
  }
  return true
})

export default router
