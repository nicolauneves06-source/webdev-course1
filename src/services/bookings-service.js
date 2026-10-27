export function createBookingsService(repository) {
  return {
    listForUser(userId) {
      if (typeof userId !== 'string' || userId.length === 0) {
        return [];
      }

      return repository.findByUserId(userId);
    },
  };
}