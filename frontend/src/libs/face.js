import * as faceapi from "@vladmandic/face-api";

let _modelsLoaded = false;
const MODEL_URL = "/models";

const detectorOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.5,
});

export async function ensureFaceModelsLoaded() {
  if (_modelsLoaded) return;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    _modelsLoaded = true;
    console.log("✅ Face models loaded");
  } catch (err) {
    console.error("❌ Failed to load face models:", err);
    throw err;
  }
}

export async function detectFaceInVideo(videoEl) {
  try {
    if (!videoEl) return null;
    await ensureFaceModelsLoaded();

    const det = await faceapi
      .detectSingleFace(videoEl, detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!det || !det.descriptor) return null;
    if (!(det.descriptor instanceof Float32Array) || det.descriptor.length !== 128) {
      console.warn("[Face] Invalid video descriptor:", det.descriptor);
      return null;
    }
    return det.descriptor;
  } catch (err) {
    console.error("[Face] detectFaceInVideo error:", err);
    return null;
  }
}

export async function getDescriptorFromImageUrl(faceUrl) {
  try {
    if (!faceUrl) return null;
    await ensureFaceModelsLoaded();

    const img = await faceapi.fetchImage(faceUrl);
    const det = await faceapi
      .detectSingleFace(img, detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!det || !det.descriptor) {
      console.warn("[Face] No face found in reference image:", faceUrl);
      return null;
    }
    if (!(det.descriptor instanceof Float32Array) || det.descriptor.length !== 128) {
      console.warn("[Face] Invalid reference descriptor:", det.descriptor);
      return null;
    }
    return det.descriptor;
  } catch (err) {
    console.error("[Face] getDescriptorFromImageUrl error:", err);
    return null;
  }
}

export function compareDescriptors(refDescriptor, videoDescriptor, threshold = 0.45) {
  try {
    if (!refDescriptor || !videoDescriptor || refDescriptor.length !== 128 || videoDescriptor.length !== 128) {
      return { match: false, distance: Infinity };
    }
    const distance = faceapi.euclideanDistance(refDescriptor, videoDescriptor);
    return { match: distance < threshold, distance };
  } catch (err) {
    console.error("[Face] compareDescriptors error:", err);
    return { match: false, distance: Infinity };
  }
}

export async function compareFaces(faceUrl, videoDescriptor) {
  try {
    if (!videoDescriptor) return false;
    const ref = await getDescriptorFromImageUrl(faceUrl);
    if (!ref) return false;
    const { match, distance } = compareDescriptors(ref, videoDescriptor);
    console.log("🔍 Face distance:", distance);
    return match;
  } catch (err) {
    console.error("[Face] compareFaces error:", err);
    return false;
  }
}
