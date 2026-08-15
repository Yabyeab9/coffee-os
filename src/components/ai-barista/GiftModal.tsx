import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeName } from './InChatDrinkCard';

// ── QR code placeholder (renders as text for now; replace with qrcode lib if desired)
function QRPlaceholder({ value, size = 100 }: { value: string; size?: number }) {
  // Use Google Charts QR API as a lightweight approach
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  return <img src={url} alt="Gift QR code" width={size} height={size} className="rounded-lg border border-border" />;
}

interface Props {
  open: boolean;
  onClose: () => void;
  drinkId: string;
  drinkName: string;
  drinkPrice: number | null;
  drinkImage: string | null;
  cafeId: string;
}

type Step = 'form' | 'recording' | 'preview' | 'success';

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function GiftModal({ open, onClose, drinkId, drinkName, drinkPrice, drinkImage, cafeId }: Props) {
  const { profile, session } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [recipientName, setRecipientName] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [message, setMessage] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sending, setSending] = useState(false);
  const [giftQr, setGiftQr] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanName = sanitizeName(drinkName);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setIsRecording(true);
      setTimeout(() => stopRecording(), 10_000); // max 10s
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setIsRecording(false);
  };

  const togglePlay = () => {
    if (!audioBlob) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = async () => {
    if (!profile?.id) return;
    if (!recipientName.trim() || !recipientContact.trim()) {
      toast.error('Recipient name and contact are required');
      return;
    }
    setSending(true);
    try {
      let audioUrl: string | null = null;

      if (audioBlob) {
        const fileName = `${profile.id}/${Date.now()}-gift-note.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gift-audio')
          .upload(fileName, audioBlob, { contentType: 'audio/webm' });
        if (!uploadError && uploadData) {
          const { data: pub } = supabase.storage.from('gift-audio').getPublicUrl(uploadData.path);
          audioUrl = pub.publicUrl;
        }
      }

      const qrCode = generateCode();
      const { error } = await supabase.from('coffee_gifts').insert({
        cafe_id: cafeId,
        sender_id: profile.id,
        recipient_name: recipientName.trim(),
        recipient_contact: recipientContact.trim(),
        drink_id: drinkId,
        drink_name: cleanName,
        message: message.trim() || null,
        audio_note_url: audioUrl,
        qr_code: qrCode,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
      });

      if (error) throw error;
      setGiftQr(qrCode);
      setStep('success');
    } catch (err: any) {
      toast.error('Failed to create gift: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setRecipientName('');
    setRecipientContact('');
    setMessage('');
    setAudioBlob(null);
    setGiftQr(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            {step === 'success' ? 'Gift created!' : `Send ${cleanName} as a gift`}
          </DialogTitle>
        </DialogHeader>

        {step !== 'success' && (
          <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border">
            {drinkImage ? (
              <img src={drinkImage} alt={cleanName} className="w-12 h-12 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">☕</div>
            )}
            <div>
              <p className="text-sm font-medium">{cleanName}</p>
              {drinkPrice && <p className="text-xs text-muted-foreground">{drinkPrice} ETB</p>}
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Recipient name</label>
              <Input
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="e.g. Sarah"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Phone or email</label>
              <Input
                value={recipientContact}
                onChange={e => setRecipientContact(e.target.value)}
                placeholder="e.g. +251 9... or sarah@..."
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Message (optional)</label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write a note..."
                className="min-h-16 text-sm resize-none"
                maxLength={200}
              />
            </div>

            {/* Voice note */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Voice note (optional, max 10s)</label>
              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-foreground/30 transition-colors"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {audioBlob ? 'Re-record' : 'Record'}
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </button>
                )}
                {audioBlob && !isRecording && (
                  <button
                    onClick={togglePlay}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-foreground/30 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                )}
              </div>
            </div>

            <Button
              className="w-full h-9 text-xs gap-1.5"
              onClick={handleSend}
              disabled={sending || !recipientName.trim() || !recipientContact.trim()}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Generate Gift Voucher
            </Button>
          </div>
        )}

        {step === 'success' && giftQr && (
          <div className="flex flex-col items-center gap-4 py-2">
            <QRPlaceholder value={giftQr} size={120} />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{cleanName} → {recipientName}</p>
              <p className="text-xs text-muted-foreground">Valid for 7 days. Share this QR code with {recipientName} to redeem at the café.</p>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">{giftQr}</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
