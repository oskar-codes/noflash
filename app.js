var divs = document.querySelectorAll("#images div[data-tag]");
var tags = new Set();

for (var i=0; i<divs.length; i++) {
  var div = divs[i];
  if (div.hasAttribute("data-tag")) {
    tags.add(div.getAttribute("data-tag"));
  }
}

tags = Array.from(tags);
var tagContainer = document.getElementById("tags");
tags.forEach((e, i) => {
  tagContainer.innerHTML += `<span onclick="openTag('${e}')" class="tag">${e}</span>${i + 1 === tags.length ? "" : ", "}`
});

var imagesContainer = document.querySelector("#images");
var projectsContainer = document.querySelector("#projects");
function openTag(t) {
  divs.forEach((e) => {
    if (e.getAttribute("data-tag") === t) {
      e.style.display = "block";
    } else {
      e.style.display = "none";
    }
  });


  tag = document.querySelector(`div[data-tag='${t}']`);
  window.classes = Array.from(tag.children);

  tag.style.display = "block";

  projectsContainer.innerHTML = "";
  classes.forEach((e, i) => {
    e.style.display = "none";
    projectsContainer.innerHTML += `<p onclick='openProject(${i})' class='project'>${e.getAttribute("data-project")}</p>${(i + 1 === classes.length ? "" : "")}`;
  });

  imagesContainer.style.top = "0vh"
}

function openProject(i) {
  classes.forEach((e) => {
    e.style.display = "none";
    e.style.opacity = 0
  });
  classes[i].style.display = "block";
  window.setTimeout((e) => {
    classes[i].style.opacity = 1;
  })
}

function closeImages() {
  imagesContainer.style.top = "100vh"
}