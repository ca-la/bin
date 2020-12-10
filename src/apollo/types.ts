import { Transaction } from "knex";
import { GraphQLResolveInfo } from "graphql";
import { GraphQLType } from "./published-types";
export { GraphQLType };

export interface GraphQLContextBase {
  session: AuthedState | null;
  trx: Transaction;
}

export type Middleware<Args, ResolverContext extends GraphQLContextBase> = (
  args: Args,
  context: GraphQLContextBase
) => Promise<ResolverContext>;

export type MiddlewareComponent<
  Args,
  ContextFrom extends GraphQLContextBase,
  ContextTo extends GraphQLContextBase
> = (args: Args, context: ContextFrom) => Promise<ContextTo>;

export type Resolver<
  Args,
  Result,
  ResolverContext extends GraphQLContextBase
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
  ResolverContext extends GraphQLContextBase = GraphQLContextBase
> {
  endpointType: GraphQLEndpointType;
  types?: GraphQLType[];
  name: string;
  signature: string;
  middleware?: Middleware<Args, ResolverContext>;
  resolver: Resolver<Args, Result, ResolverContext>;
}
