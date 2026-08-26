import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Recipe, RecipeWithDetails } from '../types/models'
import { useAuth } from './useAuth'

const RECIPE_SELECT = `*, recipe_ingredients(*, ingredient:ingredients(*)), recipe_tags(*)`

export function useRecipes() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['recipes', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RecipeWithDetails[]> => {
      const { data, error } = await supabase.from('recipes').select(RECIPE_SELECT).order('name')
      if (error) throw error
      return (data ?? []) as unknown as RecipeWithDetails[]
    },
  })
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    enabled: !!id,
    queryFn: async (): Promise<RecipeWithDetails | null> => {
      const { data, error } = await supabase.from('recipes').select(RECIPE_SELECT).eq('id', id!).maybeSingle()
      if (error) throw error
      return data as unknown as RecipeWithDetails | null
    },
  })
}

export interface RecipeIngredientInput {
  ingredient_id: string
  quantity: number
  unit: string
}

export interface RecipeInput extends Partial<Recipe> {
  ingredients: RecipeIngredientInput[]
  tags: string[]
}

export function useSaveRecipe() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RecipeInput) => {
      const { id, ingredients, tags, ...rest } = input
      let recipeId = id

      if (recipeId) {
        const { error } = await supabase
          .from('recipes')
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq('id', recipeId)
        if (error) throw error
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
        await supabase.from('recipe_tags').delete().eq('recipe_id', recipeId)
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert({ ...rest, user_id: user!.id })
          .select('id')
          .single()
        if (error) throw error
        recipeId = data.id as string
      }

      if (ingredients.length > 0) {
        const { error } = await supabase.from('recipe_ingredients').insert(
          ingredients.map((ing, i) => ({ ...ing, recipe_id: recipeId, sort_order: i })),
        )
        if (error) throw error
      }
      if (tags.length > 0) {
        const { error } = await supabase.from('recipe_tags').insert(tags.map((tag) => ({ recipe_id: recipeId, tag })))
        if (error) throw error
      }

      return recipeId as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      qc.invalidateQueries({ queryKey: ['recipe'] })
    },
  })
}

export function useDeleteRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useToggleFavourite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_favourite }: { id: string; is_favourite: boolean }) => {
      const { error } = await supabase.from('recipes').update({ is_favourite }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}
