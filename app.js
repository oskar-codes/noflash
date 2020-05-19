var divs = document.querySelectorAll("#images div[data-tag]");
var tags = new Set();
var layer = 1;
var projectsTable = document.getElementById("projects");
var fromSearch = false;

for (var i=0; i<divs.length; i++) {
  var div = divs[i];
  if (div.hasAttribute("data-tag")) {
    tags.add(div.getAttribute("data-tag"));
  }
}

tags = Array.from(tags);
var tagContainer = document.getElementById("tags");
tags.forEach((e, i) => {
  tagContainer.innerHTML += `${e !== "random" ? '<span onclick="openTag(`'+ e +'`)" class="tag">'+ e +'</span>' : ""}${i + 1 === tags.length ? "<span onclick='openRandom()' class='tag'>random</span>, <input spellcheck='false' autocomplete='off' id='search' placeholder='search'>" : ", "}`
});

var imagesContainer = document.querySelector("#images");

var projectsContainer = document.querySelector("#projects");
function openTag(t) {
  layer = 2;
  imagesContainer.style.display = "block";
  
  projectsTable.style.display = "table";
  projectsTable.style.opacity = 1;
  
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
    <thead>
      <tr>
        <th onclick='sort(this)' data-order="-1">ID</th>
        <th onclick='sort(this)' data-order="-1">AUTHOR</th>
        <th onclick='sort(this)' data-order="-1">TITLE</th>
        <th onclick='sort(this)' data-order="-1">LOCATION</th>
        <th onclick='sort(this)' data-order="-1">DATE</th>
      </tr>
    </thead>
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

function openRandom() {
  layer = 2;
  imagesContainer.style.display = "block";
  
  projectsContainer.innerHTML = ""

  divs.forEach((e) => {
    if (e.getAttribute("data-tag") === "random") {
      e.style.display = "block";
    } else {
      e.style.display = "none";
    }
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
  if (fromSearch) {
    fromSearch = false;
    layer = 1;
    imagesContainer.style.top = "100vh";
    window.setTimeout(() => {
      imagesContainer.style.display = "none";
      projects.forEach((e) => {
        e.style.display = "none";
        e.style.opacity = 0;
      });
    },300);
  } else {
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
}

const attr = (el) => Array.from(el.attributes).filter((e) => /^data-/.test(e.name));

var input = document.getElementById('search');
var existingProjects = [];
var projectNodes = document.querySelectorAll('div[data-project]');
for (var i=0; i<projectNodes.length; i++) {
  let p = projectNodes[i];
  existingProjects.push({
    tag: p.parentNode.getAttribute('data-tag'),
    id: Array.from(p.parentNode.children).indexOf(p),
    data: attr(p)
  });
}

var searchResults = document.querySelector("#search-results");
input.addEventListener('keyup',(e) => {
  searchResults.innerHTML = "";
  if (input.value !== "") {
    for (var i=0; i<existingProjects.length; i++) {
      let p = existingProjects[i];
      p.match = false;
      for (var d=0; d<4; d++) {
        if (p.data[d]) {
          var words = input.value.split(" ");
          for (var j=0; j<words.length; j++) {
            if (p.data[d].nodeValue.toLowerCase().includes(words[j]) && !p.match && input.value.trim() !== "" && words[j].trim() !== "") {
              p.match = true;
              if (searchResults.innerHTML === "") {
                searchResults.innerHTML += `
                <thead>
                  <tr>
                    <th onclick='sort(this)' data-order="-1">AUTHOR</td>
                    <th onclick='sort(this)' data-order="-1">TITLE</td>
                    <th onclick='sort(this)' data-order="-1">LOCATION</td>
                    <th onclick='sort(this)' data-order="-1">DATE</td>
                  </tr>
                </thead>
                `
              }
              searchResults.innerHTML += `
                <tr onclick='openSearchResult("${p.tag}",${p.id},true)' class='search-result'>
                  <td class='item'>${p.data[0].nodeValue}</td>
                  <td class='item'>${p.data[1].nodeValue}</td>
                  <td class='item'>${p.data[2].nodeValue}</td>
                  <td class='item'>${p.data[3].nodeValue}</td>
                </tr>
              `
            }
          }
        }
      }
    }
  }
  if (searchResults.innerHTML === "" && input.value !== "") searchResults.innerHTML += 'No results found.'
});

function openSearchResult(t,i,f) {
  openTag(t);
  openProject(i);
  if (f) fromSearch = true;
}

function sort(e) {
  let collumn = Array.from(e.parentNode.children).indexOf(e);
  let table = e.parentNode.parentNode.parentNode;
  let head = e.parentNode.parentNode;
  let values = Array.from(table.children);
  let order = parseInt(e.getAttribute("data-order"));
  values.splice(0,1);
  if (order === -1 || order === 1) {
    e.setAttribute("data-order","0");
    if (e.innerHTML === "ID") {
      var func = (a,b) => {
        return parseInt(a.children[0].children[collumn].innerHTML) - parseInt(b.children[0].children[collumn].innerHTML);
      }
    } else {
      var func = (a,b) => {
        var nameA = a.children[0].children[collumn].innerHTML.toUpperCase();
        var nameB = b.children[0].children[collumn].innerHTML.toUpperCase();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      }
    }
  } else {
    e.setAttribute("data-order","1");
    if (e.innerHTML === "ID") {
      var func = (a,b) => {
        return parseInt(b.children[0].children[collumn].innerHTML) - parseInt(a.children[0].children[collumn].innerHTML);
      }
    } else {
      var func = (a,b) => {
        var nameA = a.children[0].children[collumn].innerHTML.toUpperCase();
        var nameB = b.children[0].children[collumn].innerHTML.toUpperCase();
        if (nameA < nameB) {
          return 1;
        }
        if (nameA > nameB) {
          return -1;
        }
        return 0;
      }
    }
  }
  values.sort(func);

  table.innerHTML = `
    ${head.outerHTML}
  `
  values.forEach((e) => {
    table.innerHTML += e.outerHTML;
  });

  var arr = table.children[0].children[0].children;
  for (var i=0; i<arr.length; i++) {
    if (i !== collumn) arr[i].setAttribute("data-order", "-1");
  }
}

var randomPictures = document.querySelectorAll("div[data-tag='random'] img");
for (var i=0; i<randomPictures.length; i++) {
  randomPictures[i].outerHTML = `<div style='position: relative; vertical-align: middle; width: 100%; height: 100%; background-color: black;'>${randomPictures[i].outerHTML}</div>`
}
