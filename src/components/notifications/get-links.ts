import { escape as escapeHtml } from 'lodash';
import { STUDIO_HOST } from '../../config';
import ProductDesign = require('../product-designs/domain-objects/product-design');
import Collection from '../collections/domain-object';
import { DetailsTask } from '../../domain-objects/task-event';
import { ComponentType } from '../components/domain-object';
import normalizeTitle from '../../services/normalize-title';

interface Links {
  deepLink: string;
  htmlLink: string;
}

export enum LinkType {
  DesignAnnotation = 'DESIGN_ANNOTATION',
  CollectionDesignTask = 'COLLECTION_DESIGN_TASK',
  CollectionDesign = 'COLLECTION_DESIGN',
  Design = 'DESIGN',
  PartnerDesign = 'PARTNER_DESIGN',
  Collection = 'COLLECTION'
}

export type LinkBase =
  | {
      type: LinkType.DesignAnnotation;
      annotationId: string;
      design: ProductDesign;
      canvasId: string;
      componentType: ComponentType;
    }
  | {
      type: LinkType.CollectionDesignTask;
      design: ProductDesign;
      collection: Collection | null;
      task: DetailsTask;
    }
  | {
      type: LinkType.CollectionDesign;
      design: ProductDesign;
      collection: Collection;
    }
  | {
      type: LinkType.Design;
      design: ProductDesign;
    }
  | {
      type: LinkType.PartnerDesign;
      design: ProductDesign;
    }
  | {
      type: LinkType.Collection;
      collection: Collection;
      isCheckout?: boolean;
    };

function constructHtmlLink(deepLink: string, title: string): string {
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
          ? 'tab=artwork&'
          : componentType === ComponentType.Material
          ? 'tab=materials&'
          : '';
      // tslint:disable-next-line:max-line-length
      const deepLink = `${STUDIO_HOST}/designs?${tab}previewDesignId=${
        design.id
      }&canvasId=${canvasId}&annotationId=${annotationId}`;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title)
      };
    }

    case LinkType.CollectionDesignTask: {
      const { design, task } = linkBase;
      const deepLink = `${STUDIO_HOST}/tasks?taskId=${task.id}&designId=${
        design.id
      }`;
      const title = normalizeTitle(task);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title)
      };
    }

    case LinkType.CollectionDesign: {
      const { collection, design } = linkBase;
      // tslint:disable-next-line:max-line-length
      const deepLink = `${STUDIO_HOST}/collections/${
        collection.id
      }/designs?previewDesignId=${design.id}`;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title)
      };
    }

    case LinkType.Design: {
      const { design } = linkBase;
      const deepLink = `${STUDIO_HOST}/designs?previewDesignId=${design.id}`;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title)
      };
    }

    case LinkType.PartnerDesign: {
      const { design } = linkBase;
      const deepLink = `${STUDIO_HOST}/partners?previewDesignId=${design.id}`;
      const title = normalizeTitle(design);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title)
      };
    }

    case LinkType.Collection: {
      const { collection, isCheckout } = linkBase;
      // tslint:disable-next-line:max-line-length
      const deepLink = `${STUDIO_HOST}/collections/${collection.id}/designs${
        isCheckout ? '?isCheckout=true' : ''
      }`;
      const title = normalizeTitle(collection);
      return {
        deepLink,
        htmlLink: constructHtmlLink(deepLink, title)
      };
    }

    default:
      throw new Error('Neither a collection or design was specified!');
  }
}
