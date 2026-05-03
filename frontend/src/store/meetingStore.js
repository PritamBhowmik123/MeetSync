import { create } from 'zustand'

export const useMeetingStore = create((set, get) => ({
  // Current meeting
  meetingId: null,
  meetingTitle: '',
  isHost: false,

  // Media state
  localStream: null,
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

  setLocalStream: (stream) => set({ localStream: stream }),

  addRemoteStream: (peerId, stream, name) =>
    set((s) => {
      const existing = s.participants.find(p => p.id === peerId);
      // Logic: Prefer a new name if it's specific (not Guest/socketId). Otherwise keep existing name.
      const isNewNameValid = name && name !== peerId && name !== 'Guest';
      const updatedName = isNewNameValid ? name : (existing?.name || name || peerId);
      
      return {
        remoteStreams: { ...s.remoteStreams, [peerId]: stream },
        participants: existing
          ? s.participants.map(p => p.id === peerId ? { ...p, stream, name: updatedName } : p)
          : [...s.participants, { id: peerId, name: updatedName, stream, isMuted: false, isCameraOff: false }],
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

  updateParticipantMedia: (peerId, { isMuted, isCameraOff, name }) =>
    set((s) => {
      const existing = s.participants.find(p => p.id === peerId);
      const isNewNameValid = name && name !== peerId && name !== 'Guest';
      const updatedName = isNewNameValid ? name : (existing?.name || peerId);
      
      if (existing) {
        return {
          participants: s.participants.map(p => 
            p.id === peerId ? { ...p, isMuted: isMuted ?? p.isMuted, isCameraOff: isCameraOff ?? p.isCameraOff, name: updatedName } : p
          )
        };
      } else {
        return {
          participants: [...s.participants, { id: peerId, name: updatedName, stream: null, isMuted: isMuted ?? false, isCameraOff: isCameraOff ?? false }]
        };
      }
    }),

  toggleMic: () =>
    set((s) => {
      if (s.localStream) {
        s.localStream.getAudioTracks().forEach(t => (t.enabled = !s.isMicOn))
      }
      return { isMicOn: !s.isMicOn }
    }),

  toggleCamera: () =>
    set((s) => {
      if (s.localStream) {
        s.localStream.getVideoTracks().forEach(t => (t.enabled = !s.isCameraOn))
      }
      return { isCameraOn: !s.isCameraOn }
    }),

  setScreenSharing: (val) => set({ isScreenSharing: val }),

  addCaption: (caption) =>
    set((s) => ({
      captions: [...s.captions.slice(-50), caption],
      transcript: [...s.transcript, { ...caption, timestamp: new Date().toISOString() }],
    })),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, { ...msg, id: Date.now() }] })),

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
