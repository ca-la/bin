import * as Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comments', (table: Knex.TableBuilder) => {
    table.uuid('id').primary();
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.text('text').notNullable();
    table
      .uuid('parent_comment_id')
      .references('id')
      .inTable('comments');
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users');
    table
      .boolean('is_pinned')
      .notNullable()
      .defaultTo(false);
    table.index(['id', 'deleted_at']);
  });

  await knex.schema.createTable('task_comments', (table: Knex.TableBuilder) => {
    table
      .uuid('task_id')
      .notNullable()
      .references('id')
      .inTable('tasks');
    table
      .uuid('comment_id')
      .primary()
      .references('id')
      .inTable('comments');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('task_comments');
  await knex.schema.dropTable('comments');
}
