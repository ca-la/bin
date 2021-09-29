import { toPairs } from "lodash";
import {
  GraphQLType,
  GraphQLTypeFieldDescription,
  GraphQLContextBase,
  TypesContainer,
  Middleware,
  MiddlewareComponent,
} from "../types";

export function extractSortedTypes(endpoints: TypesContainer[]) {
  const awaitingTypes = new Map<GraphQLType, Set<string>>();
  for (const endpoint of endpoints) {
    if (endpoint.types) {
      for (const type of endpoint.types) {
        awaitingTypes.set(type, new Set(type.requires));
      }
    }
  }
  const sorted: GraphQLType[] = [];
  for (
    let i = awaitingTypes.size - 1;
    i >= 0 && awaitingTypes.size > 0;
    i = i - 1
  ) {
    for (const [awaitingType, blockers] of awaitingTypes) {
      if (blockers.size === 0) {
        for (const [, otherTypeBlockers] of awaitingTypes) {
          if (otherTypeBlockers.has(awaitingType.name)) {
            otherTypeBlockers.delete(awaitingType.name);
          }
        }
        sorted.push(awaitingType);
        awaitingTypes.delete(awaitingType);
      }
    }
  }

  if (awaitingTypes.size > 0) {
    const [type, requires] = awaitingTypes.entries().next().value;
    throw new Error(
      `Could not resolve dependencies for GraphQL type "${
        type.name
      }". The missing dependencies are: ${Array.from(requires).join(", ")}`
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
        .map(([k, v]: [string, GraphQLTypeFieldDescription]) =>
          typeof v === "string"
            ? `  ${k}: ${v}`
            : `  ${k}${v.signature}: ${v.type}`
        )
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
