import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE credit_notes (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  user_id UUID NOT NULL REFERENCES users(id),
  total_cents INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  reason TEXT
);

CREATE TABLE credit_note_line_items (
  id UUID PRIMARY KEY,
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id),
  line_item_id UUID NOT NULL REFERENCES line_items(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE credit_note_line_items;
DROP TABLE credit_notes;
  `);
}
