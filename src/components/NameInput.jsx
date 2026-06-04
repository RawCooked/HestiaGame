import React from 'react'

export default function NameInput({ value, onChange }) {
  return (
    <div className="name-input-wrap">
      <label className="name-input-label">Ton prénom</label>
      <input
        className="name-input"
        type="text"
        placeholder="Entre ton prénom…"
        value={value}
        onChange={e => onChange(e.target.value.slice(0, 20))}
        maxLength={20}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  )
}
