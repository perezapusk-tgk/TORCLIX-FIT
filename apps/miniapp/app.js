const screens=["today","train","body","evolve","ai"];
function openView(id){
screens.forEach(s=>document.getElementById(s)?.classList.toggle("hidden",s!==id));
document.querySelectorAll(".nav button").forEach((b,i)=>b.classList.toggle("active",screens[i]===id));
document.querySelectorAll(".view").forEach(x=>x.classList.toggle("hidden",id!=="today"));
window.scrollTo({top:0,behavior:"smooth"});
}
openView("today");