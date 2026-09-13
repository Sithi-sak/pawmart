-- Rewards need a machine-readable payoff so a redemption can actually be
-- applied as a checkout discount (previously just a title/description and a
-- points debit -- see CHECKPOINT.md "known gap" note under 3.6).
alter table loyalty_rewards
  add column discount_amount numeric(10, 2) check (discount_amount is null or discount_amount > 0),
  add column free_shipping boolean not null default false;

update loyalty_rewards set discount_amount = 5 where title = '$5 Off Your Order';
update loyalty_rewards set discount_amount = 10 where title = '$10 Off Your Order';
update loyalty_rewards set discount_amount = 25 where title = '$25 Off Your Order';
update loyalty_rewards set free_shipping = true where title = 'Free Standard Shipping';
