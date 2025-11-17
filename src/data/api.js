/* Central API registry. Forced to use local sample_data only.
   No network calls; frames, legend, and narrative are loaded from /src/sample_data. */


/* ------------------------------------------------------------------ */
/*  STATIC ICE + LAND DEMO DATA (used as fallback for routing)        */
/* ------------------------------------------------------------------ */


// Demo ice polygons (used only if ML GeoJSON not found)
const ICE_DATA = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { value: 90 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-90.6, 48.8],
            [-89.8, 48.9],
            [-88.9, 48.8],
            [-88.4, 48.6],
            [-88.8, 48.4],
            [-89.7, 48.3],
            [-90.4, 48.4],
            [-90.6, 48.8],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { value: 70 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-87.2, 48.4],
            [-86.2, 48.5],
            [-85.4, 48.3],
            [-85.0, 48.1],
            [-85.4, 47.9],
            [-86.1, 47.9],
            [-86.8, 48.0],
            [-87.2, 48.4],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { value: 60 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-87.8, 45.9],
            [-87.2, 46.2],
            [-86.6, 46.1],
            [-86.2, 45.9],
            [-86.3, 45.6],
            [-86.9, 45.5],
            [-87.5, 45.6],
            [-87.8, 45.9],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { value: 40 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-86.4, 44.9],
            [-85.8, 45.0],
            [-85.3, 44.7],
            [-85.1, 44.2],
            [-85.4, 43.9],
            [-86.0, 43.9],
            [-86.4, 44.4],
            [-86.4, 44.9],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { value: 50 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-84.6, 46.2],
            [-83.8, 46.4],
            [-83.1, 46.2],
            [-82.7, 45.9],
            [-82.9, 45.7],
            [-83.6, 45.7],
            [-84.3, 45.8],
            [-84.6, 46.2],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { value: 30 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-82.0, 45.3],
            [-81.4, 45.4],
            [-80.9, 45.1],
            [-80.8, 44.7],
            [-81.1, 44.4],
            [-81.7, 44.5],
            [-82.0, 44.9],
            [-82.0, 45.3],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { value: 80 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-83.4, 42.3],
            [-82.7, 42.4],
            [-81.9, 42.3],
            [-81.6, 42.1],
            [-81.8, 41.9],
            [-82.5, 41.9],
            [-83.2, 42.0],
            [-83.4, 42.3],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { value: 20 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-81.9, 42.1],
            [-81.1, 42.2],
            [-80.4, 42.1],
            [-80.2, 41.9],
            [-80.5, 41.7],
            [-81.3, 41.7],
            [-81.9, 41.8],
            [-81.9, 42.1],
          ],
        ],
      },
    },
  ],
};


// Hand-drawn land polygons used as mask for routing
const LAND_DATA = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Minnesota/North Shore" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-93.0, 49.0],
            [-90.0, 49.0],
            [-89.0, 48.0],
            [-90.0, 47.0],
            [-91.0, 47.0],
            [-92.0, 46.5],
            [-93.0, 47.0],
            [-93.0, 49.0],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Keweenaw Peninsula" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-89.0, 47.3],
            [-88.5, 47.5],
            [-88.0, 47.3],
            [-87.8, 47.0],
            [-88.3, 47.0],
            [-88.8, 47.2],
            [-89.0, 47.3],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Upper Peninsula (West)" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-90.0, 47.0],
            [-87.0, 47.0],
            [-87.0, 46.5],
            [-85.0, 46.2],
            [-84.8, 45.9],
            [-84.8, 45.7],
            [-85.0, 45.5],
            [-86.5, 45.3],
            [-87.5, 45.0],
            [-88.0, 45.3],
            [-88.5, 45.5],
            [-90.0, 46.0],
            [-90.0, 47.0],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Lower Peninsula (East)" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-84.7, 45.8],
            [-84.7, 45.0],
            [-84.0, 44.0],
            [-83.5, 43.0],
            [-83.0, 42.0],
            [-82.5, 41.8],
            [-82.3, 42.5],
            [-82.0, 43.5],
            [-82.5, 44.5],
            [-83.0, 45.0],
            [-83.5, 45.5],
            [-84.0, 45.7],
            [-84.7, 45.8],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Wisconsin/Door Peninsula" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-88.5, 45.5],
            [-88.0, 45.3],
            [-87.5, 45.0],
            [-87.0, 44.5],
            [-86.8, 45.0],
            [-87.0, 45.2],
            [-87.5, 44.5],
            [-87.8, 44.0],
            [-88.0, 42.5],
            [-88.5, 43.0],
            [-88.5, 44.0],
            [-88.5, 45.5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Manitoulin Island" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-83.0, 45.9],
            [-82.0, 45.8],
            [-81.8, 45.5],
            [-82.5, 45.4],
            [-83.2, 45.7],
            [-83.0, 45.9],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Land South of Erie" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-83.5, 41.8],
            [-83.0, 41.5],
            [-82.0, 41.3],
            [-81.0, 41.4],
            [-80.0, 41.8],
            [-80.0, 41.0],
            [-83.5, 41.0],
            [-83.5, 41.8],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Land S of Erie (East)" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-80.0, 42.0],
            [-79.0, 42.2],
            [-79.0, 41.0],
            [-80.0, 41.0],
            [-80.0, 42.0],
          ],
        ],
      },
    },
  ],
};


