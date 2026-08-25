import { useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { SelectWorkspaceScreen } from "./components/SelectWorkspaceScreen";
import { Header } from "./components/Header";
import { BuyTab } from "./components/BuyTab";
import { SellTab } from "./components/SellTab";
import { Footer } from "./components/Footer";

export type ScreenState = "login" | "select_workspace" | "main";

export function App() {
  const [screenState, setScreenState] = useState<ScreenState>("login");
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");

  const handleLoginSuccess = (role: "buyer" | "seller") => {
    setActiveTab(role === "seller" ? "sell" : "buy");
    setScreenState("select_workspace");
  };

  const handleSelectWorkspace = (workspace: "buy" | "sell") => {
    setActiveTab(workspace);
    setScreenState("main");
  };

  const handleLogout = () => {
    setScreenState("login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F1A] text-white selection:bg-teal-600 selection:text-white">
      {/* Screen 1: Login Page */}
      {screenState === "login" && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}

      {/* Screen 2: Choose Workspace Screen */}
      {screenState === "select_workspace" && (
        <SelectWorkspaceScreen
          onSelectWorkspace={handleSelectWorkspace}
          onLogout={handleLogout}
        />
      )}

      {/* Screen 3 & 4: Main Workspace Views (Buyer / Renter UI vs Seller UI) */}
      {screenState === "main" && (
        <>
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSwitchWorkspace={() => setScreenState("select_workspace")}
            onLogout={handleLogout}
            onNewSearch={() => window.location.reload()}
            onAddProperty={() => setActiveTab("sell")}
          />

          <main className="flex-1 flex flex-col">
            {activeTab === "buy" ? <BuyTab /> : <SellTab />}
          </main>

          <Footer />
        </>
      )}
    </div>
  );
}

export default App;
