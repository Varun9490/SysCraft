import { SiteChrome } from "@/components/nav/SiteChrome";
import { RoomLobby } from "@/components/room/RoomLobby";

export const metadata = {
  title: "Live Rooms — P2P Collaboration | SysCraft",
  description:
    "Design architectures together: create or join a room and edit the same SysCraft canvas peer-to-peer over WebRTC. No accounts, no server state, end-to-end encrypted.",
};

export default function RoomPage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <RoomLobby />
      </div>
    </SiteChrome>
  );
}
