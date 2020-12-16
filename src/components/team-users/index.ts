import { CalaComponent, CalaRouter } from "../../services/cala-component/types";

import router from "./routes";
import dao from "./dao";
import { TeamUserDb, TeamUserDbRow, TeamUser } from "./types";

export { TeamUser, dao };

interface TeamUserComponent extends CalaComponent<TeamUserDb, TeamUserDbRow> {
  router: CalaRouter;
}

const component: TeamUserComponent = {
  router,
  notifications: {},
};

export default component;
