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

export interface AftershipCheckpoint {
  created_at: string;
  slug: string;
  checkpoint_time?: string;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country_iso3?: string | null;
  message?: string | null;
  tag: string;
  subtag: string;
  raw_tag?: string | null;
}

export function isAftershipCheckpoint(
  candidate: UnknownObject
): candidate is AftershipCheckpoint {
  if (!candidate) {
    return false;
  }

  const keyset = new Set(Object.keys(candidate));
  return ["created_at", "slug", "tag", "subtag"].every(keyset.has.bind(keyset));
}

export interface AftershipTrackingObject {
  id: string;
  tracking_number: string;
  tag: string;
  expected_delivery?: string | null;
  shipment_delivery_date?: string | null;
  checkpoints: AftershipCheckpoint[];
}

export function isAftershipTrackingObject(
  candidate: UnknownObject
): candidate is AftershipTrackingObject {
  if (!candidate) {
    return false;
  }

  const keyset = new Set(Object.keys(candidate));
  const keysetMatch = ["id", "tracking_number", "tag", "checkpoints"].every(
    keyset.has.bind(keyset)
  );
  return keysetMatch && candidate.checkpoints.every(isAftershipCheckpoint);
}

interface AftershipTrackingCreateResponse {
  tracking: AftershipTrackingObject;
}

export function isAftershipTrackingCreateResponse(
  candidate: UnknownObject
): candidate is AftershipTrackingCreateResponse {
  return (
    Boolean(candidate) &&
    "tracking" in candidate &&
    isAftershipTrackingObject(candidate.tracking)
  );
}

interface AftershipTrackingCreateDuplicateResponse {
  meta: {
    code: 4003;
  };
  data: {
    tracking: {
      id: string;
    };
  };
}

export function isAftershipTrackingCreateDuplicateResponse(
  candidate: UnknownObject
): candidate is AftershipTrackingCreateDuplicateResponse {
  const isDuplicate =
    Boolean(candidate) &&
    "meta" in candidate &&
    candidate.meta.code === AftershipResponseCodes.ALREADY_EXISTS;
  return isDuplicate;
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

interface AftershipTrackingGetResponse {
  tracking: AftershipTrackingObject;
}

export function isAftershipTrackingGetResponse(
  candidate: UnknownObject
): candidate is AftershipTrackingGetResponse {
  return (
    Boolean(candidate) &&
    "tracking" in candidate &&
    isAftershipTrackingObject(candidate.tracking)
  );
}

interface AftershipWebhookRequestBody {
  msg: AftershipTrackingObject;
}

export function isAftershipWebhookRequestBody(
  candidate: UnknownObject
): candidate is AftershipWebhookRequestBody {
  return (
    Boolean(candidate) &&
    "msg" in candidate &&
    isAftershipTrackingObject(candidate.msg)
  );
}
