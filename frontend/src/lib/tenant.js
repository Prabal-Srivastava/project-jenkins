const raw = import.meta.env.VITE_TENANT_ID;
export const TENANT_ID = typeof raw === "string" && raw.trim() ? raw.trim() : "default";
