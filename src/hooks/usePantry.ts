import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PantryItemWithIngredient } from '../types/models'
import { useAuth } from './useAuth'

export function usePantry() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['pantry', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PantryItemWithIngredient[]> => {
      const { data, error } = await supabase
        .from('pantry_items')
        .select('*, ingredient:ingredients(*)')
        .order('use_by_date', { nullsFirst: false })
      if (error) throw error
      return (data ?? []) as unknown as PantryItemWithIngredient[]
    },
  })
}

export function useSavePantryItem() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: string; ingredient_id: string; quantity: number; unit: string; use_by_date?: string | null }) => {
      const { id, ...rest } = input
      if (id) {
        const { error } = await supabase.from('pantry_items').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('pantry_items').insert({ ...rest, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  })
}

export function useDeletePantryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pantry_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  })
}
