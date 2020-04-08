import Knex from 'knex';
import Router from 'koa-router';

import * as ApprovalStepsDAO from './dao';
import db from '../../services/db';
import requireAuth from '../../middleware/require-auth';
import { canAccessDesignInQuery } from '../../middleware/can-access-design';

const router = new Router();

interface GetApprovalStepsQuery {
  designId: string;
}

function* getApprovalStepsForDesign(
  this: AuthedContext
): Iterator<any, any, any> {
  const { designId }: GetApprovalStepsQuery = this.query;

  const found = yield db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, designId)
  );

  this.body = found;
  this.status = 200;
}

router.get('/', requireAuth, canAccessDesignInQuery, getApprovalStepsForDesign);

export default router.routes();
