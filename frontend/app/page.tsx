"use client";


import GoogleLoginButton from "./components/GoogleLoginButton";
import { useState, useEffect, useRef } from "react";
console.log("PAGE RENDERED");

import {
  Send, Scale, ShieldCheck, Bot, User, ArrowDown,
  PanelLeftClose, PanelLeftOpen, Plus, MessageSquare, Trash2,
  Sparkles, Copy, Check, Pencil, FileText, ImageIcon, X,
  FileDown, Image as ImageLucide, Loader2, Download, Wand2,
  Volume2,
} from "lucide-react";


type MessageRole =
  | "user"
  | "assistant"
  | "ai_image"
  | "pdf";
type Message = { role: MessageRole; content: string; };
type Conversation = { id: string; title: string; };

const THINKING_STEPS = [
  "🔍 Analyzing your query...",
  "📚 Searching legal database...",
  "⚖️ Preparing legal advice...",
  "✅ Almost done...",
];

const AI_IMAGE_THINKING_STEPS = [
  "🎨 Understanding your prompt...",
  "🖌️ Generating image with AI...",
  "✨ Applying details...",
  "🖼️ Finalizing your image...",
];



function detectGenerateIntent(text: string): "pdf" | "image" | "ai_image" | null {
  const t = text.toLowerCase();

  const educationalDocs = [
    "jamabandi",
    "jamabdi",
    "jamabndi",
    "jama bandi",
    "jamabandhi",

    "intkal",
    "intekal",
    "intqal",
    "mutation",

    "fard",
    "farde",
    "fard jamabandi",

    "registry",
    "registery",
    "sale deed",
    "sale-deed",

    "partition deed",
    "partition",

    "power of attorney",
    "poa",

    "will",
    "vasiyat",
    "vasiyatnama"
  ];
  const documentWords = [
    "image",
    "photo",
    "picture",
    "pic",
    "sample",
    "document",
    "copy",
    "format",
    "show",
    "display",
    "view"
  ];

  if (
    educationalDocs.some(doc => t.includes(doc)) &&
    documentWords.some(word => t.includes(word))
  ) {
    return null;
  }

  const aiImageKeywords = [
    "generate image of",
    "create image of",
    "make image of",
    "draw image of",
    "image of",
    "image",
    "generate an image of",
    "create an image of",
    "make an image of",
    "generate a picture of",
    "create a picture of",
    "show me an image of",
    "show me a picture of",
    "generate an image",
    "create an image",
    "make an image",
    "generate a picture",
    "create a picture",
    "image banao",
    "tasveer banao",
    "paint a",
    "draw a",
    "image of a",
    "picture of a",
    "image showing",
    "generate me a",

    // NEW
    "lion",
    "tiger",
    "elephant",
    "farmer",
    "village",
    "house",
    "map",
    "property document",
    "property documents",
    "land record",
    "court building",
    "farm",
    "wheat field",
    "tractor",
  ];
  const imageNouns = [
    "lion",
    "tiger",
    "farmer",
    "village",
    "house",
    "map",




    "tractor",
  ];

  if (
    text.split(" ").length <= 6 &&
    imageNouns.some(word => t.includes(word))
  ) {
    return "ai_image";
  }
  if (aiImageKeywords.some((kw) => t.includes(kw))) return "ai_image";
  if (
    t.includes("generate pdf") || t.includes("create pdf") ||
    t.includes("make pdf") || t.includes("download pdf") ||
    t.includes("save as pdf") || t.includes("export pdf") ||
    t.includes("pdf banao") || t.includes("pdf bana")
  ) return "pdf";
  if (
    t.includes("generate image") || t.includes("create image") ||
    t.includes("make image") || t.includes("save as image") ||
    t.includes("download image") || t.includes("image bana") ||
    t.includes("screenshot")
  ) return "image";
  return null;
}


function isLandRelatedPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();

  const landKeywords = [
    "land",
    "property",
    "farm",
    "farmer",
    "village",
    "plot",
    "boundary",
    "survey",
    "registry",
    "sale deed",
    "partition",
    "power of attorney",
    "will",
    "jamabandi",
    "intkal",
    "mutation",
    "fard",
    "khasra",
    "khatauni",
    "patwari",
    "tehsil",
    "revenue",
    "agriculture",
    "field",
    "canal",
    "map"
  ];

  return landKeywords.some(keyword => p.includes(keyword));
}


