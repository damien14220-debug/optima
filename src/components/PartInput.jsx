export default function PartInput({ value, onChange, montant }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
        Ma part : {value}% ({montant ? (parseFloat(montant) * value / 100).toFixed(2) : '0.00'} €)
      </label>
      <input type="range" min="0" max="100" step="5" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: '#8b5cf6' }} />
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {[0, 25, 50, 75, 100].map(p => (
          <button key={p} type="button" onClick={() => onChange(p)}
            style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: value === p ? 'none' : '1px solid var(--color-border)', background: value === p ? '#8b5cf6' : 'transparent', color: value === p ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
            {p}%
          </button>
        ))}
      </div>
    </div>
  )
}
