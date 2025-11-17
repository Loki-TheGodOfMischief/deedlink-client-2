import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useToast } from "../contexts/ToastContext";
import { useLoader } from "../contexts/LoaderContext";
import { createFractionalToken } from "../web3.0/contractService";
import DeedActionBar from "../components/adeed/deedActionBar";
import TitleHistory from "../components/parts/TitleHistory";
import { deleteCertificate, deleteMarketPlacesById, getCertificatesByTokenId } from "../api/api";
import { useDeedData } from "../hooks/useDeedData";
import MarketplaceBanner from "../components/adeed/ui/MarketplaceBanner";
import DeedHeader from "../components/adeed/ui/DeedHeader";
import OwnerInformation from "../components/adeed/ui/OwnerInformation";
import BlockchainOwners from "../components/adeed/ui/BlockchainOwners";
import LandDetails from "../components/adeed/ui/LandDetails";
import BoundaryDeeds from "../components/adeed/ui/BoundaryDeeds";
import DeedSidebar from "../components/adeed/ui/DeedSidebar";
import DeedModals from "../components/adeed/ui/DeedModals";
import CreateListingPopup from "../components/marketplace-components/CreateListingPopup";
import type { Certificate } from "../types/certificate";
import { cancelListing } from "../web3.0/marketService";

const PROPERTY_NFT_ADDRESS = import.meta.env.VITE_PROPERTY_NFT_ADDRESS as string;

