import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ExerciseLog } from '../types/models'
import { useAuth } from './useAuth'

export function useExerciseLogs(startDate: string, endDate: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['exercise_logs', user?.id, startDate, endDate],
    enabled: !!user,
    queryFn: async (): Promise<ExerciseLog[]> => {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddExerciseLog() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<ExerciseLog>) => {
      const { error } = await supabase.from('exercise_logs').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercise_logs'] }),
  })
}

export function useDeleteExerciseLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_logs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercise_logs'] }),
  })
}

export const EXERCISE_TYPES = [
  'Walking',
  'Running',
  'Cycling',
  'Zumba',
  'Pilates',
  'Gym',
  'Swimming',
  'Home Workout',
  'Custom',
]
