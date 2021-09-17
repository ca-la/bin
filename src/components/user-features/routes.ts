import convert from "koa-convert";
import requireAuth from "../../middleware/require-auth";
import { StrictContext } from "../../router-context";
import db from "../../services/db";

import * as UserFeaturesDAO from "./dao";

interface GetListContext extends StrictContext<string[]> {
  state: AuthedState;
}

async function getList(ctx: GetListContext) {
  const { userId } = ctx.state;

  ctx.body = await UserFeaturesDAO.findNamesByUser(db, userId);
  ctx.status = 200;
}

export default {
  prefix: "/user-features",
  routes: {
    "/": {
      get: [requireAuth, convert.back(getList)],
    },
  },
};
