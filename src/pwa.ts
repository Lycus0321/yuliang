import { Platform } from 'react-native';

let pendingReload = false;
let reloading = false;
const busySources = new Set<string>();

function isBusy() {
  return busySources.size > 0;
}

export function setAppBusy(source: string, busy: boolean) {
  if (typeof document === 'undefined') return;
  if (busy) {
    busySources.add(source);
    document.body.dataset.yuliangBusy = '1';
    return;
  }
  busySources.delete(source);
  if (busySources.size > 0) return;
  delete document.body.dataset.yuliangBusy;
  window.dispatchEvent(new Event('yuliang-idle'));
}

function reloadWhenIdle() {
  if (reloading) return;
  if (isBusy()) {
    pendingReload = true;
    return;
  }
  reloading = true;
  window.location.reload();
}

export function registerServiceWorker() {
  if (__DEV__) return;
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('yuliang-idle', () => {
    if (pendingReload) reloadWhenIdle();
  });

  const start = () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              reloadWhenIdle();
            }
          });
        });
      })
      .catch(() => {
        // The online application remains usable without offline caching.
      });
  };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  navigator.serviceWorker.addEventListener('controllerchange', reloadWhenIdle);
}
