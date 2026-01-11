
import React, { useState, useEffect, useRef } from 'react';
import { AppView, SongAnalysis, AspectRatio, VisualStyle, Storyboard, StoryboardScene } from './types';
import { analyzeSong, generateImage, generateStoryboardPlan, generateMoreStyles } from './geminiService';
import Header from './PageHeader';
import LoadingOverlay from './LoadingOverlay';
  ;import JSZip from 'jszip';

// Componente Button estrictamente Material Design 3 (Google)
const Button: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'tonal' | 'text';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ onClick, children, variant = 'primary', className = '', disabled, type = 'button' }) => {
  const base = "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 tracking-tight select-none active:scale-95 border-none outline-none ring-offset-2 focus:ring-2 focus:ring-[#1a73e8]/30";
  const variants = {
    primary: "bg-[#1a73e8] hover:bg-[#185abc] text-white shadow-sm hover:shadow-md",
    tonal: "bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1967d2]",
    secondary: "bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043]",
    outline: "border border-[#dadce0] hover:bg-[#f8f9fa] text-[#1a73e8] bg-white",
    text: "text-[#1a73e8] hover:bg-[#f1f3f4]"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.AUTH);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [extraPrompt, setExtraPrompt] = useState('');
  const [refImage, setRefImage] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<AspectRatio>(AspectRatio.HORIZONTAL);

  const [analysis, setAnalysis] = useState<SongAnalysis | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [youtubeThumbnail, setYoutubeThumbnail] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (apiKey) {
      setView(AppView.INPUT);
    } else {
      setView(AppView.AUTH);
    }
  }, []);
  
    const handleOpenKey = () => {
    setShowApiKeyModal(true);
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      setShowApiKeyModal(false);
      setApiKeyInput('');
      setView(AppView.INPUT);
    }
  };const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => setDuration(audio.duration);
    }
  };

  const startAnalysis = async () => {
    if (!title || !lyrics) return;
    setLoading("Analizando canción y estructurando la narrativa...");
    try {
      const result = await analyzeSong(title, lyrics);
      const stylesWithImages: VisualStyle[] = [];
      for (const style of result.suggestedStyles) {
        setLoading(`Generando estilo: ${style.name}...`);
        const imageUrl = await generateImage(style.imagePrompt, "1:1");
        stylesWithImages.push({ ...style, imageUrl });
      }
      setAnalysis({ ...result, suggestedStyles: stylesWithImages });
      setSelectedStyleId(stylesWithImages[0].id);
    } catch (e: any) { 
      if (e?.message?.includes("entity was not found")) {
        setView(AppView.AUTH);
      }
      alert("Error de análisis. Por favor revisa tu API Key o conexión."); 
    }
    finally { setLoading(null); }
  };

  const handleGenerateMoreStyles = async () => {
    if (!analysis) return;
    setLoading("Explorando nuevas direcciones de arte...");
    try {
      const existingNames = analysis.suggestedStyles.map(s => s.name);
      const newStyles = await generateMoreStyles(title, lyrics, existingNames);
      const stylesWithImages: VisualStyle[] = [];
      for (const style of newStyles) {
        setLoading(`Materializando estilo: ${style.name}...`);
        const imageUrl = await generateImage(style.imagePrompt, "1:1");
        stylesWithImages.push({ ...style, imageUrl });
      }
      setAnalysis({
        ...analysis,
        suggestedStyles: [...analysis.suggestedStyles, ...stylesWithImages]
      });
    } catch (e) {
      alert("No se pudieron generar más estilos en este momento.");
    } finally {
      setLoading(null);
    }
  };

  const createStoryboard = async () => {
    if (!analysis || !selectedStyleId) return;
    const style = analysis.suggestedStyles.find(s => s.id === selectedStyleId)!;
    setLoading("Creando guión cinematográfico variado...");
    try {
      const plan = await generateStoryboardPlan(title, lyrics, duration, style, analysis, extraPrompt);
      const scenesWithImages: StoryboardScene[] = [];
      for (let i = 0; i < plan.length; i++) {
        setLoading(`Generando toma cinematográfica ${i + 1} de ${plan.length}...`);
        const scene = plan[i];
        const fullPrompt = `${analysis.visualConsistencyGuide}. Protagonista: ${analysis.characterDesign}. Estilo artístico: ${style.imagePrompt}. Escena actual: ${scene.visualPrompt}`;
        const imageUrl = await generateImage(fullPrompt, orientation);
        scenesWithImages.push({ ...scene, imageUrl });
        await new Promise(r => setTimeout(r, 100));
      }
      
      setLoading("Diseñando miniatura para YouTube...");
      const thumbPrompt = `Cinematic professional music video thumbnail for "${title}". High resolution, emotional atmosphere, ${analysis.visualConsistencyGuide}. Protagonista: ${analysis.characterDesign}. ${style.imagePrompt}. Space for typography.`;
      const thumbUrl = await generateImage(thumbPrompt, "16:9");
      setYoutubeThumbnail(thumbUrl);

      setStoryboard({ scenes: scenesWithImages, style, orientation });
      setView(AppView.STORYBOARD);
    } catch (e) { alert("Error al generar el storyboard."); }
    finally { setLoading(null); }
  };

  const regenerateShot = async (index: number) => {
    if (!storyboard || !analysis) return;
    const scene = storyboard.scenes[index];
    const style = storyboard.style;
    setLoading(`Regenerando toma ${index + 1} con nueva perspectiva...`);
    try {
      const fullPrompt = `${analysis.visualConsistencyGuide}. Protagonista: ${analysis.characterDesign}. Estilo artístico: ${style.imagePrompt}. Escena actual: ${scene.visualPrompt}. [Different angle]`;
      const imageUrl = await generateImage(fullPrompt, storyboard.orientation);
      const newScenes = [...storyboard.scenes];
      newScenes[index] = { ...scene, imageUrl };
      setStoryboard({ ...storyboard, scenes: newScenes });
    } catch (e) { alert("Error al regenerar la toma."); }
    finally { setLoading(null); }
  };

  const downloadAsZip = async () => {
    if (!storyboard) return;
    setLoading("Compilando pack de producción...");
    const zip = new JSZip();
    const folder = zip.folder(`${title.replace(/\s+/g, '_')}_storyboard`);
    
    for (let i = 0; i < storyboard.scenes.length; i++) {
      const scene = storyboard.scenes[i];
      if (scene.imageUrl) {
        const base64Data = scene.imageUrl.split(',')[1];
        folder?.file(`toma_${i + 1}_${scene.timestamp.replace(':', '-')}.png`, base64Data, { base64: true });
      }
    }
    
    if (youtubeThumbnail) {
      folder?.file("miniatura_youtube.png", youtubeThumbnail.split(',')[1], { base64: true });
    }
    
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${title.replace(/\s+/g, '_')}_storyboard.zip`;
    link.click();
    setLoading(null);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
      };

  return (
    <div className="min-h-screen bg-[#F8F9FA] selection:bg-[#1a73e8]/20">
      <Header />
      {loading && <LoadingOverlay message={loading} />}

      <main className="max-w-6xl mx-auto px-6 py-10 page-transition">
        {view === AppView.AUTH ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] shadow-sm border border-[#dadce0] space-y-12">
            <div className="w-20 h-20 bg-[#e8f0fe] rounded-[24px] flex items-center justify-center text-[#1a73e8] shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="text-center space-y-3 px-8 max-w-lg">
              <h2 className="text-3xl font-semibold text-[#202124] tracking-tight">Acceso HEY labs</h2>
              <p className="text-[#5f6368] text-base leading-relaxed">
                Vincule su clave de API de Google AI Studio para comenzar la experiencia creativa.
              </p>
            </div>
            <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">
              <Button onClick={handleOpenKey} className="w-full py-3 text-base shadow-sm">
                Vincular API Key
              </Button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-xs text-[#1a73e8] hover:underline font-medium">
                Saber más sobre facturación
              </a>
            </div>
          </div>

              {/* Modal para introducir API Key */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-[#dadce0] space-y-6">
              <h3 className="text-2xl font-semibold text-[#202124] tracking-tight text-center">Vincular API Key</h3>
              <p className="text-sm text-[#5f6368] text-center">Introduce tu clave de API de Google AI Studio para comenzar.</p>
              <input 
                type="text" 
                value={apiKeyInput} 
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIza..." 
                className="w-full bg-[#f1f3f4] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1a73e8]/20 outline-none transition-all placeholder:text-[#9aa0a6] text-sm"
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowApiKeyModal(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()} className="flex-1">Guardar</Button>
              </div>
            </div>
          </div>
        )}
        ) : view === AppView.INPUT ? (
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="google-card p-8 space-y-6 bg-white border-[#dadce0]">
                <h2 className="text-lg font-semibold text-[#202124] border-b border-[#f1f3f4] pb-4 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  Datos de Producción
                </h2>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#5f6368] tracking-widest ml-1">Título</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título de la canción" className="w-full bg-[#f1f3f4] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1a73e8]/20 outline-none transition-all placeholder:text-[#9aa0a6] text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#5f6368] tracking-widest ml-1">Letra</label>
                    <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={5} placeholder="Introduce la letra completa aquí..." className="w-full bg-[#f1f3f4] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1a73e8]/20 outline-none resize-none transition-all placeholder:text-[#9aa0a6] text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#5f6368] tracking-widest ml-1">Archivo de Audio</label>
                    <div className="bg-[#f1f3f4] p-1.5 rounded-xl">
                      <input type="file" accept="audio/*" onChange={handleAudioUpload} className="block w-full text-xs text-[#5f6368] file:bg-[#e8f0fe] file:text-[#1a73e8] file:border-none file:rounded-full file:px-4 file:py-1.5 file:mr-3 file:font-semibold hover:file:bg-[#d2e3fc] cursor-pointer" />
                    </div>
                  </div>
                  {!analysis && <Button onClick={startAnalysis} disabled={!title || !lyrics || !audioFile} className="w-full py-3.5 text-sm">Analizar para Storyboard</Button>}
                </div>
              </div>
              {analysis && (
                <div className="google-card p-8 space-y-6 bg-white border-[#dadce0] page-transition">
                  <h2 className="text-lg font-semibold text-[#202124] border-b border-[#f1f3f4] pb-4 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#1e8e3e] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                    Análisis de la Obra
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#f8f9fa] p-4 rounded-2xl"><p className="text-[9px] text-[#5f6368] uppercase font-bold tracking-widest mb-0.5">Género</p><p className="font-semibold text-[#202124] text-sm">{analysis.genre}</p></div>
                    <div className="bg-[#f8f9fa] p-4 rounded-2xl"><p className="text-[9px] text-[#5f6368] uppercase font-bold tracking-widest mb-0.5">Ritmo</p><p className="font-semibold text-[#202124] text-sm">{analysis.bpm} BPM</p></div>
                  </div>
                  <div className="space-y-1.5"><p className="text-[10px] text-[#5f6368] uppercase font-bold ml-1 tracking-widest">Sinopsis Narrativa</p><p className="text-xs text-[#3c4043] bg-[#f8f9fa] p-4 rounded-2xl leading-relaxed italic border border-[#dadce0]/30 shadow-inner">"{analysis.synopsis}"</p></div>
                  <div className="space-y-1.5"><p className="text-[10px] text-[#5f6368] uppercase font-bold ml-1 tracking-widest">Diseño del Protagonista</p><div className="text-xs text-[#1967d2] bg-[#e8f0fe] p-4 rounded-2xl flex items-start gap-3 border border-[#d2e3fc] shadow-sm"><svg className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>{analysis.characterDesign}</div></div>
                </div>
              )}
            </div>
            {analysis && (
              <section className="space-y-10 page-transition">
                <div className="flex flex-col gap-1"><h2 className="text-2xl font-semibold text-[#202124] tracking-tight">3. Dirección de Arte</h2><p className="text-[#5f6368] text-sm">Escoge el estilo visual que definirá el alma del video.</p></div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {analysis.suggestedStyles.map(s => (
                    <div key={s.id} onClick={() => setSelectedStyleId(s.id)} className={`cursor-pointer rounded-[32px] overflow-hidden border-4 transition-all duration-300 relative group ${selectedStyleId === s.id ? 'border-[#1a73e8] bg-white shadow-md scale-[1.02]' : 'border-white bg-white opacity-60 grayscale hover:grayscale-0 hover:opacity-100 shadow-sm'}`}>
                      <div className="aspect-square bg-[#f1f3f4] relative shadow-inner overflow-hidden">
                        {s.imageUrl && <img src={s.imageUrl} className="w-full h-full object-cover" />}
                        {selectedStyleId === s.id && <div className="absolute top-3 right-3 bg-[#1a73e8] text-white p-1.5 rounded-full shadow-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                      </div>
                      <div className="p-5 text-center"><h4 className="font-bold text-[#202124] mb-1 text-sm">{s.name}</h4><p className="text-[10px] text-[#5f6368] line-clamp-2 leading-relaxed">{s.description}</p></div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center mt-4">
                  <Button variant="tonal" onClick={handleGenerateMoreStyles} className="px-8 h-10">Generar más estilos visuales</Button>
                </div>
                
                <div className="google-card p-10 bg-white border-[#dadce0] shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                  <div className="lg:col-span-8 space-y-8">
                    <h3 className="text-xl font-semibold text-[#202124] tracking-tight">Personalización del Director</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3"><label className="text-[10px] font-bold text-[#5f6368] uppercase tracking-widest ml-1">Notas Adicionales</label><textarea value={extraPrompt} onChange={e => setExtraPrompt(e.target.value)} placeholder="Instrucciones adicionales para la IA..." className="w-full h-32 bg-[#f1f3f4] border-none rounded-2xl p-5 text-sm outline-none resize-none focus:ring-2 focus:ring-[#1a73e8]/10 transition-all placeholder:text-[#9aa0a6]" /></div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-[#5f6368] uppercase tracking-widest ml-1">Referencia Visual</label>
                        <div className="h-32 bg-[#f1f3f4] border-2 border-dashed border-[#dadce0] rounded-2xl flex flex-col items-center justify-center relative hover:bg-[#e8eaed] transition-colors overflow-hidden group">
                          {refImage ? <img src={refImage} className="w-full h-full object-cover" /> : <div className="text-center text-[#5f6368] group-hover:scale-110 transition-transform px-4"><svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-[9px] font-bold uppercase">Subir referencia</span></div>}
                          <input type="file" onChange={e => { const file = e.target.files?.[0]; if(file) { const reader = new FileReader(); reader.onload = ev => setRefImage(ev.target?.result as string); reader.readAsDataURL(file); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-4 space-y-10 bg-[#f8f9fa] p-10 rounded-[40px] border border-[#dadce0]/50 shadow-inner">
                    <div className="space-y-5"><label className="text-[10px] font-bold text-[#5f6368] uppercase tracking-widest text-center block">Orientación</label><div className="flex gap-4"><button onClick={() => setOrientation(AspectRatio.HORIZONTAL)} className={`flex-1 p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${orientation === AspectRatio.HORIZONTAL ? 'border-[#1a73e8] bg-white shadow-sm' : 'border-transparent bg-gray-200/40 opacity-50'}`}><div className="w-10 h-6 border-2 border-current rounded-sm" /><span className="text-[10px] font-bold uppercase tracking-widest">Horizontal</span></button><button onClick={() => setOrientation(AspectRatio.VERTICAL)} className={`flex-1 p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${orientation === AspectRatio.VERTICAL ? 'border-[#1a73e8] bg-white shadow-sm' : 'border-transparent bg-gray-200/40 opacity-50'}`}><div className="w-6 h-10 border-2 border-current rounded-sm" /><span className="text-[10px] font-bold uppercase tracking-widest">Vertical</span></button></div></div>
                    <Button onClick={createStoryboard} className="w-full py-4 text-base font-bold shadow-lg">Generar Storyboard</Button>
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-10 page-transition">
            <div className="flex justify-between items-end pb-4 border-b border-[#dadce0]">
              <div className="space-y-1"><h2 className="text-2xl font-semibold text-[#202124] tracking-tight">{title}</h2><p className="text-[10px] text-[#5f6368] font-bold uppercase tracking-[0.15em]">{storyboard?.scenes.length} Escenas • Cinematografía IA</p></div>
              <Button variant="outline" onClick={() => setView(AppView.INPUT)} className="px-8 h-10 text-sm">Nuevo Proyecto</Button>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-[#dadce0] shadow-sm flex items-center justify-center relative">
              <div className="flex gap-6 overflow-x-auto no-scrollbar py-3 w-full px-2">
                {storyboard?.scenes.map((s, i) => (
                  <div key={s.id} onClick={() => setActiveSceneIndex(i)} className={`flex-shrink-0 w-32 cursor-pointer rounded-xl overflow-hidden border-4 transition-all relative group ${activeSceneIndex === i ? 'border-[#1a73e8] scale-105 shadow-xl z-10' : 'border-transparent opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}><div className="aspect-video bg-[#f1f3f4]"><img src={s.imageUrl} className="w-full h-full object-cover" /></div><div className="absolute bottom-0 inset-x-0 bg-black/60 py-1.5 text-[9px] text-center text-white font-bold tracking-tight">{s.timestamp}</div></div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-8 space-y-8">
                <div className="relative group">
                  <div className={`bg-[#000000] rounded-[48px] overflow-hidden shadow-2xl flex items-center justify-center border-[12px] border-white transition-all duration-500 ${storyboard?.orientation === AspectRatio.VERTICAL ? 'aspect-[9/16] max-h-[80vh] mx-auto' : 'aspect-video'}`}>
                    <img src={storyboard?.scenes[activeSceneIndex].imageUrl} className="w-full h-full object-contain" />
                  </div>
                  <button onClick={() => setActiveSceneIndex(Math.max(0, activeSceneIndex - 1))} disabled={activeSceneIndex === 0} className="absolute left-8 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 backdrop-blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white border border-white/20 disabled:hidden shadow-xl"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
                  <button onClick={() => setActiveSceneIndex(Math.min(storyboard!.scenes.length - 1, activeSceneIndex + 1))} disabled={activeSceneIndex === storyboard!.scenes.length - 1} className="absolute right-8 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 backdrop-blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white border border-white/20 disabled:hidden shadow-xl"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
                </div>
                
                <div className="google-card p-10 space-y-10 bg-white border-none shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center border-b border-[#f1f3f4] pb-8">
                    <div className="flex items-baseline gap-5"><h3 className="text-3xl font-semibold text-[#202124] tracking-tight">Toma {activeSceneIndex + 1}</h3><span className="text-[#1a73e8] font-bold bg-[#e8f0fe] px-4 py-1.5 rounded-full text-[10px] shadow-inner uppercase tracking-widest">Sincro: {storyboard?.scenes[activeSceneIndex].timestamp}</span></div>
                    <div className="flex gap-3">
                       <Button variant="outline" className="h-12 w-12 p-0 flex items-center justify-center shadow-none border-[#dadce0] group hover:border-[#1a73e8]/30" onClick={() => {
                          const url = storyboard?.scenes[activeSceneIndex].imageUrl;
                          if(url) {
                            const link = document.createElement('a'); link.href = url; link.download = `hey_labs_toma_${activeSceneIndex+1}.png`; link.click();
                          }
                       }}>
                         <svg className="w-6 h-6 group-hover:scale-110 transition-transform opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       </Button>
                       <Button variant="tonal" onClick={() => regenerateShot(activeSceneIndex)} className="px-6 h-12 text-sm font-semibold">Regenerar Toma</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div className="space-y-3"><p className="text-[10px] uppercase font-bold text-[#5f6368] tracking-widest flex items-center gap-2"><svg className="w-4 h-4 text-[#1a73e8] opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>Letra / Guión</p><p className="text-lg italic text-[#3c4043] leading-relaxed bg-[#f8f9fa] p-8 rounded-[32px] border border-[#dadce0]/40 shadow-inner">"{storyboard?.scenes[activeSceneIndex].lyrics}"</p></div>
                      <div className="space-y-3"><p className="text-[10px] uppercase font-bold text-[#5f6368] tracking-widest ml-1">Composición Visual</p><textarea value={storyboard?.scenes[activeSceneIndex].visualPrompt} readOnly className="w-full h-32 text-[11px] p-6 bg-[#f8f9fa] rounded-[32px] border border-[#dadce0]/40 outline-none resize-none leading-relaxed text-[#5f6368] font-medium" /></div>
                    </div>
                    <div className="space-y-8">
                      <div className="space-y-3"><p className="text-[10px] uppercase font-bold text-[#5f6368] tracking-widest ml-1">Prompt para Video IA</p><textarea value={storyboard?.scenes[activeSceneIndex].videoPrompt} readOnly className="w-full h-32 text-[11px] p-6 bg-[#e8f0fe]/30 rounded-[32px] border border-[#d2e3fc]/50 outline-none resize-none leading-relaxed text-[#1967d2]/80 font-bold" /></div>
                      {audioUrl && (
                        <div className="bg-[#1a73e8] p-8 rounded-[40px] shadow-lg shadow-[#1a73e8]/20 space-y-6 text-white relative overflow-hidden group/player">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/player:opacity-10 transition-opacity"><svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg></div>
                          <div className="flex items-center justify-between relative z-10"><p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Sync Player</p><div className="text-xs font-mono font-bold tracking-widest opacity-95 bg-white/10 px-4 py-1.5 rounded-full">{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</div></div>
                          <div className="flex items-center gap-6 relative z-10">
                            <button onClick={togglePlay} className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-[#1a73e8] hover:scale-105 active:scale-95 transition-all shadow-md">{isPlaying ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}</button>
                            <div className="flex-1">
                              <input type="range" min="0" max={duration} step="0.1" value={currentTime} onChange={e => { const t = parseFloat(e.target.value); if(audioRef.current) audioRef.current.currentTime = t; setCurrentTime(t); }} className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-white" />
                            </div>
                          </div>
                          <audio ref={audioRef} src={audioUrl} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onEnded={() => setIsPlaying(false)} className="hidden" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                <div className="google-card p-10 space-y-8 sticky top-28 bg-white border-none shadow-sm overflow-hidden">
                  <div className="space-y-3 text-center lg:text-left"><h3 className="text-xl font-semibold text-[#202124] tracking-tight">Finalización</h3><p className="text-sm text-[#5f6368] leading-relaxed">Exporta el pack completo de producción.</p></div>
                  <div className="space-y-4">
                    <Button variant="secondary" onClick={() => createStoryboard()} className="w-full py-4 font-bold text-sm h-14 shadow-none hover:bg-gray-200">Regenerar Completo</Button>
                    <Button onClick={downloadAsZip} className="w-full py-5 text-base font-bold shadow-md h-16 bg-[#1a73e8]">Exportar Pack (.ZIP)</Button>
                  </div>
                  {youtubeThumbnail && (
                    <div className="space-y-5 pt-8 border-t border-[#f1f3f4]">
                      <p className="text-[10px] uppercase font-bold text-[#5f6368] tracking-widest text-center">Propuesta de Miniatura</p>
                      <div className="relative group rounded-[32px] overflow-hidden aspect-video shadow-lg border border-[#dadce0] bg-black ring-4 ring-[#f8f9fa] transition-transform hover:scale-[1.02] duration-300">
                         <img src={youtubeThumbnail} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-center p-6">
                           <h4 className="text-white text-base font-bold text-center leading-tight drop-shadow-2xl tracking-tight">{title}</h4>
                         </div>
                         <button onClick={() => { const link = document.createElement('a'); link.href = youtubeThumbnail; link.download = `hey_labs_miniatura_${title}.png`; link.click(); }} className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/50 backdrop-blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                      </div>
                      <p className="text-[10px] text-[#5f6368] text-center italic leading-relaxed px-4">Arte promocional para redes sociales.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
};

export default App;
