import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Broadcast from './pages/Broadcast'
import Archive from './pages/Archive'
import AdminDashboard from './pages/AdminDashboard'
import Status from './pages/Status'
import Live from './pages/Live'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/broadcast" element={<Broadcast />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/status" element={<Status />} />
          <Route path="/live" element={<Live />} />
          <Route path="/live/:broadcastId" element={<Live />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
