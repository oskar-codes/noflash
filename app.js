var divs = document.querySelectorAll("#images div[data-tag]");
var tags = new Set();
var layer = 1;
var projectsTable = document.getElementById("projects");

for (var i=0; i<divs.length; i++) {
  var div = divs[i];
  if (div.hasAttribute("data-tag")) {
    tags.add(div.getAttribute("data-tag"));
  }
}

tags = Array.from(tags);
var tagContainer = document.getElementById("tags");
tags.forEach((e, i) => {
  tagContainer.innerHTML += `<span onclick="openTag('${e}')" class="tag">${e}</span>${i + 1 === tags.length ? ", <input id='search' placeholder='search'>" : ", "}`
});

var imagesContainer = document.querySelector("#images");

var projectsContainer = document.querySelector("#projects");
function openTag(t) {
  layer = 2;
  imagesContainer.style.display = "block";
  
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
  const get = (e,t) => e.getAttribute("data-" + t) || "unknown";
  
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
    e.style.opacity = 0;
    projectsContainer.innerHTML += `
      <tr onclick='openProject(${i})' class='project'>
        <td>${i+1}</td>
        <td>${get(e,"author")}</td>
        <td>${get(e,"project")}</td>
        <td>${get(e,"location")}</td>
        <td>${get(e,"date")}</td>
      </tr>`
  });

  window.setTimeout(() => {
    imagesContainer.style.top = "0vh";
  },10);
}

function openProject(i) {
  projects.forEach((e) => {
    e.style.display = "none";
  });
  projects[i].style.display = "block";
  window.setTimeout((e) => {
    e.style.opacity = 1;
  },10,projects[i]);
  
  projectsTable.style.display = "none";
  projectsTable.style.opacity = 0;
  layer = 3;
}

function closeImages() {
  if (layer === 2) {
    layer = 1;
    imagesContainer.style.top = "100vh";
    window.setTimeout(() => {
      imagesContainer.style.display = "none";
    },300);
  } else if (layer === 3) {
    layer = 2;
    projectsTable.style.display = "table";
    window.setTimeout(() => {
      projectsTable.style.opacity = 1;
    },10);
    
    projects.forEach((e) => {
      e.style.display = "none";
      e.style.opacity = 0;
    });
  }
}

const attr = (el) => Array.from(el.attributes).filter((e) => /^data-/.test(e.name));

var input = document.getElementById('search');
var projects = [];
var projectNodes = document.querySelectorAll('div[data-project]');
for (var i=0; i<projectNodes.length; i++) {
  let p = projectNodes[i];
  projects.push({
    tag: p.parentNode.getAttribute('data-tag'),
    id: Array.from(p.parentNode.children).indexOf(p),
    data: attr(p)
  });
}

var searchResults = document.querySelector("#search-results");
input.addEventListener('keyup',(e) => {
  searchResults.innerHTML = "";
  if (input.value !== "") {
    for (var i=0; i<projects.length; i++) {
      let p = projects[i];
      p.match = false;
      for (var d=0; d<4; d++) {
        if (p.data[d]) {
          if (p.data[d].nodeValue.includes(input.value) && !p.match) {
            p.match = true;
            if (searchResults.innerHTML === "") {
              searchResults.innerHTML += `
              <tr>
                <th>AUTHOR</td>
                <th>TITLE</td>
                <th>LOCATION</td>
                <th>DATE</td>
              </tr>
              `
            }
            searchResults.innerHTML += `
              <tr onclick='openSearchResult("${p.tag}",${p.id})' class='search-result'>
                <td>${p.data[0].nodeValue}</td>
                <td>${p.data[1].nodeValue}</td>
                <td>${p.data[2].nodeValue}</td>
                <td>${p.data[3].nodeValue}</td>
              </tr>
            `
          }
        }
      }
    }
  }
});

function openSearchResult(t,i) {
  openTag(t);
  openProject(i);
}
