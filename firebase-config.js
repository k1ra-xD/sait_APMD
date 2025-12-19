// Инициализация Firebase (только если еще не инициализирован)
let database = null;
let isFirebaseEnabled = false;

if (!firebase.apps.length) {
    // Firebase конфигурация
    const firebaseConfig = {
        apiKey: "AIzaSyAZ8dIa7Ex2i3YFXEWiNekAZ27xOQVFvDE",
        authDomain: "bal-voting.firebaseapp.com",
        databaseURL: "https://bal-voting-default-rtdb.firebaseio.com",
        projectId: "bal-voting",
        storageBucket: "bal-voting.firebasestorage.app",
        messagingSenderId: "164009414394",
        appId: "1:164009414394:web:36e9a8a8c1515fa9450343"
    };

    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        isFirebaseEnabled = true;
        console.log('✅ Firebase подключен и готов к работе');
    } catch (error) {
        console.log('⚠️ Firebase недоступен:', error);
        isFirebaseEnabled = false;
    }
} else {
    // Firebase уже инициализирован
    database = firebase.database();
    isFirebaseEnabled = true;
    console.log('✅ Firebase уже подключен');
}
