from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import xarray as xr

# --------------------------------------------------------------
# Paths (run from project root with:  python -m ml.train_and_export)
# --------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

TRAIN_GLSEA = DATA / "train" / "glsea_20190111-20190131.nc"
TEST_GLSEA = DATA / "test" / "glsea_ice_test_initial_condition.nc"

OUT_DIR = ROOT / "src" / "sample_data"

# 4 forecast days you want in the UI
FORECAST_TIMES = [
    "2025-02-10T00:00:00Z",
    "2025-02-11T00:00:00Z",
    "2025-02-12T00:00:00Z",
    "2025-02-13T00:00:00Z",
]


# --------------------------------------------------------------
# 1. Fit global AR(1) model on GLSEA temps
# --------------------------------------------------------------
def fit_ar1_from_glsea(glsea_path: Path) -> tuple[float, float]:
    print(f"Loading training GLSEA from {glsea_path}")
    ds = xr.open_dataset(glsea_path, decode_times=False)

    # Training variable is 'temp' (see GLSEA README)
    temp = ds["temp"].astype("float32")  # (time, y, x)
    arr = temp.values

    # Treat crazy values as NaN
    arr = np.where(arr < -50.0, np.nan, arr)

    t, ny, nx = arr.shape
    x = arr[:-1].reshape((t - 1, ny * nx))
    y = arr[1:].reshape((t - 1, ny * nx))

    mask = np.isfinite(x) & np.isfinite(y)
    x_valid = x[mask]
    y_valid = y[mask]

    if x_valid.size < 2:
        raise RuntimeError("Not enough valid points to fit AR(1)")

    A = np.vstack([x_valid, np.ones_like(x_valid)]).T
    alpha, beta = np.linalg.lstsq(A, y_valid, rcond=None)[0]

    print("Fitting global AR(1) model (T_{t+1} = alpha * T_t + beta)...")
    print(f"  alpha = {alpha:.4f}, beta = {beta:.4f}")
    return float(alpha), float(beta)


# --------------------------------------------------------------
# 2. Forecast SST forward from the test initial condition
# --------------------------------------------------------------
def forecast_sst(alpha: float, beta: float, sst0: xr.DataArray, steps: int = 4):
    """
    alpha, beta: AR(1) coefficients
    sst0: xr.DataArray 2D (lat, lon)
    returns list[xr.DataArray] of length `steps`
    """
    fields: list[xr.DataArray] = []
    current = sst0.astype("float32").copy()
    for _ in range(steps):
        current = alpha * current + beta
        fields.append(current.copy(deep=True))
    return fields


# --------------------------------------------------------------
# 3. Heuristic SST -> ice fields mapping
# --------------------------------------------------------------
def sst_to_ice_fields(sst: np.ndarray, lake_mask: np.ndarray | None = None):
    """
    Map SST (°C) to:
      - ice_cover [%]
      - ice_thickness [m]
      - ice_type (0,10,40,70,95)

    lake_mask: optional boolean mask of "water" cells;
               outside the mask values are set to NaN.
    """
    sst = np.array(sst, dtype="float32")

    # Only water colder than 0°C contributes to ice; -2°C -> 100% ice
    ice_frac = np.clip(-sst / 2.0, 0.0, 1.0)  # 0..1

    ice_cover = (100.0 * ice_frac).astype("float32")   # 0–100 %
    ice_thickness = (3.0 * ice_frac).astype("float32") # 0–3 m

    # ice_type expressed as ordinal values matching your legend [0,10,40,70,95]
    ice_type = np.zeros_like(ice_cover, dtype="float32")
    ice_type = np.where(ice_thickness > 0.05, 10, ice_type)   # new/grey
    ice_type = np.where(ice_thickness > 0.30, 40, ice_type)   # first-year
    ice_type = np.where(ice_thickness > 1.00, 70, ice_type)   # thick first-year
    ice_type = np.where(ice_thickness > 1.80, 95, ice_type)   # multi-year-ish

    if lake_mask is not None:
        ice_cover = np.where(lake_mask, ice_cover, np.nan)
        ice_thickness = np.where(lake_mask, ice_thickness, np.nan)
        ice_type = np.where(lake_mask, ice_type, np.nan)

    return ice_cover, ice_thickness, ice_type


