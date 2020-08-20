import { buildDao } from "../../services/cala-component/cala-dao";
import { Team, TeamRow } from "./types";
import adapter from "./adapter";

export default buildDao<Team, TeamRow>("Team", "teams", adapter, {
  orderColumn: "created_at",
});
