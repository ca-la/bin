import db from "../../services/db";
import requireAuth = require("../../middleware/require-auth");
import * as ParticipantsDAO from "./dao";
import syncTeamUsersLabelWithCollaborators from "./sync-team-users-label-with-collaborators";
import { canAccessDesignInQuery } from "../../middleware/can-access-design";

function* getParticipants(
  this: TrxContext<AuthedContext<{}, {}, { designId: string }>>
) {
  const { designId } = this.query;

  const participants = yield ParticipantsDAO.findByDesign(db, designId);

  this.body = syncTeamUsersLabelWithCollaborators(participants);
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
