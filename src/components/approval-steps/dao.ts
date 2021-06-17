import Knex, { Transaction } from "knex";
import { buildDao } from "../../services/cala-component/cala-dao";
import adapter from "./adapter";
import ApprovalStep, { ApprovalStepRow, approvalStepDomain } from "./types";

export const tableName = "design_approval_steps";

const dao = {
  ...buildDao<ApprovalStep, ApprovalStepRow>(
    approvalStepDomain,
    tableName,
    adapter,
    {
      orderColumn: "ordering",
      excludeDeletedAt: false,
    }
  ),
  async findBySubmissionId(
    trx: Transaction,
    id: string
  ): Promise<ApprovalStep | null> {
    return trx(tableName)
      .select("design_approval_steps.*")
      .join(
        "design_approval_submissions",
        "design_approval_submissions.step_id",
        "design_approval_steps.id"
      )
      .where({
        "design_approval_submissions.id": id,
      })
      .first()
      .then((candidate: any) => adapter.fromDb(candidate));
  },
  async findByDesign(ktx: Knex, designId: string): Promise<ApprovalStep[]> {
    return dao.find(ktx, { designId });
  },
  async findByCollection(
    ktx: Knex,
    collectionId: string
  ): Promise<ApprovalStep[]> {
    return ktx(tableName)
      .select("design_approval_steps.*")
      .join(
        "collection_designs",
        "collection_designs.design_id",
        "design_approval_steps.design_id"
      )
      .join(
        "product_designs",
        "product_designs.id",
        "collection_designs.design_id"
      )
      .where({
        "collection_designs.collection_id": collectionId,
        "product_designs.deleted_at": null,
      })
      .then(adapter.fromDbArray.bind(adapter));
  },
};

export default dao;
export const {
  createAll,
  find,
  findById,
  count,
  findBySubmissionId,
  findOne,
  findByDesign,
  findByCollection,
  update,
} = dao;