function AIImage({
  url,
  prompt,
  onPreview,
}: {
  url: string;
  prompt: string;
  onPreview: (url: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const [downloaded, setDownloaded] = useState(false);



  return (
    <div className="ai-image-img-wrap">
      {!loaded && !error && (
        <div className="ai-image-loader">
          <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#a855f7" }} />
          <span>Loading image...</span>
        </div>
      )}
      {error && (
        <div className="ai-image-loader">
          <span style={{ color: "#ef4444" }}>⚠️ Image failed to load.</span>
        </div>
      )}
      <img
        src={url}
        alt={prompt}
        className="ai-image-img"
        draggable={false}
        onClick={() => onPreview(url)}
        style={{ opacity: loaded ? 1 : 0, display: error ? "none" : "block" }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}


export default function Home() {
  //const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [downloadedUrl, setDownloadedUrl] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);


  const [thinkingStep, setThinkingStep] = useState(0);
  const [userLoaded, setUserLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [welcomeModalName, setWelcomeModalName] = useState<string | null>(null);
  const [uploadedPdfText, setUploadedPdfText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [input, setInput] = useState("");
  const [recordingText, setRecordingText] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(
    Array(50).fill(10)
  );
  const [voiceMode, setVoiceMode] = useState(false);


  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showGuestBanner, setShowGuestBanner] = useState(false);
  const guestPromptShownRef = useRef(false);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);





  const [showMenu, setShowMenu] = useState(false);



  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);

      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = "generated-image.png";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);

      setDownloadedUrl(url);

      setTimeout(() => {
        setDownloadedUrl("");
      }, 2000);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };




  useEffect(() => {
    const savedUser = localStorage.getItem(
      "landresolve_user"
    );

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setTimeout(() => {
      setUserLoaded(true);
    }, 50);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      setToast(e.detail);

      setTimeout(() => {
        setToast("");
      }, 2500);
    };

    window.addEventListener(
      "show-toast",
      handler
    );

    return () => {
      window.removeEventListener(
        "show-toast",
        handler
      );
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);
  useEffect(() => {
    if (user) setShowGuestBanner(false);
  }, [user]);
  const [showThinking, setShowThinking] = useState(false);
  const [isAIImageThinking, setIsAIImageThinking] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingMsgIndex, setEditingMsgIndex] = useState<number | null>(null);
  const [editMsgValue, setEditMsgValue] = useState("");
  const [hoveredMsgIndex, setHoveredMsgIndex] = useState<number | null>(null);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<Record<number, { url: string; format: string }>>({});

  const [introVisible, setIntroVisible] = useState(false);
  const [introFading, setIntroFading] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [hasFirstMessage, setHasFirstMessage] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);


  const [messages, setMessages] = useState<Message[]>([]);



  const conversationIdRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  const thinkingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingStepRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const introFullText = "Welcome to LandResolve AI";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await new Promise(r => setTimeout(r, 600));
      for (let i = 0; i <= introFullText.length; i++) {
        if (cancelled) return;
        setTypedText(introFullText.slice(0, i));
        await new Promise(r => setTimeout(r, 65 + Math.random() * 25));
      }
      if (cancelled) return;
      setShowSubtitle(true);
      await new Promise(r => setTimeout(r, 400));
      if (cancelled) return;
      setShowBadge(true);
      await new Promise(r => setTimeout(r, 1600));
      if (cancelled) return;
      setIntroFading(true);
      await new Promise(r => setTimeout(r, 850));
      if (cancelled) return;
      setIntroVisible(false);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    console.log("page-load");

    fetchConversations();

    fetch("https://landresolveai.onrender.com/health")
      .catch(() => { });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {

      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target as Node)
      ) {
        setShowAttachMenu(false);
      }

    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showThinking]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom < 100;
    setShowScrollBtn(distanceFromBottom > 200);
  };

  const scrollToBottom = () => {
    isAtBottomRef.current = true;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
  };

  const startThinking = (isImage = false) => {
    const steps = isImage ? AI_IMAGE_THINKING_STEPS : THINKING_STEPS;
    thinkingStepRef.current = 0;
    setThinkingStep(0);
    setShowThinking(true);
    setIsAIImageThinking(isImage);
    thinkingIntervalRef.current = setInterval(() => {
      thinkingStepRef.current += 1;
      if (thinkingStepRef.current < steps.length) {
        setThinkingStep(thinkingStepRef.current);
      } else {
        setThinkingStep(steps.length - 1);
        if (thinkingIntervalRef.current) {
          clearInterval(thinkingIntervalRef.current);
          thinkingIntervalRef.current = null;
        }
      }
    }, 2500);
  };

  const stopThinking = () => {
    if (thinkingIntervalRef.current) {
      clearInterval(thinkingIntervalRef.current);
      thinkingIntervalRef.current = null;
    }
    setShowThinking(false);
    setThinkingStep(0);
    setIsAIImageThinking(false);
    thinkingStepRef.current = 0;
  };

  const fetchConversations = async () => {
    try {

      const savedUser = localStorage.getItem(
        "landresolve_user"
      );

      const user = savedUser
        ? JSON.parse(savedUser)
        : null;

      if (!user?.id) return;

      const res = await fetch(
        `https://landresolveai.onrender.com/conversations?user_id=${user.id}`
      );

      const data = await res.json();




      setConversations(data);

    } catch (e) {
      console.log(e);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`https://landresolveai.onrender.com/conversations/${id}`);
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      setMessages(data);
      messagesRef.current = data;
      conversationIdRef.current = id;
      setCurrentConversationId(id);
      localStorage.setItem("conversation_id", String(id));
      setGeneratedFiles({});
      setHasFirstMessage(true);
    } catch (e) { console.log(e); }
  };

  const handleNewChat = () => {
    localStorage.removeItem("conversation_id");
    conversationIdRef.current = null;
    setCurrentConversationId(null);
    setGeneratedFiles({});
    setHasFirstMessage(false);
    const welcome: Message[] = [{
      role: "assistant",
      content:
        "👋 Welcome to LandResolve AI. Describe your land dispute problem in simple language and I'll provide expert legal guidance. !",
    }];
    setMessages(welcome);
    messagesRef.current = welcome;
  };

  const startRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const submitRename = async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      await fetch(`https://landresolveai.onrender.com/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      fetchConversations();
    } catch (err) { console.log(err); }
    setRenamingId(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await fetch(`https://landresolveai.onrender.com/conversations/${id}`, { method: "DELETE" });
      if (currentConversationId === id) handleNewChat();
      fetchConversations();
    } catch (err) { console.log(err); }
  };

  const startEditMessage = (index: number, content: string) => {
    setEditingMsgIndex(index);
    setEditMsgValue(content);
  };

  const cancelEdit = () => {
    setEditingMsgIndex(null);
    setEditMsgValue("");
  };

  const handleGenerate = async (format: "pdf" | "image", targetMsgIndex: number) => {
    const targetMsg = messagesRef.current[targetMsgIndex];
    if (!targetMsg) return;
    setGeneratingIndex(targetMsgIndex);
    try {
      const res = await fetch("https://landresolveai.onrender.com/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: targetMsg.content,
          title: "LandResolve AI — Legal Guidance",
          format,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert("Generation failed: " + data.error);
      } else {
        setGeneratedFiles((prev) => ({
          ...prev,
          [targetMsgIndex]: { url: `https://landresolveai.onrender.com${data.url}`, format: data.format },
        }));
      }
    } catch (err) {
      alert("Error generating file. Make sure backend is running.");
    }
    setGeneratingIndex(null);
  };

  const handleAIImageGenerate = async (prompt: string) => {
    console.log("STEP 1");
    setIsLoading(true);
    startThinking(true);
    setHasFirstMessage(true);
    isAtBottomRef.current = true;
    setShowScrollBtn(false);

    //const userMsg: Message = { role: "user", content: prompt };
    //const updated = [...messagesRef.current, userMsg];
    //setMessages(updated);
    //messagesRef.current = updated;

    const cleanPrompt = prompt
      .replace(/generate (an? )?image of/gi, "")
      .replace(/create (an? )?image of/gi, "")
      .replace(/make (an? )?image of/gi, "")
      .replace(/generate (an? )?picture of/gi, "")
      .replace(/create (an? )?picture of/gi, "")
      .replace(/show me (an? )?(image|picture) of/gi, "")
      .replace(/draw (an? )?/gi, "")
      .replace(/paint a /gi, "")
      .replace(/generate me a /gi, "")
      .replace(/image (banao|bana)/gi, "")
      .replace(/tasveer (banao|bana)/gi, "")
      .trim();

    console.log("STEP 2", cleanPrompt);

    if (!isLandRelatedPrompt(cleanPrompt)) {

      stopThinking();
      setIsLoading(false);

      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail:
            "Only land and property related images can be generated."
        })
      );

      return;
    }


    const userMsg: Message = { role: "user", content: prompt };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    messagesRef.current = updated;




    try {

      const savedUser = localStorage.getItem("landresolve_user");

      const user = savedUser
        ? JSON.parse(savedUser)
        : null;

      console.log("STEP 4 FETCH");
      const res = await fetch("https://landresolveai.onrender.com/generate-ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({
          prompt: cleanPrompt,
          user_id: user?.id,
          conversation_id: conversationIdRef.current,
        }),
      });

      const data = await res.json();
      if (data.conversation_id) {
        conversationIdRef.current = data.conversation_id;
        setCurrentConversationId(data.conversation_id);

        await fetchConversations();
      }
      stopThinking();

      if (data.error) {
        const errMsg: Message = {
          role: "assistant",
          content:
            "🏞️ I can generate only land and property related educational images.\n\nExamples:\n• Village map\n• Farm land\n• Survey map\n• Land boundary\n• Jamabandi sample\n• Patwari office",
        };
        const final = [...messagesRef.current, errMsg];
        setMessages(final);
        messagesRef.current = final;

        await fetchConversations();
      } else {
        const imageUrl = `https://landresolveai.onrender.com${data.url}`;
        const imgMsg: Message = {
          role: "ai_image",
          content: JSON.stringify({
            url: imageUrl,
            prompt: data.prompt || cleanPrompt,
          }),
        };
        const final = [...messagesRef.current, imgMsg];
        setMessages(final);
        messagesRef.current = final;
      }
    } catch (e) {
      stopThinking();
      const errMsg: Message = {
        role: "assistant",
        content: "⚠️ Could not connect to backend. Make sure it is running on port 8000.",
      };
      const final = [...messagesRef.current, errMsg];
      setMessages(final);
      messagesRef.current = final;
    }
    setIsLoading(false);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const submitEditMessage = async () => {
    if (!editMsgValue.trim()) { setEditingMsgIndex(null); return; }
    const editedContent = editMsgValue.trim();
    const targetIndex = editingMsgIndex ?? messagesRef.current.length - 1;
    setEditingMsgIndex(null);
    setEditMsgValue("");

    const userMessage: Message = { role: "user", content: editedContent };
    const updatedMessages = [
      ...messagesRef.current.slice(0, targetIndex),
      userMessage,
    ];
    setMessages(updatedMessages);
    messagesRef.current = updatedMessages;

    setIsLoading(true);
    startThinking();
    isAtBottomRef.current = true;

    try {
      const conversationIdToSend = conversationIdRef.current;


      const savedUser = localStorage.getItem(
        "landresolve_user"
      );

      const user = savedUser
        ? JSON.parse(savedUser)
        : null;

      console.log("conversationIdToSend =", conversationIdToSend);

      const response = await fetch(
        "https://landresolveai.onrender.com/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            messages: updatedMessages,
            pdf_text: uploadedPdfText,
            conversation_id:
              conversationIdToSend !== null
                ? String(conversationIdToSend)
                : null,
            user_id: user?.id
          }),
        }
      );

      const returnedId = response.headers.get("X-Conversation-Id");
      if (returnedId) {
        const id = returnedId;
        conversationIdRef.current = id;
        setCurrentConversationId(id);
        localStorage.setItem("conversation_id", String(id));
      }

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) { setIsLoading(false); fetchConversations(); break; }
        if (firstChunk) {
          stopThinking();
          firstChunk = false;
          setMessages((prev) => {
            const u = [...prev, { role: "assistant" as MessageRole, content: "" }];
            messagesRef.current = u;
            return u;
          });
        }
        let messageRole: MessageRole = "assistant";

        try {
          const parsed = JSON.parse(aiText);

          if (parsed.type === "document_image") {
            messageRole = "ai_image";
          }
        } catch { }

        setMessages((prev) => {
          const u = [...prev];

          let messageRole: MessageRole = "assistant";

          try {
            const parsed = JSON.parse(aiText);

            if (parsed.type === "document_image") {
              messageRole = "ai_image";
            }
          } catch { }

          u[u.length - 1] = {
            role: messageRole,
            content: aiText,
          };

          messagesRef.current = u;
          return [...u];
        });


      }
    } catch (e) {
      stopThinking();
      setIsLoading(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Error connecting to backend." }]);
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
  
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
  
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.start();
  
      setIsListening(true);
      isListeningRef.current = true;
      setVoiceMode(true);
  
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;
  
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteTimeDomainData(dataArray);
        const bars = Array.from(dataArray).slice(0, 50).map((v) => {
          const level = Math.abs(v - 128);
          return Math.max(3, level * 2);
        });
        setAudioLevels(bars);
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch (err) {
      console.log("Mic error:", err);
      alert("Could not access microphone");
    }
  };


  const speakText = (text: string) => {

    window.speechSynthesis.cancel();

    const cleanText = text

      // Convert markdown headings
      .replace(/\*\*(.*?)\*\*/g, "$1. ")

      // Convert table separators
      .replace(/\|/g, ". ")


      // Convert bullet points
      .replace(/^\s*[-•*]\s+/gm, "Point. ")

      // Convert numbered lists
      .replace(/^1\.\s/gm, "First, ")
      .replace(/^2\.\s/gm, "Second, ")
      .replace(/^3\.\s/gm, "Third, ")
      .replace(/^4\.\s/gm, "Fourth, ")
      .replace(/^5\.\s/gm, "Fifth, ")

      .replace(/[#*_`]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+/g, " ")
      .replace(/\n+/g, ". ")
      .trim();

    const speech = new SpeechSynthesisUtterance(cleanText);

    const hindiRegex = /[\u0900-\u097F]/;

    speech.lang = hindiRegex.test(cleanText)
      ? "hi-IN"
      : "en-IN";

    speech.rate = 1;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
  };

  const stopRecording = () => {
    isListeningRef.current = false;
    mediaRecorderRef.current?.stop();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close();
    setIsListening(false);
    setVoiceMode(false);
  };
  
  const acceptRecording = () => {
    isListeningRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
  
    recorder.onstop = async () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
      setIsListening(false);
      setVoiceMode(false);
  
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.webm");
  
      try {
        const res = await fetch("https://landresolveai.onrender.com/transcribe", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        setInput(data.text || "");
      } catch (err) {
        console.log("Transcription error:", err);
        alert("Could not transcribe audio");
      }
    };
  
    recorder.stop();
  };


  const handleSend = async () => {
    if (isLoading || !input.trim()) return;
    const currentInput = input.trim();
    setInput("");
    setHasFirstMessage(true);

    if (!user && !guestPromptShownRef.current) {
      guestPromptShownRef.current = true;
      setTimeout(() => setShowGuestBanner(true), 1200);
    }


    const genIntent = detectGenerateIntent(currentInput);

    console.log("GEN INTENT =", genIntent);

    if (genIntent === "ai_image") {
      console.log("CALLING handleAIImageGenerate");
      await handleAIImageGenerate(currentInput);
      return;
    }



    if (genIntent === "pdf" || genIntent === "image") {
      const lastAiIndex = [...messagesRef.current]
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => m.role === "assistant")
        .pop();
      if (lastAiIndex) {

        const userMsg: Message = { role: "user", content: currentInput };
        const updated = [...messagesRef.current, userMsg];
        setMessages(updated);
        messagesRef.current = updated;
        await handleGenerate(genIntent, lastAiIndex.i);
        const genMsg: Message = {
          role: "assistant",
          content:
            genIntent === "pdf"
              ? `✅ Your PDF has been generated! Click the **Download PDF** button above to save it.`
              : `✅ Your image has been generated! Click the **Download Image** button above to save it.`,
        };
        const finalMsgs = [...messagesRef.current, genMsg];
        setMessages(finalMsgs);
        messagesRef.current = finalMsgs;
        return;
      }
    }

    if (uploadedFileName) {
      const pdfMsg: Message = {
        role: "pdf",
        content: uploadedFileName,
      };

      const updated = [...messagesRef.current, pdfMsg];
      setMessages(updated);
      messagesRef.current = updated;

      setCurrentConversationId(`pdf-${Date.now()}`);
      setUploadedFileName("");
      setUploadedPdfText("");
    }

    setIsLoading(true);
    startThinking();
    isAtBottomRef.current = true;
    setShowScrollBtn(false);

    console.log(
      "SENDING TO:",
      conversationIdRef.current
    );

    const userMessage: Message = { role: "user", content: currentInput };
    const updatedMessages = [...messagesRef.current, userMessage];
    setMessages(updatedMessages);
    messagesRef.current = updatedMessages;

    try {
      const conversationIdToSend = conversationIdRef.current;
      console.log(
        "conversationIdToSend =",
        conversationIdToSend
      );
      const savedUser = localStorage.getItem(
        "landresolve_user"
      );

      const user = savedUser
        ? JSON.parse(savedUser)
        : null;

      const response = await fetch("https://landresolveai.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({
          messages: updatedMessages,
          pdf_text: uploadedPdfText,
          conversation_id:
            conversationIdToSend !== null
              ? String(conversationIdToSend)
              : null,
          user_id: user?.id
        }),
      });

      const returnedId = response.headers.get("X-Conversation-Id");
      if (returnedId) {
        const id = returnedId;
        conversationIdRef.current = id;
        setCurrentConversationId(id);
        localStorage.setItem("conversation_id", String(id));
      }

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let firstChunk = true;


      while (true) {
        const { done, value } = await reader.read();

        if (done) {



          setIsLoading(false);
          fetchConversations();
          break;
        }

        if (firstChunk) {
          stopThinking();
          firstChunk = false;

          setMessages((prev) => {
            const u = [...prev, { role: "assistant" as MessageRole, content: "" }];
            messagesRef.current = u;
            return u;
          });
        }

        aiText += decoder.decode(value);

        setMessages((prev) => {
          const u = [...prev];
          let messageRole: MessageRole = "assistant";

          try {
            const parsed = JSON.parse(aiText);

            if (parsed.type === "document_image") {
              messageRole = "ai_image";
            }
          } catch { }

          u[u.length - 1] = {
            role: messageRole,
            content: aiText
          };
          messagesRef.current = u;
          return [...u];
        });
      }


    } catch (e) {
      stopThinking();
      setIsLoading(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Error connecting to backend." }]);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    console.log("UPLOAD FUNCTION CALLED");
    const file = event.target.files?.[0];
    console.log("FILE NAME:", file?.name);
    console.log("FILE TYPE:", file?.type);

    if (!file) return;

    setIsExtractingPdf(true);
    setUploadedFileName(file.name);
    setUploadedPdfText("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      console.log("CALLING EXTRACT API");



      const response = await fetch(
        "https://landresolveai.onrender.com/extract-text",
        {
          method: "POST",
          body: formData,
        }

      );

      console.log("RESPONSE STATUS:", response.status);



      const data = await response.json();
      console.log("DATA:", data);

      if (!response.ok || data.error) {
        alert(data.error || "Could not extract any text from this file.");
        setUploadedFileName("");
        setUploadedPdfText("");
        setIsExtractingPdf(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const extractedText =
        data.text || data.extracted_text || "";

      setUploadedPdfText(extractedText);
      setInput("");

    } catch (error) {
      console.error("FETCH ERROR:", error);
      alert("Failed to extract text");
      setUploadedFileName("");
    }
    setIsExtractingPdf(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };



  const currentThinkingSteps = isAIImageThinking ? AI_IMAGE_THINKING_STEPS : THINKING_STEPS;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg-base: #0a0a0f; --bg-surface: #111118; --bg-elevated: #16161f;
          --bg-hover: #1e1e2a; --bg-active: #1a2a1a; --border: rgba(255,255,255,0.06);
          --border-strong: rgba(255,255,255,0.1); --accent: #22c55e; --accent-dim: #16a34a;
          --accent-glow: rgba(34,197,94,0.15); --accent-glow-strong: rgba(34,197,94,0.25);
          --text-primary: #f0f0f5; --text-secondary: #8b8b9e; --text-muted: #52526a;
          --sidebar-width: 280px; --radius-sm: 8px; --radius-md: 14px; --radius-lg: 20px;
          --radius-xl: 28px; --font: 'Sora', sans-serif;
          --font-mono: 'JetBrains Mono', monospace; --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        html, body { height: 100%; background: var(--bg-base); font-family: var(--font); overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }

        /* ── KEYFRAMES ── */
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-5px); opacity: 1; } }
        @keyframes msgFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes msgSlideInLeft { from { opacity: 0; transform: translateX(-18px) translateY(6px); } to { opacity: 1; transform: translateX(0) translateY(0); } }
        @keyframes msgSlideInRight { from { opacity: 0; transform: translateX(18px) translateY(6px); } to { opacity: 1; transform: translateX(0) translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 14px var(--accent-glow); } 50% { box-shadow: 0 0 28px var(--accent-glow-strong), 0 0 50px rgba(34,197,94,0.12); } }
        @keyframes sendPop { 0% { transform: scale(1); } 40% { transform: scale(0.88); } 70% { transform: scale(1.12); } 100% { transform: scale(1); } }
        @keyframes thinkingSlide { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes particleRise { 0% { opacity: 0; transform: translateY(0) scale(0); } 8% { opacity: 0.5; } 92% { opacity: 0.2; } 100% { opacity: 0; transform: translateY(-100vh) scale(1.5); } }
        @keyframes introLogoIn { from { opacity: 0; transform: scale(0.6) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes chipHoverGlow { from { box-shadow: none; } to { box-shadow: 0 0 16px rgba(34,197,94,0.2); } }
        @keyframes scrollBtnBounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-4px); } }
        @keyframes avatarPop { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
        @keyframes inputGlow { from { box-shadow: 0 0 0 0px rgba(34,197,94,0); } to { box-shadow: 0 0 0 4px rgba(34,197,94,0.09); } }
        @keyframes sidebarItemIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ripple { 0% { transform: scale(0); opacity: 0.5; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes typewriterCaret { 0%,100%{border-right-color:#22c55e} 50%{border-right-color:transparent} }
        @keyframes menuFadeIn {from {opacity: 0;transform: translateY(-8px) scale(0.96);}to {opacity: 1;transform: translateY(0) scale(1);}}

        /* ── INTRO ── */
        .intro-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: #0a0a0f;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          transition: opacity 0.85s cubic-bezier(0.4,0,0.2,1), transform 0.85s cubic-bezier(0.4,0,0.2,1);
        }
        .intro-overlay.fading { opacity: 0; transform: scale(1.04); pointer-events: none; }
        .intro-logo-wrap {
          width: 76px; height: 76px; border-radius: 24px;
          background: linear-gradient(135deg, #16a34a, #22c55e);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 32px;
          box-shadow: 0 0 60px rgba(34,197,94,0.25), 0 0 120px rgba(34,197,94,0.1);
          animation: introLogoIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both, glowPulse 3s ease-in-out infinite;
        }
        .intro-title {
          font-size: clamp(26px, 4vw, 40px); font-weight: 700;
          color: #f0f0f5; letter-spacing: -1.2px;
          min-height: 52px; display: flex; align-items: center; text-align: center;
        }
        .intro-cursor {
          display: inline-block; width: 3px; height: 40px;
          background: #22c55e; border-radius: 2px; margin-left: 4px;
          vertical-align: middle; animation: cursorBlink 0.75s step-end infinite;
          box-shadow: 0 0 10px rgba(34,197,94,0.6);
        }
        .intro-cursor.hidden { opacity: 0; animation: none; }
        .intro-subtitle {
          margin-top: 14px; font-size: 15px; color: #52526a; text-align: center;
          opacity: 0; transform: translateY(8px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .intro-subtitle.show { opacity: 1; transform: translateY(0); }
        .intro-badge {
          margin-top: 24px; padding: 7px 20px;
          border: 1px solid rgba(34,197,94,0.2); border-radius: 99px;
          font-size: 12px; color: #22c55e; background: rgba(34,197,94,0.07);
          letter-spacing: 0.8px; opacity: 0; transform: translateY(8px);
          transition: opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s;
        }
        .intro-badge.show { opacity: 1; transform: translateY(0); }
        .intro-particle {
          position: absolute; border-radius: 50%;
          background: #22c55e; opacity: 0;
          animation: particleRise linear infinite;
        }
        .mic-btn.recording {
        animation: pulse 1s infinite;
        }

        @keyframes pulse {
        0% {
        transform: scale(1);
        }

        50% {
        transform: scale(1.15);
        }

        100% {
        transform: scale(1);
        }
        }


        .message-actions {
        margin-top: 8px;
        }

        .speak-btn {
        background: transparent;
        border: none;
        cursor: pointer;

        font-size: 16px;

        color: #9ca3af;
        }

        .speak-btn:hover {
        color: white;
        }
        /* ── APP SHELL ── */
        .app-shell { display: flex; height: 100vh; overflow: hidden; background: var(--bg-base); }

        /* ── SIDEBAR ── */
        .sidebar {
          width: var(--sidebar-width); min-width: var(--sidebar-width);
          background: var(--bg-surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: visible;
          transition: width 0.45s cubic-bezier(0.4,0,0.2,1), min-width 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s, box-shadow 0.3s;
          position: relative; z-index: 20;
        }
        .sidebar.closed { width: 70px; min-width: 70px; opacity: 1; pointer-events: auto; }
        .sidebar.closed .conv-section-label,.sidebar.closed .conv-list {border: none;}
        .sidebar.closed {cursor: pointer;}
        .sidebar.closed .sidebar-inner:hover::after {content: "➜";position: absolute;top: 50%;left: 25px;color: #22c55e;font-size: 16px;opacity: 0.8;animation: hintMove 1s infinite ease-in-out;}
         @keyframes hintMove {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
        .tooltip {position: relative;}
        .tooltip::after {content: attr(data-tooltip);position: absolute;left: calc(100% + 25px);top: 50%;transform: translateY(-50%);background: #202123;color: white;padding: 8px 12px;border-radius: 8px;font-size: 12px;font-weight: 500;white-space: nowrap;opacity: 0;visibility: hidden;transition: all 0.2s ease;z-index: 99999;pointer-events: none;}
        .tooltip:hover::after {opacity: 1;visibility: visible;}
        .menu-open.tooltip:hover::after {opacity: 0;visibility: hidden;}
        .tooltip-hidden::after {display: none !important;}

        
        
        .sidebar-inner { width: 100%; height: 100%; display: flex; flex-direction: column; padding: 20px 14px; overflow: visible; }
        .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 6px 8px 20px; border-bottom: none; margin-bottom: 16px; }
        .sidebar.closed .logo-icon {transform: translateX(-5px);}
        .sidebar.closed .new-chat-btn{width: 42px;height: 42px;padding: 0;justify-content: center;}
        .logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #16a34a, #22c55e);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px var(--accent-glow-strong); flex-shrink: 0;
          transition: box-shadow 0.3s, transform 0.3s;
        }
        .logout-btn {background: #dc2626;color: #e5e7eb;border: 1px solid #374151;border-radius: 8px;padding: 6px 10px;font-size: 12px;cursor: pointer;transition: all 0.2s ease; margin-left: 10px;margin-top:6px;}
        .toast-message{
        position: fixed;
        top: 70px;
        left: 80%;
        
        transform: translateX(-50%);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        max-width: min(90vw, 420px);
        width: max-content;
        text-align: center;
        background: #1a2035;
        color: white;
        padding: 8px 16px;
        font-size: 13px;
        line-height: 1.4;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.14);
        box-shadow: 0 6px 18px rgba(0,0,0,0.25);
        z-index: 999999;
        animation: toastIn 0.3s ease;
        white-space: normal;
        }


        @keyframes toastIn{
          from{
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }

          to{
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

         

        .logout-btn:hover{background:#2d3748;}         
        .logo-icon:hover { box-shadow: 0 0 32px rgba(34,197,94,0.4); transform: scale(1.05) rotate(-3deg); }
        .logo-text { font-size: 15px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px; white-space: nowrap;cursor: default;user-select:none; }
        .logo-badge { font-size: 9px; font-weight: 600; letter-spacing: 0.5px; color: var(--accent); background: var(--accent-glow); border: 1px solid rgba(34,197,94,0.2); border-radius: 4px; padding: 2px 5px; margin-left: auto; flex-shrink: 0; white-space: nowrap;cursor:default;user-select:non}
        .new-chat-btn {
          display: flex; align-items: center; gap: 10px; padding: 11px 14px;
          border-radius: var(--radius-md); background: linear-gradient(135deg, #16a34a, #22c55e);
          color: #fff; font-size: 13.5px; font-weight: 600; border: none; cursor: pointer;
          width: 100%; text-align: left;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 4px 16px var(--accent-glow-strong); white-space: nowrap; overflow: visible;
          margin-bottom: 20px; font-family: var(--font); position: relative;
        }
        .new-chat-btn:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 8px 28px rgba(34,197,94,0.4); }
        .new-chat-btn:active { transform: translateY(0) scale(0.98); }
        .conv-section-label { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); padding: 0 8px; margin-bottom: 8px; white-space: nowrap;cursor:default;user-select:none; }
        .conv-list { flex: 1; overflow-y: scroll; overflow-x: hidden; display: flex; flex-direction: column; gap: 2px;  }
        
        .logo-text,.logo-badge,.conv-section-label {cursor: default;user-select: none;}
        .conv-item {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px;
          border-radius: var(--radius-sm); cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s, transform 0.15s;
          position: relative; border: 1px solid transparent; white-space: nowrap; overflow: hidden;
          animation: sidebarItemIn 0.3s ease both;
        }
        .conv-item:hover { background: var(--bg-hover); border-color: var(--border); transform: translateX(2px); }
        .conv-item.active { background: var(--bg-active); border-color: rgba(34,197,94,0.2); }
        .conv-item.active .conv-icon { color: var(--accent); }
        .conv-icon { color: var(--text-muted); flex-shrink: 0; transition: color 0.2s; }
        .conv-title { font-size: 13px; color: var(--text-secondary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.2s; }
        .conv-item.active .conv-title { color: var(--text-primary); font-weight: 500; }
        .conv-item:hover .conv-title { color: var(--text-primary); }
        .conv-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.2s; flex-shrink: 0; }
        .conv-item:hover .conv-actions { opacity: 1; }
        .conv-action-btn { width: 24px; height: 24px; border-radius: 5px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .conv-action-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); transform: scale(1.1); }
        .conv-action-btn.delete-btn:hover { background: rgba(239,68,68,0.15); color: #ef4444; }
        .rename-input { flex: 1; background: var(--bg-base); border: 1px solid rgba(34,197,94,0.4); border-radius: 5px; color: var(--text-primary); font-size: 13px; font-family: var(--font); padding: 2px 7px; outline: none; min-width: 0; }
        .conv-active-indicator { width: 3px; height: 24px; background: var(--accent); border-radius: 2px; position: absolute; left: 0; top: 50%; transform: translateY(-50%); box-shadow: 0 0 8px var(--accent-glow-strong); }
        .sidebar-footer { padding-top: 16px; border-top: 1px solid var(--border); margin-top: 8px; }
        .sidebar.closed .sidebar-footer {border-top: none;}
        .sidebar-footer-text { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; padding: 4px 8px; white-space: nowrap; cursor:default;user-select:none;}

        /* ── MAIN AREA ── */
        .main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-base); position: relative; min-width: 0; }

        /* ── HEADER ── */
        .header {
          display: flex; align-items: center; gap: 14px; padding: 0 20px; height: 60px;
          border-bottom: 1px solid var(--border);
          background: rgba(10,10,15,0.85); backdrop-filter: blur(16px);
          position: relative; z-index: 99999; flex-shrink: 0;
        }
        .toggle-btn {
          width: 34px; height: 34px; border-radius: var(--radius-sm);
          border: 1px solid var(--border-strong); background: var(--bg-elevated);
          color: var(--text-secondary); cursor: pointer; display: flex; align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); flex-shrink: 0;position: relative;z-index: 99999;
        }
        .toggle-btn:hover { background: var(--bg-hover); color: var(--text-primary); transform: scale(1.08); }
        .toggle-btn:active { transform: scale(0.94); }
        .header-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.2px;cursor:default;user-select:none; }
        .header-title-icon { width: 28px; height: 28px; border-radius: 8px; background: var(--accent-glow); border: 1px solid rgba(34,197,94,0.2); display: flex; align-items: center; justify-content: center; color: var(--accent); transition: all 0.25s; }
        .header-title-icon:hover { background: rgba(34,197,94,0.22); transform: rotate(12deg); }
        .header-status { display: flex; align-items: center; gap: 6px; margin-left: auto; font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); animation: pulse 2.5s ease-in-out infinite; }

        /* ── EMPTY STATE ── */
        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          flex: 1; padding: 40px 24px; text-align: center;
          animation: msgFadeIn 0.5s cubic-bezier(0.34,1.2,0.64,1);
        }
        .es-icon {
          width: 64px; height: 64px; border-radius: 20px;
          background: linear-gradient(135deg, #16a34a, #22c55e);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 36px rgba(34,197,94,0.25); margin-bottom: 24px;
          animation: glowPulse 3s ease-in-out infinite;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .es-icon:hover { transform: scale(1.08) rotate(-4deg); }
        .es-title { font-size: 24px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; margin-bottom: 10px;cursor:default;user-select:none; }
        .es-sub { font-size: 14px; color: var(--text-muted); max-width: 420px; line-height: 1.7; margin-bottom: 28px;cursor:default;user-select:none; }
        .es-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .es-chip {
          padding: 8px 16px; border-radius: 99px; border: 1px solid var(--border-strong);
          background: var(--bg-elevated); color: var(--text-secondary); font-size: 12.5px;
          cursor: pointer; font-family: var(--font);
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        .es-chip:hover { border-color: rgba(34,197,94,0.35); color: var(--accent); background: var(--accent-glow); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(34,197,94,0.15); }
        .es-chip:active { transform: translateY(0) scale(0.97); }
        .es-chip.img { border-color: rgba(168,85,247,0.25); color: #a855f7; background: rgba(168,85,247,0.07); }
        .es-chip.img:hover { border-color: rgba(168,85,247,0.5); background: rgba(168,85,247,0.14); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(168,85,247,0.18); }

        /* ── CHAT ── */
        .chat-container { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 32px 20px 20px; position: relative; }
        .chat-inner { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }

        .msg-wrapper { display: flex; flex-direction: column; gap: 6px; }
        .msg-wrapper.bot-wrapper { animation: msgSlideInLeft 0.35s cubic-bezier(0.34,1.2,0.64,1); }
        .msg-wrapper.user-wrapper { animation: msgSlideInRight 0.35s cubic-bezier(0.34,1.2,0.64,1); }

        .msg-actions { display: flex; gap: 6px; opacity: 0; transition: opacity 0.18s ease; padding-left: 48px; flex-wrap: wrap; }
        .msg-wrapper.user-wrapper .msg-actions { padding-left: 0; padding-right: 48px; justify-content: flex-end; }
        .msg-wrapper:hover .msg-actions { opacity: 1; }

        .copy-btn { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-strong); background: var(--bg-elevated); color: var(--text-muted); font-size: 11.5px; font-family: var(--font); cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .copy-btn:hover { background: var(--bg-hover); color: var(--text-primary); transform: translateY(-1px); }
        .copy-btn.copied { color: var(--accent); border-color: rgba(34,197,94,0.3); background: var(--accent-glow); }
        .gen-btn { display: flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 6px; border: 1px solid rgba(34,197,94,0.3); background: var(--accent-glow); color: var(--accent); font-size: 11.5px; font-family: var(--font); cursor: pointer; transition: all 0.2s ease; white-space: nowrap; font-weight: 500; }
        .gen-btn:hover:not(:disabled) { background: rgba(34,197,94,0.2); border-color: rgba(34,197,94,0.5); transform: translateY(-1px); box-shadow: 0 3px 10px var(--accent-glow); }
        .gen-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .download-btn { display: flex; align-items: center; gap: 6px; padding: 5px 13px; border-radius: 8px; border: 1px solid rgba(34,197,94,0.4); background: linear-gradient(135deg, rgba(22,163,74,0.2), rgba(34,197,94,0.1)); color: #4ade80; font-size: 12px; font-family: var(--font); font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; white-space: nowrap; }
        .download-btn:hover { background: linear-gradient(135deg, rgba(22,163,74,0.3), rgba(34,197,94,0.2)); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(34,197,94,0.3); }
        .generated-file-bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(20,83,45,0.3); border: 1px solid rgba(34,197,94,0.25); border-radius: 10px; margin-top: 4px; margin-left: 48px; flex-wrap: wrap; animation: msgFadeIn 0.3s ease; }
        .gen-file-label { font-size: 12px; color: #86efac; font-family: var(--font); }
        /* ── GUEST LOGIN BANNER ── */
        .guest-banner-wrap { padding: 14px 20px 0; flex-shrink: 0; }
        .guest-banner {
          display: flex; align-items: center; gap: 14px;
          background: var(--bg-elevated); border: 1px solid rgba(34,197,94,0.25);
          border-radius: var(--radius-md); padding: 12px 16px;
          box-shadow: 0 4px 20px rgba(34,197,94,0.08);
          animation: msgFadeIn 0.4s cubic-bezier(0.34,1.2,0.64,1);
          max-width: 900px; margin: 0 auto; flex-wrap: wrap;
        }
        .guest-banner-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: var(--accent-glow); border: 1px solid rgba(34,197,94,0.25);
          display: flex; align-items: center; justify-content: center;
          color: var(--accent); flex-shrink: 0;
        }
        .guest-banner-text { font-size: 13px; color: var(--text-secondary); line-height: 1.5; flex: 1; min-width: 180px; }
        .guest-banner-text strong { color: var(--text-primary); font-weight: 600; }
        .guest-banner-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .guest-banner-close {
          width: 28px; height: 28px; border-radius: 7px;
          border: 1px solid var(--border-strong); background: transparent;
          color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s; flex-shrink: 0;
        }
        .guest-banner-close:hover { background: rgba(239,68,68,0.12); color: #ef4444; border-color: rgba(239,68,68,0.25); }

        /* ── GUEST LOGIN BANNER ── */
        .guest-banner-wrap { padding: 14px 20px 0; flex-shrink: 0; }
        .guest-banner {
          display: flex; align-items: center; gap: 14px;
          background: var(--bg-elevated); border: 1px solid rgba(34,197,94,0.25);
          border-radius: var(--radius-md); padding: 12px 16px;
          box-shadow: 0 4px 20px rgba(34,197,94,0.08);
          animation: msgFadeIn 0.4s cubic-bezier(0.34,1.2,0.64,1);
          max-width: 900px; margin: 0 auto; flex-wrap: wrap;
        }
        .guest-banner-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: var(--accent-glow); border: 1px solid rgba(34,197,94,0.25);
          display: flex; align-items: center; justify-content: center;
          color: var(--accent); flex-shrink: 0;
        }
        .guest-banner-text { font-size: 13px; color: var(--text-secondary); line-height: 1.5; flex: 1; min-width: 180px; }
        .guest-banner-text strong { color: var(--text-primary); font-weight: 600; }
        .guest-banner-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .guest-banner-close {
          width: 28px; height: 28px; border-radius: 7px;
          border: 1px solid var(--border-strong); background: transparent;
          color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s; flex-shrink: 0;
        }
        .guest-banner-close:hover { background: rgba(239,68,68,0.12); color: #ef4444; border-color: rgba(239,68,68,0.25); }

        /* ── AI IMAGE CARD ── */
        .ai-image-card {
          background: var(--bg-elevated); border: 1px solid rgba(168,85,247,0.25);
          border-radius: 18px; padding: 14px; max-width: 850px; overflow: hidden;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .ai-image-card:hover { border-color: rgba(168,85,247,0.4); box-shadow: 0 8px 32px rgba(168,85,247,0.1); }
        .ai-image-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .ai-image-badge { display: flex; align-items: center; gap: 5px; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.25); border-radius: 6px; padding: 3px 9px; font-size: 11px; color: #a855f7; font-weight: 600; letter-spacing: 0.3px; }
        .ai-image-prompt { font-size: 12px; color: var(--text-muted); margin-left: auto; font-style: italic; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ai-image-img-wrap {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        background: rgba(168,85,247,0.06);
        min-height: auto;
        
        width: 100%;
        }

        .ai-image-img {
       
        width: 100%;
        height: auto;       /* NEW */

        border-radius: 16px;
        display: block;
        border: 1px solid rgba(255,255,255,0.05);
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;

        transition: opacity 0.5s ease, transform 0.4s ease;
        pointer-events: auto;
        cursor: pointer;
        
        }
        .ai-image-img:hover { transform: scale(1.01); }
        .ai-image-loader { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-muted); font-size: 13px; background: rgba(168,85,247,0.04); pointer-events: none; }
        .ai-image-footer { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .ai-image-download { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); color: #c084fc; font-size: 12px; font-weight: 600; font-family: var(--font); text-decoration: none; transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .ai-image-download:hover { background: rgba(168,85,247,0.25); transform: translateY(-2px); box-shadow: 0 4px 14px rgba(168,85,247,0.25); }
        .ai-image-regen { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px; background: transparent; border: 1px solid var(--border-strong); color: var(--text-muted); font-size: 12px; font-family: var(--font); cursor: pointer; transition: all 0.2s; }
        .ai-image-regen:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); transform: translateY(-1px); }
        .ai-image-regen:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── MESSAGE BUBBLES ── */
        .msg-row { display: flex; gap: 14px; }
        .msg-row.user { justify-content: flex-end; }
        .msg-row.assistant, .msg-row.ai_image { justify-content: flex-start; }
        .avatar {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 2px;
          animation: avatarPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .avatar:hover { transform: scale(1.08); }
        .avatar.bot { background: linear-gradient(135deg, #16a34a, #22c55e); box-shadow: 0 0 14px var(--accent-glow); animation: avatarPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both, glowPulse 4s ease-in-out infinite; }
        .avatar.bot-img { background: linear-gradient(135deg, #7c3aed, #a855f7); box-shadow: 0 0 14px rgba(168,85,247,0.3); }
        .avatar.user-av { background: var(--bg-elevated); border: 1px solid var(--border-strong); }
        .msg-bubble { max-width: 680px; border-radius: var(--radius-lg); line-height: 1.75; font-size: 14.5px; color: var(--text-primary); }
        .msg-bubble.bot { background: transparent; padding: 2px 0; white-space: pre-wrap; }
        .msg-bubble.user-bubble {
          background: var(--bg-elevated); border: 1px solid var(--border-strong);
          padding: 12px 18px; border-radius: var(--radius-lg); font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .msg-bubble.user-bubble:hover { border-color: rgba(255,255,255,0.15); box-shadow: 0 2px 16px rgba(0,0,0,0.3); }

        /* ── EDIT ── */
        .edit-container { display: flex; flex-direction: column; gap: 8px; max-width: 580px; width: 100%; animation: msgFadeIn 0.25s ease; }
        .edit-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .inline-edit-box { background: var(--bg-base); border: 1px solid rgba(34,197,94,0.4); border-radius: var(--radius-lg); color: var(--text-primary); font-size: 14px; font-family: var(--font); padding: 10px 16px; outline: none; resize: none; width: 100%; min-height: 44px; max-height: 160px; line-height: 1.6; box-shadow: 0 0 0 3px rgba(34,197,94,0.1); transition: box-shadow 0.2s; }
        .inline-edit-box:focus { box-shadow: 0 0 0 4px rgba(34,197,94,0.15); }
        .edit-cancel-btn { display: flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--bg-elevated); color: var(--text-secondary); font-size: 12.5px; font-family: var(--font); cursor: pointer; transition: all 0.2s ease; }
        .edit-cancel-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .edit-send-btn { display: flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 8px; border: none; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; font-size: 12.5px; font-weight: 600; font-family: var(--font); cursor: pointer; transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 2px 10px var(--accent-glow-strong); }
        .edit-send-btn:hover { transform: translateY(-1px) scale(1.02); box-shadow: 0 4px 18px rgba(34,197,94,0.35); }

        /* ── THINKING ── */
        .thinking-row { display: flex; gap: 14px; align-items: flex-start; animation: thinkingSlide 0.3s ease; }
        .thinking-pill { display: flex; align-items: center; gap: 12px; background: var(--bg-elevated); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 10px 16px; position: relative; overflow: hidden; }
        .thinking-pill::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.05) 50%, transparent 100%); background-size: 200% 100%; animation: shimmer 2s linear infinite; }
        .thinking-pill.image-thinking { border-color: rgba(168,85,247,0.3); background: rgba(168,85,247,0.08); }
        .thinking-pill.image-thinking::after { background: linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.06) 50%, transparent 100%); background-size: 200% 100%; animation: shimmer 2s linear infinite; }
        .thinking-dots { display: flex; gap: 4px; align-items: center; }
        .thinking-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s ease infinite; }
        .thinking-pill.image-thinking .thinking-dot { background: #a855f7; }
        .thinking-dot:nth-child(2) { animation-delay: 0.18s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.36s; }
        .thinking-label { font-size: 12.5px; color: var(--accent); font-weight: 500; font-family: var(--font-mono); animation: thinkingSlide 0.3s ease; }
        .thinking-pill.image-thinking .thinking-label { color: #a855f7; }

        /* ── SCROLL BTN ── */
        .scroll-btn {
          position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%);
          background: var(--bg-elevated); border: 1px solid var(--border-strong);
          color: var(--text-secondary); border-radius: 99px; padding: 8px 16px;
          font-size: 12.5px; display: flex; align-items: center; gap: 6px;
          cursor: pointer; z-index: 10; backdrop-filter: blur(8px); font-family: var(--font);
          transition: all 0.2s; animation: scrollBtnBounce 2s ease-in-out infinite;
        }
        .scroll-btn:hover { background: var(--bg-hover); color: var(--text-primary); animation: none; transform: translateX(-50%) translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }

        /* ── INPUT AREA ── */
        .input-area { border-top: 1px solid var(--border); background: var(--bg-surface); padding: 14px 20px 18px; flex-shrink: 0; }
        .input-inner { max-width: 760px; margin: 0 auto; }
        .input-box {
          display: flex; align-items: flex-end; gap: 10px;
          background: var(--bg-elevated); border: 1px solid var(--border-strong);
          border-radius: var(--radius-xl); padding: 12px 14px;
          transition: border-color 0.25s, box-shadow 0.25s, transform 0.15s;
        }
        .input-box:focus-within {
          border-color: rgba(34,197,94,0.4);
          box-shadow: 0 0 0 4px rgba(34,197,94,0.09), 0 4px 24px rgba(0,0,0,0.3);
          transform: translateY(-1px);
        }
        .input-textarea {
          flex: 1; background: transparent; border: none; outline: none;
          color: var(--text-primary); font-size: 14.5px; line-height: 1.6;
          resize: none; min-height: 26px; max-height: 160px;
          font-family: var(--font); padding: 4px 2px;
        }
        .input-textarea::placeholder { color: var(--text-muted); }
        .voice-status{color:#22c55e;font-size:12px;}
        .voice-recording-box {
        
        width: 100%;
        width: calc(100% - 60px);

        
        

        display: flex;
        align-items: center;
        
        gap: 16px;

        padding: 0;
        }


        .voice-cancel,
        .voice-confirm {
        width: 36px;
        height: 36px;
        transform: translateY(3px);

        display: flex;
        align-items: center;
        justify-content: center;

        background: transparent;
        border: none;

        color: white;
        font-size: 22px;
        line-height: 1;
        cursor: pointer;

        flex-shrink: 0;
        }
        .voice-wave {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap:1px;

        flex: 1;
        min-width: 0;
        
        height: 50px;
        overflow: hidden;
        
        } 

        .attach-btn{
        width:38px;
        height:38px;

        border:none;
        border-radius:50%;

        background:#202123;
        color:#e5e7eb;

        cursor:pointer;

        display:flex;
        align-items:center;
        justify-content:center;

        font-size:24px;
        font-weight:300;

        transition:all 0.2s ease;

        border:1px solid rgba(255,255,255,0.08);
        }

        .attach-btn:hover{
        background:#2b2d31;
        color:white;

        transform:scale(1.05);
        }

        .attach-menu{
        position:absolute;

        left:0;
        bottom:58px;

        width:220px;

        background:#202123;

        border:1px solid rgba(255,255,255,0.08);

        border-radius:16px;

        padding:8px;

        display:flex;
        flex-direction:column;

        gap:4px;

        box-shadow:0 12px 40px rgba(0,0,0,0.45);

        animation:menuFadeIn .2s ease;
        }

        .attach-item{
        display:flex;
        align-items:center;

        gap:10px;

        padding:12px;

        border:none;

        background:transparent;

        color:white;

        font-size:15px;

        border-radius:10px;

        cursor:pointer;
        }

        .attach-item:hover{
          background:#2a2b32;
        }

        

        .voice-wave span {
        width: 2px;
        
        background: #bfbfbf;
        border-radius: 999px;
        
        transition: height 0.05s linear;
        }

        
        

        

        /* ── SEND BUTTON ── */
        .send-btn {
          width: 38px; height: 38px; border-radius: 11px;
          background: linear-gradient(135deg, #16a34a, #22c55e);
          border: none; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); flex-shrink: 0;
          box-shadow: 0 2px 12px var(--accent-glow-strong);
          position: relative; overflow: hidden;
        }
        .send-btn::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit;
          background: rgba(255,255,255,0.15); opacity: 0;
          transition: opacity 0.2s;
        }
        .send-btn:hover:not(:disabled) { transform: scale(1.1) rotate(-8deg); box-shadow: 0 6px 22px rgba(34,197,94,0.45); }
        .send-btn:hover:not(:disabled)::before { opacity: 1; }
        .send-btn:active:not(:disabled) { animation: sendPop 0.3s ease; }
        .send-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

        .input-footer { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 10px; font-size: 11px; color: var(--text-muted); cursor:default;user-select:none;}

        .mobile-close-btn {
          display: none; margin-left: auto;
          width: 28px; height: 28px; border-radius: 7px;
          border: 1px solid var(--border-strong); background: transparent;
          color: var(--text-muted); cursor: pointer;
          align-items: center; justify-content: center; flex-shrink: 0;
          transition: background 0.18s, color 0.18s, transform 0.18s;
        }
        .mobile-close-btn:hover { background: rgba(239,68,68,0.12); color: #ef4444; transform: scale(1.08); border-color: rgba(239,68,68,0.25); }
        

        @media (max-width: 768px) {
        .sidebar {
        position: fixed;
        top: 0;
        left: 0;

        width: 75vw;
        max-width: 320px;

        height: 100dvh;

        z-index: 10000;

        transform: translateX(-100%);
        transition: transform 0.3s ease;

        box-shadow: 20px 0 50px rgba(0,0,0,0.6);
        }
        .header {
        z-index: 1;
        }

        .sidebar:not(.closed) {
        transform: translateX(0);
        }
        

        .sidebar:not(.closed) {
          transform: translateX(0);
        }

        .sidebar.closed {
          width: 280px;
          min-width: 280px;
          transform: translateX(-100%);
        }

        .mobile-close-btn {
          display: flex;
        }

        .logo-badge {
          display: none;
        }

        .es-title {
          font-size: 20px;
        }

        .es-chips {
          display: none;
        }
        .mobile-overlay {
        position: fixed;
        inset: 0;

        background: rgba(0,0,0,0.45);

        z-index: 9998;
        }
        .mobile-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 9998;
        }

        /* PASTE HERE */
        .sidebar-inner {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        }
        .conv-list {
        flex: 1;
        overflow-y: auto;
        }
        .toast-message {
        top: 70px;
        left: 50% !important;
        transform: translateX(-50%) !important;
        max-width: 92vw;
        width: max-content;
        white-space: nowrap;
        font-size: 10.5px;
        padding: 6px 12px;
        border-radius: 8px;
        line-height: 1.3;
        }
        .attach-menu{
        width: 170px;
        padding: 6px;
        border-radius: 12px;
        }

        .attach-item{
        padding: 10px 12px;
        font-size: 15px;
        border-radius: 8px;
        }
        

      }


        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* INTRO OVERLAY */}
      {introVisible && (
        <>
          <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 9998 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="intro-particle" style={{
                left: `${Math.random() * 100}%`, bottom: "-8px",
                width: `${1 + Math.random() * 3}px`, height: `${1 + Math.random() * 3}px`,
                animationDuration: `${7 + Math.random() * 9}s`, animationDelay: `${Math.random() * 7}s`,
              }} />
            ))}
          </div>
          <div className={`intro-overlay${introFading ? " fading" : ""}`}>
            <div className="intro-logo-wrap"><Scale size={32} color="#fff" /></div>
            <div className="intro-title">
              <span>{typedText}</span>
              <span className={`intro-cursor${introFading ? " hidden" : ""}`} />
            </div>
            <div className={`intro-subtitle${showSubtitle ? " show" : ""}`}>
              AI-powered legal guidance for land disputes & property rights
            </div>
            <div className={`intro-badge${showBadge ? " show" : ""}`}>
              ✦ &nbsp;Secure · Private · Expert Legal AI
            </div>
          </div>
        </>
      )}

      <div className="app-shell">

        {sidebarOpen && isMobile && (
          <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* SIDEBAR */}
        <aside
          className={`sidebar${sidebarOpen ? "" : " closed"}`}
        >
          <div
            className="sidebar-inner"
            onClick={() => {
              if (!sidebarOpen) {
                setSidebarOpen(true);
              }
            }}
          >
            <div className="sidebar-logo">
              <div className="logo-icon"><Scale size={18} color="#fff" /></div>
              {sidebarOpen && (
                <span className="logo-text">
                  LandResolve
                </span>
              )}
              {sidebarOpen && (
                <span className="logo-badge">
                  AI
                </span>
              )}
              <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <button
              className={`new-chat-btn ${!sidebarOpen ? "tooltip" : ""}`}
              data-tooltip="New Chat"
              onClick={handleNewChat}
            >
              <Plus size={16} />
              {sidebarOpen && " New Chat"}
            </button>
            {sidebarOpen && conversations.length > 0 && (
              <p className="conv-section-label">
                Recent chats
              </p>
            )}
            {sidebarOpen && (
              <div className="conv-list">
                {conversations.map((chat, idx) => (
                  <div
                    key={chat.id}
                    className={`conv-item${currentConversationId === chat.id ? " active" : ""}`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    onClick={() => loadConversation(chat.id)}
                    onMouseEnter={() => setHoveredConv(chat.id)}
                    onMouseLeave={() => setHoveredConv(null)}
                  >
                    {currentConversationId === chat.id && <div className="conv-active-indicator" />}
                    <MessageSquare className="conv-icon" size={14} />
                    {renamingId === chat.id ? (
                      <input
                        className="rename-input"
                        value={renameValue}
                        autoFocus
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitRename(chat.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={() => submitRename(chat.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        {sidebarOpen && (
                          <span className="conv-title">
                            {chat.title}
                          </span>
                        )}
                      </>
                    )}
                    {hoveredConv === chat.id && renamingId !== chat.id && (
                      <div className="conv-actions">
                        <button className="conv-action-btn" onClick={(e) => startRename(e, chat.id, chat.title)}><Pencil size={12} /></button>
                        <button className="conv-action-btn delete-btn" onClick={(e) => handleDeleteConversation(e, chat.id)}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
                {conversations.length === 0 && (
                  <div style={{ padding: "20px 8px", textAlign: "center" }}>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>No conversations yet.<br />Start a new chat!</p>
                  </div>
                )}
              </div>
            )}

            <div className="sidebar-footer">
              {sidebarOpen && (
                <div className="sidebar-footer-text">
                  <ShieldCheck size={13} color="var(--accent)" />
                  Secure · Private · Legal AI
                </div>
              )}

            </div>

            <div
              className={!sidebarOpen && !showMenu ? "tooltip" : ""}
              data-tooltip={user?.name}
              onClick={(e) => {
                e.stopPropagation();

                setShowMenu(true);

                setTimeout(() => {
                  setShowMenu(false);
                }, 4000);
              }}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "white",
                fontWeight: 600,
                fontSize: "10px",
                cursor: "pointer",

                marginTop: "auto",
                paddingLeft: sidebarOpen ? "0px" : "8px",

              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: "#1a1f2e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {!userLoaded ? (
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTop: "2px solid white",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                ) : user ? (
                  <img
                    src={user.picture}
                    alt="profile"
                    //className={!sidebarOpen && !showMenu ? "tooltip" : ""}
                    //data-tooltip={user?.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <User size={16} />
                )}
              </div>

              {sidebarOpen && (
                <span>
                  {!userLoaded ? (
                    ""
                  ) : user ? (
                    user.name.split(" ")[0]
                  ) : (
                    "Guest"
                  )}
                </span>
              )}
              {showMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "-5px",
                    left: sidebarOpen ? "100px" : "65px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0",
                    zIndex: 9999,

                    animation: "menuFadeIn 0.25s ease",
                    transformOrigin: "top right",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                  }}
                >

                  {!user ? (
                    <div style={{
                      transform: "scale(0.7)",
                      transformOrigin: "left center",
                      width: "180px",
                    }}
                    >
                      <GoogleLoginButton setUser={setUser} setShowWelcomeModal={setWelcomeModalName} />
                    </div>
                  ) : (
                    <>


                      <button
                        className="logout-btn"
                        onClick={() => {
                          localStorage.removeItem(
                            "landresolve_user"
                          );

                          setUser(null);

                          setConversations([]);

                          setMessages([]);

                          setCurrentConversationId(null);

                          setShowMenu(false);

                          setToast("👋 Logged out successfully");

                          setTimeout(() => {
                            setToast("");
                          }, 2500);
                          if (typeof window !== "undefined" && (window as any).AndroidBridge?.logout) {
                            (window as any).AndroidBridge.logout();
                          }
                        }}
                      >
                        Logout
                      </button>
                    </>
                  )}



                </div>
              )}
            </div>



          </div>
        </aside>

        {/* MAIN AREA */}
        <section className="main-area">
          <header className="header">
            <button
              className="toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen((v) => !v);
              }}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
            <div className="header-title">
              <div className="header-title-icon"><ShieldCheck size={15} /></div>
              AI Legal Land Assistant
            </div>



          </header>

          {showGuestBanner && !user && (
            <div className="guest-banner-wrap">
              <div className="guest-banner">
                <div className="guest-banner-icon"><Sparkles size={16} /></div>
                <div className="guest-banner-text">
                  You're chatting as a <strong>guest</strong> — sign in to save this conversation and access it anytime.
                </div>
                <div className="guest-banner-actions">
                  <div style={{ transform: "scale(0.82)", transformOrigin: "center" }}>
                    <GoogleLoginButton setUser={setUser} setShowWelcomeModal={setWelcomeModalName} />
                  </div>
                  <button className="guest-banner-close" onClick={() => setShowGuestBanner(false)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}



          {!currentConversationId ? (
            <div className="empty-state">
              <div className="es-icon"><Scale size={28} color="#fff" /></div>
              <div className="es-title"> AI Legal Land Assistant</div>
              <div className="es-sub">
                Describe your land dispute, property issue, or legal concern in simple language and receive AI-powered guidance.
              </div>



              <div className="es-chips">
                {[
                  "Land Disputes",
                  "What is Intkal",
                  "image of jamabandi"
                ].map((s) => (
                  <button
                    key={s}
                    className="es-chip"
                    onClick={() => setInput(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-container" ref={chatContainerRef} onScroll={handleScroll}>
              <div className="chat-inner">
                {messages.map((msg, index) => {

                  if (msg.role === "pdf") {
                    return (
                      <div key={index} className="msg-wrapper user-wrapper">
                        <div className="msg-row user">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              padding: "14px",
                              borderRadius: "16px",
                              background: "#111827",
                              border: "1px solid #22c55e40",
                              minWidth: "320px",
                              boxShadow: "0 0 15px rgba(34,197,94,0.15)",
                            }}
                          >
                            <div
                              style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "10px",
                                background: "#22c55e",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "20px",
                              }}
                            >
                              📄
                            </div>

                            <div>
                              <div
                                style={{
                                  color: "#fff",
                                  fontWeight: 600,
                                  fontSize: "14px",
                                }}
                              >
                                {msg.content}
                              </div>

                              <div
                                style={{
                                  color: "#94a3b8",
                                  fontSize: "12px",
                                  marginTop: "3px",
                                }}
                              >
                                PDF Document
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* ─── AI IMAGE MESSAGE ─── */
                  /* ─── AI IMAGE MESSAGE ─── */
                  if (msg.role === "ai_image") {
                    const parsed = (() => {
                      try {
                        return JSON.parse(msg.content);
                      } catch {
                        return null;
                      }
                    })();

                    if (!parsed) return null;

                    // 📄 Educational document image
                    if (parsed.type === "document_image") {
                      return (
                        <div key={index} className="msg-wrapper bot-wrapper">
                          <div className="msg-row assistant">
                            <div className="avatar bot">
                              <Bot size={17} color="#fff" />
                            </div>

                            <div className="msg-bubble bot">

                              {parsed.text && (
                                <div style={{ marginBottom: "12px", whiteSpace: "pre-wrap" }}>
                                  {parsed.text}
                                </div>
                              )}

                              <img
                                src={`https://landresolveai.onrender.com${parsed.url}`}
                                alt="Educational Document"
                                style={{
                                  width: "100%",
                                  maxWidth: "650px",
                                  borderRadius: "12px",
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  setPreviewImage(`https://landresolveai.onrender.com${parsed.url}`)
                                }
                              />

                            </div>
                          </div>
                        </div>
                      );
                    }

                    // 🎨 Normal AI image
                    return (
                      <div key={index} className="msg-wrapper bot-wrapper">
                        <div className="msg-row ai_image">
                          <div className="avatar bot-img">
                            <Wand2 size={17} color="#fff" />
                          </div>

                          <div className="ai-image-card">
                            <div className="ai-image-header">
                              <div className="ai-image-badge">
                                <Wand2 size={10} /> AI Generated
                              </div>
                              <span className="ai-image-prompt">{parsed.prompt}</span>
                            </div>

                            <AIImage
                              url={
                                parsed.url.startsWith("http")
                                  ? parsed.url
                                  : `https://landresolveai.onrender.com${parsed.url}`
                              }
                              prompt={parsed.prompt}
                              onPreview={setPreviewImage}
                            />

                            <div className="ai-image-footer">
                              <button
                                className="ai-image-download"
                                onClick={() =>
                                  handleDownload(
                                    parsed.url.startsWith("http")
                                      ? parsed.url
                                      : `https://landresolveai.onrender.com${parsed.url}`
                                  )
                                }
                              >
                                <Download size={13} /> Download
                              </button>

                              {downloadedUrl === parsed.url && (
                                <span
                                  style={{
                                    color: "#22c55e",
                                    fontSize: "12px",
                                    marginLeft: "10px",
                                  }}
                                >
                                  ✅ Downloaded Successfully
                                </span>
                              )}

                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text-muted)",
                                  marginLeft: "auto",
                                }}
                              >
                                Pollinations.ai · Flux model
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* ─── NORMAL MESSAGE ─── */
                  return (
                    <div
                      key={index}
                      className={`msg-wrapper${msg.role === "user" ? " user-wrapper" : " bot-wrapper"}`}
                      onMouseEnter={() => setHoveredMsgIndex(index)}
                      onMouseLeave={() => setHoveredMsgIndex(null)}
                    >
                      <div className={`msg-row ${msg.role}`}>



                        {msg.role === "assistant" && (
                          <>
                            <div className="avatar bot">
                              <Bot size={17} color="#fff" />
                            </div>

                            <div
                              className="msg-bubble bot"
                              style={{
                                color: index === 0 ? "var(--text-muted)" : "var(--text-primary)",
                                fontSize: index === 0 ? "13.5px" : undefined
                              }}
                            >
                              {msg.content}

                              <div className="message-actions">
                                <button
                                  className="speak-btn"
                                  onClick={() => speakText(msg.content)}
                                >
                                  <Volume2 size={16} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}




                        {msg.role === "user" && (
                          <>
                            {editingMsgIndex === index ? (
                              <div className="edit-container">
                                <textarea
                                  className="inline-edit-box"
                                  value={editMsgValue}
                                  autoFocus
                                  rows={3}
                                  onChange={(e) => setEditMsgValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEditMessage(); }
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                />
                                <div className="edit-actions">
                                  <button className="edit-cancel-btn" onClick={cancelEdit}>Cancel</button>
                                  <button className="edit-send-btn" onClick={submitEditMessage}><Send size={12} /> Send</button>
                                </div>
                              </div>
                            ) : (
                              <div className="msg-bubble user-bubble">{msg.content}</div>
                            )}
                            <div className="avatar user-av"><User size={15} color="var(--text-secondary)" /></div>
                          </>
                        )}
                      </div>



                      {editingMsgIndex !== index && (
                        <div className="msg-actions" style={{ opacity: hoveredMsgIndex === index ? 1 : 0 }}>
                          {msg.role === "user" && (
                            <button className="copy-btn" onClick={() => startEditMessage(index, msg.content)}>
                              <Pencil size={12} /> Edit
                            </button>
                          )}

                          <button className={`copy-btn${copiedIndex === index ? " copied" : ""}`} onClick={() => handleCopy(msg.content, index)}>
                            {copiedIndex === index ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {showThinking && (
                  <div className="thinking-row">
                    <div className={`avatar ${isAIImageThinking ? "bot-img" : "bot"}`}>
                      {isAIImageThinking ? <Wand2 size={17} color="#fff" /> : <Bot size={17} color="#fff" />}
                    </div>
                    <div className={`thinking-pill${isAIImageThinking ? " image-thinking" : ""}`}>
                      <div className="thinking-dots">
                        <div className="thinking-dot" /><div className="thinking-dot" /><div className="thinking-dot" />
                      </div>
                      <span className="thinking-label" key={thinkingStep}>{currentThinkingSteps[thinkingStep]}</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}

          {showScrollBtn && (
            <button className="scroll-btn" onClick={scrollToBottom}>
              <ArrowDown size={14} /> Scroll to latest
            </button>
          )}

          {/* INPUT BAR — mic and upload buttons removed */}
          <div className="input-area">
            <div className="input-inner">

              {uploadedFileName && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px",
                    marginBottom: "10px",
                    borderRadius: "16px",
                    background: "#111827",
                    border: "1px solid #22c55e40",
                    boxShadow: "0 0 15px rgba(34,197,94,0.15)",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "10px",
                      background: "#22c55e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    📄
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {uploadedFileName}
                    </div>


                    <div
                      style={{
                        color: isExtractingPdf ? "#facc15" : "#94a3b8",
                        fontSize: "12px",
                        marginTop: "3px",
                      }}
                    >
                      {isExtractingPdf ? "⏳ Reading PDF, please wait..." : "PDF Document"}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUploadedFileName("");
                      setUploadedPdfText("");
                    }}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}






              <div className="input-box">


                {isListening ? (
                  <div className="voice-recording-box">

                    <button
                      className="voice-cancel"
                      onClick={stopRecording}
                    >
                      ✕
                    </button>

                    <div className="voice-wave">
                      {Array.from({ length: 250 }).map((_, i) => {
                        const level =
                          audioLevels[Math.floor(i * audioLevels.length / 250)] || 10;

                        return (
                          <span
                            key={i}
                            style={{
                              height: `${level}px`,
                            }}
                          />
                        );
                      })}
                    </div>

                    <button
                      className="voice-confirm"
                      onClick={acceptRecording}
                    >
                      ✓
                    </button>

                  </div>


                ) : (
                  <>

                    <div
                      ref={attachMenuRef}
                      style={{ position: "relative" }}
                    >

                      <button
                        type="button"
                        className="attach-btn"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                      >
                        +
                      </button>

                      {showAttachMenu && (
                        <div className="attach-menu">

                          <button
                            className="attach-item"
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowAttachMenu(false);
                            }}
                          >
                            📄 Upload PDF
                          </button>

                          <button
                            className="attach-item"
                            onClick={() => {
                              startListening();
                              setShowAttachMenu(false);
                            }}
                          >
                            🎤 Voice Input
                          </button>

                        </div>
                      )}

                    </div>

                    <textarea
                      ref={textareaRef}
                      className="input-textarea"
                      placeholder={
                        isLoading
                          ? "AI is working..."
                          : "Describe your land dispute..."
                      }
                      value={input}
                      disabled={isLoading}
                      rows={1}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !isLoading
                        ) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />

                  </>
                )}

                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim() || isExtractingPdf}
                >
                  <Send size={18} />
                </button>

              </div>


              <div className="input-footer">
                <Sparkles size={10} />
                LandResolve AI · Legal guidance + AI image generation · Not a substitute for professional advice
              </div>
            </div>
          </div>


        </section>
      </div>
      {toast && !(sidebarOpen && isMobile) && (
        <div
          className="toast-message"
          style={{ left: `calc(50% + ${sidebarOpen ? 140 : 35}px)` }}
        >
          {toast}
        </div>
      )}

      {previewImage && (


        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999999,
          }}
        >

          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              fontSize: "32px",
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
          <img
            src={previewImage}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "95vw",
              maxHeight: "95vh",
              borderRadius: "12px",
            }}
          />
        </div>
      )}
      {welcomeModalName && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#16161f",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "20px",
              padding: "36px 28px",
              maxWidth: "380px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(34,197,94,0.15)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #16a34a, #22c55e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: "32px",
              }}
            >
              ✅
            </div>
            <h2
              style={{
                color: "#f0f0f5",
                fontSize: "20px",
                fontWeight: 700,
                marginBottom: "10px",
              }}
            >
              Account Created Successfully
            </h2>
            <p
              style={{
                color: "#8b8b9e",
                fontSize: "14px",
                lineHeight: 1.6,
                marginBottom: "26px",
              }}
            >
              Welcome, <strong style={{ color: "#4ade80" }}>{welcomeModalName}</strong>!
              Your LandResolve AI account has been created. Tap OK, then sign in
              again to continue.
            </p>
            <button
              onClick={() => setWelcomeModalName(null)}
              style={{
                background: "linear-gradient(135deg, #16a34a, #22c55e)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "12px 40px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </>
  );
}