/* ------------------------------------------------------------------ */
/*  HELPERS                                                           */
/* ------------------------------------------------------------------ */


async function loadSampleJSON(file) {
  try {
    const url = new URL(`../sample_data/${file}`, import.meta.url);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`sample fetch failed: ${file}`);
    return r.json();
  } catch (e) {
    console.warn("[sample_data] failed to load", file, e);
    return null;
  }
}


function synthNarrative(iso) {
  let dt;
  try {
    dt = iso ? new Date(iso) : new Date();
  } catch {
    dt = new Date();
  }
  const h = dt.getUTCHours();
  const band =
    h < 6
      ? "overnight cooling"
      : h < 12
      ? "morning stabilization"
      : h < 18
      ? "afternoon variability"
      : "evening consolidation";
  return `Ice concentration shows ${band} with localized leads along main shipping lanes.`;
}


/* ------------------------------------------------------------------ */
/*  A* PATHFINDING IMPLEMENTATION                                     */
/* ------------------------------------------------------------------ */


// 1. Point-in-Polygon helper
function isPointInPolygon(point, polygon) {
  const [px, py] = point;
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) isInside = !isInside;
  }
  return isInside;
}


// 2. Grid setup
const GRID_BOUNDS = {
  minLon: -93.0,
  maxLon: -80.0,
  minLat: 41.5,
  maxLat: 49.0,
};
const GRID_WIDTH = 120; // columns (lon)
const GRID_HEIGHT = 90; // rows (lat)


const OPEN_WATER_COST = 1;
const ICE_COST_MULTIPLIER = 3; // Cost = 1 + (ice_percent * 3)
const DIAGONAL_COST = 1.414;


// 3. A* Algorithm
function heuristic(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}


function getNeighbors(node) {
  const neighbors = [];
  const { x, y } = node;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  return neighbors;
}


function findPathAStar(costGrid, startNode, endNode) {
  const openList = [
    {
      ...startNode,
      g: 0,
      f: heuristic(startNode, endNode),
      parent: null,
    },
  ];
  const closedList = new Set();
  const gScores = new Map();
  gScores.set(`${startNode.x},${startNode.y}`, 0);


  while (openList.length > 0) {
    let lowIndex = 0;
    for (let i = 0; i < openList.length; i++) {
      if (openList[i].f < openList[lowIndex].f) lowIndex = i;
    }
    const currentNode = openList.splice(lowIndex, 1)[0];


    if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
      const path = [];
      let curr = currentNode;
      while (curr) {
        path.push(curr);
        curr = curr.parent;
      }
      return path.reverse();
    }


    const currentKey = `${currentNode.x},${currentNode.y}`;
    closedList.add(currentKey);


    for (const neighbor of getNeighbors(currentNode)) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (closedList.has(neighborKey)) continue;


      // Land is impassable: Infinity cost
      if (costGrid[neighbor.y][neighbor.x] === Infinity) {
        closedList.add(neighborKey);
        continue;
      }


      const isDiagonal =
        neighbor.x !== currentNode.x && neighbor.y !== currentNode.y;
      const moveCost = isDiagonal ? DIAGONAL_COST : 1;
      const gScore =
        currentNode.g +
        costGrid[neighbor.y][neighbor.x] * moveCost;


      if (gScore < (gScores.get(neighborKey) || Infinity)) {
        gScores.set(neighborKey, gScore);
        const fScore = gScore + heuristic(neighbor, endNode);


        const openNeighbor = openList.find(
          (n) => n.x === neighbor.x && n.y === neighbor.y
        );
        if (openNeighbor) {
          openNeighbor.g = gScore;
          openNeighbor.f = fScore;
          openNeighbor.parent = currentNode;
        } else {
          openList.push({
            ...neighbor,
            g: gScore,
            f: fScore,
            parent: currentNode,
          });
        }
      }
    }
  }
  return null;
}


