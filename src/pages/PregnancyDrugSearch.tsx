import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, AlertCircle, Copy, Printer } from 'lucide-react';

interface RawDrugRecord {
    제품코드: string;
    제품명: string;
    업체명: string;
    성분명: string;
    금기등급: string;
    DUR상세정보: string;
}

interface PregnancyDrugRecord extends RawDrugRecord {
    ADEC등급: { ingredient: string; grade: string }[];
    FDA정보: { ingredient: string; info: string }[];
}

const PregnancyDrugSearch: React.FC = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState<string>('');
    const [isSearched, setIsSearched] = useState<boolean>(false);
    const [drugData, setDrugData] = useState<RawDrugRecord[]>([]);
    const [filteredData, setFilteredData] = useState<PregnancyDrugRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const adecMapRef = useRef<Map<string, { original: string, grade: string }>>(new Map());
    const fdaMapRef = useRef<Map<string, { original: string, grade: string }>>(new Map());

    // [기존 로직 100% 유지] 데이터 로딩
    useEffect(() => {
        const loadData = async () => {
            try {
                const [durRes, masterRes, adecRes, fdaRes] = await Promise.all([
                    fetch('/DUR_data.csv'),
                    fetch('/drug_master.csv'),
                    fetch('/AU_ADEC_data.csv'),
                    fetch('/US_FDA_Data.csv')
                ]);

                const parseConfig = { header: true, skipEmptyLines: true };
                const durRaw = Papa.parse(await durRes.text(), parseConfig).data as any[];
                const masterRaw = Papa.parse(await masterRes.text(), parseConfig).data as any[];
                const adecRaw = Papa.parse(await adecRes.text(), parseConfig).data as any[];
                const fdaRaw = Papa.parse(await fdaRes.text(), parseConfig).data as any[];

                const buildMap = (rawArray: any[]) => {
                    const map = new Map<string, { original: string, grade: string }>();
                    rawArray.forEach(item => {
                        const k = Object.values(item)[0] as string;
                        const val = Object.values(item)[1] as string;
                        if (k && val) {
                            const normalized = k.replace(/\//g, '+');
                            const fullComp = normalized.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
                            if (fullComp) map.set(fullComp, { original: normalized, grade: val.trim() });

                            const parts = normalized.split('+');
                            parts.forEach(p => {
                                const comp = p.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
                                if (comp && comp !== fullComp) {
                                    map.set(comp, { original: p.trim(), grade: val.trim() });
                                }
                            });
                        }
                    });
                    return map;
                };

                adecMapRef.current = buildMap(adecRaw);
                fdaMapRef.current = buildMap(fdaRaw);

                const durSet = new Set();
                const combined: RawDrugRecord[] = [];
                const formatCode = (v: any) => {
                    const n = parseFloat(v);
                    return isNaN(n) ? String(v) : String(Math.floor(n));
                };

                const processRecord = (item: any, grade: string, info: string): RawDrugRecord => ({
                    제품코드: formatCode(item['제품코드']),
                    제품명: item['제품명'] || '',
                    업체명: item['업체명'] || '',
                    성분명: (item['성분명'] || '').trim(),
                    금기등급: grade,
                    DUR상세정보: info
                });

                durRaw.forEach(item => {
                    const pCode = formatCode(item['제품코드']);
                    durSet.add(pCode);
                    combined.push(processRecord(item, item['금기등급'], item['상세정보']));
                });

                masterRaw.forEach(item => {
                    const pCode = formatCode(item['제품코드']);
                    if (!durSet.has(pCode)) {
                        combined.push(processRecord(item, '0', '현재 식약처 DUR 약물정보에서 임부 금기로 분류되지 않은 약물입니다. #상세 정보 확인 ✅'));
                    }
                });

                setDrugData(combined);
                setIsLoading(false);
            } catch (e) {
                console.error(e);
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // [기존 로직 100% 유지] 검색 및 매칭 로직
    const checkMatch = (dbComp: string, qComp: string) => {
        if (dbComp === qComp) return true;
        const hasKorean = /[가-힣]/.test(qComp);
        const minLen = Math.min(dbComp.length, qComp.length);
        const threshold = hasKorean ? 2 : 5;
        if (minLen >= threshold && (dbComp.includes(qComp) || qComp.includes(dbComp))) {
            return true;
        }
        return false;
    };

    const handleSearch = () => {
        if (!keyword.trim()) return;
        setIsSearched(true);
        const kws = keyword.toLowerCase().split(/[\s,]+/).filter(Boolean);

        const rawResults = drugData.filter(d => {
            const searchTarget = `${d.제품명} ${d.성분명} ${d.업체명} ${d.제품코드}`.toLowerCase();
            return kws.every(kw => searchTarget.includes(kw));
        });

        const finalResults: PregnancyDrugRecord[] = rawResults.map(drug => {
            const ingredients = drug.성분명.split(/[+/]/).map(s => s.trim().toLowerCase());
            const searchTokens = Array.from(new Set([...ingredients, ...kws]));

            const adecList: any[] = [];
            const fdaList: any[] = [];

            searchTokens.forEach(token => {
                const comp = token.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
                if (!comp) return;

                let foundAdec = false;
                for (let [dbComp, data] of adecMapRef.current) {
                    if (checkMatch(dbComp, comp)) {
                        adecList.push({ ingredient: data.original, grade: data.grade });
                        foundAdec = true; break;
                    }
                }
                if (!foundAdec && ingredients.includes(token)) {
                    adecList.push({ ingredient: token, grade: "데이터 없음" });
                }

                let foundFda = false;
                for (let [dbComp, data] of fdaMapRef.current) {
                    if (checkMatch(dbComp, comp)) {
                        fdaList.push({ ingredient: data.original, info: data.grade });
                        foundFda = true; break;
                    }
                }
                if (!foundFda && ingredients.includes(token)) {
                    fdaList.push({ ingredient: token, info: "데이터 없음" });
                }
            });

            const finalAdec = adecList.some(a => a.grade !== "데이터 없음") ? adecList.filter(a => a.grade !== "데이터 없음") : adecList;
            const finalFda = fdaList.some(f => f.info !== "데이터 없음") ? fdaList.filter(f => f.info !== "데이터 없음") : fdaList;
            const uniqueAdec = Array.from(new Map(finalAdec.map(item => [item.grade, item])).values());
            const uniqueFda = Array.from(new Map(finalFda.map(item => [item.info, item])).values());

            return { ...drug, ADEC등급: uniqueAdec, FDA정보: uniqueFda };
        });

        const fullQueryComp = keyword.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
        if (fullQueryComp && rawResults.length === 0) {
            let virtualAdec = null;
            for (let [dbComp, data] of adecMapRef.current) {
                if (checkMatch(dbComp, fullQueryComp)) { virtualAdec = data; break; }
            }
            let virtualFda = null;
            for (let [dbComp, data] of fdaMapRef.current) {
                if (checkMatch(dbComp, fullQueryComp)) { virtualFda = data; break; }
            }

            if (virtualAdec || virtualFda) {
                finalResults.push({
                    제품코드: "검색어 직행",
                    제품명: `"${keyword}" 검색 결과`,
                    업체명: "Global DB Direct Match",
                    성분명: virtualAdec?.original || virtualFda?.original || keyword,
                    금기등급: "-1",
                    DUR상세정보: "한국 식약처 DUR 및 심평원 약가 데이터베이스에 존재하지 않으나, 호주/미국 데이터베이스에서 일치하는 성분을 발견하여 출력합니다.",
                    ADEC등급: virtualAdec ? [{ ingredient: virtualAdec.original, grade: virtualAdec.grade }] : [{ ingredient: keyword, grade: "데이터 없음" }],
                    FDA정보: virtualFda ? [{ ingredient: virtualFda.original, info: virtualFda.grade }] : [{ ingredient: keyword, info: "데이터 없음" }]
                });
            }
        }

        setFilteredData(finalResults);
    };

    const handleCopyAll = () => {
        if (filteredData.length === 0) {
            alert('복사할 데이터가 없습니다.');
            return;
        }

        let clipboardText = `[임부금기약물 마스터 검색 엔진: "${keyword}"]\n\n`;
        filteredData.forEach(item => {
            const korGrade = item.금기등급 === '1' ? '1등급(금기)' : item.금기등급 === '2' ? '2등급(주의)' : item.금기등급 === '0' ? '안전' : 'DB없음';
            const auGrades = item.ADEC등급.map(g => g.grade !== '데이터 없음' ? `Category ${g.grade.charAt(0)}` : 'N/A').join(', ');

            clipboardText += `* ${item.제품명} (${item.업체명})\n`;
            clipboardText += `  - 성분: ${item.성분명}\n`;
            clipboardText += `  - 등급: [KOR] ${korGrade} | [AU] ${auGrades}\n\n`;
        });

        navigator.clipboard.writeText(clipboardText).then(() => {
            alert('검색된 요약 리스트가 클립보드에 복사되었습니다.');
        }).catch(err => {
            alert('복사에 실패했습니다.');
            console.error('Copy failed:', err);
        });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen flex flex-col items-center w-full bg-white text-gray-800 font-sans">

            {/* 상단 헤더 (FeeSearch 스타일 + 오렌지색 테마) */}
            <header className="w-full bg-[#f97316] py-4 px-6 shadow-md print:hidden">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-1 text-white bg-orange-700 hover:bg-orange-800 px-3 py-1.5 rounded-md text-sm font-bold transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> 허브로 이동
                    </button>
                    <div className="text-xl font-bold text-white tracking-wide">한국의약품안전관리원 임부금기약물 목록</div>
                </div>
            </header>

            <section className="w-full flex flex-col items-center mt-12 px-4 print:hidden">
                {/* 메인 타이틀 (FeeSearch 스타일) */}
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 border-b-4 border-gray-800 pb-3 mb-8 text-center tracking-tight">
                    임부금기약물 마스터 검색 엔진
                </h1>

                {/* 안내 박스 (FeeSearch 스타일 + 오렌지색 테마) */}
                <div className="bg-[#fff7ed] text-[#c2410c] p-6 md:p-8 rounded-sm mb-10 w-full max-w-3xl shadow-inner text-base md:text-lg">
                    <ol className="list-decimal pl-6 space-y-2 font-medium break-keep text-left">
                        <li className="pl-1">본 검색기는 <b>[심평원 약가]</b> 정보와 <b>[한국의약품안전관리원 임부금기약물]</b> 정보, 호주 ADEC 약물정보 그리고 미국 FDA PLLR 약물정보를 검색하여 출력합니다.</li>
                        <li className="pl-1">다중 검색어(띄어쓰기 및 콤마)를 지원합니다.</li>
                        <li className="pl-1">한글로 상품명, 성분명을 입력했을 때 정보가 부족하다면, 영어로 성분명을 정확하게 넣어보세요.</li>
                        <li className="pl-1 font-bold text-orange-900 mt-2">본 조회 결과는 참고용이며 의학적 판단을 대신할 수 없습니다. 데이터베이스에 없는 약물이거나 추가 상담이 필요한 경우 [마더세이프 임산부 약물상담센터](1588-7309) 또는 [식약처 의약품 부작용 보고 및 피해구제 상담](1644-6223)으로 문의하세요.</li>
                        <li className="pl-1 font-bold text-red-600">임산부라면 진료를 담당하고 있는 산부인과 전문의와 상담하는 것이 제일 현명합니다.</li>
                    </ol>
                    <div className={`mt-4 pt-4 border-t border-orange-200 text-sm font-bold ${isLoading ? 'text-red-500' : 'text-green-600'}`}>
                        {isLoading ? '임부금기 데이터베이스 로딩 중...' : '✅ 임부금기 마스터 연동 완료'}
                    </div>
                </div>

                {/* 검색 바 (FeeSearch 스타일: 두꺼운 Input + 검은색 Button) */}
                <div className="w-full max-w-4xl flex h-[60px] mb-10 shadow-md">
                    <input
                        type="text"
                        className="flex-1 bg-white border-2 border-[#f97316] border-r-0 p-4 text-xl outline-none rounded-l-sm"
                        placeholder="한글/영어 제품명 또는 성분명 (예: 아스피린, 타이레놀)"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                        className="bg-black hover:bg-gray-800 text-white font-bold px-10 text-xl rounded-r-sm transition-colors"
                        onClick={handleSearch}
                    >
                        검색
                    </button>
                </div>
            </section>

            <main className="w-full max-w-6xl mx-auto p-4 flex-grow">
                {isSearched && (
                    <div className="animate-[fadeInUp_0.3s_ease-out]">
                        <div className="flex justify-between items-end mb-4 print:hidden">
                            <h2 className="text-xl font-bold text-gray-800 pl-2 border-l-4 border-[#f97316]">
                                검색 결과 <span className="text-[#f97316]">({filteredData.length}건)</span>
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={handleCopyAll} className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-sm font-bold text-sm shadow-sm transition-colors">
                                    <Copy size={16} /> 검색 요약 복사
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-sm font-bold text-sm shadow-sm transition-colors">
                                    <Printer size={16} /> 전체 카드 인쇄
                                </button>
                            </div>
                        </div>

                        {/* 기존 카드 렌더링 로직 (결과 디자인 유지) */}
                        {filteredData.length > 0 ? filteredData.map((item, idx) => (
                            <div key={idx} className={`bg-white border-2 ${item.금기등급 === '-1' ? 'border-gray-300' : 'border-orange-100'} rounded-sm shadow-sm overflow-hidden mb-6`}>
                                <div className={`p-5 border-b flex justify-between items-end ${item.금기등급 === '-1' ? 'bg-gray-50 border-gray-200' : 'bg-white border-orange-100'}`}>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 mb-1">{item.제품명}</h3>
                                    </div>
                                    <div className="text-right text-sm text-gray-600 font-medium">
                                        Product info: {item.성분명} | {item.업체명} | {item.제품코드}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 divide-x divide-gray-100">
                                    {/* 한국 DUR */}
                                    <div className="p-0 flex flex-col h-full">
                                        <div className={`text-white text-center py-2 font-bold ${item.금기등급 === '-1' ? 'bg-gray-500' : 'bg-orange-400'}`}>한국 DUR</div>
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="mb-4">
                                                {item.금기등급 === '1' && <span className="bg-red-600 text-white px-3 py-1.5 rounded-sm text-xs font-bold shadow-sm">DUR 1등급</span>}
                                                {item.금기등급 === '2' && <span className="bg-amber-500 text-white px-3 py-1.5 rounded-sm text-xs font-bold shadow-sm">DUR 2등급</span>}
                                                {item.금기등급 === '0' && <span className="bg-emerald-600 text-white px-3 py-1.5 rounded-sm text-xs font-bold shadow-sm">DUR 등급없음</span>}
                                                {item.금기등급 === '-1' && <span className="bg-gray-600 text-white px-3 py-1.5 rounded-sm text-xs font-bold shadow-sm">한국 DB 없음</span>}
                                            </div>
                                            <p className={`text-sm leading-relaxed font-medium flex-1 ${item.금기등급 === '-1' ? 'text-gray-500' : 'text-gray-800'}`}>{item.DUR상세정보}</p>

                                            {item.금기등급 !== '-1' && (
                                                <div className="mt-6 pt-4 border-t border-orange-100 text-xs text-gray-600 font-medium space-y-1.5 break-keep">
                                                    <p><span className="font-bold text-red-600 mr-1">[1등급]</span>원칙적 사용금기</p>
                                                    <p><span className="font-bold text-amber-500 mr-1">[2등급]</span>임상적 타당성(사유)이 있는 경우에 한하여 부득이하게 사용</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 호주 ADEC */}
                                    <div className="p-0 flex flex-col h-full">
                                        <div className={`text-white text-center py-2 font-bold ${item.금기등급 === '-1' ? 'bg-gray-500' : 'bg-orange-400'}`}>호주 ADEC</div>
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="space-y-3 flex-1">
                                                {item.ADEC등급.map((g, i) => (
                                                    <div key={i} className="mb-2">
                                                        {g.grade !== "데이터 없음" ? (
                                                            <>
                                                                <div className="text-sm font-black text-gray-900 mb-1 flex items-center gap-2">
                                                                    <span className={`px-2 py-0.5 rounded-sm text-xs text-white ${['D', 'X'].includes(g.grade.charAt(0)) ? 'bg-red-700' : 'bg-emerald-600'}`}>
                                                                        {g.grade.charAt(0)}
                                                                    </span>
                                                                    Category {g.grade.charAt(0)} | <span className="capitalize">{g.ingredient}</span>
                                                                </div>
                                                                <div className="text-sm text-gray-800 leading-relaxed font-medium">{g.grade}</div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="text-sm font-black text-gray-900 mb-1 capitalize">{g.ingredient}</div>
                                                                <div className="text-sm text-gray-500 font-medium">데이터 없음</div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-6 flex w-full h-7 rounded-sm overflow-hidden text-[11px] font-black text-white text-center shadow-inner">
                                                <div className="bg-emerald-600 flex-1 flex items-center justify-center border-r border-emerald-700">A</div>
                                                <div className="bg-yellow-400 flex-1 flex items-center justify-center text-yellow-900 border-r border-yellow-500">B</div>
                                                <div className="bg-amber-500 flex-1 flex items-center justify-center border-r border-amber-600">C</div>
                                                <div className="bg-red-600 flex-1 flex items-center justify-center border-r border-red-700">D</div>
                                                <div className="bg-gray-700 flex-1 flex items-center justify-center">X</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 미국 FDA PLLR */}
                                    <div className="p-0 flex flex-col h-full">
                                        <div className={`text-white text-center py-2 font-bold ${item.금기등급 === '-1' ? 'bg-gray-500' : 'bg-orange-400'}`}>미국 FDA PLLR</div>
                                        <div className="p-5 flex-1">
                                            <div className="space-y-4">
                                                {item.FDA정보.map((f, i) => (
                                                    <div key={i}>
                                                        <div className="text-sm font-black text-gray-900 mb-1 capitalize">
                                                            {f.info !== "데이터 없음" ? `PLLR Summary: ${f.ingredient}` : f.ingredient}
                                                        </div>
                                                        <div className={`text-[15px] leading-relaxed font-medium ${f.info === "데이터 없음" ? "text-gray-500 text-sm" : "text-black"}`}>
                                                            {f.info}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-24 bg-white border border-gray-200 rounded-sm mb-8 shadow-sm">
                                <AlertCircle className="mx-auto w-12 h-12 text-gray-400 mb-3" />
                                <p className="text-gray-600 font-bold text-lg">데이터베이스에 등록되지 않은 약물입니다.</p>
                                <p className="text-gray-500 text-sm mt-1">담당의사 또는 마더세이프(1588-7309)와 상담하세요.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="w-full max-w-4xl border-t border-[#f97316] mt-12 py-6 text-center text-gray-800 font-extrabold tracking-wide text-sm opacity-80 print:hidden">
                Copyright © iFem
            </footer>
        </div>
    );
};

export default PregnancyDrugSearch;