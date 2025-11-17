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
  const marketplace = await getMarketplaceContract();
  const priceInWei = ethers.parseEther(priceInEth);

  await setApprovalForAll(MARKETPLACE_ADDRESS, true);

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

  return {
    success: true,
    listingId,
    txHash: receipt.hash ?? receipt.transactionHash
  };
}

export async function listFractionalTokensForSale(
  nftAddress: string,
  tokenId: number,
  tokenAddress: string,
  amount: number,
  pricePerTokenInEth: string
) {
  const marketplace = await getMarketplaceContract();
  const priceInWei = ethers.parseEther(pricePerTokenInEth);

  const signer = await getSigner();
  const tokenContract = new ethers.Contract(
    tokenAddress,
    [
      "function approve(address spender, uint256 amount) public returns (bool)",
      "function allowance(address owner, address spender) public view returns (uint256)"
    ],
    signer
  );

  const currentAllowance = await tokenContract.allowance(
    await signer.getAddress(),
    await marketplace.getAddress()
  );

  if (currentAllowance < amount) {
    const approveTx = await tokenContract.approve(
      await marketplace.getAddress(),
      amount
    );
    await approveTx.wait();
  }

  const tx = await marketplace.listFractionalTokens(
    nftAddress,
    tokenId,
    tokenAddress,
    amount,
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

  return {
    success: true,
    listingId,
    txHash: receipt.hash ?? receipt.transactionHash
  };
}

export async function buyNFT(listingId: number, priceInEth: string) {
  const marketplace = await getMarketplaceContract();
  const priceInWei = ethers.parseEther(priceInEth);

  const tx = await marketplace.buyNFT(listingId, { value: priceInWei });
  const receipt = await tx.wait();

  return {
    success: true,
    txHash: receipt.hash ?? receipt.transactionHash
  };
}

export async function buyFractionalTokens(
  listingId: number,
  amount: number,
  totalPriceInEth: string
) {
  const marketplace = await getMarketplaceContract();
  const priceInWei = ethers.parseEther(totalPriceInEth);

  const tx = await marketplace.buyFractionalTokens(listingId, amount, {
    value: priceInWei
  });
  const receipt = await tx.wait();

  return {
    success: true,
    txHash: receipt.hash ?? receipt.transactionHash
  };
}

export async function cancelListing(listingId: number) {
  const marketplace = await getMarketplaceContract();

  const tx = await marketplace.cancelListing(listingId);
  const receipt = await tx.wait();

  return {
    success: true,
    txHash: receipt.hash ?? receipt.transactionHash
  };
}

export async function getListingDetails(listingId: number) {
  const marketplace = await getMarketplaceContract();
  const listing = await marketplace.getListing(listingId);

  return {
    seller: listing.seller,
    nftAddress: listing.nftAddress,
    tokenId: listing.tokenId.toString(),
    tokenAddress: listing.tokenAddress,
    price: ethers.formatEther(listing.price),
    amount: listing.amount.toString(),
    listingType: listing.listingType === 0 ? "NFT" : "FRACTIONAL",
    isActive: listing.isActive
  };
}

export async function buyFromMarketplace(
  marketPlaceId: string,
  _tokenId: string,
  share: number,
  amountInWei: bigint
) {
  try {
    const listing = await getListingDetails(Number(marketPlaceId));
    
    if (!listing.isActive) {
      throw new Error("Listing is not active");
    }

    if (listing.listingType === "FRACTIONAL") {
      const totalPrice = ethers.formatEther(amountInWei);
      const result = await buyFractionalTokens(
        Number(marketPlaceId),
        share,
        totalPrice
      );
      return result.success;
    } else {
      const totalPrice = ethers.formatEther(amountInWei);
      const result = await buyNFT(Number(marketPlaceId), totalPrice);
      return result.success;
    }
  } catch (error) {
    console.error("Error buying from marketplace:", error);
    return false;
  }
}