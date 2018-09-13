/* tslint:disable:no-console */
import * as process from 'process';
import * as db from '../services/db';
import * as knex from 'knex';

async function main(): Promise<Error | {}> {
  const designId = process.argv[2];
  const oldUserId = process.argv[3];
  const userId = process.argv[4];

  if (!designId || !oldUserId || !userId) {
    return Promise.reject(new Error(
      `Usage: move-design.ts [design ID] [old user ID] [user ID]\nArguments: ${process.argv}`
    ));
  }

  return db.transaction(async (trx: knex.Transaction): Promise<any> => {
    try {
      console.log('\nUpdating: product_designs');
      const designs = await db('product_designs')
        .update({ user_id: userId })
        .where({ id: designId })
        .returning('*')
        .transacting(trx);
      console.log(designs);
      console.log('='.repeat(20));

      console.log('\nUpdating: product_design_collaborators');
      const collaborators = await db('product_design_collaborators')
        .delete()
        .where({ design_id: designId, user_id: userId })
        .returning('*')
        .transacting(trx);
      console.log(collaborators);
      console.log('='.repeat(20));

      console.log('\nUpdating: product_design_events');
      const events = await db('product_design_events')
        .update({ owner_user_id: userId })
        .where({ design_id: designId, owner_user_id: oldUserId })
        .returning('*')
        .transacting(trx);
      console.log(events);
      console.log('='.repeat(20));

      console.log('\nUpdating: product_design_options');
      const options = await (db.raw(`
update product_design_options as o
   set user_id = ?
  from product_design_selected_options as s
 where s.option_id = o.id
   and s.design_id = ?
returning *;
`, [userId, designId]) as any)
        .transacting(trx);
      console.log(options.rows);
      console.log('='.repeat(20));

      console.log('\nUpdating: product_design_images');
      const images = await (db.raw(`
update product_design_images set user_id = ?
  from product_design_feature_placements
  join product_design_sections
    on product_design_feature_placements.section_id = product_design_sections.id
 where product_design_feature_placements.image_id = product_design_images.id
   and product_design_sections.design_id = ?
returning *;
`, [userId, designId]) as any)
        .transacting(trx);
      console.log(images.rows);
    } catch (e) {
      return trx.rollback(e);
    }

    return trx.commit();
  });
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
