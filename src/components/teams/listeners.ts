import uuid from "node-uuid";
import { RouteCreated } from "../../services/pubsub/cala-events";
import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";

import TeamUsersDAO from "../team-users/dao";
import { Role } from "../team-users/types";
import { TeamDb } from "./types";

const domain = "Team" as const;

export const listeners: Listeners<TeamDb, typeof domain> = {
  "route.created": async (
    event: RouteCreated<TeamDb, typeof domain>
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

export default buildListeners<TeamDb, typeof domain>(domain, listeners);
