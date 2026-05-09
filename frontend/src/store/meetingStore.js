import { create } from 'zustand'

export const useMeetingStore = create((set, get) => ({
  // Current meeting
  meetingId: null,
  meetingTitle: '',
  isHost: false,

  // Media state
  localStream: null,
  activeTracks: [],
  remoteStreams: {},   // { peerId: MediaStream }
  isMicOn: true,
  isCameraOn: true,
  isScreenSharing: false,

  // Participants
  participants: [],

  // Captions
  captions: [],
  captionsEnabled: true,

  // Chat
  messages: [],

  // Transcript (full)
  transcript: [],

  // Attendance
  attendanceData: {},

  // Speaking indicator
  speakingPeers: new Set(),

  // UI
  sidebarTab: 'captions', // 'captions' | 'chat' | 'participants'
  isSidebarOpen: true,

  // Status
  isJoined: false,
  isConnecting: false,

  // --- Actions ---
  joinMeeting: (meetingId, title, isHost) =>
    set({ meetingId, meetingTitle: title, isHost, isConnecting: true }),

  setJoined: () => set({ isJoined: true, isConnecting: false }),

  setLocalStream: (stream) => set({ localStream: stream, activeTracks: stream ? stream.getTracks() : [] }),

  stopActiveTracks: () =>
    set((s) => {
      s.activeTracks.forEach(t => {
        try { t.stop(); } catch (_) {}
      })
      return { activeTracks: [], localStream: null }
    }),

  addRemoteStream: (peerId, stream, name, userId) =>
    set((s) => {
      const existing = s.participants.find(p => p.id === peerId);
      // Logic: Prefer a new name if it's specific (not Guest/socketId). Otherwise keep existing name.
      const isNewNameValid = name && name !== peerId && name !== 'Guest';
      const updatedName = isNewNameValid ? name : (existing?.name || name || 'Guest');
      const updatedUserId = userId ?? existing?.userId ?? null;
      
      return {
        remoteStreams: { ...s.remoteStreams, [peerId]: stream },
        participants: existing
          ? s.participants.map(p => p.id === peerId ? { ...p, stream, name: updatedName, userId: updatedUserId } : p)
          : [...s.participants, { id: peerId, name: updatedName, userId: updatedUserId, stream, isMuted: false, isCameraOff: false }],
      };
    }),

  removeRemoteStream: (peerId) =>
    set((s) => {
      const { [peerId]: _, ...rest } = s.remoteStreams
      return {
        remoteStreams: rest,
        participants: s.participants.filter(p => p.id !== peerId),
      }
    }),

  updateParticipantMedia: (peerId, { isMuted, isCameraOff, name, userId }) =>
    set((s) => {
      const existing = s.participants.find(p => p.id === peerId);
      const isNewNameValid = name && name !== peerId && name !== 'Guest';
      const updatedName = isNewNameValid ? name : (existing?.name || 'Guest');
      const updatedUserId = userId ?? existing?.userId ?? null;
      
      if (existing) {
        return {
          participants: s.participants.map(p => 
            p.id === peerId ? { ...p, isMuted: isMuted ?? p.isMuted, isCameraOff: isCameraOff ?? p.isCameraOff, name: updatedName, userId: updatedUserId } : p
          )
        };
      } else {
        return {
          participants: [...s.participants, { id: peerId, name: updatedName, userId: updatedUserId, stream: null, isMuted: isMuted ?? false, isCameraOff: isCameraOff ?? false }]
        };
      }
    }),

  toggleMic: () =>
    set((s) => ({ isMicOn: !s.isMicOn })),

  toggleCamera: () =>
    set((s) => ({ isCameraOn: !s.isCameraOn })),

  setScreenSharing: (val) => set({ isScreenSharing: val }),

  addCaption: (caption) =>
    set((s) => ({
      captions: [...s.captions.slice(-50), caption],
      transcript: [...s.transcript, { ...caption, timestamp: caption?.timestamp || new Date().toISOString() }],
    })),

  addMessage: (msg) =>
    set((s) => {
      const id = msg.id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      if (s.messages.some(m => m.id === id)) return s;
      return { messages: [...s.messages, { ...msg, id }] };
    }),

  setSpeaking: (peerId, speaking) =>
    set((s) => {
      const next = new Set(s.speakingPeers)
      speaking ? next.add(peerId) : next.delete(peerId)
      return { speakingPeers: next }
    }),

  updateAttendance: (data) =>
    set((s) => ({ attendanceData: { ...s.attendanceData, ...data } })),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

  setParticipants: (participants) => set({ participants }),

  leaveMeeting: () =>
    set({
      isJoined: false,
      isConnecting: false,
      localStream: null,
      remoteStreams: {},
      speakingPeers: new Set(),
      participants: [],
      isMicOn: true,
      isCameraOn: true,
    }),

  reset: () =>
    set({
      meetingId: null,
      meetingTitle: '',
      localStream: null,
      remoteStreams: {},
      isMicOn: true,
      isCameraOn: true,
      isScreenSharing: false,
      participants: [],
      captions: [],
      messages: [],
      transcript: [],
      attendanceData: {},
      speakingPeers: new Set(),
      isJoined: false,
      isConnecting: false,
    }),
}))
