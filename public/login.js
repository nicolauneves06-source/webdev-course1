const form = document.querySelector('#login-form');
const message = document.querySelector('#form-message');
const submitButton = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  submitButton.disabled = true;
  submitButton.textContent = 'Signing in...';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json();

    if (!response.ok) {
      message.textContent = result.message ?? 'Sign-in failed. Please try again.';
      message.dataset.state = 'error';
      return;
    }

    window.location.assign('/bookings');
  } catch {
    message.textContent = 'Could not reach the server. Please try again.';
    message.dataset.state = 'error';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Sign in';
  }
});