/*
  Allow ownerless products for Shopify widget tracking.

  Context proven in runtime logs:
  - Shopify widget flow may have no resolvable user_id.
  - track-footwear-tryon needs to create a placeholder product row.
  - products.user_id NOT NULL currently blocks this path.
*/

ALTER TABLE products
ALTER COLUMN user_id DROP NOT NULL;

