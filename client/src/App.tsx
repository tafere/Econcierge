import { Switch, Route } from "wouter";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import RoomsPage from "@/pages/Rooms";
import GuestPage from "@/pages/Guest";
import TvDisplay from "@/pages/TvDisplay";
import HotelSettingsPage from "@/pages/HotelSettings";
import StaffManagementPage from "@/pages/StaffManagement";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function StaffRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-700" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Switch>
      <Route path="/"         component={DashboardPage} />
      <Route path="/rooms"    component={RoomsPage} />
      <Route path="/staff"    component={StaffManagementPage} />
      <Route path="/settings" component={HotelSettingsPage} />
      <Route component={DashboardPage} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          {/* Public routes — no auth */}
          <Route path="/r/:token"  component={GuestPage} />
          <Route path="/tv/:token" component={TvDisplay} />
          {/* Staff routes */}
          <Route component={StaffRouter} />
        </Switch>
      </AuthProvider>
    </QueryClientProvider>
  );
}
