import { useEffect, useState } from 'react'
import { PageHeader, Button, Card, Field, Input, Select } from '../components/ui/Primitives'
import { useNutritionTargets, useProfile, useUpdateNutritionTargets, useUpdateProfile } from '../hooks/useProfile'
import { ACTIVITY_MULTIPLIERS, calculateCalorieTarget, calculateMacroTargets } from '../lib/nutrition'
import type { ActivityLevel, Goal, Sex } from '../types/models'
import { DAYS_OF_WEEK } from '../types/models'

export function Settings() {
  const { data: profile } = useProfile()
  const { data: targets } = useNutritionTargets()
  const updateProfile = useUpdateProfile()
  const updateTargets = useUpdateNutritionTargets()

  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [sex, setSex] = useState<Sex>('other')
  const [height, setHeight] = useState<number | ''>('')
  const [weight, setWeight] = useState<number | ''>('')
  const [goal, setGoal] = useState<Goal>('maintain')
  const [targetWeight, setTargetWeight] = useState<number | ''>('')
  const [activity, setActivity] = useState<ActivityLevel>('moderate')

  const [calories, setCalories] = useState(2000)
  const [protein, setProtein] = useState(120)
  const [carbs, setCarbs] = useState(220)
  const [fat, setFat] = useState(70)
  const [fibre, setFibre] = useState(30)
  const [sugar, setSugar] = useState(50)
  const [satFat, setSatFat] = useState(20)
  const [salt, setSalt] = useState(6)
  const [dailyOverrides, setDailyOverrides] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setAge(profile.age ?? '')
    setSex(profile.sex ?? 'other')
    setHeight(profile.height_cm ?? '')
    setWeight(profile.weight_kg ?? '')
    setGoal(profile.goal ?? 'maintain')
    setTargetWeight(profile.target_weight_kg ?? '')
    setActivity(profile.activity_level ?? 'moderate')
  }, [profile])

  useEffect(() => {
    if (!targets) return
    setCalories(targets.calories)
    setProtein(targets.protein_g)
    setCarbs(targets.carbs_g)
    setFat(targets.fat_g)
    setFibre(targets.fibre_g)
    setSugar(targets.sugar_g)
    setSatFat(targets.saturated_fat_g)
    setSalt(targets.salt_g)
    setDailyOverrides(targets.daily_calorie_overrides ?? {})
  }, [targets])

  async function saveProfile() {
    await updateProfile.mutateAsync({
      name: name || null,
      age: age === '' ? null : age,
      sex,
      height_cm: height === '' ? null : height,
      weight_kg: weight === '' ? null : weight,
      goal,
      target_weight_kg: targetWeight === '' ? null : targetWeight,
      activity_level: activity,
    })
  }

  async function saveTargets() {
    await updateTargets.mutateAsync({
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fibre_g: fibre,
      sugar_g: sugar,
      saturated_fat_g: satFat,
      salt_g: salt,
      daily_calorie_overrides: dailyOverrides,
    })
  }

  function setDayOverride(day: number, value: number | '') {
    setDailyOverrides((prev) => {
      const next = { ...prev }
      if (value === '') delete next[String(day)]
      else next[String(day)] = value
      return next
    })
  }

  function runCalculator() {
    if (age === '' || height === '' || weight === '') return
    const cals = calculateCalorieTarget({ sex, age, heightCm: height, weightKg: weight, activityLevel: activity, goal })
    const macros = calculateMacroTargets(cals)
    setCalories(cals)
    setProtein(macros.protein_g)
    setCarbs(macros.carbs_g)
    setFat(macros.fat_g)
    setFibre(macros.fibre_g)
    setSugar(macros.sugar_g)
    setSatFat(macros.saturated_fat_g)
    setSalt(macros.salt_g)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" />

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-text-dim">Profile</h2>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value === '' ? '' : +e.target.value)} />
            </Field>
            <Field label="Sex">
              <Select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Height (cm)">
              <Input type="number" value={height} onChange={(e) => setHeight(e.target.value === '' ? '' : +e.target.value)} />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value === '' ? '' : +e.target.value)} />
            </Field>
            <Field label="Goal">
              <Select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
                <option value="lose">Lose weight</option>
                <option value="maintain">Maintain</option>
                <option value="gain">Gain weight</option>
              </Select>
            </Field>
            <Field label="Target weight (kg)">
              <Input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value === '' ? '' : +e.target.value)} />
            </Field>
          </div>
          <Field label="Activity level">
            <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
              {Object.keys(ACTIVITY_MULTIPLIERS).map((level) => (
                <option key={level} value={level}>
                  {level.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={saveProfile} disabled={updateProfile.isPending}>
            Save profile
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-dim">Nutrition targets</h2>
          <button onClick={runCalculator} className="text-xs text-primary hover:underline">
            Calculate from profile
          </button>
        </div>
        <p className="mb-3 text-xs text-text-dim">Always manually editable, even after calculating.</p>
        <div className="grid grid-cols-4 gap-2">
          <NumField label="Calories" value={calories} onChange={setCalories} />
          <NumField label="Protein (g)" value={protein} onChange={setProtein} />
          <NumField label="Carbs (g)" value={carbs} onChange={setCarbs} />
          <NumField label="Fat (g)" value={fat} onChange={setFat} />
          <NumField label="Fibre (g)" value={fibre} onChange={setFibre} />
          <NumField label="Sugar (g)" value={sugar} onChange={setSugar} />
          <NumField label="Sat. fat (g)" value={satFat} onChange={setSatFat} />
          <NumField label="Salt (g)" value={salt} onChange={setSalt} />
        </div>

        <p className="mb-2 mt-4 text-xs font-medium text-text-dim">
          Per-day calorie overrides (optional — e.g. a higher Friday target)
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAYS_OF_WEEK.map((day, i) => (
            <Field key={day} label={day.slice(0, 3)}>
              <Input
                type="number"
                placeholder={String(calories)}
                value={dailyOverrides[String(i)] ?? ''}
                onChange={(e) => setDayOverride(i, e.target.value === '' ? '' : +e.target.value)}
              />
            </Field>
          ))}
        </div>

        <Button className="mt-3" onClick={saveTargets} disabled={updateTargets.isPending}>
          Save targets
        </Button>
      </Card>
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" value={value} onChange={(e) => onChange(+e.target.value)} />
    </Field>
  )
}
