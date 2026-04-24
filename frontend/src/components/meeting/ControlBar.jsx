import { useMeetingStore } from '../../store/meetingStore'
import Button from '../ui/Button'

export default function ControlBar({ onLeave, onScreenShare }) {
  const {
    isMicOn, isCameraOn, isScreenSharing, captionsEnabled,
    toggleMic, toggleCamera, toggleSidebar, sidebarTab, setSidebarTab, isSidebarOpen
  } = useMeetingStore()

  const handleToggleCaptions = () => {
    useMeetingStore.setState({ captionsEnabled: !captionsEnabled })
  }
  const handleToggleChat = () => {
    setSidebarTab('chat')
    if (!isSidebarOpen || sidebarTab === 'chat') toggleSidebar()
  }
  const handleToggleParticipants = () => {
    setSidebarTab('participants')
    if (!isSidebarOpen || sidebarTab === 'participants') toggleSidebar()
  }

  return (
    <div className="h-20 bg-[#0f0f17] border-t border-[#1e1e2a] flex items-center justify-between px-6">
      {/* Left: secondary controls */}
      <div className="flex items-center gap-2">
        <ControlBtn
          active={captionsEnabled}
          onClick={handleToggleCaptions}
          label="CC"
          icon="💬"
          title="Toggle Subtitles"
        />
        <ControlBtn
          active={isSidebarOpen && sidebarTab === 'chat'}
          onClick={handleToggleChat}
          label="Chat"
          icon="📩"
          title="Toggle Chat"
        />
        <ControlBtn
          active={isSidebarOpen && sidebarTab === 'participants'}
          onClick={handleToggleParticipants}
          label="People"
          icon="👥"
          title="Participants"
        />
      </div>

      {/* Center: media controls */}
      <div className="flex items-center gap-3">
        <MediaBtn
          on={isMicOn}
          onClick={toggleMic}
          iconOn="🎙️"
          iconOff="🔇"
          labelOn="Mic"
          labelOff="Muted"
          offColor="bg-red-600"
          title={isMicOn ? 'Mute mic' : 'Unmute mic'}
        />
        <MediaBtn
          on={isCameraOn}
          onClick={toggleCamera}
          iconOn="📹"
          iconOff="📷"
          labelOn="Camera"
          labelOff="Camera off"
          offColor="bg-red-600"
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        />
        <MediaBtn
          on={isScreenSharing}
          onClick={onScreenShare}
          iconOn="🖥️"
          iconOff="🖥️"
          labelOn="Sharing"
          labelOff="Share"
          offColor="bg-indigo-600"
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          activeColor={isScreenSharing ? 'bg-indigo-600' : undefined}
        />
      </div>

      {/* Right: leave */}
      <div className="flex items-center">
        <button
          onClick={onLeave}
          className="flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 transition-all duration-200 cursor-pointer group"
          title="Leave meeting"
        >
          <span className="text-lg">📞</span>
          <span className="text-[10px] text-red-100 font-medium">Leave</span>
        </button>
      </div>
    </div>
  )
}

function ControlBtn({ onClick, label, icon, active, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
        active ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-[#1c1c28] hover:text-slate-200'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

function MediaBtn({ on, onClick, iconOn, iconOff, labelOn, labelOff, offColor, title, activeColor }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
        on
          ? activeColor
            ? `${activeColor} text-white`
            : 'bg-[#1c1c28] text-slate-200 hover:bg-[#252535]'
          : `${offColor} text-white hover:opacity-90`
      }`}
    >
      <span className="text-lg">{on ? iconOn : iconOff}</span>
      <span className="text-[10px] font-medium">{on ? labelOn : labelOff}</span>
    </button>
  )
}
