import { GraphQLContextBase } from "../types";
import {
  getDesignPermissions,
  Permissions,
} from "../../services/get-permissions";
import { GraphQLContextWithDesign } from "./design";

interface GraphQLContextWithDesignAndPermissions extends GraphQLContextBase {
  designId: string;
  designPermissions: Permissions;
}

export async function attachDesignPermissions<Args>(
  _: Args,
  context: GraphQLContextWithDesign
): Promise<GraphQLContextWithDesignAndPermissions> {
  const { designId, session } = context;
  if (!session) {
    throw new Error("Not authenticated");
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

export async function requireDesignViewPermissions<Args>(
  _: Args,
  context: GraphQLContextWithDesignAndPermissions
): Promise<GraphQLContextWithDesignAndPermissions> {
  const { designPermissions } = context;

  if (!designPermissions.canView) {
    throw new Error("Not authorized to view this design");
  }

  return context;
}
