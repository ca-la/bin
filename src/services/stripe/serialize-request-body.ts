interface FlattenedKeys {
  [key: string]: string;
}

export interface StripeDataObject {
  [key: string]:
    | null
    | undefined
    | string
    | number
    | boolean
    | StripeDataObject
    | StripeDataObject[];
}

function getFlattenedKeys(
  obj: StripeDataObject,
  prefix: string = "",
  depth: number = 0
): FlattenedKeys {
  const res: FlattenedKeys = {};

  Object.keys(obj).forEach((key: string) => {
    const value = obj[key];

    const encoded = encodeURIComponent(key);
    const newPrefix =
      depth === 0 ? `${prefix}${encoded}` : `${prefix}[${encoded}]`;

    if (value === null) {
      res[newPrefix] = "null";
      return;
    }

    if (value === undefined) {
      return;
    }

    switch (typeof value) {
      case "string":
      case "number":
      case "boolean": {
        res[newPrefix] = encodeURIComponent(value);
        return;
      }
      case "object": {
        Object.assign(
          res,
          getFlattenedKeys(value as StripeDataObject, newPrefix, depth + 1)
        );
        return;
      }
      default: {
        throw new Error(`Unexpected value for serialization: ${value}`);
      }
    }
  });

  return res;
}

// A reimplementation of `require('querystring').stringify` that creates bodies
// in the format the Stripe API expects; flat parameters are URL-encoded as
// usual, but nested arrays and objects use a readable `foo[0][bar]=value`
// syntax.
export default function serializeRequestBody(body: StripeDataObject): string {
  const flattenedKeys = getFlattenedKeys(body);
  return Object.keys(flattenedKeys)
    .map((key: string) => {
      return `${key}=${flattenedKeys[key]}`;
    })
    .join("&");
}
