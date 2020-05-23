var request = new XMLHttpRequest();
request.open("POST", "https://discord.com/api/webhooks/713771249204985966/9J8NW-_UijRM09swDrjeMmssHN9F5CMvfNG4IIxUvkjTmJN9Im-OpkyLMIQE979H90UJ");

request.setRequestHeader('Content-type', 'application/json');

var params = {
  username: "Github Pages",
  avatar_url: "",
  content: "Github Pages has finished building."
}

request.send(JSON.stringify(params));
