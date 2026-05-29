import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'success' | 'warning' | 'info' = 'info'
) {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      userId: userId.toLowerCase(),
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
