// src/tabs/components/profiles/MapPickerModal.jsx
import React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClickHandler({ position, onPick }) {
  useMapEvents({
    click(e) {
      onPick({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  return position ? <Marker position={position} /> : null;
}

async function reverseGeocode(lat, lng) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error("Failed to fetch location name.");
  const json = await res.json();

  return {
    address:
      json?.display_name ||
      `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`,
  };
}

export default function MapPickerModal({
  open,
  initialLat,
  initialLng,
  onClose,
  onApply,
}) {
  const fallbackCenter = React.useMemo(() => [27.4728, 89.639], []);
  const initialPosition = React.useMemo(() => {
    const lat = Number(initialLat);
    const lng = Number(initialLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }, [initialLat, initialLng]);

  const [picked, setPicked] = React.useState(initialPosition);
  const [loadingAddress, setLoadingAddress] = React.useState(false);
  const [resolvedAddress, setResolvedAddress] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setPicked(initialPosition);
    setResolvedAddress("");
    setError("");
  }, [open, initialPosition]);

  React.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleResolveAddress = React.useCallback(async () => {
    if (!picked) {
      setError("Please click on the map to choose a location.");
      return;
    }

    setError("");
    setLoadingAddress(true);
    try {
      const out = await reverseGeocode(picked.lat, picked.lng);
      setResolvedAddress(out.address || "");
    } catch (e) {
      setError(e?.message || "Failed to get address from map.");
    } finally {
      setLoadingAddress(false);
    }
  }, [picked]);

  const handleApply = React.useCallback(async () => {
    if (!picked) {
      setError("Please click on the map to choose a location.");
      return;
    }

    let address = resolvedAddress;

    if (!address) {
      try {
        setLoadingAddress(true);
        const out = await reverseGeocode(picked.lat, picked.lng);
        address = out.address || "";
      } catch {
        address = `${Number(picked.lat).toFixed(6)}, ${Number(picked.lng).toFixed(6)}`;
      } finally {
        setLoadingAddress(false);
      }
    }

    onApply?.({
      latitude: String(picked.lat),
      longitude: String(picked.lng),
      address,
    });
  }, [onApply, picked, resolvedAddress]);

  if (!open) return null;

  return (
    <div className="pfImageModal" onClick={onClose}>
      <div
        className="pfMapModalCard"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pick business location from map"
      >
        <button
          type="button"
          className="pfImageModalClose"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          ×
        </button>

        <div className="pfMapModalHead">
          <div>
            <h3 className="pfCardTitle">Pick Location From Map</h3>
            <p className="pfCardSub">
              Click anywhere on the map to select the business location.
            </p>
          </div>
        </div>

        <div className="pfMapWrap">
          <MapContainer
            center={
              picked
                ? [picked.lat, picked.lng]
                : initialPosition
                  ? [initialPosition.lat, initialPosition.lng]
                  : fallbackCenter
            }
            zoom={picked || initialPosition ? 16 : 13}
            scrollWheelZoom
            className="pfLeafletMap"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler position={picked} onPick={setPicked} />
          </MapContainer>
        </div>

        <div className="pfMapInfoGrid">
          <div className="pfField">
            <label className="pfLabel">Latitude</label>
            <input
              className="pfInput"
              readOnly
              value={picked?.lat ? String(picked.lat) : ""}
              placeholder="Pick from map"
            />
          </div>

          <div className="pfField">
            <label className="pfLabel">Longitude</label>
            <input
              className="pfInput"
              readOnly
              value={picked?.lng ? String(picked.lng) : ""}
              placeholder="Pick from map"
            />
          </div>

          <div className="pfField pfFieldFull">
            <label className="pfLabel">Resolved Address</label>
            <input
              className="pfInput"
              readOnly
              value={resolvedAddress}
              placeholder="Use 'Get Address' or Apply directly"
            />
          </div>
        </div>

        {error ? <div className="pfNotice error">{error}</div> : null}

        <div className="pfActions pfMapActions">
          <button
            type="button"
            className="pfGhostBtn"
            onClick={handleResolveAddress}
            disabled={loadingAddress}
          >
            {loadingAddress ? "Getting..." : "Get Address"}
          </button>

          <button
            type="button"
            className="pfPrimaryBtn"
            onClick={handleApply}
            disabled={loadingAddress}
          >
            Use This Location
          </button>
        </div>
      </div>
    </div>
  );
}
