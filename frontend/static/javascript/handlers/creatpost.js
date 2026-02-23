/* import * as helper from "../helpers/helpers.js"


export async function  creathandler(){
    const form = document.getElementById('postForm')
    
    
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    document.getElementById('post-title').value="";
   document.getElementById('post-content').value="";

    const selectedCategories = Array.from(form.querySelectorAll('.category-btn'))
    .filter(btn => btn.classList.contains('active'))
    .map(btn =>{
        btn.classList.remove("active")
       return btn.dataset.categoryName

    } );


        const postData = {
            title,
            content,
            categories: selectedCategories
        };

        try {
            const response = await fetch('/addpost', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });
    const data = await response.json();
 //   console.log(data);
    //  console.log(data);
    
           if (response.ok) {
            helper.creatdivposts    ({
                title : title,
                content : content,
                nickname : data.nickname,
                categories : selectedCategories,
                time : data.Time,
                id : data.idpost,

            },"single")
    const creatpostdiv = document.getElementById('creatpostid');
            if (creatpostdiv){
                creatpostdiv.style.display = "none"
            }
        } 
    } catch (err) {
        console.error('Error creating post:', err);
    }


    }
 */