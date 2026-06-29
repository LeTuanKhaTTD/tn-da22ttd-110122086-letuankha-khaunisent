/**
 * @typedef {Object} ToastPayload
 * @property {'success'|'error'|'info'} type
 * @property {string} message
 */

/**
 * Dispatch a toast event for the ToastHost component.
 * @param {ToastPayload['type']} type
 * @param {string} message
 */
export function toast(type, message) {
  window.dispatchEvent(new CustomEvent('toast', { detail: { type, message } }));
}

/**
 * @param {string} message
 */
export function toastSuccess(message) {
  toast('success', message);
}

/**
 * @param {string} message
 */
export function toastError(message) {
  toast('error', message);
}

/**
 * @param {string} message
 */
export function toastInfo(message) {
  toast('info', message);
}
