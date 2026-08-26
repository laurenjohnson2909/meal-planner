import { Link } from 'react-router-dom'
import { PageHeader, Card, EmptyState, Badge } from '../components/ui/Primitives'
import { useRecipes } from '../hooks/useRecipes'
import { usePantry } from '../hooks/usePantry'
import { useMealPlan } from '../hooks/useMealPlan'
import { useFoodLog } from '../hooks/useFoodLog'
import { useNutritionTargets } from '../hooks/useProfile'
import { useIngredientUnitConversions } from '../hooks/useIngredients'
import { whatCanIMake } from '../lib/recommend'
import { sumNutrition } from '../lib/nutrition'
import { buildConversionsByIngredient } from '../lib/units'
import { todayStr, weekStart } from '../lib/dates'

export function Recommendations() {
  const { data: recipes } = useRecipes()
  const { data: pantry } = usePantry()
  const { data: plan } = useMealPlan(weekStart())
  const { data: log } = useFoodLog(todayStr())
  const { data: targets } = useNutritionTargets()
  const { data: allConversions } = useIngredientUnitConversions()
  const conversions = buildConversionsByIngredient(allConversions ?? [])

  const plannedIngredientIds = new Set(
    (plan?.items ?? []).flatMap((i) => i.recipe?.recipe_ingredients.map((ri) => ri.ingredient_id) ?? []),
  )
  const eaten = sumNutrition(log?.items ?? [])
  const remainingCalories = (targets?.calories ?? 2000) - eaten.calories
  const remainingProtein = (targets?.protein_g ?? 120) - eaten.protein_g

  const results = whatCanIMake(recipes ?? [], pantry ?? [], plannedIngredientIds, remainingCalories, remainingProtein, conversions)

  return (
    <div>
      <PageHeader title="What Can I Make?" />
      <p className="mb-4 text-xs text-text-dim">
        Ranked by what needs the fewest extra purchases — using your pantry stock and this week's already-planned
        ingredients first.
      </p>

      {results.length === 0 ? (
        <EmptyState title="Add some recipes to get suggestions" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.slice(0, 20).map((r) => (
            <Link key={r.recipe.id} to={`/recipes/${r.recipe.id}`}>
              <Card className="h-full hover:border-primary/50">
                <div className="flex items-start justify-between">
                  <p className="font-medium">{r.recipe.name}</p>
                  {r.missingIngredientCount === 0 && <Badge tone="primary">Ready now</Badge>}
                </div>
                <p className="mt-1 text-xs text-text-dim">
                  {r.ownedIngredientCount} on hand
                  {r.missingIngredientCount > 0 && `, ${r.missingIngredientCount} to buy`}
                </p>
                {r.missingIngredientCount > 0 && r.missingIngredientCount <= 4 && (
                  <p className="mt-1 text-xs text-text-dim">Missing: {r.missingIngredientNames.join(', ')}</p>
                )}
                {r.fitsRemaining && <p className="mt-1 text-xs text-primary">Fits your remaining calories/protein today</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
