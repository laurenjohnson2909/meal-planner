-- Personal Meal, Nutrition & Fitness Planner
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query > paste > Run).
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists "pgcrypto";

-- ============================================================
-- Profile & targets
-- ============================================================

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  name text,
  age int,
  sex text check (sex in ('male', 'female', 'other')),
  height_cm numeric,
  weight_kg numeric,
  goal text check (goal in ('lose', 'maintain', 'gain')),
  target_weight_kg numeric,
  activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  updated_at timestamptz not null default now()
);

create table if not exists nutrition_targets (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  calories numeric not null default 2000,
  protein_g numeric not null default 120,
  carbs_g numeric not null default 220,
  fat_g numeric not null default 70,
  fibre_g numeric not null default 30,
  sugar_g numeric not null default 50,
  saturated_fat_g numeric not null default 20,
  salt_g numeric not null default 6,
  -- Per-weekday calorie overrides, e.g. {"4": 2600} for a higher Friday target (spec §12).
  -- Keys are day_of_week strings, 0 = Monday .. 6 = Sunday. Missing days use `calories`.
  daily_calorie_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Ingredients
-- ============================================================

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  brand text,
  category text,
  calories_per_100g numeric not null default 0,
  protein_per_100g numeric not null default 0,
  carbs_per_100g numeric not null default 0,
  fat_per_100g numeric not null default 0,
  fibre_per_100g numeric not null default 0,
  sugar_per_100g numeric not null default 0,
  saturated_fat_per_100g numeric not null default 0,
  salt_per_100g numeric not null default 0,
  default_unit text not null default 'g',
  created_at timestamptz not null default now()
);
create index if not exists ingredients_user_idx on ingredients(user_id);

create table if not exists ingredient_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  price numeric not null,
  quantity numeric not null default 1,
  unit text not null default 'g',
  updated_at timestamptz not null default now(),
  unique (ingredient_id)
);
create index if not exists ingredient_prices_user_idx on ingredient_prices(user_id);

-- ============================================================
-- Recipes
-- ============================================================

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  description text,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  category text,
  servings numeric not null default 1,
  prep_time_min int,
  cook_time_min int,
  notes text,
  instructions text[] not null default '{}',
  image_url text,
  is_favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recipes_user_idx on recipes(user_id);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantity numeric not null,
  unit text not null default 'g',
  sort_order int not null default 0
);
create index if not exists recipe_ingredients_recipe_idx on recipe_ingredients(recipe_id);
create index if not exists recipe_ingredients_ingredient_idx on recipe_ingredients(ingredient_id);

create table if not exists recipe_tags (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  tag text not null
);
create index if not exists recipe_tags_recipe_idx on recipe_tags(recipe_id);
create index if not exists recipe_tags_tag_idx on recipe_tags(tag);

-- ============================================================
-- Takeaways (referenced by meal plan items and food log items)
-- ============================================================

create table if not exists takeaways (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  restaurant text,
  meal text not null,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists takeaways_user_idx on takeaways(user_id);

-- ============================================================
-- Weekly meal planner
-- ============================================================

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  week_start_date date not null,
  unique (user_id, week_start_date)
);
create index if not exists meal_plans_user_idx on meal_plans(user_id);

create table if not exists meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Monday
  meal_slot text not null check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snacks')),
  recipe_id uuid references recipes(id) on delete set null,
  takeaway_id uuid references takeaways(id) on delete set null,
  free_text text,
  servings numeric not null default 1,
  is_takeaway boolean not null default false,
  locked boolean not null default false,
  sort_order int not null default 0
);
create index if not exists meal_plan_items_plan_idx on meal_plan_items(meal_plan_id);

-- ============================================================
-- Food log (actual intake, separate from the plan)
-- ============================================================

create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  date date not null,
  unique (user_id, date)
);
create index if not exists food_logs_user_idx on food_logs(user_id);

