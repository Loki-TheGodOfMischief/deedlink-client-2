import React, { useState, useEffect } from "react";
import { FaTimes, FaEthereum, FaPercentage, FaExclamationTriangle } from "react-icons/fa";
import type { Marketplace } from "../../types/marketplace";
import type { IDeed } from "../../types/responseDeed";
import { useToast } from "../../contexts/ToastContext";
import { useLoader } from "../../contexts/LoaderContext";
import { useWallet } from "../../contexts/WalletContext";
import { buyNFT, buyFractionalTokens, getListingDetails } from "../../web3.0/marketService";
import { createTransaction, updateMarketPlace, updateFullOwnerAddress } from "../../api/api";
import { getNFTOwner } from "../../web3.0/contractService";
import { useAlert } from "../../contexts/AlertContext";

interface BuyMarketplacePopupProps {
  marketplace: Marketplace;
  deed: IDeed;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BuyMarketplacePopup: React.FC<BuyMarketplacePopupProps> = ({
  marketplace,
  deed,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useLoader();
  const { account } = useWallet();
  const { showAlert } = useAlert();
  const [agreed, setAgreed] = useState(false);
  const [listingType, setListingType] = useState<"NFT" | "FRACTIONAL" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListingDetails = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        
        if (marketplace.listingTypeOnChain) {
          setListingType(marketplace.listingTypeOnChain);
          console.log("Using stored listing type:", marketplace.listingTypeOnChain);
        } else if (marketplace.share === 100) {
          setListingType("NFT");
          console.log("Assuming NFT type based on share=100");
        } else {
          const details = await getListingDetails(Number(marketplace.marketPlaceId));
          setListingType(details.listingType as "NFT" | "FRACTIONAL");
          console.log("Fetched listing type from blockchain:", details.listingType);
        }
      } catch (error) {
        console.error("Failed to determine listing type:", error);
        try {
          const details = await getListingDetails(Number(marketplace.marketPlaceId));
          setListingType(details.listingType as "NFT" | "FRACTIONAL");
        } catch (e) {
          console.error("All methods failed:", e);
          showToast("Failed to load listing details", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchListingDetails();
  }, [isOpen, marketplace]);

  if (!isOpen) return null;

  const handleBuy = async () => {
    if (!agreed) {
      showToast("Please agree to the terms and conditions", "info");
      return;
    }

    if (!account) {
      showToast("Please connect your wallet", "error");
      return;
    }

    if (!listingType) {
      showToast("Loading listing details...", "info");
      return;
    }

    try {
      showLoader();
      
      const priceInEth = marketplace.amount.toString();
      console.log("Attempting purchase:", {
        listingId: marketplace.marketPlaceId,
        listingType,
        share: marketplace.share,
        priceInEth
      });

      let result;

      if (listingType === "NFT") {
        console.log("Buying full NFT...");
        result = await buyNFT(Number(marketplace.marketPlaceId), priceInEth);
      } else {
        console.log("Buying fractional tokens...");
        result = await buyFractionalTokens(
          Number(marketplace.marketPlaceId),
          marketplace.share,
          priceInEth
        );
      }

      if (result.success) {
        try {
          await createTransaction({
            deedId: deed._id,
            from: marketplace.from,
            to: account as string,
            amount: marketplace.amount,
            share: marketplace.share,
            type: listingType === "NFT" ? "sale_transfer" : "direct_transfer",
            hash: result.txHash,
            description: listingType === "NFT" 
              ? `Purchased full property NFT #${marketplace.tokenId}` 
              : `Purchased ${marketplace.share}% fractional tokens`,
            status: "completed"
          });
          console.log("Transaction logged successfully");
        } catch (txError) {
          console.error("Failed to log transaction:", txError);
        }

        if (marketplace._id) {
          await updateMarketPlace(marketplace._id, {
            to: account,
            status: "sale_completed"
          });
        }

        if (listingType === "NFT") {
          try {
            await updateFullOwnerAddress(
              Number(marketplace.tokenId),
              account.toLowerCase()
            );
            console.log("Owner address updated in database");

            const newOwner = await getNFTOwner(Number(marketplace.tokenId));
            if (newOwner.toLowerCase() !== account?.toLowerCase()) {
              showAlert({
                type: "warning",
                title: "Transfer May Have Failed",
                message: "Payment was received but NFT ownership may not have transferred. Please check blockchain explorer.",
                confirmText: "OK"
              });
            }
          } catch (ownerError) {
            console.error("Failed to update/verify owner:", ownerError);
          }
        }

        showToast("Purchase successful!", "success");
        onSuccess();
        onClose();
      } else {
        showToast("Purchase failed. Please try again.", "error");
      }
    } catch (error: any) {
      console.error("Error buying from marketplace:", error);
      showToast(error.message || "Failed to complete purchase", "error");
    } finally {
      hideLoader();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Loading listing details...</p>
        </div>
      </div>
    );
  }

  const isFullNFT = listingType === "NFT";
  const isFractional = listingType === "FRACTIONAL";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl max-w-2xl w-full">
        <div className="h-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
          <div className="bg-green-600 p-6 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">
              Purchase {isFullNFT ? "Full Property" : "Property Share"}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex justify-center">
              <span className={`px-4 py-2 rounded-full font-semibold text-sm ${
                isFullNFT 
                  ? "bg-blue-100 text-blue-700 border-2 border-blue-300" 
                  : "bg-purple-100 text-purple-700 border-2 border-purple-300"
              }`}>
                {isFullNFT ? "🏠 Full Property (100%)" : "📊 Fractional Share"}
              </span>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-bold text-green-900 mb-3">Deed Information</h3>
              <div className="space-y-2 text-sm text-black">
                <p><span className="font-semibold">Deed Number:</span> {deed.deedNumber}</p>
                <p><span className="font-semibold">Location:</span> {deed.district}, {deed.division}</p>
                <p><span className="font-semibold">Land Type:</span> {deed.landType}</p>
                <p><span className="font-semibold">Land Area:</span> {deed.landArea} {deed.landSizeUnit}</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-3">Purchase Details</h3>
              <div className="space-y-3">
                {isFractional && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-700">
                      <FaPercentage className="text-green-600" />
                      <span>Share Percentage</span>
                    </div>
                    <span className="font-bold text-lg text-black">{marketplace.share}%</span>
                  </div>
                )}

                {isFullNFT && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-700">
                      <FaPercentage className="text-green-600" />
                      <span>Ownership</span>
                    </div>
                    <span className="font-bold text-lg text-black">100% (Full)</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <FaEthereum className="text-green-600" />
                    <span>{isFullNFT ? "Total Price" : "Price"}</span>
                  </div>
                  <span className="font-bold text-2xl text-green-900">{marketplace.amount} ETH</span>
                </div>

                {isFullNFT && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      💡 You will receive full ownership (100%) of this property deed as an NFT.
                    </p>
                  </div>
                )}

                {isFractional && (
                  <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800">
                      💡 You will receive {marketplace.share}% fractional tokens representing partial ownership.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {marketplace.description && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-blue-900 mb-2">Description</h3>
                <p className="text-sm text-gray-700">{marketplace.description}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="text-yellow-600 mt-1 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-2">Important Notice:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>This transaction is irreversible once confirmed</li>
                    <li>You will {isFullNFT ? "own 100% (full ownership)" : `own ${marketplace.share}%`} of this property deed</li>
                    <li>Make sure you have sufficient ETH in your wallet</li>
                    <li>Gas fees will apply to this transaction</li>
                    {isFractional && (
                      <li>Fractional tokens can be traded or sold on the marketplace</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer"
              />
              <label htmlFor="agree" className="text-sm text-gray-700 cursor-pointer">
                I understand and agree that this purchase is final and irreversible. I have reviewed all details and confirm my intent to purchase {isFullNFT ? "full ownership (100%)" : `${marketplace.share}% ownership`} of Deed #{deed.deedNumber} for {marketplace.amount} ETH.
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={!agreed}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition cursor-pointer ${
                  agreed
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyMarketplacePopup;