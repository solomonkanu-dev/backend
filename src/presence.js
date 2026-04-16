/**
 * In-memory presence store.
 * Imported by socket.js (writes) and the controller (reads).
 * No other dependencies — safe to import anywhere.
 */

// socketId → { userId, role, fullName, institute: { _id, name } | null, connectedAt }
const onlineUsers = new Map();

export function addUser(socketId, data) {
  onlineUsers.set(socketId, data);
}

export function removeUser(socketId) {
  onlineUsers.delete(socketId);
}

export function getOnlineSnapshot() {
  const counts = { student: 0, lecturer: 0, parent: 0, admin: 0 };
  const admins = [];

  for (const entry of onlineUsers.values()) {
    const { role } = entry;
    if (role === 'student')       counts.student++;
    else if (role === 'lecturer') counts.lecturer++;
    else if (role === 'parent')   counts.parent++;
    else if (role === 'admin')    counts.admin++;

    if (role === 'admin') {
      admins.push({
        userId:      String(entry.userId),
        fullName:    entry.fullName,
        institute:   entry.institute,
        connectedAt: entry.connectedAt,
      });
    }
  }

  return { counts, admins };
}
