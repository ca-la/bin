export default interface FitPartner {
  id: string;
  createdAt: Date;
  deletedAt?: Date;
  shopifyAppApiKey: string;
  shopifyHostname: string;
  shopifyAppPassword: string;
}