create table if not exists food_log_items (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid not null references food_logs(id) on delete cascade,
  logged_at time not null default current_time,
  meal_slot text check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snacks')),
  source_type text not null check (
    source_type in ('recipe', 'ingredient', 'packaged', 'restaurant', 'takeaway', 'custom')
  ),
  source_id uuid,
  description text,
  quantity numeric not null default 1,
  unit text not null default 'serving',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fibre_g numeric not null default 0,
  sugar_g numeric not null default 0,
  saturated_fat_g numeric not null default 0,
  salt_g numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists food_log_items_log_idx on food_log_items(food_log_id);

-- ============================================================
-- Exercise
-- ============================================================

create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  type text not null,
  date date not null,
  duration_min numeric,
  intensity text check (intensity in ('low', 'moderate', 'high')),
  calories_burned numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists exercise_logs_user_idx on exercise_logs(user_id);

-- ============================================================
-- Pantry & leftovers
-- ============================================================

create table if not exists pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  quantity numeric not null default 0,
  unit text not null default 'g',
  use_by_date date,
  updated_at timestamptz not null default now()
);
create index if not exists pantry_items_user_idx on pantry_items(user_id);

create table if not exists leftovers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  recipe_id uuid references recipes(id) on delete cascade,
  portions_remaining numeric not null default 0,
  date_cooked date not null default current_date,
  use_by_date date,
  notes text
);
create index if not exists leftovers_user_idx on leftovers(user_id);

-- ============================================================
-- Shopping list
-- ============================================================

create table if not exists shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  week_start_date date not null,
  unique (user_id, week_start_date)
);
create index if not exists shopping_lists_user_idx on shopping_lists(user_id);

create table if not exists shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references shopping_lists(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete set null,
  name text not null,
  quantity numeric not null default 0,
  unit text not null default 'g',
  category text,
  checked boolean not null default false,
  is_manual boolean not null default false,
  sort_order int not null default 0
);
create index if not exists shopping_list_items_list_idx on shopping_list_items(shopping_list_id);

-- ============================================================
-- Weight tracking
-- ============================================================

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  date date not null,
  weight_kg numeric not null,
  notes text,
  unique (user_id, date)
);
create index if not exists weight_logs_user_idx on weight_logs(user_id);

-- ============================================================
-- Row Level Security — every row is only visible to its owner
-- ============================================================

alter table user_profiles enable row level security;
alter table nutrition_targets enable row level security;
alter table ingredients enable row level security;
alter table ingredient_prices enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table recipe_tags enable row level security;
alter table takeaways enable row level security;
alter table meal_plans enable row level security;
alter table meal_plan_items enable row level security;
alter table food_logs enable row level security;
alter table food_log_items enable row level security;
alter table exercise_logs enable row level security;
alter table pantry_items enable row level security;
alter table leftovers enable row level security;
alter table shopping_lists enable row level security;
alter table shopping_list_items enable row level security;
alter table weight_logs enable row level security;

-- Straightforward owner-column tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_profiles', 'nutrition_targets', 'ingredients', 'ingredient_prices',
    'recipes', 'takeaways', 'meal_plans', 'food_logs', 'exercise_logs',
    'pantry_items', 'leftovers', 'shopping_lists', 'weight_logs'
  ]
  loop
    execute format('drop policy if exists owner_all on %I;', t);
    execute format(
      'create policy owner_all on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end $$;

-- user_profiles uses id, not user_id, as the owner column
drop policy if exists owner_all on user_profiles;
create policy owner_all on user_profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- Child tables scoped via their parent's ownership
drop policy if exists owner_via_recipe on recipe_ingredients;
create policy owner_via_recipe on recipe_ingredients for all
  using (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid()));

drop policy if exists owner_via_recipe on recipe_tags;
create policy owner_via_recipe on recipe_tags for all
  using (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid()));

drop policy if exists owner_via_plan on meal_plan_items;
create policy owner_via_plan on meal_plan_items for all
  using (exists (select 1 from meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid()));

drop policy if exists owner_via_log on food_log_items;
create policy owner_via_log on food_log_items for all
  using (exists (select 1 from food_logs l where l.id = food_log_id and l.user_id = auth.uid()))
  with check (exists (select 1 from food_logs l where l.id = food_log_id and l.user_id = auth.uid()));

drop policy if exists owner_via_list on shopping_list_items;
create policy owner_via_list on shopping_list_items for all
  using (exists (select 1 from shopping_lists s where s.id = shopping_list_id and s.user_id = auth.uid()))
  with check (exists (select 1 from shopping_lists s where s.id = shopping_list_id and s.user_id = auth.uid()));
