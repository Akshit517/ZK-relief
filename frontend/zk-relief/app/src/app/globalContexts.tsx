"use client";

import {
  SuiClientProvider,
  WalletProvider,
  ConnectButton,
} from "@mysten/dapp-kit";
import { Navbar } from "./components/navbar/Navbar";
import { Toaster } from "react-hot-toast";
import Footer from "@/app/components/footer/Footer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function GlobalContexts({
  children,
}: {
  children: React.ReactNode;
}) {
  // React-query client must be created outside the render method
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={{
          devnet: {
            url: "https://fullnode.devnet.sui.io:443",
          },
        }}
        defaultNetwork="devnet"
      >
        <WalletProvider autoConnect={true}>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                border: "1px solid #713200",
                color: "#713200",
              },
            }}
          />
          
          <main className="flex flex-col justify-between  min-h-screen">
            
            {children}
          </main>
          
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
