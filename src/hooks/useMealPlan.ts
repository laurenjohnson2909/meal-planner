import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MealPlanItemWithDetails, MealSlot } from '../types/models'
import { useAuth } from './useAuth'

const RECIPE_SELECT = `*, recipe_ingredients(*, ingredient:ingredients(*)), recipe_tags(*)`
const ITEM_SELECT = `*, recipe:recipes(${RECIPE_SELECT}), takeaway:takeaways(*)`

async function getOrCreatePlanId(userId: string, weekStartDate: string): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing.id as string

  const { data: created, error: createErr } = await supabase
    .from('meal_plans')
    .insert({ user_id: userId, week_start_date: weekStartDate })
    .select('id')
    .single()
  if (createErr) throw createErr
  return created.id as string
}

export function useMealPlan(weekStartDate: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['meal_plan', user?.id, weekStartDate],
    enabled: !!user,
    queryFn: async (): Promise<{ planId: string; items: MealPlanItemWithDetails[] }> => {
      const planId = await getOrCreatePlanId(user!.id, weekStartDate)
      const { data, error } = await supabase.from('meal_plan_items').select(ITEM_SELECT).eq('meal_plan_id', planId)
      if (error) throw error
      return { planId, items: (data ?? []) as unknown as MealPlanItemWithDetails[] }
    },
  })
}

export interface MealPlanItemInput {
  meal_plan_id: string
  day_of_week: number
  meal_slot: MealSlot
  recipe_id?: string | null
  takeaway_id?: string | null
  free_text?: string | null
  servings?: number
  is_takeaway?: boolean
}

export function useAddPlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MealPlanItemInput) => {
      const { error } = await supabase.from('meal_plan_items').insert({ servings: 1, ...input })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan'] }),
  })
}

export function useUpdatePlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<MealPlanItemInput> & { locked?: boolean }) => {
      const { error } = await supabase.from('meal_plan_items').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan'] }),
  })
}

export function useDeletePlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meal_plan_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan'] }),
  })
}

export function useDuplicatePlanItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: MealPlanItemWithDetails & { day_of_week: number; meal_slot: MealSlot }) => {
      const { error } = await supabase.from('meal_plan_items').insert({
        meal_plan_id: item.meal_plan_id,
        day_of_week: item.day_of_week,
        meal_slot: item.meal_slot,
        recipe_id: item.recipe_id,
        takeaway_id: item.takeaway_id,
        free_text: item.free_text,
        servings: item.servings,
        is_takeaway: item.is_takeaway,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan'] }),
  })
}
