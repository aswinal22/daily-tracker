import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, theme")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen mesh-gradient relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Desktop sidebar — sticky, full viewport height */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/85 bg-card/30 backdrop-blur-xl lg:block relative z-20">
        <Sidebar />
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col relative z-10">
        <Navbar
          displayName={profile?.display_name}
          email={user.email}
        />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl animate-fade-in">
            <ToastProvider>{children}</ToastProvider>
          </div>
        </main>
      </div>
    </div>
  );
}

