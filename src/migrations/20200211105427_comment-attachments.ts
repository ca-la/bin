import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    CREATE TABLE comment_attachments (
      comment_id UUID REFERENCES comments NOT NULL,
      asset_id UUID REFERENCES assets NOT NULL
    );
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    DROP TABLE comment_attachments;
  `);
}
