import { escape as escapeHtml } from "lodash";
import qs from "querystring";

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
  Team = "TEAM",
  Subscribe = "SUBSCRIBE",
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
      shipmentTrackingId: string;
    }
  | {
      type: LinkType.Team;
      team: Meta;
    }
  | {
      type: LinkType.Subscribe;
      title: string;
      returnToDesignId: string | null;
      returnToCollectionId: string | null;
      planId: string;
      invitationEmail: string;
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
      const deepLink = `${STUDIO_HOST}/designs/${design.id}?${tab}canvasId=${canvasId}&annotationId=${annotationId}`;
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
      const deepLink = `${STUDIO_HOST}/designs/${design.id}`;
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
      const { design, approvalStep, shipmentTrackingId } = linkBase;

      const deepLink = `${STUDIO_HOST}/dashboard?designId=${design.id}&stepId=${approvalStep.id}&showTracking=view&trackingId=${shipmentTrackingId}`;
      const title = normalizeTitle(design);

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.Team: {
      const { team } = linkBase;

      const deepLink = `${STUDIO_HOST}/teams/${team.id}`;
      const title = normalizeTitle(team);

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.Subscribe: {
      const {
        returnToDesignId,
        returnToCollectionId,
        planId,
        invitationEmail,
        title,
      } = linkBase;

      const returnTo = returnToDesignId
        ? `/designs/${returnToDesignId}`
        : returnToCollectionId
        ? `/collections/${returnToCollectionId}`
        : null;

      const queryString = qs.stringify({
        planId,
        invitationEmail,
        ...(returnTo ? { returnTo } : null),
      });

      const deepLink = `${STUDIO_HOST}/subscribe?${queryString}`;

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }
  }
}
