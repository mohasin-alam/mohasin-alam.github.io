importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js');

// আপনার Firebase Config এখানে আবার দিন
const firebaseConfig = {
    apiKey: "AIzaSyCWIWiPV6AzLMdqAWHsyJGpi1wptaIV9N8",
    authDomain: "my-github-site.firebaseapp.com",
    projectId: "my-github-site",
    storageBucket: "my-github-site.firebasestorage.app",
    messagingSenderId: "673354768242",
    appId: "1:673354768242:web:8de902cecba76574cec7eb"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging
const messaging = firebase.messaging();

// ব্যাকগ্রাউন্ডে নোটিফিকেশন হ্যান্ডেল করার জন্য
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png' // আপনার সাইটের লোগো থাকলে এখানে তার লিঙ্ক দিন
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
