import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Printer } from 'lucide-react';

interface MaterialRecord {
    코드: string;
    중분류: string;
    품명: string;
    규격: string;
    제조사: string;
    상한금액: string;
    단위: string;
}

const MaterialSearch: React.FC = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState<string>('');
    const [isSearched, setIsSearched] = useState<boolean>(false);

    const [materialData, setMaterialData] = useState<MaterialRecord[]>([]);
    const [filteredData, setFilteredData] = useState<MaterialRecord[]>([]);
    const [statusMsg, setStatusMsg] = useState<string>('치료재료 마스터 로딩 중...');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetch('/material_master.csv');
                if (!res.ok) throw new Error('material_master.csv 로드 실패');

                const lastMod = res.headers.get('Last-Modified');
                if (lastMod) {
                    const date = new Date(lastMod);
                    setLastUpdated(date.toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    }));
                } else {
                    setLastUpdated('최신 데이터 반영 완료');
                }

                const text = await res.text();
                const parsed = Papa.parse(text, { header: true, skipEmptyLines: true }).data as any[];

                const masters: MaterialRecord[] = parsed.map(item => {
                    const priceKey = Object.keys(item).find(k => k.replace(/\s/g, '').includes('상한금액'));
                    const makerKey = Object.keys(item).find(k => k.replace(/\s/g, '').includes('제조회사') || k.replace(/\s/g, '').includes('수입업소'));
                    return {
                        코드: item['코드']?.trim() || '',
                        중분류: item['중분류']?.trim() || '',
                        품명: item['품명']?.trim() || '',
                        규격: item['규격']?.trim() || '',
                        제조사: makerKey ? item[makerKey]?.trim() : '',
                        상한금액: priceKey ? item[priceKey]?.trim() : '',
                        단위: item['단위']?.trim() || '',
                    };
                }).filter(item => item.코드 !== '' && /^[a-zA-Z0-9]+$/.test(item.코드));
                setMaterialData(masters);
                setStatusMsg(`✅ 치료재료 마스터 연동 완료: 총 ${masters.length.toLocaleString()}건 탑재됨.`);
                setIsLoading(false);
            } catch (error: any) {
                console.error("데이터 로딩 오류:", error);
                setStatusMsg(`❌ 데이터 로딩 실패. public 폴더에 material_master.csv 파일이 있는지 확인하십시오.`);
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSearch = () => {
        const targetKeyword = keyword.trim();
        if (!targetKeyword) {
            alert("검색어를 입력하십시오.");
            return;
        }
        if (isLoading) {
            alert("데이터베이스 로딩 중입니다.");
            return;
        }

        setIsSearched(true);

        const keywords = targetKeyword.split(/[\s,]+/).filter(Boolean);
        const targetData = materialData.filter(item => {
            const searchString = `${item.코드} ${item.중분류} ${item.품명} ${item.규격} ${item.제조사}`.toLowerCase();
            return keywords.every(kw => searchString.includes(kw.toLowerCase()));
        });
        setFilteredData(targetData);
    };

    const getHighlightedText = (text: string, keywords: string[]) => {
        if (!keywords.length || !text) return text;
        const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) =>
                    keywords.some(kw => kw.toLowerCase() === part.toLowerCase()) ?
                        <span key={i} className="bg-emerald-200 font-bold text-gray-900 px-1 rounded">{part}</span> : part
                )}
            </span>
        );
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => alert("클립보드에 복사되었습니다."));
    };

    // [전체 복사] 로직 추가
    const handleCopyAll = () => {
        if (filteredData.length === 0) {
            alert('복사할 데이터가 없습니다.');
            return;
        }
        let clipboardText = `[치료재료 마스터 검색 결과: "${keyword}"]\n\n`;
        filteredData.forEach(item => {
            clipboardText += `[${item.코드}] ${item.품명}\n분류: ${item.중분류}\n규격: ${item.규격}\n제조사: ${item.제조사}\n상한금액: ${item.상한금액}원\n\n`;
        });
        navigator.clipboard.writeText(clipboardText).then(() => {
            alert('검색된 전체 리스트가 클립보드에 복사되었습니다.');
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('복사에 실패했습니다.');
        });
    };

    // [인쇄] 로직 추가
    const handlePrint = () => {
        window.print();
    };

    const currentKeywords = keyword.trim().split(/[\s,]+/).filter(Boolean);

    return (
        <div className="min-h-screen flex flex-col items-center w-full bg-white text-gray-800 font-sans">

            <header className="w-full bg-[#059669] py-4 px-6 shadow-md sticky top-0 z-50 print:hidden">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-1 text-white bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-md text-sm font-bold transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> 허브로 이동
                        </button>
                        <div className="text-xl font-bold text-white tracking-wide">심평원 치료재료 급여·비급여 목록 및 상한금액표</div>
                    </div>
                </div>
            </header>

            <section className="w-full flex flex-col items-center mt-12 px-4 print:hidden">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 border-b-4 border-gray-800 pb-3 mb-8 text-center tracking-tight">
                    치료재료 마스터 검색 엔진
                </h1>

                <div className="bg-[#ecfdf5] text-[#047857] p-6 md:p-8 rounded-sm mb-10 w-full max-w-3xl shadow-inner text-base md:text-lg">
                    <ol className="list-decimal pl-6 space-y-2 font-medium break-keep">
                        <li className="pl-1">
                            본 검색기는 심평원 공식 <b>[치료재료 전체판 엑셀 데이터]</b>를 100% 직결하여 오류가 없습니다.
                            {lastUpdated && <span className="text-emerald-700 font-bold ml-2">(최종 업데이트: {lastUpdated})</span>}
                        </li>
                        <li className="pl-1">품명, <b>중분류</b>, 규격, 코드, 제조사 등에 대해 다중 검색어(띄어쓰기 및 콤마)를 지원합니다.</li>
                    </ol>
                    <div className={`mt-4 pt-4 border-t border-emerald-200 text-sm font-bold ${isLoading ? 'text-red-500' : 'text-emerald-700'}`}>
                        {statusMsg}
                    </div>
                </div>

                <div className="w-full max-w-4xl flex h-[60px] mb-10 shadow-md">
                    <input
                        type="text"
                        className="flex-1 bg-white border-2 border-[#059669] border-r-0 p-4 text-xl outline-none rounded-l-sm"
                        placeholder="품명, 중분류, 규격, 코드 검색 (예: 골수천자용, 바늘)"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                        className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-10 text-xl rounded-r-sm transition-colors"
                        onClick={handleSearch}
                    >
                        검색
                    </button>
                </div>
            </section>

            <main className="w-full max-w-7xl mx-auto p-4 flex-grow">
                {isSearched && (
                    <div className="animate-[fadeInUp_0.3s_ease-out]">
                        {/* 헤더 및 전체복사/인쇄 액션 바 */}
                        <div className="flex justify-between items-end mb-3">
                            <h2 className="text-xl font-bold text-gray-800 pl-2 border-l-4 border-[#059669]">
                                치료재료 검색 결과 <span className="text-[#059669]">({filteredData.length}건)</span>
                            </h2>
                            <div className="flex gap-2 print:hidden">
                                <button onClick={handleCopyAll} className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-sm font-bold text-sm shadow-sm transition-colors">
                                    <Copy size={16} /> 리스트 전체 복사
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-sm font-bold text-sm shadow-sm transition-colors">
                                    <Printer size={16} /> 인쇄하기
                                </button>
                            </div>
                        </div>

                        {filteredData.length > 0 ? (
                            <div className="bg-white border border-gray-300 rounded-sm shadow-sm overflow-hidden mb-8">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-[#f0fdf4] border-b border-gray-300">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold text-gray-700 w-28">재료코드</th>
                                                <th className="px-4 py-3 text-left font-bold text-gray-700">분류 및 품명</th>
                                                <th className="px-4 py-3 text-left font-bold text-gray-700">규격 / 단위</th>
                                                <th className="px-4 py-3 text-left font-bold text-gray-700 w-48">제조사</th>
                                                <th className="px-4 py-3 text-right font-bold text-gray-700 w-32">상한금액</th>
                                                <th className="px-4 py-3 text-center font-bold text-gray-700 w-20 print:hidden">액션</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredData.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-emerald-50 transition-colors">
                                                    <td className="px-4 py-4 whitespace-nowrap font-bold text-[#059669] align-top">{getHighlightedText(item.코드, currentKeywords)}</td>
                                                    <td className="px-4 py-4 text-gray-900 min-w-[250px] leading-relaxed align-top font-medium">
                                                        {item.중분류 && (
                                                            <div className="text-[11px] text-emerald-700 font-bold mb-1 tracking-tight">
                                                                [{getHighlightedText(item.중분류, currentKeywords)}]
                                                            </div>
                                                        )}
                                                        {getHighlightedText(item.품명, currentKeywords)}
                                                    </td>
                                                    <td className="px-4 py-4 text-gray-700 align-top">
                                                        <div className="text-sm">{getHighlightedText(item.규격, currentKeywords)}</div>
                                                        <div className="text-xs text-gray-400 mt-1">{item.단위}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-gray-600 align-top text-xs break-keep">
                                                        {getHighlightedText(item.제조사, currentKeywords)}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-gray-900 align-top whitespace-nowrap">
                                                        {item.상한금액 ? `${Number(item.상한금액.replace(/,/g, '')).toLocaleString()} 원` : '-'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center align-top print:hidden">
                                                        <button onClick={() => handleCopy(`[${item.코드}] ${item.품명}\n분류: ${item.중분류}\n규격: ${item.규격}\n제조사: ${item.제조사}\n상한금액: ${item.상한금액}원`)} className="text-xs bg-white border border-gray-400 hover:bg-gray-100 px-3 py-1.5 rounded-sm font-bold text-gray-700 shadow-sm">
                                                            복사
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500 text-center py-12 bg-white border border-gray-200 rounded-sm mb-8 shadow-sm">
                                일치하는 치료재료 데이터가 없습니다.
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="w-full max-w-4xl border-t border-[#059669] mt-12 py-6 text-center text-gray-800 font-extrabold tracking-wide text-sm opacity-80 print:hidden">
                Copyright © iFem (최종 업데이트: {lastUpdated})
            </footer>
        </div>
    );
};

export default MaterialSearch;