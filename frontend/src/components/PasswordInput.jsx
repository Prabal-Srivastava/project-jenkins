import { useState } from "react";

export default function PasswordInput({ value, onChange, placeholder = "Password", className = "", ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-primary-200 bg-white px-3 py-2.5 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-primary-400 hover:text-primary-600 transition select-none"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
