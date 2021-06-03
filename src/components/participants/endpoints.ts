import Knex from "knex";
import {
  GraphQLEndpoint,
  ForbiddenError,
  UserInputError,
  NotFoundError,
  GraphQLContextBase,
  useRequireAuth,
} from "../../apollo";
import * as GraphQLTypes from "./graphql-types";
import ApprovalStepsDAO from "../approval-steps/dao";
import { getDesignPermissions } from "../../services/get-permissions";
import { Participant } from "./types";
import * as AnnotationsDAO from "../product-design-canvas-annotations/dao";
import * as CanvasesDAO from "../canvases/dao";
import * as ParticipantsDAO from "./dao";
import syncTeamUsersLabelWithCollaborators from "./sync-team-users-label-with-collaborators";

export interface GetParticipantsArgs {
  designId: string | null;
  annotationId: string | null;
  approvalStepId: string | null;
}

async function extractDesignIdFromArgs(ktx: Knex, args: GetParticipantsArgs) {
  const { designId, annotationId, approvalStepId } = args;
  if (designId) {
    return designId;
  }
  if (approvalStepId) {
    const approvalStep = await ApprovalStepsDAO.findById(ktx, approvalStepId);
    if (!approvalStep) {
      throw new NotFoundError(`ApprovalStep #${approvalStepId} not found`);
    }
    return approvalStep.designId;
  }
  if (annotationId) {
    const annotation = await AnnotationsDAO.findById(annotationId);
    if (!annotation) {
      throw new NotFoundError(`Annotation ${annotationId} not found`);
    }
    const canvas = await CanvasesDAO.findById(annotation.canvasId, ktx);
    if (!canvas) {
      throw new NotFoundError(`Canvas ${annotation.canvasId} not found`);
    }
    return canvas.designId;
  }
  throw new UserInputError(
    "getParticipants endpoint requires one of [designId, annotationId, approvalStepId] to be set"
  );
}

const getParticipants: GraphQLEndpoint<
  GetParticipantsArgs,
  Participant[],
  GraphQLContextBase<Participant[]>
> = {
  endpointType: "Query",
  types: [GraphQLTypes.Participant],
  name: "getParticipants",
  signature: `(designId: String, approvalStepId: String, annotationId: String): [${GraphQLTypes.Participant.name}]`,
  resolver: async (
    _: unknown,
    args: GetParticipantsArgs,
    context: GraphQLContextBase<Participant[]>
  ) => {
    const { trx, session } = useRequireAuth(context);
    const { userId, role } = session;

    const designId = await extractDesignIdFromArgs(trx, args);
    const designPermissions = await getDesignPermissions({
      designId,
      sessionRole: role,
      sessionUserId: userId,
    });

    if (!designPermissions.canView) {
      throw new ForbiddenError(
        "Not authorized to view participants on this design"
      );
    }
    const participants = await ParticipantsDAO.findByDesign(trx, designId);
    return syncTeamUsersLabelWithCollaborators(participants);
  },
};

export const ParticipantEndpoints = [getParticipants];
