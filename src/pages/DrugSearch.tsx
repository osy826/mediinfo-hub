import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Printer } from 'lucide-react';

interface DrugRecord {
    제품코드: string;
    적용시작일자: string;
    급여기준: string;
    상한가: string;
    가산금: string;
    투여경로: string;
    제품명: string;
    규격: string;
    단위: string;
    업체명: string;
    분류번호: string;
    주성분코드: string;
    전문일반: string;
    퇴장방지: string;
    식약처주성분: string; // [신규] 식약처 영문 주성분 추가
    식약처상태: string;   // 필터링용
}

const DrugSearch: React.FC = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState<string>('');
    const [isSearched, setIsSearched] = useState<boolean>(false);

    const [drugData, setDrugData] = useState<DrugRecord[]>([]);
    const [filteredData, setFilteredData] = useState<DrugRecord[]>([]);

    const [statusMsg, setStatusMsg] = useState<string>('심평원 및 식약처 마스터 이중 동기화 중...');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [drugRes, kpicRes] = await Promise.all([
                    fetch('/drug_master.csv'),
                    fetch('/kpic_master.csv')
                ]);

                if (!drugRes.ok) throw new Error('drug_master.csv 로드 실패');
                if (!kpicRes.ok) throw new Error('kpic_master.csv 로드 실패');

                const lastMod = drugRes.headers.get('Last-Modified');
                if (lastMod) {
                    const date = new Date(lastMod);
                    setLastUpdated(date.toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    }));
                } else {
                    setLastUpdated('최신 데이터 반영 완료');
                }

                const drugText = await drugRes.text();
                const kpicText = await kpicRes.text();

                const parsedDrug = Papa.parse(drugText, { header: true, skipEmptyLines: true }).data as any[];
                const parsedKpic = Papa.parse(kpicText, { header: true, skipEmptyLines: true }).data as any[];

                // 1. 식약처 임상 데이터 해시맵(Hash Map) 구축
                const kpicMap = new Map<string, { 상태: string, 주성분: string }>();
                parsedKpic.forEach(item => {
                    const codeKey = Object.keys(item).find(k => k.replace(/\s/g, '').includes('보험코드'));
                    const statusKey = Object.keys(item).find(k => k.replace(/\s/g, '').includes('취소/취하구분') || k.replace(/\s/g, '').includes('품목상태'));
                    const ingredientKey = Object.keys(item).find(k => k.replace(/\s/g, '').includes('주성분'));

                    const rawCode = codeKey ? item[codeKey]?.trim() : '';

                    if (rawCode) {
                        const codes = rawCode.split('|');
                        codes.forEach(c => {
                            const cleanCode = c.trim();
                            if (cleanCode) {
                                kpicMap.set(cleanCode, {
                                    상태: statusKey ? item[statusKey]?.trim() : '',
                                    주성분: ingredientKey ? item[ingredientKey]?.trim() : ''
                                });
                            }
                        });
                    }
                });

                // 2. 심평원 데이터 맵핑 및 식약처 데이터 기반 교차 필터링
                const masters: DrugRecord[] = parsedDrug.map(item => {
                    const findKey = (str: string) => Object.keys(item).find(k => k.replace(/\s/g, '').includes(str));
                    const 제품코드 = item[findKey('제품코드') || '제품코드']?.trim() || '';
                    const kpicInfo = kpicMap.get(제품코드);

                    return {
                        제품코드,
                        적용시작일자: item[findKey('적용시작일자') || '적용시작일자']?.trim() || '',
                        급여기준: item[findKey('급여기준') || '급여기준']?.trim() || '',
                        상한가: item[findKey('상한가') || '상한가']?.trim() || '',
                        가산금: item[findKey('가산금') || '가산금']?.trim() || '',
                        투여경로: item[findKey('투여경로') || '투여경로']?.trim() || '',
                        제품명: item[findKey('제품명') || '제품명']?.trim() || '',
                        규격: item[findKey('규격') || '규격']?.trim() || '',
                        단위: item[findKey('단위') || '단위']?.trim() || '',
                        업체명: item[findKey('업체명') || '업체명']?.trim() || '',
                        분류번호: item[findKey('분류번호') || '분류번호']?.trim() || '',
                        주성분코드: item[findKey('주성분코드') || '주성분코드']?.trim() || '',
                        전문일반: item[findKey('전문') || '전문/일반']?.trim() || '',
                        퇴장방지: item[findKey('퇴장방지') || '퇴장방지']?.trim() || '',
                        식약처주성분: kpicInfo ? kpicInfo.주성분 : '', // 식약처 주성분 이식
                        식약처상태: kpicInfo ? kpicInfo.상태 : ''
                    };
                }).filter(item => {
                    // 1차: 기본 코드 무결성 및 심평원 급여 삭제 품목 컷팅
                    if (item.제품코드 === '' || !/^[0-9A-Za-z]+$/.test(item.제품코드) || item.급여기준.includes('삭제')) {
                        return false;
                    }

                    // 2차: 취하, 취소, 유효기간만료 원천 차단
                    if (item.식약처상태.includes('취하') || item.식약처상태.includes('취소') || item.식약처상태.includes('유효기간만료')) {
                        return false;
                    }

                    // 3차: 특정 복합제 원천 차단
                    const forbiddenIngredients = /파마브롬|pamabrom|레바미피드|rebamipide|파모티딘|famotidine|위장약/i;
                    if (item.식약처주성분 && forbiddenIngredients.test(item.식약처주성분)) {
                        return false;
                    }

                    return true;
                });

                setDrugData(masters);
                setStatusMsg(`✅ 심평원+식약처 교차 검증 완료: 정상 유통 품목 ${masters.length.toLocaleString()}건 탑재 (단종/취하 및 복합제 자동 배제).`);
                setIsLoading(false);
            } catch (error: any) {
                console.error("데이터 로딩 오류:", error);
                setStatusMsg(`❌ 이중 데이터 연동 실패. public 폴더에 drug_master.csv와 kpic_master.csv가 모두 있는지 확인하십시오.`);
                setIsLoading(false);
            }
        };

        loadAllData();
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

        const targetData = drugData.filter(item => {
            const hiddenTag = item.퇴장방지 ? `퇴장방지 ${item.퇴장방지}` : '';

            // [기능 업그레이드] 검색 풀에 '식약처주성분(영문)'을 포함시켜 영문 검색 완벽 대응
            const searchString = `${item.제품코드} ${item.제품명} ${item.주성분코드} ${item.업체명} ${item.규격} ${item.전문일반} ${hiddenTag} ${item.식약처주성분}`.toLowerCase();

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
                        <span key={i} className="bg-purple-200 font-bold text-gray-900 px-1 rounded">{part}</span> : part
                )}
            </span>
        );
    };

    const handleCopySingle = (item: DrugRecord) => {
        // 단일 복사 내용에도 식약처 성분명 추가
        const copyText = `[${item.제품코드}] ${item.제품명}\n식약처 성분: ${item.식약처주성분}\n주성분코드: ${item.주성분코드}\n규격: ${item.규격} ${item.단위} (${item.투여경로})\n업체명: ${item.업체명}\n상한가: ${item.상한가}원`;
        navigator.clipboard.writeText(copyText).then(() => alert("클립보드에 복사되었습니다."));
    };

    const handleCopyAll = () => {
        if (filteredData.length === 0) {
            alert("복사할 데이터가 없습니다.");
            return;
        }
        // 전체 복사 엑셀 헤더에도 추가
        const header = "제품/성분코드\t제품명\t식약처 성분명\t규격 및 투여경로\t업체명\t상한금액(원)\t급여기준\n";
        const rows = filteredData.map(item => {
            const 상한가 = item.상한가 ? item.상한가.replace(/,/g, '') : '0';
            return `${item.제품코드}\t${item.제품명}\t${item.식약처주성분}\t${item.규격}${item.단위}(${item.투여경로})\t${item.업체명}\t${상한가}\t${item.급여기준}`;
        }).join('\n');

        navigator.clipboard.writeText(header + rows).then(() => {
            alert(`총 ${filteredData.length}건의 리스트가 클립보드에 복사되었습니다.\n(엑셀 파일에 바로 붙여넣기 하실 수 있습니다)`);
        });
    };

    const handlePrintAll = () => {
        if (filteredData.length === 0) {
            alert("인쇄할 데이터가 없습니다.");
            return;
        }
        window.print();
    };

    const currentKeywords = keyword.trim().split(/[\s,]+/).filter(Boolean);

    return (
        <div className="min-h-screen flex flex-col items-center w-full bg-white text-gray-800 font-sans print:bg-white">

            <header className="w-full bg-[#6b21a8] py-4 px-6 shadow-md sticky top-0 z-50 print:hidden">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-1 text-white bg-purple-800 hover:bg-purple-900 px-3 py-1.5 rounded-md text-sm font-bold transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> 허브로 이동
                        </button>
                        <div className="text-xl font-bold text-white tracking-wide">심평원 약제 급여 목록 및 상한금액표</div>
                    </div>
                </div>
            </header>

            <section className="w-full flex flex-col items-center mt-12 px-4 print:hidden">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 border-b-4 border-gray-800 pb-3 mb-8 text-center tracking-tight">
                    약가 마스터 검색 엔진
                </h1>

                <div className="bg-[#faf5ff] text-[#6b21a8] p-6 md:p-8 rounded-sm mb-10 w-full max-w-3xl shadow-inner text-base md:text-lg">
                    <ol className="list-decimal pl-6 space-y-2 font-medium break-keep">
                        <li className="pl-1">
                            본 검색기는 심평원 공식 <b>[약가 전체판]</b>과 식약처 <b>[품목허가 원본]</b>을 이중 결합하여 교차 검증합니다.
                            {lastUpdated && <span className="text-purple-700 font-bold ml-2">(최종 업데이트: {lastUpdated})</span>}
                        </li>
                        <li className="pl-1 text-red-600 font-bold">허가 취하, 단종, 및 특정 목적 복합제(파마브롬, 위장약 포함)는 검색 결과에서 원천 배제됩니다.</li>
                        <li className="pl-1">제품명, 주성분코드, <b>식약처 영문 성분명</b> 등에 대해 다중 검색어(띄어쓰기 및 콤마)를 지원합니다.</li>
                        <li className="pl-1">퇴장방지 약물의 종류를 알고 싶으면, <b>'퇴장방지'</b> 검색어를 입력하세요.</li>
                    </ol>
                    <div className={`mt-4 pt-4 border-t border-purple-200 text-sm font-bold ${isLoading ? 'text-red-500' : 'text-purple-700'}`}>
                        {statusMsg}
                    </div>
                </div>

                <div className="w-full max-w-4xl flex h-[60px] mb-10 shadow-md">
                    <input
                        type="text"
                        className="flex-1 bg-white border-2 border-[#6b21a8] border-r-0 p-4 text-xl outline-none rounded-l-sm"
                        placeholder="제품명, 성분코드(영문 포함), 업체명 검색 (예: cefaclor, 얀센)"
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

            <main className="w-full max-w-7xl mx-auto p-4 flex-grow print:p-0">
                {isSearched && (
                    <div className="animate-[fadeInUp_0.3s_ease-out]">
                        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-3 pl-2 border-l-4 border-[#6b21a8] print:border-none print:mb-6">
                            <h2 className="text-xl font-bold text-gray-800">
                                약가 검색 결과 <span className="text-[#6b21a8] print:text-black">({filteredData.length}건)</span>
                                <span className="hidden print:inline ml-2 text-sm text-gray-500">- 검색어: "{keyword}"</span>
                            </h2>

                            {filteredData.length > 0 && (
                                <div className="flex gap-2 mt-3 sm:mt-0 print:hidden">
                                    <button
                                        onClick={handleCopyAll}
                                        className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-sm text-sm font-bold shadow-sm transition-colors"
                                    >
                                        <Copy size={16} /> 리스트 전체 복사
                                    </button>
                                    <button
                                        onClick={handlePrintAll}
                                        className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-sm text-sm font-bold shadow-sm transition-colors"
                                    >
                                        <Printer size={16} /> 리스트 전체 인쇄
                                    </button>
                                </div>
                            )}
                        </div>

                        {filteredData.length > 0 ? (
                            <div className="bg-white border border-gray-300 rounded-sm shadow-sm overflow-hidden mb-8 print:border-none print:shadow-none">
                                <div className="overflow-x-auto print:overflow-visible">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm print:text-xs">
                                        <thead className="bg-[#fdf4ff] border-b border-gray-300 print:bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold text-gray-700 w-32">제품/성분코드</th>
                                                <th className="px-4 py-3 text-left font-bold text-gray-700">제품명 및 식약처 성분</th>
                                                <th className="px-4 py-3 text-left font-bold text-gray-700 w-40">규격 및 투여경로</th>
                                                <th className="px-4 py-3 text-left font-bold text-gray-700 w-36">업체명</th>
                                                <th className="px-4 py-3 text-right font-bold text-gray-700 w-28">상한금액</th>
                                                <th className="px-4 py-3 text-center font-bold text-gray-700 w-20 print:hidden">액션</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-400">
                                            {filteredData.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-purple-50 transition-colors print:break-inside-avoid">
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="font-bold text-[#6b21a8] print:text-black mb-1">{getHighlightedText(item.제품코드, currentKeywords)}</div>
                                                        <div className="text-xs text-gray-500 font-medium">성분: {getHighlightedText(item.주성분코드, currentKeywords)}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-gray-900 min-w-[250px] leading-relaxed align-top">
                                                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                                                            {item.전문일반 && (
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold text-white print:text-black print:border print:border-gray-500 print:bg-white ${item.전문일반.includes('전문') ? 'bg-red-500' : 'bg-green-500'}`}>
                                                                    {item.전문일반}
                                                                </span>
                                                            )}
                                                            {item.퇴장방지 && item.퇴장방지.trim() !== '' && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-bold text-white bg-amber-500 print:text-black print:border print:border-gray-500 print:bg-white">
                                                                    퇴장방지
                                                                </span>
                                                            )}
                                                            {item.급여기준 && item.급여기준 !== '급여' && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-bold text-gray-600 bg-gray-200 print:border print:border-gray-500 print:bg-white">
                                                                    {item.급여기준}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="font-medium text-base mb-1.5">
                                                            {getHighlightedText(item.제품명, currentKeywords)}
                                                        </div>
                                                        {/* [신규 UI] 식약처 영문 주성분 표기 블록 */}
                                                        {item.식약처주성분 && (
                                                            <div className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 p-1.5 rounded-sm break-keep leading-tight shadow-inner">
                                                                <span className="font-bold text-gray-500 mr-1">Active Ingredient:</span>
                                                                {getHighlightedText(item.식약처주성분, currentKeywords)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-gray-700 align-top">
                                                        <div className="text-sm font-bold mb-1">{getHighlightedText(item.규격, currentKeywords)} {item.단위}</div>
                                                        <div className="text-xs text-blue-600 print:text-black font-medium border border-blue-200 print:border-gray-500 bg-blue-50 print:bg-white inline-block px-1 rounded-sm">
                                                            {item.투여경로}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-gray-600 align-top text-xs break-keep font-medium">
                                                        {getHighlightedText(item.업체명, currentKeywords)}
                                                    </td>
                                                    <td className="px-4 py-4 text-right align-top whitespace-nowrap">
                                                        <div className="font-bold text-gray-900 text-base">
                                                            {item.상한가 ? `${Number(item.상한가.replace(/,/g, '')).toLocaleString()}` : '0'} <span className="text-sm font-normal text-gray-500 print:text-black">원</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 mt-1 print:text-black">
                                                            적용: {item.적용시작일자}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center align-top print:hidden">
                                                        <button onClick={() => handleCopySingle(item)} className="text-xs bg-white border border-gray-400 hover:bg-gray-100 px-3 py-1.5 rounded-sm font-bold text-gray-700 shadow-sm">
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
                            <div className="text-gray-500 text-center py-12 bg-white border border-gray-200 rounded-sm mb-8 shadow-sm print:hidden">
                                조건에 일치하는 약가 데이터가 없습니다. (단종/취하 및 특정 복합제는 엔진에서 자동 배제됨)
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="w-full max-w-4xl border-t border-[#6b21a8] mt-12 py-6 text-center text-gray-800 font-extrabold tracking-wide text-sm opacity-80 print:hidden">
                Copyright © iFem (최종 업데이트: {lastUpdated})
            </footer>
        </div>
    );
};

export default DrugSearch;