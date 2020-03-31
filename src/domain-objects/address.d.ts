declare class Address {
  public static dataMapper: any;
  public id: string;
  public createdAt: Date | null;
  public deletedAt: Date | null;
  public userId: string | null;
  public companyName: string | null;
  public addressLine1: string;
  public addressLine2: string | null;
  public city: string;
  public region: string;
  public postCode: string;
  public country: string;

  constructor(data: any);
}
