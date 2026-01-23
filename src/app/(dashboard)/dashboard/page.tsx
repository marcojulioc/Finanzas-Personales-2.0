import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Landmark, CreditCard, TrendingUp, TrendingDown, Plus, Receipt, ArrowRight, Wallet } from 'lucide-react'
import { getCategoryById } from '@/lib/categories'
import { getCardAlerts } from '@/lib/card-alerts'
import { CardAlerts } from '@/components/card-alerts'
import { formatCurrency } from '@/lib/utils' // Import from utils
import { Progress } from '@/components/ui/progress' // Import Progress for budget cards
import { Separator } from '@/components/ui/separator'


async function getDashboardData(userId: string) {
  // Obtener el primer día del mes actual (GMT para consistencia)
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));

  const [bankAccounts, creditCards, recentTransactions, budgets, expenseTransactions] = await Promise.all([
    db.bankAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.creditCard.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        bankAccount: { select: { name: true, color: true } },
        creditCard: { select: { name: true, color: true } },
      },
    }),
    db.budget.findMany({
      where: { userId, month: currentMonthStart },
      orderBy: { createdAt: 'asc' },
    }),
    db.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: currentMonthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        category: true,
        amount: true,
      },
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

  // Calcular alertas de tarjetas
  const cardAlerts = getCardAlerts(
    creditCards.map((card) => ({
      name: card.name,
      color: card.color,
      cutOffDay: card.cutOffDay,
      paymentDueDay: card.paymentDueDay,
    }))
  )

  // Calcular el gasto total por categoría para presupuestos
  const spendingByCategory = expenseTransactions.reduce((acc, transaction) => {
    const category = transaction.category;
    const amount = new Decimal(transaction.amount);
    
    if (acc[category]) {
      acc[category] = new Decimal(acc[category]).plus(amount);
    } else {
      acc[category] = amount;
    }
    return acc;
  }, {} as Record<string, Decimal>);

  // Combinar presupuestos con el gasto calculado
  const budgetsWithSpending = budgets.map((budget) => {
    const spent = spendingByCategory[budget.category] || new Decimal(0);
    return {
      id: budget.id,
      category: budget.category,
      amount: budget.amount.toNumber(),
      month: budget.month,
      spent: spent.toNumber(),
    };
  });

  return {
    bankAccounts,
    creditCards,
    recentTransactions,
    cardAlerts,
    totalBalanceMXN,
    totalDebtMXN,
    netBalance: totalBalanceMXN - totalDebtMXN,
    budgetsWithSpending, // Add budgets to the returned data
  }
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  })
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const { bankAccounts, creditCards, recentTransactions, cardAlerts, totalBalanceMXN, totalDebtMXN, netBalance, budgetsWithSpending } =
    await getDashboardData(session.user.id)

  const totalBudgeted = budgetsWithSpending.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpentOnBudgets = budgetsWithSpending.reduce((sum, budget) => sum + budget.spent, 0);


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido, {session.user.name?.split(' ')[0]}
          </p>
        </div>
        <Link href="/transactions">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Transacción
          </Button>
        </Link>
      </div>

      {/* Alertas de tarjetas */}
      <CardAlerts alerts={cardAlerts} />

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

      {/* Sección de Presupuestos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-500" />
              <CardTitle>Mis Presupuestos</CardTitle>
            </div>
            <Link href="/dashboard/budgets">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <CardDescription>Resumen de tus límites de gasto para este mes.</CardDescription>
        </CardHeader>
        <CardContent>
          {budgetsWithSpending.length === 0 ? (
            <div className="text-center py-4">
              <Wallet className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No hay presupuestos definidos para este mes.</p>
              <Link href="/dashboard/budgets">
                <Button variant="outline" size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primer presupuesto
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium">
                    <span>Total Presupuestado:</span>
                    <span>{formatCurrency(totalBudgeted)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                    <span>Total Gastado:</span>
                    <span className={totalSpentOnBudgets > totalBudgeted ? "text-danger" : "text-success"}>
                      {formatCurrency(totalSpentOnBudgets)}
                    </span>
                </div>
                <Separator />
              {budgetsWithSpending.map((budget) => {
                const category = getCategoryById(budget.category);
                const progressValue = (budget.spent / budget.amount) * 100;
                const progressColor = progressValue >= 100 ? "bg-destructive" : progressValue >= 80 ? "bg-amber-500" : "bg-primary";

                return (
                  <div key={budget.id} className="grid grid-cols-4 items-center gap-2 py-2">
                    <div className="col-span-1 flex items-center gap-2 text-sm font-medium">
                      {category?.icon} {category?.name || budget.category}
                    </div>
                    <div className="col-span-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}</span>
                        <span>{progressValue.toFixed(0)}%</span>
                      </div>
                      <Progress value={progressValue} className="h-2" indicatorColor={progressColor} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


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

      {/* Transacciones recientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <CardTitle>Transacciones Recientes</CardTitle>
            </div>
            <Link href="/transactions">
              <Button variant="ghost" size="sm">
                Ver todas
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <CardDescription>Últimos movimientos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay transacciones registradas
              </p>
              <Link href="/transactions">
                <Button variant="outline" size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar primera transacción
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((transaction) => {
                const category = getCategoryById(transaction.category)
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                        style={{
                          backgroundColor: `${category?.color || '#6b7280'}20`,
                        }}
                      >
                        {category?.icon || '❓'}
                      </div>
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
                                className="font-normal text-xs py-0"
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
                      className={`font-mono font-medium ${
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