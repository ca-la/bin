interface Measurements {
  calculatedValues?: {
    [key: string]: number;
  };
}

export default interface Scan {
  id: string;
  createdAt: Date;
  deletedAt?: Date;
  isComplete: boolean;
  measurements?: Measurements;
  type: 'PHOTO' | 'HUMANSOLUTIONS';
  userId?: string;
  fitPartnerCustomerId?: string;
}
