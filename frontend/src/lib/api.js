import { TENANT_ID } from "./tenant";

export function apiHeaders(json = true) {
  const h = { "X-Tenant-Id": TENANT_ID };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export async function apiJson(path, init = {}) {
  const base   = apiHeaders(!(init.body instanceof FormData));
  const merged = { ...base };
  if (init.headers && typeof init.headers === "object") {
    Object.assign(merged, init.headers);
  }
  const res = await fetch(path, { ...init, headers: merged, credentials: "include" });
  if (res.status === 401) {
    // Session expired - handled by AuthContext
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
