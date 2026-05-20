import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Wand2, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { useToast } from './Toast';

interface SmartInputProps {
  onParsed: (data: Record<string, string>) => void;
  placeholder?: string;
  type: 'member' | 'payment';
}

export const SmartInput: React.FC<SmartInputProps> = ({ onParsed, placeholder, type }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [feedback, setFeedback] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Setup SpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; // Optimize for Indian English/Hindi mix
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? prev + " " + transcript : transcript));
        parseText(transcript);
        setIsListening(false);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsSupported(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const parseText = (input: string) => {
    if (!input.trim()) return;
    
    const data: Record<string, string> = {};
    const lower = input.toLowerCase();
    
    // Extract Phone (10 digits)
    const phoneMatch = input.match(/\b\d{10}\b/);
    if (phoneMatch) data.phone = phoneMatch[0];
    
    // Extract Amount (e.g. 500, Rs 500, 1500)
    const amounts = input.match(/\b\d{3,5}\b/g);
    if (amounts) {
       // Filter out duration/phone numbers, get the first likely amount
       const possibleAmounts = amounts.map(Number).filter(n => n >= 100 && n < 100000);
       if (possibleAmounts.length > 0) {
         data.amount = possibleAmounts[0].toString();
       }
    }

    // Extract Duration
    if (lower.includes("1 month") || lower.includes("one month")) data.duration = "1 Month";
    else if (lower.includes("3 month") || lower.includes("three month") || lower.includes("quarterly")) data.duration = "3 Months";
    else if (lower.includes("6 month") || lower.includes("six month") || lower.includes("half")) data.duration = "6 Months";
    else if (lower.includes("12 month") || lower.includes("year") || lower.includes("annual")) data.duration = "1 Year";

    // Basic Name Extraction Heuristic (If adding a member)
    if (type === 'member') {
       // Find words that are Capitalized, not at the beginning of sentence, or fallback to first non-keyword
       const words = input.split(' ').map(w => w.replace(/[^a-zA-Z]/g, ''));
       const ignoreList = ['add', 'member', 'paid', 'rs', 'rupees', 'for', 'months', 'month', 'name', 'is'];
       const potentialNames = words.filter(w => w.length > 2 && !ignoreList.includes(w.toLowerCase()));
       if (potentialNames.length > 0) {
         // Join first two if they exist to form full name
         data.name = potentialNames.slice(0, 2).join(' ');
       }
    }
    
    // Payment Mode
    if (lower.includes("upi") || lower.includes("phonepe") || lower.includes("gpay") || lower.includes("paytm")) data.paymentMode = "UPI";
    else if (lower.includes("cash")) data.paymentMode = "Cash";

    const fieldsFound = Object.keys(data).length;
    if (fieldsFound > 0) {
       setFeedback(`Magic Extracted: ${Object.keys(data).join(', ')}`);
       setTimeout(() => setFeedback(''), 3000);
       onParsed(data);
       showToast(`Auto-filled ${fieldsFound} field(s) from text! ✨`);
    } else {
       showToast(`Couldn't find recognizable details. Try standard formats!`);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // We parse immediately after paste
    setTimeout(() => {
      parseText(e.currentTarget.value);
    }, 100);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
      background: 'var(--color-surface-variant)', padding: '16px',
      borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-primary)',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
        background: 'linear-gradient(to bottom, var(--color-primary), var(--color-accent))'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wand2 size={16} color="var(--color-primary)" /> 
          Smart Entry (AI Free)
        </span>
        {feedback && (
          <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', animation: 'pageFadeIn 300ms ease' }}>
            <CheckCircle2 size={12} /> {feedback}
          </span>
        )}
      </div>
      
      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '-4px' }}>
        Too lazy to type? Paste a WhatsApp forward or dictate a voice note. We&apos;ll extract details automatically.
      </p>

      <div style={{ position: 'relative' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder || (type === 'member' ? "e.g. 'Rahul 9876543210 paid 1500 cash for 3 months'" : "e.g. 'Suhas paid 500 via upi'")}
          style={{
            width: '100%', padding: '12px', paddingRight: '40px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)', fontSize: '14px', resize: 'vertical',
            background: 'var(--color-surface)', color: 'var(--color-text)', minHeight: '60px'
          }}
          rows={2}
        />
        {isSupported && (
          <button 
            onClick={toggleListen}
            style={{
              position: 'absolute', right: '8px', bottom: '12px',
              background: isListening ? '#ef4444' : 'var(--color-primary)',
              color: 'white', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.6)' : 'var(--shadow-sm)'
            }}
            title="Voice Note"
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <Button variant="ghost" onClick={() => setText('')} style={{ fontSize: '12px', padding: '4px 12px' }}>
          Clear
        </Button>
        <Button variant="ghost" onClick={() => parseText(text)} style={{ fontSize: '12px', padding: '4px 12px', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}>
          <Wand2 size={14} style={{ marginRight: '4px' }}/> Auto-Fill Form
        </Button>
      </div>
    </div>
  );
};
