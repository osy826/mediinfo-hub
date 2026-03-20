import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Printer } from 'lucide-react';

interface FeeRecord {
    출처: string;
    분류번호: string;
    코드: string;
    분류: string;
    점수: string;
    재료대: string;
}

interface GuideRecord {
    출처: string;
    단락명: string;
    내용: string;
}

const App: React.FC = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState<string>('');
    const [isSearched, setIsSearched] = useState<boolean>(false);

    const [feeData, setFeeData] = useState<FeeRecord[]>([]);
    const [guideData, setGuideData] = useState<GuideRecord[]>([]);

    const [filteredFee, setFilteredFee] = useState<FeeRecord[]>([]);
    const [filteredGuide, setFilteredGuide] = useState<GuideRecord[]>([]);

    const [progressLogs, setProgressLogs] = useState<string[]>(['데이터베이스 연동 준비 중...']);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    // [핵심 방어막] React StrictMode의 중복 실행을 막기 위한 장치
    const isFirstRun = useRef(true);

    useEffect(() => {
        // 이미 한 번 실행되었다면 두 번째 실행(React 테스트)은 강제 종료
        if (!isFirstRun.current) return;
        isFirstRun.current = false;

        const loadAllData = async () => {
            try {
                setProgressLogs(['산정지침 데이터 확인 중...']);
                const jsonRes = await fetch('/통합_산정지침_구조화.json');
                let jsonData: GuideRecord[] = [];
                if (jsonRes.ok) {
                    jsonData = await jsonRes.json();
                    setGuideData(jsonData);
                }

                const files = ['/fee_master_1.csv', '/fee_master_2.csv', '/fee_master_3.csv'];
                let allValidFees: FeeRecord[] = [];
                let headerStr = "";

                for (let i = 0; i < files.length; i++) {
                    setProgressLogs(prev => [...prev, `심평원 수가 마스터 ${i + 1} 다운로드 및 해석 중...`]);

                    await new Promise(resolve => setTimeout(resolve, 200));

                    const res = await fetch(files[i]);
                    if (!res.ok) throw new Error(`${files[i]} 로드 실패`);

                    if (i === 0) {
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
                    }

                    const text = await res.text();
                    let textToParse = text;

                    if (i === 0) {
                        headerStr = text.substring(0, text.indexOf('\n'));
                    } else {
                        textToParse = headerStr + "\n" + text;
                    }

                    let validFees: FeeRecord[] = [];

                    Papa.parse(textToParse, {
                        header: true,
                        skipEmptyLines: true,
                        step: function (results) {
                            const item = results.data as any;
                            const code = item['수가코드']?.trim() || '';
                            if (code !== '' && code.length === 5) {
                                validFees.push({
                                    출처: '심평원 수가마스터 원본',
                                    분류번호: item['분류번호']?.trim() || '',
                                    코드: code,
                                    분류: item['한글명']?.trim() || '',
                                    점수: item['상대가치점수'] ? `${item['상대가치점수']}점 (의원단가: ${item['의원단가'] || '0'}원)` : '',
                                    재료대: ''
                                });
                            }
                        }
                    });

                    allValidFees = [...allValidFees, ...validFees];

                    setProgressLogs(prev => {
                        const newLogs = [...prev];
                        newLogs[newLogs.length - 1] = `✅ 심평원 수가 마스터 ${i + 1} 로딩완료 (${validFees.length}건)`;
                        return newLogs;
                    });
                }

                setFeeData(allValidFees);
                setIsLoading(false);

            } catch (error: any) {
                console.error("데이터 로딩 오류:", error);
                setProgressLogs(prev => [...prev, `❌ 데이터 로딩 실패: 네트워크나 파일 상태를 확인하십시오.`]);
                setIsLoading(false);
            }
        };

        setTimeout(() => {
            loadAllData();
        }, 100);
    }, []);

    const handleSearch = () => {
        const targetKeyword = keyword.trim();
        if (!targetKeyword) {
            alert("검색어를 입력하십시오.");
            return;
        }
        if (isLoading) {
            alert("데이터베이스가 아직 로딩 중입니다. 잠시만 기다려주십시오.");
            return;
        }

        setIsSearched(true);
        setIsGuideOpen(false);

        const keywords = targetKeyword.split(/[\s,]+/).filter(Boolean);
        const targetFee = feeData.filter(item => {
            const searchString = `${item.분류번호} ${item.코드} ${item.분류}`.toLowerCase();
            return keywords.every(kw => searchString.includes(kw.toLowerCase()));
        });
        setFilteredFee(targetFee);

        const targetGuide = guideData.filter(item => {
            const searchString = `${item.단락명} ${item.내용}`.toLowerCase();
            return keywords.every(kw => searchString.includes(kw.toLowerCase()));
        });
        setFilteredGuide(targetGuide);
    };

    const getHighlightedText = (text: string, keywords: string[]) => {
        if (!keywords.length || !text) return text;
        const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) =>
                    keywords.some(kw => kw.toLowerCase() === part.toLowerCase()) ?
                        <span key={i} className="bg-yellow-200 font-bold text-gray-900 px-1 rounded">{part}</span> : part
                )}
            </span>
        );
    };

    const renderSmartSnippet = (text: string, keywords: string[]) => {
        if (!keywords.length || !text) return null;
        const lines = text.split('\n');
        const matchedLines = lines.filter(line =>
            keywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))
        );
        if (matchedLines.length === 0) {
            return <span className="text-gray-400 text-sm">해당 단락명(제목)에 키워드가 포함되어 검색되었습니다.</span>;
        }

        return (
            <div className="flex flex-col gap-2">
                {matchedLines.map((line, idx) => (
                    <div key={idx} className="text-sm text-gray-800 bg-white p-2 border-l-4 border-blue-400 rounded shadow-sm">
                        <span className="text-gray-400 font-bold mr-2">↳</span>
                        {getHighlightedText(line, keywords)}
                    </div>
                ))}
            </div>
        );
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => alert("복사 완료"));
    };

    const handleCopyAll = () => {
        if (filteredFee.length === 0 && filteredGuide.length === 0) {
            alert('복사할 데이터가 없습니다.');
            return;
        }
        let clipboardText = `[심평원 수가 검색 결과: "${keyword}"]\n\n`;
        if (filteredFee.length > 0) {
            clipboardText += `=== 수가 및 점수 정보 ===\n`;
            filteredFee.forEach(item => {
                clipboardText += `[${item.분류번호}] ${item.코드} - ${item.분류}\n점수: ${item.점수} / 재료대: ${item.재료대} / 출처: ${item.출처}\n\n`;
            });
        }
        if (filteredGuide.length > 0) {
            clipboardText += `=== 관련 산정 지침 ===\n`;
            filteredGuide.forEach(item => {
                clipboardText += `[${item.단락명}] (출처: ${item.출처})\n${item.내용}\n\n`;
            });
        }
        navigator.clipboard.writeText(clipboardText).then(() => {
            alert('검색된 전체 리스트가 클립보드에 복사되었습니다.');
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('복사에 실패했습니다.');
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const currentKeywords = keyword.trim().split(/[\s,]+/).filter(Boolean);

    return (
        <div className="min-h-screen flex flex-col items-center w-full bg-white text-gray-800 font-sans">
            <header className="w-full bg-[#4a78d2] py-4 px-6 shadow-md print:hidden">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-1 text-white bg-blue-800 hover:bg-blue-900 px-3 py-1.5 rounded-md text-sm font-bold transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> 허브로 이동
                    </button>
                    <div className="text-xl font-bold text-white tracking-wide">건강보험심사평가원 건강보험요양급여비용</div>
                </div>
            </header>

            <section className="w-full flex flex-col items-center mt-12 px-4 print:hidden">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 border-b-4 border-gray-800 pb-3 mb-8 text-center tracking-tight">
                    건강보험요양급여비용 검색 엔진
                </h1>

                <div className="bg-[#edf2fa] text-[#1e3a8a] p-6 md:p-8 rounded-sm mb-10 w-full max-w-3xl shadow-inner text-base md:text-lg">
                    <ol className="list-decimal pl-6 space-y-2 font-medium break-keep">
                        <li className="pl-1">
                            본 검색기는 심평원 공식 <b>[수가마스터 원본 데이터]</b>를 100% 직결하여 오류가 없습니다.
                            {lastUpdated && <span className="text-blue-600 font-bold ml-2">(최종 업데이트: {lastUpdated})</span>}
                        </li>
                        <li className="pl-1">다중 검색어(띄어쓰기 및 콤마)를 지원합니다.</li>
                        <li className="pl-1">결과는 복사 및 인쇄 가능합니다.</li>
                    </ol>

                    <div className="mt-4 pt-4 border-t border-blue-200 text-sm font-bold text-blue-700 bg-white p-4 rounded-sm shadow-sm">
                        {progressLogs.map((log, idx) => (
                            <div key={idx} className={`mb-1.5 ${log.includes('완료') ? 'text-green-600' : log.includes('실패') ? 'text-red-500' : 'text-blue-600 animate-pulse'}`}>
                                {log}
                            </div>
                        ))}
                        {!isLoading && feeData.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 text-indigo-700 text-base">
                                🎉 <strong>최종 탑재 완료: 총 {feeData.length}건.</strong> 이제 검색이 가능합니다.
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full max-w-4xl flex h-[60px] mb-10 shadow-md">
                    <input
                        type="text"
                        className={`flex-1 bg-white border-2 border-[#4a78d2] border-r-0 p-4 text-xl outline-none rounded-l-sm ${isLoading ? 'bg-gray-100' : ''}`}
                        placeholder={isLoading ? "데이터 로딩을 기다려 주십시오..." : "마스터 데이터 검색 (예: 창상, 변연절제)"}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        disabled={isLoading}
                    />
                    <button
                        className={`font-bold px-10 text-xl rounded-r-sm transition-colors ${isLoading ? 'bg-gray-400 cursor-not-allowed text-gray-200' : 'bg-black hover:bg-gray-800 text-white'}`}
                        onClick={handleSearch}
                        disabled={isLoading}
                    >
                        검색
                    </button>
                </div>
            </section>

            <main className="w-full max-w-6xl mx-auto p-4 flex-grow">
                {isSearched && (
                    <div className="animate-[fadeInUp_0.3s_ease-out]">
                        <div className="flex justify-between items-end mb-3">
                            <h2 className="text-xl font-bold text-gray-800 pl-2 border-l-4 border-[#4a78d2]">
                                공식 수가표 검색 결과 <span className="text-[#4a78d2]">({filteredFee.length}건)</span>
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

                        {filteredFee.length > 0 ? (
                            <div className="bg-white border border-gray-300 rounded-sm shadow-sm overflow-hidden mb-8">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-[#f4f7fb] border-b border-gray-300">
                                            <tr>
                                                <th className="px-5 py-3 text-left font-bold text-gray-700 w-24">분류번호</th>
                                                <th className="px-5 py-3 text-left font-bold text-gray-700 w-24">코드</th>
                                                <th className="px-5 py-3 text-left font-bold text-gray-700">분류 (한글명칭)</th>
                                                <th className="px-5 py-3 text-right font-bold text-gray-700 w-48">단가 및 점수</th>
                                                <th className="px-5 py-3 text-center font-bold text-gray-700 w-20 print:hidden">액션</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredFee.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                                    <td className="px-5 py-4 whitespace-nowrap font-medium text-gray-900 align-top">{getHighlightedText(item.분류번호, currentKeywords)}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap font-bold text-[#4a78d2] align-top">{getHighlightedText(item.코드, currentKeywords)}</td>
                                                    <td className="px-5 py-4 text-gray-900 min-w-[350px] leading-relaxed align-top">
                                                        <div className="text-base mb-1.5">{getHighlightedText(item.분류, currentKeywords)}</div>
                                                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                                            <span className="font-bold text-gray-600 border border-gray-300 px-1 rounded-sm bg-gray-50">출처</span>
                                                            <span>{item.출처}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-bold text-gray-900 align-top">
                                                        {item.점수 && <div className="text-sm">{item.점수}</div>}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-center align-top print:hidden">
                                                        <button onClick={() => handleCopy(`[${item.분류번호}] ${item.코드}\n항목: ${item.분류}\n${item.점수}`)} className="text-xs bg-white border border-gray-400 hover:bg-gray-100 px-3 py-1.5 rounded-sm font-bold text-gray-700 shadow-sm">
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
                                일치하는 수가표 데이터가 없습니다.
                            </div>
                        )}

                        <div className="border border-[#4a78d2] rounded-sm shadow-sm bg-white overflow-hidden print:border-none print:shadow-none">
                            <button
                                onClick={() => setIsGuideOpen(!isGuideOpen)}
                                className="w-full px-5 py-4 text-left bg-[#f4f7fb] hover:bg-[#e4ebf5] flex justify-between items-center focus:outline-none transition-colors print:hidden"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-[#1e3a8a]">관련 산정지침 확인하기 (PDF 추출본)</span>
                                    <span className="bg-[#4a78d2] text-white px-2.5 py-0.5 rounded-full text-xs font-bold">{filteredGuide.length}건</span>
                                </div>
                                <span className="text-[#4a78d2] font-bold text-sm">{isGuideOpen ? '▲ 접기' : '▼ 펼치기'}</span>
                            </button>

                            {(isGuideOpen || true) && (
                                <div className={`${!isGuideOpen ? "hidden print:block" : "block"} p-5 bg-white border-t border-[#4a78d2] print:border-none print:p-0 print:mt-4`}>
                                    <h3 className="hidden print:block text-lg font-bold text-[#1e3a8a] mb-4">관련 산정지침 ({filteredGuide.length}건)</h3>
                                    {filteredGuide.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">관련된 산정지침이 없습니다.</p>
                                    ) : (
                                        <div className="flex flex-col gap-5">
                                            {filteredGuide.map((item, idx) => (
                                                <div key={`guide-${idx}`} className="border-b border-dashed border-gray-200 pb-4 last:border-0 last:pb-0">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 text-sm font-bold border border-gray-300 inline-block w-fit">
                                                                {getHighlightedText(item.단락명, currentKeywords)}
                                                            </span>
                                                            <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-1">
                                                                <span className="font-bold text-gray-600 border border-gray-300 px-1 rounded-sm bg-white">출처</span>
                                                                <span>{item.출처}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleCopy(`단락: ${item.단락명}\n출처: ${item.출처}\n내용: ${item.내용}`)} className="text-xs bg-white border border-gray-400 hover:bg-gray-100 px-3 py-1.5 rounded-sm font-bold text-gray-700 shadow-sm whitespace-nowrap ml-2 print:hidden">복사</button>
                                                    </div>
                                                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-sm mt-2">
                                                        {renderSmartSnippet(item.내용, currentKeywords)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </main>

            <footer className="w-full max-w-4xl border-t border-[#4a78d2] mt-12 py-6 text-center text-gray-800 font-extrabold tracking-wide text-sm opacity-80 print:hidden">
                Copyright © iFem (최종 업데이트: {lastUpdated})
            </footer>
        </div>
    );
};

export default App;