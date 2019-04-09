export default interface FitPartner {
  id: string;
  createdAt: Date;
  customFitDomain: string | null;
  deletedAt?: Date;
  shopifyAppApiKey: string;
  shopifyHostname: string;
  shopifyAppPassword: string;
  adminUserId?: string;
  smsCopy?: string;
}
