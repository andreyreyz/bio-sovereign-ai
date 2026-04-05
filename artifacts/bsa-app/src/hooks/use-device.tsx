import { createContext, useContext, useState, ReactNode } from "react";

export type DeviceBrand = "apple" | "samsung" | "garmin" | "fitbit" | "xiaomi";

export interface ConnectedDevice {
  id: DeviceBrand;
  name: string;
  model: string;
  battery: number;
  lastSync: Date;
  icon: string;
}

const DEVICE_CATALOG: Record<DeviceBrand, Omit<ConnectedDevice, "battery" | "lastSync">> = {
  apple:   { id: "apple",   name: "Apple Watch", model: "Series 9",        icon: "⌚" },
  samsung: { id: "samsung", name: "Samsung",      model: "Galaxy Watch 6",  icon: "📱" },
  garmin:  { id: "garmin",  name: "Garmin",       model: "Fenix 7",         icon: "🏃" },
  fitbit:  { id: "fitbit",  name: "Fitbit",       model: "Sense 2",         icon: "💪" },
  xiaomi:  { id: "xiaomi",  name: "Xiaomi",       model: "Mi Band 8",       icon: "🔴" },
};

interface DeviceContextType {
  device: ConnectedDevice | null;
  connecting: boolean;
  connect: (brand: DeviceBrand) => void;
  disconnect: () => void;
  syncNow: () => void;
  syncing: boolean;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<ConnectedDevice | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const connect = (brand: DeviceBrand) => {
    setConnecting(true);
    setTimeout(() => {
      setDevice({
        ...DEVICE_CATALOG[brand],
        battery: Math.round(60 + Math.random() * 40),
        lastSync: new Date(),
      });
      setConnecting(false);
    }, 2000);
  };

  const disconnect = () => setDevice(null);

  const syncNow = () => {
    if (!device) return;
    setSyncing(true);
    setTimeout(() => {
      setDevice(prev => prev ? { ...prev, lastSync: new Date() } : null);
      setSyncing(false);
    }, 1500);
  };

  return (
    <DeviceContext.Provider value={{ device, connecting, connect, disconnect, syncNow, syncing }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDevice must be used within DeviceProvider");
  return ctx;
}
