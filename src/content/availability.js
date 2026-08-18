/**
 * Single source of truth for the booking calendar's bookable window — read by
 * both the API (api/_lib/slots.js) and, if useful for copy, the frontend.
 * Change hours in exactly one place.
 */
export const availability = {
  timezone: 'America/Los_Angeles',
  // 0 = Sunday … 6 = Saturday (JS Date convention)
  weekdays: [1, 2, 3, 4, 5],
  startHour: 17, // 5pm local
  endHour: 21, // 9pm local
  slotMinutes: 30,
  bookingWindowDays: 30, // how far out a visitor can book
}
