import uuid from "node-uuid";

import requireAuth from "../../middleware/require-auth";
import useTransaction from "../../middleware/use-transaction";

import TeamsDAO from "./dao";
import { isUnsavedTeam } from "./types";

function* createTeam(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  const { body } = this.request;

  if (!isUnsavedTeam(body)) {
    this.throw(400, "You must provide a title for the new team");
  }

  this.body = yield TeamsDAO.create(trx, {
    id: uuid.v4(),
    title: body.title,
    createdAt: new Date(),
    deletedAt: null,
  });
  this.status = 201;
}

export default {
  prefix: "/teams",
  routes: {
    "/": {
      post: [useTransaction, requireAuth, createTeam],
    },
  },
};
