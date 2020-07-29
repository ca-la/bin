import { escape as escapeHtml } from "lodash";
import { STUDIO_HOST } from "../../config";
import { ComponentType } from "../components/domain-object";
import normalizeTitle from "../../services/normalize-title";

interface Links {
  deepLink: string;
  htmlLink: string;
}

export enum LinkType {
  DesignAnnotation = "DESIGN_ANNOTATION",
  CollectionDesignTask = "COLLECTION_DESIGN_TASK",
  CollectionDesign = "COLLECTION_DESIGN",
  Design = "DESIGN",
  PartnerDesign = "PARTNER_DESIGN",
  Collection = "COLLECTION",
  ApprovalStep = "APPROVAL_STEP",
  ShipmentTracking = "SHIPMENT_TRACKING",
}

interface Meta {
  title: string | null;
  id: string;
}

export type LinkBase =
  | {
      type: LinkType.DesignAnnotation;
      annotationId: string;
      design: Meta;
      canvasId: string;
      componentType: ComponentType;
    }
  | {
      type: LinkType.CollectionDesignTask;
      design: Meta;
      collection: Meta | null;
      task: Meta;
    }
  | {
      type: LinkType.CollectionDesign;
      design: Meta;
      collection: Meta;
    }
  | {
      type: LinkType.Design;
      design: Meta;
    }
  | {
      type: LinkType.PartnerDesign;
      design: Meta;
    }
  | {
      type: LinkType.Collection;
      collection: Meta;
      isCheckout?: boolean;
      isSubmit?: boolean;
    }
  | {
      type: LinkType.ApprovalStep;
      design: Meta;
      approvalStep: Meta;
    }
  | {
      type: LinkType.ShipmentTracking;
      design: Meta;
      approvalStep: Meta;
    };

export function constructHtmlLink(deepLink: string, title: string): string {
  return `
<a href="${deepLink}">
  ${escapeHtml(title)}
</a>`;
}

export default function getLinks(linkBase: LinkBase): Links {
  switch (linkBase.type) {
    case LinkType.DesignAnnotation: {
      const { annotationId, canvasId, componentType, design } = linkBase;
      const tab =
        componentType === ComponentType.Artwork
          ? "tab=artwork&"
          : componentType === ComponentType.Material
          ? "tab=materials&"
          : "";
      // tslint:disable-next-line:max-line-length
      const deepLink = `${STUDIO_HOST}/designs?${tab}previewDesignId=${design.id}&canvasId=${canvasId}&annotationId=${annotationId}`;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.CollectionDesignTask: {
      const { design, task } = linkBase;
      const deepLink = `${STUDIO_HOST}/tasks?taskId=${task.id}&designId=${design.id}`;
      const title = normalizeTitle(task);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.CollectionDesign: {
      const { collection, design } = linkBase;
      // tslint:disable-next-line:max-line-length
      const deepLink = `${STUDIO_HOST}/collections/${collection.id}/designs?previewDesignId=${design.id}`;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.Design: {
      const { design } = linkBase;
      const deepLink = `${STUDIO_HOST}/designs?previewDesignId=${design.id}`;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.PartnerDesign: {
      const { design } = linkBase;
      const deepLink = `${STUDIO_HOST}/partners?previewDesignId=${design.id}`;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.Collection: {
      const { collection, isCheckout, isSubmit } = linkBase;
      const checkoutParam = isCheckout ? "?isCheckout=true" : "";
      const submitParam = isSubmit ? "?isSubmit=true" : "";

      // tslint:disable-next-line:max-line-length
      const deepLink = `${STUDIO_HOST}/collections/${collection.id}/designs${checkoutParam}${submitParam}`;
      const title = normalizeTitle(collection);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.ApprovalStep: {
      const { design, approvalStep } = linkBase;

      const deepLink = `${STUDIO_HOST}/dashboard?designId=${design.id}&stepId=${approvalStep.id}`;
      const title = normalizeTitle(approvalStep);

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.ShipmentTracking: {
      const { design, approvalStep } = linkBase;

      const deepLink = `${STUDIO_HOST}/dashboard?designId=${design.id}&stepId=${approvalStep.id}&showTracking=view`;
      const title = normalizeTitle(design);

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    default:
      throw new Error("Neither a collection or design was specified!");
  }
}
