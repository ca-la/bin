import Knex from 'knex';
import db from '../../../services/db';
import ProductDesign = require('../../../components/product-designs/domain-objects/product-design');
import ProductDesignWithApprovalSteps from '../domain-objects/product-design-with-approval-steps';
import limitOrOffset from '../../../services/limit-or-offset';
import {
  dataAdapter,
  isProductDesignRow,
  ProductDesignData,
  ProductDesignRow
} from '../domain-objects/product-designs-new';
import first from '../../../services/first';
import { validate, validateEvery } from '../../../services/validate-from-db';
import attachApprovalSteps from './attach-approval-steps';
import ResourceNotFoundError from '../../../errors/resource-not-found';
import { queryWithCollectionMeta } from './view';
import {
  isProductDesignRowWithMeta,
  ProductDesignDataWithMeta,
  ProductDesignRowWithMeta,
  withMetaDataAdapter
} from '../domain-objects/with-meta';

export const TABLE_NAME = 'product_designs';

/**
 * Find all designs that the user is a collaborator on.
 */
export async function findAllDesignsThroughCollaborator(options: {
  userId: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<ProductDesignWithApprovalSteps[]> {
  const result = await queryWithCollectionMeta(db)
    .whereRaw(
      `
product_designs.id in (
  SELECT product_designs.id
    FROM product_designs
    JOIN collaborators AS c ON c.design_id = product_designs.id
    WHERE c.user_id = ?
      AND (c.cancelled_at IS NULL OR c.cancelled_at > now())
      AND product_designs.deleted_at IS NULL
  UNION
  SELECT product_designs.id
    FROM collaborators AS c
    JOIN collections AS co ON co.id = c.collection_id
    JOIN collection_designs AS cd ON cd.collection_id = co.id
    JOIN product_designs ON product_designs.id = cd.design_id
    WHERE c.user_id = ?
      AND (c.cancelled_at IS NULL OR c.cancelled_at > now())
      AND co.deleted_at IS NULL
      AND product_designs.deleted_at IS NULL
)
    `,
      [options.userId, options.userId]
    )
    .modify(attachApprovalSteps)

    // TODO: Remove this once changes from api#1216 are fully live
    .select(['current_step.title as current_step_title'])
    .leftJoin(
      db.raw(
        `(SELECT DISTINCT ON (design_id)
            design_id,
            title
          FROM
            design_approval_steps
          WHERE
            state in ('CURRENT', 'COMPLETED')
          ORDER BY
            design_id,
            ordering DESC
          ) AS current_step ON current_step.design_id = product_designs.id`
      )
    )
    .groupBy(['current_step.title', 'current_step.design_id'])

    .modify(
      (query: Knex.QueryBuilder): void => {
        if (options.search) {
          query.andWhere(
            db.raw('(product_designs.title ~* :search)', {
              search: options.search
            })
          );
        }
      }
    )
    .modify(limitOrOffset(options.limit, options.offset));

  return result.map((row: any): ProductDesign => new ProductDesign(row));
}

export async function findAllDesignIdsThroughCollaborator(
  userId: string
): Promise<string[]> {
  const result = await db.raw(
    `
SELECT d1.id
  FROM product_designs as d1
  JOIN collaborators AS c1 ON c1.design_id = d1.id
  WHERE c1.user_id = ?
    AND (c1.cancelled_at IS NULL OR c1.cancelled_at > now())
    AND d1.deleted_at IS NULL
UNION
SELECT d2.id
  FROM collaborators AS c2
  JOIN collections AS co ON co.id = c2.collection_id
  JOIN collection_designs AS cd ON cd.collection_id = co.id
  JOIN product_designs as d2 ON d2.id = cd.design_id
  WHERE c2.user_id = ?
    AND (c2.cancelled_at IS NULL OR c2.cancelled_at > now())
    AND co.deleted_at IS NULL
    AND d2.deleted_at IS NULL
    `,
    [userId, userId]
  );

  return result.rows.map((row: any) => row.id);
}

export async function findDesignByAnnotationId(
  annotationId: string
): Promise<ProductDesignData | null> {
  const result = await db.raw(
    `
SELECT designs.* FROM product_designs AS designs
INNER JOIN product_design_canvases AS canvases ON canvases.design_id = designs.id
INNER JOIN product_design_canvas_annotations AS annotations ON annotations.canvas_id = canvases.id
WHERE annotations.id = ?
AND annotations.deleted_at IS null
AND designs.deleted_at IS null
ORDER BY canvases.ordering ASC
  `,
    [annotationId]
  );
  const row = first<ProductDesignRow>(result.rows);

  if (!row) {
    return null;
  }

  return validate<ProductDesignRow, ProductDesignData>(
    TABLE_NAME,
    isProductDesignRow,
    dataAdapter,
    row
  );
}

export async function findDesignByTaskId(
  taskId: string
): Promise<ProductDesignData | null> {
  const result = await db.raw(
    `
SELECT designs.* FROM product_designs AS designs
LEFT JOIN product_design_stages AS stages ON stages.design_id = designs.id
LEFT JOIN product_design_stage_tasks AS stage_tasks ON stage_tasks.design_stage_id = stages.id
LEFT JOIN design_approval_steps AS steps ON steps.design_id = designs.id
LEFT JOIN design_approval_step_tasks AS step_tasks ON step_tasks.approval_step_id = steps.id
WHERE (stage_tasks.task_id = :taskId OR step_tasks.task_id = :taskId)
AND designs.deleted_at IS null
  `,
    { taskId }
  );
  const row = first<ProductDesignRow>(result.rows);

  if (!row) {
    return null;
  }

  return validate<ProductDesignRow, ProductDesignData>(
    TABLE_NAME,
    isProductDesignRow,
    dataAdapter,
    row
  );
}

export async function findDesignByApprovalStepId(
  approvalStepId: string
): Promise<ProductDesignData | null> {
  const row = await db
    .table(TABLE_NAME)
    .select('product_designs.*')
    .join(
      'design_approval_steps',
      'design_approval_steps.design_id',
      'product_designs.id'
    )
    .where({ 'design_approval_steps.id': approvalStepId })
    .first();

  if (!row) {
    return null;
  }

  return validate<ProductDesignRow, ProductDesignData>(
    TABLE_NAME,
    isProductDesignRow,
    dataAdapter,
    row
  );
}

export function queryWithCostsAndEvents(): Knex.QueryBuilder {
  return db
    .select([
      'd.*',
      'cost_inputs.input_list AS cost_inputs',
      'events.event_list AS events'
    ])
    .from('product_designs AS d')
    .joinRaw(
      `
left join (
  select
    e.design_id,
    to_jsonb(
      array_remove(
        array_agg(
          e.* ORDER BY e.created_at ASC
        )
      , null)
    ) as event_list
  from design_events as e
  group by e.design_id
) as events on events.design_id = d.id
    `
    )
    .joinRaw(
      `
left join (
  select
    i.design_id,
    to_jsonb(
      array_remove(
        array_agg(
          i.* ORDER BY i.expires_at DESC NULLS FIRST
        )
      , null)
    ) as input_list
  from pricing_cost_inputs as i
  group by i.design_id
) as cost_inputs on cost_inputs.design_id = d.id
    `
    )
    .where({
      'd.deleted_at': null
    })
    .orderBy('d.created_at', 'DESC');
}

export async function findAllWithCostsAndEvents(
  collectionIds: string[],
  trx?: Knex.Transaction
): Promise<ProductDesignDataWithMeta[]> {
  const rows = await queryWithCostsAndEvents()
    .select('cd.collection_id AS collection_id')
    .joinRaw('INNER JOIN collection_designs AS cd ON cd.design_id = d.id')
    .whereIn('cd.collection_id', collectionIds)
    .modify(
      (query: Knex.QueryBuilder): void => {
        if (trx) {
          query.transacting(trx);
        }
      }
    );

  return validateEvery<ProductDesignRowWithMeta, ProductDesignDataWithMeta>(
    TABLE_NAME,
    isProductDesignRowWithMeta,
    withMetaDataAdapter,
    rows
  );
}

export async function findDesignByBidId(
  bidId: string
): Promise<ProductDesignData | null> {
  const result = await db(TABLE_NAME)
    .select('product_designs.*')
    .join('pricing_quotes', 'pricing_quotes.design_id', 'product_designs.id')
    .join('pricing_bids', 'pricing_bids.quote_id', 'pricing_quotes.id')
    .where({ 'pricing_bids.id': bidId, 'product_designs.deleted_at': null });
  const row = first<ProductDesignRow>(result);
  if (!row) {
    return null;
  }

  return validate<ProductDesignRow, ProductDesignData>(
    TABLE_NAME,
    isProductDesignRow,
    dataAdapter,
    row
  );
}

export async function deleteByIds(options: {
  designIds: string[];
  trx: Knex.Transaction;
}): Promise<number> {
  const { designIds, trx } = options;

  const deleted = await trx(TABLE_NAME)
    .whereIn('id', designIds)
    .update(
      {
        deleted_at: new Date()
      },
      'id'
    );
  if (deleted.length !== designIds.length) {
    throw new Error(
      `Only deleted ${deleted.length} out of an expected ${designIds.length}.`
    );
  }

  return deleted.length;
}

export async function isOwner(options: {
  designId: string;
  userId: string;
  trx?: Knex.Transaction;
}): Promise<boolean> {
  const { designId, trx, userId } = options;
  const ownerRow: { user_id: string } | null = await db(TABLE_NAME)
    .select('user_id')
    .where({ id: designId, deleted_at: null })
    .modify(
      (query: Knex.QueryBuilder): void => {
        if (trx) {
          query.transacting(trx);
        }
      }
    )
    .then((rows: string[]) => first<string>(rows));

  if (!ownerRow) {
    throw new ResourceNotFoundError(`Design "${designId}" could not be found.`);
  }

  return ownerRow.user_id === userId;
}
