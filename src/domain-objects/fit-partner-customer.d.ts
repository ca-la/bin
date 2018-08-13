export default interface FitPartnerCustomer {
  id: string;
  createdAt: Date;
  deletedAt?: Date;
  partnerId: string;
  shopifyUserId: string;
}
