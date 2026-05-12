import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import AccountCard from "../components/AccountCard";
import { useAuth } from "../context/AuthContext";
import { apiJson } from "../lib/api";
import BuyerDashboard      from "./dashboard/BuyerDashboard";
import SellerDashboard     from "./dashboard/SellerDashboard";
import StoreOwnerDashboard from "./dashboard/StoreOwnerDashboard";

const ROLE_LABEL = {
  buyer:             { icon: "🛒", title: "Buyer Dashboard" },
  individual_seller: { icon: "📚", title: "Seller Dashboard" },
  store_owner:       { icon: "🏪", title: "Store Dashboard" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const qc       = useQueryClient();

  const upgrade = useMutation({
    mutationFn: () =>
      apiJson("/api/subscriptions/upgrade", { method: "POST", body: JSON.stringify({ plan_type: "pro" }) }),
    onSuccess: () => qc.invalidateQueries(),
  });

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "super_admin") return <Navigate to="/admin-panel" replace />;

  const meta = ROLE_LABEL[user.role] ?? { icon: "👤", title: "Dashboard" };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 mb-2">
          {meta.icon} {meta.title}
        </span>
        <h1 className="text-2xl font-extrabold text-primary-900">
          Welcome, <span className="gradient-text">{user.email.split("@")[0]}</span>
        </h1>
      </div>

      {/* Account card */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AccountCard
          user={user}
          onUpgrade={() => upgrade.mutate()}
          upgrading={upgrade.isPending}
        />
      </div>

      {/* Role-based content */}
      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        {user.role === "buyer"             && <BuyerDashboard />}
        {user.role === "individual_seller" && <SellerDashboard />}
        {user.role === "store_owner"       && <StoreOwnerDashboard />}
      </div>
    </div>
  );
}
