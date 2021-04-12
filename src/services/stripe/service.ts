import { getInvoicesAfterSpecified } from "./api";
import { Invoice } from "./types";

export async function fetchInvoicesFrom(
  fromId: string,
  {
    maxIterations = 100,
    limit = 100,
  }: {
    maxIterations?: number;
    limit?: number;
  } = {}
): Promise<Invoice[]> {
  const result: Invoice[] = [];
  for (let i = 0, id = fromId; i < maxIterations; i = i + 1) {
    const fetchResult = await getInvoicesAfterSpecified(id, { limit });
    result.push.apply(result, fetchResult.data);
    id = fetchResult.data[0].id;
    if (!fetchResult.has_more) {
      break;
    }
  }

  return result;
}
