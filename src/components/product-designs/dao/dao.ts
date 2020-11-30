import Knex from "knex";
import { omit } from "lodash";
import db from "../../../services/db";
import ProductDesign = require("../../../components/product-designs/domain-objects/product-design");
import ProductDesignWithApprovalSteps from "../domain-objects/product-design-with-approval-steps";
import limitOrOffset from "../../../services/limit-or-offset";
import {
  dataAdapter,
  isProductDesignRow,
  ProductDesignData,
  ProductDesignRow,
} from "../domain-objects/product-designs-new";
import first from "../../../services/first";
import { validate, validateEvery } from "../../../services/validate-from-db";
import attachApprovalSteps from "./attach-approval-steps";
import ResourceNotFoundError from "../../../errors/resource-not-found";
import { queryWithCollectionMeta } from "./view";
import {
  isProductDesignRowWithMeta,
  ProductDesignDataWithMeta,
  ProductDesignRowWithMeta,
  withMetaDataAdapter,
} from "../domain-objects/with-meta";
import { Role } from "../../users/types";
import attachBidId from "./attach-bid-id";
import {
  ApprovalStepState,
  ApprovalStepType,
} from "../../approval-steps/types";

export const TABLE_NAME = "product_designs";

export type DesignFilter =
  | {
      type: "COLLECTION";
      value: "*" | string;
    }
  | {
      type: "STEP";
      value: ApprovalStepType;
    }
  | {
      type: "STAGE";
      value: "COMPLETED" | "INCOMPLETE" | "CHECKED_OUT";
    };

/**
 * Find all designs that the user is a collaborator on.
 */
export async function findAllDesignsThroughCollaborator(options: {
  userId: string;
  role?: Role;
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  filters?: DesignFilter[];
}): Promise<ProductDesignWithApprovalSteps[]> {
  const result = await queryWithCollectionMeta(db)
    .whereRaw(
      `
product_designs.id in (
  SELECT product_designs.id
    FROM product_designs
    JOIN collaborators AS c ON c.design_id = product_designs.id
    LEFT JOIN team_users ON c.team_id = team_users.team_id
    WHERE (c.user_id = :userId OR team_users.user_id = :userId)
      AND (c.cancelled_at IS NULL OR c.cancelled_at > now())
      AND team_users.deleted_at IS NULL
      AND product_designs.deleted_at IS NULL
  UNION
  SELECT product_designs.id
    FROM collaborators AS c
    JOIN collections AS co ON co.id = c.collection_id
    JOIN collection_designs AS cd ON cd.collection_id = co.id
    JOIN product_designs ON product_designs.id = cd.design_id
    LEFT JOIN team_users ON c.team_id = team_users.team_id
    WHERE (c.user_id = :userId OR team_users.user_id = :userId)
      AND (c.cancelled_at IS NULL OR c.cancelled_at > now())
      AND co.deleted_at IS NULL
      AND team_users.deleted_at IS NULL
      AND product_designs.deleted_at IS NULL
)
    `,
      { userId: options.userId }
    )
    .modify(attachApprovalSteps)
    .modify((query: Knex.QueryBuilder) => {
      if (options.filters && options.filters.length > 0) {
        options.filters.forEach((designFilter: DesignFilter): void =>
          applyFilter(designFilter, query)
        );
      }
    })
    .modify((query: Knex.QueryBuilder): void => {
      if (options.search) {
        query.andWhere(
          db.raw("(product_designs.title ~* :search)", {
            search: options.search,
          })
        );
      }
    })
    .modify(limitOrOffset(options.limit, options.offset))
    .modify((query: Knex.QueryBuilder): void => {
      if (options.sortBy) {
        const [column, direction] = options.sortBy.split(":");
        query.clearOrder().orderBy(column, direction || "asc");
      }
    })
    .modify((query: Knex.QueryBuilder): void => {
      if (options.role === "PARTNER") {
        attachBidId(query, options.userId);
      }
    });

  // those fields are needed for sorting only
  // but we don't want them to be a part of domain object
  return result.map(
    (row: any): ProductDesign =>
      new ProductDesign(omit(row, "current_step_ordering"))
  );
}

