import math
from datetime import datetime, timezone
import requests
from skyfield.api import load

#constants
LAUNCH = datetime(2026, 4, 1, 22, 35, 12, tzinfo=timezone.utc)
FEET_TO_KM = 0.0003048
KM_TO_MI = 0.621371
MI_TO_KM = 1.609344
EARTH_RADIUS_KM = 6371.0
MOON_RADIUS_KM = 1737.4
META_URL = "https://storage.googleapis.com/storage/v1/b/p-2-cen1/o/October%2F1%2FOctober_105_1.txt"
DATA_URL = "https://storage.googleapis.com/download/storage/v1/b/p-2-cen1/o/October%2F1%2FOctober_105_1.txt?alt=media&generation={gen}"

#planetary data for distance calculations
print("Loading planetary data...")
planets = load("de421.bsp")
earth_obj, moon_obj = planets["earth"], planets["moon"]
ts = load.timescale()

def _value(data, n):
    """
    Helper to extract a parameter value from the telemetry data, ensuring it's valid and converting to float.
    """
    
    datum = data.get(f"Parameter_{n}")
    if not datum or datum.get("Status") != "Good":
        return None
    try:
        return float(datum["Value"])
    except (TypeError, ValueError):
        return None


def get_met():
    """
    Calculate Mission Elapsed Time (MET) as a dict with string and total seconds"""
    total = int((datetime.now(timezone.utc) - LAUNCH).total_seconds()) #Total seconds since launch
    return {
        "string": f"{total//86400}:{total%86400//3600:02d}:{total%3600//60:02d}",
        "total_seconds": total
    }


def get_artemis_telemetry(timeout=5):
    """Fetch telemetry snapshot and compute derived metrics
    """

    meta = requests.get( #get the data
        META_URL,
        headers={"Cache-Control": "no-cache"}, #trying to prevent caching here...
        timeout=timeout,

    ).json()
    generation = meta["generation"] #added generation to the url as done on official website (again for cache busting)

    data = requests.get(DATA_URL.format(gen=generation), timeout=timeout).json() #raw awful data

    px, py, pz = _value(data, "2003"), _value(data, "2004"), _value(data, "2005") #position vectors in feet
    vx, vy, vz = _value(data, "2009"), _value(data, "2010"), _value(data, "2011") #velocity vectors in feet per second

    if None in (px, py, pz, vx, vy, vz):
        raise ValueError("Telemetry payload is missing one or more required parameters.")

    t = ts.now() #current time

    #Orion position converted from feet to kilometers.
    ox, oy, oz = px * FEET_TO_KM, py * FEET_TO_KM, pz * FEET_TO_KM

    #Earth distance, spacecraft to Earth surface.
    dist_earth_km = math.sqrt(ox**2 + oy**2 + oz**2) - EARTH_RADIUS_KM #distance from Earth center minus Earth radius gives distance to surface in km
    dist_earth_mi = dist_earth_km * KM_TO_MI #convert to miles

    #Moon distance, spacecraft to Moon surface.
    mx, my, mz = (moon_obj - earth_obj).at(t).position.km #moon position relative to Earth at current time
    dist_moon_center_km = math.sqrt((ox - mx) ** 2 + (oy - my) ** 2 + (oz - mz) ** 2) #distance from spacecraft to Moon center in km
    
    dist_moon_km = dist_moon_center_km - MOON_RADIUS_KM #distance from spacecraft to Moon surface in km
    dist_moon_mi = dist_moon_km * KM_TO_MI #convert to miles

    #speed from fps to mph/kmh.
    spd_fps = math.sqrt(vx**2 + vy**2 + vz**2) #pythagorean theorem to get speed in feet per second
    spd_mph = spd_fps * 3600 / 5280
    spd_kmh = spd_mph * MI_TO_KM

    return {
        "met": get_met(),
        "generation": generation,

        "distance_earth": {
            "metric": {"km": dist_earth_km},
            "imperial": {"mi": dist_earth_mi},
        },

        "distance_moon": {
            "metric": {"km": dist_moon_km},
            "imperial": {"mi": dist_moon_mi},
        },
        
        "speed": {
            "metric": {"kmh": spd_kmh},
            "imperial": {"mph": spd_mph},
        },
    }