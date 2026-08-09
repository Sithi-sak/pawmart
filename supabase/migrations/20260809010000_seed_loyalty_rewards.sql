-- Task 3.6: seed a starter set of redeemable loyalty rewards.

insert into loyalty_rewards (title, description, points_cost) values
  ('$5 Off Your Order', 'Redeem for a $5 discount on a future order.', 500),
  ('$10 Off Your Order', 'Redeem for a $10 discount on a future order.', 1000),
  ('Free Standard Shipping', 'Redeem for complimentary standard shipping on your next order.', 750),
  ('$25 Off Your Order', 'Redeem for a $25 discount on a future order.', 2500);
