import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, BookOpen, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

export default function GosiQnaSearch() {
    const navigate = useNavigate();
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [masterData, setMasterData] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetch('/hira_fee_firebase_master.json');
                const data = await res.json();
                setMasterData(Object.values(data));
            } catch (err) {
                console.error("데이터 로딩 실패:", err);
            } finally {
                setIsDbLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSearch = () => {
        if (!searchTerm.trim()) return;
        const keywords = searchTerm.split(/[,/\s]+/).filter(k => k.length > 0);
        const filtered = masterData.filter(item => {
            const content = (item.title + (item.full_text || "")).toLowerCase();
            return keywords.every(k => content.includes(k.toLowerCase()));
        });
        setResults(filtered.sort((a, b) => (Number(b.posted_date) || 0) - (Number(a.posted_date) || 0)));
    };

    if (isDbLoading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-800">지침 마스터 데이터 로딩 중...</h2>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col items-center">
            <header className="w-full bg-[#3b5998] py-3 px-6 shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 px-3 py-1 bg-blue-800/50 hover:bg-blue-800 text-white rounded font-bold text-sm transition-all mr-4">
                        <ArrowLeft className="w-4 h-4" /> 허브로 이동
                    </button>
                    <span className="text-lg font-bold text-white tracking-tight">심평원 요양급여기준 및 Q&A 통합 검색</span>
                </div>
            </header>

            <main className="w-full max-w-5xl mx-auto p-6 flex-grow flex flex-col items-center mt-10">
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 border-b-4 border-gray-900 inline-block pb-2">심평원 임상 지침 검색 엔진</h1>
                </div>

                <div className="w-full bg-[#f1f5f9] border border-blue-100 rounded-sm p-6 md:p-8 mb-10 text-left">
                    <ol className="list-none text-slate-600 space-y-3 font-bold text-[15px] md:text-[16px] leading-relaxed break-keep">
                        <li>1. 건강보험심사평가원의 **요양급여기준 고시, 실무 질의응답(Q&A), 행정해석** 등을 검색합니다.</li>
                        <li>2. 다중 검색어(쉼표 또는 띄어쓰기)를 통한 상세 검색을 지원합니다. (예: 폐경, 호르몬)</li>
                        <li className="text-rose-500">3. 문서 누락으로 검색이 되지 않을 수 있으니, 필요 시 심평원 홈페이지를 확인하시기 바랍니다.</li>
                        <li className="text-blue-600 font-black italic">✓ 심평원 마스터 연동 완료: 총 {masterData.length}건 탑재됨 (로컬 캐싱 적용).</li>
                    </ol>
                </div>

                <div className="w-full mb-12">
                    <div className="flex border-2 border-gray-800 rounded-sm overflow-hidden shadow-lg bg-white h-[50px] md:h-[60px]">
                        <input
                            type="text"
                            // [수정 핵심] min-w-0을 추가하여 모바일 화면에서 버튼 영역 침범 방지
                            className="flex-grow min-w-0 px-3 py-3 md:px-6 md:py-4 text-base md:text-xl font-bold focus:outline-none placeholder:text-gray-300"
                            placeholder="검색어 입력 (예: 골밀도)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            onClick={handleSearch}
                            // [수정 핵심] shrink-0 whitespace-nowrap 추가로 버튼 찌그러짐 및 글자 줄바꿈 원천 차단
                            className="bg-black text-white px-5 md:px-10 h-full flex items-center justify-center font-bold text-base md:text-xl hover:bg-gray-800 transition-colors shrink-0 whitespace-nowrap"
                        >
                            검색
                        </button>
                    </div>
                </div>

                <div className="w-full space-y-8 mb-20">
                    {results.map((item, idx) => (
                        <div key={idx} className="bg-white p-6 md:p-8 border-2 border-gray-100 hover:border-gray-800 transition-all group shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-sm border border-indigo-200 uppercase tracking-widest">{item.category || '지침'}</span>
                                <span className="text-sm text-gray-400 font-bold">{item.posted_date || '날짜 미상'}</span>
                            </div>
                            <h4 className="text-xl md:text-2xl font-black text-gray-900 mb-5 leading-tight group-hover:underline break-keep">{item.title}</h4>
                            <div className="text-[15px] md:text-[17px] text-gray-700 leading-relaxed bg-gray-50 p-4 md:p-6 border border-gray-100 whitespace-pre-wrap mb-4 font-medium break-words">
                                {item.full_text}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="w-full border-t border-blue-200 mt-20 py-8 text-center text-gray-500 font-bold text-sm bg-white">
                Copyright © iFem (최종 업데이트: 2026. 03. 15. 11:47)
            </footer>
        </div>
    );
}