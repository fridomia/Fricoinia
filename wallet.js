import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc, setDoc,
  collection, addDoc, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBoPvstiWvt2FmkPdAUfPGKVeMcTiPjLSM",
  authDomain: "fricoinia-fridomia.firebaseapp.com",
  projectId: "fricoinia-fridomia",
  storageBucket: "fricoinia-fridomia.appspot.com",
  messagingSenderId: "931776573524",
  appId: "1:931776573524:web:c570f01092d227d4113dc1",
  measurementId: "G-2Q1PSBZGDY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const reserveUID = "uX56YTM7ELb7tejkWSImpQo6srl1";
const monthlyMintAmount = 300_000_000;

const fetchDogecoinPrice = async () => {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=dogecoin&vs_currencies=usd");
    const data = await res.json();
    return data.dogecoin.usd;
  } catch (e) {
    console.error("DOGE price fetch failed:", e);
    return 0;
  }
};

const updateFricoinPrice = async () => {
  const doge = await fetchDogecoinPrice();
  const price = doge * 10;
  const el = document.getElementById("fricoin-price");
  if (el) el.textContent = `Fricoinia Price: ${price.toFixed(4)} USD`;
};

const mintCoinsToReserve = async () => {
  const mintSettingsRef = doc(db, "system", "minting");
  const settingsSnap = await getDoc(mintSettingsRef);
  const now = new Date();
  let shouldMint = true;

  if (settingsSnap.exists()) {
    const lastMint = new Date(settingsSnap.data().lastMint);
    const daysSince = (now - lastMint) / (1000 * 60 * 60 * 24);
    shouldMint = daysSince >= 30;
  }

  if (!shouldMint) return;

  const ref = doc(db, "users", reserveUID);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const current = snap.data().totalBalance || 0;
  const updated = current + monthlyMintAmount;

  await updateDoc(ref, { totalBalance: updated });

  await addDoc(collection(db, "users", reserveUID, "transactions"), {
    type: "Mint",
    amount: monthlyMintAmount,
    recipient: reserveUID,
    timestamp: now.toISOString()
  });

  await setDoc(mintSettingsRef, { lastMint: now.toISOString() });

  const log = document.getElementById("mint-log");
  if (log) log.textContent = `Minted ${monthlyMintAmount} FRC to reserve UID ${reserveUID}`;
};

async function generateUniqueWalletAddress() {
  let address;
  let exists = true;

  while (exists) {
    address = 'FRC-' + Math.random().toString(36).substr(2, 9);
    const q = query(collection(db, "users"), where("walletAddress", "==", address));
    const snap = await getDocs(q);
    exists = !snap.empty;
  }

  return address;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  const uid = user.uid;
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      walletAddress: await generateUniqueWalletAddress(),
      totalBalance: 0,
      minedToday: 0,
      lastMinedDate: new Date().toISOString()
    });
  }

  const userData = (await getDoc(userRef)).data();
  let { totalBalance = 0, walletAddress = "No address" } = userData;

  document.getElementById("coin-balance").textContent = totalBalance.toFixed(9);
  document.getElementById("wallet-address").textContent = walletAddress;

  const historyEl = document.getElementById("history-list");
  historyEl.innerHTML = "";
  const txSnap = await getDocs(collection(db, "users", uid, "transactions"));
  txSnap.docs.forEach(doc => {
    const tx = doc.data();
    const li = document.createElement("li");
    li.textContent = `${tx.type} ${tx.amount.toFixed(9)} FRC | ${new Date(tx.timestamp).toLocaleString()}`;
    historyEl.appendChild(li);
  });

  const sendForm = document.getElementById("send-form");
  const errorBox = document.createElement("p");
  errorBox.id = "transaction-error";
  errorBox.style.color = "red";
  sendForm.appendChild(errorBox);

  sendForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const sendBtn = sendForm.querySelector("button");
    sendBtn.disabled = true;

    try {
      const recipientWallet = document.getElementById("recipient").value.trim();
      const amount = parseFloat(document.getElementById("amount").value.trim());

      if (!recipientWallet || isNaN(amount) || amount < 0.0001) {
        errorBox.textContent = "Error: Minimum transaction is 0.0001 FRC.";
        return;
      }

      if (amount > totalBalance) {
        errorBox.textContent = "Error: Insufficient balance.";
        return;
      }

      const q = query(collection(db, "users"), where("walletAddress", "==", recipientWallet));
      const result = await getDocs(q);
      if (result.empty) {
        errorBox.textContent = "Error: Recipient wallet not found.";
        return;
      }

      const recipientDoc = result.docs[0];
      const recipientRef = recipientDoc.ref;
      const recipientUID = recipientDoc.id;
      const recipientData = recipientDoc.data();

      const fee = amount * 0.13;
      const netAmount = amount - fee;
      const timestamp = new Date().toISOString();

      totalBalance -= amount;
      await updateDoc(userRef, { totalBalance });

      await addDoc(collection(db, "users", uid, "transactions"), {
        type: "Sent", amount: netAmount, recipient: recipientWallet, timestamp
      });

      await addDoc(collection(db, "users", reserveUID, "transactions"), {
        type: "Fee", amount: fee, sender: uid, timestamp
      });

      // FIX: Add fee to reserve wallet balance
      const reserveRef = doc(db, "users", reserveUID);
      const reserveSnap = await getDoc(reserveRef);
      if (reserveSnap.exists()) {
        const reserveBalance = reserveSnap.data().totalBalance || 0;
        await updateDoc(reserveRef, { totalBalance: reserveBalance + fee });
      }

      const recipientNewBalance = (recipientData.totalBalance || 0) + netAmount;
      await updateDoc(recipientRef, { totalBalance: recipientNewBalance });

      await addDoc(collection(db, "users", recipientUID, "transactions"), {
        type: "Received", amount: netAmount, sender: walletAddress, timestamp
      });

      document.getElementById("coin-balance").textContent = totalBalance.toFixed(9);
      errorBox.textContent = "";
      alert(`Sent ${netAmount.toFixed(9)} FRC to ${recipientWallet} (Fee: ${fee.toFixed(9)} FRC)`);
    } catch (err) {
      console.error("Transaction error:", err);
      errorBox.textContent = "Transaction failed. Please try again.";
    } finally {
      sendBtn.disabled = false;
    }
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
});

// Price & Mint Start
updateFricoinPrice();
setInterval(updateFricoinPrice, 60000);
mintCoinsToReserve();

// Fee preview handler
const amountInput = document.getElementById("amount");
amountInput.addEventListener("input", () => {
  const amount = parseFloat(amountInput.value);
  if (isNaN(amount) || amount <= 0) {
    document.getElementById("fee-preview").textContent = "0";
    document.getElementById("after-fee").textContent = "0";
    return;
  }
  const fee = amount * 0.7;
  const afterFee = amount - fee;
  document.getElementById("fee-preview").textContent = fee.toFixed(9);
  document.getElementById("after-fee").textContent = afterFee.toFixed(9);
});