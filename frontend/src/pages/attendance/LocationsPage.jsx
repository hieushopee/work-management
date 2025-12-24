import React, { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../../api/attendance";

const LocationModal = ({ open, onClose, onSubmit, editing }) => {
  const [form, setForm] = useState({
    name: "",
    radius: "",
    lat: "",
    lng: "",
    search: "",
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || "",
        radius: editing.radiusMeters || "",
        lat:
          editing.latitude !== undefined && editing.latitude !== null
            ? String(editing.latitude)
            : "",
        lng:
          editing.longitude !== undefined && editing.longitude !== null
            ? String(editing.longitude)
            : "",
        search: editing.name || "",
      });
    } else {
      setForm({
        name: "",
        radius: "",
        lat: "",
        lng: "",
        search: "",
      });
    }
  }, [editing]);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const searchFormRef = useRef(null);
  const locatingRef = useRef(false);

  const parseCoords = (lat, lng) => {
    const la = parseFloat(lat);
    const lo = parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(lo)) return null;
    return { lat: la, lng: lo };
  };

    // Common function to update map/marker/circle
  const updateMapPosition = useCallback(
    (lat, lng, radiusValue) => {
      if (!mapRef.current || lat == null || lng == null) return;

      const position = [lat, lng]; // Leaflet: [lat, lng]
      const radius = Number(radiusValue);

      // Update marker
      if (markerRef.current) {
        markerRef.current.setLatLng(position);
      } else if (window.L) {
        markerRef.current = window.L.marker(position).addTo(mapRef.current);
      }

      // Update circle
      if (!Number.isNaN(radius) && radius > 0) {
        if (circleRef.current) {
          circleRef.current.setLatLng(position);
          circleRef.current.setRadius(radius);
        } else {
          circleRef.current = window.L.circle(position, {
            radius,
            color: "blue",
            fillColor: "#7c3aed33",
            fillOpacity: 0.3,
          }).addTo(mapRef.current);
        }
      } else if (circleRef.current) {
        mapRef.current.removeLayer(circleRef.current);
        circleRef.current = null;
      }

      // Update view
      mapRef.current.setView(position, mapRef.current.getZoom() || 16);
    },
    []
  );

  // Get current location to display default map when opening create modal
  useEffect(() => {
    if (!open) return;
    if (editing) return;

    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords || {};
          if (!latitude || !longitude) return;

          const lat = Number(latitude.toFixed(7));
          const lng = Number(longitude.toFixed(7));

          setForm((prev) => ({
            ...prev,
            lat: String(lat),
            lng: String(lng),
          }));

          // If map is ready, update immediately
          updateMapPosition(lat, lng, form.radius);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!open || !mapContainerRef.current) return;

    let cancelled = false;

    (async () => {
      // Import Leaflet once
      const leafletModule = await import("leaflet");
      const L = leafletModule.default || leafletModule;
      // Attach to window to use in updateMapPosition
      if (!window.L) window.L = L;

      const initialCoords =
        parseCoords(
          editing?.latitude ?? editing?.lat,
          editing?.longitude ?? editing?.lng
        ) ||
        parseCoords(form.lat, form.lng) || {
          lat: 16.0678,
          lng: 108.2208,
        };

      if (cancelled) return;

      const map = L.map(mapContainerRef.current).setView(
        [initialCoords.lat, initialCoords.lng],
        16
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      // Scale down default zoom control
      L.control
        .zoom({ position: "topleft" })
        .setPosition("topleft");
      const zoomControl = map.zoomControl;
      if (zoomControl?._container) {
        zoomControl._container.classList.add("!scale-90", "!origin-top-left");
      }

      const icon = L.icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      markerRef.current = L.marker(
        [initialCoords.lat, initialCoords.lng],
        { icon }
      ).addTo(map);

      mapRef.current = map;

      // Initialize circle if radius exists
      const initialRadius = Number(form.radius);
      if (!Number.isNaN(initialRadius) && initialRadius > 0) {
        circleRef.current = L.circle(
          [initialCoords.lat, initialCoords.lng],
          {
            radius: initialRadius,
            color: "blue",
            fillColor: "#7c3aed33",
            fillOpacity: 0.3,
          }
        ).addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [open, editing, form.lat, form.lng, form.radius, parseCoords, updateMapPosition]);

  const goToCurrentPosition = () => {
    // Current location button was requested to be removed, kept empty
  };

  // Update marker/circle when lat/lng/radius changes (fallback to ensure sync)
  useEffect(() => {
    if (!mapRef.current) return;
    const coords =
      parseCoords(form.lat, form.lng) ||
      parseCoords(
        editing?.latitude ?? editing?.lat,
        editing?.longitude ?? editing?.lng
      );

    if (!coords) return;

    updateMapPosition(coords.lat, coords.lng, form.radius);
  }, [form.lat, form.lng, form.radius, editing, parseCoords, updateMapPosition]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-text-main">
            {editing ? "Update attendance location" : "Create attendance location"}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">
                Location name *
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Location name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">
                Allowed radius (m)
              </label>
              <input
                value={form.radius}
                onChange={(e) =>
                  setForm((p) => ({ ...p, radius: e.target.value }))
                }
                className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 50"
              />
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            * Recommendation: Set the allowed radius to 25m or more to improve accuracy.
          </p>

          <div className="rounded-xl border border-border-light overflow-hidden">
            <div className="h-96 bg-bg-hover flex flex-col">
              <div className="relative flex-1 border-t border-border-light">
                <div ref={mapContainerRef} className="absolute inset-0" />
                <form
                  ref={searchFormRef}
                  className="absolute top-3 left-12 z-[401] flex items-center bg-white/90 backdrop-blur rounded-full shadow px-3 py-1.5 gap-2 border border-border-light"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (form.search?.includes(",")) {
                      const [latStr, lngStr] = form.search
                        .split(",")
                        .map((s) => s.trim());
                      const la = parseFloat(latStr);
                      const lo = parseFloat(lngStr);
                      if (!Number.isNaN(la) && !Number.isNaN(lo)) {
                        setForm((p) => ({
                          ...p,
                          lat: latStr,
                          lng: lngStr,
                        }));
                        updateMapPosition(la, lo, form.radius);
                        return;
                      }
                    }
                    if (form.lat && form.lng) return;
                    alert("Enter coordinates in 'lat, lng' format (e.g. 12.813905, 108.549658)");
                  }}
                >
                  <input
                    value={form.search}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, search: e.target.value }))
                    }
                    placeholder="12.813905, 108.549658"
                    className="w-48 px-2 py-1 text-sm focus:outline-none bg-transparent"
                  />
                  <button
                    type="submit"
                    className="w-6 h-6 inline-flex items-center justify-center text-text-secondary hover:text-primary"
                    title="Search coordinates"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <line
                        x1="16.65"
                        y1="16.65"
                        x2="21"
                        y2="21"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-secondary">
            * You can set the latitude and longitude manually if the map is not suitable.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">
                Latitude
              </label>
              <input
                value={form.lat}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lat: e.target.value.trim() }))
                }
                className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 12.813905"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">
                Longitude
              </label>
              <input
                value={form.lng}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lng: e.target.value.trim() }))
                }
                className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 108.549658"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-main border border-border-light rounded-lg hover:bg-bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSubmit?.({
                name: form.name,
                radiusMeters: Number(form.radius) || 50,
                latitude: Number(form.lat),
                longitude: Number(form.lng),
              })
            }
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover"
          >
            {editing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

const LocationsPage = () => {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchLocations();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load locations error", err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    try {
      if (editing?._id || editing?.id) {
        await updateLocation(editing._id || editing.id, payload);
      } else {
        await createLocation(payload);
      }
      setOpenModal(false);
      setEditing(null);
      load();
    } catch (err) {
      console.error("Save location error", err);
      alert("Cannot save location");
    }
  };

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Locations</h1>
          <p className="text-text-secondary">
            Manage allowed attendance locations (name, radius, longitude/latitude).
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setOpenModal(true);
          }}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow inline-flex items-center gap-2 hover:bg-primary-hover"
        >
          <Plus className="w-4 h-4" />
          Add new
        </button>
      </div>

      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm space-y-4">
        <div className="rounded-xl border border-border-light overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-text-main">
                  Location name
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">
                  Map position
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">
                  Allowed radius
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">
                  Employees allowed
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">
                  Updated at
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr
                  key={`${row._id || row.id || idx}`}
                  className="hover:bg-bg-secondary"
                >
                  <td className="px-3 py-3 text-primary font-semibold">
                    {row.name}
                  </td>
                  <td className="px-3 py-3 text-primary underline cursor-pointer">
                    <button
                      type="button"
                      className="underline text-primary hover:text-primary-hover"
                      onClick={() => {
                        setEditing(row);
                        setOpenModal(true);
                      }}
                    >
                      Click to open map
                    </button>
                  </td>
                  <td className="px-3 py-3 text-text-main">
                    {row.radiusMeters ? `${row.radiusMeters}m` : "—"}
                  </td>
                  <td className="px-3 py-3 text-text-main">
                    {Array.isArray(row.allowedEmployees)
                      ? row.allowedEmployees.length
                      : 0}{" "}
                    employees
                  </td>
                  <td className="px-3 py-3 text-text-main">
                    {row.updatedAt
                      ? new Date(row.updatedAt).toLocaleDateString("en-US")
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-text-main">
                    <div className="flex items-center gap-3">
                      <button
                        className="text-primary hover:text-primary-hover"
                        onClick={() => {
                          setEditing(row);
                          setOpenModal(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="text-red-500 hover:text-red-600"
                        onClick={() => {
                          if (window.confirm("Delete this location?")) {
                            deleteLocation(row._id || row.id)
                              .then(load)
                              .catch(() => alert("Cannot delete"));
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LocationModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        editing={editing}
      />
    </div>
  );
};

export default LocationsPage;
