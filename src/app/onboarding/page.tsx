'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function OnboardingWelcomePage() {
  const router = useRouter()

  return (
    <Card className="text-center">
      <CardHeader className="pb-4">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-3xl font-display">
          ¡Bienvenido a Finanzas!
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Antes de comenzar, configuremos tus cuentas y tarjetas para que tengas
          una visión real de tus finanzas desde el primer día.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <span className="text-success font-medium">1</span>
            </div>
            <div>
              <p className="font-medium">Agrega tus cuentas bancarias</p>
              <p className="text-sm text-muted-foreground">
                Registra tus cuentas de ahorro o corriente con su balance actual
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <span className="text-success font-medium">2</span>
            </div>
            <div>
              <p className="font-medium">Agrega tus tarjetas de crédito</p>
              <p className="text-sm text-muted-foreground">
                Registra tus tarjetas con sus límites y deuda actual
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <span className="text-success font-medium">3</span>
            </div>
            <div>
              <p className="font-medium">Confirma y comienza</p>
              <p className="text-sm text-muted-foreground">
                Revisa tu información y empieza a gestionar tus finanzas
              </p>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => router.push('/onboarding/accounts')}
        >
          Comenzar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="text-xs text-muted-foreground">
          Este proceso solo toma unos minutos. Puedes agregar más cuentas y
          tarjetas después en Configuración.
        </p>
      </CardContent>
    </Card>
  )
}
