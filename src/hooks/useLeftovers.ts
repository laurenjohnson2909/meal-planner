import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { LeftoverWithRecipe } from '../types/models'
import { useAuth } from './useAuth'

export function useLeftovers() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['leftovers', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LeftoverWithRecipe[]> => {
      const { data, error } = await supabase
        .from('leftovers')
        .select('*, recipe:recipes(*)')
        .gt('portions_remaining', 0)
        .order('use_by_date', { nullsFirst: false })
      if (error) throw error
      return (data ?? []) as unknown as LeftoverWithRecipe[]
    },
  })
}

export function useAddLeftover() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { recipe_id: string; portions_remaining: number; date_cooked: string; use_by_date?: string | null; notes?: string }) => {
      const { error } = await supabase.from('leftovers').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leftovers'] }),
  })
}

export function useUpdateLeftover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; portions_remaining?: number; notes?: string }) => {
      const { error } = await supabase.from('leftovers').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leftovers'] }),
  })
}

export function useDeleteLeftover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leftovers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leftovers'] }),
  })
}
