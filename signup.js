import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Handle form submission
const form = document.getElementById("signup-form");
const errorMessage = document.getElementById("error-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Generate a unique username based on email and timestamp
    const timestamp = Date.now();  // Get the current timestamp
    const username = `${email.split('@')[0]}_${timestamp}`;  // Username is a combination of email's local part and timestamp

    console.log("Generated Username: ", username);  // For debugging

    // Generate a unique wallet address
    const walletAddress = "FRC" + Math.random().toString(36).substring(2, 10).toUpperCase() + timestamp.toString(36).toUpperCase();
    console.log("Generated Wallet Address: ", walletAddress);  // For debugging

    // Store user data, including the username and wallet address, in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      username: username,
      walletAddress: walletAddress,
      minedToday: 0,         // Initial mined coins today (set to 0)
      totalBalance: 0,       // Initial total balance (set to 0)
      lastMinedDate: new Date(0), // Initial date when mining starts (epoch date)
      createdAt: new Date(),    // Timestamp of account creation
    });

    // Redirect to dashboard after successful sign-up
    window.location.href = "dashboard.html";
  } catch (error) {
    // Display the error message if signup fails
    errorMessage.textContent = error.message;
    console.error("Signup error: ", error);  // Log the error to the console
  }
});