import makeRequest from './make-request';

interface Options {
  stripePlanId: string;
  stripeCustomerId: string;
  stripeSourceId: string;
}

interface Response {
  id: string;
}

export default async function createSubscription(
  options: Options
): Promise<Response> {
  const { stripePlanId, stripeCustomerId, stripeSourceId } = options;

  return await makeRequest<Response>({
    method: 'post',
    path: '/subscriptions',
    data: {
      items: [{ plan: stripePlanId }],
      customer: stripeCustomerId,
      default_source: stripeSourceId
    }
  });
}
