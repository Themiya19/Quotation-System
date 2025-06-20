type EventCallback = () => void;

const events = {
  subscribers: new Map<string, Set<EventCallback>>(),

  subscribe(event: string, callback: EventCallback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)?.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  },

  emit(event: string) {
    this.subscribers.get(event)?.forEach(callback => callback());
  }
};

export const eventBus = events; 