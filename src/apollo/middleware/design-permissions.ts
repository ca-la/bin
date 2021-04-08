import { GraphQLContextBase } from "../types";
import {
  getDesignPermissions,
  Permissions,
} from "../../services/get-permissions";
import { GraphQLContextWithDesign } from "./design";
import { AuthenticationError, ForbiddenError } from "apollo-server-koa";

interface GraphQLContextWithDesignAndPermissions<Result>
  extends GraphQLContextBase<Result> {
  designId: string;
  designPermissions: Permissions;
}

export async function attachDesignPermissions<Args, Result>(
  _: Args,
  context: GraphQLContextWithDesign<Result>
): Promise<GraphQLContextWithDesignAndPermissions<Result>> {
  const { designId, session } = context;
  if (!session) {
    throw new AuthenticationError("Not authenticated");
  }
  const { role, userId } = session;

  const designPermissions = await getDesignPermissions({
    designId,
    sessionRole: role,
    sessionUserId: userId,
  });

  return {
    ...context,
    designPermissions,
  };
}

export async function requireDesignViewPermissions<Args, Result>(
  _: Args,
  context: GraphQLContextWithDesignAndPermissions<Result>
): Promise<GraphQLContextWithDesignAndPermissions<Result>> {
  const { designPermissions } = context;

  if (!designPermissions.canView) {
    throw new ForbiddenError("Not authorized to view this design");
  }

  return context;
}
