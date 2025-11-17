import React from "react";
import { FaStore, FaTimes } from "react-icons/fa";
import type { Marketplace } from "../../../types/marketplace";

interface MarketplaceBannerProps {
  marketPlaceData?: Marketplace[];
  onRemoveListing: (marketId: string, listingId: string) => void;
}

const MarketplaceBanner: React.FC<MarketplaceBannerProps> = ({
  marketPlaceData,
  onRemoveListing,
}) => {
  const activeListings = marketPlaceData?.filter(m => m.status === "open_to_sale") || [];

  if (activeListings.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-sm mb-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <FaStore size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Listed on Marketplace</h3>
            <p className="text-sm text-blue-100">
              {activeListings.length} active {activeListings.length === 1 ? 'listing' : 'listings'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {activeListings.map((listing) => (
            <div
              key={listing._id}
              className="bg-white/10 rounded-lg p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Share: {listing.share}%</span>
                </div>
                <button
                  onClick={() => onRemoveListing(listing._id!, listing.marketPlaceId)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition"
                  title="Remove listing"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-100">Price</span>
                <span className="text-lg font-bold">{listing.amount} ETH</span>
              </div>

              {listing.description && (
                <p className="text-xs text-blue-100 mt-2 line-clamp-2">
                  {listing.description}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs text-blue-100">
            Your listing is visible to all potential buyers in the marketplace.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceBanner;