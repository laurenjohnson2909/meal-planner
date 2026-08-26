import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { NutritionTargets, UserProfile } from '../types/models'
import { useAuth } from './useAuth'

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserProfile | null> => {
      const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user!.id).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<UserProfile>) => {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ id: user!.id, ...patch, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export function useNutritionTargets() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['nutrition_targets', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NutritionTargets | null> => {
      const { data, error } = await supabase.from('nutrition_targets').select('*').eq('user_id', user!.id).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateNutritionTargets() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<NutritionTargets>) => {
      const { error } = await supabase
        .from('nutrition_targets')
        .upsert({ user_id: user!.id, ...patch, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition_targets'] }),
  })
}
