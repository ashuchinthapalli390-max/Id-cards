"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Image,
  Download,
  ScrollText,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
  effectiveRole: "FOUNDER" | "CO_FOUNDER" | "CTO" | "HR";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If we are on the login page itself, just render children directly
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/me");
        const data = await res.json();
        if (!res.ok || !data.authenticated) {
          router.push("/admin/login");
        } else {
          setAdmin(data.user);
        }
      } catch {
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {}
    router.push("/admin/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center p-4">
        <img
          src="/images/logo.jpeg"
          alt="CodeXa Logo"
          className="w-12 h-12 rounded-xl border border-[rgba(255,30,60,0.55)] object-cover shadow-[0_0_20px_rgba(255,30,60,0.35)] animate-pulse mb-3"
        />
        <p className="text-[#A5A5A5] text-xs font-mono uppercase tracking-widest">
          Authenticating administrative session...
        </p>
      </div>
    );
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Photo Gallery",
      href: "/admin/photos",
      icon: Image,
    },
    {
      name: "ZIP Export",
      href: "/admin/exports",
      icon: Download,
    },
    {
      name: "Audit Logs",
      href: "/admin/audit",
      icon: ScrollText,
    },
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-[#F7F7F7] flex flex-col">
      {/* Top Header Bar */}
      <header className="border-b border-[rgba(217,4,41,0.2)] bg-[#0C0C0C]/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link href="/admin/dashboard" className="flex items-center space-x-3">
              <img
                src="/images/logo.jpeg"
                alt="CodeXa Logo"
                className="w-9 h-9 rounded-lg border border-[rgba(255,30,60,0.55)] object-cover shadow-[0_0_12px_rgba(255,30,60,0.3)]"
              />
              <div>
                <span className="font-heading font-black tracking-widest text-white text-sm sm:text-base">
                  CODEXA <span className="text-[#FF1E3C]">PORTAL</span>
                </span>
                <span className="hidden md:inline-block ml-2 px-1.5 py-0.5 rounded text-[9px] font-heading font-bold uppercase tracking-wider bg-[rgba(217,4,41,0.18)] text-[#FF1E3C] border border-[rgba(255,30,60,0.4)]">
                  Admin Center
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                    isActive
                      ? "bg-[rgba(217,4,41,0.2)] text-white border border-[rgba(255,30,60,0.55)] shadow-[0_0_15px_rgba(217,4,41,0.25)]"
                      : "text-[#A5A5A5] hover:text-white hover:bg-[#141414]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#FF1E3C]" : "text-[#A5A5A5]"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Admin Profile & Actions */}
          <div className="flex items-center space-x-3">
            {admin && (
              <div className="hidden sm:flex items-center space-x-2.5 bg-[#141414] border border-[rgba(217,4,41,0.2)] px-3 py-1.5 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-[rgba(217,4,41,0.25)] text-[#FF1E3C] font-bold text-xs flex items-center justify-center border border-[rgba(255,30,60,0.4)]">
                  {admin.fullName?.charAt(0) || admin.username.charAt(0).toUpperCase()}
                </div>
                <div className="text-left text-xs">
                  <span className="text-white font-semibold block leading-tight">
                    {admin.fullName || admin.username}
                  </span>
                  <span className="text-[10px] text-[#FF1E3C] font-mono font-bold tracking-wider uppercase block">
                    {admin.effectiveRole}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-[#141414] hover:bg-[rgba(217,4,41,0.2)] text-[#A5A5A5] hover:text-[#FF1E3C] border border-[rgba(217,4,41,0.2)] hover:border-[rgba(255,30,60,0.4)] transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-[#141414] text-[#A5A5A5] border border-[rgba(217,4,41,0.2)]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[rgba(217,4,41,0.2)] bg-[#0C0C0C] px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    isActive
                      ? "bg-[rgba(217,4,41,0.25)] text-white border border-[rgba(255,30,60,0.5)]"
                      : "text-[#A5A5A5] hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#FF1E3C]" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Admin Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </div>

      {/* Footer */}
      <footer className="border-t border-[rgba(217,4,41,0.2)] bg-[#070707] py-4 text-xs text-[#666666] text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} CodeXa Agency • Subdomain: <span className="font-mono text-[#A5A5A5]">id.codxa-agency.online</span></span>
          <span className="text-[11px] text-[#666666]">Connected to Core PostgreSQL Database</span>
        </div>
      </footer>
    </div>
  );
}
