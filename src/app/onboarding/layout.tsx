'use client'

import { usePathname } from 'next/navigation'

const steps = [
  { path: '/onboarding', label: 'Bienvenida' },
  { path: '/onboarding/accounts', label: 'Cuentas' },
  { path: '/onboarding/cards', label: 'Tarjetas' },
  { path: '/onboarding/summary', label: 'Confirmar' },
]

function ProgressIndicator() {
  const pathname = usePathname()
  const currentIndex = steps.findIndex((step) => step.path === pathname)

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={step.path} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                index <= currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 md:w-24 h-1 mx-2 transition-colors ${
                  index < currentIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Paso {currentIndex + 1} de {steps.length}: {steps[currentIndex]?.label}
      </p>
    </div>
  )
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <ProgressIndicator />
        {children}
      </div>
    </div>
  )
}
