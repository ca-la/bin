import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE user_onboardings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  welcome_modal_viewed_at TIMESTAMP WITH TIME ZONE,
  tasks_page_viewed_at TIMESTAMP WITH TIME ZONE,
  timeline_page_viewed_at TIMESTAMP WITH TIME ZONE,
  partner_dashboard_viewed_at TIMESTAMP WITH TIME ZONE
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE user_onboardings;
  `);
}
