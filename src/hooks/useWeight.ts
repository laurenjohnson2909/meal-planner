import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { WeightLog } from '../types/models'
import { useAuth } from './useAuth'

export function useWeightLogs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['weight_logs', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WeightLog[]> => {
      const { data, error } = await supabase.from('weight_logs').select('*').order('date')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddWeightLog() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { date: string; weight_kg: number; notes?: string }) => {
      const { error } = await supabase.from('weight_logs').upsert({ ...input, user_id: user!.id }, { onConflict: 'user_id,date' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weight_logs'] }),
  })
}

export function useDeleteWeightLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('weight_logs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weight_logs'] }),
  })
}
