import { LogOut, Plus, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useQuickAdd } from '../../hooks/useQuickAdd'
import { PRIMARY_NAV, SECONDARY_NAV, BOTTOM_NAV, BOTTOM_MORE_NAV } from './nav'
import { LogFoodModal } from '../quickadd/LogFoodModal'
import { AddExerciseModal } from '../quickadd/AddExerciseModal'
import { AddWeightModal } from '../quickadd/AddWeightModal'
import { AddTakeawayModal } from '../quickadd/AddTakeawayModal'
import { useNavigate } from 'react-router-dom'

export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const quickAdd = useQuickAdd()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg text-text sm:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border p-4 sm:flex sm:flex-col">
        <div className="mb-6 px-2 text-lg font-semibold text-primary">🥗 Meal Planner</div>
        <nav className="flex flex-1 flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
          <div className="my-2 border-t border-border" />
          {SECONDARY_NAV.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-dim hover:bg-surface-hi hover:text-text"
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <main className="flex-1 pb-20 sm:pb-0">
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-surface py-2 sm:hidden">
        {BOTTOM_NAV.map((item) => (
          <BottomLink key={item.to} {...item} />
        ))}
        <button
          onClick={() => setAddOpen(true)}
          className="flex flex-col items-center justify-center rounded-full bg-primary p-3 text-slate-900 shadow-lg"
        >
          <Plus size={22} />
        </button>
        <BottomLink to="/recipes" label="Recipes" icon={PRIMARY_NAV[2].icon} />
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 text-xs text-text-dim"
        >
          <div className="grid grid-cols-2 gap-0.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1 w-1 rounded-full bg-current" />
            ))}
          </div>
          More
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:hidden" onClick={() => setMoreOpen(false)}>
          <div className="w-full rounded-t-2xl border border-border bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">More</h2>
              <button onClick={() => setMoreOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {BOTTOM_MORE_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1 rounded-xl bg-surface-hi p-3 text-xs text-text-dim"
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={() => {
                  setMoreOpen(false)
                  supabase.auth.signOut()
                }}
                className="flex flex-col items-center gap-1 rounded-xl bg-surface-hi p-3 text-xs text-danger"
              >
                <LogOut size={20} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add sheet */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:hidden" onClick={() => setAddOpen(false)}>
          <div className="w-full rounded-t-2xl border border-border bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Add</h2>
              <button onClick={() => setAddOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SheetAction label="Log Food" onClick={() => { setAddOpen(false); quickAdd.open('food') }} />
              <SheetAction label="Add Recipe" onClick={() => { setAddOpen(false); navigate('/recipes/new') }} />
              <SheetAction label="Add Exercise" onClick={() => { setAddOpen(false); quickAdd.open('exercise') }} />
              <SheetAction label="Add Weight" onClick={() => { setAddOpen(false); quickAdd.open('weight') }} />
              <SheetAction label="Add Takeaway" onClick={() => { setAddOpen(false); quickAdd.open('takeaway') }} />
            </div>
          </div>
        </div>
      )}

      <LogFoodModal open={quickAdd.active === 'food'} onClose={quickAdd.close} />
      <AddExerciseModal open={quickAdd.active === 'exercise'} onClose={quickAdd.close} />
      <AddWeightModal open={quickAdd.active === 'weight'} onClose={quickAdd.close} />
      <AddTakeawayModal open={quickAdd.active === 'takeaway'} onClose={quickAdd.close} />
    </div>
  )
}

function SidebarLink({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
          isActive ? 'bg-primary/15 text-primary' : 'text-text-dim hover:bg-surface-hi hover:text-text'
        }`
      }
    >
      <Icon size={17} />
      {label}
    </NavLink>
  )
}

function BottomLink({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-2 text-xs ${isActive ? 'text-primary' : 'text-text-dim'}`
      }
    >
      <Icon size={20} />
      {label}
    </NavLink>
  )
}

function SheetAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl bg-surface-hi p-4 text-sm font-medium text-text hover:bg-border">
      {label}
    </button>
  )
}
