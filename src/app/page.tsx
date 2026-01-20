import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  Wallet,
  PieChart,
  Shield,
  Smartphone,
  Zap,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function LandingPage() {
  const session = await auth()

  // Si el usuario está logueado, redirigir al dashboard
  if (session?.user) {
    if (!session.user.onboardingCompleted) {
      redirect('/onboarding')
    }
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="font-display text-xl font-bold text-primary">
            Finanzas
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href="/register">
              <Button>Crear cuenta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Simple, rápido y sin complicaciones
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Toma el control de tus{' '}
            <span className="text-primary">finanzas personales</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Registra tus gastos e ingresos en segundos. Visualiza tus cuentas y
            tarjetas en un solo lugar. Sin complicaciones, sin curva de aprendizaje.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto text-base">
                Comenzar gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para gestionar tu dinero
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Diseñado para ser simple y efectivo. Sin funciones innecesarias que
              nunca usarás.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Cuentas Bancarias</h3>
              <p className="text-muted-foreground">
                Registra todas tus cuentas de ahorro y corriente. Visualiza tu balance
                total en un instante.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Tarjetas de Crédito</h3>
              <p className="text-muted-foreground">
                Controla tus tarjetas con fechas de corte, límites y deuda actual.
                Alertas antes de cada pago.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                <PieChart className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Balance Consolidado</h3>
              <p className="text-muted-foreground">
                Ve tu situación financiera real: cuánto tienes, cuánto debes y tu
                balance neto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Diseñado para tu día a día
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Registro en segundos</h3>
                    <p className="text-muted-foreground">
                      Registra un gasto en menos de 10 segundos. Sin formularios
                      largos ni pasos innecesarios.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Desde cualquier dispositivo</h3>
                    <p className="text-muted-foreground">
                      Aplicación web responsive. Accede desde tu celular, tablet o
                      computadora sin instalar nada.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Tus datos seguros</h3>
                    <p className="text-muted-foreground">
                      Tu información está protegida con encriptación de nivel
                      bancario. Solo tú tienes acceso.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 p-8 flex items-center justify-center">
                <div className="w-full max-w-xs space-y-4">
                  <div className="bg-card rounded-lg p-4 shadow-lg">
                    <p className="text-sm text-muted-foreground mb-1">Balance Total</p>
                    <p className="text-2xl font-bold text-success">$45,230.00</p>
                  </div>
                  <div className="bg-card rounded-lg p-4 shadow-lg ml-8">
                    <p className="text-sm text-muted-foreground mb-1">Deuda Total</p>
                    <p className="text-2xl font-bold text-danger">-$12,500.00</p>
                  </div>
                  <div className="bg-card rounded-lg p-4 shadow-lg">
                    <p className="text-sm text-muted-foreground mb-1">Balance Neto</p>
                    <p className="text-2xl font-bold text-primary">$32,730.00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Empieza a controlar tus finanzas hoy
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Crea tu cuenta gratis y configura tus cuentas y tarjetas en menos de 2
            minutos.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-base">
              Crear cuenta gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg font-bold text-primary">
            Finanzas
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Finanzas. Gestiona tu dinero con facilidad.
          </p>
        </div>
      </footer>
    </div>
  )
}
