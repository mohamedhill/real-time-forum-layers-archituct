import * as PostController from "../controllers/PostController.js";
import * as navigate from "../navigation/Navigation.js"



export function getlikedpost(){
    
    const container = document.getElementById("posts-container")
   
    if (!container){
    navigation.navigate('/')
    return
}
navigate.setActiveNav("/likedpost")
PostController.loadlikedposts()


}