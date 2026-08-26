import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { DEFAULT_INGREDIENT_CATEGORIES } from '../types/models'
import type { IngredientCategory } from '../types/models'

/** The user's custom category list, falling back to the defaults until they save their own. */
export function useIngredientCategoryNames() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['ingredient_categories', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<IngredientCategory[]> => {
      const { data, error } = await supabase.from('ingredient_categories').select('*').order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })

  const names = query.data?.length ? query.data.map((c) => c.name) : [...DEFAULT_INGREDIENT_CATEGORIES]
  return { ...query, names }
}

export function useSaveIngredientCategories() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (names: string[]) => {
      const { error: delError } = await supabase.from('ingredient_categories').delete().eq('user_id', user!.id)
      if (delError) throw delError
      const rows = names.filter((n) => n.trim()).map((name, i) => ({ user_id: user!.id, name: name.trim(), sort_order: i }))
      if (rows.length > 0) {
        const { error } = await supabase.from('ingredient_categories').insert(rows)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredient_categories'] }),
  })
}
