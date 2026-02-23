import * as ReactionModel from "../models/ReactionModel.js";
import * as HomeView from "../views/HomeView.js";



// gheda an9ad blan dyal when i like togle dislike and l3aks
export async function handleReaction(postId, type) {
  // Optimistic UI update
  console.log(type);
  
  let bool = HomeView.toggleReactionActive(postId, type);
  //await _syncCounts(postId, type, +1);
 
  
  HomeView.updateReactionCounts(postId,bool,type)
  try {
    await ReactionModel.sendReaction(postId, type);
  } catch {
    // Rollback on failure
    ;
    
     HomeView.updateReactionCounts(postId, !bool, type);
    HomeView.removeReactionActive(postId, type);
    
    
    //await _syncCounts(postId, type, -1);
  }
}

export async function loadCountsForPost(postId) {
  try {
    const counts = await ReactionModel.fetchReactionCounts(postId);
    HomeView.updateAllReactionCounts(postId, counts);
  } catch (err) {
    console.error("Failed to load reaction counts:", err);
  }
}


// Action map used by the event listener in HomeController
export const actionMap = {
  like: (postId) => handleReaction(postId, "like"),
  dislike: (postId) => handleReaction(postId, "dislike"),
  save: (postId) => handleReaction(postId, "save"),
};
