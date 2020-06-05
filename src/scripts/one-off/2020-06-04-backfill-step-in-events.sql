WITH checkout_steps AS (
  SELECT
    design_approval_steps.id,
    design_id
  FROM
    design_approval_steps
    JOIN product_designs ON product_designs.id = design_approval_steps.design_id
  WHERE
    TYPE = 'CHECKOUT'
    AND product_designs.deleted_at IS NULL)
UPDATE
  design_events
SET
  approval_step_id = checkout_steps.id
FROM
  checkout_steps
WHERE
  design_events.design_id = checkout_steps.design_id
  AND TYPE IN ('COMMIT_QUOTE', 'SUBMIT_DESIGN', 'COMMIT_COST_INPUTS');

