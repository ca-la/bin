import serializeRequestBody, {
  StripeDataObject,
} from "./serialize-request-body";
import { STRIPE_SECRET_KEY } from "../../config";
import InvalidPaymentError = require("../../errors/invalid-payment");
import StripeError = require("../../errors/stripe");
import { getFetcher } from "../get-fetcher";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

interface GetRequest {
  method: "get";
  path: string;
  additionalHeaders?: Record<string, string>;
  apiBase?: string;
}

interface PostRequest {
  method: "post";
  path: string;
  data?: StripeDataObject;
  idempotencyKey?: string;
  additionalHeaders?: Record<string, string>;
  apiBase?: string;
}

interface DeleteRequest extends Omit<PostRequest, "method"> {
  method: "delete";
}

type RequestWithBody = PostRequest | DeleteRequest;
type RequestOptions = GetRequest | RequestWithBody;

function isRequestWithBody(candidate: any): candidate is RequestWithBody {
  return "data" in candidate || "idempotencyKey" in candidate;
}

const CREDENTIALS = Buffer.from(`${STRIPE_SECRET_KEY}:`).toString("base64");

export default async function makeRequest<ResponseType extends object = {}>(
  requestOptions: RequestOptions
): Promise<ResponseType> {
  if (isRequestWithBody(requestOptions)) {
    if (requestOptions.idempotencyKey) {
      requestOptions.additionalHeaders = {
        ...requestOptions.additionalHeaders,
        "Idempotency-Key": requestOptions.idempotencyKey,
      };
    }

    if (requestOptions.data !== undefined) {
      requestOptions.additionalHeaders = {
        ...requestOptions.additionalHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
      };
    }
  }

  const fetcher = getFetcher({
    apiBase: STRIPE_API_BASE,
    headerBase: {
      Authorization: `Basic ${CREDENTIALS}`,
    },
    serializer: serializeRequestBody,
  });

  const [status, body]: [number, ResponseType] = await fetcher(requestOptions);
  switch (status) {
    case 200:
      return body;
    case 402:
      throw new InvalidPaymentError(
        ((body as any).error && (body as any).error.message) ||
          "Your payment method was declined"
      );
    default:
      throw new StripeError((body as any).error);
  }
}
