export default function PageHero({ illustration, badge, title, subtitle, children, flip = false }) {
  return (
    <div className={`grid gap-12 lg:grid-cols-2 lg:items-center ${flip ? "" : ""}`}>
      {/* Illustration */}
      <div className={`flex justify-center ${flip ? "lg:order-2" : "lg:order-1"}`}>
        <div className="relative w-64 h-64 animate-float">
          <div className="absolute inset-0 rounded-full bg-primary-200 opacity-40 blur-3xl" />
          <div className="relative drop-shadow-xl flex items-center justify-center h-full">
            {illustration}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`animate-fade-up ${flip ? "lg:order-1" : "lg:order-2"}`}>
        {badge && (
          <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 mb-3">
            {badge}
          </span>
        )}
        {title && (
          <h1 className="text-3xl font-extrabold text-primary-900 leading-tight">{title}</h1>
        )}
        {subtitle && (
          <p className="mt-2 text-sm text-primary-500 leading-relaxed">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}
