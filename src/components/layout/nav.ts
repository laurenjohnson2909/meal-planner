import {
  Apple,
  Beef,
  CalendarDays,
  ChefHat,
  Dumbbell,
  LayoutDashboard,
  LineChart,
  Package,
  ShoppingCart,
  Settings,
  Sparkles,
} from 'lucide-react'

export const PRIMARY_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/plan', label: 'Weekly Plan', icon: CalendarDays },
  { to: '/recipes', label: 'Recipes', icon: ChefHat },
  { to: '/food-log', label: 'Food Log', icon: Apple },
  { to: '/exercise', label: 'Exercise', icon: Dumbbell },
  { to: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
  { to: '/pantry', label: 'Pantry', icon: Package },
  { to: '/progress', label: 'Progress', icon: LineChart },
]

export const SECONDARY_NAV = [
  { to: '/recommendations', label: 'What Can I Make?', icon: Sparkles },
  { to: '/ingredients', label: 'Ingredients', icon: Beef },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const BOTTOM_NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
]

export const BOTTOM_MORE_NAV = [
  { to: '/food-log', label: 'Food Log', icon: Apple },
  { to: '/exercise', label: 'Exercise', icon: Dumbbell },
  { to: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
  { to: '/pantry', label: 'Pantry', icon: Package },
  { to: '/progress', label: 'Progress', icon: LineChart },
  { to: '/recommendations', label: 'What Can I Make?', icon: Sparkles },
  { to: '/ingredients', label: 'Ingredients', icon: Beef },
  { to: '/settings', label: 'Settings', icon: Settings },
]
