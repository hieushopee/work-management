import axios from "../libs/axios";

export const fetchShifts = () => axios.get("/attendance/shifts").then((res) => res.data);
export const createShift = (payload) => axios.post("/attendance/shifts", payload).then((res) => res.data);
export const updateShift = (id, payload) => axios.put(`/attendance/shifts/${id}`, payload).then((res) => res.data);
export const deleteShift = (id) => axios.delete(`/attendance/shifts/${id}`).then((res) => res.data);

export const fetchAssignments = (start, end, options = {}) =>
  axios
    .get("/attendance/assignments", {
      params: {
        start,
        end,
        userIds: options.userIds,
      },
    })
    .then((res) => res.data);
export const saveAssignments = (assignments, mode = "employee") =>
  axios
    .post("/attendance/assignments/bulk", { assignments, mode })
    .then((res) => res.data);

export const fetchLocations = () => axios.get("/attendance/locations").then((res) => res.data);
export const createLocation = (payload) =>
  axios.post("/attendance/locations", payload).then((res) => res.data);
export const updateLocation = (id, payload) =>
  axios.put(`/attendance/locations/${id}`, payload).then((res) => res.data);
export const deleteLocation = (id) =>
  axios.delete(`/attendance/locations/${id}`).then((res) => res.data);

export const fetchDeviceRequests = () => axios.get("/attendance/devices").then((res) => res.data);
export const createDeviceRequest = (payload) =>
  axios.post("/attendance/devices", payload).then((res) => res.data);
export const updateDeviceRequestStatus = (id, status) =>
  axios.patch(`/attendance/devices/${id}/status`, { status }).then((res) => res.data);

export const fetchLogs = (start, end, userId, options = {}) =>
  axios
    .get("/attendance/logs", {
      params: {
        start,
        end,
        userId,
        userIds: options.userIds,
      },
    })
    .then((res) => res.data);
export const submitCheckin = (payload) =>
  axios.post("/attendance/logs/checkin", payload).then((res) => res.data);
export const submitCheckout = (payload) =>
  axios.post("/attendance/logs/checkout", payload).then((res) => res.data);

export const fetchRules = () => axios.get("/attendance/rules").then((res) => res.data);
export const updateRules = (payload) =>
  axios.put("/attendance/rules", payload).then((res) => res.data);

// My shifts (for staff)
export const fetchMyShifts = (start, end, options = {}) =>
  axios
    .get("/attendance/assignments", {
      params: {
        start,
        end,
        userIds: options.userIds,
      },
    })
    .then((res) => res.data);

// Forms (leave requests, etc.)
export const fetchForms = () => axios.get("/attendance/forms").then((res) => res.data);
export const createForm = (payload) => axios.post("/attendance/forms", payload).then((res) => res.data);
export const updateFormStatus = (id, status, reviewNote) =>
  axios.patch(`/attendance/forms/${id}/status`, { status, reviewNote }).then((res) => res.data);

// Log notification
export const sendLogNotification = (logId, note) =>
  axios.post("/attendance/logs/notification", { logId, note }).then((res) => res.data);
