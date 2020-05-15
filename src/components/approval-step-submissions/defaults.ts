import Knex from 'knex';
import * as uuid from 'node-uuid';

import * as ApprovalStepsDAO from '../approval-steps/dao';
import * as PricingProductTypesDAO from '../pricing-product-types/dao';
import ApprovalStepSubmission, {
  ApprovalStepSubmissionState,
  ApprovalStepSubmissionArtifactType
} from './domain-object';
import ApprovalStep, {
  ApprovalStepType
} from '../approval-steps/domain-object';

export async function getDefaultsByDesign(
  trx: Knex.Transaction,
  designId: string
): Promise<ApprovalStepSubmission[]> {
  const now = new Date();
  const productType = await PricingProductTypesDAO.findByDesignId(designId);
  if (!productType) {
    throw new Error(
      `Unable to find a PricingProductType for design "${designId}".`
    );
  }

  const stepsByType = buildStepByType(
    await ApprovalStepsDAO.findByDesign(trx, designId)
  );

  let submissions: ApprovalStepSubmission[] = [];
  if (productType.complexity === 'BLANK') {
    submissions = [
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.TECHNICAL_DESIGN].id,
        title: 'Review technical design'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.SAMPLE].id,
        title: 'Review sample photo'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
        title: 'Confirm receipt of TOP and CALA keep samples'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
        title: 'Review product photography'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
        title: 'Confirm receipt of final shipment'
      }
    ];
  } else {
    submissions = [
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.TECHNICAL_DESIGN].id,
        title: 'Review technical design'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.SAMPLE].id,
        title: 'Review material sample'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.SAMPLE].id,
        title: 'Review final sample'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.SAMPLE].id,
        title: 'Review bulk graded specs'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
        title: 'Confirm quality inspection'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
        title: 'Confirm receipt of TOP and CALA keep samples'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
        title: 'Review product photography'
      },
      {
        id: uuid.v4(),
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        collaboratorId: null,
        createdAt: new Date(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
        title: 'Confirm receipt of final shipment'
      }
    ];
  }

  return submissions.map((sub: ApprovalStepSubmission, index: number) => ({
    ...sub,
    createdAt: new Date(now.getTime() + index)
  }));
}

function buildStepByType(
  steps: ApprovalStep[]
): { [stepType in ApprovalStepType]: ApprovalStep } {
  const byType = (type: ApprovalStepType): ((s: ApprovalStep) => boolean) => (
    s: ApprovalStep
  ): boolean => s.type === type;
  const checkout = steps.find(byType(ApprovalStepType.CHECKOUT));
  const technicalDesign = steps.find(byType(ApprovalStepType.TECHNICAL_DESIGN));
  const sample = steps.find(byType(ApprovalStepType.SAMPLE));
  const production = steps.find(byType(ApprovalStepType.PRODUCTION));

  if (!checkout || !technicalDesign || !sample || !production) {
    throw new Error('Missing step type');
  }

  return {
    [ApprovalStepType.CHECKOUT]: checkout,
    [ApprovalStepType.TECHNICAL_DESIGN]: technicalDesign,
    [ApprovalStepType.SAMPLE]: sample,
    [ApprovalStepType.PRODUCTION]: production
  };
}
