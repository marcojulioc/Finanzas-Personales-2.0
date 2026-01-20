import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  if (!session.user.onboardingCompleted) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardNav user={session.user} />
      <main className="container mx-auto p-4 md:p-8">{children}</main>
    </div>
  )
}
