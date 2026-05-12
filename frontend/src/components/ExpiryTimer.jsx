import { useEffect, useState } from "react";

export function ExpiryTimer({ expiresAt }) {
  const [label, setLabel]     = useState("…");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const d = new Date(expiresAt).getTime() - Date.now();
      if (d < 0) { setLabel("Expired"); setExpired(true); return; }
      const h = Math.floor(d / 3_600_000);
      const m = Math.floor((d % 3_600_000) / 60_000);
      setLabel(`${h}h ${m}m left`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${
      expired ? "bg-red-100 text-red-500" : "bg-amber-50 text-amber-600"
    }`}>
      ⏱ {label}
    </span>
  );
}
