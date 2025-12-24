import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  ensureFaceModelsLoaded,
  detectFaceInVideo,
  getDescriptorFromImageUrl,
  compareDescriptors,
} from "../libs/face";

const REQUIRED_SUCCESS_STREAK = 2;
const DETECT_INTERVAL_MS = 600;
const FAIL_AUTOCLOSE_SECONDS = 5;

export default function CameraBox({ onClose, onSuccess, user, eventId, verifyOnly = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("scanning");
  const [message, setMessage] = useState("Place your face in the frame...");
  const streakRef = useRef(0);
  const isProcessingRef = useRef(false);
  const lastDescriptorRef = useRef(null);
  const refDescriptorRef = useRef(null);
  const failTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const stopLoopRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    stopLoopRef.current = false;

    async function boot() {
      try {
        setStatus("scanning");
        setMessage("Initializing camera and models...");
        await ensureFaceModelsLoaded();

        if (!user?.faceUrl?.trim()) {
          setStatus("fail");
          setMessage("? User has no face image (faceUrl).");
          return;
        }
        if (!eventId && !verifyOnly) {
          setStatus("fail");
          setMessage("? Event has no ID. Save event first.");
          return;
        }

        setMessage("Loading reference face data...");
        const refDesc = await getDescriptorFromImageUrl(user.faceUrl);
        if (!refDesc) {
          setStatus("fail");
          setMessage("? Cannot extract face from reference image.");
          return;
        }
        refDescriptorRef.current = refDesc;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setMessage("Camera ready. Please position your face...");

        async function loop() {
          if (!mountedRef.current || stopLoopRef.current) return;
          if (!videoRef.current) {
            setTimeout(loop, DETECT_INTERVAL_MS);
            return;
          }

          try {
            const desc = await detectFaceInVideo(videoRef.current);
            if (desc) {
              lastDescriptorRef.current = desc;
              streakRef.current += 1;
              setMessage(`Verifying... (${streakRef.current}/${REQUIRED_SUCCESS_STREAK})`);
              if (streakRef.current >= REQUIRED_SUCCESS_STREAK && !isProcessingRef.current) {
                isProcessingRef.current = true;
                await verifyAndSend();
                return;
              }
            } else if (!isProcessingRef.current) {
              streakRef.current = 0;
              setMessage("No face detected. Please adjust position.");
            }
          } catch {
            if (!isProcessingRef.current) {
              setMessage("? Detection error, retrying...");
            }
          }

          setTimeout(loop, DETECT_INTERVAL_MS);
        }

        setTimeout(loop, DETECT_INTERVAL_MS);
      } catch {
        setStatus("error");
        setMessage("? Error initializing camera/models.");
      }
    }

    boot();

    return () => {
      mountedRef.current = false;
      clearFailTimer();
      stopStream();
      stopLoopRef.current = true;
    };
  }, [user, eventId]);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function clearFailTimer() {
    if (failTimerRef.current) {
      clearInterval(failTimerRef.current);
      failTimerRef.current = null;
    }
  }

  async function markAttendance(eventId, userId, imageData, success) {
    const resRaw = await fetch(`/api/calendar/attendance/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, imageData, success }),
    });

    if (!resRaw.ok) {
      const text = await resRaw.text();
      throw new Error(`API error ${resRaw.status}: ${text}`);
    }

    return resRaw.json();
  }

  async function verifyAndSend() {
    clearFailTimer();
    setStatus("uploading");
    setMessage("Verifying face...");
    try {
      const refDesc = refDescriptorRef.current;
      const videoDesc = lastDescriptorRef.current;
      if (!refDesc || !videoDesc) {
        setStatus("fail");
        scheduleAutoclose("? Missing face descriptors. Try again.");
        return;
      }

      const { match } = compareDescriptors(refDesc, videoDesc);

      const video = videoRef.current;
      const width = video?.videoWidth || 640;
      const height = video?.videoHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

      let res = null;
      let apiError = null;
      let serverSuccess = true;
      if (!verifyOnly) {
        try {
          res = await markAttendance(eventId, user.id || user.uid, dataUrl, match);
        } catch (error) {
          apiError = error;
        }
        serverSuccess = res?.success === true;
      }

      const finalSuccess = match && serverSuccess;

      if (finalSuccess) {
        clearFailTimer();
        setStatus("success");
        const successMessage = res?.message || "? Face verification successful";
        setMessage(successMessage);
        stopStream();
        stopLoopRef.current = true;
        onSuccess?.(
          res && typeof res === "object"
            ? { ...res, image: dataUrl, success: res?.success ?? true }
            : { success: true, image: dataUrl }
        );
        setTimeout(() => onClose?.(), 1000);
      } else {
        const failureMessage =
          res?.message || (apiError ? "? Failed to mark attendance." : "? Face verification failed.");
        if (apiError) {
          console.error("[CameraBox] attendance request failed:", apiError);
        }
        setStatus("fail");
        scheduleAutoclose(failureMessage);
      }
    } catch (error) {
      console.error("[CameraBox] verifyAndSend error:", error);
      setStatus("error");
      scheduleAutoclose("? Error verifying face.");
    } finally {
      isProcessingRef.current = false;
      streakRef.current = 0;
    }
  }

  function scheduleAutoclose(baseMessage) {
    clearFailTimer();
    stopLoopRef.current = true;
    let countdown = FAIL_AUTOCLOSE_SECONDS;

    const renderMessage = () => {
      setMessage(`${baseMessage} Auto closing in ${countdown}s...`);
    };

    renderMessage();

    failTimerRef.current = setInterval(() => {
      countdown -= 1;
      if (!mountedRef.current) {
        clearFailTimer();
        return;
      }

      if (countdown <= 0) {
        clearFailTimer();
        stopStream();
        onClose?.();
        return;
      }

      renderMessage();
    }, 1000);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="relative bg-white p-4 rounded-xl shadow-lg w-[460px] max-w-[92vw]">
        <button
          onClick={() => {
            clearFailTimer();
            stopStream();
            onClose?.();
          }}
          className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-[320px] object-cover rounded-md border bg-black"
        />

        <div className="mt-3 text-center">
          <p
            className={`text-sm font-semibold ${
              status === "success"
                ? "text-green-600"
                : status === "fail" || status === "error"
                ? "text-red-600"
                : "text-text-secondary"
            }`}
          >
            {message}
          </p>
          <p className="text-xs text-text-muted mt-2">The photo is used for verification and saved in the attendance history.</p>
        </div>
      </div>
    </div>
  );
}
