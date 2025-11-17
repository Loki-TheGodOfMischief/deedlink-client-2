import { ethers } from "ethers";
import { connectWallet } from "./wallet";
import MarketplaceABI from "./abis/Marketplace.json";
import { setApprovalForAll } from "./contractService";

const MARKETPLACE_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS as string;

async function getSigner() {
  const wallet = await connectWallet();
  if (!wallet) throw new Error("Wallet not connected");
  return wallet.signer;
}

async function getMarketplaceContract() {
  const signer = await getSigner();
  return new ethers.Contract(MARKETPLACE_ADDRESS, MarketplaceABI.abi, signer);
}

export async function listNFTForSale(
  nftAddress: string,
  tokenId: number,
  priceInEth: string
) {
  try {
    console.log("Listing NFT for sale:", { nftAddress, tokenId, priceInEth });
    
    const marketplace = await getMarketplaceContract();
    const priceInWei = ethers.parseEther(priceInEth);

    console.log("Approving marketplace for NFT transfers...");
    await setApprovalForAll(MARKETPLACE_ADDRESS, true);

    console.log("Creating NFT listing...");
    const tx = await marketplace.listNFT(nftAddress, tokenId, priceInWei);
    const receipt = await tx.wait();

    let listingId: string | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = marketplace.interface.parseLog(log);
        if (parsed && parsed.name === "Listed") {
          listingId = parsed.args.listingId.toString();
          break;
        }
      } catch {}
    }

    console.log("NFT listing created successfully:", { listingId, txHash: receipt.hash });

    return {
      success: true,
      listingId,
      txHash: receipt.hash ?? receipt.transactionHash
    };
  } catch (error: any) {
    console.error("Failed to list NFT:", error);
    throw new Error(error.message || "Failed to list NFT for sale");
  }
}

export async function listFractionalTokensForSale(
  nftAddress: string,
  tokenId: number,
  tokenAddress: string,
  amountPercent: number,
  pricePerTokenInEth: string
) {
  try {
    console.log("Listing fractional tokens:", { 
      nftAddress, 
      tokenId, 
      tokenAddress, 
      amountPercent, 
      pricePerTokenInEth 
    });

    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("Invalid fractional token address. Property may not be fractionalized yet.");
    }

    const marketplace = await getMarketplaceContract();
    const signer = await getSigner();
    const priceInWei = ethers.parseEther(pricePerTokenInEth);

    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)",
        "function balanceOf(address account) public view returns (uint256)"
      ],
      signer
    );

    const userAddress = await signer.getAddress();

    console.log("Checking user balance...");
    const balance = await tokenContract.balanceOf(userAddress);
    console.log("User fractional token balance:", balance.toString());

    if (balance < amountPercent) {
      throw new Error(`Insufficient fractional tokens. You have ${balance.toString()} but trying to list ${amountPercent}`);
    }

    console.log("Checking current allowance...");
    const marketplaceAddress = await marketplace.getAddress();
    const currentAllowance = await tokenContract.allowance(userAddress, marketplaceAddress);
    console.log("Current allowance:", currentAllowance.toString());

    if (currentAllowance < amountPercent) {
      console.log("Approving fractional tokens for marketplace...");
      const approveTx = await tokenContract.approve(marketplaceAddress, amountPercent);
      const approveReceipt = await approveTx.wait();
      console.log("Approval successful:", approveReceipt.hash);
    } else {
      console.log("Sufficient allowance already exists");
    }

    console.log("Creating fractional token listing...");
    const tx = await marketplace.listFractionalTokens(
      nftAddress,
      tokenId,
      tokenAddress,
      amountPercent,
      priceInWei
    );
    const receipt = await tx.wait();

    let listingId: string | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = marketplace.interface.parseLog(log);
        if (parsed && parsed.name === "Listed") {
          listingId = parsed.args.listingId.toString();
          break;
        }
      } catch {}
    }

    console.log("Fractional listing created successfully:", { 
      listingId, 
      txHash: receipt.hash 
    });

    return {
      success: true,
      listingId,
      txHash: receipt.hash ?? receipt.transactionHash
    };
  } catch (error: any) {
    console.error("Failed to list fractional tokens:", error);
    throw new Error(error.message || "Failed to list fractional tokens for sale");
  }
}

