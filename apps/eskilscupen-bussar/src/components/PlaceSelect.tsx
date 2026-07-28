import { places, type Place } from '../places'

interface Props {
  id: string
  label: string
  value: string
  onChange: (key: string) => void
}

const groups: Place['group'][] = ['Fotbollsplaner', 'Övriga hållplatser']

export function PlaceSelect({ id, label, value, onChange }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Välj…</option>
        {groups.map((group) => (
          <optgroup key={group} label={group}>
            {places
              .filter((place) => place.group === group)
              .map((place) => (
                <option key={place.key} value={place.key}>
                  {place.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
