import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-sky-50 to-blue-50">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-primary-100 bg-white/60 py-6 text-center text-xs text-primary-400">
        © {new Date().getFullYear()} Purani Books · Multi-tenant used-book marketplace
      </footer>
    </div>
  );
}
