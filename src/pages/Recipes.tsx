import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Star } from 'lucide-react'
import { PageHeader, Button, Card, EmptyState, Input, Spinner } from '../components/ui/Primitives'
import { useRecipes } from '../hooks/useRecipes'
import { useIngredientUnitConversions } from '../hooks/useIngredients'
import { recipePerServing } from '../lib/nutrition'
import { buildConversionsByIngredient } from '../lib/units'
import { RECIPE_TAGS } from '../types/models'

export function Recipes() {
  const { data: recipes, isLoading } = useRecipes()
  const { data: allConversions } = useIngredientUnitConversions()
  const conversions = buildConversionsByIngredient(allConversions ?? [])
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [favouritesOnly, setFavouritesOnly] = useState(false)

  const filtered = useMemo(() => {
    return (recipes ?? []).filter((r) => {
      if (favouritesOnly && !r.is_favourite) return false
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
      if (activeTags.length > 0) {
        const recipeTags = r.recipe_tags.map((t) => t.tag)
        if (!activeTags.every((t) => recipeTags.includes(t))) return false
      }
      return true
    })
  }, [recipes, search, activeTags, favouritesOnly])

  function toggleTag(tag: string) {
    setActiveTags(activeTags.includes(tag) ? activeTags.filter((t) => t !== tag) : [...activeTags, tag])
  }

  return (
    <div>
      <PageHeader
        title="Recipes"
        action={
          <Link to="/recipes/new">
            <Button>
              <Plus size={16} /> New recipe
            </Button>
          </Link>
        }
      />

      <div className="mb-3 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <Input className="pl-9" placeholder="Search recipes…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setFavouritesOnly(!favouritesOnly)}
          className={`rounded-full px-2.5 py-1 text-xs ${favouritesOnly ? 'bg-primary text-slate-900' : 'bg-surface-hi text-text-dim'}`}
        >
          ★ Favourites
        </button>
        {RECIPE_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`rounded-full px-2.5 py-1 text-xs ${
              activeTags.includes(tag) ? 'bg-primary text-slate-900' : 'bg-surface-hi text-text-dim'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No recipes found" hint="Create your first recipe to get started." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => {
            const perServing = recipePerServing(recipe.recipe_ingredients, recipe.servings, conversions)
            return (
              <Link key={recipe.id} to={`/recipes/${recipe.id}`}>
                <Card className="h-full hover:border-primary/50">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{recipe.name}</p>
                    {recipe.is_favourite && <Star size={14} className="shrink-0 fill-primary text-primary" />}
                  </div>
                  <p className="mt-1 text-xs capitalize text-text-dim">
                    {recipe.meal_type} · {recipe.servings} servings
                  </p>
                  <p className="mt-2 text-xs text-text-dim">
                    {Math.round(perServing.calories)} kcal · {Math.round(perServing.protein_g)}g protein / serving
                  </p>
                  {recipe.recipe_tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {recipe.recipe_tags.slice(0, 3).map((t) => (
                        <span key={t.id} className="rounded-full bg-surface-hi px-2 py-0.5 text-[10px] text-text-dim">
                          {t.tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
