import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uikwsbfgjpgqelndmrmn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpa3dzYmZnanBncWVsbmRtcm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDY4NTUsImV4cCI6MjA5NzEyMjg1NX0.dXg6g8m4V9iCtztI40Z_KwIWczQdwar-99wPQKY8f1s'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const SECTORS = [
  'Lough Craghy',
  'Lough Anure',
  'Lough Deele',
  'River Dennett',
  'River Quiggery',
]

export const LOUGH_SECTORS = ['Lough Craghy', 'Lough Anure', 'Lough Deele']
export const RIVER_SECTORS = ['River Dennett', 'River Quiggery']

export const CONDITIONS = [
  'Windy – Overcast',
  'Windy – Bright',
  'Still – Overcast',
  'Still – Bright',
  'Other',
]

export const LINES = [
  'Floating',
  'Midge Tip',
  'Hover',
  'Slow Inter (1ips)',
  'Fast Inter (1.5ips)',
  'DI3',
  'DI5',
  'Sweep',
  'Sink Tip',
]

export const LOUGH_METHODS = [
  'Wets, Natural or Nymphs',
  'Streamer / Lures',
  'Dry Fly',
  'Bung',
  'Washing Line',
  'Buzzer',
  'Static Sink',
]

export const RIVER_METHODS = [
  'Dry Fly',
  'Dry Dropper',
  'Double Nymph',
  'Single Nymph',
  'Downstream Wets',
  'Upstream Wets',
  'Downstream Streamer',
  'Funky Junk',
]

export const RETRIEVE_SPEEDS = ['Slow', 'Med', 'Fast', 'Static']

export const RETRIEVE_ACTIVATIONS = [
  'Short Erratic',
  'Roly Poly',
  'Jerk the Gerk',
  'Continuous',
  'Fast Pause',
  'Slow Pause',
  'Figure 8',
  'Hang',
  'Dabble',
  'Skate',
  'Static',
]

export const PLACING_OPTIONS = ['Top 3', 'Top Half', 'Bottom Half', 'Unsure']

export const REACTIONS = ['🔥', '👊', '💡', '🎣', '👌']
