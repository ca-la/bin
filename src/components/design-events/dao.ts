import Knex from "knex";
import rethrow from "pg-rethrow";

import { buildDao } from "../../services/cala-component/cala-dao";
import adapter, { withMetaAdapter } from "./adapter";
import DesignEvent, {
  DesignEventRow,
  domain,
  DesignEventWithMeta,
  DesignEventWithMetaRow,
  withMetaDomain,
  ACTIVITY_STREAM_EVENTS,
} from "./types";
import { DuplicateAcceptRejectError } from "./errors";
import { taskTypesById } from "../tasks/templates";
import filterError from "../../services/filter-error";

const TABLE_NAME = "design_events";

const baseDao = {
  ...buildDao<DesignEvent, DesignEventRow>(domain, TABLE_NAME, adapter, {
    orderColumn: "created_at",
    excludeDeletedAt: false,
  }),
};

function addMeta(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .select([
      "actor.name as actor_name",
      "actor.role as actor_role",
      "actor.email as actor_email",
      "target.name as target_name",
      "target.role as target_role",
      "target.email as target_email",
      "target_team.title as target_team_name",
      "design_approval_submissions.title as submission_title",
      "design_approval_steps.title as step_title",
      "shipment_trackings.description as shipment_tracking_description",
      "shipment_tracking_events.tag as shipment_tracking_event_tag",
      "shipment_tracking_events.subtag as shipment_tracking_event_subtag",
    ])
    .join("users as actor", "actor.id", "design_events.actor_id")
    .leftJoin("users as target", "target.id", "design_events.target_id")
    .leftJoin(
      "teams as target_team",
      "target_team.id",
      "design_events.target_team_id"
    )
    .leftJoin(
      "design_approval_submissions",
      "design_approval_submissions.id",
      "design_events.approval_submission_id"
    )
    .leftJoin(
      "design_approval_steps",
      "design_approval_steps.id",
      "design_events.approval_step_id"
    )
    .leftJoin(
      "shipment_trackings",
      "shipment_trackings.id",
      "design_events.shipment_tracking_id"
    )
    .leftJoin(
      "shipment_tracking_events",
      "shipment_tracking_events.id",
      "design_events.shipment_tracking_event_id"
    );
}

const withMetaDao = {
  ...buildDao<DesignEventWithMeta, DesignEventWithMetaRow>(
    withMetaDomain,
    TABLE_NAME,
    withMetaAdapter,
    {
      orderColumn: "created_at",
      queryModifier: addMeta,
      excludeDeletedAt: false,
    }
  ),
};

const dao = {
  create: async (
    trx: Knex.Transaction,
    data: DesignEvent
  ): Promise<DesignEvent> =>
    baseDao
      .create(trx, data)
      .catch(rethrow)
      .catch(
        filterError(
          rethrow.ERRORS.UniqueViolation,
          (err: typeof rethrow.ERRORS.UniqueViolation) => {
            if (err.constraint === "one_accept_or_reject_per_bid") {
              throw new DuplicateAcceptRejectError(
                "This bid has already been accepted or rejected"
              );
            }
            throw err;
          }
        )
      ),
  createAll: baseDao.createAll,

  find: withMetaDao.find,
  findOne: withMetaDao.findOne,
  findById: withMetaDao.findById,

  findApprovalStepEvents: async (
    trx: Knex.Transaction,
    designId: string,
    approvalStepId: string
  ): Promise<DesignEventWithMeta[]> => {
    const designEventRows = (
      await trx(TABLE_NAME)
        .select("design_events.*")
        .modify(addMeta)
        .orderBy("design_events.created_at", "asc")
        .whereIn("design_events.type", ACTIVITY_STREAM_EVENTS)
        .whereRaw(
          `design_events.design_id = ?
          AND (
            design_events.approval_step_id = ?
            OR design_events.approval_step_id IS NULL
          )`,
          [designId, approvalStepId]
        )
    ).map((item: DesignEventWithMetaRow) => {
      return {
        ...item,
        task_type_title:
          item.task_type_id && taskTypesById[item.task_type_id]
            ? taskTypesById[item.task_type_id].title
            : null,
      };
    });
    return withMetaAdapter.fromDbArray(designEventRows);
  },
};

export default dao;

export const {
  create,
  createAll,
  find,
  findOne,
  findById,
  findApprovalStepEvents,
} = dao;
