/* Pure Tailwind UI Components - shadcn-inspired design */
import { useEffect, useState } from "react";

// ============================================
// BUTTON COMPONENT
// ============================================
export function Btn({ 
  children, 
  variant = "default", 
  size = "default", 
  className = "", 
  disabled = false,
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-950",
    destructive: "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-950",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-950",
    ghost: "hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-950",
    link: "text-slate-900 underline-offset-4 hover:underline",
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  };
  
  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-9 rounded-md px-3 text-xs",
    lg: "h-11 rounded-md px-8 text-base",
    icon: "h-10 w-10",
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// ============================================
// CARD COMPONENT
// ============================================
export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", ...props }) {
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", ...props }) {
  return (
    <p className={`text-sm text-slate-500 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "", ...props }) {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }) {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

// ============================================
// BADGE COMPONENT
// ============================================
export function Badge({ children, variant = "default", className = "", ...props }) {
  const variants = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    destructive: "bg-red-500 text-slate-50 hover:bg-red-500/80",
    outline: "border border-slate-200 text-slate-950",
    success: "bg-green-500 text-white hover:bg-green-500/80",
    warning: "bg-amber-500 text-white hover:bg-amber-500/80",
    red: "bg-red-500 text-white hover:bg-red-500/80",
    green: "bg-green-500 text-white hover:bg-green-500/80",
    amber: "bg-amber-500 text-white hover:bg-amber-500/80",
  };
  
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================
// INPUT COMPONENT
// ============================================
export function Input({ className = "", type = "text", ...props }) {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

// ============================================
// SKELETON COMPONENT
// ============================================
export function Skeleton({ className = "", count = 1 }) {
  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`animate-pulse rounded-md bg-slate-100 ${className}`} />
        ))}
      </div>
    );
  }
  return <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-2.5">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================
// TOAST SYSTEM
// ============================================
const toasts = [];
let toastId = 0;
const listeners = new Set();

function notify() {
  listeners.forEach(fn => fn());
}

export const toast = {
  success: (message, options = {}) => addToast({ type: "success", message, ...options }),
  error: (message, options = {}) => addToast({ type: "error", message, ...options }),
  info: (message, options = {}) => addToast({ type: "info", message, ...options }),
  warning: (message, options = {}) => addToast({ type: "warning", message, ...options }),
};

function addToast({ type, message, duration = 4000 }) {
  const id = ++toastId;
  toasts.push({ id, type, message, duration });
  notify();
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
  return id;
}

function removeToast(id) {
  const idx = toasts.findIndex(t => t.id === id);
  if (idx !== -1) {
    toasts.splice(idx, 1);
    notify();
  }
}

export function Toaster() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function Toast({ id, type, message, onClose }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  const colors = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg min-w-[300px] max-w-md transition-all duration-300 ${
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      } ${colors[type]}`}
    >
      <span className="text-xl">{icons[type]}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={handleClose}
        className="text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

// ============================================
// UTILITY COMPONENTS
// ============================================
export function StatCard({ icon, label, value, delay = 0 }) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h2 className="text-lg font-bold text-slate-900 mb-4">{children}</h2>;
}

export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
      {message}
    </div>
  );
}

export function EmptyState({ icon = "📭", message = "Nothing here yet." }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-8 text-center">
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
