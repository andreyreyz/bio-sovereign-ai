import { createContext, useContext, useState, ReactNode } from "react";

const DEMO_WALLET_ADDRESS = "C3ut3tRxbUiitGxHWXxNJrUvYkUTaioXFnaCyAMs6nmN";

interface WalletContextType {
  address: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  const connect = () => {
    setAddress(DEMO_WALLET_ADDRESS);
  };

  const disconnect = () => {
    setAddress(null);
  };

  return (
    <WalletContext.Provider value={{ address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
