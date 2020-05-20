import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE ONLY bid_rejections
      DROP CONSTRAINT bid_rejections_bid_id_fkey,
      ADD CONSTRAINT bid_rejections_bid_id_fk FOREIGN KEY (bid_id) REFERENCES pricing_bids(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE ONLY bid_rejections
      DROP CONSTRAINT bid_rejections_bid_id_fk,
      ADD CONSTRAINT bid_rejections_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.pricing_bids(id);
  `);
}
