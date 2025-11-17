import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useToast } from "../../contexts/ToastContext";
import { useLoader } from "../../contexts/LoaderContext";
import { useWallet } from "../../contexts/WalletContext";
import { listFractionalTokensForSale } from "../../web3.0/marketService";
import { createMarketPlace } from "../../api/api";
import { getFractionalTokenAddress } from "../../web3.0/contractService";

interface CreateListingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deedId: string;
  tokenId: number;
  nftAddress: string;
}

const CreateListingPopup: React.FC<CreateListingPopupProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deedId,
  tokenId,
  nftAddress
}) => {
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useLoader();
  const { account } = useWallet();
  
  const [share, setShare] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      showToast("Please connect your wallet", "error");
      return;
    }

    if (!share || !amount) {
      showToast("Please fill all required fields", "error");
      return;
    }

    const shareNum = Number(share);
    const amountNum = Number(amount);

    if (shareNum <= 0 || shareNum > 100) {
      showToast("Share must be between 1 and 100", "error");
      return;
    }

    if (amountNum <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }

    try {
      showLoader();

      const tokenAddress = await getFractionalTokenAddress(tokenId);

      const result = await listFractionalTokensForSale(
        nftAddress,
        tokenId,
        tokenAddress,
        shareNum,
        amount
      );

      if (result.success && result.listingId) {
        await createMarketPlace({
          marketPlaceId: result.listingId,
          from: account,
          amount: amountNum,
          deedId,
          tokenId: tokenId.toString(),
          share: shareNum,
          description: description || undefined
        });

        showToast("Listing created successfully!", "success");
        onSuccess();
        onClose();
        setShare("");
        setAmount("");
        setDescription("");
      } else {
        showToast("Failed to create listing", "error");
      }
    } catch (error: any) {
      console.error("Error creating listing:", error);
      showToast(error.message || "Failed to create listing", "error");
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-green-600 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Create Listing</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Share Percentage (%)
            </label>
            <input
              type="number"
              value={share}
              onChange={(e) => setShare(e.target.value)}
              min="1"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
              placeholder="Enter share percentage"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Price (ETH)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.001"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
              placeholder="Enter price in ETH"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
              placeholder="Add a description for your listing"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:shadow-lg transition cursor-pointer"
            >
              Create Listing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListingPopup;