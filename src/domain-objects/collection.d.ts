declare class Collection {
  public id: string;
  public createdAt: Date;
  public createdBy: string;
  public deletedAt?: Date;
  public title: string;
  public description: string;

  constructor(data: any);
}

export = Collection;
