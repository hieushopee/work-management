import React, { useEffect, useMemo, useState, useRef } from "react";
import { MapPin, CheckCircle, Clock, Smartphone, XCircle } from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  fetchDeviceRequests,
  fetchLocations,
  submitCheckin,
  submitCheckout,
  fetchLogs,
  createDeviceRequest,
} from "../../api/attendance";
import useUserStore from "../../stores/useUserStore";
import CameraBox from "../../components/CameraBox";
import { useNavigate } from "react-router-dom";

// Format time HH:MM:SS
const formatTime = (date) => {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

// Format date
const formatDate = (date) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[date.getDay()];
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${dayName}, ${d}/${m}/${y}`;
};

const CheckinCheckoutPage = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [myLocations, setMyLocations] = useState([]);
  const [myDeviceId, setMyDeviceId] = useState("");
  const [myShift, setMyShift] = useState(null);
  const [checkForm, setCheckForm] = useState({
    locationId: "",
    photos: ["", "", "", ""],
  });
  const [checkedIn, setCheckedIn] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [gpsDistance, setGpsDistance] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showMap, setShowMap] = useState(false);
  const [openCamera, setOpenCamera] = useState(false);
  const [userCoords, setUserCoords] = useState(null); // lưu vị trí GPS của người dùng
  const [todayLogs, setTodayLogs] = useState([]);
  const lastPhotoRef = useRef("");
  const pendingActionRef = useRef(null); // "checkin" | "checkout"
  const locatingRef = useRef(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null); // Location marker (company)
  const circleRef = useRef(null); // Radius circle
  const userMarkerRef = useRef(null); // User's current position
  const defaultCenter = useMemo(() => ({ lat: 16.0678, lng: 108.2208 }), []);
  const role = (user?.role || "").toLowerCase();
  const canRequestDevice = role === "staff" || role === "manager";
  const [deviceForm, setDeviceForm] = useState({ deviceId: "", deviceName: "" });
  const [showDeviceForm, setShowDeviceForm] = useState(false);

  const userCoordsFromLogs = useMemo(() => {
    const firstLog = todayLogs.find((l) => l?.checkin?.latitude != null && l?.checkin?.longitude != null);
    if (firstLog) {
      return { lat: Number(firstLog.checkin.latitude), lng: Number(firstLog.checkin.longitude) };
    }
    const checkoutLog = todayLogs.find((l) => l?.checkout?.latitude != null && l?.checkout?.longitude != null);
    if (checkoutLog) {
      return { lat: Number(checkoutLog.checkout.latitude), lng: Number(checkoutLog.checkout.longitude) };
    }
    return null;
  }, [todayLogs]);

  const sameId = (a, b) => a && b && String(a) === String(b);

  const localDateStr = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
  };
  const toLocalDateStr = (dateObj) => {
    if (!dateObj) return null;
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 10);
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load device, location và ca làm hôm nay
  useEffect(() => {
    // Lấy thiết bị đã duyệt
    fetchDeviceRequests()
      .then((list) => {
        const mine = (list || []).filter(
          (r) => (r.user?._id || r.requesterId || r.requester) === user?._id && r.status === "approved"
        );
        if (mine.length > 0) {
          const last = mine[mine.length - 1];
          const id = last.newDevice?.deviceId || last.deviceId || "";
          setMyDeviceId(id);
        }
      })
      .catch(() => {});

    // Lấy địa điểm được phép
    fetchLocations()
      .then((locs) => {
        const uid = user?._id || user?.id;
        const filtered = (locs || []).filter(
          (l) =>
            (Array.isArray(l.allowedEmployees) && l.allowedEmployees.some((e) => sameId(e._id || e, uid))) ||
            (Array.isArray(l.flexibleEmployees) && l.flexibleEmployees.some((e) => sameId(e._id || e, uid)))
        );
        setMyLocations(filtered);
        if (filtered.length > 0) {
          setCheckForm((p) => ({
            ...p,
            locationId: p.locationId || filtered[0]._id || filtered[0].id || "",
          }));
        }
      })
      .catch(() => {});

    // Lấy ca làm hôm nay
    const today = new Date().toISOString().slice(0, 10);
    import("../../api/attendance")
      .then((mod) => mod.fetchMyShifts(today, today))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMyShift(data[0].shift);
        }
      })
      .catch(() => {});
  }, [user?._id]);

  // Kiểm tra trạng thái checkin và load logs hôm nay
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const todayStr = localDateStr();
        const uid = String(user?._id || user?.id || '');

        // Gọi API lấy tất cả log của user (server vẫn lọc theo role)
        const logs = await fetchLogs(undefined, undefined, uid || undefined);

        const myLogs = (logs || []).filter((log) => {
          const lu = log?.user?._id || log?.user?.id || log?.user || log?.userId;
          return uid && String(lu) === uid;
        });

        // Chỉ giữ log cùng ngày hôm nay theo local time
        const filteredByToday = myLogs.filter((log) => {
          const ct = log.checkin?.time ? new Date(log.checkin.time) : null;
          if (!ct) return false;
          return toLocalDateStr(ct) === todayStr;
        });

        // Nếu không có log nhưng đang ở trạng thái checkedIn local, giữ state
        const normalized = filteredByToday.map((log) => {
          const checkinTime = log.checkin?.time ? new Date(log.checkin.time) : null;
          const dateStr = checkinTime ? toLocalDateStr(checkinTime) : log.date || null;
          return {
            ...log,
            date: dateStr,
            shift: log.shift || myShift || null,
            shiftName: log.shift?.name || log.shiftName || myShift?.name || null,
          };
        });

        setTodayLogs(normalized);

        const myLog = normalized.find((log) => log.status === "in-progress");
        const completedLog = normalized.find((log) => log.status === "completed");

        if (myLog) {
          setCheckedIn(true);
          setCurrentLog(myLog);
          setMyShift(myLog.shift);
        } else {
          setCheckedIn(false);
          setCurrentLog(null);
        }

        // Nếu có log đã hoàn tất, set shift từ log đó để hiển thị
        if (!myLog && completedLog) {
          setMyShift(completedLog.shift || myShift);
        }
      } catch (err) {
        console.error("Check status error:", err);
      }
    };

    checkStatus();
    // Chỉ phụ thuộc user để tránh loop khi setMyShift
  }, [user?._id]);

  // Selected location (must be before useEffect that uses it)
  const selectedLocation = useMemo(() => {
    return myLocations.find((l) => (l._id || l.id) === checkForm.locationId) || myLocations[0];
  }, [checkForm.locationId, myLocations]);
  const allowedRadius = useMemo(() => {
    const radius = Number(selectedLocation?.radiusMeters);
    return !Number.isNaN(radius) && radius > 0 ? radius : 50;
  }, [selectedLocation?.radiusMeters]);

  const getLocationCoords = () => {
    const currentLocId = checkForm.locationId || myLocations[0]?._id || myLocations[0]?.id;
    const loc = myLocations.find((l) => (l._id || l.id) === currentLocId);
    if (loc && loc.latitude != null && loc.longitude != null) {
      return { lat: Number(loc.latitude), lng: Number(loc.longitude) };
    }
    return null;
  };

  const updateMapPosition = (coords, radius) => {
    if (!mapRef.current || !coords) return;
    const L = window.L;
    if (!L) return;
    const position = [coords.lat, coords.lng];
    const radiusMeters = Number(radius);

    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      markerRef.current = L.marker(position).addTo(mapRef.current);
    }

    if (!Number.isNaN(radiusMeters) && radiusMeters > 0) {
      if (circleRef.current) {
        circleRef.current.setLatLng(position);
        circleRef.current.setRadius(radiusMeters);
      } else {
        circleRef.current = L.circle(position, {
          radius: radiusMeters,
          color: "blue",
          fillColor: "#7c3aed33",
          fillOpacity: 0.3,
        }).addTo(mapRef.current);
      }
    }

    mapRef.current.setView(position, mapRef.current.getZoom() || 16);
  };

  const updateUserPosition = (coords) => {
    if (!mapRef.current || !coords) return;
    const L = window.L;
    if (!L) return;
    const position = [coords.lat, coords.lng];

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(position);
    } else {
      userMarkerRef.current = L.marker(position, {
        icon: L.divIcon({
          className: 'custom-user-marker',
          html: '<div style="background: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
      }).addTo(mapRef.current).bindPopup('Your location');
    }
  };

  // Khởi tạo Leaflet khi bật bản đồ
  useEffect(() => {
    if (!showMap || !mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const leafletModule = await import("leaflet");
      const L = leafletModule.default || leafletModule;
      if (!window.L) window.L = L;
      if (cancelled) return;
      const coords = getLocationCoords() || defaultCenter;
      const map = L.map(mapContainerRef.current).setView([coords.lat, coords.lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      mapRef.current = map;
      updateMapPosition(coords, selectedLocation?.radiusMeters || 50);
      const resolvedUser = userCoords || userCoordsFromLogs;
      if (resolvedUser) {
        updateUserPosition(resolvedUser);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap, selectedLocation?.radiusMeters, userCoords, userCoordsFromLogs]);

  // Cập nhật marker khi địa điểm thay đổi
  useEffect(() => {
    if (!mapRef.current || !showMap) return;
    const coords = getLocationCoords();
    if (coords) {
      updateMapPosition(coords, selectedLocation?.radiusMeters || 50);
    }
    const resolvedUser = userCoords || userCoordsFromLogs;
    if (resolvedUser) {
      updateUserPosition(resolvedUser);
    }
  }, [checkForm.locationId, myLocations, showMap, selectedLocation?.radiusMeters, userCoords, userCoordsFromLogs]);

  // Calculate distance between two GPS coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  };

  const getGps = async () =>
    new Promise((resolve, reject) => {
      setGpsError("");
      if (!navigator?.geolocation) {
        setGpsError("Device does not support GPS. Please enable location services on your device.");
        return reject(new Error("Device does not support GPS"));
      }
      if (locatingRef.current) return reject(new Error("Getting location..."));

      locatingRef.current = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locatingRef.current = false;
          const { latitude, longitude } = pos.coords || {};
          if (latitude == null || longitude == null) {
            setGpsError("Could not get coordinates. Try again outdoors or enable GPS.");
            return reject(new Error("No coords"));
          }
          
          // Calculate distance to location
          const loc = myLocations.find((l) => (l._id || l.id) === checkForm.locationId);
          if (loc && loc.latitude != null && loc.longitude != null) {
            const distance = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
            setGpsDistance(distance);
          }
          
          const userCoords = { lat: Number(latitude.toFixed(7)), lng: Number(longitude.toFixed(7)) };
          setUserCoords(userCoords);
          
          // Update user marker on map
          updateUserPosition(userCoords);
          
          resolve(userCoords);
        },
        (err) => {
          locatingRef.current = false;
          const code = err?.code;
          let msg = "Could not get GPS location. Please enable location and try again.";
          if (code === 1) msg = "Browser denied location permission. Please allow location access and reload.";
          if (code === 2) msg = "GPS is unavailable. Try moving outdoors or restarting GPS.";
          if (code === 3) msg = "Location request timed out. Try again and keep your device still.";
          setGpsError(msg);
          reject(err || new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

  // Auto-check GPS on mount
  useEffect(() => {
    if (myLocations.length > 0 && checkForm.locationId) {
      getGps().catch(() => {});
    }
  }, [myLocations, checkForm.locationId]);

  const handleCameraSuccess = async (payload) => {
    const action = pendingActionRef.current;
    setOpenCamera(false);
    if (!action) return;

    const capturedPhoto = payload?.image || payload?.photo || (typeof payload === "string" ? payload : "");
    if (capturedPhoto) {
      lastPhotoRef.current = capturedPhoto;
    }

    const resolvedLocationId =
      checkForm.locationId || myLocations[0]?._id || myLocations[0]?.id || "";

    if (!resolvedLocationId) {
      alert("You have not been assigned a location. Please contact your administrator.");
      return;
    }

    if (!myDeviceId) {
      alert("Your device has not been approved. Please register your device and wait for approval.");
      return;
    }

    setLoading(true);
    try {
      let gps = null;
      try {
        gps = await getGps();
        setGpsError("");
      } catch (gpsErr) {
        const locCoords = getLocationCoords();
        if (locCoords) {
          gps = locCoords;
          setGpsError("GPS is blocked. Using assigned location coordinates.");
        } else {
          throw gpsErr;
        }
      }

      if (!gps) throw new Error("No valid coordinates. Please enable GPS and try again.");

      const photosPayload = lastPhotoRef.current ? [lastPhotoRef.current] : checkForm.photos.filter(Boolean);

      // Validate distance against allowed radius
      const currentLocation = myLocations.find((l) => (l._id || l.id) === resolvedLocationId);
      if (currentLocation && currentLocation.latitude != null && currentLocation.longitude != null) {
        const computedDistance = calculateDistance(
          gps.lat,
          gps.lng,
          Number(currentLocation.latitude),
          Number(currentLocation.longitude)
        );
        setGpsDistance(computedDistance);
        if (computedDistance > allowedRadius) {
          setLoading(false);
          alert(
            `You are ${computedDistance}m away from the location, exceeding the allowed radius of ${allowedRadius}m. ` +
              "Please move closer to the check-in point."
          );
          return;
        }
      }

      if (action === "checkin") {
        const result = await submitCheckin({
          latitude: gps.lat,
          longitude: gps.lng,
          locationId: resolvedLocationId,
          shiftId: myShift?._id || myShift?.id || myShift?._id,
          deviceId: myDeviceId,
          photos: photosPayload,
        });
        setCheckedIn(true);
        const normalized = {
          ...result,
          shift: result.shift || myShift || null,
          shiftName: result.shift?.name || myShift?.name || result.shiftName,
        };
        setCurrentLog(normalized);
        // Update today's history immediately after check-in
        setTodayLogs((prev) => [...prev, normalized]);
        alert("Check-in successful!");
      } else {
        const checkoutRes = await submitCheckout({
          logId: currentLog?._id || currentLog?.id,
          latitude: gps.lat,
          longitude: gps.lng,
          deviceId: myDeviceId,
          photos: photosPayload,
        });
        setCheckedIn(false);
        setCurrentLog(null);
        // After checkout, mark the log as completed in today's list using returned data
        setTodayLogs((prev) =>
          checkoutRes && checkoutRes._id
            ? prev.map((log) =>
                String(log._id || log.id) === String(checkoutRes._id)
                  ? {
                      ...checkoutRes,
                      shift: checkoutRes.shift || myShift || log.shift || null,
                      shiftName:
                        checkoutRes.shift?.name ||
                        checkoutRes.shiftName ||
                        myShift?.name ||
                        log.shift?.name ||
                        log.shiftName,
                    }
                  : log
              )
            : prev
        );
        alert("Check-out successful!");
      }
    } catch (err) {
      console.error(err);
      const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
      alert(backendMsg || err.message || (action === "checkin" ? "Check-in failed" : "Check-out failed"));
    } finally {
      setLoading(false);
      pendingActionRef.current = null;
      lastPhotoRef.current = "";
    }
  };

  const shiftTime = myShift
    ? `${String(Math.floor(myShift.startMinutes / 60)).padStart(2, "0")}:${String(myShift.startMinutes % 60).padStart(2, "0")} - ${String(Math.floor(myShift.endMinutes / 60)).padStart(2, "0")}:${String(myShift.endMinutes % 60).padStart(2, "0")}`
    : "";
  const hasCompletedToday = todayLogs.some((log) => log.status === "completed");
  const todayCheckinTime = useMemo(() => {
    const log = todayLogs.find((l) => l.checkin?.time);
    return log?.checkin?.time ? new Date(log.checkin.time).toLocaleTimeString("vi-VN") : null;
  }, [todayLogs]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="mx-auto max-w-[90rem] flex flex-col gap-6">
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-border-light rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-main">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{selectedLocation?.name || "No location"}</span>
            </div>
            {myShift ? (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-light text-primary border border-primary/30 text-xs font-semibold">
                Shift {myShift.name} · {shiftTime || "—"}
              </div>
            ) : (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs font-semibold">
                You have no shift today
              </div>
            )}
            {gpsDistance != null && (
              <div
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  gpsDistance <= allowedRadius ? "text-green-600" : "text-red-600"
                }`}
              >
                {gpsDistance <= allowedRadius ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {gpsDistance <= allowedRadius
                  ? `Valid ${gpsDistance} meters`
                  : `${gpsDistance}m away (allowed radius ${allowedRadius}m)`}
              </div>
            )}
            {gpsError && (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs font-semibold">
                {gpsError}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-text-secondary">Map</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showMap}
                  onChange={(e) => setShowMap(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.55fr] gap-6 items-stretch">
          {/* Left column: actions/info */}
          <div className="bg-white border border-border-light rounded-2xl shadow-sm p-6 flex flex-col gap-6 h-full min-h-[34rem]">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-text-secondary">{formatDate(currentTime)}</p>
              <p className="text-6xl font-extrabold text-primary leading-tight">{formatTime(currentTime)}</p>
              {myShift && (
                <div className="inline-flex items-center px-3 py-1 bg-primary-light text-primary rounded-full text-xs font-medium">
                  {myShift.name}
                </div>
              )}
              {todayCheckinTime && (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-light text-primary border border-primary/30 text-xs font-semibold">
                  Checked in today: {todayCheckinTime}
                </div>
              )}
            </div>

            {myLocations.length === 0 ? (
              <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <p className="text-sm text-amber-800">
                  Not assigned any location. Please contact your administrator.
                </p>
              </div>
            ) : !myDeviceId ? (
              <div className="w-full p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
                <p className="text-sm text-red-800">No approved device yet.</p>
                {canRequestDevice ? (
                  <>
                    {!showDeviceForm ? (
                      <button
                        onClick={() => setShowDeviceForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover"
                      >
                        <Smartphone className="w-4 h-4" />
                        Đăng ký thiết bị
                      </button>
                    ) : (
                      <div className="bg-white border border-border-light rounded-xl p-4 text-left space-y-3 shadow-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-text-secondary">Device ID</label>
                            <input
                              value={deviceForm.deviceId}
                              onChange={(e) => setDeviceForm((p) => ({ ...p, deviceId: e.target.value }))}
                              className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="E.g: 1bc47a15"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-text-secondary">Device Name</label>
                            <input
                              value={deviceForm.deviceName}
                              onChange={(e) => setDeviceForm((p) => ({ ...p, deviceName: e.target.value }))}
                              className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="E.g: iPhone 14"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowDeviceForm(false);
                              setDeviceForm({ deviceId: "", deviceName: "" });
                            }}
                            className="px-3 py-2 rounded-lg border border-border-light text-sm font-medium text-text-main hover:bg-bg-secondary"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!deviceForm.deviceId || !deviceForm.deviceName) {
                                alert("Please enter device ID and device name");
                                return;
                              }
                              try {
                                await createDeviceRequest({
                                  newDeviceId: deviceForm.deviceId,
                                  newDeviceName: deviceForm.deviceName,
                                  requireGps: true,
                                });
                                alert("Device registration request sent");
                                setDeviceForm({ deviceId: "", deviceName: "" });
                                setShowDeviceForm(false);
                                fetchDeviceRequests()
                                  .then((list) => {
                                    const mine = (list || []).filter(
                                      (r) =>
                                        (r.user?._id || r.requesterId || r.requester) === user?._id &&
                                        r.status === "approved"
                                    );
                                    if (mine.length > 0) {
                                      const last = mine[mine.length - 1];
                                      const id = last.newDevice?.deviceId || last.deviceId || "";
                                      setMyDeviceId(id);
                                    }
                                  })
                                  .catch(() => {});
                              } catch (err) {
                                console.error("Create device request error", err);
                                alert("Unable to send request");
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow hover:bg-primary-hover"
                          >
                            Send Request
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => navigate("/attendance/devices")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover"
                  >
                    <Smartphone className="w-4 h-4" />
                    Register Device
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <div className="relative flex items-center justify-center">
                  <div className="absolute -inset-4 rounded-full bg-primary-light/70 blur-[1px] animate-pulse" />
                  <button
                    onClick={() => {
                      if (!myShift) {
                        alert("You have no shift today. Cannot check in/out.");
                        return;
                      }
                      pendingActionRef.current = checkedIn ? "checkout" : "checkin";
                      setOpenCamera(true);
                    }}
                    disabled={loading || hasCompletedToday || !myShift}
                    className="relative w-56 h-56 rounded-full bg-primary text-white shadow-2xl hover:shadow-3xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center ring-10 ring-primary-light"
                  >
                    <Clock className="w-10 h-10 mb-3" />
                    <p className="text-xl font-bold">{checkedIn ? "Check-out" : "Check-in"}</p>
                    {myShift && <p className="text-sm opacity-90 mt-1">{myShift.name}</p>}
                  </button>
                </div>

                {myShift ? (
                  <div className="text-center text-sm text-text-secondary space-y-1">
                    <p>* You can only check in up to 5 minutes before shift start time</p>
                    <p>
                      Shift {myShift.name}: {shiftTime}
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-sm text-red-600 font-semibold">
                    You have no shift today. Cannot check in/out.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column: Map + logs */}
          <div className="bg-white border border-border-light rounded-2xl shadow-sm p-6 gap-5 h-full flex flex-col min-h-[34rem]">
            {showMap && (
              <div className="h-[22rem] rounded-xl border border-border-light overflow-hidden shadow-sm bg-bg-secondary">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>
            )}

            <div className="flex-1 flex flex-col">
              <h3 className="text-base font-semibold text-text-main mb-3">Today's Check-in/Check-out History</h3>
              <div className="rounded-xl border border-border-light bg-bg-secondary p-4 text-sm text-text-main flex-1">
                {todayLogs.length === 0 ? (
                  <p>You have no check-in/check-out history today!</p>
                ) : (
                  <div className="space-y-3 text-left">
                    {todayLogs.map((log) => (
                      <div key={log._id || log.id} className="border border-border-light rounded-lg p-3 bg-white">
                        <div className="flex justify-between text-sm text-text-main">
                          <span>Check-in:</span>
                          <span>{log.checkin?.time ? new Date(log.checkin.time).toLocaleTimeString("vi-VN") : "-"}</span>
                        </div>
                        <div className="flex justify-between text-sm text-text-main">
                          <span>Check-out:</span>
                          <span>{log.checkout?.time ? new Date(log.checkout.time).toLocaleTimeString("vi-VN") : "-"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {openCamera && (
        <CameraBox
          verifyOnly
          user={user}
          onClose={() => {
            setOpenCamera(false);
            pendingActionRef.current = null;
          }}
          onSuccess={handleCameraSuccess}
        />
      )}
    </div>
  );
};

export default CheckinCheckoutPage;
