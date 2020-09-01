import { CalaComponent, CalaRouter } from "../../services/cala-component/types";

import router from "./routes";
import { TeamUserDb, TeamUserDbRow } from "./types";

interface TeamUserComponent extends CalaComponent<TeamUserDb, TeamUserDbRow> {
  router: CalaRouter;
}

const component: TeamUserComponent = {
  router,
  notifications: {},
};

export default component;
