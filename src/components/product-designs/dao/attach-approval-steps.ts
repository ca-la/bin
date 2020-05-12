import Knex from 'knex';

import db from '../../../services/db';

export default function attachApprovalSteps(
  query: Knex.QueryBuilder
): Knex.QueryBuilder {
  return query
    .select(['step_result.approval_steps as approval_steps'])
    .leftJoin(
      db.raw(`
    (
      select
        s.design_id,
        to_jsonb(array_remove(array_agg(s.* order by s.ordering), null)) as approval_steps
      from
        design_approval_steps as s
      group by s.design_id
    ) as step_result
    on step_result.design_id = product_designs.id
      `)
    )
    .groupBy(['step_result.design_id', 'step_result.approval_steps']);
}
