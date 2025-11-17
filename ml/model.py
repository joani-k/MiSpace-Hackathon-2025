# ml/model.py
#
# Lightweight baseline:
# 1) Fit a global AR(1) model on GLSEA temps:
#       T_{t+1} = alpha * T_t + beta
# 2) Learn a simple lookup from SST -> (ice_cover, ice_thickness)
#    using the initial-condition pair (GLSEA + NIC ice).
# 3) Convert forecast ice fields into GeoJSON polygons that the
#    React map can render for multiple forecast times.

from dataclasses import dataclass
import math
from typing import Iterable, Sequence

import numpy as np
import xarray as xr


# ---------------------------------------------------------------------
# 1. Global AR(1) model for GLSEA temperatures
# ---------------------------------------------------------------------


@dataclass
class AR1GLSEAModel:
    """
    Single global AR(1) relation:

        T_{t+1} = alpha * T_t + beta

    learned from all grid cells and times in the training dataset.
    """

    alpha: float
    beta: float

    @classmethod
    def fit(cls, train_ds: xr.Dataset, var: str = "temp") -> "AR1GLSEAModel":
        """
        Fit a single global AR(1) relationship using the variable `var`
        from the training dataset.

        Parameters
        ----------
        train_ds : xr.Dataset
            Training GLSEA dataset
        var : str
            Variable name for SST (default "temp")
        """
        da = train_ds[var].astype("float32")  # (time, y, x) or (time, lat, lon)

        x = da.isel(time=slice(0, -1)).values.ravel()
        y = da.isel(time=slice(1, None)).values.ravel()

        mask = np.isfinite(x) & np.isfinite(y)
        x = x[mask]
        y = y[mask]

        if x.size < 2:
            raise ValueError("Not enough valid points to fit AR(1) model")

        x_mean = float(x.mean())
        y_mean = float(y.mean())

        cov = float(((x - x_mean) * (y - y_mean)).mean())
        varx = float(((x - x_mean) ** 2).mean())
        eps = 1e-6

        if varx <= eps:
            alpha = 0.0
        else:
            alpha = cov / (varx + eps)

        beta = y_mean - alpha * x_mean

        return cls(alpha=float(alpha), beta=float(beta))

    def step(self, field: np.ndarray) -> np.ndarray:
        """Advance a 2-D SST field by one time step."""
        return self.alpha * field + self.beta

    def forecast_array(self, initial: np.ndarray, steps: int) -> np.ndarray:
        """
        Run the AR(1) model forward for `steps` time steps.

        Parameters
        ----------
        initial : 2-D numpy array (lat, lon)
        steps   : number of steps to forecast

        Returns
        -------
        np.ndarray of shape (steps, lat, lon)
        """
        current = initial.astype("float32")
        outs = []
        for _ in range(steps):
            current = self.step(current)
            outs.append(current.copy())
        return np.stack(outs, axis=0)


# ---------------------------------------------------------------------
# 2. SST -> (ice_cover, ice_thickness, ice_type) lookup
# ---------------------------------------------------------------------


