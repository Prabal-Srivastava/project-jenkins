import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import { Btn, Input, Card } from "../components/ui";
import { apiJson } from "../lib/api";

const RULES = [
  "At least 8 characters",
  "One uppercase letter (A–Z)",
  "One lowercase letter (a–z)",
  "One digit (0–9)",
  "One special character (!@#$%^&* etc.)",
];

const GMAIL_RE = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;
const PW_RE    = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

function RuleItem({ text, met }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-green-600" : "text-primary-400"}`}>
      <span>{met ? "✅" : "○"}</span> {text}
    </li>
  );
}

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || "/dashboard";

  const [tab, setTab]           = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState("buyer");
  const [tenantId, setTenantId] = useState("default");
  const [error, setError]       = useState("");
  const [pending, setPending]   = useState(false);
  const [rules, setRules]       = useState(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate(user.role === "super_admin" ? "/admin-panel" : from, { replace: true });
  }, [user, navigate, from]);

  // Fetch rules from backend once (ref guard prevents StrictMode double-fetch)
  const rulesFetched = useRef(false);
  useEffect(() => {
    if (rulesFetched.current) return;
    rulesFetched.current = true;
    apiJson("/api/auth/rules").then(setRules).catch(() => {});
  }, []);

  const pwChecks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password),
  ];

  const emailValid = GMAIL_RE.test(email);
  const pwValid    = PW_RE.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!emailValid) { setError("Only @gmail.com addresses are accepted."); return; }
    if (tab === "register" && !pwValid) { setError("Password does not meet the requirements."); return; }
    setPending(true);
    try {
      let me;
      if (tab === "login") {
        me = await login({ email, password });
      } else {
        me = await register({ email, password, role, tenant_id: tenantId });
      }
      navigate(me.role === "super_admin" ? "/admin-panel" : "/dashboard", { replace: true });
    } catch (err) {
      try {
        const body = JSON.parse(err.message);
        if (body.errors) setError(body.errors.map(e => e.msg).join(" · "));
        else setError(body.error || "Something went wrong.");
      } catch {
        setError(err.message || "Something went wrong.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-sky-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl grid gap-12 lg:grid-cols-2 lg:items-center">

        {/* ── Illustration + rules ─────────────────────────── */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left animate-fade-up">
          <div className="animate-float mb-6">
            <div className="relative w-56 h-56 mx-auto lg:mx-0">
              <div className="absolute inset-0 rounded-full bg-primary-200 opacity-40 blur-3xl" />
              <svg viewBox="0 0 220 220" className="relative drop-shadow-xl" fill="none">
                <circle cx="110" cy="70"  r="32" fill="#bfdbfe"/>
                <circle cx="110" cy="62"  r="18" fill="#2563eb"/>
                <rect x="70" y="110" width="80" height="70" rx="12" fill="#3b82f6"/>
                <rect x="85" y="125" width="50" height="8"  rx="4"  fill="white" opacity=".6"/>
                <rect x="85" y="140" width="35" height="8"  rx="4"  fill="white" opacity=".4"/>
                <circle cx="185" cy="55" r="7" fill="#38bdf8" opacity=".7"/>
                <circle cx="35"  cy="90" r="5" fill="#93c5fd" opacity=".6"/>
              </svg>
            </div>
          </div>

          <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 mb-3">
            📚 Purani Books
          </span>
          <h1 className="text-3xl font-extrabold text-primary-900 leading-tight">
            {tab === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-primary-500 max-w-xs">
            {tab === "login"
              ? "Sign in to manage your listings, offers, and orders."
              : "Join thousands of students buying and selling used books."}
          </p>

          {/* Registration rules box */}
          {tab === "register" && (
            <div className="mt-5 w-full max-w-xs rounded-2xl border border-primary-100 bg-white p-4 shadow-sm text-left">
              <p className="text-xs font-bold text-primary-700 mb-2">📋 Registration requirements</p>
              <p className="text-xs text-primary-500 mb-2">
                Email: <span className="font-semibold text-primary-700">@gmail.com only</span>
              </p>
              <p className="text-xs font-semibold text-primary-700 mb-1">Password must have:</p>
              <ul className="space-y-1">
                {RULES.map((r, i) => <RuleItem key={r} text={r} met={pwChecks[i]} />)}
              </ul>
              <p className="mt-3 text-xs text-primary-400 border-t border-primary-50 pt-2">
                🔒 Admin accounts are created only via database seed — not through this form.
              </p>
            </div>
          )}
        </div>

        {/* ── Form ─────────────────────────────────────────── */}
        <div className="animate-fade-up" style={{ animationDelay: "150ms" }}>
          <Card className="p-6 space-y-4">
            {/* Tabs */}
            <div className="flex rounded-xl bg-primary-50 p-1 gap-1">
              {["login", "register"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(""); }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                    tab === t ? "bg-white text-primary-700 shadow" : "text-primary-400 hover:text-primary-600"
                  }`}
                >
                  {t === "login" ? "Sign in" : "Register"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              {/* Email */}
              <div>
                <Input
                  type="email"
                  placeholder="Gmail address (you@gmail.com)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {email && !emailValid && (
                  <p className="mt-1 text-xs text-red-500">Only @gmail.com addresses are accepted.</p>
                )}
              </div>

              {/* Password */}
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />

              {/* Register extras */}
              {tab === "register" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="rounded-xl border border-primary-200 bg-white px-3 py-2.5 text-sm text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="buyer">Buyer</option>
                      <option value="individual_seller">Seller</option>
                      <option value="store_owner">Store owner</option>
                    </select>
                    <Input
                      placeholder="Tenant ID (default)"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                    />
                  </div>

                  {/* Live password checklist */}
                  {password && (
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-primary-50 p-3">
                      {RULES.map((r, i) => <RuleItem key={r} text={r} met={pwChecks[i]} />)}
                    </ul>
                  )}
                </>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              <Btn
                type="submit"
                variant="primary"
                className="w-full py-3"
                disabled={pending}
              >
                {pending
                  ? (tab === "login" ? "Signing in…" : "Registering…")
                  : (tab === "login" ? "Sign in →" : "Create account →")}
              </Btn>
            </form>

            <p className="text-center text-xs text-primary-400">
              {tab === "login" ? (
                <>No account? <button type="button" className="text-primary-600 underline" onClick={() => setTab("register")}>Register</button></>
              ) : (
                <>Already have one? <button type="button" className="text-primary-600 underline" onClick={() => setTab("login")}>Sign in</button></>
              )}
            </p>
          </Card>

          <p className="mt-4 text-center text-xs text-primary-400">
            <Link to="/" className="underline hover:text-primary-600">← Back to catalog</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
