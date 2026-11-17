import Link from "next/link";

interface SiteHeaderProps {
  active?: "gallery" | "templates" | "playground" | "docs";
}

export default function SiteHeader({ active }: SiteHeaderProps) {
  const navItems: ReadonlyArray<{
    key: NonNullable<SiteHeaderProps["active"]>;
    href: string;
    label: string;
  }> = [
    { key: "gallery", href: "/", label: "Templates" },
    { key: "playground", href: "/playground", label: "Playground" },
    { key: "docs", href: "/docs", label: "Docs" },
  ];

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-zinc-50 hover:text-sky-400 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400"
          />
          <span>Ogami</span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive =
              active === item.key ||
              (active === "templates" && item.key === "gallery");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                  isActive
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
