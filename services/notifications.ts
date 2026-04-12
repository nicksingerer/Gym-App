import { Platform } from 'react-native';

const TIMER_NOTIFICATION_ID = 'gym-timer-done';
const CATEGORY_ID = 'TIMER_DONE';

let Notifications: typeof import('expo-notifications') | null = null;

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch {}
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupNotificationCategory(): Promise<void> {
  if (!Notifications) return;
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    {
      identifier: 'NEXT_SET',
      buttonTitle: 'Nachster Satz',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'FINISH',
      buttonTitle: 'Beenden',
      options: { opensAppToForeground: true, isDestructive: false },
    },
  ]);
}

export async function scheduleTimerNotification(seconds: number): Promise<void> {
  if (!Notifications) return;

  await cancelTimerNotification();

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await setupNotificationCategory();

  await Notifications.scheduleNotificationAsync({
    identifier: TIMER_NOTIFICATION_ID,
    content: {
      title: 'Pause vorbei!',
      body: 'Bereit fur den nachsten Satz?',
      categoryIdentifier: CATEGORY_ID,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}

export async function cancelTimerNotification(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(TIMER_NOTIFICATION_ID);
  } catch {}
}

export function addNotificationResponseListener(
  onNextSet: () => void,
  onFinish: () => void
): (() => void) {
  if (!Notifications) return () => {};

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const action = response.actionIdentifier;
    if (action === 'NEXT_SET') {
      onNextSet();
    } else if (action === 'FINISH') {
      onFinish();
    } else if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      onNextSet();
    }
  });

  return () => sub.remove();
}

export function setNotificationHandler(): void {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
