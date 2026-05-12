import { Badge, Btn, Card } from "./ui";

const PLAN_COLOR = { basic: "blue", pro: "amber", enterprise: "green" };

export default function AccountCard({ user, onUpgrade, upgrading }) {
  const plan = user?.subscription?.plan_type ?? "basic";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        {/* Avatar + info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
            {(user?.email?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-primary-900 text-sm">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge color="blue">{user?.role}</Badge>
              <Badge color={PLAN_COLOR[plan] ?? "blue"}>{plan} plan</Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Btn variant="primary" className="text-xs px-3 py-1.5" onClick={onUpgrade} disabled={upgrading}>
            {upgrading ? "…" : "⬆ Upgrade"}
          </Btn>
        </div>
      </div>
    </Card>
  );
}
