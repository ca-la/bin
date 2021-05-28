import { test } from "../../test-helpers/fresh";
import { Test } from "tape";
import { NotFoundError, isClientError } from "./errors";
import {
  AuthenticationError,
  ForbiddenError,
  UserInputError,
  ValidationError,
} from "apollo-server-koa";
import { GraphQLError } from "graphql";

test("isClientError", async (t: Test) => {
  t.equal(isClientError(new NotFoundError("")), true, "NotFoundError");
  t.equal(
    isClientError(new AuthenticationError("")),
    true,
    "AuthenticationError"
  );
  t.equal(isClientError(new ForbiddenError("")), true, "ForbiddenError");
  t.equal(isClientError(new UserInputError("")), true, "UserInputError");
  t.equal(isClientError(new ValidationError("")), true, "ValidationError");
  t.equal(isClientError(new GraphQLError("")), false, "GraphQLError");
});
