<script setup lang="ts">
import { PhShoppingCartSimple, PhTrash } from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RouterLink } from 'vue-router'
import { useWishlistStore, type WishlistItem } from '@/stores/wishlist'
import { useCartStore } from '@/stores/cart'
import { fetchProductBySlug } from '@/lib/products'

const wishlist = useWishlistStore()
const cart = useCartStore()

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

async function addToCart(item: WishlistItem) {
  const product = await fetchProductBySlug(item.slug)
  if (!product) {
    ElMessage.error(`Couldn't load "${item.name}" — it may no longer be available.`)
    return
  }

  if (cart.conflictsWithCart(product)) {
    try {
      await ElMessageBox.confirm(
        `Your cart has items from ${cart.activeStoreName ?? 'another store'}. Clear it to add items from a different store?`,
        'Different Store',
        { confirmButtonText: 'Clear Cart & Add', cancelButtonText: 'Cancel', type: 'warning' },
      )
    } catch {
      return
    }
    cart.clear()
  }

  cart.addItem(product)
  ElMessage.success(`Added "${product.name}" to cart`)
}

function removeFromWishlist(item: WishlistItem) {
  wishlist.remove(item.productId)
  ElMessage.success(`Removed "${item.name}" from wishlist`)
}
</script>

<template>
  <div class="wishlist">
    <div class="wishlist-header">
      <h1 class="page-title">Your Wishlist</h1>
      <p class="items-count">
        {{ wishlist.itemCount }} {{ wishlist.itemCount === 1 ? 'Item' : 'Items' }} saved
      </p>
    </div>
    <div class="header-divider"></div>

    <el-row v-if="wishlist.loading" :gutter="24">
      <el-col v-for="n in 4" :key="n" :xs="24" :sm="12" :md="6" class="wishlist-col">
        <el-card shadow="never" class="wishlist-card">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="image" class="sk-image" />
              <el-skeleton-item variant="text" class="sk-name" />
              <el-skeleton-item variant="text" class="sk-price" />
              <el-skeleton-item variant="button" class="sk-btn" />
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>

    <el-empty
      v-else-if="!wishlist.items.length"
      description="Your wishlist is empty."
      class="wishlist-empty"
    >
      <RouterLink to="/products">
        <el-button type="primary" class="accent-btn">Shop All</el-button>
      </RouterLink>
    </el-empty>

    <el-row v-else :gutter="24">
      <el-col
        v-for="item in wishlist.items"
        :key="item.productId"
        :xs="24"
        :sm="12"
        :md="6"
        class="wishlist-col"
      >
        <el-card shadow="hover" class="wishlist-card">
          <RouterLink :to="`/products/${item.slug}`" class="wishlist-image-link">
            <el-image
              :src="item.image ?? undefined"
              fit="contain"
              class="wishlist-image"
              :class="{ 'placeholder-img': !item.image }"
            >
              <template #error>
                <div class="placeholder-img wishlist-image"></div>
              </template>
            </el-image>
          </RouterLink>

          <div class="wishlist-info">
            <p v-if="item.storeName" class="wishlist-store">{{ item.storeName }}</p>
            <RouterLink :to="`/products/${item.slug}`" class="wishlist-name">{{
              item.name
            }}</RouterLink>
            <p class="wishlist-price">{{ formatPrice(item.price) }}</p>
          </div>

          <div class="wishlist-actions">
            <el-button type="primary" class="accent-btn" @click="addToCart(item)">
              <PhShoppingCartSimple :size="16" />
              <span>Add to Cart</span>
            </el-button>
            <el-button circle @click="removeFromWishlist(item)">
              <PhTrash :size="16" />
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.wishlist {
  padding: 1rem 0 3rem;
}

.wishlist-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.page-title {
  font-size: 2.5rem;
}

.items-count {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
}

.header-divider {
  height: 1px;
  background: var(--color-ink);
  margin-bottom: 2.5rem;
}

.wishlist-col {
  margin-bottom: 1.5rem;
}

.wishlist-card {
  height: 100%;
}

.wishlist-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
}

.wishlist-image-link {
  display: block;
}

.wishlist-image {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  background-color: #fff;
  margin-bottom: 0.75rem;
}

.placeholder-img {
  background: linear-gradient(180deg, #9a9a9a 0%, #d8d8d8 100%);
}

.wishlist-info {
  flex: 1;
  margin-bottom: 1rem;
}

.wishlist-store {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 0.2rem;
}

.wishlist-name {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
  text-decoration: none;
  margin-bottom: 0.25rem;
}

.wishlist-price {
  color: var(--color-accent);
  font-weight: 600;
}

.wishlist-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wishlist-actions .el-button + .el-button {
  margin-left: 0;
}

.wishlist-actions .accent-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.accent-btn {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.accent-btn:hover {
  background: var(--color-accent-dark);
  border-color: var(--color-accent-dark);
}

.wishlist-empty {
  padding: 4rem 0;
}

.sk-image {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  margin-bottom: 0.75rem;
}

.sk-name {
  width: 70%;
  margin-bottom: 0.5rem;
}

.sk-price {
  width: 35%;
  margin-bottom: 0.75rem;
}

.sk-btn {
  display: block;
  width: 100%;
  height: 2.25rem;
}
</style>
