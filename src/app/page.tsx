"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Save, Loader2, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Inicializaremos supabase cuando tengamos las keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Extensión para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type FormData = {
  paciente: string;
  dd_mm: string;
  ds_mm: string;
  siv_mm: string;
  pp_mm: string;
  ao_mm: string;
  ai_mm: string;
  apertura_ao: string;
  fey_porcentaje: string;
  vol_ai: string;
  fd: string;
  conclusiones: string;
};

const initialFormData: FormData = {
  paciente: "",
  dd_mm: "",
  ds_mm: "",
  siv_mm: "",
  pp_mm: "",
  ao_mm: "",
  ai_mm: "",
  apertura_ao: "",
  fey_porcentaje: "",
  vol_ai: "",
  fd: "",
  conclusiones: "",
};

export default function Home() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "es-AR"; // Español Argentina

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          let currentFinalChunk = "";
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              currentFinalChunk += event.results[i][0].transcript + " ";
            } else {
              interimTranscript += event.results[i][0].transcript + " ";
            }
          }
          
          if (currentFinalChunk) {
            finalTranscriptRef.current += currentFinalChunk;
          }
          
          const fullText = (finalTranscriptRef.current + interimTranscript).trim();
          setTranscript(fullText);
          processVoiceCommand(fullText.toLowerCase());
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          // Restart if still marked as recording (prevents auto-stop on silence)
          if (isRecording) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error(e);
            }
          }
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  useEffect(() => {
    const lowerText = transcript.toLowerCase();
    
    if (lowerText.includes("guardar estudio") || lowerText.includes("guardar valores")) {
      handleSave();
    }
    
    if (lowerText.includes("stop") || lowerText.includes("detener dictado")) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    }
  }, [transcript]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript("");
      finalTranscriptRef.current = "";
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const processVoiceCommand = (text: string) => {
    if (text.includes("limpiar estudio") || text.includes("nuevo estudio") || text.includes("borrar todo")) {
      setFormData(initialFormData);
      setTranscript("");
      finalTranscriptRef.current = "";
      return;
    }

    // Un mapeo simple de palabras clave a campos del formulario
    setFormData((prev) => {
      const newData = { ...prev };
      
      // Si dictó números secuenciales (ej: "120 10 90 15 45 20 55 200 301")
      // Mapea a: DD, DS, SIV, PP, AO, AI, Apertura, Fey, Vol AI
      const hasKeywords = /(paciente|dd|ds|siv|pp|ao|ai|apertura|fey|vol|conclusi)/i.test(text);
      if (!hasKeywords) {
        let cleanedText = text
          .replace(/\by\b/gi, " ")
          .replace(/un|uno/gi, "1")
          .replace(/dos/gi, "2")
          .replace(/tres/gi, "3")
          .replace(/cuatro/gi, "4")
          .replace(/cinco/gi, "5")
          .replace(/seis/gi, "6")
          .replace(/siete/gi, "7")
          .replace(/ocho/gi, "8")
          .replace(/nueve/gi, "9")
          .replace(/diez/gi, "10");
        
        // Expresión regular que captura números enteros y decimales (con coma o punto)
        const numbers = cleanedText.match(/\d+(?:[.,]\d+)?/g);
        if (numbers && numbers.length > 0) {
          if (numbers[0]) newData.dd_mm = numbers[0];
          if (numbers[1]) newData.ds_mm = numbers[1];
          if (numbers[2]) newData.siv_mm = numbers[2];
          if (numbers[3]) newData.pp_mm = numbers[3];
          if (numbers[4]) newData.ao_mm = numbers[4];
          if (numbers[5]) newData.ai_mm = numbers[5];
          if (numbers[6]) newData.apertura_ao = numbers[6];
          if (numbers[7]) newData.fey_porcentaje = numbers[7];
          if (numbers[8]) newData.vol_ai = numbers[8];
          if (numbers[9]) newData.fd = numbers[9];
          
          if (numbers.length >= 10) {
            let temp = cleanedText;
            let lastIndex = 0;
            for (let i = 0; i < 10; i++) {
               lastIndex = temp.indexOf(numbers[i], lastIndex) + numbers[i].length;
            }
            const rest = temp.substring(lastIndex).trim();
            // Limpiar "guardar estudio" de las conclusiones si el usuario lo dijo al final
            const cleanRest = rest.replace(/guardar estudio|guardar valores/gi, "").trim();
            if (cleanRest) {
               newData.conclusiones = cleanRest;
            }
          }
          return newData; // Retornamos temprano si es solo una secuencia de números
        }
      }

      // Función ayudante para extraer valores después de una palabra clave
      const extractValue = (keyword: string, stopWords: string[] = ["paciente", "dd", "ds", "siv", "pp", "ao", "ai", "apertura", "fey", "vol", "fd", "conclusiones"]) => {
        const regex = new RegExp(`${keyword}\\s+(.*?)(?=\\s+(?:${stopWords.join("|")})|$)`, "i");
        const match = text.match(regex);
        return match ? match[1].trim() : null;
      };

      // Extracción de Paciente
      const pacienteMatch = extractValue("paciente");
      if (pacienteMatch) newData.paciente = pacienteMatch;

      // Extracción de Conclusiones (suele ser al final)
      const concMatch = text.match(/conclusi(?:ones|ón)\s+(.*)/i);
      if (concMatch) newData.conclusiones = concMatch[1].trim();
      
      // Extracción de FD
      const fdMatch = extractValue("fd");
      if (fdMatch) newData.fd = fdMatch;

      // Extracción de números. Reemplazamos palabras por números si es necesario
      const parseNumber = (val: string | null) => {
        if (!val) return null;
        // Reemplazos comunes de voz a número
        let clean = val.replace(/un|uno/g, "1")
          .replace(/dos/g, "2")
          .replace(/tres/g, "3")
          .replace(/cuatro/g, "4")
          .replace(/cinco/g, "5")
          .replace(/seis/g, "6")
          .replace(/siete/g, "7")
          .replace(/ocho/g, "8")
          .replace(/nueve/g, "9")
          .replace(/diez/g, "10")
          .replace(/veinte/g, "20")
          .replace(/treinta/g, "30")
          .replace(/cuarenta/g, "40")
          .replace(/cincuenta/g, "50")
          .replace(/sesenta/g, "60")
          .replace(/setenta/g, "70")
          .replace(/ochenta/g, "80")
          .replace(/noventa/g, "90")
          .replace(/cien/g, "100")
          .replace(/ y /g, "")
          .replace(/,/g, ".")
          .replace(/[^0-9.]/g, ""); // Solo dejar números y puntos
        return clean;
      };

      const dd = parseNumber(extractValue("dd"));
      if (dd) newData.dd_mm = dd;

      const ds = parseNumber(extractValue("ds"));
      if (ds) newData.ds_mm = ds;

      const siv = parseNumber(extractValue("siv"));
      if (siv) newData.siv_mm = siv;

      const pp = parseNumber(extractValue("pp"));
      if (pp) newData.pp_mm = pp;

      const ao = parseNumber(extractValue("ao"));
      if (ao) newData.ao_mm = ao;

      const ai = parseNumber(extractValue("ai"));
      if (ai) newData.ai_mm = ai;

      const fey = parseNumber(extractValue("fey"));
      if (fey) newData.fey_porcentaje = fey;
      
      const vol = parseNumber(extractValue("volumen|vol"));
      if (vol) newData.vol_ai = vol;

      const apertura = parseNumber(extractValue("apertura"));
      if (apertura) newData.apertura_ao = apertura;

      return newData;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (dataToSaveObj?: FormData) => {
    setIsSaving(true);
    setSaveStatus("idle");
    
    const currentData = dataToSaveObj || formData;
    
    // Detener el micrófono si está grabando al momento de guardar
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    if (!supabase) {
      alert("Faltan las credenciales de Supabase en .env.local");
      setIsSaving(false);
      return;
    }

    try {
      const { error } = await supabase.from("estudios_eco").insert([
        {
          paciente: currentData.paciente,
          dd_mm: Number(currentData.dd_mm) || null,
          ds_mm: Number(currentData.ds_mm) || null,
          siv_mm: Number(currentData.siv_mm) || null,
          pp_mm: Number(currentData.pp_mm) || null,
          ao_mm: Number(currentData.ao_mm) || null,
          ai_mm: Number(currentData.ai_mm) || null,
          apertura_ao: Number(currentData.apertura_ao) || null,
          fey_porcentaje: Number(currentData.fey_porcentaje) || null,
          vol_ai: Number(currentData.vol_ai) || null,
          fd: currentData.fd,
          conclusiones: currentData.conclusiones
        }
      ]);

      if (error) throw error;
      
      setSaveStatus("success");
      setFormData(initialFormData);
      setTranscript("");
      finalTranscriptRef.current = "";
      
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Error saving:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="card" style={{ marginBottom: '2rem', maxWidth: '350px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', maxWidth: '300px', margin: '0 auto 1.5rem auto' }}>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--primary-dark)' }}>Resultados</h1>
          
          <button 
            onClick={toggleRecording}
            className={`btn-icon-only ${isRecording ? 'recording' : ''}`}
            title={isRecording ? 'Detener Dictado' : 'Iniciar Dictado Voz'}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isRecording ? '#28a745' : 'var(--primary)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'background-color 0.3s ease'
            }}
          >
            {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
        </div>

        {isRecording && (
          <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107', marginBottom: '1.5rem', borderRadius: '4px', maxWidth: '300px', margin: '0 auto 1.5rem auto' }}>
            <strong>Escuchando:</strong> {transcript || "Hable ahora (ej: 'Paciente Juan Perez, DD cuarenta y ocho, DS veinticuatro, Conclusiones normal')"}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
          <div className="input-group">
            <label>Paciente</label>
            <input type="text" name="paciente" value={formData.paciente} onChange={handleInputChange} placeholder="Ej. Juan Pérez" />
          </div>
        </div>

        {/* Layout Vertical para las etiquetas y campos numéricos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', maxWidth: '300px', margin: '0 auto' }}>
          <div className="input-group">
            <label>DD (mm)</label>
            <input type="text" name="dd_mm" value={formData.dd_mm} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>DS (mm)</label>
            <input type="text" name="ds_mm" value={formData.ds_mm} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>SIV (mm)</label>
            <input type="text" name="siv_mm" value={formData.siv_mm} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>PP (mm)</label>
            <input type="text" name="pp_mm" value={formData.pp_mm} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>AO (mm)</label>
            <input type="text" name="ao_mm" value={formData.ao_mm} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>AI (mm)</label>
            <input type="text" name="ai_mm" value={formData.ai_mm} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>Apertura Ao</label>
            <input type="text" name="apertura_ao" value={formData.apertura_ao} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>Fey (%)</label>
            <input type="text" name="fey_porcentaje" value={formData.fey_porcentaje} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>Vol AI (cm/m2)</label>
            <input type="text" name="vol_ai" value={formData.vol_ai} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>FD</label>
            <input type="text" name="fd" value={formData.fd} onChange={handleInputChange} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1rem', maxWidth: '300px', margin: '1rem auto 0 auto' }}>
          <div className="input-group">
            <label>Conclusiones</label>
            <textarea name="conclusiones" rows={4} value={formData.conclusiones} onChange={handleInputChange} />
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <button 
            title="Limpiar"
            style={{ backgroundColor: '#dc3545', color: 'white', padding: '0.75rem', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px' }}
            onClick={() => setFormData(initialFormData)}
          >
            <X size={24} />
          </button>
          <button 
            title="Guardar Estudio"
            style={{ backgroundColor: '#28a745', color: 'white', padding: '0.75rem', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px' }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
          </button>
        </div>

        {saveStatus === 'success' && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#d1e7dd', color: '#0f5132', borderRadius: '4px', textAlign: 'center' }}>
            ¡Estudio guardado exitosamente!
          </div>
        )}
        {saveStatus === 'error' && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8d7da', color: '#842029', borderRadius: '4px', textAlign: 'center' }}>
            Hubo un error al guardar. Verifica la conexión a Supabase.
          </div>
        )}
      </div>
    </div>
  );
}
