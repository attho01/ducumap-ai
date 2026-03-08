import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mammoth from 'mammoth';
import * as docxPreview from 'docx-preview';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, HeadingLevel, AlignmentType } from 'docx';
import { 
  ArrowLeft, Send, Paperclip, FileText, Image as ImageIcon, X, Loader2, 
  FolderOpen, History, Trash2, Download, Save, Settings2, Sparkles,
  CheckCircle, FileUp, Play, RotateCcw
} from 'lucide-react';

const SYSTEM_INSTRUCTION = `당신은 최고 수준의 행정문서 자동 매핑 전문가이자 프론트엔드 퍼블리셔입니다.

사용자가 업로드한 행정서식 파일의 시각적 구조와 스타일을 픽셀 단위로 완벽하게 보존하면서, 입력 데이터를 해당 서식의 각 항목에 담당자가 직접 기입한 것과 동일한 수준으로 자동 매핑합니다.

─────────────────────────────────────
🔴 전역 절대 규칙 (원샷 매핑 & 완벽한 원본 복제)
─────────────────────────────────────
1. 중간 보고나 사용자 확인 절차 없이 즉시 최종 완성된 HTML 결과물을 출력하세요.
2. [가장 중요 - 픽셀 단위 정밀 복제] 원본 서식의 시각적 형태를 CSS 속성을 통해 100% 똑같이 구현하세요.
   - CSS 상속 배제: 브라우저 기본 스타일이나 CSS 상속에 의존하지 마세요. 모든 개별 HTML 태그(table, tr, td, th, p, span, div 등)에 반드시 \`style\` 속성(Inline CSS)을 명시적으로 선언하세요.
   - 레이아웃 및 여백: width, height, padding, margin을 픽셀(px) 단위로 정밀하게 설정하세요.
   - 타이포그래피: font-family, font-size(px), font-weight, letter-spacing, line-height(px), text-align, vertical-align을 원본과 동일하게 적용하세요. 모든 텍스트는 \`span\`이나 \`p\` 태그로 감싸고 개별 폰트 스타일을 지정하세요.
   - 정밀한 테두리(Border): 표 전체뿐만 아니라 각 셀(td, th)마다 \`border-top\`, \`border-bottom\`, \`border-left\`, \`border-right\`의 굵기(px), 스타일(solid, dashed 등), 색상을 개별적으로 지정하여 원본의 선 굵기 차이(예: 바깥쪽 굵은 선, 안쪽 얇은 선, 이중선 등)를 완벽히 재현하세요. \`border-collapse: collapse;\`는 필수입니다.
   - 표 구조: 표 전체 너비는 반드시 \`width: 100%;\`로 설정하여 A4 용지 영역을 벗어나지 않게 하세요(표 전체에 고정 px 절대 금지). \`table-layout: fixed;\`를 활용하고, 각 열의 너비(width)는 % 비율로 설정하여 합이 100%가 되도록 하세요. colspan, rowspan을 완벽하게 구현하세요.
   - 임의의 디자인(예: 원본에 없는 옅은 회색 배경, 둥근 모서리 등)을 절대 추가하지 마세요. 오직 원본에 존재하는 스타일만 복제하세요.
3. 서식의 행/열/셀 병합 구조(colspan, rowspan)는 절대 깨지지 않게 유지하되, 빈칸은 제공된 데이터만을 사용하여 정확하게 채워 넣으세요. 데이터에 없는 내용을 임의로 지어내거나(할루시네이션), '위와 같이 기록함' 같은 불필요한 문구를 절대 추가하지 마세요.
4. 제공된 데이터의 사실(Fact)만 기입하며, 원본 서식에 없는 문장이나 단어를 창작하지 마세요.

─────────────────────────────────────
📌 출력 형식 (엄수)
─────────────────────────────────────
반드시 아래 형식으로만 응답하세요. 다른 설명은 최소화합니다.

매핑이 완료되었습니다. 왼쪽 화면에서 결과를 확인하고, 수정이 필요한 부분을 채팅으로 알려주세요.
<document>
(여기에 완벽한 Inline CSS 스타일링이 적용된 순수 HTML 코드를 작성하세요. \`\`\`html 마크다운은 절대 쓰지 마세요.)
</document>`;

