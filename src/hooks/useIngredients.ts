import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Ingredient, IngredientPrice, IngredientUnitConversion } from '../types/models'
import { useAuth } from './useAuth'

export function useIngredients(search = '') {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['ingredients', user?.id, search],
    enabled: !!user,
    queryFn: async (): Promise<Ingredient[]> => {
      let query = supabase.from('ingredients').select('*').order('name')
      if (search) query = query.ilike('name', `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

export function useIngredient(id: string | undefined) {
  return useQuery({
    queryKey: ['ingredient', id],
    enabled: !!id,
    queryFn: async (): Promise<Ingredient | null> => {
      const { data, error } = await supabase.from('ingredients').select('*').eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSaveIngredient() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ingredient: Partial<Ingredient> & { id?: string }) => {
      const { id, ...rest } = ingredient
      if (id) {
        const { error } = await supabase.from('ingredients').update(rest).eq('id', id)
        if (error) throw error
        return id
      }
      const { data, error } = await supabase
        .from('ingredients')
        .insert({ ...rest, user_id: user!.id })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}

export function useDeleteIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ingredients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}

export function useIngredientPrices() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['ingredient_prices', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<IngredientPrice[]> => {
      const { data, error } = await supabase.from('ingredient_prices').select('*')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSaveIngredientPrice() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pack: { ingredient_id: string; pack_price: number; pack_size: number; pack_size_unit: string }) => {
      const { error } = await supabase
        .from('ingredient_prices')
        .upsert(
          { ...pack, user_id: user!.id, updated_at: new Date().toISOString() },
          { onConflict: 'ingredient_id' },
        )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredient_prices'] }),
  })
}

export function useIngredientUnitConversions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['ingredient_unit_conversions', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<IngredientUnitConversion[]> => {
      const { data, error } = await supabase.from('ingredient_unit_conversions').select('*')
      if (error) throw error
      return data ?? []
    },
  })
}

/** Replaces the full set of custom conversions for one ingredient (spec §9). */
export function useSaveIngredientUnitConversions() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      ingredientId,
      conversions,
    }: {
      ingredientId: string
      conversions: { unit: string; equivalent_amount: number; equivalent_unit: 'g' | 'ml' }[]
    }) => {
      const { error: delError } = await supabase.from('ingredient_unit_conversions').delete().eq('ingredient_id', ingredientId)
      if (delError) throw delError
      const rows = conversions
        .filter((c) => c.unit.trim() && c.equivalent_amount > 0)
        .map((c) => ({ ...c, ingredient_id: ingredientId, user_id: user!.id }))
      if (rows.length > 0) {
        const { error } = await supabase.from('ingredient_unit_conversions').insert(rows)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredient_unit_conversions'] }),
  })
}
