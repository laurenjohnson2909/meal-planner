import { createContext, useContext, useState, type ReactNode } from 'react'

export type QuickAddType = 'food' | 'exercise' | 'weight' | 'takeaway' | null

interface QuickAddContextValue {
  active: QuickAddType
  open: (type: Exclude<QuickAddType, null>) => void
  close: () => void
}

const QuickAddContext = createContext<QuickAddContextValue>({
  active: null,
  open: () => {},
  close: () => {},
})

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<QuickAddType>(null)
  return (
    <QuickAddContext.Provider value={{ active, open: setActive, close: () => setActive(null) }}>
      {children}
    </QuickAddContext.Provider>
  )
}

export function useQuickAdd() {
  return useContext(QuickAddContext)
}
