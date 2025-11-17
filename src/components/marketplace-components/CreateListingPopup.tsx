import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { useToast } from "../../contexts/ToastContext";
import { useLoader } from "../../contexts/LoaderContext";
import { useWallet } from "../../contexts/WalletContext";
import { listFractionalTokensForSale, listNFTForSale } from "../../web3.0/marketService";
import { createMarketPlace } from "../../api/api";
import { getFractionalTokenAddress, getFTBalance } from "../../web3.0/contractService";

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
  const [listingType, setListingType] = useState<"FULL_NFT" | "FRACTIONAL">("FRACTIONAL");
  const [fractionalTokenAddress, setFractionalTokenAddress] = useState<string>("");
  const [userFTBalance, setUserFTBalance] = useState<number>(0);
  const [hasFractionalTokens, setHasFractionalTokens] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFractionalTokens = async () => {
      if (!isOpen || !account) return;
      
      try {
        setLoading(true);
        const ftAddress = await getFractionalTokenAddress(tokenId);
        
        if (ftAddress && ftAddress !== "0x0000000000000000000000000000000000000000") {
          setFractionalTokenAddress(ftAddress);
          setHasFractionalTokens(true);
          
          const balance = await getFTBalance(ftAddress, account);
          setUserFTBalance(Number(balance));
          
          if (Number(balance) > 0) {
            setListingType("FRACTIONAL");
          } else {
            setListingType("FULL_NFT");
          }
        } else {
          setHasFractionalTokens(false);
          setListingType("FULL_NFT");
        }
      } catch (error) {
        console.error("Error checking fractional tokens:", error);
        setHasFractionalTokens(false);
        setListingType("FULL_NFT");
      } finally {
        setLoading(false);
      }
    };

    checkFractionalTokens();
  }, [isOpen, tokenId, account]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      showToast("Please connect your wallet", "error");
      return;
    }

    if (!amount) {
      showToast("Please enter a price", "error");
      return;
    }

    const amountNum = Number(amount);

    if (amountNum <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }

    if (listingType === "FRACTIONAL") {
      if (!share) {
        showToast("Please enter share percentage", "error");
        return;
      }

      const shareNum = Number(share);

      if (shareNum <= 0 || shareNum > 100) {
        showToast("Share must be between 1 and 100", "error");
        return;
      }

      if (!hasFractionalTokens) {
        showToast("No fractional tokens exist for this property. Please fractionalize it first.", "error");
        return;
      }

      if (userFTBalance <= 0) {
        showToast("You don't have any fractional tokens to sell", "error");
        return;
      }
    }

    try {
      showLoader();

      let result;
      let finalShare: number;
      let blockchainListingType: "NFT" | "FRACTIONAL";

      if (listingType === "FULL_NFT") {
        console.log("Creating full NFT listing...");
        result = await listNFTForSale(
          nftAddress,
          tokenId,
          amount
        );
        finalShare = 100;
        blockchainListingType = "NFT";
      } else {
        const shareNum = Number(share);
        console.log("Creating fractional listing...");
        
        result = await listFractionalTokensForSale(
          nftAddress,
          tokenId,
          fractionalTokenAddress,
          shareNum,
          amount
        );
        finalShare = shareNum;
        blockchainListingType = "FRACTIONAL";
      }

      if (result.success && result.listingId) {
        const marketplaceData = {
          marketPlaceId: result.listingId,
          from: account,
          amount: amountNum,
          deedId,
          tokenId: tokenId.toString(),
          share: finalShare,
          description: description || undefined,
          listingTypeOnChain: blockchainListingType
        };

        console.log("Creating marketplace DB entry:", marketplaceData);
        await createMarketPlace(marketplaceData);

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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

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
              Listing Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setListingType("FULL_NFT");
                  setShare("");
                }}
                className={`px-4 py-3 rounded-lg font-semibold transition ${
                  listingType === "FULL_NFT"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Full Property (100%)
              </button>
              <button
                type="button"
                onClick={() => setListingType("FRACTIONAL")}
                disabled={!hasFractionalTokens || userFTBalance <= 0}
                className={`px-4 py-3 rounded-lg font-semibold transition ${
                  listingType === "FRACTIONAL"
                    ? "bg-green-600 text-white"
                    : hasFractionalTokens && userFTBalance > 0
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Fractional Share
              </button>
            </div>
            {!hasFractionalTokens && (
              <p className="text-xs text-yellow-600 mt-2">
                ⚠️ No fractional tokens exist. Fractionalize the property first to sell shares.
              </p>
            )}
            {hasFractionalTokens && userFTBalance <= 0 && (
              <p className="text-xs text-yellow-600 mt-2">
                ⚠️ You don't own any fractional tokens of this property.
              </p>
            )}
          </div>

          {listingType === "FRACTIONAL" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Share Percentage (%)
              </label>
              <input
                type="number"
                value={share}
                onChange={(e) => setShare(e.target.value)}
                min="1"
                max={Math.min(100, userFTBalance)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                placeholder={`Enter share (max: ${Math.min(100, userFTBalance)}%)`}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                You own {userFTBalance}% of fractional tokens
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {listingType === "FULL_NFT" ? "Total Price (ETH)" : "Price per Token (ETH)"}
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

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Listing Summary</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p><span className="font-medium">Type:</span> {listingType === "FULL_NFT" ? "Full Property (100%)" : `Fractional Share (${share || 0}%)`}</p>
              <p><span className="font-medium">Price:</span> {amount || "0"} ETH {listingType === "FRACTIONAL" && "(per token)"}</p>
              {listingType === "FRACTIONAL" && share && amount && (
                <p className="text-xs text-gray-600 mt-1">
                  Total value: {(Number(share) * Number(amount)).toFixed(4)} ETH for {share}% ownership
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2 border-t border-green-300 pt-2">
                {listingType === "FULL_NFT" 
                  ? "Buyer will receive the full NFT with 100% ownership rights"
                  : "Buyer will receive ERC-20 fractional tokens representing partial ownership"}
              </p>
            </div>
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
              disabled={listingType === "FRACTIONAL" && (!hasFractionalTokens || userFTBalance <= 0)}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition cursor-pointer ${
                listingType === "FRACTIONAL" && (!hasFractionalTokens || userFTBalance <= 0)
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg"
              }`}
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