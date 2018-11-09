declare class ProductDesign {
  public id: string;
  public createdAt: Date;
  public deletedAt?: Date;
  public productType: string;
  public title: string;
  public description?: string;
  public userId: string;
  public previewImageUrls?: string[];

  constructor(data: any);
}

export = ProductDesign;
