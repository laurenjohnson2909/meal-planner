import { Link } from 'react-router-dom'
import { Apple, CalendarDays, ChefHat, Dumbbell, ShoppingCart, type LucideIcon } from 'lucide-react'
import { Card, EmptyState, ProgressBar } from '../components/ui/Primitives'
import { useNutritionTargets } from '../hooks/useProfile'
import { useFoodLog } from '../hooks/useFoodLog'
import { useMealPlan } from '../hooks/useMealPlan'
import { useExerciseLogs } from '../hooks/useExercise'
import { usePantry } from '../hooks/usePantry'
import { useLeftovers } from '../hooks/useLeftovers'
import { sumNutrition } from '../lib/nutrition'
import { dayOfWeekIndex, todayStr, weekStart } from '../lib/dates'
import { useQuickAdd } from '../hooks/useQuickAdd'
import { analyseIngredientReuse } from '../lib/reuse'

export function Dashboard() {
  const today = todayStr()
  const week = weekStart()
  const dayIndex = dayOfWeekIndex()
  const quickAdd = useQuickAdd()

  const { data: targets } = useNutritionTargets()
  const { data: log } = useFoodLog(today)
  const { data: plan } = useMealPlan(week)
  const { data: exerciseLogs } = useExerciseLogs(today, today)
  const { data: pantry } = usePantry()
  const { data: leftovers } = useLeftovers()

  const eaten = sumNutrition(log?.items ?? [])
  const todaysPlanItems = (plan?.items ?? []).filter((i) => i.day_of_week === dayIndex)
  const exerciseMinutes = (exerciseLogs ?? []).reduce((sum, e) => sum + (e.duration_min ?? 0), 0)

  const t = targets
  const remaining = {
    calories: (t?.calories ?? 2000) - eaten.calories,
    protein_g: (t?.protein_g ?? 120) - eaten.protein_g,
    carbs_g: (t?.carbs_g ?? 220) - eaten.carbs_g,
    fat_g: (t?.fat_g ?? 70) - eaten.fat_g,
  }

  const soonToExpire = (pantry ?? []).filter((p) => {
    if (!p.use_by_date) return false
    const days = (new Date(p.use_by_date).getTime() - Date.now()) / 86_400_000
    return days <= 3 && days >= -1
  })

  const reuseUsage = analyseIngredientReuse(plan?.items ?? [])
  const repeatedIngredients = reuseUsage.filter((u) => u.recipeCount >= 3).slice(0, 5)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="text-sm text-text-dim">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <Card>
        <div className="mb-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Calories" value={eaten.calories} target={t?.calories ?? 2000} />
          <Stat label="Protein" value={eaten.protein_g} target={t?.protein_g ?? 120} suffix="g" />
          <Stat label="Carbs" value={eaten.carbs_g} target={t?.carbs_g ?? 220} suffix="g" />
          <Stat label="Fat" value={eaten.fat_g} target={t?.fat_g ?? 70} suffix="g" />
        </div>
        <p className="text-xs text-text-dim">
          {remaining.calories >= 0
            ? `${Math.round(remaining.calories)} kcal remaining today`
            : `${Math.round(-remaining.calories)} kcal over target`}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-text-dim">Today's meals</h2>
          {todaysPlanItems.length === 0 ? (
            <EmptyState title="Nothing planned for today" />
          ) : (
            <ul className="space-y-1.5">
              {todaysPlanItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-text-dim">{item.meal_slot}</span>
                  <span>{item.recipe?.name ?? item.takeaway?.meal ?? item.free_text ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-text-dim">Exercise today</h2>
          {(exerciseLogs ?? []).length === 0 ? (
            <EmptyState title="No exercise logged yet" />
          ) : (
            <ul className="space-y-1.5">
              {exerciseLogs!.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between text-sm">
                  <span>{ex.type}</span>
                  <span className="text-text-dim">{ex.duration_min} min</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-text-dim">{exerciseMinutes} min total today</p>
        </Card>
      </div>

      {soonToExpire.length > 0 && (
        <Card className="border-warn/40">
          <h2 className="mb-1 text-sm font-semibold text-warn">Use it up soon</h2>
          <p className="text-xs text-text-dim">
            {soonToExpire.map((p) => p.ingredient.name).join(', ')} — approaching their use-by date.
          </p>
        </Card>
      )}

      {repeatedIngredients.length > 0 && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-text-dim">Well-reused this week</h2>
          <p className="text-xs text-text-dim">
            {repeatedIngredients.map((u) => `${u.ingredient.name} (${u.recipeCount} recipes)`).join(', ')}
          </p>
        </Card>
      )}

      {(leftovers ?? []).length > 0 && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-text-dim">Leftovers available</h2>
          <p className="text-xs text-text-dim">
            {leftovers!.map((l) => `${l.recipe?.name ?? 'Meal'} (${l.portions_remaining} portions)`).join(', ')}
          </p>
        </Card>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-dim">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <QuickAction icon={Apple} label="Log Food" onClick={() => quickAdd.open('food')} />
          <QuickAction icon={ChefHat} label="Add Recipe" to="/recipes/new" />
          <QuickAction icon={Dumbbell} label="Add Exercise" onClick={() => quickAdd.open('exercise')} />
          <QuickAction icon={CalendarDays} label="Weekly Plan" to="/plan" />
          <QuickAction icon={ShoppingCart} label="Shopping List" to="/shopping-list" />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, target, suffix = '' }: { label: string; value: number; target: number; suffix?: string }) {
  return (
    <div>
      <p className="text-xs text-text-dim">{label}</p>
      <p className="text-lg font-semibold">
        {Math.round(value)}
        {suffix} <span className="text-xs font-normal text-text-dim">/ {Math.round(target)}{suffix}</span>
      </p>
      <ProgressBar value={value} max={target} tone={value > target ? 'warn' : 'primary'} />
    </div>
  )
}

function QuickAction({ icon: Icon, label, to, onClick }: { icon: LucideIcon; label: string; to?: string; onClick?: () => void }) {
  const content = (
    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-surface p-3 text-center text-xs text-text-dim hover:bg-surface-hi hover:text-text">
      <Icon size={20} />
      {label}
    </div>
  )
  if (to) return <Link to={to}>{content}</Link>
  return <button onClick={onClick} className="w-full">{content}</button>
}
