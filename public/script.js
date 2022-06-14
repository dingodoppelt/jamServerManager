if (!!window.EventSource) {
    fetch('/menuNotifications').then(res => res.text())
    .then(result => {
    document.getElementById('methods').innerHTML = result;
    });
    
    var sourceNotifications = new EventSource('/rpcNotifications')

    sourceNotifications.addEventListener('message', function(e) {
      document.getElementById('data').innerHTML = e.data;
    }, false);

    sourceNotifications.addEventListener('levels', function(e) {
      document.getElementById('levels').innerHTML = e.data;
    }, false);

    sourceNotifications.addEventListener('clients', function(e) {
      document.getElementById('clients').innerHTML = e.data;
    }, false);

    sourceNotifications.addEventListener('chat', function(e) {
      document.getElementById('chat').innerHTML = e.data;
    }, false);

    sourceNotifications.addEventListener('open', function(e) {
      document.getElementById('state').innerHTML = "Connected";
    }, false);

    sourceNotifications.addEventListener('error', function(e) {
      const id_state = document.getElementById('state')
      if (e.eventPhase == EventSource.CLOSED)
        sourceNotifications.close();
      if (e.target.readyState == EventSource.CLOSED) {
        id_state.innerHTML = "Disconnected";
      }
      else if (e.target.readyState == EventSource.CONNECTING) {
        id_state.innerHTML = "Connecting...";
      }
    }, false);
  } else {
    console.log("Your browser doesn't support SSE");
  }
  
  async function fetchget() {
    let formData = document.getElementById('params').value;
    let method = document.getElementById('method').value;
    try {
        const res = await fetch('/methodSelection?method=' + method + '&params=' + formData);
        const data = await res.text();
        console.log(data);
    } catch (error) {
        console.log('Error:' + error);
    }
  } 
