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
  data: object;
}

interface AftershipResponseFailure {
  meta: Failure;
  data: {};
}

type AftershipResponse = AftershipResponseSuccess | AftershipResponseFailure;

function isAftershipResponse(
  candidate: object
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
  candidate: object
): candidate is AftershipTrackingCreateResponse {
  return (
    Boolean(candidate) &&
    "tracking" in candidate &&
    "id" in (candidate as { tracking: object }).tracking &&
    "tracking_number" in (candidate as { tracking: object }).tracking
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
  candidate: object
): candidate is AftershipCourierListResponse {
  return Boolean(candidate) && "total" in candidate && "couriers" in candidate;
}
