import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import PlayerList from './pages/PlayerList';
import BanList from './pages/BanList';
import Stats from './pages/Stats';
import Messages from './pages/Messages';
import Activity from './pages/Activity';
import PostDetail from './pages/PostDetail';
import Skin from './pages/Skin';
import Profile from './pages/Profile';
import TicketCenter from './pages/Tickets';
import News from './pages/News';
import Monitor from './pages/Monitor';
import Thanks from './pages/Thanks';
import Login from './pages/Login';
import UserLevelDashboard from './pages/UserLevelDashboard';
import ConsensusPage from './pages/Consensus';
import ProposalDetail from './pages/ProposalDetail';
import NotFound from './pages/NotFound';
import LiveChat from './pages/LiveChat';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="chat" element={<LiveChat />} />
          <Route path="dashboard" element={<UserLevelDashboard />} />
          <Route path="news" element={<News />} />
          <Route path="changelog" element={<News />} />
          <Route path="players" element={<PlayerList />} />
          <Route path="bans" element={<BanList />} />
          <Route path="stats" element={<Stats />} />
          <Route path="activity" element={<Activity />} />
          <Route path="activity/:id" element={<PostDetail />} />
          <Route path="consensus" element={<ConsensusPage />} />
          <Route path="consensus/:id" element={<ProposalDetail />} />
          <Route path="monitor" element={<Monitor />} />
          <Route path="messages" element={<Messages />} />
          <Route path="tickets" element={<TicketCenter />} />
          <Route path="player/:username" element={<Profile />} />
          <Route path="skin" element={<Skin />} />
          <Route path="thanks" element={<Thanks />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;


