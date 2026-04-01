import { errorpage } from "../components/componnets.js";

export function pageNotFound() {
  document.body.innerHTML = errorpage({
    code: "404",
    title: "Oops! You're lost in space.",
    message: "The page you are looking for doesn't exist or has been moved.",
    icon: "ri-map-pin-user-line",
  });
}
