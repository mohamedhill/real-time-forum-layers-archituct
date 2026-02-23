/* import *  as helpers from '../helpers/helpers.js'



export const actionMap = {
  like: async (postID) => react(postID, 'like'),
  dislike: async (postID) => react(postID, 'dislike'),
  save: async (postID) => react(postID, 'save')
};


async function react(postID, type) {
  
    try {
  
    helpers.updateUI(postID, type);

    const res = await fetch("/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: postID, type })
   
    });

    if (!res.ok) throw new Error("Failed request");



  } catch (err) {
      console.log(JSON.stringify({ postId: postID, type }));

 
    helpers.rollbackUI(postID, type);
  }
} */