import {
  CalaComponent,
  CalaAdapter,
  CalaDao,
  CalaRouter,
} from "../../services/cala-component/types";

import adapter from "./adapter";
import dao from "./dao";
import router from "./routes";
import listeners from "./listeners";
import { Team, TeamRow } from "./types";

interface TeamComponent extends CalaComponent<Team, TeamRow> {
  adapter: CalaAdapter<Team, TeamRow>;
  dao: CalaDao<Team>;
  router: CalaRouter;
}

const component: TeamComponent = {
  adapter,
  dao,
  router,
  notifications: {},
  listeners,
};

export default component;
