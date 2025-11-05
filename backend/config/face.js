// config/face.js
/**
 * Module xác thực khuôn mặt:
 * - Nếu FACE_PROVIDER='aws' => dùng AWS Rekognition CompareFaces
 * - Ngược lại: fallback aHash (sharp) để ước lượng độ giống nhau (POC)
 *
 * Trả về: { match: boolean, confidence: number }
 */

const PROVIDER = process.env.FACE_PROVIDER?.toLowerCase() || 'ahash-fallback';

let awsClient = null;
if (PROVIDER === 'aws') {
  const { RekognitionClient, CompareFacesCommand } = await import('@aws-sdk/client-rekognition');
  awsClient = new RekognitionClient({
    region: process.env.AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined
  });
}

import sharp from 'sharp';

/**
 * Fallback: Average Hash (aHash) + Hamming distance.
 * Không phải Face Recognition thực sự, chỉ mang tính tương đồng ảnh.
 */
async function ahash(buffer, size = 8) {
  // resize -> grayscale -> raw
  const { data } = await sharp(buffer)
    .resize(size, size, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // tính average
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const avg = sum / data.length;

  // bitstring
  const bits = [];
  for (let i = 0; i < data.length; i++) {
    bits.push(data[i] >= avg ? 1 : 0);
  }
  return bits;
}

function hammingDistance(aBits, bBits) {
  if (aBits.length !== bBits.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < aBits.length; i++) {
    if (aBits[i] !== bBits[i]) dist++;
  }
  return dist;
}

/**
 * Chuẩn hoá confidence từ Hamming distance: 0..1 (1 là giống hệt)
 * Với aHash 8x8 => 64 bit. Ta map: confidence = 1 - (dist/64).
 */
function similarityFromHamming(dist, total = 64) {
  if (!Number.isFinite(dist)) return 0;
  const sim = 1 - (dist / total);
  return Math.max(0, Math.min(1, sim));
}

/**
 * Ngưỡng match mặc định cho fallback (tuỳ ảnh): 0.85 ~ 0.9
 * Bạn có thể chỉnh bằng env FACE_FALLBACK_THRESHOLD (0..1)
 */
const FALLBACK_THRESHOLD = (() => {
  const v = parseFloat(process.env.FACE_FALLBACK_THRESHOLD);
  return Number.isFinite(v) ? v : 0.88;
})();

/**
 * verifyFaces({ sourceBuffer, targetBuffer }) => { match, confidence }
 */
export async function verifyFaces({ sourceBuffer, targetBuffer }) {
  if (PROVIDER === 'aws' && awsClient) {
    try {
      // AWS cần ảnh ở định dạng bytes (buffer)
      const cmd = new CompareFacesCommand({
        SourceImage: { Bytes: sourceBuffer },
        TargetImage: { Bytes: targetBuffer },
        SimilarityThreshold: parseFloat(process.env.AWS_SIMILARITY_THRESHOLD || '90') // %
      });
      const result = await awsClient.send(cmd);

      let bestMatch = null;
      if (Array.isArray(result.FaceMatches) && result.FaceMatches.length > 0) {
        // lấy match có Similarity cao nhất
        bestMatch = result.FaceMatches.reduce((prev, cur) => {
          return (cur.Similarity || 0) > (prev?.Similarity || 0) ? cur : prev;
        }, null);
      }

      const confidence = bestMatch ? (bestMatch.Similarity / 100) : 0;
      const match = confidence >= ((parseFloat(process.env.AWS_SIMILARITY_THRESHOLD || '90')) / 100);

      return { match, confidence };
    } catch (err) {
      console.error('AWS Rekognition error:', err);
      // fallback sang aHash nếu AWS lỗi
    }
  }

  // Fallback aHash POC
  try {
    const [aBits, bBits] = await Promise.all([ahash(sourceBuffer), ahash(targetBuffer)]);
    const dist = hammingDistance(aBits, bBits);
    const confidence = similarityFromHamming(dist, aBits.length); // 0..1
    const match = confidence >= FALLBACK_THRESHOLD;
    return { match, confidence };
  } catch (e) {
    console.error('aHash fallback error:', e);
    // nếu mọi thứ hỏng, coi như không match
    return { match: false, confidence: 0 };
  }
}
