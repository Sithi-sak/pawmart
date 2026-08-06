import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import AdminLayout from '../layouts/AdminLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
          path: 'products/:id',
          name: 'product-detail',
          component: () => import('../views/ProductDetailView.vue'),
          props: true,
        },
        { path: 'cart', name: 'cart', component: () => import('../views/CartView.vue') },
        {
          path: 'checkout',
          name: 'checkout',
          component: () => import('../views/CheckoutView.vue'),
        },
        {
          path: 'order/confirm',
          name: 'order-confirm',
          component: () => import('../views/OrderConfirmationView.vue'),
        },
        {
          path: 'orders/:id',
          name: 'order-tracking',
          component: () => import('../views/OrderTrackingView.vue'),
          props: true,
        },
        { path: 'login', name: 'login', component: () => import('../views/auth/LoginView.vue') },
        {
          path: 'signup',
          name: 'signup',
          component: () => import('../views/auth/SignupView.vue'),
        },
        { path: 'account', name: 'account', component: () => import('../views/AccountView.vue') },
        {
          path: 'account/pets',
          name: 'pet-profiles',
          component: () => import('../views/PetProfilesView.vue'),
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
          path: 'products',
          name: 'admin-products',
          component: () => import('../views/admin/AdminProductsView.vue'),
        },
        {
          path: 'orders',
          name: 'admin-orders',
          component: () => import('../views/admin/AdminOrdersView.vue'),
        },
      ],
    },
  ],
})

export default router
