import { api } from './api';
import { isInstalledApp } from './device';

export type PushSupport = 'ok' | 'unsupported' | 'needs-install';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** En iPhone/iPad el push solo existe dentro de la app instalada en la pantalla de inicio. */
export function pushSupport(): PushSupport {
  const hasApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (hasApi) return 'ok';
  if (isIOS() && !isInstalledApp()) return 'needs-install';
  return 'unsupported';
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('No se pudo registrar el service worker', err));
  });
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register('/sw.js');
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok') return null;
  const reg = await registration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Pide permiso, suscribe este navegador y lo registra en el servidor. Debe llamarse desde un toque. */
export async function enablePush(vapidPublicKey: string) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'Bloqueaste las notificaciones. Actívalas en los ajustes del navegador.' : 'No se otorgó el permiso.');
  }
  const reg = await registration();
  if (!reg) throw new Error('Este navegador no permite notificaciones.');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) });
  }
  await api('/notifications/subscriptions', { body: sub.toJSON() });
  return sub;
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await api('/notifications/subscriptions', { method: 'DELETE', body: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}

/** Número en el ícono de la app instalada (donde el sistema lo permita). */
export function setAppBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) nav.setAppBadge?.(count)?.catch(() => {});
    else nav.clearAppBadge?.()?.catch(() => {});
  } catch {
    /* no soportado */
  }
}
