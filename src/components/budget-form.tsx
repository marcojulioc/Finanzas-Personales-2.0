'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category } from '@/lib/categories'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Local schema for form with proper Date type (not coerced)
const budgetFormSchema = z.object({
  category: z
    .string()
    .min(1, 'La categoría es requerida')
    .max(50, 'La categoría no puede exceder 50 caracteres'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  month: z.date(),
})

type BudgetFormValues = z.infer<typeof budgetFormSchema>

interface BudgetFormProps {
  initialData?: BudgetFormValues & { id: string }; // For editing
  selectedMonth?: Date; // Month to create budget for
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Generate month options (current month + next 12 months)
function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()

  for (let i = 0; i < 13; i++) {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + i, 1))
    const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    // Capitalize first letter
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1)
    options.push({
      value: date.toISOString(),
      label: capitalizedLabel,
    })
  }

  return options
}

export function BudgetForm({ initialData, selectedMonth, onSuccess, onCancel }: BudgetFormProps) {
  const router = useRouter();
  const monthOptions = getMonthOptions();
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories?type=expense')
        const data = await res.json()
        setCategories(data.data || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Determine default month: selectedMonth prop > initialData > current month
  const getDefaultMonth = () => {
    if (selectedMonth) {
      return new Date(Date.UTC(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1))
    }
    if (initialData?.month) {
      const d = new Date(initialData.month)
      return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))
    }
    const now = new Date()
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  }

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      month: getDefaultMonth(),
    } : {
      category: '',
      amount: 0,
      month: getDefaultMonth(),
    },
    mode: 'onChange',
  })

  const isLoading = form.formState.isSubmitting;

  async function onSubmit(values: BudgetFormValues) {
    try {
      const url = initialData ? `/api/budgets/${initialData.id}` : '/api/budgets';
      const method = initialData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          amount: parseFloat(values.amount.toFixed(2)), // Ensure amount is float with 2 decimals
          month: values.month.toISOString(), // Send date as ISO string
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al guardar el presupuesto');
      }

      toast.success(initialData ? 'Presupuesto actualizado.' : 'Presupuesto creado.');
      router.refresh(); // Refresh data on pages that use budgets
      onSuccess?.(); // Callback for modal closing or redirection
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
      toast.error(message);
      console.error('Error submitting budget form:', error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => {
                    field.onChange(parseFloat(e.target.value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="month"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mes</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(new Date(value))}
                defaultValue={field.value?.toISOString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un mes" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Guardar cambios' : 'Crear presupuesto'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
