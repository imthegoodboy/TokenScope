import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-bg">
      <DashboardNav />
      <main className="flex-1 flex flex-col min-h-[calc(100vh-57px)]">
        {children}
      </main>
    </div>
  );
}
