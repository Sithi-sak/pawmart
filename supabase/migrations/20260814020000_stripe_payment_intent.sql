-- Checkpoint 4.1 (Stripe slice): Visa orders are only ever inserted after
-- the backend has verified the Stripe PaymentIntent itself succeeded (see
-- routers/orders.py), so payment_status keeps meaning "money actually
-- moved" -- no new pending state needed, just somewhere to record which
-- PaymentIntent paid for the order (audit trail + replay guard against
-- reusing the same intent id across two orders).

alter table orders add column stripe_payment_intent_id text unique;
