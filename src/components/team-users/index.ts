import {
  CalaComponent,
  CalaAdapter,
  CalaDao,
  CalaRouter,
} from "../../services/cala-component/types";

import adapter from "./adapter";
import dao from "./dao";
import router from "./routes";
import { TeamUser, TeamUserRow } from "./types";

interface TeamUserComponent extends CalaComponent<TeamUser, TeamUserRow> {
  adapter: CalaAdapter<TeamUser, TeamUserRow>;
  dao: CalaDao<TeamUser>;
  router: CalaRouter;
}

const component: TeamUserComponent = {
  adapter,
  dao,
  router,
  notifications: {},
};

export default component;
