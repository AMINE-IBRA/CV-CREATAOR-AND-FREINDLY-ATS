// Only immutable database IDs configured on the server can access owner tools.
// A public email address is never sufficient to become an owner.
export function isOwner(userId: string) {
  return (process.env.OWNER_USER_IDS || '').split(',').map(v => v.trim()).filter(Boolean).includes(userId);
}
