
import * as navigate from "../navigation/Navigation.js"
import * as components from "../components/componnets.js"
export function ShowMessagesPage(){
let rightSidebar = document.getElementsByClassName("right-sidebar")[0]
if (!rightSidebar){
    navigation.navigate('/')
    return
}
rightSidebar.classList.add("visible")
navigate.setActiveNav("/messages")
rightSidebar.innerHTML =components.chatstatic

//hna add fetch users w fetsh messages 


}