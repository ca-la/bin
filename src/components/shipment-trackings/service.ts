import Knex from "knex";
import { AFTERSHIP_CUSTOM_DOMAIN } from "../../config";
import * as AftershipTrackingsDAO from "../aftership-trackings/dao";

function getAftershipTrackingLink(id: string): string {
  return `${AFTERSHIP_CUSTOM_DOMAIN}/${id}`;
}

export async function buildTrackingLink(
  trx: Knex.Transaction,
  shipmentTrackingId: string
): Promise<string | null> {
  const tracking = await AftershipTrackingsDAO.findOne(trx, {
    shipmentTrackingId,
  });

  return tracking && getAftershipTrackingLink(tracking.id);
}
