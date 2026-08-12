from . import (
    categories,
    customers,
    loyalty,
    orders,
    pet_profiles,
    products,
    storage,
    store_applications,
)

routers = [
    products.router,
    categories.router,
    customers.router,
    pet_profiles.router,
    orders.router,
    loyalty.router,
    storage.router,
    store_applications.router,
]
