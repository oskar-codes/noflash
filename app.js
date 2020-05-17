var divs = document.querySelectorAll("#images div[data-tag]");
var tags = new Set();
var layer = 1;

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
  layer = 2;
  divs.forEach((e) => {
    if (e.getAttribute("data-tag") === t) {
      e.style.display = "block";
    } else {
      e.style.display = "none";
    }
  });

  tag = document.querySelector(`div[data-tag='${t}']`);
  window.projects = Array.from(tag.children);

  tag.style.display = "block";

  projectsContainer.innerHTML = "";
  projects.forEach((e, i) => {
    e.style.display = "none";
    projectsContainer.innerHTML += `<p onclick='openProject(${i})' class='project'>${e.getAttribute("data-project")}</p>${(i + 1 === projects.length ? "" : "")}`;
  });

  imagesContainer.style.top = "0vh"
}

function openProject(i) {
  projects.forEach((e) => {
    e.style.display = "none";
  });
  projects[i].style.display = "block";
  window.setTimeout((e) => {
    projects[i].style.opacity = 1;
  });
  
  var projectButtons = document.querySelectorAll('.project');
  for (var i = 0; i<projectButtons.length; i++) {
    projectButtons[i].style.display = "none";
  }
  layer = 3;
}

function closeImages() {
  if (layer === 2) {
    layer = 1;
    imagesContainer.style.top = "100vh";
  } else if (layer === 3) {
    layer = 2;
    var projectButtons = document.querySelectorAll('.project');
    for (var i = 0; i<projectButtons.length; i++) {
      projectButtons[i].style.display = "block";
    }
    
    projects.forEach((e) => {
      e.style.display = "none";
    });
  }
}
