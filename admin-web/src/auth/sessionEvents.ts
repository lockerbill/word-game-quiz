export type AuthFailureReason = 'expired' | 'forbidden';

type AuthFailureListener = (reason: AuthFailureReason) => void;

const authFailureListeners = new Set<AuthFailureListener>();

export function subscribeAuthFailure(
  listener: AuthFailureListener,
): () => void {
  authFailureListeners.add(listener);

  return () => {
    authFailureListeners.delete(listener);
  };
}

export function notifyAuthFailure(reason: AuthFailureReason): void {
  authFailureListeners.forEach((listener) => {
    listener(reason);
  });
}
