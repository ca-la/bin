declare class Invoice {
  public id: string;
  public createdAt: Date | null;
  public userId: string | null;
  public totalCents: number;
  public title: string | null;
  public description: string | null;
  public designId: string | null;
  public designStatusId: string | null;
  public collectionId: string | null;

  constructor(data: any);
}

export default Invoice;
