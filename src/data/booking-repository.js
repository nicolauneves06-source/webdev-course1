export function createBookingRepository(database) {
  return {
    findByUserId(userId) {
      return database.prepare(
        `SELECT id, lab_name, starts_at, ends_at, purpose
         FROM bookings
         WHERE user_id = ?
         ORDER BY starts_at, id`
      ).all(userId).map((booking) => ({
        id: booking.id,
        labName: booking.lab_name,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        purpose: booking.purpose,
      }));
    },
  };
}