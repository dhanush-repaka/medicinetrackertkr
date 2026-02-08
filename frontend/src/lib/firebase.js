import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB1nzUmNofSokTP-Vk4Duyw-WrMFJ1zFJI",
  authDomain: "medicinetracker-d82a2.firebaseapp.com",
  databaseURL: "https://medicinetracker-d82a2-default-rtdb.firebaseio.com",
  projectId: "medicinetracker-d82a2",
  storageBucket: "medicinetracker-d82a2.firebasestorage.app",
  messagingSenderId: "292925413509",
  appId: "1:292925413509:web:a1a683445cdef3af3db1ec",
  measurementId: "G-E9HLYKVZ1L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, get, onValue };
