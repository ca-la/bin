import { Transaction } from 'knex';
import { buildDao } from '../../services/cala-component/cala-dao';
import adapter from './adapter';
import ApprovalStep, { ApprovalStepRow, domain } from './types';
import './listeners';

const tableName = 'design_approval_steps';

const dao = {
  ...buildDao<ApprovalStep, ApprovalStepRow>(domain, tableName, adapter, {
    orderColumn: 'ordering'
  }),
  async findBySubmissionId(
    trx: Transaction,
    id: string
  ): Promise<ApprovalStep | null> {
    return trx(tableName)
      .select('design_approval_steps.*')
      .join(
        'design_approval_submissions',
        'design_approval_submissions.step_id',
        'design_approval_steps.id'
      )
      .where({
        'design_approval_submissions.id': id
      })
      .first()
      .then((candidate: any) => adapter.fromDb(candidate));
  },
  async findByDesign(
    trx: Transaction,
    designId: string
  ): Promise<ApprovalStep[]> {
    return dao.find(trx, { designId });
  }
};

export default dao;
export const {
  createAll,
  find,
  findById,
  findBySubmissionId,
  findOne,
  findByDesign,
  update
} = dao;