const ADeedPage = () => {
  const { deedNumber } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { showLoader, hideLoader } = useLoader();

  const {
    deed,
    plan,
    signatures,
    numberOfFT,
    tnx,
    marketPlaceData,
    getMarketPlaceData
  } = useDeedData(deedNumber);

  const [openTransact, setOpenTransact] = useState(false);
  const [openDirectTransfer, setOpenDirectTransfer] = useState(false);
  const [openSaleEscrow, setOpenSaleEscrow] = useState(false);
  const [openGiveRent, setOpenGiveRent] = useState(false);
  const [openGetRent, setOpenGetRent] = useState(false);
  const [openMarket, setOpenMarket] = useState(false);
  const [openLastWill, setOpenLastWill] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    const loadCertificate = async () => {
      if (!deed?.tokenId) return;
      try {
        const res = await getCertificatesByTokenId(deed.tokenId);
        setCertificate(res);
      } catch {
        setCertificate(null);
      }
    };
    loadCertificate();
  }, [deed?.tokenId]);

  useEffect(() => {
    if (openTransact || openDirectTransfer || openSaleEscrow || openGiveRent || openGetRent || openMarket || openLastWill || showCreateListing) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
  }, [openTransact, openDirectTransfer, openSaleEscrow, openGiveRent, openGetRent, openMarket, openLastWill, showCreateListing]);

  const handleFractioning = async () => {
    if (deed?.tokenId) {
      try {
        showLoader();
        const res = await createFractionalToken(deed?.tokenId, deed?.deedNumber, deed?.deedNumber, 1000000);
        console.log("Fractioning result:", res);
        showToast("Fractioning success", "success");
      } catch (error) {
        console.error("Fractioning error:", error);
        showToast("Fractioning failed!", "error");
      } finally {
        hideLoader();
      }
    } else {
      showToast("Fractioning failed! No token ID", "error");
    }
  };

  const handleDownload = () => {
    showToast("Download functionality coming soon", "info");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Deed #${deed?.deedNumber}`,
        text: `Check out this property deed`,
        url: window.location.href,
      }).catch(() => {
        showToast("Sharing cancelled", "info");
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard", "success");
    }
  };

  const handleViewBlockchain = () => {
    showToast("Blockchain explorer coming soon", "info");
  };

  const handleRemoveMarketListing = async (marketId: string, listingId: string) => {
    try {
      showLoader();
      
      const cancelResult = await cancelListing(Number(listingId));
      
      if (cancelResult.success) {
        await deleteMarketPlacesById(marketId);
        showToast("Listing removed successfully", "success");
        await getMarketPlaceData();
      } else {
        showToast("Failed to cancel listing on blockchain", "error");
      }
    } catch (error) {
      console.error("Error removing marketplace listing:", error);
      showToast("Failed to remove listing", "error");
    } finally {
      hideLoader();
    }
  };

  const handleMarketplaceClose = () => {
    setOpenMarket(false);
    getMarketPlaceData();
  };

  const handleCreateListing = () => {
    if (!deed?.tokenId) {
      showToast("Cannot create listing: No token ID", "error");
      return;
    }
    setShowCreateListing(true);
  };

  const handleCreateListingSuccess = () => {
    getMarketPlaceData();
  };

  const handleCancelLastWill = async () => {
    if (!certificate) return;
    try {
      showLoader();
      await deleteCertificate(certificate._id);
      setCertificate(null);
      showToast("Last Will cancelled successfully", "success");
      setOpenLastWill(false);
    } catch (error) {
      console.error("Error cancelling last will:", error);
      showToast("Failed to cancel last will", "error");
    } finally {
      hideLoader();
    }
  };

  if (!deed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold text-gray-700">Loading deed information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 relative">
      <div className="flex max-w-boundary mx-auto w-full min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 min-h-full w-full">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium mb-6 transition"
          >
            <FaArrowLeft />
            <span>Back</span>
          </button>

          <div className="lg:hidden mb-6 w-full flex justify-center">
            <MarketplaceBanner 
              marketPlaceData={marketPlaceData} 
              onRemoveListing={handleRemoveMarketListing}
            />
            {(!marketPlaceData || marketPlaceData.filter(m => m.status === "open_to_sale").length === 0) && (
              <DeedActionBar
                onFractioning={handleFractioning}
                deedNumber={deed.deedNumber}
                deedId={deed._id}
                tokenId={deed.tokenId}
                actionHappened={openDirectTransfer || openSaleEscrow || openTransact}
                onTransfer={() => setOpenTransact(true)}
                onDirectTransfer={() => setOpenDirectTransfer(true)}
                onSaleEscrow={() => setOpenSaleEscrow(true)}
                onDownload={handleDownload}
                onShare={handleShare}
                onViewBlockchain={handleViewBlockchain}
                onOpenMarket={handleCreateListing}
                numberOfFT={numberOfFT}
                onRent={() => setOpenGiveRent(true)}
                onPowerOfAttorney={() => {}}
                certificateExists={!!certificate}
                onCancelCertificate={handleCancelLastWill}
                onLastWill={() => setOpenLastWill(true)}
              />
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <DeedHeader deed={deed} numberOfFT={numberOfFT} />

            <div className="p-6">
              <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                  <OwnerInformation deed={deed} />
                  <BlockchainOwners deed={deed} />
                  <LandDetails deed={deed} />
                  <BoundaryDeeds plan={plan} />
                  <TitleHistory tnx={tnx} />
                </div>

                <DeedSidebar deed={deed} plan={plan} signatures={signatures} />
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block py-14 min-h-full pt-20 max-w-full mx-auto lg:sticky lg:top-24 lg:h-fit">
          <MarketplaceBanner 
            marketPlaceData={marketPlaceData} 
            onRemoveListing={handleRemoveMarketListing}
          />
          {(!marketPlaceData || marketPlaceData.filter(m => m.status === "open_to_sale").length === 0) && (
            <DeedActionBar
              onFractioning={handleFractioning}
              deedNumber={deed.deedNumber}
              deedId={deed._id}
              tokenId={deed.tokenId}
              actionHappened={openDirectTransfer || openSaleEscrow || openTransact}
              onTransfer={() => setOpenTransact(true)}
              onDirectTransfer={() => setOpenDirectTransfer(true)}
              onSaleEscrow={() => setOpenSaleEscrow(true)}
              onDownload={handleDownload}
              onShare={handleShare}
              onViewBlockchain={handleViewBlockchain}
              onOpenMarket={handleCreateListing}
              numberOfFT={numberOfFT}
              onRent={() => setOpenGiveRent(true)}
              onPowerOfAttorney={() => {}}
              certificateExists={!!certificate}
              onCancelCertificate={handleCancelLastWill}
              onLastWill={() => setOpenLastWill(true)}
            />
          )}
        </div>
      </div>

      <DeedModals
        deed={deed}
        openTransact={openTransact}
        openDirectTransfer={openDirectTransfer}
        openSaleEscrow={openSaleEscrow}
        openGiveRent={openGiveRent}
        openGetRent={openGetRent}
        openMarket={openMarket}
        openLastWill={openLastWill}
        onCloseTransact={() => setOpenTransact(false)}
        onCloseDirectTransfer={() => setOpenDirectTransfer(false)}
        onCloseSaleEscrow={() => setOpenSaleEscrow(false)}
        onCloseGiveRent={() => setOpenGiveRent(false)}
        onCloseGetRent={() => setOpenGetRent(false)}
        onCloseMarket={handleMarketplaceClose}
        onCloseLastWill={() => setOpenLastWill(false)}
      />

      {deed.tokenId && (
        <CreateListingPopup
          isOpen={showCreateListing}
          onClose={() => setShowCreateListing(false)}
          onSuccess={handleCreateListingSuccess}
          deedId={deed._id}
          tokenId={deed.tokenId}
          nftAddress={PROPERTY_NFT_ADDRESS}
        />
      )}
    </div>
  );
};

export default ADeedPage;