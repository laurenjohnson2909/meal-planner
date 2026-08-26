import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { QuickAddProvider } from './hooks/useQuickAdd'
import { AppLayout } from './components/layout/AppLayout'
import { Spinner } from './components/ui/Primitives'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { WeeklyPlan } from './pages/WeeklyPlan'
import { Recipes } from './pages/Recipes'
import { RecipeDetail } from './pages/RecipeDetail'
import { Ingredients } from './pages/Ingredients'
import { FoodLog } from './pages/FoodLog'
import { Exercise } from './pages/Exercise'
import { ShoppingList } from './pages/ShoppingList'
import { Pantry } from './pages/Pantry'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { Recommendations } from './pages/Recommendations'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <QuickAddProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan" element={<WeeklyPlan />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/new" element={<RecipeDetail />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/ingredients" element={<Ingredients />} />
          <Route path="/food-log" element={<FoodLog />} />
          <Route path="/exercise" element={<Exercise />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </QuickAddProvider>
  )
}
