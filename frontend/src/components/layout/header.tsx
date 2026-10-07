import { ApiStatus } from "./api-status";
import { MainNav } from "./main-nav";

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <span className="text-base font-semibold">
            ACME Salary Management
          </span>
          <MainNav />
        </div>
        <ApiStatus />
      </div>
    </header>
  );
}
