"use client";
import Link from "@/components/link";
import { usePathname } from "next/navigation";
import ResponsiveAppBar from "@/components/app-bar";
import AppSidebar from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// Public PageLayout/Header composition ported from Karhdo; admin keeps Brocoders' shell.
export default function JournalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (/(^|\/)blog(\/|$)/.test(pathname))
    return (
      <div className="journal">
        <header className="journal-header">
          <Link className="wordmark" href="/blog">
            Quan Dev Journal
          </Link>
          <nav aria-label="Main">
            <Link href="/blog">Blog</Link>
            <a href="https://quantm.is-a.dev">Portfolio</a>
            <Link href="/admin-panel/articles">Admin</Link>
          </nav>
        </header>
        <main className="journal-container">{children}</main>
        <footer className="journal-container journal-footer">
          Trần Minh Quân · <a href="https://github.com/micharel09">GitHub</a>
        </footer>
      </div>
    );
  return (
    <SidebarProvider className="flex-col [--header-height:4rem]">
      <ResponsiveAppBar />
      <div className="flex flex-1">
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
