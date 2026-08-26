import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FoodLogItem, NutritionValues } from '../types/models'
import { useAuth } from './useAuth'

async function getOrCreateLogId(userId: string, date: string): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from('food_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing.id as string

  const { data: created, error: createErr } = await supabase
    .from('food_logs')
    .insert({ user_id: userId, date })
    .select('id')
    .single()
  if (createErr) throw createErr
  return created.id as string
}

export function useFoodLog(date: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['food_log', user?.id, date],
    enabled: !!user,
    queryFn: async (): Promise<{ logId: string; items: FoodLogItem[] }> => {
      const logId = await getOrCreateLogId(user!.id, date)
      const { data, error } = await supabase
        .from('food_log_items')
        .select('*')
        .eq('food_log_id', logId)
        .order('logged_at')
      if (error) throw error
      return { logId, items: data ?? [] }
    },
  })
}

export interface FoodLogItemInput extends NutritionValues {
  food_log_id: string
  meal_slot: string | null
  source_type: string
  source_id?: string | null
  description?: string | null
  quantity: number
  unit: string
}

export function useAddFoodLogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: FoodLogItemInput) => {
      const { error } = await supabase.from('food_log_items').insert(input)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food_log'] }),
  })
}

export function useDeleteFoodLogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('food_log_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food_log'] }),
  })
}

/** Recent + favourite distinct food descriptions/sources for fast re-logging (spec §10). */
export function useRecentFoodLogItems(limit = 20) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['recent_food_log_items', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FoodLogItem[]> => {
      const { data, error } = await supabase
        .from('food_log_items')
        .select('*, food_logs!inner(user_id)')
        .eq('food_logs.user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as FoodLogItem[]
    },
  })
}

export function useFoodLogRange(startDate: string, endDate: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['food_log_range', user?.id, startDate, endDate],
    enabled: !!user,
    queryFn: async (): Promise<Record<string, FoodLogItem[]>> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('date, food_log_items(*)')
        .eq('user_id', user!.id)
        .gte('date', startDate)
        .lte('date', endDate)
      if (error) throw error
      const byDate: Record<string, FoodLogItem[]> = {}
      for (const row of data ?? []) {
        byDate[row.date as string] = (row as any).food_log_items ?? []
      }
      return byDate
    },
  })
}
