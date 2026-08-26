import { useState } from 'react'
import { Modal, Button, Field, Input, Textarea } from '../ui/Primitives'
import { useAddTakeaway } from '../../hooks/useTakeaways'

export function AddTakeawayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [restaurant, setRestaurant] = useState('')
  const [meal, setMeal] = useState('')
  const [calories, setCalories] = useState<number | ''>('')
  const [protein, setProtein] = useState<number | ''>('')
  const [carbs, setCarbs] = useState<number | ''>('')
  const [fat, setFat] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const addTakeaway = useAddTakeaway()

  async function submit() {
    if (!meal) return
    await addTakeaway.mutateAsync({
      restaurant: restaurant || null,
      meal,
      calories: calories === '' ? null : calories,
      protein_g: protein === '' ? null : protein,
      carbs_g: carbs === '' ? null : carbs,
      fat_g: fat === '' ? null : fat,
      notes: notes || null,
    })
    setRestaurant('')
    setMeal('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Takeaway">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Restaurant">
            <Input value={restaurant} onChange={(e) => setRestaurant(e.target.value)} />
          </Field>
          <Field label="Meal">
            <Input value={meal} onChange={(e) => setMeal(e.target.value)} placeholder="e.g. Chicken Korma" />
          </Field>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Field label="Cal">
            <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value === '' ? '' : +e.target.value)} />
          </Field>
          <Field label="Protein">
            <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value === '' ? '' : +e.target.value)} />
          </Field>
          <Field label="Carbs">
            <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value === '' ? '' : +e.target.value)} />
          </Field>
          <Field label="Fat">
            <Input type="number" value={fat} onChange={(e) => setFat(e.target.value === '' ? '' : +e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={submit} disabled={addTakeaway.isPending}>
          Save takeaway
        </Button>
      </div>
    </Modal>
  )
}
