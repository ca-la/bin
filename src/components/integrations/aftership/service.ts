import Knex from "knex";

import * as AftershipTrackingsDAO from "../../aftership-trackings/dao";
import { AftershipTracking } from "../../aftership-trackings/types";
import {
  fromJson,
  isAftershipTrackingCreateResponse,
  Courier,
  isAftershipCourierListResponse,
  isAftershipTrackingGetResponse,
} from "./types";
import { getFetcher } from "../../../services/get-fetcher";
import { AFTERSHIP_API_KEY } from "../../../config";
import {
  ShipmentTracking,
  DeliveryStatus,
} from "../../shipment-trackings/types";

const AFTERSHIP_BASE_URL = "https://api.aftership.com/v4";

const fetcher = getFetcher({
  apiBase: AFTERSHIP_BASE_URL,
  headerBase: {
    "aftership-api-key": `${AFTERSHIP_API_KEY}`,
  },
  serializer: JSON.stringify.bind(JSON),
});

async function createTracking(
  trx: Knex.Transaction,
  shipmentTracking: ShipmentTracking
): Promise<AftershipTracking> {
  const { courier, trackingId, id: shipmentTrackingId } = shipmentTracking;
  const requestBody = {
    tracking: {
      slug: courier,
      tracking_number: trackingId,
    },
  };

  const [, body] = await fetcher({
    method: "post",
    path: "/trackings",
    data: requestBody,
  });

  const { data } = fromJson(body);

  if (!isAftershipTrackingCreateResponse(data)) {
    throw new Error(
      `Aftership did not respond with a valid tracking object
Request: ${JSON.stringify(requestBody, null, 2)}
Response: ${JSON.stringify(body, null, 2)}`
    );
  }

  return AftershipTrackingsDAO.create(trx, {
    createdAt: new Date(),
    id: data.tracking.id,
    shipmentTrackingId,
  });
}

async function getMatchingCouriers(
  shipmentTrackingId: string
): Promise<Courier[]> {
  const requestBody = {
    tracking: {
      tracking_number: shipmentTrackingId,
    },
  };
  const [, body] = await fetcher({
    method: "post",
    path: "/couriers/detect",
    data: requestBody,
  });

  const { data } = fromJson(body);

  if (!isAftershipCourierListResponse(data)) {
    throw new Error(
      `Aftership did not respond with a valid list of couriers
Request: ${JSON.stringify(requestBody, null, 2)}
Response: ${JSON.stringify(body, null, 2)}`
    );
  }

  return data.couriers.map((courier: Courier) => ({
    slug: courier.slug,
    name: courier.name,
  }));
}

async function getDeliveryStatus(
  courier: string,
  trackingId: string
): Promise<DeliveryStatus> {
  const [, body] = await fetcher({
    method: "get",
    path: `/trackings/${courier}/${trackingId}`,
  });

  const { data } = fromJson(body);

  if (!isAftershipTrackingGetResponse(data)) {
    throw new Error(`Aftership did not response with a valid tracking object
Response: ${JSON.stringify(body, null, 2)}`);
  }

  const {
    tag,
    expected_delivery: expectedDelivery,
    shipment_delivery_date: deliveryDate,
  } = data.tracking;

  return {
    tag,
    expectedDelivery:
      expectedDelivery !== null ? new Date(expectedDelivery) : null,
    deliveryDate: deliveryDate !== null ? new Date(deliveryDate) : null,
  };
}

export const AFTERSHIP_SECRET_TOKEN = "e4ebfe72-3780-4e93-b3e4-6117a0f4333c";

export default {
  createTracking,
  getMatchingCouriers,
  getDeliveryStatus,
};
