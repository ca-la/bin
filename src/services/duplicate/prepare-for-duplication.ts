import uuid from "node-uuid";
import { omit } from "lodash";

interface BaseResource {
  createdAt?: Date;
  id: string;
}

/**
 * Prepares any domain-object resource to be inserted as a duplicate.
 */
export default function prepareForDuplication<T extends BaseResource>(
  resource: T,
  additionalFields?: Partial<T>
): T {
  const newFields = Object.assign({}, { id: uuid.v4() }, additionalFields);
  return omit(Object.assign({}, resource, newFields), "createdAt");
}
