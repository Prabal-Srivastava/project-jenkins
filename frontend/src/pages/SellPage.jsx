import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Btn, Card, toast } from "../components/ui";
import { apiJson } from "../lib/api";

export default function SellPage() {
  const [original, setOriginal] = useState("45");
  const [score, setScore]       = useState("4");
  const [age, setAge]           = useState("1");

  const m = useMutation({
    mutationFn: () =>
      apiJson("/api/books/valuation", {
        method: "POST",
        body: JSON.stringify({
          original_price:  parseFloat(original),
          condition_score: parseInt(score, 10),
          age_years:       parseFloat(age),
        }),
      }),
    onSuccess: () => {
      toast.success("Valuation calculated successfully!");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to calculate valuation");
    },
  });

  const inputCls = "w-full rounded-xl border border-primary-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

        {/* Illustration */}
        <div className="flex justify-center animate-float">
          <div className="relative w-64 h-64">
            <div className="absolute inset-0 rounded-full bg-sky-200 opacity-40 blur-3xl" />
            <svg viewBox="0 0 240 240" className="relative drop-shadow-xl" fill="none">
              <rect x="40" y="30" width="160" height="180" rx="16" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2"/>
              <rect x="55" y="50" width="130" height="45" rx="8" fill="#2563eb"/>
              <text x="170" y="82" textAnchor="end" fill="white" fontSize="22" fontWeight="bold">$0.00</text>
              {[0,1,2,3].map(col => [0,1,2].map(row => (
                <rect key={`${col}-${row}`} x={55+col*34} y={110+row*34} width="26" height="26" rx="6"
                  fill={col===3?"#2563eb":"#dbeafe"} />
              )))}
              <circle cx="190" cy="60" r="8" fill="#38bdf8" opacity=".7"/>
              <circle cx="50"  cy="40" r="5" fill="#93c5fd" opacity=".6"/>
            </svg>
          </div>
        </div>

        {/* Form */}
        <div className="animate-fade-up">
          <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 mb-3">
            💰 Price Calculator
          </span>
          <h1 className="text-3xl font-extrabold text-primary-900">
            How much is your<br />
            <span className="gradient-text">book worth?</span>
          </h1>
          <p className="mt-2 text-sm text-primary-500">
            Enter the original price, condition, and age — we'll suggest a fair listing price.
          </p>

          <Card className="mt-6 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-800 mb-1">Original retail price (MSRP $)</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={original} onChange={e => setOriginal(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-800 mb-1">Condition (1 = Worn · 5 = Like New)</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(String(n))}
                    className={`flex-1 rounded-xl py-2 text-sm font-bold transition-all duration-150 ${
                      String(n) === score
                        ? "bg-primary-600 text-white shadow"
                        : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-800 mb-1">Age (years since edition)</label>
              <input className={inputCls} type="number" min="0" step="0.1" value={age} onChange={e => setAge(e.target.value)} />
            </div>

            <Btn variant="primary" className="w-full py-3" onClick={() => m.mutate()} disabled={m.isPending}>
              {m.isPending ? "Calculating…" : "Suggest price →"}
            </Btn>
          </Card>

          {/* Result */}
          {m.data && (
            <div className="mt-4 animate-fade-up rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-sky-50 p-5 shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Suggested listing price</p>
              <p className="mt-1 text-4xl font-extrabold text-primary-700">${m.data.suggested_price.toFixed(2)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-primary-600">
                {[
                  ["After age depreciation", `$${m.data.breakdown.after_age_depreciation}`],
                  ["Depreciation rate",      `${(m.data.breakdown.depreciation_rate*100).toFixed(1)}%`],
                  ["Condition multiplier",   m.data.breakdown.condition_multiplier],
                ].map(([k,v]) => (
                  <div key={k} className="rounded-lg bg-white/70 p-2">
                    <p className="font-semibold">{k}</p>
                    <p className="text-primary-800 font-bold">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {m.isError && (
            <p className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
              {m.error instanceof Error ? m.error.message : String(m.error)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
