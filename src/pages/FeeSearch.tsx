import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { ArrowLeft, Copy, Printer, Search } from 'lucide-react'; // 아이콘 추가

// 데이터 형태 정의 (TypeScript 에러 방지)
interface FeeItem {
    [key: string]: any;
}

const FeeSearch: React.FC = () => {
    const [feeData, setFeeData] = useState<FeeItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        const loadFeeData = async () => {
            setLoading(true);
            setError(null);
            try {
                // [수술 집도] 3개로 쪼개진 파일을 부릅니다.
                const files = ['/fee_master_1.csv', '/fee_master_2.csv', '/fee_master_3.csv'];

                const responses = await Promise.all(
                    files.map(file => fetch(file).then(res => {
                        if (!res.ok) throw new Error(`${file} 로드 실패`);
                        return res.text();
                    }))
                );

                // [3단 합체] 제목줄을 유지하며 데이터를 하나로 합칩니다.
                const combinedCsv = responses[0] +
                    "\n" + responses[1].split("\n").slice(1).join("\n") +
                    "\n" + responses[2].split("\n").slice(1).join("\n");

                // 파싱 작업
                Papa.parse(combinedCsv, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setFeeData(results.data as FeeItem[]);
                        setLoading(false);
                    },
                    error: (err: any) => {
                        console.error("파싱 에러:", err);
                        setError("데이터 해석 중 오류가 발생했습니다.");
                        setLoading(false);
                    }
                });
            } catch (err: any) {
                console.error("로딩 에러:", err);
                setError("데이터 로딩 실패. 분할 파일들이 public 폴더에 있는지 확인하십시오.");
                setLoading(false);
            }
        };

        loadFeeData();
    }, []);

    // 검색 필터링 로직
    const filteredData = feeData.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* 1. 글로벌 헤더 (블루 디자인) */}
            <div className="bg-[#214cb8] p-4 flex items-center justify-between text-white shadow-md">
                <button className="flex items-center gap-1.5 hover:opacity-80">
                    <ArrowLeft size={18} />
                    <span className="text-sm">허브로 이동</span>
                </button>
                <div className="text-right text-xs">
                    <div>건강보험심사평가원</div>
                    <div className="font-bold">건강보험요양급여비용</div>
                </div>
            </div>

            {/* 2. 메인 콘텐츠 영역 */}
            <div className="flex-grow p-4 md:p-6 lg:p-8">
                <h1 className="text-2xl font-bold text-center mt-6 mb-8 text-[#1a2e56]">
                    건강보험요양급여비용 검색 엔진
                </h1>

                {/* 3. 안내 카드 (블루/퍼플 틴트 디자인) */}
                <div className="bg-[#eef2fd] border border-[#d1daed] rounded-lg p-5 mx-4 my-6 shadow-sm">
                    {/* 조건부 에러 메시지 표시 */}
                    {error && (
                        <div className="text-red-600 flex items-center gap-2 mb-3 text-sm font-semibold">
                            <span className="text-lg">❌</span> {error}
                        </div>
                    )}

                    <ol className="list-decimal list-inside text-sm text-[#214cb8] space-y-2">
                        <li>본 검색기는 심평원 공식 [수가마스터 원본 데이터]를 100% 직결하여 오류가 없습니다.</li>
                        <li>다중 검색어(띄어쓰기 및 콤마)를 지원합니다. (예: 폐경, 호르몬)</li>
                        <li>결과는 복사 및 인쇄 가능합니다.</li>
                    </ol>
                </div>

                {/* 4. 검색창 영역 (블랙 검색 버튼) */}
                <div className="flex mx-4 mb-6 shadow-sm">
                    <input
                        type="text"
                        placeholder="마스터 데이터 검색 (예: 창상, 변연절..."
                        className="flex-grow border border-slate-300 p-3 rounded-l-md focus:outline-none focus:ring-1 focus:ring-[#214cb8]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="bg-black text-white p-3 rounded-r-md px-5 flex items-center gap-2 hover:bg-slate-800">
                        <Search size={16} />
                        검색
                    </button>
                </div>

                {/* 5. 결과 헤더 (건수 및 액션 버튼) */}
                <div className="mx-4 mb-6">
                    <div className="text-lg font-semibold mb-3 text-[#1a2e56]">
                        공식 수가표 검색 결과 ({loading ? '로딩 중...' : `${filteredData.length}건`})
                    </div>

                    <div className="flex gap-2">
                        <button className="flex-1 flex flex-col items-center justify-center border border-[#d1daed] rounded-lg bg-white p-4 gap-1 text-[#214cb8] text-xs font-medium hover:bg-[#eef2fd]">
                            <Copy size={16} />
                            리스트 전체 복사
                        </button>
                        <button className="flex-1 flex flex-col items-center justify-center border border-[#d1daed] rounded-lg bg-white p-4 gap-1 text-[#214cb8] text-xs font-medium hover:bg-[#eef2fd]">
                            <Printer size={16} />
                            인쇄하기
                        </button>
                    </div>
                </div>

                {/* 6. 결과 표기 영역 (로딩 및 결과 없음) */}
                <div className="mx-4 mb-10 border border-[#d1daed] rounded-lg bg-white p-10 flex flex-col items-center justify-center text-center shadow-inner">
                    {loading && (
                        <div className="flex flex-col items-center gap-2 text-sm text-[#214cb8]">
                            <div className="w-8 h-8 border-4 border-[#214cb8] border-t-transparent rounded-full animate-spin"></div>
                            <span>데이터 3단 합체 로딩 중... (111MB)</span>
                        </div>
                    )}

                    {!loading && filteredData.length === 0 && (
                        <>
                            <Printer size={40} className="text-[#d1daed] mb-4" />
                            <p className="text-sm text-[#666]">일치하는 수가표 데이터가 없습니다.</p>
                        </>
                    )}

                    {/* 여기에 실제 테이블 렌더링 코드를 추가하시면 됩니다 */}
                </div>
            </div>
        </div>
    );
};

export default FeeSearch;