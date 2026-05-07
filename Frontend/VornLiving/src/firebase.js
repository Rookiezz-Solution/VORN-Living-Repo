// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDo6EdZqccAQV6uesiZACOF_6kamcZqlhA",
  authDomain: "vornliving.firebaseapp.com",
  projectId: "vornliving",
  storageBucket: "vornliving.firebasestorage.app",
  messagingSenderId: "646028580229",
  appId: "1:646028580229:web:cb4b7d0fb8b7fb12eea0ec",
  measurementId: "G-FVYWN5TJ75"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
