'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Pencil, Landmark } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { COMMON_BANKS, ACCOUNT_COLORS } from '@/lib/onboarding-store'

interface BankAccount {
  id: string
  name: string
  bankName: string
  accountType: 'savings' | 'checking'
  currency: 'MXN' | 'USD'
  balance: number
  color: string | null
  isActive: boolean
}

const accountSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  bankName: z.string().min(1, 'Selecciona un banco'),
  accountType: z.enum(['savings', 'checking']),
  currency: z.enum(['MXN', 'USD']),
  balance: z.number().min(0, 'El balance no puede ser negativo'),
  color: z.string().optional(),
})

type AccountFormData = z.infer<typeof accountSchema>

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string>(ACCOUNT_COLORS[0])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountType: 'savings',
      currency: 'MXN',
      balance: 0,
    },
  })

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const result = await response.json()
      if (result.data) {
        setAccounts(result.data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const openCreateDialog = () => {
    setEditingAccount(null)
    setSelectedColor(ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length] || ACCOUNT_COLORS[0])
    reset({
      name: '',
      bankName: '',
      accountType: 'savings',
      currency: 'MXN',
      balance: 0,
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (account: BankAccount) => {
    setEditingAccount(account)
    setSelectedColor(account.color || ACCOUNT_COLORS[0])
    reset({
      name: account.name,
      bankName: account.bankName,
      accountType: account.accountType,
      currency: account.currency,
      balance: Number(account.balance),
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: AccountFormData) => {
    try {
      const payload = { ...data, color: selectedColor }

      if (editingAccount) {
        const response = await fetch(`/api/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Error al actualizar')
        }
      } else {
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Error al crear')
        }
      }

      setIsDialogOpen(false)
      fetchAccounts()
    } catch (error) {
      console.error('Error saving account:', error)
    }
  }

  const handleDelete = async () => {
    if (!deletingAccountId) return

    try {
      const response = await fetch(`/api/accounts/${deletingAccountId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        alert(result.error || 'Error al eliminar')
        return
      }

      setIsDeleteDialogOpen(false)
      setDeletingAccountId(null)
      fetchAccounts()
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Mis Cuentas</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Mis Cuentas</h1>
          <p className="text-muted-foreground">
            Gestiona tus cuentas bancarias
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cuenta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No tienes cuentas registradas
            </p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar tu primera cuenta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: account.color || ACCOUNT_COLORS[0] }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${account.color || ACCOUNT_COLORS[0]}20`,
                      }}
                    >
                      <Landmark
                        className="w-5 h-5"
                        style={{ color: account.color || ACCOUNT_COLORS[0] }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <CardDescription>{account.bankName}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(account)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-danger hover:text-danger"
                      onClick={() => {
                        setDeletingAccountId(account.id)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipo</span>
                    <span>
                      {account.accountType === 'savings' ? 'Ahorro' : 'Corriente'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Moneda</span>
                    <span>{account.currency}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-2xl font-bold font-mono text-success">
                      {formatCurrency(Number(account.balance), account.currency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? 'Modifica los datos de tu cuenta'
                : 'Agrega una nueva cuenta bancaria'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la cuenta</Label>
              <Input
                id="name"
                placeholder="Ej: Cuenta de nómina"
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {ACCOUNT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${
                      selectedColor === color
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingAccount
                  ? 'Guardar cambios'
                  : 'Crear cuenta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las transacciones asociadas a
              esta cuenta se mantendrán pero sin referencia a la cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAccountId(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-danger hover:bg-danger/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
