import db from "../../../services/db";
import * as ProductDesignsDAO from "../dao/dao";

export function* getPaidDesigns(this: AuthedContext): Iterator<any, any, any> {
  this.assert(this.state.role === "ADMIN", 403);

  const trx = yield db.transaction();
  const { limit, offset } = this.query;

  try {
    const paid = yield ProductDesignsDAO.findPaidDesigns(trx, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    this.body = paid;
    this.status = 200;
    yield trx.commit();
  } catch (err) {
    trx.rollback();
    throw err;
  }
}
