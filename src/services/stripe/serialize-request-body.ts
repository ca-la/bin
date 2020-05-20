interface FlattenedKeys {
  [key: string]: string;
}

interface JsonObject {
  [key: string]: any;
}

function getFlattenedKeys(
  obj: JsonObject,
  prefix: string = "",
  depth: number = 0
): FlattenedKeys {
  const res: FlattenedKeys = {};

  Object.keys(obj).forEach((key: string) => {
    const value = obj[key];

    const encoded = encodeURIComponent(key);
    const newPrefix =
      depth === 0 ? `${prefix}${encoded}` : `${prefix}[${encoded}]`;

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      res[newPrefix] = encodeURIComponent(value);
      return;
    }

    if (typeof value === "object") {
      Object.assign(res, getFlattenedKeys(value, newPrefix, depth + 1));
      return;
    }

    throw new Error(`Unexpected value for serialization: ${value}`);
  });

  return res;
}

// A reimplementation of `require('querystring').stringify` that creates bodies
// in the format the Stripe API expects; flat parameters are URL-encoded as
// usual, but nested arrays and objects use a readable `foo[0][bar]=value`
// syntax.
export default function serializeRequestBody(body: JsonObject): string {
  const flattenedKeys = getFlattenedKeys(body);
  return Object.keys(flattenedKeys)
    .map((key: string) => {
      return `${key}=${flattenedKeys[key]}`;
    })
    .join("&");
}
