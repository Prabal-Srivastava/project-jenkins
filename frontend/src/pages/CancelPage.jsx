import { Link } from "react-router-dom";

export default function CancelPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 grid gap-12 lg:grid-cols-2 lg:items-center">

      <div className="flex justify-center animate-float">
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 rounded-full bg-primary-100 opacity-50 blur-3xl" />
          <svg viewBox="0 0 240 240" className="relative drop-shadow-xl" fill="none">
            <circle cx="120" cy="120" r="90" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2"/>
            <circle cx="120" cy="120" r="70" fill="#dbeafe"/>
            <path d="M90 90 L150 150M150 90 L90 150" stroke="#60a5fa" strokeWidth="10" strokeLinecap="round"/>
            <circle cx="185" cy="55" r="8" fill="#38bdf8" opacity=".7"/>
            <circle cx="45"  cy="170" r="6" fill="#93c5fd" opacity=".6"/>
          </svg>
        </div>
      </div>

      <div className="animate-fade-up text-center lg:text-left">
        <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-600 mb-3">
          ↩ Checkout Cancelled
        </span>
        <h1 className="text-3xl font-extrabold text-primary-900">
          No charge was <span className="gradient-text">completed</span>
        </h1>
        <p className="mt-3 text-primary-500 leading-relaxed">
          You cancelled the checkout. Your order is still pending — you can return and complete payment any time from your Dashboard.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 justify-center lg:justify-start">
          <Link to="/dashboard" className="rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow hover:bg-primary-700 transition">
            Back to Dashboard
          </Link>
          <Link to="/" className="rounded-xl border border-primary-200 px-6 py-3 font-semibold text-primary-700 hover:bg-primary-50 transition">
            Browse books
          </Link>
        </div>
      </div>
    </div>
  );
}
