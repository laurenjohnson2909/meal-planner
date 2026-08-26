import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ShoppingListItem } from '../types/models'
import { useAuth } from './useAuth'
import type { ConsolidatedItem } from '../lib/shoppingList'

async function getOrCreateListId(userId: string, weekStartDate: string): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing.id as string

  const { data: created, error: createErr } = await supabase
    .from('shopping_lists')
    .insert({ user_id: userId, week_start_date: weekStartDate })
    .select('id')
    .single()
  if (createErr) throw createErr
  return created.id as string
}

export function useShoppingList(weekStartDate: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['shopping_list', user?.id, weekStartDate],
    enabled: !!user,
    queryFn: async (): Promise<{ listId: string; items: ShoppingListItem[] }> => {
      const listId = await getOrCreateListId(user!.id, weekStartDate)
      const { data, error } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('shopping_list_id', listId)
        .order('category')
        .order('name')
      if (error) throw error
      return { listId, items: data ?? [] }
    },
  })
}

/** Regenerate the auto (non-manual) portion of the list from the consolidated weekly plan. */
export function useRegenerateShoppingList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, items }: { listId: string; items: ConsolidatedItem[] }) => {
      // Preserve checked state for items that still exist by ingredient id.
      const { data: existing } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('shopping_list_id', listId)
        .eq('is_manual', false)
      const checkedByIngredient = new Map((existing ?? []).map((r) => [r.ingredient_id, r.checked]))

      await supabase.from('shopping_list_items').delete().eq('shopping_list_id', listId).eq('is_manual', false)

      const rows = items
        .filter((i) => i.toBuyQuantity > 0)
        .map((i) => ({
          shopping_list_id: listId,
          ingredient_id: i.ingredientId,
          name: i.name,
          quantity: i.toBuyQuantity,
          unit: i.unit,
          category: i.category,
          checked: checkedByIngredient.get(i.ingredientId) ?? false,
          is_manual: false,
        }))
      if (rows.length > 0) {
        const { error } = await supabase.from('shopping_list_items').insert(rows)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping_list'] }),
  })
}

export function useAddManualShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { shopping_list_id: string; name: string; quantity: number; unit: string; category: string }) => {
      const { error } = await supabase.from('shopping_list_items').insert({ ...input, is_manual: true })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping_list'] }),
  })
}

export function useToggleShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase.from('shopping_list_items').update({ checked }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping_list'] }),
  })
}

export function useUpdateShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; quantity?: number; name?: string; unit?: string }) => {
      const { error } = await supabase.from('shopping_list_items').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping_list'] }),
  })
}

export function useDeleteShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shopping_list_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping_list'] }),
  })
}
