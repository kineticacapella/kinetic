
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
	apiKey: 'YOUR_API_KEY',
	authDomain: 'YOUR_AUTH_DOMAIN',
	projectId: 'YOUR_PROJECT_ID',
	storageBucket: 'YOUR_STORAGE_BUCKET',
	messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
	appId: 'YOUR_APP_ID'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error: any) {
        console.error("Error signing in with Google:", error.message);
        // You might want to update an error store here
    }
}

export async function signOutUser() {
    try {
        await signOut(auth);
    } catch (error: any) {
        console.error("Error signing out:", error.message);
        // You might want to update an error store here
    }
}
