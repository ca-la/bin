import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
 ALTER TABLE design_approval_steps
   ADD COLUMN type TEXT;

UPDATE design_approval_steps
   SET type = 'CHECKOUT'
 WHERE title = 'Checkout';
UPDATE design_approval_steps
   SET type = 'TECHNICAL_DESIGN'
 WHERE title = 'Technical Design';
UPDATE design_approval_steps
   SET type = 'SAMPLE'
 WHERE title = 'Sample' OR title = 'Prototype';
UPDATE design_approval_steps
   SET type = 'PRODUCTION'
 WHERE title = 'Production';

-- Remove legacy step
DELETE FROM design_approval_steps
 WHERE title = 'Shipping';
-- Remove all other steps that did not map
DELETE FROM design_approval_steps
 WHERE type IS NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
 ALTER TABLE design_approval_steps
  DROP COLUMN type;
  `);
}
