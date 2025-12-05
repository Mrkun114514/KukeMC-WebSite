import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import PlayerList from './pages/PlayerList';
import BanList from './pages/BanList';
import Stats from './pages/Stats';
import Messages from './pages/Messages';
import Skin from './pages/Skin';
import Profile from './pages/Profile';
import TicketCenter from './pages/Tickets';
import News from './pages/News';
import Monitor from './pages/Monitor';
import Thanks from './pages/Thanks';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="news" element={<News />} />
          <Route path="changelog" element={<News />} />
          <Route path="players" element={<PlayerList />} />
          <Route path="bans" element={<BanList />} />
          <Route path="stats" element={<Stats />} />
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


