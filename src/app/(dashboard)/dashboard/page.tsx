import { cache } from 'react'
import Link from 'next/link'
import { getAuthSession } from '@/lib/auth-cache'
import { db } from '@/lib/db'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Landmark, CreditCard, TrendingUp, TrendingDown, Plus, Receipt, Wallet, Repeat, PieChart } from 'lucide-react'
import { getCategoryById, seedUserCategories } from '@/lib/categories'
import { getCardAlerts } from '@/lib/card-alerts'
import { CardAlerts } from '@/components/card-alerts'
import { formatCurrency } from '@/lib/format-utils'
import { generatePendingTransactions } from '@/lib/recurring-utils'
import { generateAllNotifications } from '@/lib/notification-utils'


// Cached dashboard data fetching - only runs once per request
const getDashboardData = cache(async (userId: string) => {
  // Run background tasks in parallel (non-blocking)
  Promise.all([
    generatePendingTransactions(userId),
    generateAllNotifications(userId),
    seedUserCategories(userId),
  ]).catch(console.error)

  const [bankAccounts, creditCards, recentTransactions] = await Promise.all([
    db.bankAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.creditCard.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { balances: true },
    }),
    db.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        bankAccount: { select: { name: true, color: true } },
        creditCard: { select: { name: true, color: true } },
      },
    }),
  ])

  // Calcular totales (tipo de cambio aproximado)
  const exchangeRate = 17

  const totalBalanceMXN = bankAccounts.reduce((sum, acc) => {
    const amount = acc.currency === 'USD' ? Number(acc.balance) * exchangeRate : Number(acc.balance)
    return sum + amount
  }, 0)

  const totalDebtMXN = creditCards.reduce((sum, card) => {
    const cardDebt = card.balances.reduce((balanceSum, balance) => {
      const amount = balance.currency === 'USD' ? Number(balance.balance) * exchangeRate : Number(balance.balance)
      return balanceSum + amount
    }, 0)
    return sum + cardDebt
  }, 0)

  // Alertas de tarjetas
  const cardAlerts = getCardAlerts(
    creditCards.map((card) => ({
      name: card.name,
      color: card.color,
      cutOffDay: card.cutOffDay,
      paymentDueDay: card.paymentDueDay,
    }))
  )

  return {
    bankAccountsCount: bankAccounts.length,
    creditCardsCount: creditCards.length,
    recentTransactions,
    cardAlerts,
    totalBalanceMXN,
    totalDebtMXN,
    netBalance: totalBalanceMXN - totalDebtMXN,
  }
})

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  })
}

export default async function DashboardPage() {
  const session = await getAuthSession()
  if (!session?.user?.id) return null

  const { bankAccountsCount, creditCardsCount, recentTransactions, cardAlerts, totalBalanceMXN, totalDebtMXN, netBalance } =
    await getDashboardData(session.user.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">
            Hola, {session.user.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu resumen financiero
          </p>
        </div>
        <Link href="/transactions?new=true">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nueva
          </Button>
        </Link>
      </div>

      {/* Alertas de tarjetas */}
      <CardAlerts alerts={cardAlerts} />

      {/* Resumen financiero compacto */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground mb-1">Balance Neto</p>
            <p className={`text-4xl font-bold font-mono ${netBalance >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(netBalance)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-success mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs text-muted-foreground">Disponible</span>
              </div>
              <p className="font-mono font-semibold text-success">
                {formatCurrency(totalBalanceMXN)}
              </p>
              <p className="text-xs text-muted-foreground">
                {bankAccountsCount} cuenta{bankAccountsCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-danger mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs text-muted-foreground">Deuda</span>
              </div>
              <p className="font-mono font-semibold text-danger">
                -{formatCurrency(totalDebtMXN)}
              </p>
              <p className="text-xs text-muted-foreground">
                {creditCardsCount} tarjeta{creditCardsCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-4 gap-2">
        <Link href="/accounts">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-3 text-center">
              <Landmark className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Cuentas</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/cards">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-3 text-center">
              <CreditCard className="w-5 h-5 mx-auto mb-1 text-orange-500" />
              <p className="text-xs font-medium">Tarjetas</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/budgets">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-3 text-center">
              <Wallet className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-xs font-medium">Presupuestos</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/recurring">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-3 text-center">
              <Repeat className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-xs font-medium">Recurrentes</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Transacciones recientes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Últimos movimientos</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Ver todas
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-6">
              <Receipt className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                No hay transacciones
              </p>
              <Link href="/transactions">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTransactions.map((transaction) => {
                const category = getCategoryById(transaction.category)
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{category?.icon || '❓'}</span>
                      <div>
                        <p className="font-medium text-sm">
                          {category?.name || transaction.category}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(transaction.date)}</span>
                          {(transaction.bankAccount || transaction.creditCard) && (
                            <>
                              <span>•</span>
                              <Badge
                                variant="outline"
                                className="font-normal text-xs py-0 h-4"
                                style={{
                                  borderColor:
                                    transaction.bankAccount?.color ||
                                    transaction.creditCard?.color ||
                                    undefined,
                                }}
                              >
                                {transaction.bankAccount?.name ||
                                  transaction.creditCard?.name}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-sm font-medium ${
                        transaction.type === 'income'
                          ? 'text-success'
                          : 'text-danger'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(
                        Number(transaction.amount),
                        transaction.currency
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}