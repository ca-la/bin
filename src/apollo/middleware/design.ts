import * as z from "zod";
import { GraphQLContextBase } from "../types";
import ApprovalStepsDAO from "../../components/approval-steps/dao";

export interface GraphQLContextWithDesign extends GraphQLContextBase {
  designId: string;
}

const filterWithDesignIdSchema = z.object({
  designId: z.string(),
});

export async function attachDesignFromFilter<Args extends { filter: any }>(
  args: Args,
  context: GraphQLContextBase
) {
  const result = filterWithDesignIdSchema.safeParse(args.filter);
  if (!result.success) {
    throw new Error("Filter should contain designId");
  }
  return {
    ...context,
    designId: result.data.designId,
  };
}

export async function getAttachDesignByApprovalStep<Args>(
  getApprovalStepId: (
    args: Args,
    context: GraphQLContextBase
  ) => Promise<string>
) {
  return async function attachDesignByApprovalStep(
    args: Args,
    context: GraphQLContextBase
  ) {
    const { trx } = context;
    const approvalStepId = await getApprovalStepId(args, context);
    const approvalStep = await ApprovalStepsDAO.findById(trx, approvalStepId);
    if (!approvalStep) {
      throw new Error("ApprovalStep not found");
    }

    return {
      ...context,
      designId: approvalStep.designId,
    };
  };
}