function applyFilter(
  designFilter: DesignFilter,
  query: Knex.QueryBuilder
): void {
  switch (designFilter.type) {
    case "COLLECTION": {
      if (designFilter.value === "*") {
        query.whereNotNull("collection_designs.collection_id");
      } else {
        query.where({ "collection_designs.collection_id": designFilter.value });
      }
      break;
    }
    case "STEP":
      query.whereRaw(
        db.raw(
          `(
            select type
            from design_approval_steps as s
            where s.state = ? AND s.design_id = product_designs.id
            limit 1
          ) = ?`,
          [ApprovalStepState.CURRENT, designFilter.value]
        )
      );
      break;
    case "STAGE":
      const stepsNotCompleted = db.raw(
        `
        select count(*)
        from design_approval_steps as s
        where s.state <> ? AND s.design_id = product_designs.id
        limit 1`,
        [ApprovalStepState.COMPLETED]
      );

      switch (designFilter.value) {
        case "COMPLETED":
          query.whereRaw(db.raw(`(?) = 0`, [stepsNotCompleted]));
          break;
        case "INCOMPLETE":
          query.whereRaw(db.raw(`(?) > 0`, [stepsNotCompleted]));
          break;
        case "CHECKED_OUT":
          query.whereRaw(
            db.raw(
              `(
                select state
                from design_approval_steps as s
                where s.type = ? AND s.design_id = product_designs.id
                limit 1
              ) = ?`,
              [ApprovalStepType.CHECKOUT, ApprovalStepState.COMPLETED]
            )
          );
          break;
      }
      break;
  }
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
    .select("product_designs.*")
    .join(
      "design_approval_steps",
      "design_approval_steps.design_id",
      "product_designs.id"
    )
    .where({ "design_approval_steps.id": approvalStepId })
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
      "d.*",
      "cost_inputs.input_list AS cost_inputs",
      "events.event_list AS events",
    ])
    .from("product_designs AS d")
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
      "d.deleted_at": null,
    })
    .orderBy("d.created_at", "DESC");
}

export async function findAllWithCostsAndEvents(
  collectionIds: string[],
  trx?: Knex.Transaction
): Promise<ProductDesignDataWithMeta[]> {
  const rows = await queryWithCostsAndEvents()
    .select("cd.collection_id AS collection_id")
    .joinRaw("INNER JOIN collection_designs AS cd ON cd.design_id = d.id")
    .whereIn("cd.collection_id", collectionIds)
    .modify((query: Knex.QueryBuilder): void => {
      if (trx) {
        query.transacting(trx);
      }
    });

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
    .select("product_designs.*")
    .join("pricing_quotes", "pricing_quotes.design_id", "product_designs.id")
    .join("pricing_bids", "pricing_bids.quote_id", "pricing_quotes.id")
    .where({ "pricing_bids.id": bidId, "product_designs.deleted_at": null });
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

  const deleted = await trx(TABLE_NAME).whereIn("id", designIds).update(
    {
      deleted_at: new Date(),
    },
    "id"
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
    .select("user_id")
    .where({ id: designId, deleted_at: null })
    .modify((query: Knex.QueryBuilder): void => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .first();

  if (!ownerRow) {
    throw new ResourceNotFoundError(`Design "${designId}" could not be found.`);
  }

  return ownerRow.user_id === userId;
}

export async function getTitleAndOwnerByShipmentTracking(
  trx: Knex.Transaction,
  shipmentTrackingId: string
) {
  const row = await trx(TABLE_NAME)
    .select([
      "product_designs.id as design_id",
      "product_designs.title as design_title",
      "users.name as designer_name",
      "product_designs.user_id as designer_id",
      "collection_designs.collection_id as collection_id",
    ])
    .join("users", "users.id", "product_designs.user_id")
    .join(
      "design_approval_steps",
      "design_approval_steps.design_id",
      "product_designs.id"
    )
    .join(
      "shipment_trackings",
      "shipment_trackings.approval_step_id",
      "design_approval_steps.id"
    )
    .leftJoin(
      "collection_designs",
      "collection_designs.design_id",
      "product_designs.id"
    )
    .where({
      "shipment_trackings.id": shipmentTrackingId,
    })
    .first();

  if (!row) {
    return null;
  }

  return {
    designId: row.design_id,
    designTitle: row.design_title || "Untitled",
    designerName: row.designer_name || "Anonymous",
    designerId: row.designer_id,
    collectionId: row.collection_id,
  };
}

export async function findIdByQuoteId(
  trx: Knex.Transaction,
  quoteId: string
): Promise<string | null> {
  const row = await trx(TABLE_NAME)
    .select<{ id: string }>("product_designs.id")
    .join("pricing_quotes", "pricing_quotes.design_id", "product_designs.id")
    .where({ "pricing_quotes.id": quoteId, deleted_at: null })
    .first();

  if (!row) {
    return null;
  }

  return row.id;
}
