import uuid from "node-uuid";
import { RouteCreated } from "../../services/pubsub/cala-events";
import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";

import TeamUsersDAO from "../team-users/dao";
import { Role } from "../team-users/types";
import { Team } from "./types";

const domain = "Team" as const;

export const listeners: Listeners<Team, typeof domain> = {
  "route.created": async (
    event: RouteCreated<Team, typeof domain>
  ): Promise<void> => {
    const { trx, actorId, created } = event;
    await TeamUsersDAO.create(trx, {
      teamId: created.id,
      userId: actorId,
      id: uuid.v4(),
      role: Role.ADMIN,
    });
  },
};

export default buildListeners<Team, typeof domain>(domain, listeners);
