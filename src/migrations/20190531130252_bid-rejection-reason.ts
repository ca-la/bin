import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    CREATE TABLE bid_rejections (
      id uuid NOT NULL,
      created_at timestamp with time zone not null default now(),
      created_by uuid references users(id) NOT NULL,
      bid_id uuid unique NOT NULL,
      price_too_low boolean NOT NULL,
      deadline_too_short boolean NOT NULL,
      missing_information boolean NOT NULL,
      other boolean NOT NULL,
      notes text
  );

  ALTER TABLE ONLY bid_rejections
    ADD CONSTRAINT bid_rejections_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.pricing_bids(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    DROP TABLE bid_rejections;
  `);
}
