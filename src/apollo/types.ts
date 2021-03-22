import { Transaction } from "knex";
import { GraphQLResolveInfo } from "graphql";
import { GraphQLType } from "./published-types";
export { GraphQLType };

export interface GraphQLContextBase<Result> {
  session: AuthedState | null;
  trx: Transaction;
  earlyResult: Result | null;
}

export type Middleware<
  Args,
  ResolverContext extends GraphQLContextBase<Result>,
  Result
> = (
  args: Args,
  context: GraphQLContextBase<Result>
) => Promise<ResolverContext>;

export type MiddlewareComponent<
  Args,
  ContextFrom extends GraphQLContextBase<Result>,
  ContextTo extends GraphQLContextBase<Result>,
  Result = null
> = (args: Args, context: ContextFrom) => Promise<ContextTo>;

export type Resolver<
  Args,
  Result,
  ResolverContext extends GraphQLContextBase<Result>
> = (
  parent: any,
  args: Args,
  context: ResolverContext,
  info: GraphQLResolveInfo
) => Promise<Result>;

export type GraphQLEndpointType = "QUERY" | "MUTATION";

export interface TypesContainer {
  types?: GraphQLType[];
}

export interface GraphQLEndpoint<
  Args,
  Result,
  ResolverContext extends GraphQLContextBase<Result> = GraphQLContextBase<
    Result
  >
> {
  endpointType: GraphQLEndpointType;
  types?: GraphQLType[];
  name: string;
  signature: string;
  middleware?: Middleware<Args, ResolverContext, Result>;
  resolver: Resolver<Args, Result, ResolverContext>;
}
