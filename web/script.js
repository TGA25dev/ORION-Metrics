  console.info("To Infinity and Beyond !🚀");
  const url = new URL(window.location.href);
  const params = url.searchParams; //look for settings in query params

  if (!params.has('animations')) {
    params.set('animations', 'true');
    window.history.replaceState({}, '', `${url.pathname}?${params.toString()}${url.hash}`);
    console.info('Animations are enabled by default. Disable with ?animations=false in the URL.');
  }

  const animationsEnabled = params.get('animations')?.toLowerCase() !== 'false';
  
  const bgType = params.get('bg');
  if (bgType === 'darker') {
    document.body.classList.add('bg-darker');
  } else if (bgType === 'solid-black') {
    document.body.classList.add('bg-solid-black');
  }

  if (params.get('style') === 'orange') {
    document.body.classList.add('orange');
  }

  if (params.get('progress') === 'true') {
    document.body.classList.add('show-progress');
  }
  
  const lang = params.get('lang') === 'en' ? 'en' : 'fr';
  const isImperial = params.get('unit') === 'imperial';
  const locale = lang === 'en' ? (isImperial ? 'en-US' : 'fr-FR') : 'fr-FR';

  const animatedValueMap = new Map();

  const numberFlowConfig = {
    loaded: false,
    continuous: null,
    shouldAnimate: false
  };

  const createFlowElement = (currentValue) => {
    const flow = document.createElement('number-flow');

    if (numberFlowConfig.continuous && numberFlowConfig.shouldAnimate) {
      flow.plugins = [numberFlowConfig.continuous];
    }

    flow.className = currentValue.className;
    flow.dataset.willChange = '';
    flow.locales = locale;
    flow.format = { maximumFractionDigits: 0 }; //bunch of settings for the animations
    flow.animated = numberFlowConfig.shouldAnimate;
    flow.respectMotionPreference = true;
    flow.trend = (oldValue, value) => Math.sign(value - oldValue);

    flow.transformTiming = {
      duration: 520,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    };

    flow.spinTiming = {
      duration: 600,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    };

    flow.opacityTiming = {
      duration: 240,
      easing: 'ease-out'
    };

    return flow;
  };

  const initNumberFlow = async () => {
    try {

      const numberFlowModule = await import('https://esm.sh/number-flow'); //+ info here -> https://number-flow.barvian.me/

      const continuous = numberFlowModule.continuous;
      const canAnimate = numberFlowModule.canAnimate;
      const prefersReducedMotion = numberFlowModule.prefersReducedMotion; //update the settings we defined before
      const shouldAnimate = animationsEnabled && Boolean(canAnimate) && !prefersReducedMotion?.matches;
      numberFlowConfig.loaded = true;
      numberFlowConfig.continuous = continuous;
      numberFlowConfig.shouldAnimate = shouldAnimate;

      [2, 3, 4].forEach((hudIndex) => { //for each of the huds except the 1st one we replace static values with animated ones
        const currentValue = document.querySelector(`.hud-wrapper:nth-child(${hudIndex}) .time`);
        if (!currentValue) {
          return;
        }

        const flow = createFlowElement(currentValue);
        flow.textContent = currentValue.textContent;

        currentValue.replaceWith(flow);
        animatedValueMap.set(hudIndex, flow);

      });

    } catch (error) {
      console.warn('NumberFlow unavailable using static numeric updates...', error);
    }
  };

  const setMetricValue = (hudIndex, value) => {
    let flow = animatedValueMap.get(hudIndex);

    if (!flow && numberFlowConfig.loaded) {
      const fallback = document.querySelector(`.hud-wrapper:nth-child(${hudIndex}) .time`);

      if (fallback) {
        flow = createFlowElement(fallback);
        flow.textContent = fallback.textContent;
        fallback.replaceWith(flow);
        animatedValueMap.set(hudIndex, flow);
      }
    }

    if (flow && typeof flow.update === 'function') {
      flow.update(Math.round(value));
      return;
    }

    const fallback = document.querySelector(`.hud-wrapper:nth-child(${hudIndex}) .time`);
    if (fallback) {
      fallback.textContent = Math.round(value).toLocaleString(locale);
    }
  };

  const setMetricPlaceholder = (hudIndex, placeholder = '--') => {
    const flow = animatedValueMap.get(hudIndex);

    if (flow) {
      const fallback = document.createElement('div');
      fallback.className = flow.className;
      fallback.textContent = placeholder;
      flow.replaceWith(fallback);
      animatedValueMap.delete(hudIndex);
      return;
    }

    const fallback = document.querySelector(`.hud-wrapper:nth-child(${hudIndex}) .time`);
    if (fallback) {
      fallback.textContent = placeholder;
    }
  };

  if (lang === 'en') {
    document.querySelector('.hud-wrapper:nth-child(1) .label').innerHTML = "ELAPSED<br>TIME";
    document.querySelector('.hud-wrapper:nth-child(2) .label').textContent = "VELOCITY";
    document.querySelector('.hud-wrapper:nth-child(3) .label').innerHTML = "DISTANCE<br>FROM EARTH";
    document.querySelector('.hud-wrapper:nth-child(4) .label').innerHTML = "DISTANCE<br>TO MOON";
  } else {
    document.querySelector('.hud-wrapper:nth-child(1) .label').innerHTML = "TEMPS<br>ÉCOULÉ";
  }

  if (isImperial) {
    document.querySelector('.hud-wrapper:nth-child(2) .unit').textContent = "MPH";
    document.querySelector('.hud-wrapper:nth-child(3) .unit').textContent = "MILES";
    document.querySelector('.hud-wrapper:nth-child(4) .unit').textContent = "MILES";
  }

  initNumberFlow();

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
        setMetricValue(2, data.speed.imperial.mph);
        setMetricValue(3, data.distance_earth.imperial.mi);
        setMetricValue(4, data.distance_moon.imperial.mi);
        
      } else {
        speedDeg = (data.speed.metric.kmh / MAX_SPEED_KMH) * 360;
        earthDeg = (data.distance_earth.metric.km / MAX_DIST_EARTH_KM) * 360; //same but metric also
        
        moonDeg = (data.distance_moon.metric.km / MAX_DIST_MOON_KM) * 360; //same direct mapping in metric

        //Update the values
        setMetricValue(2, data.speed.metric.kmh);
        setMetricValue(3, data.distance_earth.metric.km);
        setMetricValue(4, data.distance_moon.metric.km);
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
    setMetricPlaceholder(2);
    document.querySelector('.hud-wrapper:nth-child(2) .progress').style.setProperty('--prog-deg', '0deg');
    setMetricPlaceholder(3);
    document.querySelector('.hud-wrapper:nth-child(3) .progress').style.setProperty('--prog-deg', '0deg');
    setMetricPlaceholder(4);
    document.querySelector('.hud-wrapper:nth-child(4) .progress').style.setProperty('--prog-deg', '0deg');
  };

  // Start the connection
  connectWebSocket();