import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBoPvstiWvt2FmkPdAUfPGKVeMcTiPjLSM",
  authDomain: "fricoinia-fridomia.firebaseapp.com",
  projectId: "fricoinia-fridomia",
  storageBucket: "fricoinia-fridomia.firebasestorage.app",
  messagingSenderId: "931776573524",
  appId: "1:931776573524:web:c570f01092d227d4113dc1",
  measurementId: "G-2Q1PSBZGDY"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize user and mining logic
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  // Create default wallet if missing
  if (!snapshot.exists()) {
    await setDoc(userRef, {
      email: user.email,
      totalBalance: 0,
      minedToday: 0,
      lastMinedDate: new Date().toISOString()
    });
  }

  // Reload user info
  const userData = (await getDoc(userRef)).data();
  let minedToday = userData.minedToday || 0;
  let totalBalance = userData.totalBalance || 0;
  let lastMinedDate = new Date(userData.lastMinedDate);
  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Reset daily mined if date changed
  if (lastMinedDate.toDateString() !== currentDate.toDateString()) {
    minedToday = 0;
    await updateDoc(userRef, {
      minedToday: 0,
      lastMinedDate: currentDate.toISOString()
    });
  }

  const balanceEl = document.getElementById("coin-balance");
  const statusEl = document.getElementById("mining-status");
  const logEl = document.getElementById("mining-log");

  balanceEl.textContent = totalBalance.toFixed(9);
  statusEl.textContent = `Mined Today: ${minedToday.toFixed(9)} FRC`;

  let miningInterval = null;  // Declare mining interval variable

  // Start mining on button click
  document.getElementById("start-mining").addEventListener("click", () => {
    if (miningInterval) return;  // Prevent multiple intervals from being set

    statusEl.textContent = "Mining in progress...";  // Change status when mining starts

    miningInterval = setInterval(async () => {
      // Simulate mining with a random reward (between 0.000001 and 0.000005 FRC)
      const reward = parseFloat((Math.random() * 0.000005 + 0.000001).toFixed(9));

      // Check if the daily limit has been reached
      if (minedToday + reward > 15) {
        clearInterval(miningInterval);  // Stop mining if the limit is reached
        miningInterval = null;
        statusEl.textContent = "Daily mining limit reached. Try again tomorrow.";
        return;
      }

      minedToday += reward;  // Update mined balance
      totalBalance += reward;  // Update total balance

      // Update Firestore with new balances
      await updateDoc(userRef, {
        minedToday,
        totalBalance,
        lastMinedDate: currentDate.toISOString()
      });

      // Update UI
      balanceEl.textContent = totalBalance.toFixed(9);
      statusEl.textContent = `Mined Today: ${minedToday.toFixed(9)} FRC`;

      // Log mining event in the UI
      const li = document.createElement("li");
      li.textContent = `${new Date().toLocaleTimeString()}: +${reward.toFixed(9)} FRC`;
      logEl.prepend(li);

    }, 10000);  // Simulate mining every 10 seconds
  });

  // Logout handler
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
});