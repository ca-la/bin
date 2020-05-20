import sinon from "sinon";
import * as Analytics from "../services/analytics";

sinon.stub(Analytics, "trackMetric").resolves();
