"use client";

import Image from "next/image";
import { useState } from "react";
import { MdCheck, MdContentCopy } from "react-icons/md";

interface CryptoWallet {
  name: string;
  color: string;
  logo: string;
  address: string;
}

const cryptoWallets: CryptoWallet[] = [
  {
    name: "Bitcoin",
    color: "#F7931A",
    logo: "/crypto/bitcoin-wordmark.png",
    address: "bc1qm3wrfeth8e39ylsr5qxjaa5jr6hr37ndddncpv",
  },
  {
    name: "Ethereum",
    color: "#CAB3F5",
    logo: "/crypto/ethereum-wordmark-gray.svg",
    address: "0x796f9439E4DE91168842611e6cCA4950e3b4a819",
  },
  {
    name: "Base",
    color: "#0052FF",
    logo: "/crypto/base-wordmark-white.svg",
    address: "0x796f9439E4DE91168842611e6cCA4950e3b4a819",
  },
  {
    name: "Solana",
    color: "#9945ff",
    logo: "/crypto/solana-wordmark-white.svg",
    address: "A1sRXU7HQ4gCeoGAv45RKNCYAYTj5MQkYSuiUB2iij4",
  },
  {
    name: "Polkadot",
    color: "#FF2670",
    logo: "/crypto/polkadot-wordmark-white.svg",
    address: "1a6GKaSsVa5QicJhv1UKdrh7WC62UvnSzBH9gET6BBd4Qqt",
  },
  {
    name: "Sui",
    color: "#4da2ff",
    logo: "/crypto/sui-wordmark-white.svg",
    address:
      "0x15d37a3eeedc4af6629012ea9a2da720004cc9bfb4006e4437389052ef112633",
  },
];

export default function DonatePage() {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copyToClipboard = async (address: string, cryptoName: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(cryptoName);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
      // You might want to show a user-facing error message here
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Support Project
          </h1>
          <p className="text-lg text-gray-600">
            Any donations are welcome. Imma get shut down at some point because
            corpos hate sex, need donations to migrate to shady sex-positive
            infra. Choose your preferred cryptocurrency below.
          </p>
        </div>

        <div className="space-y-5">
          {cryptoWallets.map((wallet) => (
            <div
              key={wallet.name}
              className="bg-white rounded-lg shadow-sm overflow-hidden flex"
              style={{ border: `3px solid ${wallet.color}` }}
            >
              {/* Left section with logo */}
              <div
                className="flex items-center justify-center p-4 w-60"
                style={{
                  backgroundColor:
                    wallet.name === "Bitcoin" ? "#FFFFFF" : wallet.color,
                }}
              >
                <div className="h-10 flex items-center justify-center">
                  {" "}
                  {/* Container for consistent logo height */}
                  <Image
                    src={wallet.logo}
                    alt={`${wallet.name} logo`}
                    width={160}
                    height={40}
                    className="object-contain max-h-10 w-40"
                  />
                </div>
              </div>

              {/* Right section with address and copy button */}
              <div className="flex-1 bg-gray-100 p-4 flex items-center">
                <div className="flex-1 bg-white rounded-md py-2 px-3 mr-3 border border-gray-300 shadow-sm">
                  <p className="text-gray-800 font-mono text-sm break-all">
                    {wallet.address}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(wallet.address, wallet.name)}
                  className={`px-3 py-2 rounded-md font-medium text-xs transition-colors duration-200 flex items-center justify-center w-28 h-10 shadow-sm ${
                    copiedAddress === wallet.name
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-gray-800 text-white hover:bg-gray-700"
                  }`}
                  aria-label={`Copy ${wallet.name} address`}
                >
                  {copiedAddress === wallet.name ? (
                    <>
                      <MdCheck className="w-4 h-4 mr-1.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <MdContentCopy className="w-4 h-4 mr-1.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm">
            Thank you for your support! All donations are greatly appreciated
            and help us continue our work.
          </p>
        </div>
      </div>
    </div>
  );
}
