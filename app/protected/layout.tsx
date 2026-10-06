import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { Shield } from "lucide-react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Minimal top-bar just for auth */}
      <div className="hidden">
        {/* Auth still accessible if needed */}
        {hasEnvVars && (
          <Suspense>
            <AuthButton />
          </Suspense>
        )}
      </div>
      {children}
    </div>
  );
}
