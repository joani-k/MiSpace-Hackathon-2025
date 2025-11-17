## 📄 License

This project is open source under the **MIT License**.  
Full license text is available in the `LICENSE` file in the repository.

<p align="center">
  <img src="./github_logo.png" width="200">
</p>

## How We Built the Ice Forecast and Routing System – Our Modeling Approach

We approached the problem like an operations team would: start from the data you can trust, then layer on simple, explainable models that run fast. We used 21 days of GLSEA lake-surface temperature NetCDF data as our training window and fit a global AR(1) model \((T_{t+1} = \alpha T_t + \beta)\) to forecast surface temperatures four days ahead. For the test period, we took the provided GLSEA initial condition, ran the AR(1) model forward, and applied a physics-motivated heuristic to convert near-freezing water into ice concentration, thickness, and coarse ice-type classes.

Those gridded fields were downsampled into GeoJSON polygons tagged by product and forecast time, which the frontend renders as interactive forecast layers. For routing, we combined a land mask (land = impassable) with the forecasted ice polygons to generate a cost grid where heavier ice means higher cost. An A* pathfinding algorithm then produces routes that avoid land and prefer lower-ice corridors. The result is a lightweight, fully local pipeline that turns raw Great Lakes datasets into clear maps, narrative summaries, and advisory ship routes in the browser.

---

# 📖 About the Project

In winter, Great Lakes operators need fast answers to questions like:

- **What will ice look like along this route in the next few days?**
- **Is there a safer path that still fits our schedule?**
- **How are lake temperatures changing near key choke points?**

IceScope GL (our **Great Lakes Ice Ops prototype**) pulls these pieces together in one interface with three panels:

---

## 🧊 Ice Forecast

- 4-day ice products: **Concentration, Thickness, Type**
- Playback bar with frame stepping and speed control
- Legends fetched from backend (or fallbacks), **color-blind-friendly when enabled**
- Export map snapshots for briefings and reports

---

## 🧭 Best Route

Advisory routing across the Great Lakes with:

- Port presets (**Detroit, Chicago, Duluth, etc.**)
- Draggable start/destination markers + quick swap button
- Vessel inputs: **draft, ice class, speed**

Backend cost grid:

- **Land polygons → impassable**
- **Ice polygons → higher cost where concentration rises**

A* pathfinder returns a route that:

- Never crosses land  
- Prefers lower-ice corridors  
- Stays between requested ports  

Returned as **GeoJSON**, overlaid on the live map, exportable or shareable via URL params.

---

## 🌡 Temps

- Current lake temperatures + **48-hour outlook**
- Powered by **Open-Meteo (no API key)**
- °F / °C toggle
- Quick-pick chips to jump between basins

---

## 🔮 Future Work

- **Stronger forecast models**  
  Replace the AR(1) baseline with ConvLSTM or other spatiotemporal models trained on multi-year GLSEA + ice data.
- **Weather coupling**  
  Add wind, air temperature, and wave forecasts (GFS/HRRR) so ice evolution responds to storms and cold outbreaks.
- **Vessel-specific risk**  
  Include draft, power, and certified ice class directly in the routing cost to produce ship-specific safe tracks.
- **Multi-criteria routing**  
  Let users choose between shortest time, lowest ice exposure, or lowest fuel use and display multiple candidate routes.
- **Interactive “what-if” tools**  
  Drag waypoints, adjust tolerance to heavy ice, lock corridors, and instantly re-run A* with updated constraints.
- **Operational integration**  
  Export layers and routes in standard formats usable by Coast Guard and commercial navigation systems.

  ---

## 🌐 Live Demo

🔗 **https://mi-space-hackathon-2025.vercel.app**

---

## 🛠 Built With

![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![xarray](https://img.shields.io/badge/xarray-EE4C2C?logo=python&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?logo=numpy&logoColor=white)
![NetCDF](https://img.shields.io/badge/NetCDF-5DADE2)
![GeoJSON](https://img.shields.io/badge/GeoJSON-000000?logo=json&logoColor=white)

![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-38BDF8?logo=tailwindcss&logoColor=white)
![MapLibre](https://img.shields.io/badge/MapLibre-40B5A4?logo=mapbox&logoColor=white)

![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

---

## 👍 Like This Project?

If you enjoyed it, please give the repo a star ⭐  
![GitHub Repo stars](https://img.shields.io/github/stars/joani-k/MiSpace-Hackathon-2025?style=social)

