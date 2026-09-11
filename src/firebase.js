import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAxISRDzuxXs-xQn63FILe0eV4P0QSgzOs",
  authDomain: "habbit-tracker-c02d1.firebaseapp.com",
  projectId: "habbit-tracker-c02d1",
  storageBucket: "habbit-tracker-c02d1.firebasestorage.app",
  messagingSenderId: "533983722277",
  appId: "1:533983722277:web:4aee9f14d5cf3044d6f8cc",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;