export async function buyNFT(listingId: number, priceInEth: string) {
  try {
    console.log("Buying NFT:", { listingId, priceInEth });
    
    const marketplace = await getMarketplaceContract();
    const priceInWei = ethers.parseEther(priceInEth);

    const tx = await marketplace.buyNFT(listingId, { value: priceInWei });
    const receipt = await tx.wait();

    console.log("NFT purchase successful:", receipt.hash);

    return {
      success: true,
      txHash: receipt.hash ?? receipt.transactionHash
    };
  } catch (error: any) {
    console.error("Failed to buy NFT:", error);
    throw new Error(error.message || "Failed to purchase NFT");
  }
}

export async function buyFractionalTokens(
  listingId: number,
  amount: number,
  totalPriceInEth: string
) {
  try {
    console.log("Buying fractional tokens:", { listingId, amount, totalPriceInEth });
    
    const marketplace = await getMarketplaceContract();
    const priceInWei = ethers.parseEther(totalPriceInEth);

    const tx = await marketplace.buyFractionalTokens(listingId, amount, {
      value: priceInWei
    });
    const receipt = await tx.wait();

    console.log("Fractional tokens purchase successful:", receipt.hash);

    return {
      success: true,
      txHash: receipt.hash ?? receipt.transactionHash
    };
  } catch (error: any) {
    console.error("Failed to buy fractional tokens:", error);
    throw new Error(error.message || "Failed to purchase fractional tokens");
  }
}

export async function cancelListing(listingId: number) {
  try {
    console.log("Cancelling listing:", listingId);
    
    const marketplace = await getMarketplaceContract();

    const tx = await marketplace.cancelListing(listingId);
    const receipt = await tx.wait();

    console.log("Listing cancelled successfully:", receipt.hash);

    return {
      success: true,
      txHash: receipt.hash ?? receipt.transactionHash
    };
  } catch (error: any) {
    console.error("Failed to cancel listing:", error);
    throw new Error(error.message || "Failed to cancel listing");
  }
}

export async function getListingDetails(listingId: number) {
  try {
    const marketplace = await getMarketplaceContract();
    const listing = await marketplace.getListing(listingId);

    console.log("Raw listing data from contract:", {
      listingId,
      seller: listing.seller,
      nftAddress: listing.nftAddress,
      tokenId: listing.tokenId.toString(),
      tokenAddress: listing.tokenAddress,
      price: listing.price.toString(),
      priceFormatted: ethers.formatEther(listing.price),
      amount: listing.amount.toString(),
      listingType: listing.listingType,
      listingTypeNumber: Number(listing.listingType),
      isActive: listing.isActive
    });

    const typeNumber = Number(listing.listingType);
    const listingTypeStr = typeNumber === 0 ? "NFT" : "FRACTIONAL";

    console.log("Interpreted listing type:", {
      raw: typeNumber,
      interpreted: listingTypeStr
    });

    return {
      seller: listing.seller,
      nftAddress: listing.nftAddress,
      tokenId: listing.tokenId.toString(),
      tokenAddress: listing.tokenAddress,
      price: ethers.formatEther(listing.price),
      priceRaw: listing.price.toString(),
      amount: listing.amount.toString(),
      listingType: listingTypeStr,
      isActive: listing.isActive
    };
  } catch (error: any) {
    console.error("Failed to get listing details:", error);
    throw new Error(error.message || "Failed to get listing details");
  }
}

export async function isListingActive(listingId: number): Promise<boolean> {
  try {
    const details = await getListingDetails(listingId);
    return details.isActive;
  } catch (error) {
    console.error("Failed to check listing status:", error);
    return false;
  }
}