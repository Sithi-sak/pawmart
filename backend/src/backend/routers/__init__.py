from . import categories, customers, loyalty, orders, pet_profiles, products

routers = [
    products.router,
    categories.router,
    customers.router,
    pet_profiles.router,
    orders.router,
    loyalty.router,
]
