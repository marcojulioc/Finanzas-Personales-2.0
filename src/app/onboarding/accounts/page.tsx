'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, ArrowRight, ArrowLeft, Landmark } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getOnboardingState,
  saveOnboardingState,
  generateId,
  COMMON_BANKS,
  ACCOUNT_COLORS,
  type BankAccountDraft,
} from '@/lib/onboarding-store'

const accountSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  bankName: z.string().min(1, 'Selecciona un banco'),
  accountType: z.enum(['savings', 'checking']),
  currency: z.enum(['MXN', 'USD']),
  balance: z.number().min(0, 'El balance no puede ser negativo'),
})

type AccountFormData = z.infer<typeof accountSchema>

export default function OnboardingAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<BankAccountDraft[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountType: 'savings',
      currency: 'MXN',
      balance: 0,
    },
  })

  useEffect(() => {
    const state = getOnboardingState()
    setAccounts(state.bankAccounts)
    if (state.bankAccounts.length === 0) {
      setIsAdding(true)
    }
  }, [])

  const onSubmit = (data: AccountFormData) => {
    const state = getOnboardingState()

    if (editingId) {
      const index = state.bankAccounts.findIndex((a) => a.id === editingId)
      if (index !== -1) {
        state.bankAccounts[index] = {
          ...state.bankAccounts[index]!,
          ...data,
          color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
        }
      }
      setEditingId(null)
    } else {
      const newAccount: BankAccountDraft = {
        id: generateId(),
        ...data,
        color: ACCOUNT_COLORS[state.bankAccounts.length % ACCOUNT_COLORS.length],
      }
      state.bankAccounts.push(newAccount)
    }

    saveOnboardingState(state)
    setAccounts([...state.bankAccounts])
    setIsAdding(false)
    reset({
      name: '',
      bankName: '',
      accountType: 'savings',
      currency: 'MXN',
      balance: 0,
    })
  }

  const handleDelete = (id: string) => {
    const state = getOnboardingState()
    state.bankAccounts = state.bankAccounts.filter((a) => a.id !== id)
    saveOnboardingState(state)
    setAccounts([...state.bankAccounts])
  }

  const handleEdit = (account: BankAccountDraft) => {
    setEditingId(account.id)
    setIsAdding(true)
    setValue('name', account.name)
    setValue('bankName', account.bankName)
    setValue('accountType', account.accountType)
    setValue('currency', account.currency)
    setValue('balance', account.balance)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    reset()
  }

  const handleContinue = () => {
    router.push('/onboarding/cards')
  }

  const handleBack = () => {
    router.push('/onboarding')
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Tus Cuentas Bancarias</CardTitle>
            <CardDescription>
              Agrega las cuentas desde donde manejas tu dinero
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de cuentas existentes */}
        {accounts.length > 0 && !isAdding && (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.bankName} •{' '}
                      {account.accountType === 'savings' ? 'Ahorro' : 'Corriente'} •{' '}
                      {account.currency}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">
                    {formatCurrency(account.balance, account.currency)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(account)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-danger hover:text-danger"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario para agregar/editar */}
        {isAdding && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la cuenta</Label>
                <Input
                  id="name"
                  placeholder="Ej: Cuenta Principal"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-danger">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Banco</Label>
                <Select
                  value={watch('bankName')}
                  onValueChange={(value) => setValue('bankName', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bankName && (
                  <p className="text-sm text-danger">{errors.bankName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo de cuenta</Label>
                <Select
                  value={watch('accountType')}
                  onValueChange={(value: 'savings' | 'checking') =>
                    setValue('accountType', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Ahorro</SelectItem>
                    <SelectItem value="checking">Corriente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select
                  value={watch('currency')}
                  onValueChange={(value: 'MXN' | 'USD') =>
                    setValue('currency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MXN">Pesos (MXN)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="balance">Balance actual</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('balance', { valueAsNumber: true })}
                />
                {errors.balance && (
                  <p className="text-sm text-danger">{errors.balance.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? 'Guardar cambios' : 'Agregar cuenta'}
              </Button>
              {(accounts.length > 0 || editingId) && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}

        {/* Botón para agregar más */}
        {!isAdding && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar otra cuenta
          </Button>
        )}

        <p className="text-sm text-muted-foreground">
          Puedes agregar más cuentas después en Configuración
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atrás
        </Button>
        <Button onClick={handleContinue}>
          {accounts.length === 0 ? 'Saltar' : 'Continuar'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  )
}
