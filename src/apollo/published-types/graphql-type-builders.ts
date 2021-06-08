// Along with /published-types, this module is used for publishing api-types
// so no external dependensies (except zod) are allowed
import { z } from "zod";
import { GraphQLType, GraphQLTypeBody } from "./published-types";

// Could not use lodash.intersection due to api-types policy
export function intersection<T>(list1: T[], list2: T[]) {
  const set1 = new Set<T>();
  const result = new Set<T>();

  for (const item of list1) {
    set1.add(item);
  }
  for (const item of list2) {
    if (set1.has(item)) {
      result.add(item);
    }
  }

  return Array.from(result);
}

export function schemaToGraphQLType(
  name: string,
  schema: z.AnyZodObject,
  {
    depTypes,
    type = "type",
    isUninserted = false,
    bodyPatch = {},
  }: {
    depTypes?: Record<any, GraphQLType>;
    type?: "type" | "input";
    isUninserted?: boolean;
    bodyPatch?: Record<string, string>;
  } = {}
): GraphQLType {
  const shape = isUninserted
    ? schema.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      }).shape
    : schema.shape;

  const { body, requires } = Object.entries(shape).reduce(
    (
      acc: { body: GraphQLTypeBody; requires: string[] },
      [key, value]: [string, unknown]
    ) => {
      if (bodyPatch.hasOwnProperty(key)) {
        return acc;
      }

      const zType = value as z.ZodFirstPartySchemaTypes;
      const maybeBang = zType.isNullable() ? "" : "!";

      // This type casts our unknown to one of the base Zod schema types
      const internal: z.ZodFirstPartySchemaTypes =
        zType instanceof z.ZodNullable || zType instanceof z.ZodOptional
          ? zType.unwrap()
          : zType;

      if (depTypes && depTypes[key]) {
        const depType = depTypes[key];

        return {
          body: {
            ...acc.body,
            [key]:
              internal instanceof z.ZodArray
                ? `[${depType.name}]${maybeBang}`
                : `${depType.name}${maybeBang}`,
          },
          requires: acc.requires.includes(depType.name)
            ? acc.requires
            : [...acc.requires, depType.name],
        };
      }

      if (
        internal instanceof z.ZodString ||
        internal instanceof z.ZodNativeEnum
      ) {
        return {
          ...acc,
          body: {
            ...acc.body,
            [key]: `String${maybeBang}`,
          },
        };
      }

      if (internal instanceof z.ZodDate) {
        return {
          ...acc,
          body: {
            ...acc.body,
            [key]: `GraphQLDateTime${maybeBang}`,
          },
        };
      }

      if (internal instanceof z.ZodNumber) {
        return {
          ...acc,
          body: {
            ...acc.body,
            [key]: `Int${maybeBang}`,
          },
        };
      }

      if (internal instanceof z.ZodBoolean) {
        return {
          ...acc,
          body: {
            ...acc.body,
            [key]: `Boolean${maybeBang}`,
          },
        };
      }

      throw new Error(
        `Found an unprocessable field ${key} when building a type "${name}"`
      );
    },
    {
      body: isUninserted ? { id: "String" } : {},
      requires: [],
    }
  );

  return {
    name,
    type,
    body: { ...body, ...bodyPatch },
    requires,
  };
}

export function buildGraphQLListType(modelType: GraphQLType): GraphQLType {
  return {
    name: `${modelType.name}List`,
    type: "type",
    body: {
      meta: "ListMeta",
      list: `[${modelType.name}]`,
    },
    requires: [modelType.name],
  };
}

function isGraphQLPrimitive(attributeType: string): boolean {
  switch (attributeType) {
    case "Int":
    case "String":
    case "Float":
    case "Boolean":
    case "ID":
      return true;
    default:
      return false;
  }
}

function isAttributeTypeAvailableForFilteringOrSorting(
  attributeType: string
): boolean {
  // Only alphanumeric and ! are allowed – it means primitive values
  if (!/^[a-z][a-z0-9]*!?$/i.test(attributeType.trim())) {
    return false;
  }
  const coreType = attributeType.trim().replace(/!$/, "").trim();

  return isGraphQLPrimitive(coreType);
}

export function buildGraphQLSortType<Model extends Record<string, any>>(
  modelType: GraphQLType,
  { allowedAttributes }: { allowedAttributes?: (keyof Model)[] } = {}
): GraphQLType {
  const allAttributes = Object.keys(modelType.body);

  const sortAttributes = allowedAttributes
    ? intersection(allowedAttributes, allAttributes)
    : allAttributes;

  if (modelType.type !== "type") {
    throw new Error(
      `Can't build sort input: wrong model type ${modelType.type}`
    );
  }

  const body: Record<string, string> = {};
  sortAttributes.forEach((attributeKey: keyof Model) => {
    const attributeType: string = (modelType.body as Record<
      keyof Model,
      string
    >)[attributeKey]!;
    if (isAttributeTypeAvailableForFilteringOrSorting(attributeType)) {
      body[attributeKey as string] = "Int";
    }
  });
  return {
    name: `${modelType.name}Sort`,
    type: "input",
    body,
  };
}

export function buildGraphQLFilterType<Model extends Record<string, any>>(
  modelType: GraphQLType,
  { allowedAttributes }: { allowedAttributes?: (keyof Model)[] } = {}
): GraphQLType {
  const allAttributes = Object.keys(modelType.body);

  const filterAttributes = allowedAttributes
    ? intersection(allowedAttributes, allAttributes)
    : allAttributes;

  if (modelType.type !== "type") {
    throw new Error(`Can't build filter: wrong model type ${modelType.type}`);
  }

  const body: Record<string, string> = {};
  filterAttributes.forEach((attributeKey: keyof Model) => {
    const attributeType: string = (modelType.body as Record<
      keyof Model,
      string
    >)[attributeKey]!;
    if (isAttributeTypeAvailableForFilteringOrSorting(attributeType)) {
      body[attributeKey as string] = attributeType.replace(/!$/, "");
    }
  });
  return {
    name: `${modelType.name}Filter`,
    type: "input",
    body,
  };
}
