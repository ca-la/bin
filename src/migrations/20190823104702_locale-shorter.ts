import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table users
  alter column locale set default 'en';

update users set locale = 'en' where locale = 'en-US';
update users set locale = 'zh' where locale = 'zh-CN';
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table users
  alter column locale set default 'en-US';

update users set locale = 'en-US' where locale = 'en';
update users set locale = 'zh-CN' where locale = 'zh';
  `);
}
