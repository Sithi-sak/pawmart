from . import (
    loyalty,
    orders,
    storage,
    store_applications,
)

routers = [
    orders.router,
    loyalty.router,
    storage.router,
    store_applications.router,
]
