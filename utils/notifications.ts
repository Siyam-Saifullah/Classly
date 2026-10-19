import { Platform } from 'react-native';
import { getSettings } from '@/database/settings';
import Constants from 'expo-constants';

let Notifications: any = null;
try {
  if (Constants.appOwnership !== 'expo') {
    Notifications = require('expo-notifications');
  }
} catch (e) {
  console.log('expo-notifications not available');
}

// Configure how notifications behave when app is in foreground
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermissions() {
  if (!Notifications) return false;
  const settings = await getSettings();
  if (!settings?.notificationsEnabled) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  return finalStatus === 'granted';
}

export async function scheduleClassReminder(
  id: string,
  className: string,
  room: string | undefined,
  startTime: string,
  dateStr: string,
  minutesBefore: number
) {
  if (!Notifications) return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Calculate trigger time
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, mins] = startTime.split(':').map(Number);
  
  const triggerDate = new Date(year, month - 1, day, hours, mins);
  triggerDate.setMinutes(triggerDate.getMinutes() - minutesBefore);

  if (triggerDate.getTime() <= Date.now()) return; // Past

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming Class 📚',
      body: `${className} starts at ${startTime}${room ? ` in Room ${room}` : ''}.`,
      data: { classId: id },
    },
    trigger: {
      type: Notifications.SchedulingStrategy.DATE,
      date: triggerDate,
    },
  });
}

export async function scheduleEventReminder(
  id: string,
  title: string,
  type: string,
  dateStr: string,
  timeStr: string | undefined,
  hoursBefore: number
) {
  if (!Notifications) return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const [year, month, day] = dateStr.split('-').map(Number);
  let triggerDate = new Date(year, month - 1, day, 9, 0); // Default 9 AM if no time
  
  if (timeStr) {
    const [hours, mins] = timeStr.split(':').map(Number);
    triggerDate = new Date(year, month - 1, day, hours, mins);
  }

  triggerDate.setHours(triggerDate.getHours() - hoursBefore);

  if (triggerDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Upcoming ${type.toUpperCase()} ⏰`,
      body: `${title} is scheduled for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.`,
      data: { eventId: id },
    },
    trigger: {
      type: Notifications.SchedulingStrategy.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelAllScheduledNotifications() {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