// 4. Coordinate conversions
function lonLatToGrid(lon, lat) {
  const x =
    ((lon - GRID_BOUNDS.minLon) /
      (GRID_BOUNDS.maxLon - GRID_BOUNDS.minLon)) *
    GRID_WIDTH;
  const y =
    ((GRID_BOUNDS.maxLat - lat) /
      (GRID_BOUNDS.maxLat - GRID_BOUNDS.minLat)) *
    GRID_HEIGHT; // inverted y


  const gx = Math.max(0, Math.min(Math.round(x), GRID_WIDTH - 1));
  const gy = Math.max(0, Math.min(Math.round(y), GRID_HEIGHT - 1));
  return { x: gx, y: gy };
}


function gridToLonLat(x, y) {
  const lon =
    (x / GRID_WIDTH) *
      (GRID_BOUNDS.maxLon - GRID_BOUNDS.minLon) +
    GRID_BOUNDS.minLon;
  const lat =
    GRID_BOUNDS.maxLat -
    (y / GRID_HEIGHT) *
      (GRID_BOUNDS.maxLat - GRID_BOUNDS.minLat);
  return [lon, lat];
}


// 5. Cost grid creation
function createCostGrid(landPolygons, icePolygons) {
  const grid = Array(GRID_HEIGHT)
    .fill(null)
    .map(() => Array(GRID_WIDTH).fill(OPEN_WATER_COST));


  // Step 1: mark land (Infinity)
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const [lon, lat] = gridToLonLat(x, y);


      for (const feature of landPolygons.features) {
        if (feature.geometry.type === "Polygon") {
          const polygon = feature.geometry.coordinates[0];
          if (isPointInPolygon([lon, lat], polygon)) {
            grid[y][x] = Infinity;
            break;
          }
        } else if (feature.geometry.type === "MultiPolygon") {
          let hit = false;
          for (const polygon of feature.geometry.coordinates) {
            if (isPointInPolygon([lon, lat], polygon[0])) {
              grid[y][x] = Infinity;
              hit = true;
              break;
            }
          }
          if (hit) break;
        }
      }
    }
  }


  // Step 2: overlay ice cost
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (grid[y][x] === Infinity) continue;
      const [lon, lat] = gridToLonLat(x, y);


      for (const feature of icePolygons.features || []) {
        if (!feature.geometry) continue;
        if (feature.geometry.type === "Polygon") {
          const polygon = feature.geometry.coordinates[0];
          if (isPointInPolygon([lon, lat], polygon)) {
            const iceValue = feature.properties?.value || 0;
            grid[y][x] =
              OPEN_WATER_COST + iceValue * ICE_COST_MULTIPLIER;
            break;
          }
        } else if (feature.geometry.type === "MultiPolygon") {
          let hit = false;
          for (const polygon of feature.geometry.coordinates) {
            if (isPointInPolygon([lon, lat], polygon[0])) {
              const iceValue = feature.properties?.value || 0;
              grid[y][x] =
                OPEN_WATER_COST + iceValue * ICE_COST_MULTIPLIER;
              hit = true;
              break;
            }
          }
          if (hit) break;
        }
      }
    }
  }


  return grid;
}


// 6. Lazy, one-time cost grid using ML ice GeoJSON if available
let costGridPromise = null;


function getCostGrid() {
  if (costGridPromise) {
    return costGridPromise;
  }


  costGridPromise = (async () => {
    console.log("[routing] building cost grid once…");


    // Try to use the ML-generated GeoJSON used by the ice layer
    const mlIce = await loadSampleJSON(
      "ice_concentration.latest.geojson"
    );


    const icePolygons =
      mlIce && mlIce.type === "FeatureCollection"
        ? mlIce
        : ICE_DATA; // fallback


    if (!mlIce) {
      console.warn(
        "[routing] ice_concentration.latest.geojson not found; using static ICE_DATA fallback"
      );
    }


    const grid = createCostGrid(LAND_DATA, icePolygons);
    console.log("[routing] cost grid ready.");
    return grid;
  })();


  return costGridPromise;
}


/* ------------------------------------------------------------------ */
/*  PUBLIC API                                                         */
/* ------------------------------------------------------------------ */


