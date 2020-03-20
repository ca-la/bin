import Knex from 'knex';

import db from '../../../services/db';
import * as ApprovalStepsDAO from '../../approval-steps/dao';

export function* getApprovalStepsForDesign(
  this: AuthedContext
): Iterator<any, any, any> {
  const { designId } = this.params;
  const found = yield db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, designId)
  );

  this.body = found;
  this.status = 200;
}
