import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Btn, Card, Input, Badge, Skeleton, toast } from "../components/ui";
import { apiJson } from "../lib/api";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    email: user?.email || "",
    city: user?.city || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
  });

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiJson("/api/auth/profile"),
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: (data) =>
      apiJson("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update profile");
    },
  });

  const stats = useQuery({
    queryKey: ["profile-stats"],
    queryFn: () => apiJson("/api/dashboard/stats"),
    enabled: !!user,
  });

  if (!user) {
    navigate("/login");
    return null;
  }

  const roleConfig = {
    buyer: { label: "Buyer", color: "success", icon: "🛒" },
    individual_seller: { label: "Seller", color: "default", icon: "📚" },
    store_owner: { label: "Store Owner", color: "warning", icon: "🏪" },
    super_admin: { label: "Admin", color: "destructive", icon: "⚡" },
  };

  const config = roleConfig[user.role] || { label: user.role, color: "default", icon: "👤" };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Btn variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            ← Back
          </Btn>
          <h1 className="text-3xl font-extrabold text-slate-900">My Profile</h1>
          <p className="text-slate-600 mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {user.email.split("@")[0]}
                    </h2>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={config.color}>
                        {config.icon} {config.label}
                      </Badge>
                      {user.approved === false && (
                        <Badge variant="warning">Pending Approval</Badge>
                      )}
                      {user.blocked && (
                        <Badge variant="destructive">Blocked</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {!isEditing && (
                  <Btn variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    ✏️ Edit
                  </Btn>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      disabled
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      City
                    </label>
                    <Input
                      placeholder="Enter your city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <Input
                      type="tel"
                      placeholder="Enter your phone number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                      rows={4}
                      placeholder="Tell us about yourself..."
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Btn
                      variant="default"
                      onClick={() => updateProfile.mutate(form)}
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </Btn>
                    <Btn
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setForm({
                          email: user.email,
                          city: user.city || "",
                          phone: user.phone || "",
                          bio: user.bio || "",
                        });
                      }}
                    >
                      Cancel
                    </Btn>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">City</p>
                    <p className="text-slate-900">{profile.data?.city || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Phone</p>
                    <p className="text-slate-900">{profile.data?.phone || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Bio</p>
                    <p className="text-slate-900">{profile.data?.bio || "No bio added"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Member Since</p>
                    <p className="text-slate-900">
                      {profile.data?.created_at
                        ? new Date(profile.data.created_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Account Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Account Actions</h3>
              <div className="space-y-3">
                <Btn
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/dashboard")}
                >
                  📊 Go to Dashboard
                </Btn>
                {(user.role === "individual_seller" || user.role === "store_owner") && (
                  <Btn
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/sell")}
                  >
                    + List a Book
                  </Btn>
                )}
                <Btn
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/chat")}
                >
                  💬 Messages
                </Btn>
                <Btn
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to logout?")) {
                      await logout();
                      navigate("/");
                    }
                  }}
                >
                  🚪 Logout
                </Btn>
              </div>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Statistics */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Statistics</h3>
              {stats.isLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="space-y-4">
                  {user.role === "buyer" && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Orders</span>
                        <span className="text-2xl font-bold text-slate-900">
                          {stats.data?.orders_count || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Reviews</span>
                        <span className="text-2xl font-bold text-slate-900">
                          {stats.data?.reviews_count || 0}
                        </span>
                      </div>
                    </>
                  )}
                  {(user.role === "individual_seller" || user.role === "store_owner") && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Books Listed</span>
                        <span className="text-2xl font-bold text-slate-900">
                          {stats.data?.books_count || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Books Sold</span>
                        <span className="text-2xl font-bold text-slate-900">
                          {stats.data?.sold_count || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Rating</span>
                        <span className="text-2xl font-bold text-slate-900">
                          {stats.data?.avg_rating
                            ? `⭐ ${stats.data.avg_rating.toFixed(1)}`
                            : "N/A"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>

            {/* Tenant Info */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Tenant Info</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">Tenant ID</p>
                  <p className="text-slate-900 font-mono text-sm">{user.tenant_id}</p>
                </div>
                {user.role === "store_owner" && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Store URL</p>
                    <p className="text-slate-900 font-mono text-sm break-all">
                      /store/{user.tenant_id}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
