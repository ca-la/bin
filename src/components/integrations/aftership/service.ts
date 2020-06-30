import Knex from "knex";

import * as AftershipTrackingsDAO from "../../aftership-trackings/dao";
import { AftershipTracking } from "../../aftership-trackings/types";
import {
  isCourier,
  fromJson,
  isAftershipTrackingCreateResponse,
} from "./types";
import { getFetcher } from "../../../services/get-fetcher";
import { AFTERSHIP_CUSTOM_DOMAIN, AFTERSHIP_API_KEY } from "../../../config";

const fetcher = getFetcher({
  apiBase: AFTERSHIP_CUSTOM_DOMAIN,
  headerBase: {
    "aftership-api-key": `${AFTERSHIP_API_KEY}`,
  },
  serializer: JSON.stringify.bind(JSON),
});

async function createTracking(
  trx: Knex.Transaction,
  courier: string,
  shipmentTrackingId: string
): Promise<AftershipTracking> {
  if (!isCourier(courier)) {
    throw new TypeError(
      `Invalid courier for Aftership tracking object: ${courier}`
    );
  }

  const [, body] = await fetcher({
    method: "post",
    path: "/trackings",
    data: {
      tracking: {
        slug: courier,
        tracking_number: shipmentTrackingId,
      },
    },
  });

  const { data } = fromJson(body);

  if (!isAftershipTrackingCreateResponse(data)) {
    throw new Error("Aftership did not respond with a valid tracking object");
  }

  return AftershipTrackingsDAO.create(trx, {
    createdAt: new Date(),
    id: data.tracking.id,
    shipmentTrackingId,
  });
}

export default {
  createTracking,
};
