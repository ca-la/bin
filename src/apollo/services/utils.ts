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
  Result,
  C1 extends GraphQLContextBase<Result>,
  C2 extends GraphQLContextBase<Result>
>(
  m1: MiddlewareComponent<Args, GraphQLContextBase<Result>, C1, Result>,
  m2: MiddlewareComponent<Args, C1, C2, Result>
): Middleware<Args, C2, Result>;

function composeMiddleware<
  Args,
  Result,
  C1 extends GraphQLContextBase<Result>,
  C2 extends GraphQLContextBase<Result>,
  C3 extends GraphQLContextBase<Result>
>(
  m1: MiddlewareComponent<Args, GraphQLContextBase<Result>, C1, Result>,
  m2: MiddlewareComponent<Args, C1, C2, Result>,
  m3: MiddlewareComponent<Args, C2, C3, Result>
): Middleware<Args, C3, Result>;

function composeMiddleware<
  Args,
  Result,
  C1 extends GraphQLContextBase<Result>,
  C2 extends GraphQLContextBase<Result>,
  C3 extends GraphQLContextBase<Result>,
  C4 extends GraphQLContextBase<Result>
>(
  m1: MiddlewareComponent<Args, GraphQLContextBase<Result>, C1, Result>,
  m2: MiddlewareComponent<Args, C1, C2, Result>,
  m3: MiddlewareComponent<Args, C2, C3, Result>,
  m4: MiddlewareComponent<Args, C3, C4, Result>
): Middleware<Args, C4, Result>;

function composeMiddleware<Result>(...middlewareList: any[]) {
  return async (args: any, context: GraphQLContextBase<Result>) => {
    let currentContext: any = context;
    for (const middleware of middlewareList) {
      currentContext = await middleware(args, currentContext);
      if (currentContext.earlyResult !== null) {
        return currentContext;
      }
    }
    return currentContext;
  };
}

export { composeMiddleware };
