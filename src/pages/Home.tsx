import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calculator, Pill, TriangleAlert, ArrowRight, BookOpen, Repeat } from 'lucide-react';

const Home: React.FC = () => {
    const navigate = useNavigate();

    // 통합 검색 엔진 대시보드 도구 목록 (6번째 상병-수가 연칭 검색기 추가 완료)
    const tools = [
        {
            id: 'fee',
            title: '건강보험 요양급여비용 검색기',
            description: '2026년 의료수가 및 산정지침 검색',
            icon: <Calculator className="w-6 h-6 text-blue-600" />,
            path: '/fee',
            badge: 'ACTIVE',
            status: 'active'
        },
        {
            id: 'gosi-qna',
            title: '고시·Q&A 통합 검색',
            description: '복지부 요양급여 고시 원문 및 심평원 실무 질의응답 교차 검색',
            icon: <BookOpen className="w-6 h-6 text-indigo-600" />,
            path: '/gosi-qna-search',
            badge: 'NEW',
            status: 'active'
        },
        {
            id: 'material',
            title: '치료재료 마스터 검색',
            description: '심평원 전체판 치료재료 급여/비급여 목록 검색',
            icon: <Search className="w-6 h-6 text-emerald-600" />,
            path: '/material',
            badge: 'ACTIVE',
            status: 'active'
        },
        {
            id: 'drug',
            title: '약가 마스터 검색기',
            description: '심평원 약가 및 식약처 임상 교차 검증 (단종/복합제 배제)',
            icon: <Pill className="w-6 h-6 text-purple-600" />,
            path: '/drug',
            badge: 'ACTIVE',
            status: 'active'
        },
        {
            id: 'pregnancy',
            title: '임부금기 의약품 검색기',
            description: 'DUR 기준 임부금기 약물 (FDA, ADEC 등급 교차 검증)',
            icon: <TriangleAlert className="w-6 h-6 text-rose-600" />,
            path: '/pregnancy',
            badge: 'HOT',
            status: 'active'
        },
        {
            id: 'kcd-fee-match',
            title: '상병명-수가 연칭 검색기',
            description: 'KCD 상병 코드와 심평원 급여 인정 기준 1:1 매칭 삭감 방지 엔진',
            icon: <Repeat className="w-6 h-6 text-amber-600" />,
            path: '/kcd-fee-match', // 6번째 경로 설정
            badge: 'CONCEPT',
            status: 'active'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col items-center">
            {/* 반응형 헤더 영역 */}
            <header className="w-full bg-gray-900 py-4 md:py-6 px-4 md:px-6 shadow-lg sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
                    <div className="text-xl md:text-2xl font-extrabold text-white tracking-widest flex-shrink-0">
                        Mediinfo <span className="text-blue-400">Hub</span>
                    </div>
                    {/* 배너광고/알림판 영역: 모바일에서 숨김 처리 */}
                    <div className="hidden sm:block text-sm font-bold text-gray-500 border border-gray-700 px-3 py-1 rounded border-dashed hover:text-gray-300 hover:border-gray-500 transition-colors cursor-pointer truncate">
                        [광고 및 공지사항 영역]
                    </div>
                </div>
            </header>

            <main className="w-full max-w-6xl mx-auto p-4 md:p-6 flex-grow flex flex-col items-center mt-6 md:mt-10 transition-all">
                {/* 메인 타이틀 영역 */}
                <div className="text-center mb-10 md:mb-12">
                    <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4 tracking-tight">의료 데이터 검색 포털</h1>
                    <p className="text-base md:text-lg text-gray-600 font-medium">원하시는 진료 지원 도구를 선택하십시오.</p>
                </div>

                {/* [핵심 수술 부위] 카드 리스트 렌더링 영역 - 반응형 그리드 적용 */}
                {/* grid-cols-1(모바일 1열) -> sm:grid-cols-2(태블릿 2열) -> lg:grid-cols-3(PC 3열) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl">
                    {tools.map((tool) => (
                        <div
                            key={tool.id}
                            onClick={() => tool.status === 'active' && navigate(tool.path)}
                            className={`relative bg-white rounded-lg p-5 md:p-6 border-2 flex flex-col h-full transition-all duration-200 
                                ${tool.status === 'active'
                                    ? 'border-gray-200 shadow-md hover:shadow-xl hover:border-gray-400 cursor-pointer transform hover:-translate-y-1'
                                    : 'border-gray-100 opacity-60 cursor-not-allowed'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-gray-50 rounded-md">
                                    {/* 아이콘 크기 반응형 조절 */}
                                    {React.cloneElement(tool.icon as React.ReactElement, { className: "w-5 h-5 md:w-6 md:h-6 text-current" })}
                                </div>
                                {tool.badge && (
                                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-sm tracking-wider 
                                        ${tool.badge === 'HOT' ? 'bg-rose-100 text-rose-700' :
                                            tool.badge === 'NEW' ? 'bg-indigo-100 text-indigo-700' :
                                                tool.badge === 'CONCEPT' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                    'bg-blue-100 text-blue-700'}`}>
                                        {tool.badge}
                                    </span>
                                )}
                            </div>

                            {/* 타이틀 및 설명 폰트 크기 반응형 조절 */}
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1.5 md:mb-2">{tool.title}</h2>
                            <p className="text-xs md:text-sm text-gray-500 font-medium flex-grow mb-4 leading-relaxed">
                                {tool.description}
                            </p>

                            <div className="flex items-center justify-end text-sm font-bold text-gray-400 mt-auto pt-2">
                                {tool.status === 'active' ? (
                                    <span className="flex items-center text-gray-900 font-bold text-xs md:text-sm">실행하기 <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1" /></span>
                                ) : (
                                    <span className="text-xs md:text-sm">개발 대기중</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* 푸터 영역: 폰트 및 여백 반응형 조절 */}
            <footer className="w-full border-t border-gray-200 mt-12 py-5 md:py-6 text-center text-gray-500 font-bold text-xs md:text-sm bg-white">
                Copyright © Mediinfo Hub (최종 업데이트: 2026. 03. 15)
            </footer>
        </div>
    );
};

export default Home;