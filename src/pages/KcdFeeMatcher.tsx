import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Activity, AlertCircle, Loader2, Stethoscope, ChevronRight } from 'lucide-react';

// 하이라이트 로직 (2자 이상 키워드만 적용하여 가독성 확보)
const FullTextHighlight = ({ text, keywords }: { text: string, keywords: string[] }) => {
    const validKeywords = keywords.filter(k => k && k.trim().length > 1);
    if (!text || validKeywords.length === 0) return <>{text}</>;
    const pattern = validKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                validKeywords.some(k => k.toLowerCase() === part.toLowerCase()) ? (
                    <mark key={i} className="bg-amber-200 text-amber-900 px-0.5 rounded font-bold">{part}</mark>
                ) : (part)
            )}
        </>
    );
};

export default function KcdFeeMatcher() {
    const navigate = useNavigate();
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [kcdMaster, setKcdMaster] = useState<Record<string, string>>({});
    const [hiraMaster, setHiraMaster] = useState<any[]>([]);

    const [kcdSearch, setKcdSearch] = useState('');
    const [selectedKcd, setSelectedKcd] = useState<{ code: string, name: string } | null>(null);
    const [extraSearch, setExtraSearch] = useState('');

    const [searchTriggered, setSearchTriggered] = useState(false);
    const [finalKcd, setFinalKcd] = useState<{ code: string, name: string } | null>(null);
    const [finalExtra, setFinalExtra] = useState('');
    const [matchedResults, setMatchedResults] = useState<any[]>([]);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [kcdRes, hiraRes] = await Promise.all([
                    fetch('/kcd_master.json'),
                    fetch('/hira_fee_firebase_master.json')
                ]);
                const kcdData = await kcdRes.json();
                const hiraDataObj = await hiraRes.json();
                setKcdMaster(kcdData);
                setHiraMaster(Object.values(hiraDataObj));
            } catch (err) {
                console.error("데이터 로드 실패:", err);
            } finally {
                setIsDbLoading(false);
            }
        };
        loadAllData();
    }, []);

    const filteredKcd = useMemo(() => {
        if (kcdSearch.length < 1 || selectedKcd?.name === kcdSearch) return [];
        return Object.entries(kcdMaster)
            .filter(([code, name]) =>
                code.toLowerCase().includes(kcdSearch.toLowerCase()) || name.includes(kcdSearch)
            )
            .slice(0, 80);
    }, [kcdSearch, kcdMaster, selectedKcd]);

    const handleSelectKcd = (code: string, name: string) => {
        setSelectedKcd({ code, name });
        setKcdSearch(name);
    };

    const handleMainSearch = () => {
        const currentName = selectedKcd ? selectedKcd.name : kcdSearch;
        if (!currentName) {
            alert("상병명을 선택하거나 입력하십시오.");
            return;
        }

        setFinalKcd({ code: selectedKcd?.code || "", name: currentName });
        setFinalExtra(extraSearch);
        setSearchTriggered(true);

        let core = currentName.split('(')[0].trim().split(',')[0].trim();
        core = core.replace(/^(급성|만성|상세불명|병적 골절이 없는|폐경후|기타)\s+/, '');
        if (core.length > 4 && core.includes('골다공증')) core = '골다공증';

        const extraKeywords = extraSearch.split(/[,/\s]+/).filter(k => k.trim().length > 1);
        const allKeywords = [core, ...extraKeywords];

        const results = hiraMaster.filter(item => {
            const content = (item.title + (item.full_text || "")).toLowerCase();
            return allKeywords.every(k => content.includes(k.toLowerCase()));
        });

        setMatchedResults(results.sort((a, b) => (Number(b.posted_date) || 0) - (Number(a.posted_date) || 0)));
    };

    if (isDbLoading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#4a78d2] animate-spin mb-4" />
                <h2 className="text-xl font-bold text-gray-800 tracking-tighter">심평원 마스터 데이터베이스 로딩 중...</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col items-center w-full text-gray-800">
            <header className="w-full bg-[#4a78d2] py-4 px-6 shadow-md">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="flex items-center gap-1 text-white bg-blue-800 hover:bg-blue-900 px-3 py-1.5 rounded-md text-sm font-bold transition-colors">
                        <ArrowLeft className="w-4 h-4" /> 허브로 이동
                    </button>
                    <div className="text-xl font-bold text-white tracking-wide">상병명-요양급여기준 연칭 검색</div>
                </div>
            </header>

            <main className="w-full max-w-4xl mx-auto flex flex-col items-center mt-12 px-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 border-b-4 border-gray-800 pb-3 mb-8 text-center tracking-tight">
                    KCD 상병-요양급여기준 연칭 검색 엔진
                </h1>

                <div className="bg-[#edf2fa] text-[#1e3a8a] p-6 md:p-8 rounded-sm mb-10 w-full shadow-inner text-base">
                    <ol className="list-decimal pl-6 space-y-2 font-medium break-keep">
                        <li className="pl-1">KCD 상병명 또는 상병 코드를 입력하시면 관련 요양급여기준 정보가 검색됩니다. [cite: 134]</li>
                        <li className="pl-1">상병명을 입력하고 제안 목록에서 선택하시면 입력창에 해당 상병이 입력됩니다. [cite: 135]</li>
                        <li className="pl-1">2단계 필터링 박스에 <span className="font-bold underline">약제명이나 추가 키워드들</span>을 입력하신 후 [검색] 버튼을 누르십시오. [cite: 136]</li>
                        <li className="pl-1">다중 키워드는 콤마(,) 또는 공백으로 구분합니다. [cite: 137]</li>
                        <li className="text-red-500 font-bold italic">※ 상병 선택만으로는 검색되지 않습니다. 반드시 우측의 [검색] 버튼을 클릭해 주십시오. [cite: 138]</li>
                    </ol>
                </div>

                <div className="w-full flex flex-col md:flex-row mb-12 shadow-md border-2 border-[#4a78d2] rounded-sm overflow-visible bg-white">
                    <div className="flex-1 relative border-b-2 md:border-b-0 md:border-r-2 border-gray-100 overflow-visible">
                        <input
                            type="text"
                            className="w-full p-4 text-xl font-bold outline-none"
                            placeholder="[1단계] 상병코드/명"
                            value={kcdSearch}
                            onChange={(e) => {
                                setKcdSearch(e.target.value);
                                if (selectedKcd && e.target.value !== selectedKcd.name) setSelectedKcd(null);
                            }}
                        />
                        {filteredKcd.length > 0 && (
                            <div className="absolute left-0 right-0 top-full bg-white border-2 border-[#4a78d2] shadow-2xl z-[100] max-h-[300px] overflow-y-auto">
                                {filteredKcd.map(([code, name]) => (
                                    <div key={code} onClick={() => handleSelectKcd(code, name)} className="px-6 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex justify-between items-center group font-bold">
                                        <span className="font-bold text-gray-800 group-hover:text-[#4a78d2] text-sm md:text-lg">{name}</span>
                                        <span className="text-[10px] md:text-sm font-mono text-gray-400 uppercase tracking-widest">{code}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <input
                            type="text"
                            className="w-full p-4 text-xl font-bold outline-none text-[#4a78d2]"
                            placeholder="[2단계] 추가 키워드"
                            value={extraSearch}
                            onChange={(e) => setExtraSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleMainSearch()}
                        />
                    </div>
                    <button className="bg-black hover:bg-gray-800 text-white font-bold px-10 py-4 md:py-0 text-xl transition-colors" onClick={handleMainSearch}>검색</button>
                </div>

                {searchTriggered && finalKcd && (
                    <div className="w-full space-y-8 mb-20 animate-[fadeInUp_0.3s_ease-out]">
                        <div className="bg-[#d35400] text-white p-6 md:p-8 flex items-center justify-between shadow-md rounded-sm gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] md:text-xs font-black bg-white/20 px-2 py-1 rounded tracking-widest uppercase font-mono">SEARCH RESULT</span>
                                <h3 className="text-xl md:text-3xl font-black">{finalKcd.name} {finalKcd.code && `[${finalKcd.code}]`}</h3>
                                {finalExtra && <p className="text-orange-100 text-xs md:text-sm font-medium italic">"{finalExtra}" 필터가 적용된 결과입니다.</p>}
                            </div>
                            <div className="bg-black/10 p-3 md:p-5 border border-white/20 text-center min-w-[100px] md:min-w-[120px] self-end sm:self-center">
                                <p className="text-orange-100 text-[10px] md:text-xs font-black mb-1 uppercase tracking-widest">MATCHED</p>
                                <p className="text-3xl md:text-4xl font-black">{matchedResults.length}<span className="text-lg ml-1">건</span></p>
                            </div>
                        </div>

                        {matchedResults.map((item, idx) => (
                            <div key={idx} className="bg-white p-5 md:p-8 border border-gray-200 rounded-sm shadow-sm hover:border-[#4a78d2] transition-all">
                                <div className="flex justify-between items-center mb-4 md:mb-6">
                                    <span className={`text-[10px] md:text-xs font-black px-2 md:px-3 py-1 md:py-1.5 rounded-sm border tracking-widest uppercase ${item.category === '행정해석' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                        {item.category || '요양급여기준'} [cite: 161]
                                    </span>
                                    <span className="text-[10px] md:text-sm text-gray-400 font-bold">{item.posted_date || item.gosi_year || '날짜 미상'} [cite: 162]</span>
                                </div>
                                <h4 className="text-lg md:text-2xl font-black text-gray-900 mb-4 md:mb-5 leading-tight group-hover:underline decoration-blue-500 decoration-2 md:decoration-4">{item.title} [cite: 163]</h4>
                                <div className="text-base md:text-[17px] text-gray-700 leading-relaxed bg-gray-50 p-4 md:p-6 border border-gray-100 whitespace-pre-wrap rounded-sm font-medium">
                                    <FullTextHighlight text={item.full_text || ""} keywords={[finalKcd.name, ...finalExtra.split(/[,/\s]+/)]} /> [cite: 164, 165, 166]
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <footer className="w-full max-w-4xl border-t border-[#4a78d2] mt-12 py-6 text-center text-gray-800 font-extrabold tracking-wide text-sm opacity-80">
                Copyright © iFem (최종 업데이트: 2026. 03. 15. 11:47) [cite: 103, 176]
            </footer>
        </div>
    );
}