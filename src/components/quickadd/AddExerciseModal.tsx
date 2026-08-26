import { useState } from 'react'
import { Modal, Button, Field, Input, Select } from '../ui/Primitives'
import { useAddExerciseLog, EXERCISE_TYPES } from '../../hooks/useExercise'
import { todayStr } from '../../lib/dates'
import type { Intensity } from '../../types/models'

export function AddExerciseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState(EXERCISE_TYPES[0])
  const [date, setDate] = useState(todayStr())
  const [duration, setDuration] = useState(30)
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [calories, setCalories] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const addLog = useAddExerciseLog()

  async function submit() {
    await addLog.mutateAsync({
      type,
      date,
      duration_min: duration,
      intensity,
      calories_burned: calories === '' ? null : calories,
      notes: notes || null,
    })
    setDuration(30)
    setCalories('')
    setNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Exercise">
      <div className="space-y-3">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {EXERCISE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Duration (min)">
            <Input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Intensity">
            <Select value={intensity} onChange={(e) => setIntensity(e.target.value as Intensity)}>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <Field label="Calories burned (optional)">
            <Input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value === '' ? '' : +e.target.value)}
            />
          </Field>
        </div>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={submit} disabled={addLog.isPending}>
          Add exercise
        </Button>
      </div>
    </Modal>
  )
}
