import { AppShell } from "@/components/layout/app-shell";

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
