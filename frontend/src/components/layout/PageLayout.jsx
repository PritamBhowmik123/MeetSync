import Navbar from './Navbar'

export default function PageLayout({ children, className = '' }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <main className={`pt-14 ${className}`}>
        {children}
      </main>
    </div>
  )
}
