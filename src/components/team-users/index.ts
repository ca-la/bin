import { CalaComponent, CalaRouter } from "../../services/cala-component/types";

import router from "./routes";
import dao, { rawDao } from "./dao";
import {
  TeamUserDb,
  TeamUserDbRow,
  TeamUser,
  Role as TeamUserRole,
} from "./types";
import listeners from "./listeners";
import notifications, { NotificationLayerSchema } from "./notifications";

export const TeamUsersDAO = dao;
export const RawTeamUsersDAO = rawDao;
export { TeamUser, TeamUserDbRow, TeamUserRole, dao };

interface TeamUserComponent
  extends CalaComponent<TeamUserDb, TeamUserDbRow, NotificationLayerSchema> {
  router: CalaRouter;
}

const component: TeamUserComponent = {
  router,
  notifications,
  listeners,
};

export default component;
