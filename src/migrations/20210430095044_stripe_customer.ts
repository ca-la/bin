import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    CREATE TABLE customers (
      id UUID PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL default now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL default now(),
      deleted_at TIMESTAMP WITH TIME ZONE,
      customer_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      user_id UUID REFERENCES users(id),
      team_id UUID REFERENCES teams(id)
    );

    ALTER TABLE customers
      ADD CONSTRAINT user_or_team CHECK (
        (
          (user_id IS NOT NULL) AND (team_id IS NULL)
        ) OR (
          (user_id IS NULL) AND (team_id IS NOT NULL)
        )
      );

    ALTER TABLE payment_methods
      DROP COLUMN team_id,
      ADD COLUMN customer_id UUID REFERENCES customers(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE payment_methods
      DROP COLUMN customer_id,
      ADD COLUMN team_id UUID REFERENCES teams(id);

    DROP TABLE customers;
  `);
}
