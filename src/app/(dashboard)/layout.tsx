import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard-nav'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { OfflineIndicator } from '@/components/offline-indicator'

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
      <OfflineIndicator />
      <DashboardNav user={session.user} />
      <main className="container mx-auto p-4 md:p-8 pb-24 md:pb-8">{children}</main>
      <MobileBottomNav />
    </div>
  )
}