@dataclass
class SstIceLookup:
    """
    1-D lookup from SST -> (mean ice cover, mean ice thickness).

    We bin SST and compute mean ice cover & thickness in each bin from
    the initial-condition pair (GLSEA SST + NIC ice fields).
    """

    bin_edges: np.ndarray  # size N+1
    cover_lut: np.ndarray  # size N
    thick_lut: np.ndarray  # size N

    @classmethod
    def from_initial(
        cls,
        sst_da: xr.DataArray,
        cover_da: xr.DataArray,
        thick_da: xr.DataArray,
        bin_width: float = 0.25,
    ) -> "SstIceLookup":
        """
        Build a 1-D lookup from SST to mean ice cover and thickness.

        Parameters
        ----------
        sst_da   : xr.DataArray
            GLSEA SST at t0
        cover_da : xr.DataArray
            NIC ice concentration (%) at t0
        thick_da : xr.DataArray
            NIC ice thickness (cm) at t0
        bin_width : float
            SST bin width in degrees C
        """
        sst = sst_da.values
        cover = cover_da.values
        thick = thick_da.values

        mask = np.isfinite(sst) & np.isfinite(cover) & np.isfinite(thick)

        sst_flat = sst[mask]
        cover_flat = cover[mask]
        thick_flat = thick[mask]

        if sst_flat.size == 0:
            raise ValueError("No valid training points for SST→ice mapping")

        s_min = float(np.floor(sst_flat.min() / bin_width) * bin_width)
        s_max = float(np.ceil(sst_flat.max() / bin_width) * bin_width)

        edges = np.arange(s_min, s_max + bin_width, bin_width, dtype="float32")
        nb = edges.size - 1

        cover_lut = np.zeros(nb, dtype="float32")
        thick_lut = np.zeros(nb, dtype="float32")

        prev = (0.0, 0.0)
        for i in range(nb):
            lo, hi = edges[i], edges[i + 1]
            sel = (sst_flat >= lo) & (sst_flat < hi)

            if np.any(sel):
                cover_lut[i] = float(np.nanmean(cover_flat[sel]))
                thick_lut[i] = float(np.nanmean(thick_flat[sel]))
                prev = (cover_lut[i], thick_lut[i])
            else:
                # If no data in this bin, carry forward last non-empty bin
                cover_lut[i], thick_lut[i] = prev

        return cls(bin_edges=edges, cover_lut=cover_lut, thick_lut=thick_lut)

    @staticmethod
    def _classify_from_thickness(thick_cm: np.ndarray) -> np.ndarray:
        """
        Convert thickness [cm] into coarse ice-type categories that match
        your legend for "Ice type":

          0   → Open water
          10  → New/grey
          40  → First-year
          70  → Thick first-year
          95  → Multi-year
        """
        t = np.zeros_like(thick_cm, dtype="float32")

        # Thresholds are approximate, just for demo
        t[(thick_cm > 0) & (thick_cm < 10)] = 10       # New/grey
        t[(thick_cm >= 10) & (thick_cm < 30)] = 40     # First-year
        t[(thick_cm >= 30) & (thick_cm < 70)] = 70     # Thick first-year
        t[thick_cm >= 70] = 95                         # Multi-year

        return t

    def apply_to_da(self, sst_da: xr.DataArray):
        """
        Map a forecast SST field to (ice_cover, ice_thickness, ice_type)
        as xarray DataArrays on the same grid.
        """
        sst = sst_da.values
        flat = sst.ravel()

        idx = np.digitize(flat, self.bin_edges) - 1
        idx = np.clip(idx, 0, len(self.cover_lut) - 1)

        cover_vals = self.cover_lut[idx].reshape(sst.shape)
        thick_vals = self.thick_lut[idx].reshape(sst.shape)

        type_vals = self._classify_from_thickness(thick_vals)

        mask = ~np.isfinite(sst)
        cover_vals[mask] = np.nan
        thick_vals[mask] = np.nan
        type_vals[mask] = np.nan

        coords = sst_da.coords
        dims = sst_da.dims

        cover_da = xr.DataArray(
            cover_vals, coords=coords, dims=dims, name="ice_cover"
        )
        thick_da = xr.DataArray(
            thick_vals, coords=coords, dims=dims, name="ice_thickness"
        )
        type_da = xr.DataArray(
            type_vals, coords=coords, dims=dims, name="ice_type"
        )

        return cover_da, thick_da, type_da


# ---------------------------------------------------------------------
# 3. Grid → GeoJSON exporter (multi-day)
# ---------------------------------------------------------------------


