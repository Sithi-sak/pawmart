-- Stripe was replaced by the simulated Visa card checkout, so nothing writes
-- or reads the PaymentIntent id added in 20260814020000 any more.

alter table orders drop column if exists stripe_payment_intent_id;
