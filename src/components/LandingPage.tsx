import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

interface LandingPageProps {
  onStart: (apiKey?: string) => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [showApiInput, setShowApiInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const validateApiKey = async (key: string) => {
    // 1. 형식 검증 (Gemini API 키는 보통 'AIza'로 시작하며 39자입니다)
    if (!key.startsWith('AIza') || key.length !== 39) {
      console.error("API Key format is invalid.");
      return false;
    }

    // 2. 실제 API 호출 검증
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'hi',
      });
      return true;
    } catch (error) {
      console.error("API Key validation failed:", error);
      return false;
    }
  };

  const handleStart = async () => {
    if (showApiInput) {
      const trimmedKey = apiKey.trim();
      if (!trimmedKey) {
        alert('Gemini API Key를 입력해주세요.');
        return;
      }
      
      setIsValidating(true);
      const isValid = await validateApiKey(trimmedKey);
      setIsValidating(false);

      if (isValid) {
        onStart(trimmedKey);
      } else {
        alert('유효하지 않은 API Key입니다. 키를 다시 확인하거나 잠시 후 시도해주세요.');
      }
    } else {
      setShowApiInput(true);
    }
  };
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-3xl font-bold">description</span>
            <h1 className="text-xl font-bold tracking-tight">DocuMap AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://aclpro.co.kr/ai-solutions"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-all"
            >
              AI커리어솔루션
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              행정 업무 효율의 새로운 기준
            </div>
            <h1 className="text-[1.5rem] sm:text-3xl lg:text-4xl xl:text-[3rem] font-bold leading-[1.3] tracking-tight text-slate-900 dark:text-white">
              <span className="block whitespace-nowrap">복사 붙여넣기는 이제 그만.</span>
              <span className="block whitespace-nowrap"><span className="text-primary">원본 서식 100% 보존</span>하는</span>
              <span className="block whitespace-nowrap">행정 자동화</span>
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed text-slate-500 dark:text-slate-400 break-keep">
              회의록, 상담일지, 보고서까지. 어떤 .docx 양식이라도 AI가 데이터를 완벽하게 매핑합니다. 서식 깨짐 걱정 없이 데이터만 업로드하세요.
            </p>
            <div className="flex flex-col gap-4 max-w-md">
              {!showApiInput ? (
                <button 
                  onClick={handleStart}
                  className="flex h-12 w-fit min-w-[160px] items-center justify-center rounded-lg bg-primary px-6 text-base font-bold text-white shadow-lg shadow-primary/25 hover:translate-y-[-2px] transition-all"
                >
                  무료로 시작하기
                </button>
              ) : (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-green-500 text-white">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </span>
                    무료로 시작하세요. Gemini API 키만 있으면 됩니다.
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        placeholder="Gemini API Key 입력" 
                        value={apiKey}
                        disabled={isValidating}
                        onChange={(e) => setApiKey(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleStart();
                          }
                        }}
                        className="h-12 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                      />
                      <button 
                        onClick={handleStart}
                        disabled={isValidating}
                        className="flex h-12 min-w-[100px] items-center justify-center rounded-lg bg-primary px-6 text-base font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:bg-slate-400"
                      >
                        {isValidating ? '확인 중...' : '시작하기'}
                      </button>
                    </div>
                    
                    {/* Accordion for Guide */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 overflow-hidden">
                      <button 
                        onClick={() => setIsGuideOpen(!isGuideOpen)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">help</span>
                          Gemini API Key 발급 가이드
                        </div>
                        <span className="material-symbols-outlined text-[20px] transition-transform duration-200" style={{ transform: isGuideOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          expand_more
                        </span>
                      </button>
                      
                      {isGuideOpen && (
                        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <ol className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                            <li className="flex gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">1</span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">Google AI Studio 접속</p>
                                <p className="mt-1">아래 링크를 클릭하여 Google AI Studio에 접속하세요.</p>
                                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="mt-1 block text-blue-500 hover:underline break-all">https://aistudio.google.com/apikey</a>
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">2</span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">Google 계정으로 로그인</p>
                                <p className="mt-1">Gmail 계정으로 로그인하세요. 계정이 없으면 무료로 만들 수 있어요.</p>
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">3</span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">'API 키 만들기' 클릭</p>
                                <p className="mt-1">화면에서 'Create API Key' 또는 'API 키 만들기' 버튼을 클릭하세요.</p>
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">4</span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">프로젝트 선택 후 생성</p>
                                <p className="mt-1">기본 프로젝트를 선택하고 'Create API key in existing project'를 클릭하세요.</p>
                              </div>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">5</span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">API 키 복사</p>
                                <p className="mt-1">생성된 API 키(AIza로 시작)를 복사하세요. 이 키를 입력창에 붙여넣기하면 됩니다!</p>
                              </div>
                            </li>
                          </ol>
                          <a 
                            href="https://aistudio.google.com/apikey" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 py-3 text-sm font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            🔑 API 키 발급 페이지로 이동
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-center text-xs text-slate-500">
                    가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-16 lg:mt-0">
            <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <img 
                className="rounded-lg object-cover shadow-sm w-full h-[400px]" 
                alt="Professional document mockup with AI data mapping overlay" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5rLTv11dB3dhL4PWs5c9vu5ynSs6HfZZL0Lzu1mG2bnFK-CkxGW0ytrt9GvF9j1uRzSVXdEve-h2vbuEc8BFgE6Teqs34RZpUkmIgaymBrd1DytIRofd20PqEvYmX8_jHuGdEu7g7DEGr2zDdgbKupuHy35eGJrKoALX2RuvD-S8qJ9xGYFrbCsmwHkxXcY6GxR9Z4YC8-NDJwCAF2cMeHJem6Cj5kCvczCaAhojIpTspqE6s9YFcdcgw84ZLImeLB_7PP2XB71sL" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-6 -left-6 rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800 hidden md:block border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-green-100 p-2 text-green-600">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Processing Success</p>
                    <p className="text-sm font-bold">100% 서식 보존 완료</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="bg-slate-50 py-24 dark:bg-background-dark/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[2.5rem] leading-tight break-keep">
              매일 반복되는 3시간의 서류 작업, 정말 최선입니까?
            </h2>
            <p className="mt-5 text-lg text-slate-500 dark:text-slate-400 break-keep">단순 반복 업무가 당신의 가치 있는 시간을 뺏고 있지는 않나요?</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-xl dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <h3 className="mb-4 text-xl sm:text-2xl font-bold">오타와 누락의 불안감</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">수동으로 데이터를 입력할 때 발생하는 인적 오류는 행정 신뢰도를 떨어뜨립니다.</p>
            </div>
            <div className="group rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-xl dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30">
                <span className="material-symbols-outlined">format_list_bulleted</span>
              </div>
              <h3 className="mb-4 text-xl sm:text-2xl font-bold">깨지는 표와 서식</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">복사 붙여넣기 할 때마다 뒤틀리는 표와 폰트를 맞추기 위해 씨름하고 계신가요?</p>
            </div>
            <div className="group rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-xl dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                <span className="material-symbols-outlined">bedtime</span>
              </div>
              <h3 className="mb-4 text-xl sm:text-2xl font-bold">퇴근을 늦추는 로그</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">업무 시간 내내 작성한 상담 기록과 회의록을 다시 공문 서식으로 옮기느라 늦어지는 퇴근.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24" id="features">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[2.5rem] leading-tight break-keep">DocuMap AI의 핵심 기능</h2>
            <p className="mt-5 text-lg text-slate-500 dark:text-slate-400 break-keep">가장 완벽한 행정 자동화 솔루션을 경험하세요.</p>
          </div>
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="flex flex-col gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                <span className="material-symbols-outlined text-3xl">layers</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">포맷 무손실 매핑</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                HWP에서 변환된 복잡한 표, 로고 직인 위치, 특수 폰트까지 원본 .docx 서식을 100% 그대로 보존하며 데이터만 정확하게 채워넣습니다.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                <span className="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">스마트 데이터 추출</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                자유 형식의 메모, PDF 스캔본, 음성 인식 텍스트 등 비정형 소스에서 행정 서식에 필요한 핵심 정보를 AI가 문맥에 맞춰 추출합니다.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                <span className="material-symbols-outlined text-3xl">dynamic_feed</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">원클릭 대량 생성</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                수백 명의 수혜자 명단이나 상담 일지를 단 한 번의 클릭으로 각각의 개별 문서 파일로 병합 생성하여 시간을 95% 단축합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="bg-primary py-24 text-white" id="workflow">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <h2 className="text-3xl font-bold sm:text-[2.5rem] leading-tight break-keep">단 3단계로 끝나는 문서 자동화</h2>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-4xl font-bold backdrop-blur-sm">01</div>
              <h3 className="mb-4 text-xl sm:text-2xl font-bold">.docx 서식 선택</h3>
              <p className="text-white/80 leading-relaxed">사용 중인 워드 문서를 그대로 업로드하거나 템플릿 보관함에서 선택합니다.</p>
              <div className="absolute right-[-24px] top-10 hidden text-white/20 md:block">
                <span className="material-symbols-outlined text-4xl">arrow_forward</span>
              </div>
            </div>
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-4xl font-bold backdrop-blur-sm">02</div>
              <h3 className="mb-4 text-xl sm:text-2xl font-bold">소스 데이터 업로드</h3>
              <p className="text-white/80 leading-relaxed">참고할 텍스트, PDF, 엑셀 또는 원본 로그 파일을 드래그 앤 드롭 하세요.</p>
              <div className="absolute right-[-24px] top-10 hidden text-white/20 md:block">
                <span className="material-symbols-outlined text-4xl">arrow_forward</span>
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-4xl font-bold backdrop-blur-sm">03</div>
              <h3 className="mb-4 text-xl sm:text-2xl font-bold">AI 매핑 및 다운로드</h3>
              <p className="text-white/80 leading-relaxed">AI가 데이터를 자동 매핑합니다. 결과물을 확인하고 즉시 다운로드하세요.</p>
            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-primary/5"></div>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-[3rem] font-bold tracking-tight text-slate-900 dark:text-white leading-tight break-keep">
            오늘부터 서류 작업 대신,<br className="hidden sm:block" />더 가치 있는 일에 집중하세요.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed break-keep">
            복잡한 설치 과정 없이 웹 브라우저에서 바로 시작할 수 있습니다.<br className="hidden sm:block" />지금 DocuMap AI의 강력한 자동화를 직접 경험해 보세요.
          </p>
          <div className="mt-12 flex flex-col items-center gap-4">
            <button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setShowApiInput(true);
              }}
              className="flex h-16 w-full max-w-md items-center justify-center rounded-xl bg-primary text-xl font-black text-white shadow-2xl shadow-primary/40 hover:scale-[1.02] transition-all"
            >
              DocuMap AI 지금 바로 체험하기
            </button>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className="material-symbols-outlined text-sm">info</span>
              설치 없이 웹에서 바로 사용 가능합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="material-symbols-outlined">description</span>
              <span className="text-lg font-bold">DocuMap AI</span>
            </div>
            <p className="text-sm text-slate-400">© 2026 ACLPro. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