def _lat_lon_2d(da: xr.DataArray):
    """
    Infer 2-D latitude and longitude arrays from DataArray coordinates.
    Works with:
      - lat/lon 1-D coords (will meshgrid)
      - lat/lon already 2-D
      - or y/x named coords
    """
    lat_name = None
    lon_name = None

    for cand in ("lat", "latitude", "y"):
        if cand in da.coords:
            lat_name = cand
            break

    for cand in ("lon", "longitude", "x"):
        if cand in da.coords:
            lon_name = cand
            break

    if lat_name is None or lon_name is None:
        raise ValueError("Could not find lat/lon coordinates on DataArray")

    lat = da[lat_name].values
    lon = da[lon_name].values

    if lat.ndim == 1 and lon.ndim == 1:
        lat2d, lon2d = np.meshgrid(lat, lon, indexing="ij")
    elif lat.ndim == 2 and lon.ndim == 2:
        lat2d, lon2d = lat, lon
    else:
        raise ValueError("Unexpected lat/lon shapes")

    return lat2d, lon2d


def da_to_geojson(
    da: xr.DataArray,
    *,
    product: str,
    times: Sequence[str],
    stride: int = 1,
    land_threshold: float = -900.0,
) -> dict:
    """
    Convert a 3-D field (time, y, x) into polygons for *all* forecast times.

    Each feature gets:
      properties: { time: ISO8601 string, value, product, step }

    IMPORTANT:
    - We **keep 0-value cells** (e.g. 0% ice) so the lakes look filled.
    - We only drop NaNs or very negative sentinel values (≤ land_threshold).

    Parameters
    ----------
    da : xr.DataArray
        3-D array (time, y, x) on a lat/lon grid.
    product : str
        'ice_concentration', 'ice_thickness', or 'ice_type'
    times : sequence of str
        ISO8601 timestamps, len(times) == da.sizes["time"]
    stride : int
        Subsampling stride (1 = full resolution, 2 = every other cell, etc.)
    land_threshold : float
        Values ≤ this are treated as land/missing and dropped.
    """
    if "time" not in da.dims:
        raise ValueError("da_to_geojson expects a DataArray with a 'time' dimension")

    nt = da.sizes["time"]
    if len(times) != nt:
        raise ValueError(f"times length {len(times)} != da.time length {nt}")

    # Get 2-D lat/lon for cell corners
    lat2d, lon2d = _lat_lon_2d(da.isel(time=0))

    # Basic spatial shape
    ny, nx = da.isel(time=0).shape

    features = []
    fid = 0

    for t_idx, iso_time in enumerate(times):
        frame = da.isel(time=t_idx).values  # (ny, nx)

        for i in range(0, ny - 1, stride):
            for j in range(0, nx - 1, stride):
                val = float(frame[i, j])

                # Skip obvious missing / land, but KEEP 0's (open water)
                if not math.isfinite(val):
                    continue
                if val <= land_threshold:
                    continue

                # For ice_type, snap into discrete legend bins
                if product == "ice_type":
                    if val < 5:
                        val = 0.0
                    elif val < 25:
                        val = 10.0
                    elif val < 55:
                        val = 40.0
                    elif val < 85:
                        val = 70.0
                    else:
                        val = 95.0

                # Build polygon from cell "corners" using neighbouring grid points
                poly = [
                    [float(lon2d[i, j]),     float(lat2d[i, j])],
                    [float(lon2d[i, j + 1]), float(lat2d[i, j + 1])],
                    [float(lon2d[i + 1, j + 1]), float(lat2d[i + 1, j + 1])],
                    [float(lon2d[i + 1, j]), float(lat2d[i + 1, j])],
                    [float(lon2d[i, j]),     float(lat2d[i, j])],
                ]

                features.append(
                    {
                        "type": "Feature",
                        "id": fid,
                        "properties": {
                            "time": iso_time,
                            "value": val,
                            "product": product,
                            "step": t_idx,
                        },
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [poly],
                        },
                    }
                )
                fid += 1

    return {"type": "FeatureCollection", "features": features}
