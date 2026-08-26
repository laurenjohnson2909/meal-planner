import { useState } from 'react'
import { Modal, Button, Field, Input } from '../ui/Primitives'
import { useAddWeightLog } from '../../hooks/useWeight'
import { todayStr } from '../../lib/dates'

export function AddWeightModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [date, setDate] = useState(todayStr())
  const [weight, setWeight] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const addLog = useAddWeightLog()

  async function submit() {
    if (weight === '') return
    await addLog.mutateAsync({ date, weight_kg: weight, notes: notes || undefined })
    setWeight('')
    setNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Weight">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Weight (kg)">
            <Input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value === '' ? '' : +e.target.value)}
            />
          </Field>
        </div>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={submit} disabled={addLog.isPending}>
          Save weight
        </Button>
      </div>
    </Modal>
  )
}
