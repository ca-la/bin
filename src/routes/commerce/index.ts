import Router from "koa-router";
import Proxy from "koa-proxy";
import { COMMERCE_HOST, COMMERCE_TOKEN } from "../../config";

import requireAuth = require("../../middleware/require-auth");
import requireAdmin = require("../../middleware/require-admin");
import { Request } from "koa";

const router = new Router();

router.use("*", requireAuth);
router.use("*", requireAdmin);

const proxy = Proxy({
  host: COMMERCE_HOST,
  map(path: string) {
    return path.replace(/^\/commerce/, "/api");
  },
  requestOptions(_: Request, opts: any) {
    opts.headers["Authorization"] = `Token ${COMMERCE_TOKEN}`;
    return opts;
  },
});

const legacyProxy = function* (
  this: AuthedContext,
  next: () => Promise<any>
): Iterator<any, any, any> {
  yield proxy(this, next);
};

router.get("*", legacyProxy);
router.post("*", legacyProxy);
router.put("*", legacyProxy);
router.patch("*", legacyProxy);
router.del("*", legacyProxy);

export = router.routes();
