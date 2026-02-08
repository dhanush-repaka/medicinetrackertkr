import "@/App.css";
import { HashRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PrintSchedule from "./pages/PrintSchedule";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="app-container">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/print" element={<PrintSchedule />} />
        </Routes>
      </HashRouter>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
