import { ForbiddenError } from "apollo-server-koa";
import {
  buildCreateEndpoint,
  CreateArgs,
  composeMiddleware,
} from "../../apollo/services";
import { UserDevice, userDeviceSchema, domain } from "./types";
import dao from "./dao";
import {
  GraphQLContextAuthenticated,
  requireAuth,
} from "../../apollo/middleware";

export async function checkDeviceBelongsToUser(
  args: CreateArgs<UserDevice>,
  context: GraphQLContextAuthenticated<UserDevice>
): Promise<GraphQLContextAuthenticated<UserDevice>> {
  const { session } = context;
  if (session.userId !== args.data.userId) {
    throw new ForbiddenError("Not authorized");
  }

  return context;
}

export async function lookForExistingDevice(
  args: CreateArgs<UserDevice>,
  context: GraphQLContextAuthenticated<UserDevice>
): Promise<GraphQLContextAuthenticated<UserDevice>> {
  const { session, trx } = context;
  const { data } = args;
  if (session.userId !== data.userId) {
    throw new ForbiddenError("Not authorized");
  }

  const existingDevice = await dao.findOne(trx, {
    deviceToken: data.deviceToken,
  });
  return existingDevice ? { ...context, earlyResult: existingDevice } : context;
}

export const UserDeviceEndpoints = [
  buildCreateEndpoint<UserDevice>(
    domain,
    userDeviceSchema,
    dao,
    composeMiddleware(
      requireAuth,
      checkDeviceBelongsToUser,
      lookForExistingDevice
    )
  ),
];
