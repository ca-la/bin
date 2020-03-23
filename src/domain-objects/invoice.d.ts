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
  public isPaid: boolean | null;
  public shortId: string | null;
  public invoiceAddressId: string | null;

  constructor(data: any);
}

export = Invoice;
