import { toPairs } from "lodash";
import {
  GraphQLType,
  GraphQLContextBase,
  TypesContainer,
  Middleware,
  MiddlewareComponent,
} from "../types";

interface AwaitingType {
  type: GraphQLType;
  blockers: Set<string>;
}

export function extractSortedTypes(endpoints: TypesContainer[]) {
  const awaitingTypes = new Set<AwaitingType>();
  for (const endpoint of endpoints) {
    if (endpoint.types) {
      for (const type of endpoint.types) {
        awaitingTypes.add({
          type,
          blockers: new Set(type.requires),
        });
      }
    }
  }
  const sorted: GraphQLType[] = [];
  for (
    let i = awaitingTypes.size - 1;
    i >= 0 && awaitingTypes.size > 0;
    i = i - 1
  ) {
    for (const awaitingType of awaitingTypes) {
      if (awaitingType.blockers.size === 0) {
        for (const otherType of awaitingTypes) {
          if (otherType.blockers.has(awaitingType.type.name)) {
            otherType.blockers.delete(awaitingType.type.name);
          }
        }
        sorted.push(awaitingType.type);
        awaitingTypes.delete(awaitingType);
      }
    }
  }

  if (awaitingTypes.size > 0) {
    const firstNotResolved: AwaitingType = awaitingTypes.values().next().value;
    throw new Error(
      `Could not resolve dependencies for GraphQL type "${
        firstNotResolved.type.name
      }". The missing dependencies are: ${(
        firstNotResolved.type.requires || []
      ).join(", ")}`
    );
  }

  return sorted;
}

function assembleTypeBody(type: GraphQLType): string {
  switch (type.type) {
    case "enum":
      return type.body.trim();
    default:
      return toPairs(type.body)
        .map(([k, v]: [string, string]) => `  ${k}: ${v}`)
        .join("\n")
        .trim();
  }
}

export function buildTypes(sortedTypes: GraphQLType[]) {
  return sortedTypes
    .map(
      (type: GraphQLType) =>
        `${type.type} ${type.name} {\n  ${assembleTypeBody(type)}\n}`
    )
    .join("\n");
}

function composeMiddleware<
  Args,
  C1 extends GraphQLContextBase,
  C2 extends GraphQLContextBase
>(
  m1: MiddlewareComponent<Args, GraphQLContextBase, C1>,
  m2: MiddlewareComponent<Args, C1, C2>
): Middleware<Args, C2>;

function composeMiddleware<
  Args,
  C1 extends GraphQLContextBase,
  C2 extends GraphQLContextBase,
  C3 extends GraphQLContextBase
>(
  m1: MiddlewareComponent<Args, GraphQLContextBase, C1>,
  m2: MiddlewareComponent<Args, C1, C2>,
  m3: MiddlewareComponent<Args, C2, C3>
): Middleware<Args, C3>;

function composeMiddleware<
  Args,
  C1 extends GraphQLContextBase,
  C2 extends GraphQLContextBase,
  C3 extends GraphQLContextBase,
  C4 extends GraphQLContextBase
>(
  m1: MiddlewareComponent<Args, GraphQLContextBase, C1>,
  m2: MiddlewareComponent<Args, C1, C2>,
  m3: MiddlewareComponent<Args, C2, C3>,
  m4: MiddlewareComponent<Args, C3, C4>
): Middleware<Args, C4>;

function composeMiddleware(...middlewareList: any[]) {
  return async (args: any, context: GraphQLContextBase) => {
    let result: any = context;
    for (const middleware of middlewareList) {
      result = await middleware(args, result);
    }
    return result;
  };
}

export { composeMiddleware };
