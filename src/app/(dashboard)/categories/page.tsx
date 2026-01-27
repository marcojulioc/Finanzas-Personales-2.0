'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { CategoryForm } from '@/components/category-form'
import { Loader2, PencilIcon, TrashIcon, Plus, Tags, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { useCategories } from '@/hooks/use-categories'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'expense' | 'income'
  isDefault: boolean
  isActive: boolean
}

export default function CategoriesPage() {
  const { categories, isLoading, mutate } = useCategories()

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleNewCategory = () => {
    setEditingCategory(null)
    setIsFormOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setIsFormOpen(true)
  }

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar la categoria')
      }

      toast.success('Categoria eliminada correctamente')
      mutate()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Error al eliminar la categoria')
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setCategoryToDelete(null)
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingCategory(null)
    mutate()
  }

  const filteredCategories = categories.filter((cat) => cat.type === activeTab)
  const expenseCount = categories.filter((cat) => cat.type === 'expense').length
  const incomeCount = categories.filter((cat) => cat.type === 'income').length

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Categorias</h2>
          <p className="text-muted-foreground">
            Personaliza las categorias para tus transacciones
          </p>
        </div>
        <Button onClick={handleNewCategory}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva categoria
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'expense'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingDown className="h-4 w-4" />
          Gastos ({expenseCount})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'income'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Ingresos ({incomeCount})
        </button>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Tags className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Sin categorias</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            No tienes categorias de {activeTab === 'expense' ? 'gastos' : 'ingresos'}.
          </p>
          <Button onClick={handleNewCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Crear categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">
                      {category.name}
                    </CardTitle>
                    {category.isDefault && (
                      <span className="text-xs text-muted-foreground">
                        Por defecto
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditCategory(category)}
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Category Dialog */}
      <AlertDialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nueva Categoria'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editingCategory
                ? 'Modifica los detalles de tu categoria.'
                : 'Crea una nueva categoria personalizada.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <CategoryForm
            initialData={
              editingCategory
                ? {
                    id: editingCategory.id,
                    name: editingCategory.name,
                    icon: editingCategory.icon,
                    color: editingCategory.color,
                    type: editingCategory.type,
                  }
                : undefined
            }
            defaultType={activeTab}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete && (
                <>
                  Vas a eliminar la categoria &quot;{categoryToDelete.name}&quot;.
                  Las transacciones existentes con esta categoria mantendran su valor pero la categoria no aparecera en la lista de opciones.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
