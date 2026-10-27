const state = document.querySelector('#bookings-state');
const list = document.querySelector('#booking-list');
const count = document.querySelector('#booking-count');

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function addBooking(booking) {
  const item = document.createElement('li');
  item.className = 'booking-item';

  const date = document.createElement('p');
  date.className = 'booking-date';
  date.textContent = formatDateTime(booking.startsAt);

  const name = document.createElement('h3');
  name.className = 'booking-lab';
  name.textContent = booking.labName;

  const purpose = document.createElement('p');
  purpose.className = 'booking-purpose';
  purpose.textContent = booking.purpose;

  const time = document.createElement('p');
  time.className = 'booking-time';
  time.textContent = `${formatDateTime(booking.startsAt)} - ${formatDateTime(booking.endsAt)}`;

  item.append(date, name, purpose, time);
  list.append(item);
}

async function loadBookings() {
  try {
    const response = await fetch('/api/bookings', {
      headers: { Accept: 'application/json' },
    });

    if (response.status === 401) {
      window.location.assign('/login');
      return;
    }

    if (!response.ok) {
      throw new Error('Could not load bookings. Please try again.');
    }

    const result = await response.json();
    if (!Array.isArray(result.bookings)) {
      throw new Error('The bookings response was not valid. Please try again.');
    }

    if (result.bookings.length === 0) {
      state.textContent = 'You have no bookings yet.';
      state.dataset.state = 'empty';
    } else {
      result.bookings.forEach(addBooking);
      state.hidden = true;
      list.hidden = false;
      count.textContent = `${result.bookings.length} ${result.bookings.length === 1 ? 'booking' : 'bookings'}`;
    }
  } catch (error) {
    state.textContent = error instanceof Error
      ? error.message
      : 'Could not load bookings. Please try again.';
    state.dataset.state = 'error';
  } finally {
    state.setAttribute('aria-busy', 'false');
  }
}

loadBookings();