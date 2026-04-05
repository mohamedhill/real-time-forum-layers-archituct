import * as HomeView from "../views/HomeView.js";
import * as navigate from "../navigation/Navigation.js";
import * as ProfileModel from "../models/ProfileModel.js";
import { initializeHomeShell } from "./HomeController.js";
import * as MessagesController from "./MessagesController.js";
import * as PostController from "./PostController.js";

export async function showProfilePage() {
  initializeHomeShell("/profile");
  navigate.setActiveNav("/profile");
  MessagesController.initializeOnlineUsers();

  try {
    const profile = await ProfileModel.getProfileSummary();
    HomeView.renderProfileSummary(profile);
    PostController.hydratePostInteractions(profile.posts);
  } catch (error) {
    HomeView.renderProfileError(error?.message || "Failed to load profile");
  }
}
