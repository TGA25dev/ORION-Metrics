# ORION Metrics <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png" alt="Rocket" width="25" height="25" />

[Français](README.fr.md) | [English](README.md)

> [!NOTE]
> This project is archived and will never be updated anymore. Artemis II crew  safely returned to Earth on April 10, 2026 at 2:07 (Paris Time) after 9 days and 17 hours in space.<br>Made with ❤ by TGA25dev 11/04/26

**ORION Metrics** is an open-source telemetry overlay for NASA's Artemis II mission. It fetches the offial [ARROW](https://www.nasa.gov/missions/artemis-ii/arow/) website data stream and provides real time unit conversion and a broadcast ready interface.

<img src="img/banner.png" alt="Telemetry Banner">

# Getting Started 
You can integrate the overlay directly into **OBS Studio**, **Streamlabs**, or any broadcasting software as a **Browser Source**

1. Create a new **Browser Source**
2. Set the URL to:

``` plaintext
https://orionmetrics.pronotif.tech/
``` 
3. Set the width/height (Recommended: 1200x400 for line display or 400x1500 for vertical).<br>

<small>NOTE: The background is transparent by default, but it can be customized (see below).</small>

## Custom Settings
You can customize the overlay by adding **URL Parameters** to the end of the link :
### Units
Toggle between Metric and Imperial
- **Metric**: `?unit=metric` *(Default)* Displays in km and km/H
- **Imperial**: `?unit=imperial` Displays in miles and mph

### Color Themes
Change the color theme of the overlay
<img src="img/speed_orange_progress_metric.png">
<img src="img/speed_default_progress_metric.png">

- **Default**: *(Default)* `?style=default`
- **Orange**: `style=orange`

### Progress Bar
Disable or Enable the progress bar around the circles
<img src="img/speed_default_noprogress_imperial.png">
<img src="img/speed_default_progress_metric.png">
- **Enable**: *(Default)* `?progress=true`
- **Disable**: `?progress=false`

### Animations
Enable or disable animated number transitions [(NumberFlow)](https://number-flow.barvian.me/vanilla)
- **Enable**: *(Default)* `?animations=true`
- **Disable**: `?animations=false`

If `animations` is missing from the URL, the overlay automatically sets it to `animations=true`.

### Language
Toggle language for labels and numbers mapping
- **French**: *(Default)* `?lang=fr`
- **English**: `?lang=en`

### Backgrounds
Improve visibility over different video feeds by adding a background behind the HUDs
- **Transparent**: *(Default)* No background
- **Frosted Dark**: `?bg=darker` Adds a semitransparent blurred dark tint
- **Solid Black**: `?bg=solid-black` Adds an opaque black background

#### Example UR: `https://orionmetrics.pronotif.tech/?unit=metric&style=default&progress=false&bg=darker&animations=true`

## Technical Note
**Data Accuracy:** This tool uses raw vectors from the NASA AROW API. Because these are converted from Imperial back to Metric, calculations may slightly divert from reality due to rounding and vector projection. Sorry..

## License
Distributed under the MIT License (See [LICENSE](LICENSE.md) file for more information)
Built with ❤ for the space community

