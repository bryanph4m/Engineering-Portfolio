// Runnable self-check for the branchy logic in slots.js — working hours
// intersected with freebusy exclusion and past/window filtering.
// Run with: node api/_lib/slots.selfcheck.mjs
import assert from 'node:assert'
import { slotsForDate } from './slots.js'
import { zonedTimeToUtc } from './tz.js'
import { availability } from '../../src/content/availability.js'

// A known Monday and a known Saturday, far enough in the future to dodge DST
// edge cases at "now".
const MONDAY = '2027-03-01'
const SATURDAY = '2027-03-06'
const now = zonedTimeToUtc(2027, 2, 26, 0, 0, availability.timezone) // 3 days before, within the 7-day booking window

// Weekday with no busy intervals: one slot per 30 minutes across the window.
const openSlots = slotsForDate(MONDAY, [], now)
const expectedCount = ((availability.endHour - availability.startHour) * 60) / availability.slotMinutes
assert.strictEqual(openSlots.length, expectedCount, `expected ${expectedCount} open slots, got ${openSlots.length}`)

// Weekend: no slots at all, regardless of hours.
assert.strictEqual(slotsForDate(SATURDAY, [], now).length, 0, 'Saturday must have zero slots')

// A busy interval covering exactly the first slot excludes only that slot.
const first = openSlots[0]
const busy = [{ start: first, end: new Date(first.getTime() + availability.slotMinutes * 60000) }]
const withBusy = slotsForDate(MONDAY, busy, now)
assert.strictEqual(withBusy.length, expectedCount - 1, 'one busy slot should exclude exactly one slot')
assert.ok(!withBusy.some((s) => s.getTime() === first.getTime()), 'the busy slot itself must not appear')

// A slot already in the past is excluded even with no busy intervals.
const past = slotsForDate(MONDAY, [], new Date(first.getTime() + 3600000))
assert.ok(!past.some((s) => s.getTime() === first.getTime()), 'a past slot must not appear')

console.log('slots.selfcheck: all assertions passed')
