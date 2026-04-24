import { errorpage, errorPopup, confirmPopup } from "../components/componnets.js";

export function pageNotFound() {
  document.body.innerHTML = errorpage({
    code: "404",
    title: "Oops! You're lost in space.",
    message: "The page you are looking for doesn't exist or has been moved.",
    icon: "ri-map-pin-user-line",
  });
}

export function showErrorPopup(message) {
  let overlay = document.getElementById("errorPopupOverlay");
  if (!overlay) {
    // Create the popup if it doesn't exist
    document.body.insertAdjacentHTML('beforeend', errorPopup);
    overlay = document.getElementById("errorPopupOverlay");
  }
  document.getElementById("errorMessage").textContent = message;
  overlay.style.display = "flex";
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideErrorPopup();
  }, 5000);
}

export function hideErrorPopup() {
  const overlay = document.getElementById("errorPopupOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

// Confirmation popup functions
let confirmCallback = null;
export function showConfirmPopup(message, callback) {
  let overlay = document.getElementById("confirmPopupOverlay");

  if (!overlay) {
    document.body.insertAdjacentHTML("beforeend", confirmPopup);
    overlay = document.getElementById("confirmPopupOverlay");
  }

  const messageElement = document.getElementById("confirmMessage");
  if (messageElement) {
    messageElement.textContent = message;
  }

  overlay.style.display = "flex";
  confirmCallback = callback;
}
export function hideConfirmPopup() {
  const overlay = document.getElementById("confirmPopupOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

// Event handler for popup interactions
function handlePopupClick(e) {
  // Handle error popup
  const errorOverlay = document.getElementById("errorPopupOverlay");
  if (errorOverlay && errorOverlay.style.display !== "none") {
    // Close if close button or its children are clicked
    if (e.target.closest("#errorCloseBtn")) {
      hideErrorPopup();
      return;
    }
    
    // Close if clicked outside the modal (on the overlay)
    if (e.target === errorOverlay) {
      hideErrorPopup();
      return;
    }
  }
  
  // Handle confirmation popup
  const confirmOverlay = document.getElementById("confirmPopupOverlay");
  if (confirmOverlay && confirmOverlay.style.display !== "none") {
    // Close if close button or its children are clicked
    if (e.target.closest("#confirmCloseBtn")) {
      const callback = confirmCallback;
      hideConfirmPopup();
      confirmCallback = null;
      if (callback) callback(false);
      return;
    }
    
    // Handle yes button
    if (e.target.closest("#confirmYesBtn")) {
      const callback = confirmCallback;
      hideConfirmPopup();
      confirmCallback = null;
      if (callback) callback(true);
      return;
    }
    
    // Handle no button
    if (e.target.closest("#confirmNoBtn")) {
      const callback = confirmCallback;
      hideConfirmPopup();
      confirmCallback = null;
      if (callback) callback(false);
      return;
    }
    
    // Close if clicked outside the modal (on the overlay)
    if (e.target === confirmOverlay) {
      const callback = confirmCallback;
      hideConfirmPopup();
      confirmCallback = null;
      if (callback) callback(false);
      return;
    }
  }
}

// Attach event listener to document for popup interactions
document.addEventListener("click", handlePopupClick);
