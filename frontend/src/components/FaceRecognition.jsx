import React, { useRef, useState, useEffect } from 'react';

export default function FaceRecognition() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [streamActive, setStreamActive] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null); // { matched: boolean, user_id: number, confidence: number, message: string }
  const [isProcessing, setIsProcessing] = useState(false);

  // Interval reference for continuous scanning
  const intervalRef = useRef(null);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Error accessing webcam: ", err);
      setRecognitionResult({ message: 'Could not access webcam.' });
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
      
      // Stop interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRecognitionResult(null);
    }
  };

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return; // Video not ready

    setIsProcessing(true);

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Image = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:5000/api/face/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();
      setRecognitionResult(data);
    } catch (err) {
      console.error('Recognition error:', err);
      // Optional: keep silent on network errors to avoid spamming the UI
    } finally {
      setIsProcessing(false);
    }
  };

  // Start continuous recognition when stream becomes active
  useEffect(() => {
    if (streamActive) {
      // Process a frame every 3 seconds
      intervalRef.current = setInterval(() => {
        processFrame();
      }, 3000);
      
      // Trigger first process immediately
      processFrame();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [streamActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Live Face Recognition</h2>

      <div className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center mb-6" style={{ height: '400px' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: streamActive ? 'block' : 'none' }}
        />
        
        {/* Overlay for recognition result */}
        {streamActive && recognitionResult && (
          <div className="absolute top-4 right-4 z-20">
            {recognitionResult.matched ? (
              <div className="bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm border border-green-400">
                <div className="font-bold text-lg">User {recognitionResult.user_id}</div>
                <div className="text-xs text-green-100">Confidence: {(recognitionResult.confidence * 100).toFixed(1)}%</div>
              </div>
            ) : (
              <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm border border-red-400">
                <div className="font-bold">Unknown User</div>
                {recognitionResult.message && <div className="text-xs text-red-100">{recognitionResult.message}</div>}
              </div>
            )}
          </div>
        )}

        {!streamActive && (
          <div className="text-gray-400 text-center z-10 p-4">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <p>Webcam is off</p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex gap-4">
        {!streamActive ? (
          <button 
            onClick={startVideo}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Start Recognition
          </button>
        ) : (
          <button 
            onClick={stopVideo}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Stop Recognition
          </button>
        )}
      </div>
    </div>
  );
}
