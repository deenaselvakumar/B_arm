import Sidebar from '@/components/Sidebar'
import SnapshotProvider from '@/components/SnapshotProvider'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SnapshotProvider>
      <Sidebar>{children}</Sidebar>
    </SnapshotProvider>
  )
}
