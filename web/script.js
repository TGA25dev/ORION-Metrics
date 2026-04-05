  const params = new URLSearchParams(window.location.search); //look for settings in query params
  
  if (params.get('style') === 'orange') {
    document.body.classList.add('orange');
  }

  if (params.get('progress') === 'true') {
    document.body.classList.add('show-progress');
  }
  
  const lang = params.get('lang') === 'en' ? 'en' : 'fr';
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';

  if (lang === 'en') {
    document.querySelector('.hud-wrapper:nth-child(1) .label').innerHTML = "ELAPSED<br>TIME";
    document.querySelector('.hud-wrapper:nth-child(2) .label').textContent = "VELOCITY";
    document.querySelector('.hud-wrapper:nth-child(3) .label').innerHTML = "DISTANCE<br>FROM EARTH";
    document.querySelector('.hud-wrapper:nth-child(4) .label').innerHTML = "DISTANCE<br>TO MOON";
  } else {
    document.querySelector('.hud-wrapper:nth-child(1) .label').innerHTML = "TEMPS<br>ÉCOULÉ";
  }

  const isImperial = params.get('unit') === 'imperial';
  if (isImperial) {
    document.querySelector('.hud-wrapper:nth-child(2) .unit').textContent = "MPH";
    document.querySelector('.hud-wrapper:nth-child(3) .unit').textContent = "MILES";
    document.querySelector('.hud-wrapper:nth-child(4) .unit').textContent = "MILES";
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let ws;
  
  const connectWebSocket = () => {
    ws = new WebSocket(`${wsProtocol}//${location.host}/ws`); //creates a websocket connection

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.error) {
        resetUI();
        return;
      }

      const missionTotalSeconds = 864000; //10 days
      let metDeg = (data.met.total_seconds / missionTotalSeconds) * 360; //convert to degrees
      metDeg = Math.min(Math.max(metDeg, 0), 360); //clamp between 0 and 360
      
      document.querySelector('.hud-wrapper:nth-child(1) .time').textContent = data.met.string;
      document.querySelector('.hud-wrapper:nth-child(1) .unit').textContent = lang === 'en' ? "D:H:M" : "J:H:M";
      document.querySelector('.hud-wrapper:nth-child(1) .progress').style.setProperty('--prog-deg', `${metDeg}deg`);
      
      const MAX_SPEED_KMH = 39500;
      const MAX_SPEED_MPH = 24500;
      
      const MAX_DIST_EARTH_KM = 400000;
      const MAX_DIST_EARTH_MI = 248500;
      
      const MAX_DIST_MOON_KM = 400000;
      const MAX_DIST_MOON_MI = 248500;

      let speedDeg, earthDeg, moonDeg;

      if (isImperial) {
        speedDeg = (data.speed.imperial.mph / MAX_SPEED_MPH) * 360; //speed to degrees
        earthDeg = (data.distance_earth.imperial.mi / MAX_DIST_EARTH_MI) * 360; //earth distance to degrees
        
        moonDeg = (data.distance_moon.imperial.mi / MAX_DIST_MOON_MI) * 360; //direct distance representation

        //Update the values
        document.querySelector('.hud-wrapper:nth-child(2) .time').textContent = Math.round(data.speed.imperial.mph).toLocaleString(locale);
        document.querySelector('.hud-wrapper:nth-child(3) .time').textContent = Math.round(data.distance_earth.imperial.mi).toLocaleString(locale);
        document.querySelector('.hud-wrapper:nth-child(4) .time').textContent = Math.round(data.distance_moon.imperial.mi).toLocaleString(locale);
      } else {
        speedDeg = (data.speed.metric.kmh / MAX_SPEED_KMH) * 360;
        earthDeg = (data.distance_earth.metric.km / MAX_DIST_EARTH_KM) * 360; //same but metric also
        
        moonDeg = (data.distance_moon.metric.km / MAX_DIST_MOON_KM) * 360; //same direct mapping in metric

        //Update the values
        document.querySelector('.hud-wrapper:nth-child(2) .time').textContent = Math.round(data.speed.metric.kmh).toLocaleString(locale);
        document.querySelector('.hud-wrapper:nth-child(3) .time').textContent = Math.round(data.distance_earth.metric.km).toLocaleString(locale);
        document.querySelector('.hud-wrapper:nth-child(4) .time').textContent = Math.round(data.distance_moon.metric.km).toLocaleString(locale);
      }

      //set the bounds
      document.querySelector('.hud-wrapper:nth-child(2) .progress').style.setProperty('--prog-deg', `${Math.min(Math.max(speedDeg, 0), 360)}deg`);
      document.querySelector('.hud-wrapper:nth-child(3) .progress').style.setProperty('--prog-deg', `${Math.min(Math.max(earthDeg, 0), 360)}deg`);
      document.querySelector('.hud-wrapper:nth-child(4) .progress').style.setProperty('--prog-deg', `${Math.min(Math.max(moonDeg, 0), 360)}deg`);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      resetUI();
    };

    ws.onclose = () => {
      console.log("WebSocket closed, attempting default reconnect...");
      resetUI();
      setTimeout(connectWebSocket, 5000); // Try to reconnect every 5 seconds
    };
  };

  const resetUI = () => {
    document.querySelector('.hud-wrapper:nth-child(1) .time').textContent = "--:--:--";
    document.querySelector('.hud-wrapper:nth-child(1) .progress').style.setProperty('--prog-deg', '0deg');
    document.querySelector('.hud-wrapper:nth-child(2) .time').textContent = "--";
    document.querySelector('.hud-wrapper:nth-child(2) .progress').style.setProperty('--prog-deg', '0deg');
    document.querySelector('.hud-wrapper:nth-child(3) .time').textContent = "--";
    document.querySelector('.hud-wrapper:nth-child(3) .progress').style.setProperty('--prog-deg', '0deg');
    document.querySelector('.hud-wrapper:nth-child(4) .time').textContent = "--";
    document.querySelector('.hud-wrapper:nth-child(4) .progress').style.setProperty('--prog-deg', '0deg');
  };

  // Start the connection
  connectWebSocket();