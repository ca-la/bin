declare class ProductDesign {
  public id: string;
  public createdAt: Date;
  public deletedAt?: Date;
  public productType: string;
  public title: string;
  public userId: string;

  constructor(data: any);
}

export = ProductDesign;
