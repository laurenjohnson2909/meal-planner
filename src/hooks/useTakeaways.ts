import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Takeaway } from '../types/models'
import { useAuth } from './useAuth'

export function useTakeaways() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['takeaways', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Takeaway[]> => {
      const { data, error } = await supabase.from('takeaways').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddTakeaway() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Takeaway>) => {
      const { data, error } = await supabase
        .from('takeaways')
        .insert({ ...input, user_id: user!.id })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['takeaways'] }),
  })
}
