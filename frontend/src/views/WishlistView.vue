<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhCheck, PhShoppingCartSimple, PhTrash } from '@phosphor-icons/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RouterLink } from 'vue-router'
import { useWishlistStore, type WishlistItem } from '@/stores/wishlist'
import { useCartStore } from '@/stores/cart'
import { fetchProductBySlug } from '@/lib/products'
import { formatPrice } from '@/lib/format'

const wishlist = useWishlistStore()
const cart = useCartStore()

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

// Select mode: tapping a card ticks it instead of opening the product, and the
// header offers bulk removal. This is the only way to remove items on phones,
// where the per-card buttons are hidden.
const selecting = ref(false)
const selected = ref(new Set<number>())

const allSelected = computed(
  () => wishlist.items.length > 0 && selected.value.size === wishlist.items.length,
)

function startSelecting() {
  selected.value = new Set()
  selecting.value = true
}

function stopSelecting() {
  selecting.value = false
  selected.value = new Set()
}

function toggleSelected(productId: number) {
  const next = new Set(selected.value)
  if (next.has(productId)) next.delete(productId)
  else next.add(productId)
  selected.value = next
}

function toggleSelectAll() {
  selected.value = allSelected.value
    ? new Set()
    : new Set(wishlist.items.map((item) => item.productId))
}

// Capture phase, so the inner product links never see the tap in select mode.
function onCardClick(event: MouseEvent, item: WishlistItem) {
  if (!selecting.value) return
  event.preventDefault()
  event.stopPropagation()
  toggleSelected(item.productId)
}

async function removeSelected() {
  const count = selected.value.size
  if (!count) return
  try {
    await ElMessageBox.confirm(
      `Remove ${count} ${count === 1 ? 'item' : 'items'} from your wishlist?`,
      'Remove Items',
      { confirmButtonText: 'Remove', cancelButtonText: 'Cancel', type: 'warning' },
    )
  } catch {
    return
  }
  for (const productId of selected.value) wishlist.remove(productId)
  ElMessage.success(`Removed ${count} ${count === 1 ? 'item' : 'items'} from wishlist`)
  stopSelecting()
}
</script>

<template>
  <div class="wishlist">
    <div class="wishlist-header">
      <div class="wishlist-heading">
        <h1 class="page-title">Your Wishlist</h1>
        <p class="items-count">
          {{ wishlist.itemCount }} {{ wishlist.itemCount === 1 ? 'Item' : 'Items' }} saved
        </p>
      </div>

      <div v-if="!wishlist.loading && wishlist.items.length" class="wishlist-tools">
        <button v-if="!selecting" type="button" class="tool-btn" @click="startSelecting">
          Select
        </button>
        <template v-else>
          <button type="button" class="tool-btn" @click="toggleSelectAll">
            {{ allSelected ? 'Deselect All' : 'Select All' }}
          </button>
          <button
            type="button"
            class="tool-btn tool-btn--danger"
            :disabled="!selected.size"
            @click="removeSelected"
          >
            <PhTrash :size="15" />
            Remove ({{ selected.size }})
          </button>
          <button type="button" class="tool-btn tool-btn--done" @click="stopSelecting">Done</button>
        </template>
      </div>
    </div>
    <div class="header-divider"></div>

    <el-row v-if="wishlist.loading" :gutter="24">
      <el-col v-for="n in 4" :key="n" :xs="12" :sm="12" :md="6" class="wishlist-col">
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
        :xs="12"
        :sm="12"
        :md="6"
        class="wishlist-col"
      >
        <el-card
          shadow="hover"
          class="wishlist-card"
          :class="{ 'is-selecting': selecting, 'is-selected': selected.has(item.productId) }"
          @click.capture="onCardClick($event, item)"
        >
          <span v-if="selecting" class="select-check" aria-hidden="true">
            <PhCheck v-if="selected.has(item.productId)" :size="14" weight="bold" />
          </span>
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
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.wishlist-heading {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.wishlist-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 2.25rem;
  padding: 0 0.9rem;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.tool-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.tool-btn--danger {
  background: #c0392b;
  border-color: #c0392b;
  color: #fff;
}

.tool-btn--danger:hover {
  background: #a93226;
  border-color: #a93226;
  color: #fff;
}

.tool-btn--danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn--done {
  background: var(--color-ink);
  border-color: var(--color-ink);
  color: #fff;
}

.tool-btn--done:hover {
  color: #fff;
  opacity: 0.85;
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
  position: relative;
  height: 100%;
}

.wishlist-card.is-selecting {
  cursor: pointer;
  user-select: none;
}

.wishlist-card.is-selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.select-check {
  position: absolute;
  z-index: 1;
  top: 0.6rem;
  left: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border: 1.5px solid var(--color-border);
  border-radius: 50%;
  background: #fff;
  color: #fff;
}

.wishlist-card.is-selected .select-check {
  background: var(--color-accent);
  border-color: var(--color-accent);
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

@media (max-width: 768px) {
  .wishlist {
    padding: 0 0 2rem;
  }

  .wishlist-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .wishlist-heading {
    flex-direction: column;
    gap: 0.15rem;
  }

  .tool-btn {
    flex: 1;
    justify-content: center;
    padding: 0 0.5rem;
  }

  .page-title {
    font-size: 1.85rem;
  }

  .header-divider {
    margin-bottom: 1.25rem;
  }

  /* el-row's gutter is applied as inline padding/margin, hence !important. */
  .el-row {
    margin-left: -6px !important;
    margin-right: -6px !important;
  }

  .wishlist-col {
    padding-left: 6px !important;
    padding-right: 6px !important;
    margin-bottom: 0.75rem;
  }

  .wishlist-card :deep(.el-card__body) {
    padding: 0.65rem;
  }

  .wishlist-name {
    font-size: 0.9rem;
    line-height: 1.3;
  }

  .wishlist-store {
    font-size: 0.65rem;
  }

  .wishlist-info {
    margin-bottom: 0;
  }

  /* Cards just open the product on phones; removal goes through Select mode
     and adding to cart through the product page. */
  .wishlist-actions {
    display: none;
  }
}
</style>
