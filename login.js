import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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
getAnalytics(app);
const auth = getAuth(app);

// Form elements
const form = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const resetMessage = document.getElementById("reset-message");
const loginButton = form.querySelector("button");
const forgotPasswordLink = document.getElementById("forgot-password-link");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem("fricoiniaUser", JSON.stringify(userCredential.user));
    window.location.href = "dashboard.html";
  } catch (error) {
    errorMessage.textContent = "Login failed: " + error.message;
    loginButton.disabled = false;
    loginButton.textContent = "Log In";
  }
});

// Handle password reset
forgotPasswordLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();

  if (!email) {
    errorMessage.textContent = "Please enter your email to reset password.";
    resetMessage.textContent = "";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    resetMessage.textContent = "Password reset email sent. Check your inbox.";
    errorMessage.textContent = "";
  } catch (error) {
    errorMessage.textContent = "Error: " + error.message;
    resetMessage.textContent = "";
  }
});