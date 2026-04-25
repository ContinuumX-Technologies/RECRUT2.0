// frontend/src/hooks/useVisionProctor.ts
import { useEffect, useRef, useState } from 'react';
import { 
  FaceLandmarker, 
  ObjectDetector, 
  ImageEmbedder,
  FilesetResolver
} from '@mediapipe/tasks-vision';

type VisionConfig = {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  referenceImage?: string; 
  onViolation: (type: string, data: any) => void;
};

// Helper: Compute Cosine Similarity between two embeddings
function cosineSimilarity(u: Float32Array, v: Float32Array): number {
  let dot = 0.0, normU = 0.0, normV = 0.0;
  for (let i = 0; i < u.length; i++) {
    dot += u[i] * v[i];
    normU += u[i] * u[i];
    normV += v[i] * v[i];
  }
  return dot / (Math.sqrt(normU) * Math.sqrt(normV));
}

export function useVisionProctor({ enabled, videoRef, referenceImage, onViolation }: VisionConfig) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  const [faceMatchScore, setFaceMatchScore] = useState<number | null>(null);
  const [isFaceMissing, setIsFaceMissing] = useState(false);

  // AI Task References
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const imageEmbedderRef = useRef<ImageEmbedder | null>(null);
  const referenceEmbeddingRef = useRef<Float32Array | null>(null);
  
  // Loop Control
  const lastProcessTimeRef = useRef(0);
  const requestRef = useRef<number>(0);
  const isFaceMissingRef = useRef(false); // ref for use inside animation frame closure

  // 1. Initialize All MediaPipe Models
  useEffect(() => {
    let isMounted = true;

    async function loadModels() {
      try {
        console.log("Loading MediaPipe Models...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // A. Face Landmarker (Gaze & Talking) - float16 is correct here
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 2
        });

        // B. Object Detector (Phones, Books) - Switched to float32 for safety
        const detector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite`,
            delegate: "GPU"
          },
          scoreThreshold: 0.5,
          runningMode: "VIDEO",
          categoryAllowlist: ["cell phone", "laptop", "book", "cup"]
        });

        // C. Image Embedder (Face Verification) - UPDATED TO FLOAT32
        const embedder = await ImageEmbedder.createFromOptions(vision, {
          baseOptions: {
            // FIXED: Changed float16 -> float32
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`,
            delegate: "GPU"
          },
          runningMode: "IMAGE"
        });

        if (isMounted) {
          faceLandmarkerRef.current = landmarker;
          objectDetectorRef.current = detector;
          imageEmbedderRef.current = embedder;
          
          // D. Process Reference Image
          if (referenceImage) {
            await processReferenceImage(embedder, referenceImage);
          }

          setModelsLoaded(true);
          console.log("✅ All AI Models Loaded");
        }
      } catch (err) {
        console.error("❌ Failed to load AI models:", err);
      }
    }

    loadModels();
    return () => { isMounted = false; };
  }, [referenceImage]);

  // Helper: Process Reference Image for Verification
  const processReferenceImage = async (embedder: ImageEmbedder, url: string) => {
    try {
      // Load image ensuring CORS is handled
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await new Promise((resolve, reject) => { 
        img.onload = resolve; 
        img.onerror = reject;
      });

      const result = embedder.embed(img);
      if (result.embeddings.length > 0) {
        referenceEmbeddingRef.current = result.embeddings[0].floatEmbedding as unknown as Float32Array;
        console.log("✅ Reference face embedding generated");
      }
    } catch (e) {
      console.warn("Could not process reference image (Face Match disabled):", e);
    }
  };

  // 2. Real-time Inference Loop
  useEffect(() => {
    if (!enabled || !modelsLoaded || !videoRef.current) return;
    const video = videoRef.current;

    const analyzeFrame = async () => {
      // Strictly wait for video dimensions
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const now = Date.now();
        const runHeavyOps = now - lastProcessTimeRef.current > 1000; // Run heavy ops every 1s

        try {
          // --- TASK 1: Head Pose & Talking (Every Frame) ---
          if (faceLandmarkerRef.current) {
            const results = faceLandmarkerRef.current.detectForVideo(video, now);
            
            if (results.faceLandmarks.length > 0) {
              // 1. Multiple Faces
              if (results.faceLandmarks.length > 1) {
                onViolation('MULTIPLE_FACES_DETECTED', { count: results.faceLandmarks.length });
              }

              // 2. Head Pose
              const matrix = results.facialTransformationMatrixes![0].data;
              const yaw = Math.asin(-matrix[2]) * (180 / Math.PI);
              const pitch = Math.atan2(matrix[6], matrix[10]) * (180 / Math.PI);

              const lookingAway = Math.abs(yaw) > 30 || Math.abs(pitch) > 25;
              setIsLookingAway(lookingAway);

              if (lookingAway) {
                console.warn(`[AI] Looking Away: Yaw ${yaw.toFixed(1)}°, Pitch ${pitch.toFixed(1)}°`);
              }

              // 3. Talking
              const blendshapes = results.faceBlendshapes![0].categories;
              const jawOpen = blendshapes.find(b => b.categoryName === 'jawOpen')?.score || 0;
              setIsTalking(jawOpen > 0.2);

              // 4. Mark face as present
              if (isFaceMissingRef.current) {
                console.info(`[AI] Face Detected again`);
              }
              isFaceMissingRef.current = false;
              setIsFaceMissing(false);
            } else {
              // No face detected
              if (!isFaceMissingRef.current) {
                console.error("[AI] ⚠️ Face Missing — candidate left the frame");
              }
              isFaceMissingRef.current = true;
              setIsFaceMissing(true);
              setIsLookingAway(false);
              setIsTalking(false);
            }
          }

          // --- TASK 2: Object Detection & Face Verification (Every 1s) ---
          // *** Only run face verification if a face was actually detected ***
          if (runHeavyOps) {
            lastProcessTimeRef.current = now;

            // A. Object Detection
            if (objectDetectorRef.current) {
              const detections = objectDetectorRef.current.detectForVideo(video, now);
              const found = detections.detections
                .map(d => d.categories[0].categoryName)
                .filter(name => ['cell phone', 'laptop', 'book', 'cup'].includes(name));
              
              setDetectedObjects(found);
              if (found.length > 0) {
                console.warn(`[AI] Forbidden Objects: ${found.join(', ')}`);
                onViolation('FORBIDDEN_OBJECT', { objects: found });
              }
            }

            // B. Face Verification — ONLY if a face is currently detected
            if (!isFaceMissingRef.current && imageEmbedderRef.current && referenceEmbeddingRef.current) {
               const embedResult = imageEmbedderRef.current.embed(video);
               if (embedResult.embeddings.length > 0) {
                 const currentEmbedding = embedResult.embeddings[0].floatEmbedding as unknown as Float32Array;
                 const similarity = cosineSimilarity(referenceEmbeddingRef.current, currentEmbedding);
                 
                 setFaceMatchScore(similarity);
                 console.info(`[AI] Identity Match: ${(similarity * 100).toFixed(1)}%`);

                 if (similarity < 0.7) {
                   console.error(`[AI] ❌ Identity Mismatch (Score: ${similarity.toFixed(2)})`);
                   onViolation('FACE_MISMATCH', { score: similarity });
                 }
               }
            } else if (isFaceMissingRef.current) {
              // Face is missing — clear the match score so we don't show stale data
              setFaceMatchScore(null);
            }
          }

        } catch (err) {
          console.warn("[AI] Frame analysis error:", err);
        }
      }
      requestRef.current = requestAnimationFrame(analyzeFrame);
    };

    requestRef.current = requestAnimationFrame(analyzeFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [enabled, modelsLoaded]);

  return {
    modelsLoaded,
    isLookingAway,
    isTalking,
    isFaceMissing,
    detectedObjects,
    faceMatchScore
  };
}