export const API = {
  BASE: "local-sample-data-only",


  WINDOWS: {
    HOURS_24: { label: "±12h", beforeHours: 12, afterHours: 12 },
    DAYS_6: { label: "±3d", beforeHours: 72, afterHours: 12 },
  },


  async listFrames({ beforeHours, afterHours }) {
    const data = await loadSampleJSON("frames.json");
    if (data?.frames?.length) return data;


    // fallback: generate hourly frames in a window
    const bh = Number.isFinite(beforeHours) ? beforeHours : 12;
    const ah = Number.isFinite(afterHours) ? afterHours : 12;
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    const start = new Date(now.getTime() - bh * 3600_000);
    const end = new Date(now.getTime() + ah * 3600_000);
    const frames = [];
    for (let t = start; t <= end; t = new Date(t.getTime() + 3600_000)) {
      frames.push(t.toISOString().replace(".000Z", "Z"));
    }
    return { frames };
  },


  async legend({ product, palette }) {
    const tryFiles = [
      `legend.${product}.${palette}.json`,
      `legend.${product}.json`,
      `legend.${product}.default.json`,
    ];
    for (const f of tryFiles) {
      const data = await loadSampleJSON(f);
      if (data?.breaks && data?.colors) return data;
    }


    // hard fallback
    return {
      title: product.replace(/_/g, " "),
      unit: product === "ice_thickness" ? "m" : "%",
      breaks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      labels: [
        "0",
        "10",
        "20",
        "30",
        "40",
        "50",
        "60",
        "70",
        "80",
        "90",
        "100",
      ],
      colors: [
        "#f7fbff",
        "#deebf7",
        "#c6dbef",
        "#9ecae1",
        "#6baed6",
        "#4292c6",
        "#2171b5",
        "#08519c",
        "#08306b",
        "#041b4d",
        "#02102e",
      ],
    };
  },


  async narrative({ isoTime }) {
    const data = await loadSampleJSON("narratives.json");
    const text = data?.[isoTime] || synthNarrative(isoTime);
    return { text };
  },


  /**
   * A* ROUTING:
   * - uses cost grid built from LAND_DATA + ice_concentration.latest.geojson
   * - land = Infinity cost (impassable)
   * - water cost = 1 + ice_value * ICE_COST_MULTIPLIER
   */
  async bestRoute({ startLon, startLat, destLon, destLat, vessel }) {
    let routeGeoJSON;
    let notes = `A* route (grid: ${GRID_WIDTH}x${GRID_HEIGHT}).`;


    try {
      const costGrid = await getCostGrid();


      const startNode = lonLatToGrid(startLon, startLat);
      const endNode = lonLatToGrid(destLon, destLat);


      if (costGrid[startNode.y][startNode.x] === Infinity) {
        throw new Error("Start point is on land.");
      }
      if (costGrid[endNode.y][endNode.x] === Infinity) {
        throw new Error("End point is on land.");
      }


      const pathNodes = findPathAStar(costGrid, startNode, endNode);
      if (!pathNodes) {
        throw new Error("No A* path found.");
      }


      const coordinates = pathNodes.map((node) =>
        gridToLonLat(node.x, node.y)
      );


      routeGeoJSON = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { role: "route" },
            geometry: { type: "LineString", coordinates },
          },
          {
            type: "Feature",
            properties: { role: "start" },
            geometry: {
              type: "Point",
              coordinates: [startLon, startLat],
            },
          },
          {
            type: "Feature",
            properties: { role: "dest" },
            geometry: {
              type: "Point",
              coordinates: [destLon, destLat],
            },
          },
        ],
      };
    } catch (e) {
      notes = `${e.message || "Routing error."} Showing straight line as fallback.`;
      routeGeoJSON = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { role: "route" },
            geometry: {
              type: "LineString",
              coordinates: [
                [startLon, startLat],
                [destLon, destLat],
              ],
            },
          },
          {
            type: "Feature",
            properties: { role: "start" },
            geometry: {
              type: "Point",
              coordinates: [startLon, startLat],
            },
          },
          {
            type: "Feature",
            properties: { role: "dest" },
            geometry: {
              type: "Point",
              coordinates: [destLon, destLat],
            },
          },
        ],
      };
    }


    return { route: routeGeoJSON, notes };
  },
};


/* ------------------------------------------------------------------ */
/*  MAP DEFAULTS                                                      */
/* ------------------------------------------------------------------ */


export const MAP = {
  STYLE:
    import.meta.env.VITE_MAP_STYLE ||
    "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  FALLBACK_STYLE: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
  },
  CENTER: [-85.0, 45.0],
  ZOOM: 5,
};



