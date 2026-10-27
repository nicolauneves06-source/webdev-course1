export function getSessionToken(request) {
  const cookieHeader = request.headers.cookie ?? '';

  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== 'session') {
      continue;
    }

    return item.slice(separator + 1).trim();
  }

  return null;
}