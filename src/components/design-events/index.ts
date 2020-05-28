import adapter from "./adapter";
import dao from "./dao";
import listeners from "./listeners";
import DesignEvent, { DesignEventRow } from "./types";
import { CalaComponent, CalaDao } from "../../services/cala-component/types";

type OwnComponent = Omit<
  CalaComponent<DesignEvent, DesignEventRow, {}>,
  "dao" | "router"
> & {
  dao: Omit<CalaDao<DesignEvent>, "update">;
};

const component: OwnComponent = {
  adapter,
  dao,
  listeners,
  notifications: {},
};

export default component;
