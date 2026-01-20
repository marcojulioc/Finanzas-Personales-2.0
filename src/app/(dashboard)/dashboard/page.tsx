import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Landmark, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'

async function getDashboardData(userId: string) {
  const [bankAccounts, creditCards] = await Promise.all([
    db.bankAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.creditCard.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Calcular totales (asumiendo tipo de cambio aproximado)
  const exchangeRate = 17

  const totalBalanceMXN = bankAccounts.reduce((sum, acc) => {
    const amount =
      acc.currency === 'USD'
        ? Number(acc.balance) * exchangeRate
        : Number(acc.balance)
    return sum + amount
  }, 0)

  const totalDebtMXN = creditCards.reduce((sum, card) => {
    return sum + Number(card.balanceMXN) + Number(card.balanceUSD) * exchangeRate
  }, 0)

  return {
    bankAccounts,
    creditCards,
    totalBalanceMXN,
    totalDebtMXN,
    netBalance: totalBalanceMXN - totalDebtMXN,
  }
}

function formatCurrency(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount)
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const { bankAccounts, creditCards, totalBalanceMXN, totalDebtMXN, netBalance } =
    await getDashboardData(session.user.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido, {session.user.name?.split(' ')[0]}
        </p>
      </div>

      {/* Resumen de balances */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalBalanceMXN)}
            </div>
            <p className="text-xs text-muted-foreground">
              En {bankAccounts.length} cuenta{bankAccounts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deuda Total
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">
              -{formatCurrency(totalDebtMXN)}
            </div>
            <p className="text-xs text-muted-foreground">
              En {creditCards.length} tarjeta{creditCards.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance Neto
            </CardTitle>
            {netBalance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-danger" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netBalance >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Disponible - Deuda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cuentas y Tarjetas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cuentas Bancarias */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <CardTitle>Mis Cuentas</CardTitle>
            </div>
            <CardDescription>Tus cuentas bancarias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bankAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay cuentas registradas
              </p>
            ) : (
              bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: account.color ?? '#0d9488' }}
                    />
                    <div>
                      <p className="font-medium text-sm">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.bankName}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-medium text-success">
                    {formatCurrency(Number(account.balance), account.currency)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Tarjetas de Crédito */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-secondary" />
              <CardTitle>Mis Tarjetas</CardTitle>
            </div>
            <CardDescription>Tus tarjetas de crédito</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {creditCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay tarjetas registradas
              </p>
            ) : (
              creditCards.map((card) => {
                const totalDebt =
                  Number(card.balanceMXN) + Number(card.balanceUSD) * 17
                const totalLimit =
                  Number(card.limitMXN) + Number(card.limitUSD) * 17
                const usagePercent =
                  totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0

                return (
                  <div
                    key={card.id}
                    className="p-3 rounded-lg bg-muted/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: card.color ?? '#f97316' }}
                        />
                        <div>
                          <p className="font-medium text-sm">{card.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {card.bankName} • Corte: día {card.cutOffDay}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-medium text-danger">
                        -{formatCurrency(totalDebt)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Uso del crédito
                        </span>
                        <span>{usagePercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            usagePercent > 80
                              ? 'bg-danger'
                              : usagePercent > 50
                              ? 'bg-warning'
                              : 'bg-success'
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
