import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

// 데이터의 형태를 정의합니다 (빨간 줄 방지)
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
                // 1. 3개로 쪼개진 파일을 부릅니다.
                const files = ['/fee_master_1.csv', '/fee_master_2.csv', '/fee_master_3.csv'];

                const responses = await Promise.all(
                    files.map(file => fetch(file).then(res => {
                        if (!res.ok) throw new Error(`${file} 로드 실패`);
                        return res.text();
                    }))
                );

                // 2. 제목줄을 유지하며 데이터를 합칩니다.
                const combinedCsv = responses[0] +
                    "\n" + responses[1].split("\n").slice(1).join("\n") +
                    "\n" + responses[2].split("\n").slice(1).join("\n");

                // 3. 파싱 작업
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
                setError("데이터를 불러오지 못했습니다. 파일이 존재하는지 확인하십시오.");
                setLoading(false);
            }
        };

        loadFeeData();
    }, []);

    // 아래는 검색 로직 및 UI 부분입니다 (기존 원장님 코드를 유지하거나 보강하십시오)
    const filteredData = feeData.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">건강보험요양급여비용 검색 엔진</h2>

            <div className="mb-4 flex gap-2">
                <input
                    type="text"
                    placeholder="마스터 데이터 검색..."
                    className="border p-2 flex-grow"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading && <p className="text-blue-500">데이터 3단 합체 로딩 중... (111MB)</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && !error && (
                <p className="mb-2">검색 결과: {filteredData.length}건</p>
            )}

            {/* 테이블 렌더링 부분은 원장님의 기존 UI 코드를 사용하십시오 */}
        </div>
    );
};

export default FeeSearch;