interface Measurements {
  calculatedValues?: {
    [key: string]: number;
  };
}

declare class Scan {
  public id: string;
  public createdAt: Date;
  public deletedAt?: Date;
  public isComplete: boolean;
  public isStarted: boolean;
  public measurements?: Measurements;
  public type: "PHOTO" | "HUMANSOLUTIONS";
  public userId?: string;
  public fitPartnerCustomerId?: string;

  constructor(data: any);
}

export = Scan;
