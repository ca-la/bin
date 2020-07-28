interface Success {
  code: 200;
}

interface Created {
  code: 201;
}

interface Failure {
  code: number;
  message: string;
  type: string;
}

interface AftershipResponseSuccess {
  meta: Success | Created;
  data: UnknownObject;
}

interface AftershipResponseFailure {
  meta: Failure;
  data: EmptyObject;
}

type AftershipResponse = AftershipResponseSuccess | AftershipResponseFailure;

function isAftershipResponse(
  candidate: UnknownObject
): candidate is AftershipResponse {
  return Boolean(candidate) && "meta" in candidate && "data" in candidate;
}

enum AftershipResponseCodes {
  SUCCESS = 200,
  CREATED = 201,
  ALREADY_EXISTS = 4003,
}

export function fromJson(body: any): AftershipResponse {
  if (!isAftershipResponse(body)) {
    throw new TypeError("Body is not in expected Aftership envelope format");
  }

  const {
    meta: { code },
  } = body;

  if (Object.values(AftershipResponseCodes).includes(code)) {
    return body as AftershipResponseSuccess;
  }

  return body as AftershipResponseFailure;
}

interface AftershipTrackingCreateResponse {
  tracking: {
    id: string;
    tracking_number: string;
  };
}

export function isAftershipTrackingCreateResponse(
  candidate: UnknownObject
): candidate is AftershipTrackingCreateResponse {
  return (
    Boolean(candidate) &&
    "tracking" in candidate &&
    "id" in (candidate as { tracking: UnknownObject }).tracking &&
    "tracking_number" in (candidate as { tracking: UnknownObject }).tracking
  );
}

export interface Courier {
  slug: string;
  name: string;
}

interface AftershipCourierListResponse {
  total: number;
  couriers: Courier[];
}

export function isAftershipCourierListResponse(
  candidate: UnknownObject
): candidate is AftershipCourierListResponse {
  return Boolean(candidate) && "total" in candidate && "couriers" in candidate;
}

export interface DeliveryStatus {
  tag: string;
  expectedDelivery: Date | null;
  deliveryDate: Date | null;
}

interface AftershipTrackingGetResponse {
  tracking: {
    tag: string;
    expected_delivery: string | null;
    shipment_delivery_date: string | null;
  };
}

export function isAftershipTrackingGetResponse(
  candidate: UnknownObject
): candidate is AftershipTrackingGetResponse {
  return (
    Boolean(candidate) &&
    "tracking" in candidate &&
    "tag" in (candidate as { tracking: UnknownObject }).tracking &&
    "shipment_delivery_date" in
      (candidate as { tracking: UnknownObject }).tracking &&
    "expected_delivery" in (candidate as { tracking: UnknownObject }).tracking
  );
}
