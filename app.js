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
  const get = (e,t) => e.getAttribute("data-" + t);
  
  projectsContainer.innerHTML += `
    <tr>
      <th>ID</th>
      <th>AUTHOR</th>
      <th>TITLE</th>
      <th>LOCATION</th>
      <th>DATE</th>
    </tr>
  `
  
  projects.forEach((e, i) => {
    e.style.display = "none";
    projectsContainer.innerHTML += `
      <tr onclick='openProject(${i})' class='project'>
        <td>${i+1}</td>
        <td>${get(e,"author")}</td>
        <td>${get(e,"project")}</td>
        <td>${get(e,"location")}</td>
        <td>${get(e,"date")}</td>
      </tr>`
  });

  imagesContainer.style.top = "0vh"
}

function openProject(i) {
  projects.forEach((e) => {
    e.style.display = "none";
  });
  projects[i].style.display = "block";
  window.setTimeout((e) => {
    e.style.opacity = 1;
  },10,projects[i]);
  
  document.getElementById("projects").style.display = "none";
  layer = 3;
}

function closeImages() {
  if (layer === 2) {
    layer = 1;
    imagesContainer.style.top = "100vh";
  } else if (layer === 3) {
    layer = 2;
    document.getElementById("projects").style.display = "table";
    
    projects.forEach((e) => {
      e.style.display = "none";
    });
  }
}
