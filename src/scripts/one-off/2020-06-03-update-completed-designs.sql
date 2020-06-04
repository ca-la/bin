WITH task_status AS (
  SELECT DISTINCT ON (product_designs.id)
    task_events.task_id,
    product_designs.id AS design_id,
    task_events.created_at AS completed_at,
    task_events.status AS status
  FROM
    task_events
    JOIN product_design_stage_tasks ON product_design_stage_tasks.task_id = task_events.task_id
    JOIN product_design_stages ON product_design_stages.id = product_design_stage_tasks.design_stage_id
    JOIN product_designs ON product_designs.id = product_design_stages.design_id
  WHERE
    task_events.title ILIKE 'confirm order has shipped'
    OR task_events.title ILIKE 'confirm product has been shipped'
  ORDER BY
    product_designs.id,
    task_events.created_at DESC)
UPDATE
  design_approval_steps
SET
  state = 'COMPLETED',
  reason = NULL,
  completed_at = CASE WHEN design_approval_steps.completed_at IS NULL THEN
    task_status.completed_at
  ELSE
    design_approval_steps.completed_at
  END
FROM
  task_status
WHERE
  design_approval_steps.design_id = task_status.design_id
  AND task_status.status = 'COMPLETED';

