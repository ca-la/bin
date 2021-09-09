import { ForbiddenError } from "apollo-server-koa";
import {
  buildCreateEndpoint,
  CreateArgs,
  composeMiddleware,
} from "../../apollo/services";
import { UserDevice, userDeviceSchema, userDeviceDomain } from "./types";
import dao from "./dao";
import {
  GraphQLContextAuthenticated,
  requireAuth,
} from "../../apollo/middleware";
import db from "../../services/db";

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
  const { session } = context;
  const { data } = args;
  if (session.userId !== data.userId) {
    throw new ForbiddenError("Not authorized");
  }

  const existingDevice = await dao.findOne(db, {
    deviceToken: data.deviceToken,
  });
  return existingDevice ? { ...context, earlyResult: existingDevice } : context;
}

export const UserDeviceEndpoints = [
  buildCreateEndpoint<UserDevice>(
    userDeviceDomain,
    userDeviceSchema,
    dao,
    composeMiddleware(
      requireAuth,
      checkDeviceBelongsToUser,
      lookForExistingDevice
    )
  ),
];
