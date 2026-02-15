import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

const getEnv = (key) => (window.ENV && window.ENV[key]) || import.meta.env[key];

const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID')
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const loginWithGoogleCredential = async (idToken) => {
    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(auth, credential);
};

export const saveScan = async (userId, imageBase64, scanData) => {
    const timestamp = Date.now();
    const imageRef = ref(storage, `scans/${userId}/${timestamp}.jpg`);
    
    await uploadString(imageRef, imageBase64, 'base64');
    const imageUrl = await getDownloadURL(imageRef);
    
    const docRef = await addDoc(collection(db, 'scans'), {
        userId,
        timestamp,
        imageUrl,
        data: scanData,
    });
    
    return docRef.id;
};

export const getScanHistory = async (userId) => {
    const q = query(
        collection(db, 'scans'),
        where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return docs.sort((a, b) => b.timestamp - a.timestamp);
};

export const deleteScan = async (userId, scanId, timestamp) => {
    // Note: robust apps would save the storage path on the document.
    // Based on saveScan structure, the path is scans/userId/timestamp.jpg
    const docRef = doc(db, 'scans', scanId);
    await deleteDoc(docRef);

    try {
        const imageRef = ref(storage, `scans/${userId}/${timestamp}.jpg`);
        await deleteObject(imageRef);
    } catch (e) {
        console.error("Failed to delete image from storage:", e);
    }
};
