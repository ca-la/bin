import makeRequest from "./make-request";

interface Options {
  customerId: string;
  cardToken: string;
}

interface Response {
  id: string;
  last4: string;
}

export default function attachSource(options: Options): Promise<Response> {
  const { customerId, cardToken } = options;
  if (!customerId || !cardToken) {
    throw new Error("Missing required information");
  }

  return makeRequest<Response>({
    method: "post",
    path: `/customers/${customerId}/sources`,
    data: {
      source: cardToken,
    },
  });
}
