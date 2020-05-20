import InvoiceAddress from "./invoice-address";

declare class Invoice {
  public static keyNamesByColumnName: { [key: string]: string };
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
  public totalPaid: number | null;
  public shortId: string | null;
  public invoiceAddressId: string | null;
  public invoiceAddress: InvoiceAddress | null;

  constructor(data: any);
}

export = Invoice;
