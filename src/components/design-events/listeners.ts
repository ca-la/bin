import { DesignEventWithMeta, domain } from "./types";
import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";

export const listeners: Listeners<DesignEventWithMeta, typeof domain> = {};

export default buildListeners<DesignEventWithMeta, typeof domain>(
  domain,
  listeners
);
