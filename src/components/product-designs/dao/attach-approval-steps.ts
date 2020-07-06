import Knex from "knex";

import db from "../../../services/db";
import { ApprovalStepState } from "../../approval-steps/types";

export default function attachApprovalSteps(
  query: Knex.QueryBuilder
): Knex.QueryBuilder {
  return query.select([
    db.raw(
      `(
          SELECT to_jsonb(array_remove(array_agg(s.* ORDER BY s.ordering), NULL))
            FROM design_approval_steps AS s
           WHERE s.design_id = product_designs.id
        ) as approval_steps`
    ),
    db.raw(
      `(
          select completed_steps_amount / nullif(cast(not_skipped_steps_amount as decimal), 0)
          from (
            select
              (select count(*)
                from design_approval_steps as s
                where s.state=?
                and s.design_id = product_designs.id
              ) as completed_steps_amount,
              (select count(*)
                from design_approval_steps as s
                where s.state<>?
                and s.design_id = product_designs.id
              ) as not_skipped_steps_amount
          ) as s1
        ) as progress
        `,
      [ApprovalStepState.COMPLETED, ApprovalStepState.SKIP]
    ),
    db.raw(
      `(select created_at
           from design_approval_steps as s
           where s.design_id = product_designs.id
           order by ordering asc
           limit 1
         ) as first_step_created_at
        `
    ),
    db.raw(
      `(select due_at
           from design_approval_steps as s
           where s.design_id = product_designs.id
           order by ordering desc
           limit 1
         ) as last_step_due_at
        `
    ),
    db.raw(
      `(select ordering
           from design_approval_steps as s
           where s.state in (?, ?) AND s.design_id = product_designs.id
           order by ordering desc
           limit 1
         ) as current_step_ordering
        `,
      [ApprovalStepState.CURRENT, ApprovalStepState.COMPLETED]
    ),
  ]);
}
