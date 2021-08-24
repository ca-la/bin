import { URL, URLSearchParams } from "url";
import { escape as escapeHtml } from "lodash";

import { STUDIO_HOST } from "../../config";
import { ComponentType } from "../components/types";
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
  ApprovalStepSubmission = "APPROVAL_STEP_SUBMISSION",
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
      commentId?: string;
    }
  | {
      type: LinkType.CollectionDesignTask;
      design: Meta;
      collection: Meta | null;
      task: Meta;
      commentId?: string;
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
      commentId?: string;
    }
  | {
      type: LinkType.ApprovalStepSubmission;
      design: Meta;
      approvalStep: Meta;
      approvalSubmission: Meta;
      commentId?: string;
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
      returnToTeamId: string | null;
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
      const {
        annotationId,
        canvasId,
        componentType,
        design,
        commentId,
      } = linkBase;
      const tab =
        componentType === ComponentType.Artwork
          ? "artwork"
          : componentType === ComponentType.Material
          ? "materials"
          : "";

      const search = new URLSearchParams({
        ...(tab && { tab }),
        canvasId,
        annotationId,
        ...(commentId && { replyingToCommentId: commentId }),
      });

      const linkUrl = new URL(`/designs/${design.id}`, STUDIO_HOST);
      linkUrl.search = search.toString();
      const deepLink = linkUrl.href;

      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.CollectionDesignTask: {
      const { design, task, commentId } = linkBase;

      const search = new URLSearchParams({
        taskId: task.id,
        designId: design.id,
        ...(commentId && { replyingToCommentId: commentId }),
      });

      const linkUrl = new URL("/tasks", STUDIO_HOST);
      linkUrl.search = search.toString();

      const deepLink = linkUrl.href;
      const title = normalizeTitle(task);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.CollectionDesign: {
      const { collection, design } = linkBase;

      const search = new URLSearchParams({
        previewDesignId: design.id,
      });

      const linkUrl = new URL(
        `/collections/${collection.id}/designs`,
        STUDIO_HOST
      );
      linkUrl.search = search.toString();

      const deepLink = linkUrl.href;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.Design: {
      const { design } = linkBase;

      const linkUrl = new URL(`/designs/${design.id}`, STUDIO_HOST);

      const deepLink = linkUrl.href;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.PartnerDesign: {
      const { design } = linkBase;
      const search = new URLSearchParams({
        previewDesignId: design.id,
      });
      const linkUrl = new URL("/partners", STUDIO_HOST);
      linkUrl.search = search.toString();

      const deepLink = linkUrl.href;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.Collection: {
      const { collection, isCheckout, isSubmit } = linkBase;

      const search = new URLSearchParams({
        ...(isCheckout && { isCheckout: "true" }),
        ...(isSubmit && { isSubmit: "true" }),
      });

      const linkUrl = new URL(
        `/collections/${collection.id}/designs`,
        STUDIO_HOST
      );
      linkUrl.search = search.toString();

      const deepLink = linkUrl.href;
      const title = normalizeTitle(collection);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.ApprovalStep: {
      const { design, approvalStep, commentId } = linkBase;

      const search = new URLSearchParams({
        designId: design.id,
        stepId: approvalStep.id,
        ...(commentId && { replyingToCommentId: commentId }),
      });

      const linkUrl = new URL("/dashboard", STUDIO_HOST);
      linkUrl.search = search.toString();

      const deepLink = linkUrl.href;
      const title = normalizeTitle(approvalStep);

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.ApprovalStepSubmission: {
      const { design, approvalStep, approvalSubmission, commentId } = linkBase;

      const search = new URLSearchParams({
        designId: design.id,
        stepId: approvalStep.id,
        submissionId: approvalSubmission.id,
        ...(commentId && { replyingToCommentId: commentId }),
      });

      const linkUrl = new URL("/dashboard", STUDIO_HOST);
      linkUrl.search = search.toString();

      const deepLink = linkUrl.href;
      const title = normalizeTitle(approvalSubmission);

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.ShipmentTracking: {
      const { design, approvalStep, shipmentTrackingId } = linkBase;

      const search = new URLSearchParams({
        designId: design.id,
        stepId: approvalStep.id,
        showTracking: "view",
        trackingId: shipmentTrackingId,
      });

      const linkUrl = new URL("/dashboard", STUDIO_HOST);
      linkUrl.search = search.toString();

      const deepLink = linkUrl.href;
      const title = normalizeTitle(design);

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.Team: {
      const { team } = linkBase;

      const linkUrl = new URL(`/teams/${team.id}`, STUDIO_HOST);
      const deepLink = linkUrl.href;
      const title = normalizeTitle(team);

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }

    case LinkType.Subscribe: {
      const {
        returnToTeamId,
        returnToDesignId,
        returnToCollectionId,
        planId,
        invitationEmail,
        title,
      } = linkBase;

      const returnTo = returnToTeamId
        ? `/teams/${returnToTeamId}`
        : returnToDesignId
        ? `/designs/${returnToDesignId}`
        : returnToCollectionId
        ? `/collections/${returnToCollectionId}`
        : null;

      const search = new URLSearchParams({
        planId,
        invitationEmail,
        ...(returnTo && { returnTo }),
      });

      const linkUrl = new URL("/subscribe", STUDIO_HOST);
      linkUrl.search = search.toString();

      const deepLink = linkUrl.href;

      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title),
      };
    }
  }
}
