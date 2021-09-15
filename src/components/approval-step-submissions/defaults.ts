import Knex, { QueryBuilder } from "knex";
import * as uuid from "node-uuid";
import { uniqBy } from "lodash";

import * as ApprovalStepsDAO from "../approval-steps/dao";
import * as PricingProductTypesDAO from "../pricing-product-types/dao";
import * as PricingQuotesDAO from "../../dao/pricing-quotes";
import PricingProductType from "../pricing-product-types/domain-object";
import {
  ApprovalStepSubmissionDb,
  ApprovalStepSubmissionState,
  ApprovalStepSubmissionArtifactType,
} from "./types";
import ApprovalStep, {
  ApprovalStepType,
} from "../approval-steps/domain-object";
import { Complexity } from "../../domain-objects/pricing";
import PricingProcess from "../../domain-objects/pricing-process";

type ApprovalStepByType = Record<ApprovalStepType, ApprovalStep>;
type SubmissionOption = Partial<ApprovalStepSubmissionDb> & {
  stepId: string;
  title: string;
};

function getDisplayOrFallbackName(nameable: {
  displayName?: string | null;
  name: string;
}): string {
  return nameable.displayName || nameable.name;
}

function getProcessSubmissions(
  stepsByType: ApprovalStepByType,
  processes: PricingProcess[]
): SubmissionOption[] {
  return uniqBy<PricingProcess>(processes, getDisplayOrFallbackName).map(
    (process: PricingProcess) => ({
      stepId: stepsByType[ApprovalStepType.SAMPLE].id,
      title: `Review ${getDisplayOrFallbackName(process)} trial`,
    })
  );
}

function getProductSubmissions(
  stepsByType: ApprovalStepByType,
  productType: PricingProductType
): SubmissionOption[] {
  switch (productType.name) {
    case "OTHER - NOVELTY LABELS":
    case "OTHER - PACKAGING":
      return [
        {
          stepId: stepsByType[ApprovalStepType.TECHNICAL_DESIGN].id,
          title: "Review artwork proof",
        },
        {
          stepId: stepsByType[ApprovalStepType.SAMPLE].id,
          title: "Review final sample",
        },
        {
          stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
          title: "Confirm receipt of final shipment",
        },
      ];

    case "OTHER - HANGTAGS":
      return [
        {
          stepId: stepsByType[ApprovalStepType.TECHNICAL_DESIGN].id,
          title: "Review artwork proof",
        },
        {
          stepId: stepsByType[ApprovalStepType.SAMPLE].id,
          title: "Review material options",
        },
        {
          stepId: stepsByType[ApprovalStepType.SAMPLE].id,
          title: "Review final sample",
        },
        {
          stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
          title: "Confirm receipt of final shipment",
        },
      ];

    default:
      return getComplexitySubmissions(stepsByType, productType.complexity);
  }
}

function getComplexitySubmissions(
  stepsByType: ApprovalStepByType,
  complexity: Complexity
): SubmissionOption[] {
  switch (complexity) {
    case "BLANK": {
      return [
        {
          artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
          stepId: stepsByType[ApprovalStepType.TECHNICAL_DESIGN].id,
          title: "Review technical design",
        },
        {
          artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
          stepId: stepsByType[ApprovalStepType.SAMPLE].id,
          title: "Review sample photo",
        },
        {
          stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
          title: "Confirm receipt of TOP and CALA keep samples",
        },
        {
          stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
          title: "Confirm receipt of final shipment",
        },
      ];
    }

    default: {
      return [
        {
          artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
          stepId: stepsByType[ApprovalStepType.TECHNICAL_DESIGN].id,
          title: "Review technical design",
        },
        {
          stepId: stepsByType[ApprovalStepType.TECHNICAL_DESIGN].id,
          title: "Review main label placement and size",
        },
        {
          stepId: stepsByType[ApprovalStepType.TECHNICAL_DESIGN].id,
          title: "Review care label content and country of origin",
        },
        {
          artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
          stepId: stepsByType[ApprovalStepType.SAMPLE].id,
          title: "Review material sample",
        },
        {
          artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
          stepId: stepsByType[ApprovalStepType.SAMPLE].id,
          title: "Review final sample",
        },
        {
          stepId: stepsByType[ApprovalStepType.SAMPLE].id,
          title: "Review bulk graded specs",
        },
        {
          stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
          title: "Confirm quality inspection",
        },
        {
          stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
          title: "Confirm receipt of TOP and CALA keep samples",
        },
        {
          stepId: stepsByType[ApprovalStepType.PRODUCTION].id,
          title: "Confirm receipt of final shipment",
        },
      ];
    }
  }
}

export async function getDefaultsByDesign(
  trx: Knex.Transaction,
  designId: string
): Promise<ApprovalStepSubmissionDb[]> {
  const now = new Date();
  const productType = await PricingProductTypesDAO.findByDesignId(
    designId,
    trx
  );
  if (!productType) {
    throw new Error(
      `Unable to find a PricingProductType for design "${designId}".`
    );
  }

  const designQuotes = await PricingQuotesDAO.findByDesignId(
    designId,
    trx,
    (query: QueryBuilder) => query.limit(1)
  );

  if (!designQuotes || designQuotes.length === 0) {
    throw new Error(`Unable to find a PricingQuote for design "${designId}`);
  }
  const latestQuote = designQuotes[0];

  const stepsByType = buildStepByType(
    await ApprovalStepsDAO.findByDesign(trx, designId)
  );

  return [
    ...getProductSubmissions(stepsByType, productType),
    ...getProcessSubmissions(stepsByType, latestQuote.processes),
  ].map((sub: SubmissionOption, index: number) => ({
    id: uuid.v4(),
    artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    annotationId: null,
    ...sub,
    createdAt: new Date(now.getTime() + index),
    createdBy: null,
    deletedAt: null,
  }));
}

function buildStepByType(steps: ApprovalStep[]): ApprovalStepByType {
  const byType = (type: ApprovalStepType): ((s: ApprovalStep) => boolean) => (
    s: ApprovalStep
  ): boolean => s.type === type;
  const checkout = steps.find(byType(ApprovalStepType.CHECKOUT));
  const technicalDesign = steps.find(byType(ApprovalStepType.TECHNICAL_DESIGN));
  const sample = steps.find(byType(ApprovalStepType.SAMPLE));
  const production = steps.find(byType(ApprovalStepType.PRODUCTION));

  if (!checkout || !technicalDesign || !sample || !production) {
    throw new Error("Missing step type");
  }

  return {
    [ApprovalStepType.CHECKOUT]: checkout,
    [ApprovalStepType.TECHNICAL_DESIGN]: technicalDesign,
    [ApprovalStepType.SAMPLE]: sample,
    [ApprovalStepType.PRODUCTION]: production,
  };
}
