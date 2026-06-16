/** Attempts after which a queue item is marked blocked (kept, not discarded). */
export const SYNC_BLOCK_AFTER_ATTEMPTS = 5;

export const countQueueStates = (queue) => {
  let pending = 0;
  let blocked = 0;
  for (const item of queue) {
    if (item.blocked) blocked += 1;
    else pending += 1;
  }
  return { pending, blocked, total: queue.length };
};
