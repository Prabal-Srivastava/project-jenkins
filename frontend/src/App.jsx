import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "./components/ui";
import { AuthProvider } from "./context/AuthContext";

// Lazy-loaded pages
const LoginPage          = lazy(() => import("./pages/LoginPage"));
const CatalogPage        = lazy(() => import("./pages/CatalogPage"));
const BookDetailsPage    = lazy(() => import("./pages/BookDetailsPage"));
const ProfilePage        = lazy(() => import("./pages/ProfilePage"));
const SellPage           = lazy(() => import("./pages/SellPage"));
const DashboardPage      = lazy(() => import("./pages/DashboardPage"));
const ChatPage           = lazy(() => import("./pages/ChatPage"));
const SuccessPage        = lazy(() => import("./pages/SuccessPage"));
const CancelPage         = lazy(() => import("./pages/CancelPage"));
const AdminOverviewPage    = lazy(() => import("./pages/admin/AdminOverviewPage"));
const AdminUsersPage       = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminBooksPage       = lazy(() => import("./pages/admin/AdminBooksPage"));
const AdminTenantsPage     = lazy(() => import("./pages/admin/AdminTenantsPage"));
const AdminTicketsPage     = lazy(() => import("./pages/admin/AdminTicketsPage"));
const AdminCommissionsPage = lazy(() => import("./pages/admin/AdminCommissionsPage"));
const AdminCategoriesPage  = lazy(() => import("./pages/admin/AdminCategoriesPage"));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Admin panel — super_admin only */}
            <Route
              path="/admin-panel"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]} redirectTo="/login">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index                element={<AdminOverviewPage />} />
              <Route path="users"         element={<AdminUsersPage />} />
              <Route path="books"         element={<AdminBooksPage />} />
              <Route path="tickets"       element={<AdminTicketsPage />} />
              <Route path="commissions"   element={<AdminCommissionsPage />} />
              <Route path="categories"    element={<AdminCategoriesPage />} />
              <Route path="tenants"       element={<AdminTenantsPage />} />
            </Route>

            {/* Main layout */}
            <Route element={<Layout />}>
              <Route index          element={<CatalogPage />} />
              <Route path="book/:bookId" element={<BookDetailsPage />} />
              <Route path="profile" element={<ProtectedRoute redirectTo="/login"><ProfilePage /></ProtectedRoute>} />
              <Route path="sell"    element={<SellPage />} />
              <Route path="success" element={<SuccessPage />} />
              <Route path="cancel"  element={<CancelPage />} />
              <Route path="dashboard"
                element={<ProtectedRoute redirectTo="/login"><DashboardPage /></ProtectedRoute>}
              />
              <Route path="chat"
                element={<ProtectedRoute redirectTo="/login"><ChatPage /></ProtectedRoute>}
              />
              <Route path="admin" element={<Navigate to="/" replace />} />
              <Route path="*"     element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
