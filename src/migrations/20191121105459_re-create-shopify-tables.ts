import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE shopify_variants;
DROP TABLE shopify_products;

CREATE TABLE shopify_products (
  id UUID PRIMARY KEY,
  shopify_id TEXT NOT NULL,
  design_id UUID REFERENCES product_designs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE shopify_variants (
  id UUID PRIMARY KEY,
  shopify_id TEXT NOT NULL,
  shopify_product_id UUID REFERENCES shopify_products(id),
  variant_id UUID REFERENCES product_design_variants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE shopify_variants;
DROP TABLE shopify_products;

CREATE TABLE shopify_products (
  id TEXT PRIMARY KEY,
  design_id UUID REFERENCES product_designs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE shopify_variants (
  id TEXT PRIMARY KEY,
  shopify_product_id TEXT REFERENCES shopify_products(id),
  variant_upc TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
  `);
}
