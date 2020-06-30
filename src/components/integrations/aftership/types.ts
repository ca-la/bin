export enum Courier {
  USPS = "usps",
  UPS = "ups",
  FEDEX = "fedex",
  DHL = "dhl",
}

export function isCourier(candidate: string): candidate is Courier {
  return (Object.values(Courier) as string[]).includes(candidate);
}

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

export function fromJson(body: any): AftershipResponse {
  if (!isAftershipResponse(body)) {
    throw new TypeError("Body is not in expected Aftership envelope format");
  }

  const {
    meta: { code },
  } = body;

  if (code === 200 || code === 201) {
    return body as AftershipResponseSuccess;
  }

  return body as AftershipResponseFailure;
}

interface AftershipTrackingCreateResponse {
  tracking: {
    id: string;
  };
}

export function isAftershipTrackingCreateResponse(
  candidate: object
): candidate is AftershipTrackingCreateResponse {
  return (
    Boolean(candidate) &&
    "tracking" in candidate &&
    "id" in (candidate as { tracking: object }).tracking
  );
}
