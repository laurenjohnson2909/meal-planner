import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import type { Ingredient } from '../../types/models'

export function IngredientPicker({
  ingredients,
  value,
  onChange,
  placeholder = 'Select an ingredient…',
  className = '',
}: {
  ingredients: Ingredient[]
  value: string
  onChange: (ingredientId: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = ingredients.find((i) => i.id === value)
  const filtered = query.trim()
    ? ingredients.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()))
    : ingredients

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    function onOutsideClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onOutsideClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-hi px-3 py-2 text-left text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <span className={`truncate ${selected ? '' : 'text-text-dim'}`}>{selected?.name ?? placeholder}</span>
        <ChevronDown size={15} className="shrink-0 text-text-dim" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-surface shadow-lg">
          <div className="relative border-b border-border p-1.5">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ingredients…"
              className="w-full rounded-md bg-surface-hi py-1.5 pl-7 pr-2 text-sm text-text placeholder:text-text-dim focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-dim">No ingredients match "{query}"</p>
            ) : (
              filtered.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => select(i.id)}
                  className={`block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-surface-hi ${
                    i.id === value ? 'text-primary' : 'text-text'
                  }`}
                >
                  {i.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
