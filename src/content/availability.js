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
  // QStash's plan caps scheduled-message delay at 7 days, and the day-of /
  // T-minus-30 reminder emails are scheduled via QStash at booking time —
  // going higher breaks booking for any slot past that horizon.
  bookingWindowDays: 7,
}
