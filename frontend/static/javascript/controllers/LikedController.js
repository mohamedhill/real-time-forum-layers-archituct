import * as PostController from "../controllers/PostController.js";
import * as navigate from "../navigation/Navigation.js"
import * as MessagesController from "./MessagesController.js"



export function getlikedpost(){
    MessagesController.resetMessagesViewState()

    const container = document.getElementById("posts-container")

    if (!container){
    navigation.navigate('/')
    return
}
navigate.setActiveNav("/likedpost")
PostController.loadlikedposts()


}
