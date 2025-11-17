import React, { useState } from "react";
import { FaTimes, FaEthereum, FaPercentage, FaExclamationTriangle } from "react-icons/fa";
import type { Marketplace } from "../../types/marketplace";
import type { IDeed } from "../../types/responseDeed";
import { useToast } from "../../contexts/ToastContext";
import { useLoader } from "../../contexts/LoaderContext";
import { useWallet } from "../../contexts/WalletContext";
import { ethers } from "ethers";
import { buyFromMarketplace } from "../../web3.0/marketService";
import { updateMarketPlace } from "../../api/api";

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
  const [agreed, setAgreed] = useState(false);

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

    try {
      showLoader();
      
      const amountInWei = ethers.parseEther(marketplace.amount.toString());
      
      const result = await buyFromMarketplace(
        marketplace.marketPlaceId,
        marketplace.tokenId,
        marketplace.share,
        amountInWei
      );

      if (result) {
        if (marketplace._id) {
          await updateMarketPlace(marketplace._id, {
            to: account
          });
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl max-w-2xl w-full">
        <div className="h-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
          <div className="bg-green-600 p-6 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">Purchase Deed Share</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <FaPercentage className="text-green-600" />
                    <span>Share Percentage</span>
                  </div>
                  <span className="font-bold text-lg text-black">{marketplace.share}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <FaEthereum className="text-green-600" />
                    <span>Price</span>
                  </div>
                  <span className="font-bold text-2xl text-green-900">{marketplace.amount} ETH</span>
                </div>
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
                    <li>You will own {marketplace.share}% of this property deed</li>
                    <li>Make sure you have sufficient ETH in your wallet</li>
                    <li>Gas fees will apply to this transaction</li>
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
                I understand and agree that this purchase is final and irreversible. I have reviewed all details and confirm my intent to purchase {marketplace.share}% ownership of Deed #{deed.deedNumber} for {marketplace.amount} ETH.
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