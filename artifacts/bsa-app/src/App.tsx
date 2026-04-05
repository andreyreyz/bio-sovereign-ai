import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/hooks/use-wallet";
import { LangProvider } from "@/hooks/use-language";
import { DeviceProvider } from "@/hooks/use-device";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Registry from "@/pages/registry";
import Statistics from "@/pages/statistics";
import Profile from "@/pages/profile";
import Clinics from "@/pages/clinics";
import ClinicB2B from "@/pages/clinic-b2b";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/registry" component={Registry} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/profile" component={Profile} />
        <Route path="/clinics" component={Clinics} />
        <Route path="/clinic-b2b" component={ClinicB2B} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <WalletProvider>
          <DeviceProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </DeviceProvider>
        </WalletProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default App;
