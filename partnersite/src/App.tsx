import { Routes, Route } from 'react-router-dom'
// import Home from './pages/Home'
// import UserHome from './pages/UserHome'
// import MyPage from './pages/MyPage'
import Settlements from './pages/Settlements'
import SettlementContributionPage from './pages/SettlementContributionPage.tsx'

function App() {
  return (
    <Routes>
      {/* <Route path="/" element={<Home />} /> */}
      {/* <Route path="/" element={<UserHome />} /> */}
      {/* <Route path="/" element={<MyPage />} /> */}
      <Route path="/" element={<Settlements />} />
      <Route path="/settlements/:projectId" element={<SettlementContributionPage />} />
    </Routes>
  )
}

export default App
