import { intersection, forEach } from "lodash";
import { GraphQLResolveInfo } from "graphql";
import { CalaDao } from "../../services/cala-component/types";
import { GraphQLContextAuthenticated } from "../middleware";
import { ZodObject, ZodTypeAny } from "zod";
import { GraphQLType, GraphQLTypeBody } from "../published-types";
import { GraphQLContextBase, Middleware } from "../types";
import { QueryBuilder } from "knex";
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info";
import { isNullable } from "../../services/zod-helpers";

export function schemaToGraphQLType(
  name: string,
  schema: ZodObject<any>,
  depTypes?: Record<any, GraphQLType>
): GraphQLType {
  const body: GraphQLTypeBody = {};
  const shape = schema.shape;
  const requires: string[] = [];
  forEach(shape, (type: ZodTypeAny, key: string) => {
    const typeJson = type.toJSON() as { t: string; innerType?: { t: string } };
    const innerType = typeJson.innerType ? typeJson.innerType.t : typeJson.t;
    const isTypeNullable = isNullable(type);
    if (depTypes && depTypes[key]) {
      body[key] = `${depTypes[key].name}${isTypeNullable ? "" : "!"}`;
      requires.push(depTypes[key].name);
    }
    switch (innerType) {
      case "string":
        body[key] = `String${isTypeNullable ? "" : "!"}`;
        break;
    }
  });
  return {
    name,
    type: "type",
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

interface FindArgs<Model> {
  limit?: number;
  offset?: number;
  sort?: Record<keyof Model, number | null>;
  filter: Partial<Model>;
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
  ResolverContext extends GraphQLContextBase = GraphQLContextBase
>(
  modelTypeName: string,
  schema: ZodObject<any>,
  dao: CalaDao<Model>,
  middleware: Middleware<FindArgs<Model>, ResolverContext>,
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
    endpointType: "QUERY",
    types,
    name: `Find${pluralizeModelTypeName(modelTypeName)}`,
    signature: `(${signatureParts.join(", ")}): ${listType.name}`,
    middleware,
    resolver: async (
      _: any,
      args: FindArgs<Model>,
      context: GraphQLContextAuthenticated,
      info: GraphQLResolveInfo
    ) => {
      const { limit, offset, sort, filter } = args;
      const { trx } = context;

      if ((limit && limit < 0) || (offset && offset < 0)) {
        throw new Error("Offset / Limit cannot be negative!");
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
