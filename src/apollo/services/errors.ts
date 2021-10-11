/* tslint:disable:max-classes-per-file */
import { ApolloError } from "apollo-server-koa";
import { GraphQLError } from "graphql";
import { UpgradeTeamBody } from "../../components/teams";

export class NotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, "NOT_FOUND");
    Object.defineProperty(this, "name", { value: "NotFoundError" });
  }
}

export class UpgradeTeamError extends ApolloError {
  public upgradeTeamBody: UpgradeTeamBody;
  constructor(upgradeTeamBody: UpgradeTeamBody) {
    super(upgradeTeamBody.title, "UPGRADE_TEAM");
    this.upgradeTeamBody = upgradeTeamBody;
    Object.defineProperty(this, "name", { value: "UpgradeTeamError" });
  }
}

export function isClientError(error: GraphQLError) {
  switch (error.extensions && error.extensions.code) {
    case "UNAUTHENTICATED":
    case "FORBIDDEN":
    case "BAD_USER_INPUT":
    case "NOT_FOUND":
    case "GRAPHQL_VALIDATION_FAILED":
    case "UPGRADE_TEAM":
      return true;
  }
  return false;
}
