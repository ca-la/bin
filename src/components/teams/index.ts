import { CalaComponent, CalaRouter } from "../../services/cala-component/types";

import router from "./routes";
import { Team, TeamRow } from "./types";

interface TeamComponent extends CalaComponent<Team, TeamRow> {
  router: CalaRouter;
}

const component: TeamComponent = {
  router,
  notifications: {},
};

export default component;
