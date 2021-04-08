import { ApolloError } from "apollo-server-koa";
import { GraphQLError } from "graphql";

export class NotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, "NOT_FOUND");
    Object.defineProperty(this, "name", { value: "NotFoundError" });
  }
}

export function isClientError(error: GraphQLError) {
  switch (error.extensions && error.extensions.code) {
    case "UNAUTHENTICATED":
    case "FORBIDDEN":
    case "BAD_USER_INPUT":
    case "NOT_FOUND":
      return true;
  }
  return false;
}
