import { ethers } from "ethers";
import { connectWallet } from "./wallet";
import PropertyNFTABI from "./abis/PropertyNFT.json";
import FractionalTokenFactoryABI from "./abis/FractionTokenFactory.json";
import FractionalTokenABI from "./abis/FractionalToken.json";

const PROPERTY_NFT_ADDRESS = import.meta.env.VITE_PROPERTY_NFT_ADDRESS as string;
const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS as string;

console.log(PROPERTY_NFT_ADDRESS);

async function getSigner() {
  const wallet = await connectWallet();
  if (!wallet) throw new Error("Wallet not connected");
  return wallet.signer;
}

async function getPropertyNFTContract() {
  const signer = await getSigner();
  return new ethers.Contract(PROPERTY_NFT_ADDRESS, PropertyNFTABI.abi, signer);
}

async function getFactoryContract() {
  const signer = await getSigner();
  return new ethers.Contract(FACTORY_ADDRESS, FractionalTokenFactoryABI.abi, signer);
}

async function getFractionalTokenContract(address: string) {
  const signer = await getSigner();
  return new ethers.Contract(address, FractionalTokenABI.abi, signer);
}

export async function mintNFT(to: string, ipfsuri: string, dburi: string) {
  const nft = await getPropertyNFTContract();

  const tx = await nft.mintProperty(to, ipfsuri, dburi);
  const receipt = await tx.wait();

  let tokenId: string | undefined;

  for (const log of receipt.logs) {
    let parsed: ethers.LogDescription | null = null;

    try {
      parsed = nft.interface.parseLog(log);
    } catch {
    }

    if (parsed && parsed.name === "Transfer") {
      tokenId = parsed.args.tokenId.toString();
      break;
    }
  }
  return { tokenId, txHash: (receipt as any).hash ?? (receipt as any).transactionHash };
}

export async function transferNFT(from: string, to: string, tokenId: number) {
  const nft = await getPropertyNFTContract();
  const tx = await nft.transferFrom(from, to, tokenId);
  const receipt = await tx.wait();
  console.log(receipt);
  
  return { 
    txHash: receipt.hash ?? receipt.transactionHash 
  };
}

export async function safeTransferNFT(from: string, to: string, tokenId: number) {
  const nft = await getPropertyNFTContract();
  const tx = await nft["safeTransferFrom(address,address,uint256)"](from, to, tokenId);
  const receipt = await tx.wait();
  
  return { 
    txHash: receipt.hash ?? receipt.transactionHash 
  };
}

export async function approveNFT(to: string, tokenId: number) {
  const nft = await getPropertyNFTContract();
  const tx = await nft.approve(to, tokenId);
  const receipt = await tx.wait();
  
  return { 
    txHash: receipt.hash ?? receipt.transactionHash 
  };
}

export async function setApprovalForAll(operator: string, approved: boolean) {
  const nft = await getPropertyNFTContract();
  const tx = await nft.setApprovalForAll(operator, approved);
  const receipt = await tx.wait();
  
  return { 
    txHash: receipt.hash ?? receipt.transactionHash 
  };
}

export async function getApproved(tokenId: number) {
  const nft = await getPropertyNFTContract();
  return await nft.getApproved(tokenId);
}

export async function isApprovedForAll(owner: string, operator: string) {
  const nft = await getPropertyNFTContract();
  return await nft.isApprovedForAll(owner, operator);
}

export async function checkNFTApproval(tokenId: number): Promise<{
  isApproved: boolean;
  approvedAddress: string;
}> {
  const nft = await getPropertyNFTContract();
  const approvedAddress = await nft.getApproved(tokenId);
  
  return {
    isApproved: approvedAddress !== "0x0000000000000000000000000000000000000000",
    approvedAddress
  };
}

export async function getNFTURI(tokenId: number) {
  const nft = await getPropertyNFTContract();
  return await nft.tokenURI(tokenId);
}

export async function getNFTOwner(tokenId: number) {
  const nft = await getPropertyNFTContract();
  return await nft.ownerOf(tokenId);
}

export async function createFractionalToken(nftId: number, name: string, symbol: string, supply: number) {
  const factory = await getFactoryContract();
  const propertyNFT = await getPropertyNFTContract();
  const tx = await factory.createFractionToken(nftId, name, symbol, supply, propertyNFT.getAddress());
  const receipt = await tx.wait();

  const event = receipt.events?.find((e: any) => e.event === "FractionTokenCreated");
  return event?.args?.tokenAddress;
}

export async function getFTBalance(tokenAddress: string, account: string) {
  const fft = await getFactoryContract();
  return await fft.getFractionBalance(tokenAddress,account);
}

export async function getFractionalTokenAddress(nftId: number) {
  const factory = await getFactoryContract();
  return await factory.propertyToFractionToken(nftId);
}

export async function transferFT(tokenAddress: string, to: string, amount: number) {
  const ft = await getFractionalTokenContract(tokenAddress);
  const tx = await ft.transfer(to, amount);
  return await tx.wait();
}

export async function getSignatures(tokenId: number) {
  const nft = await getPropertyNFTContract();

  try {
    const surveyor: boolean = await nft.isSignedBySurveyor(tokenId);
    const notary: boolean = await nft.isSignedByNotary(tokenId);
    const ivsl: boolean = await nft.isSignedByIVSL(tokenId);
    const fully: boolean = await nft.isFullySigned(tokenId);

    return { surveyor, notary, ivsl, fully };
  } catch (err) {
    console.error("Contract call failed:", err);
    throw err;
  }
}

export async function nftOwnershipVerification(tokenId: number, userAddress: string) {
  const nft = await getPropertyNFTContract();
  const owner = await nft.ownerOf(tokenId);
  return owner.toLowerCase() === userAddress.toLowerCase();
}