import { places, type Place } from '../places'

interface FavoriteToggle {
  isFavorite: boolean
  onToggle: () => void
}

interface Props {
  id: string
  label: string
  value: string
  onChange: (key: string) => void
  /** Utelämnas när fältet inte ska kunna sparas som favorit. */
  favorite?: FavoriteToggle
}

const groups: Place['group'][] = ['Fotbollsplaner', 'Övriga hållplatser']

export function PlaceSelect({ id, label, value, onChange, favorite }: Props) {
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        {favorite && (
          <button
            type="button"
            className={favorite.isFavorite ? 'star star-on' : 'star'}
            onClick={favorite.onToggle}
            disabled={!value}
            aria-pressed={favorite.isFavorite}
            title={
              value
                ? favorite.isFavorite
                  ? 'Ta bort som favorit'
                  : 'Spara som favorit'
                : 'Välj en plats först'
            }
          >
            <span aria-hidden="true">{favorite.isFavorite ? '★' : '☆'}</span>
            <span className="star-text">Favorit</span>
          </button>
        )}
      </div>
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
