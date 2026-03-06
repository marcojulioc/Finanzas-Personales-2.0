'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Iconos disponibles para elegir (organizados por categoria)
const AVAILABLE_ICONS = [
  // Comida y bebidas
  '🍔', '🍕', '🍜', '🍣', '🥗', '🍰', '🍦', '☕', '🍺', '🍷', '🥤', '🍳',
  // Transporte
  '🚗', '🚌', '✈️', '⛽', '🚕', '🚇', '🚲', '🛵', '🚢', '🚁',
  // Hogar
  '🏠', '🏢', '🔌', '💡', '🛋️', '🛏️', '🚿', '🧹', '🧺', '🪴', '🔑', '🏡',
  // Salud y bienestar
  '💊', '🏥', '🩺', '💉', '🧘', '🏃', '💪', '🧠', '❤️', '🩹',
  // Cuidado personal y belleza
  '✂️', '💇', '💅', '💄', '🧴', '🪒', '🧖', '💆', '🪥', '🧼',
  // Entretenimiento
  '🎮', '🎬', '🎵', '📚', '🎭', '🎪', '🎤', '🎧', '📺', '🎲',
  // Compras y ropa
  '🛍️', '👕', '👗', '👟', '👜', '🎁', '💍', '👔', '🧥', '👠',
  // Tecnologia
  '💳', '📱', '💻', '🖥️', '⌨️', '🖨️', '📷', '🎥', '🔋', '💾',
  // Trabajo y finanzas
  '💼', '💰', '💵', '🏦', '📈', '📊', '🧾', '📑', '🗂️', '📁',
  // Educacion
  '🎓', '✏️', '📝', '📖', '🎯', '⭐', '🏆', '📐', '🔬', '🌐',
  // Mascotas
  '🐕', '🐈', '🐾', '🦴', '🐟', '🐦', '🐹', '🐢',
  // Viajes y ocio
  '🏨', '🗺️', '🧳', '🏖️', '⛷️', '🏕️', '🎡', '🗼', '🌴', '⛰️',
  // Deportes
  '⚽', '🏀', '🎾', '🏊', '⛳', '🎳', '🥊', '🏋️', '🚴', '🎿',
  // Servicios y suscripciones
  '📡', '📬', '🔧', '🛠️', '🔐', '📦', '🚚', '♻️', '🌍', '☁️',
  // Otros
  '❓', '➕', '📌', '🔔', '🎨', '✨', '🎉', '💝', '🌟', '🔥',
]

// Colores disponibles
const AVAILABLE_COLORS = [
  '#d97757', '#c4613e', '#c9923e', '#a67c6b', '#788c5d',
  '#6a9bcc', '#5a87b5', '#8b7d6b', '#b0aea5', '#c4453c',
  '#e08b6d', '#9aad7e', '#7fb0db', '#d9a85a', '#c49483',
  '#8a877d', '#6b6860', '#4a4843', '#3a3a36', '#141413',
]

interface CategoryFormProps {
  initialData?: {
    id: string
    name: string
    icon: string
    color: string
    type: 'expense' | 'income'
  }
  defaultType?: 'expense' | 'income'
  onSuccess: () => void
  onCancel: () => void
}

export function CategoryForm({
  initialData,
  defaultType = 'expense',
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(initialData?.name || '')
  const [icon, setIcon] = useState(initialData?.icon || '❓')
  const [color, setColor] = useState(initialData?.color || '#6b7280')
  const [type, setType] = useState<'expense' | 'income'>(
    initialData?.type || defaultType
  )

  const isEditing = !!initialData

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setIsLoading(true)

    try {
      const url = isEditing
        ? `/api/categories/${initialData.id}`
        : '/api/categories'
      const method = isEditing ? 'PUT' : 'POST'

      const body = isEditing
        ? { name: name.trim(), icon, color }
        : { name: name.trim(), icon, color, type }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar la categoria')
      }

      toast.success(
        isEditing
          ? 'Categoria actualizada correctamente'
          : 'Categoria creada correctamente'
      )
      onSuccess()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al guardar la categoria'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Gimnasio"
          maxLength={30}
          disabled={isLoading}
        />
      </div>

      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select
            value={type}
            onValueChange={(value: 'expense' | 'income') => setType(value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Gasto</SelectItem>
              <SelectItem value="income">Ingreso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Icono</Label>
        <div className="grid grid-cols-10 gap-1 p-2 border rounded-md max-h-48 overflow-y-auto">
          {AVAILABLE_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              disabled={isLoading}
              className={`p-1.5 text-lg rounded hover:bg-muted transition-colors ${
                icon === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="grid grid-cols-10 gap-1 p-2 border rounded-md">
          {AVAILABLE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              disabled={isLoading}
              className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                color === c ? 'ring-2 ring-offset-2 ring-primary' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label>Vista previa</Label>
        <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </div>
          <div>
            <p className="font-medium">{name || 'Nombre de categoria'}</p>
            <p className="text-xs text-muted-foreground">
              {type === 'expense' ? 'Gasto' : 'Ingreso'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
