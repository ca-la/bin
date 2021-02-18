import db from "../../services/db";
import requireAuth = require("../../middleware/require-auth");
import * as ParticipantsDAO from "./dao";
import { canAccessDesignInQuery } from "../../middleware/can-access-design";

function* getParticipants(
  this: TrxContext<AuthedContext<{}, {}, { designId: string }>>
) {
  const { designId } = this.query;

  this.body = yield ParticipantsDAO.findByDesign(db, designId);
  this.status = 200;
}

export default {
  prefix: "/participants",
  routes: {
    "/": {
      get: [requireAuth, canAccessDesignInQuery, getParticipants],
    },
  },
};
