import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { registerStream, unregisterStream } from '../utils/mediaRegistry';

export default function FaceEnroll() {
  const { user } = useAuthStore();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [streamActive, setStreamActive] = useState(false);
  const [userId, setUserId] = useState(user?.id || '');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      registerStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
        setStatus({ type: '', message: '' });
      }
    } catch (err) {
      console.error("Error accessing webcam: ", err);
      setStatus({ type: 'error', message: 'Could not access webcam. Please check permissions.' });
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      unregisterStream(videoRef.current.srcObject);
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  const captureFace = async () => {
    if (!userId) {
      setStatus({ type: 'error', message: 'Please enter a User ID' });
      return;
    }
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);
    setStatus({ type: 'info', message: 'Processing...' });

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame onto the canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get Base64 image
    const base64Image = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:5000/api/face/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(userId, 10),
          image: base64Image
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Face enrolled successfully!' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to enroll face.' });
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setStatus({ type: 'error', message: 'Network error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount and update userId if user changes
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Face Enrollment</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
        <input 
          type="text" 
          value={userId}
          onChange={(e) => {
            console.log("Input changed:", e.target.value);
            setUserId(e.target.value);
          }}
          placeholder="Enter your User ID (e.g. 1)"
          className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
        />
      </div>

      <div className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center mb-6" style={{ height: '400px' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: streamActive ? 'block' : 'none' }}
        />
        {!streamActive && (
          <div className="text-gray-400 text-center z-10 p-4">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <p>Webcam is off</p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex gap-4 mb-4">
        {!streamActive ? (
          <button 
            onClick={startVideo}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Start Webcam
          </button>
        ) : (
          <button 
            onClick={stopVideo}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Stop Webcam
          </button>
        )}
        
        <button 
          onClick={captureFace}
          disabled={!streamActive || loading}
          className={`flex-1 font-medium py-2 px-4 rounded transition-colors ${
            !streamActive || loading 
              ? 'bg-blue-300 text-white cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {loading ? 'Processing...' : 'Capture & Enroll'}
        </button>
      </div>

      {status.message && (
        <div className={`p-4 rounded border ${
          status.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
          'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
