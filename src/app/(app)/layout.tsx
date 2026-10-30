import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
