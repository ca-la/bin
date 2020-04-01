import Knex from 'knex';
import uuid from 'node-uuid';

import ApprovalStep, {
  ApprovalStepState
} from '../../components/approval-steps/domain-object';
import User from '../../components/users/domain-object';
import ProductDesign from '../../components/product-designs/domain-objects/product-design';
import { findById as findUserById } from '../../components/users/dao';
import createUser from '../create-user';
import { generateDesign } from './product-design';
import * as ApprovalStepDAO from '../../components/approval-steps/dao';
import { findById as findDesignById } from '../../components/product-designs/dao';

interface ApprovalStepWithResources {
  approvalStep: ApprovalStep;
  design: ProductDesign;
  createdBy: User;
}

export default async function generateApprovalStep(
  trx: Knex.Transaction,
  options: Partial<ApprovalStep & { createdBy?: string }> = {}
): Promise<ApprovalStepWithResources> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  const { design } = options.designId
    ? { design: await findDesignById(options.designId) }
    : { design: await generateDesign({ userId: user.id }, trx) };

  if (!design) {
    throw new Error('Canvas was unable to be found or created!');
  }

  const [approvalStep] = await ApprovalStepDAO.createAll(trx, [
    {
      state: ApprovalStepState.CURRENT,
      ordering: 0,
      title: 'Checkout',
      designId: design.id,
      id: options.id || uuid.v4()
    }
  ]);

  return {
    approvalStep,
    design,
    createdBy: user
  };
}
