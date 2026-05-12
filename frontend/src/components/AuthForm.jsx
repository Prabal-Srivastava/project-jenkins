import { useState } from "react";
import PasswordInput from "./PasswordInput";
import { Btn, Input } from "./ui";
import { TENANT_ID } from "../lib/tenant";

export default function AuthForm({ onLogin, onRegister, loginPending, registerPending, loginError, registerError }) {
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [regRole, setRegRole]               = useState("buyer");
  const [adminSetupSecret, setAdminSetupSecret] = useState("");
  const [adminSecretShow, setAdminSecretShow]   = useState(false);

  const handleLogin    = () => onLogin({ email, password });
  const handleRegister = () => onRegister({ email, password, role: regRole, tenant_id: TENANT_ID, admin_setup_secret: adminSetupSecret.trim() || undefined });

  return (
    <div className="rounded-2xl border border-primary-100 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-xl font-bold text-primary-900">Welcome back</h2>
        <p className="text-xs text-primary-400 mt-0.5">Sign in or create a new account</p>
      </div>

      <div className="space-y-3">
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
      </div>

      {/* Login */}
      <Btn
        variant="primary"
        className="w-full"
        onClick={handleLogin}
        disabled={loginPending}
      >
        {loginPending ? "Signing in…" : "Sign in →"}
      </Btn>

      <div className="relative flex items-center gap-2">
        <div className="flex-1 border-t border-primary-100" />
        <span className="text-xs text-primary-300">or register</span>
        <div className="flex-1 border-t border-primary-100" />
      </div>

      {/* Register row */}
      <div className="flex gap-2">
        <select
          className="flex-1 rounded-xl border border-primary-200 bg-white px-3 py-2.5 text-sm text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
          value={regRole}
          onChange={(e) => setRegRole(e.target.value)}
        >
          <option value="buyer">Buyer</option>
          <option value="individual_seller">Seller</option>
          <option value="store_owner">Store owner</option>
        </select>
        <Btn
          variant="outline"
          className="flex-1"
          onClick={handleRegister}
          disabled={registerPending}
        >
          {registerPending ? "Registering…" : "Register"}
        </Btn>
      </div>

      {/* Admin secret */}
      <div>
        <label className="text-xs font-medium text-primary-500 block mb-1">
          Admin setup secret <span className="text-primary-300">(optional)</span>
        </label>
        <div className="relative">
          <input
            type={adminSecretShow ? "text" : "password"}
            className="w-full rounded-xl border border-primary-200 bg-white px-3 py-2.5 pr-10 text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
            value={adminSetupSecret}
            onChange={(e) => setAdminSetupSecret(e.target.value)}
            placeholder="Leave empty for normal registration"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setAdminSecretShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-primary-400 hover:text-primary-600 transition"
            tabIndex={-1}
          >
            {adminSecretShow ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {loginError    && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{loginError}</p>}
      {registerError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{registerError}</p>}
    </div>
  );
}
