import uuid from "node-uuid";
import { z } from "zod";
import { intersection } from "lodash";
import { GraphQLResolveInfo } from "graphql";
import { CalaDao } from "../../services/cala-component/types";
import { GraphQLContextAuthenticated } from "../middleware";
import { GraphQLType, GraphQLTypeBody } from "../published-types";
import { GraphQLContextBase, Middleware } from "../types";
import { QueryBuilder } from "knex";
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info";
import { UserInputError } from "apollo-server-koa";

export function schemaToGraphQLType(
  name: string,
  schema: z.AnyZodObject,
  {
    depTypes,
    type = "type",
    isUninserted = false,
  }: {
    depTypes?: Record<any, GraphQLType>;
    type?: "type" | "input";
    isUninserted?: boolean;
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
            [key]: `${depType.name}${maybeBang}`,
          },
          requires: [...acc.requires, depType.name],
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

      return acc;
    },
    { body: isUninserted ? { id: "String" } : {}, requires: [] }
  );

  return {
    name,
    type,
    body,
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

export interface FindArgs<Model> {
  limit?: number;
  offset?: number;
  sort?: Record<keyof Model, number | null>;
  filter: Partial<Model>;
}

export interface FindResult<Model> {
  meta: { total: number | null };
  list: Model[];
}

function translateSort(sort: Record<string, number | null>): string {
  const keys = Object.keys(sort);
  const pairs: string[] = keys
    .filter((key: string) => Boolean(sort[key]))
    .map((key: string) => `"${key}" ${sort[key]! < 0 ? "DESC" : "ASC"}`);

  return pairs.join(",");
}

interface FindOptions<Model extends Record<string, any>> {
  allowedFilterAttributes?: (keyof Model)[];
  allowedSortAttributes?: (keyof Model)[];
}

function pluralizeModelTypeName(modelTypeName: string) {
  return `${modelTypeName}s`;
}

function isMetaTotalRequested(
  listTypeName: string,
  info: GraphQLResolveInfo
): boolean {
  try {
    const parsed = parseResolveInfo(info);
    if (parsed) {
      const rootField = parsed.fieldsByTypeName[listTypeName];
      if (rootField) {
        const metaTree = Object.values(rootField).find(
          (f: ResolveTree) => f.name === "meta"
        );
        if (metaTree) {
          const metaField = metaTree.fieldsByTypeName.ListMeta;
          const totalTree = Object.values(metaField).find(
            (f: any) => f.name === "total"
          );
          if (totalTree) {
            return true;
          }
        }
      }
    }
  } catch (err) {
    return false;
  }
  return false;
}

export function buildFindEndpoint<
  Model extends Record<string, any>,
  ResolverContext extends GraphQLContextBase<
    FindResult<Model>
  > = GraphQLContextBase<FindResult<Model>>
>(
  modelTypeName: string,
  schema: z.AnyZodObject,
  dao: CalaDao<Model>,
  middleware: Middleware<FindArgs<Model>, ResolverContext, FindResult<Model>>,
  {
    allowedFilterAttributes = [],
    allowedSortAttributes = [],
  }: FindOptions<Model> = {}
) {
  const modelType = schemaToGraphQLType(modelTypeName, schema);
  const listType = buildGraphQLListType(modelType);

  const types: GraphQLType[] = [modelType, listType];
  const signatureParts = ["limit: Int = 20", "offset: Int = 0"];
  if (allowedFilterAttributes.length) {
    const filterType = buildGraphQLFilterType(modelType, {
      allowedAttributes: allowedFilterAttributes,
    });
    types.push(filterType);
    signatureParts.push(`filter: ${filterType.name}`);
  }
  if (allowedSortAttributes.length) {
    const sortType = buildGraphQLSortType(modelType, {
      allowedAttributes: allowedSortAttributes,
    });
    types.push(sortType);
    signatureParts.push(`sort: ${sortType.name}`);
  }

  return {
    endpointType: "Query",
    types,
    name: `Find${pluralizeModelTypeName(modelTypeName)}`,
    signature: `(${signatureParts.join(", ")}): ${listType.name}`,
    middleware,
    resolver: async (
      _: any,
      args: FindArgs<Model>,
      context: GraphQLContextAuthenticated<FindResult<Model>>,
      info: GraphQLResolveInfo
    ) => {
      const { limit, offset, sort, filter } = args;
      const { trx } = context;

      if ((limit && limit < 0) || (offset && offset < 0)) {
        throw new UserInputError("Offset / Limit cannot be negative!");
      }

      const items = await dao.find(trx, filter, (query: QueryBuilder) => {
        let result: QueryBuilder = query;
        if (limit !== undefined) {
          result = result.limit(limit);
        }
        if (offset) {
          result = result.offset(offset);
        }
        if (sort) {
          result = result.clearOrder().orderByRaw(translateSort(sort));
        }
        return result;
      });
      const total = isMetaTotalRequested(listType.name, info)
        ? await dao.count(trx, filter)
        : null;

      return {
        meta: { total },
        list: items,
      };
    },
  };
}

export interface CreateArgs<T extends ModelWithMeta> {
  data: T;
}

export function buildCreateEndpoint<
  Model extends ModelWithMeta,
  ResolverContext extends GraphQLContextBase<Model> = GraphQLContextBase<Model>
>(
  modelTypeName: string,
  schema: z.AnyZodObject,
  dao: CalaDao<Model>,
  middleware: Middleware<CreateArgs<Model>, ResolverContext, Model>
) {
  const modelType = schemaToGraphQLType(modelTypeName, schema);
  const inputType = schemaToGraphQLType(`${modelTypeName}Input`, schema, {
    isUninserted: true,
    type: "input",
  });
  const types: GraphQLType[] = [modelType, inputType];

  return {
    endpointType: "Mutation",
    types,
    name: `Create${modelTypeName}`,
    signature: `(data: ${inputType.name}): ${modelType.name}`,
    middleware,
    resolver: async (
      _: any,
      args: CreateArgs<Model>,
      context: GraphQLContextAuthenticated<Model>
    ) => {
      const { data } = args;
      const { trx } = context;

      const createdAt = new Date();
      return await dao.create(trx, {
        ...data,
        id: data.id || uuid.v4(),
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      });
    },
  };
}
