import { Link } from "react-router-dom";

export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 grid gap-12 lg:grid-cols-2 lg:items-center">

      <div className="flex justify-center animate-float">
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 rounded-full bg-green-100 opacity-60 blur-3xl" />
          <svg viewBox="0 0 240 240" className="relative drop-shadow-xl" fill="none">
            <circle cx="120" cy="120" r="90" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2"/>
            <circle cx="120" cy="120" r="70" fill="#dbeafe"/>
            <path d="M80 120 L108 148 L165 90" stroke="#2563eb" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="185" cy="55" r="8" fill="#38bdf8" opacity=".7"/>
            <circle cx="45"  cy="170" r="6" fill="#93c5fd" opacity=".6"/>
          </svg>
        </div>
      </div>

      <div className="animate-fade-up text-center lg:text-left">
        <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 mb-3">
          ✅ Payment Successful
        </span>
        <h1 className="text-3xl font-extrabold text-primary-900">
          Your payment was <span className="gradient-text">received!</span>
        </h1>
        <p className="mt-3 text-primary-600 leading-relaxed">
          Your order is now in <strong>escrow (paid_held)</strong>. The seller will ship your book, and once you confirm delivery the funds are released.
        </p>

        <div className="mt-6 rounded-2xl border border-primary-100 bg-white p-5 shadow-sm space-y-2 text-sm text-primary-700">
          {[["📦","Seller ships the book"],["✅","You confirm delivery in Dashboard"],["💸","Funds released to seller"]].map(([icon,text]) => (
            <div key={text} className="flex items-center gap-2">{icon} {text}</div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-center lg:justify-start">
          <Link to="/dashboard" className="rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow hover:bg-primary-700 transition">
            Go to Dashboard
          </Link>
          <Link to="/" className="rounded-xl border border-primary-200 px-6 py-3 font-semibold text-primary-700 hover:bg-primary-50 transition">
            Browse more books
          </Link>
        </div>
      </div>
    </div>
  );
}
