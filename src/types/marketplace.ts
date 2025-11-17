export interface Marketplace {
  _id?: string;
  marketPlaceId: string;
  from: string;
  to?: string;
  amount: number;
  deedId: string;
  tokenId: string;
  share: number;
  description?: string;
  timestamp?: Date;
  status?: "open_to_sale" | "sale_completed" | "cancelled";
  listingTypeOnChain?: "NFT" | "FRACTIONAL";
}