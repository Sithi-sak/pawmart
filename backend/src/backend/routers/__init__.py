from . import categories, customers, loyalty, orders, pet_profiles, products, storage

routers = [
    products.router,
    categories.router,
    customers.router,
    pet_profiles.router,
    orders.router,
    loyalty.router,
    storage.router,
]
