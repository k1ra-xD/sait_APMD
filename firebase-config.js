// Инициализация Firebase (только если еще не инициализирован)
window.database = window.database || null;
window.isFirebaseEnabled = window.isFirebaseEnabled || false;

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    try {
        firebase.initializeApp({
            apiKey: "AIzaSyAZ8dIa7Ex2i3YFXEWiNekAZ27xOQVFvDE",
            authDomain: "bal-voting.firebaseapp.com",
            databaseURL: "https://bal-voting-default-rtdb.firebaseio.com",
            projectId: "bal-voting",
            storageBucket: "bal-voting.firebasestorage.app",
            messagingSenderId: "164009414394",
            appId: "1:164009414394:web:36e9a8a8c1515fa9450343"
        });
        window.database = firebase.database();
        window.isFirebaseEnabled = true;
        console.log('✅ Firebase подключен и готов к работе');
    } catch (error) {
        console.log('⚠️ Firebase недоступен:', error);
        window.isFirebaseEnabled = false;
    }
} else if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    // Firebase уже инициализирован
    window.database = firebase.database();
    window.isFirebaseEnabled = true;
    console.log('✅ Firebase уже подключен');
}
