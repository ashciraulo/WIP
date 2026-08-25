import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Nav } from "./components/Nav";
import { Login } from "./pages/Login";
import { MyDashboard } from "./pages/MyDashboard";
import { ManagerDashboard } from "./pages/ManagerDashboard";
import { WipMeetingDashboard } from "./pages/WipMeetingDashboard";
import { Analytics } from "./pages/Analytics";

export function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-sm text-slate-400">Loading...</div>;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen">
      <Nav />
      <Routes>
        <Route path="/" element={<MyDashboard />} />
        <Route path="/manager" element={user.role === "STAFF" ? <Navigate to="/" /> : <ManagerDashboard />} />
        <Route path="/wip-meeting" element={<WipMeetingDashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
