import * as ReactionModel from "../models/ReactionModel.js";
import * as HomeView from "../views/HomeView.js";



// gheda an9ad blan dyal when i like togle dislike and l3aks
let reactionLoading = false;

export async function handleReaction(postId, type) {
  if (reactionLoading) return; 
  reactionLoading = true;

  const result = HomeView.toggleReactionActive(postId, type);
  if (!result) {
    reactionLoading = false;
    return;
  }

  const { wasActive, oppositeWasActive } = result;

  HomeView.updateReactionCounts(
    postId,
    wasActive,
    oppositeWasActive,
    type
  );

  try {
    await ReactionModel.sendReaction(postId, type);
  } catch (err) {
    HomeView.toggleReactionActive(postId, type);

    HomeView.updateReactionCounts(
      postId,
      !wasActive,
      oppositeWasActive,
      type
    );
  }

  reactionLoading = false;
}

export async function loadCountsForPost(postId) {
  try {
    const counts = await ReactionModel.fetchReactionCounts(postId);
    HomeView.updateAllReactionCounts(postId, counts);
  } catch (err) {
    alert(err.message || "Failed to load reaction counts");
  }
}


// Action map used by the event listener in HomeController
export const actionMap = {
  like: (postId) => handleReaction(postId, "like"),
  dislike: (postId) => handleReaction(postId, "dislike"),
  save: (postId) => handleReaction(postId, "save"),
};
