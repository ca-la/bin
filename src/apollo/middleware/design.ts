import * as z from "zod";
import { GraphQLContextBase } from "../types";
import ApprovalStepsDAO from "../../components/approval-steps/dao";
import * as CanvasesDAO from "../../components/canvases/dao";
import { UserInputError } from "apollo-server-koa";
import { NotFoundError } from "../services";
import db from "../../services/db";

export interface GraphQLContextWithDesign<Result>
  extends GraphQLContextBase<Result> {
  designId: string;
}

const filterWithDesignIdSchema = z.object({
  designId: z.string(),
});

export async function attachDesignFromDesignId<
  Args extends { designId: string },
  Result
>(args: Args, context: GraphQLContextBase<Result>) {
  return {
    ...context,
    designId: args.designId,
  };
}

export async function attachDesignFromCanvasId<
  Args extends { canvasId: string },
  Result
>(args: Args, context: GraphQLContextBase<Result>) {
  const canvas = await CanvasesDAO.findById(args.canvasId);
  if (!canvas) {
    throw new NotFoundError(`Could not find canvas ${args.canvasId}`);
  }
  return {
    ...context,
    designId: canvas.designId,
  };
}

export async function attachDesignFromAnnotationInput<
  Args extends { annotation: { canvasId: string } },
  Result
>(args: Args, context: GraphQLContextBase<Result>) {
  const canvas = await CanvasesDAO.findById(args.annotation.canvasId);
  if (!canvas) {
    throw new NotFoundError(
      `Could not find canvas ${args.annotation.canvasId}`
    );
  }
  return {
    ...context,
    designId: canvas.designId,
  };
}

export async function attachDesignFromCanvasInput<
  Args extends { canvas: { designId: string } },
  Result
>(args: Args, context: GraphQLContextBase<Result>) {
  return {
    ...context,
    designId: args.canvas.designId,
  };
}

export async function attachDesignFromFilter<
  Args extends { filter: any },
  Result
>(args: Args, context: GraphQLContextBase<Result>) {
  const result = filterWithDesignIdSchema.safeParse(args.filter);
  if (!result.success) {
    throw new UserInputError("Filter should contain designId");
  }
  return {
    ...context,
    designId: result.data.designId,
  };
}

export async function getAttachDesignByApprovalStep<Args, Result>(
  getApprovalStepId: (
    args: Args,
    context: GraphQLContextBase<Result>
  ) => Promise<string>
) {
  return async function attachDesignByApprovalStep(
    args: Args,
    context: GraphQLContextBase<Result>
  ) {
    const approvalStepId = await getApprovalStepId(args, context);
    const approvalStep = await ApprovalStepsDAO.findById(db, approvalStepId);
    if (!approvalStep) {
      throw new NotFoundError("ApprovalStep not found");
    }

    return {
      ...context,
      designId: approvalStep.designId,
    };
  };
}
