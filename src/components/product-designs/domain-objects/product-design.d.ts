import { ThumbnailAndPreviewLinks } from "../../../services/attach-asset-links";

declare class ProductDesign {
  public id: string;
  public createdAt: Date;
  public deletedAt?: Date;
  public productType: string | null;
  public title: string;
  public description?: string;
  public userId: string;
  public previewImageUrls?: string[]; // DEPRECATED; use imageLinks instead.
  public collections?: { id: string; title: string }[];
  public collectionIds?: string[];
  public imageIds?: string[];
  public imageLinks?: ThumbnailAndPreviewLinks[];
  public bidId?: string;

  constructor(data: any);
}

export = ProductDesign;
