declare class ProductDesignOption {
  public id: string;
  public isBuiltinOption: boolean | null;
  public createdAt: Date;
  public deletedAt: Date | null;
  public type: string;
  public userId: string | null;
  public unitCostCents: string | null;
  public preferredLengthUnit: string | null;
  public weightGsm: number | null;
  public preferredWeightUnit: string | null;
  public title: string;
  public sku: string | null;
  public previewImageId: string | null;
  public patternImageId: string | null;
  public vendorName: string | null;
  public perMeterCostCents: number | null;
  public composition: string | null;
  public rollWidthCm: string | null;
  public preferredWidthUnit: string | null;
  public weaveType: string | null;
  public setupCostCents: number | null;
  public endUse: string | null;
  public originCountry: string | null;
  public careInstructions: string | null;
  public shipsFromCity: string | null;
  public shipsFromCountry: string | null;
  public testsAndCertifications: string | null;
  public description: string | null;
  public isPfd: boolean | null;
  public color: string | null;
  public hexColorCode: string | null;
  public leadTimeHours: number | null;
  public vendorWebUrl: string | null;

  constructor(data: any);
}

export = ProductDesignOption;
