import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// [콘솔에서 복사한 원장님의 실제 키값으로 덮어쓰기 하십시오]
const firebaseConfig = {
    apiKey: "AIzaSyDqvH5DigZ8Q4jvZCQLFm2bYTRKVg5Wsq8",
    authDomain: "mediinfo-searcher.firebaseapp.com",
    projectId: "mediinfo-searcher",
    storageBucket: "mediinfo-searcher.firebasestorage.app",
    messagingSenderId: "872393763133",
    appId: "1:872393763133:web:19a1c509433d80a3293d54"
};

// Firebase 초기화 및 Firestore DB 객체 내보내기
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);