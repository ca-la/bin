import uuid from "node-uuid";
import { z } from "zod";
import { GraphQLResolveInfo } from "graphql";
import { CalaDao } from "../../services/cala-component/types";
import { GraphQLContextAuthenticated } from "../middleware";
import { GraphQLType } from "../published-types/published-types";
import { GraphQLContextBase, Middleware } from "../types";
import { QueryBuilder } from "knex";
import { parseResolveInfo, ResolveTree } from "graphql-parse-resolve-info";
import { UserInputError } from "apollo-server-koa";
import {
  schemaToGraphQLType,
  buildGraphQLListType,
  buildGraphQLFilterType,
  buildGraphQLSortType,
} from "../published-types/graphql-type-builders";
import db from "../../services/db";

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
      __: GraphQLContextAuthenticated<FindResult<Model>>,
      info: GraphQLResolveInfo
    ) => {
      const { limit, offset, sort, filter } = args;

      if ((limit && limit < 0) || (offset && offset < 0)) {
        throw new UserInputError("Offset / Limit cannot be negative!");
      }

      const items = await dao.find(db, filter, (query: QueryBuilder) => {
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
        ? await dao.count(db, filter)
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
      const { transactionProvider } = context;

      const createdAt = new Date();

      const trx = await transactionProvider();

      try {
        const created = await dao.create(trx, {
          ...data,
          id: data.id || uuid.v4(),
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
        });

        await trx.commit();

        return created;
      } catch (err) {
        return trx.rollback(err);
      }
    },
  };
}
