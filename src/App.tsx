import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import FeeSearch from './pages/FeeSearch';
import MaterialSearch from './pages/MaterialSearch';
import DrugSearch from './pages/DrugSearch';
import PregnancyDrugSearch from './pages/PregnancyDrugSearch';
import GosiQnaSearch from './pages/GosiQnaSearch'; // [추가됨] 고시·Q&A 통합 검색 컴포넌트 임포트
import KcdFeeMatcher from './pages/KcdFeeMatcher';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fee" element={<FeeSearch />} />
        <Route path="/material" element={<MaterialSearch />} />
        <Route path="/drug" element={<DrugSearch />} />
        <Route path="/pregnancy" element={<PregnancyDrugSearch />} />
        <Route path="/gosi-qna-search" element={<GosiQnaSearch />} /> {/* [추가됨] 고시·Q&A 페이지 경로 연결 */}
        <Route path="/kcd-fee-match" element={<KcdFeeMatcher />} />
      </Routes>
    </Router>
  );
};

export default App;