# --------------------------------------------------------------
# 4. Convert a 2D field to coarse polygons with a `time` property
#    using only the GLSEA water mask
# --------------------------------------------------------------
def field_to_polygons(
    field: np.ndarray,
    lat_1d: np.ndarray,
    lon_1d: np.ndarray,
    time_str: str,
    stride: int = 12,
    min_abs: float = 0.01,
):
    """
    Convert a 2D field (lat, lon) into coarse polygons.

    field   : 2D numpy array [lat, lon] with NaNs outside lakes
    lat_1d  : 1D lat array (size = field.shape[0])
    lon_1d  : 1D lon array (size = field.shape[1])
    time_str: ISO timestamp string to store in properties.time
    stride  : native cells per coarse block (same both directions)
    """
    ny, nx = field.shape
    assert ny == lat_1d.size and nx == lon_1d.size

    feats = []
    fid = 0

    # Assume lat_1d and lon_1d are monotonic; treat them as centres.
    dlat = float(lat_1d[1] - lat_1d[0])
    dlon = float(lon_1d[1] - lon_1d[0])

    for j0 in range(0, ny, stride):
        j1 = min(j0 + stride, ny)
        for i0 in range(0, nx, stride):
            i1 = min(i0 + stride, nx)

            block = field[j0:j1, i0:i1]
            if not np.isfinite(block).any():
                # Entire block is land / NaN
                continue

            v = float(np.nanmean(block))
            if not np.isfinite(v) or abs(v) < min_abs:
                continue

            # Use outer cell centres ± 0.5 * step as approximate corners
            lat_min = float(lat_1d[j0] - 0.5 * dlat)
            lat_max = float(lat_1d[j1 - 1] + 0.5 * dlat)
            lon_min = float(lon_1d[i0] - 0.5 * dlon)
            lon_max = float(lon_1d[i1 - 1] + 0.5 * dlon)

            coords = [[
                [lon_min, lat_min],
                [lon_max, lat_min],
                [lon_max, lat_max],
                [lon_min, lat_max],
                [lon_min, lat_min],
            ]]

            feats.append({
                "type": "Feature",
                "id": fid,
                "properties": {
                    "time": time_str,
                    "value": v,
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": coords,
                },
            })
            fid += 1

    return feats


# --------------------------------------------------------------
# 5. Main: train, forecast 4 days, export multi-day GeoJSON
# --------------------------------------------------------------
def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1) Fit AR(1) on training GLSEA
    alpha, beta = fit_ar1_from_glsea(TRAIN_GLSEA)

    # 2) Load test GLSEA initial condition (has lat, lon, sst)
    print(f"Loading test GLSEA from {TEST_GLSEA}")
    ds_init = xr.open_dataset(TEST_GLSEA, decode_times=False)
    sst0 = ds_init["sst"].astype("float32")  # (lat, lon)
    print(f"Initial SST range: {float(sst0.min())} → {float(sst0.max())}")

    lat_1d = ds_init["lat"].values
    lon_1d = ds_init["lon"].values

    # Lake mask straight from GLSEA: wherever SST is finite we call it water
    lake_mask = np.isfinite(sst0.values)
    coverage = lake_mask.mean()
    print(f"GLSEA lake coverage fraction: {coverage:.3f}")

    # 3) Forecast SST forward 4 steps
    print("Forecasting SST forward 4 daily steps from initial test field...")
    sst_forecasts = forecast_sst(alpha, beta, sst0, steps=len(FORECAST_TIMES))

    all_cover_feats = []
    all_thick_feats = []
    all_type_feats = []

    # One knob to control resolution: smaller stride = finer grid, more polygons
    BASE_STRIDE = 5  # try 8 or 5 if you want even finer

    for step_idx, (sst_da, iso_time) in enumerate(zip(sst_forecasts, FORECAST_TIMES)):
        print(f"  Step {step_idx}: {iso_time}")
        ice_cover, ice_thickness, ice_type = sst_to_ice_fields(
            sst_da.values, lake_mask=lake_mask
        )

        # ice_concentration
        cover_feats = field_to_polygons(
            ice_cover, lat_1d, lon_1d,
            time_str=iso_time,
            stride=BASE_STRIDE,
            min_abs=1.0,   # at least 1% cover
        )
        for f in cover_feats:
            f["properties"]["product"] = "ice_concentration"
            f["properties"]["step"] = step_idx
        all_cover_feats.extend(cover_feats)

        # ice_thickness
        thick_feats = field_to_polygons(
            ice_thickness, lat_1d, lon_1d,
            time_str=iso_time,
            stride=BASE_STRIDE,
            min_abs=0.01,  # at least 1 cm
        )
        for f in thick_feats:
            f["properties"]["product"] = "ice_thickness"
            f["properties"]["step"] = step_idx
        all_thick_feats.extend(thick_feats)

        # ice_type
        type_feats = field_to_polygons(
            ice_type, lat_1d, lon_1d,
            time_str=iso_time,
            stride=BASE_STRIDE,
            min_abs=5.0,   # ignore vanishing amounts
        )
        for f in type_feats:
            f["properties"]["product"] = "ice_type"
            f["properties"]["step"] = step_idx
        all_type_feats.extend(type_feats)

    conc_fc = {"type": "FeatureCollection", "features": all_cover_feats}
    thick_fc = {"type": "FeatureCollection", "features": all_thick_feats}
    type_fc = {"type": "FeatureCollection", "features": all_type_feats}

    conc_path = OUT_DIR / "ice_concentration.latest.geojson"
    thick_path = OUT_DIR / "ice_thickness.latest.geojson"
    type_path = OUT_DIR / "ice_type.latest.geojson"

    print(f"Exporting multi-day GeoJSON to {OUT_DIR} ...")
    for path, fc in [
        (conc_path, conc_fc),
        (thick_path, thick_fc),
        (type_path, type_fc),
    ]:
        with path.open("w") as f:
            json.dump(fc, f)
        print("  ->", path)

    # Frames file for the React time slider
    frames_path = OUT_DIR / "frames.json"
    with frames_path.open("w") as f:
        json.dump({"frames": FORECAST_TIMES}, f, indent=2)
    print("Also wrote frames file:", frames_path)


if __name__ == "__main__":
    main()