interface Message {
  role: 'user' | 'model';
  text: string;
  files?: Array<{ name: string; type: string; data: string }>;
}

interface PreviewFile {
  name: string;
  type: string;
  dataUrl: string;
  isText?: boolean;
  textContent?: string;
  isDocx?: boolean;
  htmlContent?: string;
  docxBuffer?: ArrayBuffer;
}

interface ChatInterfaceProps {
  onBack: () => void;
  apiKey?: string;
}

export default function ChatInterface({ onBack, apiKey }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: '안녕하세요. DocuMap AI 행정문서 자동 매핑 전문가입니다.\n\n먼저 분석할 **행정서식 파일(DOCX, PDF, 이미지, TXT)**을 업로드해 주세요.',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  
  // Workflow States
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3>(1);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState(false);
  const [mappingDataText, setMappingDataText] = useState('');
  const [mappingDataFiles, setMappingDataFiles] = useState<File[]>([]);
  const [documentHtml, setDocumentHtml] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const dataInputRef = useRef<HTMLInputElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini API
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (previewFile?.isDocx && previewFile.docxBuffer && docxContainerRef.current) {
      docxContainerRef.current.innerHTML = ''; // Clear previous content
      docxPreview.renderAsync(previewFile.docxBuffer, docxContainerRef.current, undefined, {
        className: "docx-preview-document",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        debug: false,
      }).catch(err => {
        console.error("Error rendering docx:", err);
        if (docxContainerRef.current) {
          docxContainerRef.current.innerHTML = '<div class="p-8 text-red-500">문서를 렌더링하는 중 오류가 발생했습니다.</div>';
        }
      });
    }
  }, [previewFile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);

      // Auto-preview the first newly added file
      const file = newFiles[0];
      const isText = file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv');
      const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      const textContent = isText ? await file.text() : undefined;
      let htmlContent = undefined;
      let docxBuffer = undefined;

      if (isDocx) {
        try {
          docxBuffer = await file.arrayBuffer();
          // Keep mammoth for Gemini text extraction later if needed, but we don't need htmlContent for preview anymore
          // We'll use docx-preview for rendering
        } catch (error) {
          console.error("Error parsing DOCX:", error);
        }
      }

      const url = URL.createObjectURL(file);

      setPreviewFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        dataUrl: url,
        isText,
        textContent,
        isDocx,
        htmlContent,
        docxBuffer
      });
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handlePreviewHistoryFile = async (file: {name: string, type: string, data: string}) => {
    const dataUrl = `data:${file.type};base64,${file.data}`;
    const isText = file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv');
    const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    let textContent = undefined;
    let htmlContent = undefined;
    let docxBuffer = undefined;

    if (isText) {
      try {
        const binString = atob(file.data);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
          bytes[i] = binString.charCodeAt(i);
        }
        textContent = new TextDecoder('utf-8').decode(bytes);
      } catch (e) {
        textContent = "텍스트를 불러올 수 없습니다.";
      }
    } else if (isDocx) {
      try {
        const binString = atob(file.data);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
          bytes[i] = binString.charCodeAt(i);
        }
        docxBuffer = bytes.buffer;
      } catch (e) {
        console.error("Error parsing DOCX history file:", e);
      }
    }

    setPreviewFile({
      name: file.name,
      type: file.type,
      dataUrl,
      isText,
      textContent,
      isDocx,
      htmlContent,
      docxBuffer
    });
  };

  const handlePreviewAttachedFile = async (file: File) => {
    const isText = file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv');
    const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    const textContent = isText ? await file.text() : undefined;
    let htmlContent = undefined;
    let docxBuffer = undefined;

    if (isDocx) {
      try {
        docxBuffer = await file.arrayBuffer();
      } catch (error) {
        console.error("Error parsing DOCX:", error);
      }
    }

    const url = URL.createObjectURL(file);

    setPreviewFile({
      name: file.name,
      type: file.type || 'application/octet-stream',
      dataUrl: url,
      isText,
      textContent,
      isDocx,
      htmlContent,
      docxBuffer
    });
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setTemplateFile(file);
      await handlePreviewAttachedFile(file);
      
      setIsAnalyzingTemplate(true);
      setTimeout(() => {
        setIsAnalyzingTemplate(false);
        setWorkflowStep(2);
      }, 1500);
    }
    if (templateInputRef.current) templateInputRef.current.value = '';
  };

  const handleDataFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setMappingDataFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeDataFile = (index: number) => {
    setMappingDataFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetWorkflow = () => {
    setWorkflowStep(1);
    setTemplateFile(null);
    setMappingDataText('');
    setMappingDataFiles([]);
    setMessages([{
      role: 'model',
      text: '안녕하세요. DocuMap AI 행정문서 자동 매핑 전문가입니다.\n\n먼저 분석할 **행정서식 파일(DOCX, PDF, 이미지, TXT)**을 업로드해 주세요.',
    }]);
    setPreviewFile(null);
  };

  const downloadWord = async () => {
    const contentElement = document.getElementById('latest-ai-response');
    if (!contentElement) {
      alert("다운로드할 내용이 없습니다.");
      return;
    }

    const htmlContent = documentHtml || contentElement.innerHTML;
    
    const sourceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
          h1, h2, h3, h4, h5, h6 { margin-top: 20px; margin-bottom: 10px; }
          p { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    try {
      const { asBlob } = await import('html-docx-js-typescript');
      const blob = await asBlob(sourceHTML);
      const url = URL.createObjectURL(blob as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '매핑결과.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating DOCX:", error);
      alert("DOCX 파일 생성 중 오류가 발생했습니다.");
    }
  };

  const startMapping = async () => {
    if (!templateFile) return;
    if (!mappingDataText.trim() && mappingDataFiles.length === 0) return;

    setWorkflowStep(3);
    setIsLoading(true);

    try {
      const processedTemplate = {
        name: templateFile.name,
        type: templateFile.type || 'application/octet-stream',
        data: await fileToBase64(templateFile),
      };

      const processedDataFiles = await Promise.all(
        mappingDataFiles.map(async (file) => ({
          name: file.name,
          type: file.type || 'application/octet-stream',
          data: await fileToBase64(file),
        }))
      );

      const promptText = `
[매핑 지시사항]
제공된 '내용 파일(텍스트 및 참고 자료)'을 분석하여 '서식 파일'의 빈칸을 채워주세요.

1. 즉시 완성: 중간 확인 과정 없이, 즉시 완성된 전체 HTML 코드를 <document> 태그 안에 넣어 출력하세요.
2. 정확한 내용 기입 (할루시네이션 금지): 제공된 데이터에 있는 내용만 기입하세요. 데이터에 없는 임의의 문장(예: '위와 같이 보고합니다', '위와 같이 기록함' 등)을 절대 지어내지 마세요.
3. 픽셀 단위 서식 완벽 복제 (매우 중요): 
   - 원본 서식의 표 구조(colspan, rowspan)를 완벽히 분석하여 똑같이 만드세요. 단, 표의 전체 너비는 무조건 \`width: 100%;\`로 설정하여 화면을 벗어나지 않게 하고, 각 열의 너비는 % 비율로 지정하세요.
   - CSS 상속에 의존하지 마세요. 모든 개별 태그(td, th, p, span 등)에 inline style을 직접 작성하세요.
   - 글자 폰트 크기(px), 굵기, 자간, 줄간격(px), 정렬(가로/세로), 테두리(상하좌우 각각의 굵기, 색상, 스타일), 여백(padding) 등 모든 시각적 요소를 세밀하게 분석하여 꼼꼼하게 적용하세요.
   - **절대 임의로 디자인을 예쁘게 꾸미거나 변경하지 마세요.** 원본 서식의 투박함이나 독특한 양식(예: 굵은 바깥 테두리, 얇은 안쪽 선 등)까지도 CSS 속성을 통해 100% 그대로 복제해야 합니다.

[사용자 직접 입력 데이터]
${mappingDataText}
      `.trim();

      const newUserMessage: Message = {
        role: 'user',
        text: '서식과 데이터를 분석하여 매핑을 진행해 주세요.',
        files: [processedTemplate, ...processedDataFiles],
      };

      setMessages(prev => [...prev, newUserMessage]);

      const contents = [];
      const parts: any[] = [];

      // Process Template
      if (processedTemplate.name.endsWith('.docx')) {
        try {
          const binString = atob(processedTemplate.data);
          const bytes = new Uint8Array(binString.length);
          for (let i = 0; i < binString.length; i++) {
            bytes[i] = binString.charCodeAt(i);
          }
          const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
          parts.push({ text: `[서식 파일: ${processedTemplate.name}]\n${result.value}` });
        } catch (e) {
          parts.push({ inlineData: { mimeType: processedTemplate.type, data: processedTemplate.data } });
        }
      } else {
        parts.push({ inlineData: { mimeType: processedTemplate.type, data: processedTemplate.data } });
      }

      // Process Data Files
      for (const file of processedDataFiles) {
        if (file.name.endsWith('.docx')) {
          try {
            const binString = atob(file.data);
            const bytes = new Uint8Array(binString.length);
            for (let i = 0; i < binString.length; i++) {
              bytes[i] = binString.charCodeAt(i);
            }
            const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
            parts.push({ text: `[참고 자료: ${file.name}]\n${result.value}` });
          } catch (e) {
            parts.push({ inlineData: { mimeType: file.type, data: file.data } });
          }
        } else {
          parts.push({ inlineData: { mimeType: file.type, data: file.data } });
        }
      }

      parts.push({ text: promptText });

      contents.push({
        role: 'user',
        parts: parts,
      });

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      setMessages(prev => [...prev, {
        role: 'model',
        text: '',
      }]);

      let fullText = '';
      let finalDocHtml = '';
      for await (const chunk of responseStream) {
        fullText += chunk.text;
        
        const docMatch = fullText.match(/<document>([\s\S]*?)(?:<\/document>|$)/);
        if (docMatch) {
          finalDocHtml = docMatch[1];
          setDocumentHtml(finalDocHtml);
        }
        
        const chatMessage = fullText.replace(/<document>[\s\S]*?(?:<\/document>|$)/, '').trim();
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = chatMessage || '문서를 생성 중입니다...';
          return newMessages;
        });
      }

      // Fallback if <document> tags were not used
      if (!finalDocHtml && fullText.includes('<')) {
        const fallbackMatch = fullText.match(/```html\n([\s\S]*?)```/) || fullText.match(/(<h[1-6]>|<table)[\s\S]*/);
        if (fallbackMatch) {
           setDocumentHtml(fallbackMatch[1] || fallbackMatch[0]);
        }
      }
    } catch (error) {
      console.error("Error generating content:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachedFiles.length === 0) return;

    const userText = input.trim();
    const filesToProcess = [...attachedFiles];
    
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      // Process files
      const processedFiles = await Promise.all(
        filesToProcess.map(async (file) => {
          let type = file.type;
          const isDocx = file.name.endsWith('.docx') || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          
          if (!type) {
            if (file.name.endsWith('.pdf')) type = 'application/pdf';
            else if (file.name.endsWith('.txt')) type = 'text/plain';
            else if (file.name.endsWith('.csv')) type = 'text/csv';
            else if (isDocx) type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            else type = 'application/octet-stream';
          }
          return {
            name: file.name,
            type,
            data: await fileToBase64(file),
          };
        })
      );

      const promptText = `
[시스템 지시사항]
사용자의 요청에 따라 현재 매핑된 문서를 수정해주세요.

[현재 문서 HTML]
${documentHtml}

[출력 요구사항]
1. 수정된 전체 문서를 **완전한 HTML 코드**로 출력하세요.
2. 기존에 적용된 모든 inline style(폰트 크기, 굵기, 자간, 정렬, 테두리, 배경색 등)을 절대 누락하지 말고 그대로 유지하거나, 요청에 맞게 더욱 정교하게 보완하세요.
3. 반드시 응답을 다음 형식으로 작성하세요:
수정 완료 메시지 (예: 요청하신 부분을 수정했습니다.)
<document>
여기에 수정이 완료된 전체 HTML 코드를 작성하세요. (\`\`\`html 등의 마크다운 기호 없이 순수 HTML만 작성)
</document>

[사용자 요청]
${userText}
      `.trim();

      const newUserMessage: Message = {
        role: 'user',
        text: userText,
        files: processedFiles.length > 0 ? processedFiles : undefined,
      };

      setMessages(prev => [...prev, newUserMessage]);

      const contents = [];
      
      for (const msg of [...messages, newUserMessage]) {
        const parts: any[] = [];
        
        if (msg.files) {
          for (const file of msg.files) {
            const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            
            if (isDocx) {
              try {
                const binString = atob(file.data);
                const bytes = new Uint8Array(binString.length);
                for (let i = 0; i < binString.length; i++) {
                  bytes[i] = binString.charCodeAt(i);
                }
                const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
                parts.push({ text: `[문서 내용: ${file.name}]\n${result.value}` });
              } catch (e) {
                console.error("Failed to convert DOCX for Gemini", e);
                parts.push({
                  inlineData: {
                    mimeType: file.type,
                    data: file.data,
                  }
                });
              }
            } else {
              parts.push({
                inlineData: {
                  mimeType: file.type,
                  data: file.data,
                }
              });
            }
          }
        }
        
        if (msg.text) {
          parts.push({ text: msg.text });
        }
        
        contents.push({
          role: msg.role,
          parts: parts,
        });
      }

      // Add the prompt text to the last user message
      contents[contents.length - 1].parts.push({ text: promptText });

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      setMessages(prev => [...prev, {
        role: 'model',
        text: '',
      }]);

      let fullText = '';
      let finalDocHtml = '';
      for await (const chunk of responseStream) {
        fullText += chunk.text;
        
        const docMatch = fullText.match(/<document>([\s\S]*?)(?:<\/document>|$)/);
        if (docMatch) {
          finalDocHtml = docMatch[1];
          setDocumentHtml(finalDocHtml);
        }
        
        const chatMessage = fullText.replace(/<document>[\s\S]*?(?:<\/document>|$)/, '').trim();
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = chatMessage || '문서를 수정 중입니다...';
          return newMessages;
        });
      }

      // Fallback if <document> tags were not used
      if (!finalDocHtml && fullText.includes('<')) {
        const fallbackMatch = fullText.match(/```html\n([\s\S]*?)```/) || fullText.match(/(<h[1-6]>|<table)[\s\S]*/);
        if (fallbackMatch) {
           setDocumentHtml(fallbackMatch[1] || fallbackMatch[0]);
        }
      }

    } catch (error) {
      console.error("Error generating content:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: '오류가 발생했습니다. 다시 시도해 주세요.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0f19] text-slate-200 font-display overflow-hidden break-keep">
      
      {/* Top Navigation Bar */}
      <header className="h-14 bg-[#151923] border-b border-[#262d3d] flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-[#262d3d] rounded-md transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-wide text-white leading-tight">DocuMap AI</h1>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                WORKSPACE V1.0
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={resetWorkflow}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-all shadow-lg shadow-slate-900/20"
          >
            <RotateCcw className="w-4 h-4" />
            초기화 (새로 시작)
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Icon Sidebar */}
        <aside className="w-16 bg-[#151923] border-r border-[#262d3d] flex flex-col items-center py-6 gap-6 shrink-0 z-10">
          <button className="p-2.5 text-blue-400 bg-blue-500/10 rounded-xl transition-colors relative group">
            <FolderOpen className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">파일 관리</span>
          </button>
          <button className="p-2.5 text-slate-400 hover:text-slate-200 hover:bg-[#262d3d] rounded-xl transition-colors relative group">
            <History className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">작업 이력</span>
          </button>
          <button className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors relative group mt-auto mb-4">
            <Trash2 className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">초기화</span>
          </button>
        </aside>

        {/* Center Canvas: Document Viewer */}
        <main className="flex-1 bg-[#0b0f19] relative overflow-hidden flex flex-col">
          {workflowStep === 3 ? (
            <div className="flex-1 overflow-auto bg-slate-100 flex justify-center py-10 px-4 sm:px-8">
              <div className="bg-white shadow-2xl ring-1 ring-slate-200 w-full max-w-[21cm] min-h-[29.7cm] p-12 sm:p-16 text-slate-900 relative">
                {documentHtml ? (
                  <div 
                    id="latest-ai-response" 
                    className="w-full text-black [&_table]:border-collapse [&_table]:!w-full [&_table]:!max-w-full [&_table]:table-fixed [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black [&_td]:p-2 sm:[&_td]:p-3 [&_th]:p-2 sm:[&_th]:p-3 [&_td]:break-words [&_th]:break-words"
                    dangerouslySetInnerHTML={{ __html: documentHtml.replace(/```[a-zA-Z]*\n?/gi, '').replace(/```\n?/g, '') }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <p className="text-slate-600 font-medium text-lg">AI가 서식을 분석하고 데이터를 매핑하고 있습니다...</p>
                    <p className="text-sm text-slate-500 mt-2">잠시만 기다려주세요.</p>
                  </div>
                )}
              </div>
            </div>
          ) : previewFile ? (
            <>
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#151923]/80 backdrop-blur-md border border-[#262d3d] px-3 py-1.5 rounded-lg shadow-xl">
                {getFileIcon(previewFile.type)}
                <span className="text-xs font-medium text-slate-300 truncate max-w-[200px]">
                  {previewFile.name}
                </span>
              </div>
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center">
                <div className="w-full h-full max-w-5xl bg-[#151923] rounded-xl shadow-2xl border border-[#262d3d] overflow-hidden flex flex-col">
                  {previewFile.type.startsWith('image/') ? (
                    <div className="flex-1 p-4 flex items-center justify-center bg-[#0b0f19]">
                      <img src={previewFile.dataUrl} alt={previewFile.name} className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                    </div>
                  ) : previewFile.isText ? (
                    <div className="flex-1 p-8 overflow-auto text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed bg-[#151923]">
                      {previewFile.textContent}
                    </div>
                  ) : previewFile.isDocx ? (
                    <div className="flex-1 overflow-auto bg-[#e5e7eb] flex justify-center p-4 sm:p-8">
                      <div 
                        ref={docxContainerRef}
                        className="bg-white shadow-xl min-h-full w-full max-w-[21cm] docx-wrapper-container"
                      />
                    </div>
                  ) : previewFile.type === 'application/pdf' ? (
                    <iframe src={previewFile.dataUrl} className="w-full h-full border-0 bg-white" title="PDF Preview" />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[#151923]">
                      <FileText className="w-16 h-16 mb-4 text-slate-600" />
                      <p className="font-medium text-slate-400">미리보기를 지원하지 않는 파일 형식입니다.</p>
                      <p className="text-sm mt-2 text-slate-500">{previewFile.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <div className="w-24 h-24 mb-6 rounded-2xl bg-[#151923] border border-[#262d3d] flex items-center justify-center shadow-lg">
                <FileText className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-300 mb-2">선택된 문서가 없습니다</h3>
              <p className="text-sm text-center max-w-sm leading-relaxed text-slate-500">
                우측 컨트롤 패널에서 문서를 업로드하면<br/>
                이곳에 표시됩니다.
              </p>
            </div>
          )}
        </main>

        {/* Right Sidebar: Control Panel (Workflow & Chat) */}
        <aside className="w-[450px] bg-[#151923] border-l border-[#262d3d] flex flex-col shrink-0 z-10 shadow-2xl">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#262d3d] bg-[#151923] shrink-0">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              문서 자동 매핑
            </h2>
            <button onClick={resetWorkflow} className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-[#262d3d] px-2.5 py-1.5 rounded-md transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> 새로 시작
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-[#262d3d] bg-[#0b0f19] shrink-0">
            <div className={`flex flex-col items-center gap-1.5 ${workflowStep >= 1 ? 'text-blue-400' : 'text-slate-500'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${workflowStep >= 1 ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-[#1e2532] border border-[#2d3748]'}`}>1</div>
              <span className="text-[10px] font-medium uppercase tracking-wider">서식 등록</span>
            </div>
            <div className={`flex-1 h-px mx-4 ${workflowStep >= 2 ? 'bg-blue-500/50' : 'bg-[#262d3d]'}`} />
            <div className={`flex flex-col items-center gap-1.5 ${workflowStep >= 2 ? 'text-blue-400' : 'text-slate-500'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${workflowStep >= 2 ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-[#1e2532] border border-[#2d3748]'}`}>2</div>
              <span className="text-[10px] font-medium uppercase tracking-wider">내용 입력</span>
            </div>
            <div className={`flex-1 h-px mx-4 ${workflowStep >= 3 ? 'bg-blue-500/50' : 'bg-[#262d3d]'}`} />
            <div className={`flex flex-col items-center gap-1.5 ${workflowStep >= 3 ? 'text-blue-400' : 'text-slate-500'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${workflowStep >= 3 ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-[#1e2532] border border-[#2d3748]'}`}>3</div>
              <span className="text-[10px] font-medium uppercase tracking-wider">결과 확인</span>
            </div>
          </div>

          {/* Dynamic Content */}
          <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
            {workflowStep === 1 && (
              <div className="p-6 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">1. 빈 서식 파일 업로드</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">내용을 채워넣을 원본 양식(DOCX, PDF, 이미지 등)을 업로드해주세요. 업로드 시 좌측에 미리보기가 표시됩니다.</p>
                </div>
                
                <div 
                  className="border-2 border-dashed border-[#2d3748] rounded-xl flex flex-col items-center justify-center p-10 hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer group"
                  onClick={() => !isAnalyzingTemplate && templateInputRef.current?.click()}
                >
                  {isAnalyzingTemplate ? (
                    <>
                      <div className="w-16 h-16 bg-[#1e2532] rounded-full flex items-center justify-center mb-4">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                      </div>
                      <p className="text-slate-200 font-medium mb-1">서식 구조를 분석하고 있습니다...</p>
                      <p className="text-xs text-slate-500">잠시만 기다려주세요</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-[#1e2532] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileUp className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-slate-200 font-medium mb-1">클릭하여 파일 선택</p>
                      <p className="text-xs text-slate-500">또는 파일을 여기로 드래그하세요</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={templateInputRef} 
                    className="hidden" 
                    accept=".docx,.pdf,image/*"
                    onChange={handleTemplateUpload}
                    disabled={isAnalyzingTemplate}
                  />
                </div>

                {templateFile && !isAnalyzingTemplate && (
                  <div className="mt-6 p-4 bg-[#0b0f19] rounded-xl border border-[#262d3d] flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-400 flex-shrink-0" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-200 truncate">{templateFile.name}</p>
                        <p className="text-xs text-slate-500">{(templateFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setWorkflowStep(2)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shadow-lg shadow-blue-900/20"
                    >
                      다음 단계
                    </button>
                  </div>
                )}
              </div>
            )}

            {workflowStep === 2 && (
              <div className="p-6 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">2. 매핑할 내용 입력</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">서식에 채워넣을 텍스트를 입력하거나, 참고할 자료 파일을 업로드해주세요.</p>
                </div>

                <div className="flex-1 flex flex-col gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">텍스트 입력</label>
                    <textarea
                      value={mappingDataText}
                      onChange={(e) => setMappingDataText(e.target.value)}
                      placeholder="예: 어제 오후 3시에 진행된 주간 회의 내용을 회의록 양식에 맞춰서 작성해줘. 참석자는 홍길동, 김철수..."
                      className="w-full h-40 bg-[#0b0f19] border border-[#2d3748] rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-300">참고 자료 첨부 (선택)</label>
                      <button 
                        onClick={() => dataInputRef.current?.click()}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 rounded-md transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> 파일 추가
                      </button>
                      <input 
                        key={mappingDataFiles.length}
                        type="file" 
                        ref={dataInputRef} 
                        className="hidden" 
                        multiple
                        accept=".docx,.pdf,.txt,.csv,image/*"
                        onChange={handleDataFilesUpload}
                      />
                    </div>
                    
                    {mappingDataFiles.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {mappingDataFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-[#0b0f19] border border-[#262d3d] rounded-lg group">
                            <div className="flex items-center gap-2 overflow-hidden">
                              {getFileIcon(file.type)}
                              <span className="text-xs text-slate-300 truncate">{file.name}</span>
                            </div>
                            <button onClick={() => removeDataFile(idx)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={startMapping}
                  disabled={!mappingDataText.trim() && mappingDataFiles.length === 0}
                  className="mt-8 w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-[#1e2532] disabled:text-slate-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:shadow-none"
                >
                  <Play className="w-4 h-4" />
                  AI 매핑 시작하기
                </button>
              </div>
            )}

            {workflowStep === 3 && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[#262d3d] bg-[#1a1f2b]/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-200">매핑 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={downloadWord}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-900/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Word 다운로드
                    </button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {messages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[90%] rounded-2xl p-4 ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-sm shadow-md' 
                            : 'bg-[#1e2532] border border-[#2d3748] shadow-sm rounded-tl-sm text-slate-200'
                        }`}
                      >
                        {/* Attached Files Display */}
                        {msg.files && msg.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {msg.files.map((file, fIdx) => (
                              <div 
                                key={fIdx} 
                                onClick={() => handlePreviewHistoryFile(file)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs cursor-pointer transition-colors border ${
                                  msg.role === 'user' 
                                    ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                                    : 'bg-[#151923] border-[#2d3748] hover:bg-[#262d3d]'
                                }`}
                              >
                                {getFileIcon(file.type)}
                                <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Message Text */}
                        {msg.text && (
                          <div className={`prose prose-sm max-w-none prose-invert prose-p:leading-relaxed prose-pre:bg-[#0b0f19] prose-pre:border prose-pre:border-[#2d3748] prose-th:bg-[#151923] prose-th:p-2 prose-td:p-2 prose-table:border-collapse prose-table:w-full prose-td:border prose-td:border-[#2d3748] prose-th:border prose-th:border-[#2d3748] break-keep`}>
                            {msg.role === 'user' && msg.text === '서식과 데이터를 분석하여 매핑을 진행해 주세요.' ? (
                              <div className="flex items-center gap-2 text-blue-300">
                                <Sparkles className="w-4 h-4" />
                                <span className="font-medium">AI 매핑 요청 완료</span>
                              </div>
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                {msg.text.replace(/```html\n?/gi, '').replace(/```\n?/g, '')}
                              </ReactMarkdown>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#1e2532] border border-[#2d3748] shadow-sm rounded-2xl rounded-tl-sm p-4 flex items-center gap-3 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-xs font-medium">AI가 문서를 분석하고 매핑 중입니다...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input for Refinements */}
                <div className="p-4 bg-[#0b0f19] border-t border-[#262d3d] shrink-0">
                  <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
                    <div className="relative flex-1 bg-[#151923] border border-[#2d3748] rounded-xl focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                          }
                        }}
                        placeholder="수정할 내용이 있다면 입력하세요..."
                        className="w-full max-h-[150px] min-h-[44px] bg-transparent border-none resize-none py-3 pl-3 pr-10 focus:ring-0 text-sm text-slate-200 placeholder-slate-500"
                        rows={1}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-all shadow-md shadow-blue-900/20"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
