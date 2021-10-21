import Knex from "knex";
import { omit } from "lodash";
import uuid from "node-uuid";

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
import { ProductType } from "../../../domain-objects/pricing";
import { Role } from "../../users/types";
import attachBidId from "./attach-bid-id";
import {
  ApprovalStepState,
  ApprovalStepType,
} from "../../approval-steps/types";
import { TEAM_USER_ROLE_TO_COLLABORATOR_ROLE } from "../../team-users/types";
import { Roles } from "../../../published-types";
import { BaseProductDesign, DesignFilter } from "../types";
import { baseAdapter } from "../adapter";

export const TABLE_NAME = "product_designs";

/**
 * Find all designs that the user is a collaborator on.
 */
export async function findAllDesignsThroughCollaboratorAndTeam(options: {
  userId: string;
  role?: Role;
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  filters?: DesignFilter[];
  trx?: Knex.Transaction;
}): Promise<ProductDesignWithApprovalSteps[]> {
  const TEAM_USER_EDITOR_ROLES = Object.entries(
    TEAM_USER_ROLE_TO_COLLABORATOR_ROLE
  )
    .filter(([, value]: [string, Roles]) => value === "EDIT")
    .map(([key]: [string, Roles]) => key);

  const TEAM_USER_VIEWER_ROLES = Object.entries(
    TEAM_USER_ROLE_TO_COLLABORATOR_ROLE
  )
    .filter(([, value]: [string, Roles]) => value === "VIEW")
    .map(([key]: [string, Roles]) => key);

  const TEAM_USER_PARTNER_ROLES = Object.entries(
    TEAM_USER_ROLE_TO_COLLABORATOR_ROLE
  )
    .filter(([, value]: [string, Roles]) => value === "PARTNER")
    .map(([key]: [string, Roles]) => key);

  const result = await queryWithCollectionMeta(db)
    .leftJoin(
      db.raw(
        `
(
  SELECT array_agg(subquery.role) as collaborator_roles, array_remove(array_agg(subquery.team_role), null) as team_roles, subquery.product_design_id FROM (
  SELECT c.role, team_users.role as team_role,  pd2.id as product_design_id
    FROM product_designs AS pd2
    JOIN collaborators AS c ON c.design_id = pd2.id
    LEFT JOIN team_users ON c.team_id = team_users.team_id
  WHERE (c.user_id = :userId OR team_users.user_id = :userId)
    AND (c.cancelled_at IS NULL OR c.cancelled_at > now())
    AND team_users.deleted_at IS NULL
    AND pd2.deleted_at IS NULL
  UNION
  SELECT c.role, team_users.role as team_role, pd3.id as product_design_id
    FROM collaborators AS c
    JOIN collections AS co ON co.id = c.collection_id
    JOIN collection_designs AS cd ON cd.collection_id = co.id
    JOIN product_designs AS pd3 ON pd3.id = cd.design_id
    LEFT JOIN team_users ON c.team_id = team_users.team_id
  WHERE (c.user_id = :userId OR team_users.user_id = :userId)
    AND (c.cancelled_at IS NULL OR c.cancelled_at > now())
    AND co.deleted_at IS NULL
    AND team_users.deleted_at IS NULL
    AND pd3.deleted_at IS NULL
  UNION
  SELECT
    CASE
      WHEN tu.role = ANY(:editorRoles) THEN 'EDIT'
      WHEN tu.role = ANY(:viewerRoles) THEN 'VIEW'
      WHEN tu.role = ANY(:partnerRoles) THEN 'PARTNER'
    END AS role, tu.role as team_role, pd4.id as product_design_id
    FROM team_users as tu
    JOIN teams ON teams.id = tu.team_id
    JOIN collections ON collections.team_id = teams.id
    JOIN collection_designs AS cd ON cd.collection_id = collections.id
    JOIN product_designs AS pd4 ON pd4.id = cd.design_id
  WHERE (tu.user_id = :userId)
    AND collections.deleted_at IS NULL
    AND tu.deleted_at IS NULL
    AND pd4.deleted_at IS NULL
  ) AS subquery
  GROUP BY subquery.product_design_id
) AS design_collaborators
  ON design_collaborators.product_design_id = product_designs.id
`,
        {
          userId: options.userId,
          editorRoles: TEAM_USER_EDITOR_ROLES,
          viewerRoles: TEAM_USER_VIEWER_ROLES,
          partnerRoles: TEAM_USER_PARTNER_ROLES,
        }
      )
    )
    .select(
      db.raw(
        "to_json(design_collaborators.collaborator_roles) as collaborator_roles"
      )
    )
    .select(db.raw("to_json(design_collaborators.team_roles) as team_roles"))
    .select(
      db.raw(
        `
(
  SELECT count(*)
    FROM design_events
   WHERE design_events.design_id = product_designs.id
     AND type = 'COMMIT_QUOTE'
) > 0 AS is_checked_out`
      )
    )
    .whereRaw(`product_designs.id in (design_collaborators.product_design_id)`)
    .groupBy("collaborator_roles")
    .groupBy("team_roles")
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
      if (options.trx) {
        query.transacting(options.trx);
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
    case "DRAFT": {
      query.whereNull("collection_designs.collection_id");
      break;
    }
    case "COLLECTION": {
      if (designFilter.value === "*") {
        query.whereNotNull("collection_designs.collection_id");
      } else {
        query.where({ "collection_designs.collection_id": designFilter.value });
      }
      break;
    }
    case "TEAM": {
      query.where({ "collections.team_id": designFilter.value });
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

export function queryWithCostsAndEvents(ktx: Knex = db): Knex.QueryBuilder {
  return ktx
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
  ktx: Knex = db
): Promise<ProductDesignDataWithMeta[]> {
  const rows = await queryWithCostsAndEvents(ktx)
    .select("cd.collection_id AS collection_id")
    .joinRaw("INNER JOIN collection_designs AS cd ON cd.design_id = d.id")
    .whereIn("cd.collection_id", collectionIds);

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

export async function findPaidDesigns(
  trx: Knex.Transaction,
  options?: {
    offset?: number;
    limit?: number;
    productType?: ProductType;
  }
): Promise<ProductDesign[]> {
  const rows = await queryWithCollectionMeta(trx)
    .innerJoin(
      "pricing_quotes",
      "pricing_quotes.design_id",
      "product_designs.id"
    )
    .joinRaw(
      `
      inner join design_events as events
        on events.quote_id = pricing_quotes.id
        and events.type = 'COMMIT_QUOTE'
    `
    )
    .groupBy(["product_designs.id", "events.created_at"])
    .orderBy("events.created_at", "desc")
    .modify(limitOrOffset(options?.limit, options?.offset))
    .modify((query: Knex.QueryBuilder) => {
      if (options?.productType) {
        query.andWhere({
          "pricing_quotes.product_type": options.productType,
        });
      }
    });

  const hydrated = rows.map((row: ProductDesignRow) => new ProductDesign(row));

  return hydrated;
}

export interface ProductDesignMinimalRow {
  id: string;
  title: string;
  created_at: Date;
  user_id: string;
}

export async function findMinimalByIds(
  ids: string[],
  ktx: Knex = db
): Promise<ProductDesignMinimalRow[]> {
  const result = await ktx<ProductDesignMinimalRow>(TABLE_NAME)
    .select(["id", "title", "created_at", "user_id"])
    .whereIn("id", ids)
    .orderBy("created_at", "desc");

  if (result.length !== ids.length) {
    throw new Error("Query returned different number of rows than requested");
  }

  return result;
}

interface DesignInput {
  title: string;
  userId: string;
  id?: string;
}

export async function create(
  trx: Knex.Transaction,
  { title, userId, id }: DesignInput
): Promise<ProductDesign> {
  const ids = await trx<{ id: string; title: string; user_id: string }>(
    TABLE_NAME
  ).insert(
    {
      title,
      user_id: userId,
      id: id || uuid.v4(),
    },
    "id"
  );

  if (ids.length !== 1) {
    throw new Error("Could not create new ProductDesign");
  }

  const created = await queryWithCollectionMeta(trx)
    .where({ "product_designs.id": ids[0] })
    .first();

  return new ProductDesign(created);
}

export async function findBaseById(
  ktx: Knex,
  id: string
): Promise<BaseProductDesign> {
  const row = await ktx(TABLE_NAME).select("*").where("id", id).first();

  if (!row) {
    throw new ResourceNotFoundError(`Design #${id} not found`);
  }

  return baseAdapter.fromDb({
    ...row,
    preview_image_urls: row.preview_image_urls || [],
  });
}
