import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY

// Default centre coords for each lough sector
const SECTOR_COORDS = {
  'Lough Craghy': { lat: 55.0362, lng: -8.1841, zoom: 14 },
  'Lough Anure':  { lat: 54.9891, lng: -8.2134, zoom: 14 },
  'Lough Deele':  { lat: 54.8923, lng: -7.8012, zoom: 14 },
}

const PIN_COLORS = {
  productive: '#1D9E75',
  focused:    '#FFB302',
  missed:     '#F09595',
}

const PIN_LABELS = {
  productive: 'Productive',
  focused:    'Area fished',
  missed:     'Missed — others had fish',
}

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return }
    const existing = document.getElementById('gmaps-script')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps))
      return
    }
    const script = document.createElement('script')
    script.id = 'gmaps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google.maps)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function SectorMap({ sector, profile, flies, readOnly = false }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const [pins, setPins] = useState([])
  const [dropping, setDropping] = useState(null) // 'productive' | 'focused' | 'missed'
  const [selectedPin, setSelectedPin] = useState(null)
  const [pinNote, setPinNote] = useState('')
  const [pinFlyId, setPinFlyId] = useState('')
  const [pinMethod, setPinMethod] = useState('')
  const [saving, setSaving] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState(null)

  const fetchPins = useCallback(async () => {
    const { data } = await supabase.from('catch_pins').select('*, profiles(name, initials, team)').eq('sector', sector)
    setPins(data || [])
  }, [sector])

  useEffect(() => {
    fetchPins()
    const channel = supabase
      .channel('pins-' + sector)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catch_pins' }, fetchPins)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchPins, sector])

  // Init map
  useEffect(() => {
    if (!mapRef.current) return
    loadGoogleMaps(MAPS_KEY).then(gmaps => {
      const coords = SECTOR_COORDS[sector] || { lat: 55.0, lng: -8.1, zoom: 13 }
      const map = new gmaps.Map(mapRef.current, {
        center: { lat: coords.lat, lng: coords.lng },
        zoom: coords.zoom,
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      })
      mapInstanceRef.current = map
      setMapLoaded(true)

      if (!readOnly) {
        map.addListener('click', (e) => {
          setPendingLatLng({ lat: e.latLng.lat(), lng: e.latLng.lng() })
        })
      }
    }).catch(err => console.error('Maps load error:', err))
  }, [sector, readOnly])

  // Render pins on map
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return
    const gmaps = window.google.maps

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    pins.forEach(pin => {
      const color = PIN_COLORS[pin.pin_type] || '#888'
      const marker = new gmaps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map: mapInstanceRef.current,
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: color,
          fillOpacity: 0.95,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        title: `${pin.profiles?.name} · ${PIN_LABELS[pin.pin_type]}`,
      })

      const infoContent = `
        <div style="font-family:sans-serif;font-size:13px;max-width:200px;padding:4px;">
          <div style="font-weight:600;margin-bottom:4px;">${PIN_LABELS[pin.pin_type]}</div>
          <div style="color:#555;margin-bottom:2px;">${pin.profiles?.name || 'Unknown'} · ${pin.profiles?.team || ''}</div>
          ${pin.method ? `<div style="margin-top:4px;">Method: ${pin.method}</div>` : ''}
          ${pin.notes ? `<div style="margin-top:4px;">${pin.notes}</div>` : ''}
        </div>
      `
      const infoWindow = new gmaps.InfoWindow({ content: infoContent })
      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker)
        setSelectedPin(pin)
      })

      markersRef.current.push(marker)
    })
  }, [pins, mapLoaded])

  async function savePin() {
    if (!pendingLatLng || !dropping) return
    setSaving(true)
    await supabase.from('catch_pins').insert({
      user_id: profile.id,
      sector,
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      pin_type: dropping,
      fly_id: pinFlyId || null,
      method: pinMethod || null,
      notes: pinNote || null,
    })
    await fetchPins()
    setPendingLatLng(null)
    setDropping(null)
    setPinNote(''); setPinFlyId(''); setPinMethod('')
    setSaving(false)
  }

  async function deletePin(pinId) {
    await supabase.from('catch_pins').delete().eq('id', pinId)
    setSelectedPin(null)
    await fetchPins()
  }

  const pinCounts = {
    productive: pins.filter(p => p.pin_type === 'productive').length,
    focused: pins.filter(p => p.pin_type === 'focused').length,
    missed: pins.filter(p => p.pin_type === 'missed').length,
  }

  return (
    <div>
      {/* Map */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: 280, borderRadius: 10, overflow: 'hidden', marginBottom: 10, background: 'var(--bg-input)' }}
      />

      {/* Pin counts */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {Object.entries(PIN_COLORS).map(([type, color]) => (
          <div key={type} style={{ flex: 1, background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, margin: '0 auto 4px' }} />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{PIN_LABELS[type].split(' ')[0]}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{pinCounts[type]}</div>
          </div>
        ))}
      </div>

      {/* Drop pin controls */}
      {!readOnly && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
            {dropping ? `Tap the map to place a ${PIN_LABELS[dropping].toLowerCase()} pin` : 'Drop a pin'}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {Object.entries(PIN_COLORS).map(([type, color]) => (
              <button
                key={type}
                onClick={() => setDropping(dropping === type ? null : type)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${dropping === type ? color : 'var(--border)'}`,
                  background: dropping === type ? color + '22' : 'var(--bg-input)',
                  color: dropping === type ? color : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer'
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, margin: '0 auto 3px' }} />
                {PIN_LABELS[type].split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Pending pin form */}
          {pendingLatLng && dropping && (
            <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 12, marginBottom: 10, border: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>
                📍 {PIN_LABELS[dropping]} pin
              </div>
              <label style={{ marginTop: 0 }}>Method (optional)</label>
              <input type="text" placeholder="e.g. Short erratic on DI3" value={pinMethod} onChange={e => setPinMethod(e.target.value)} />
              <label>Fly (optional)</label>
              <select value={pinFlyId} onChange={e => setPinFlyId(e.target.value)}>
                <option value="">Select fly...</option>
                {(flies || []).map(f => <option key={f.id} value={f.id}>{f.name} #{f.size}</option>)}
              </select>
              <label>Notes (optional)</label>
              <textarea rows={2} placeholder="Any detail worth adding..." value={pinNote} onChange={e => setPinNote(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ marginTop: 10 }} onClick={savePin} disabled={saving}>
                  {saving ? 'Saving...' : 'Save pin'}
                </button>
                <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => { setPendingLatLng(null); setDropping(null) }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected pin detail */}
      {selectedPin && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 12, border: `0.5px solid ${PIN_COLORS[selectedPin.pin_type]}44` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: PIN_COLORS[selectedPin.pin_type] }}>{PIN_LABELS[selectedPin.pin_type]}</div>
            <button onClick={() => setSelectedPin(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{selectedPin.profiles?.name} · {selectedPin.profiles?.team}</div>
          {selectedPin.method && <div style={{ fontSize: 13, color: 'var(--text)' }}>Method: {selectedPin.method}</div>}
          {selectedPin.notes && <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{selectedPin.notes}</div>}
          {selectedPin.user_id === profile?.id && (
            <button onClick={() => deletePin(selectedPin.id)} style={{ marginTop: 8, fontSize: 12, color: '#F09595', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Remove pin
            </button>
          )}
        </div>
      )}
    </div>
  )
}
