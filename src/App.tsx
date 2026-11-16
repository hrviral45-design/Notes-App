import { useEffect, useMemo, useRef, useState } from 'react';
import { LockKeyhole, Plus, Search, Mic, ImagePlus, Trash2, Download, Upload, X, Check, FileText, Pin, PinOff } from 'lucide-react';

type Note = { id: string; title: string; body: string; photo?: string; updated: number; pinned: boolean };
const DB = 'personal-notes-db', STORE = 'notes';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
async function allNotes(): Promise<Note[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => { const r = db.transaction(STORE).objectStore(STORE).getAll(); r.onsuccess = () => resolve(r.result as Note[]); r.onerror = () => reject(r.error); });
}
async function saveNote(note: Note) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => { const r = db.transaction(STORE, 'readwrite').objectStore(STORE).put(note); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
}
async function deleteNote(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => { const r = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
}
async function hashPin(pin: string) {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
}
declare global { interface Window { SpeechRecognition?: any; webkitSpeechRecognition?: any; } }

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [locked, setLocked] = useState(false);
  const [hasPin, setHasPin] = useState(!!localStorage.getItem('notes-pin'));
  const [pin, setPin] = useState('');
  const [pinSetup, setPinSetup] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [toast, setToast] = useState('');
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = async () => setNotes((await allNotes()).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updated-a.updated));
  useEffect(() => { refresh(); setLocked(!!localStorage.getItem('notes-pin')); }, []);
  const visible = useMemo(() => notes.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(query.toLowerCase())), [notes, query]);
  const notify = (s: string) => { setToast(s); window.setTimeout(() => setToast(''), 2200); };
  const newNote = () => { setEditing({id: crypto.randomUUID(), title:'', body:'', updated:Date.now(), pinned:false}); setTitle(''); setBody(''); setPhoto(undefined); };
  const editNote = (n: Note) => { setEditing(n); setTitle(n.title); setBody(n.body); setPhoto(n.photo); };
  const save = async () => {
    if (!title.trim() && !body.trim() && !photo) { notify('पहले कुछ लिखें'); return; }
    const n: Note = { id: editing?.id || crypto.randomUUID(), title: title.trim() || 'बिना शीर्षक', body, photo, updated: Date.now(), pinned: editing?.pinned || false };
    await saveNote(n); await refresh(); setEditing(null); notify('नोट सेव हो गया');
  };
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { notify('इस फोन के ब्राउज़र में Voice typing उपलब्ध नहीं है'); return; }
    const rec = new SR(); rec.lang = 'hi-IN'; rec.interimResults = false; rec.onstart = () => setListening(true);
    rec.onresult = (e: any) => setBody(v => v + (v ? ' ' : '') + e.results[0][0].transcript);
    rec.onerror = () => notify('Voice typing शुरू नहीं हो पाई'); rec.onend = () => setListening(false); rec.start();
  };
  const choosePhoto = (f?: File) => {
    if (!f) return;
    const reader = new FileReader(); reader.onload = () => setPhoto(String(reader.result)); reader.readAsDataURL(f);
  };
  const exportBackup = async () => {
    const data = { app: 'Personal Notes', version: 1, exportedAt: new Date().toISOString(), notes: await allNotes() };
    const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='personal-notes-backup.json'; a.click(); URL.revokeObjectURL(url); notify('बैकअप डाउनलोड हो गया');
  };
  const importBackup = async (f?: File) => {
    if (!f) return;
    try { const data = JSON.parse(await f.text()); if (!Array.isArray(data.notes)) throw new Error();
      for (const n of data.notes) if (n.id && typeof n.title === 'string') await saveNote({...n, updated: Number(n.updated)||Date.now()});
      await refresh(); notify('बैकअप वापस आ गया');
    } catch { notify('यह सही Notes बैकअप फाइल नहीं है'); }
    if (importRef.current) importRef.current.value='';
  };
  const submitPin = async () => {
    if (!/^\d{4,8}$/.test(pin)) { notify('4 से 8 अंकों का PIN डालें'); return; }
    const h = await hashPin(pin), old = localStorage.getItem('notes-pin');
    if (pinSetup || !old) { localStorage.setItem('notes-pin', h); setHasPin(true); setPinSetup(false); setLocked(false); setPin(''); notify('PIN सेट हो गया'); }
    else if (h === old) { setLocked(false); setPin(''); }
    else { setPin(''); notify('गलत PIN'); }
  };
  const setupLock = () => { setPin(''); setPinSetup(true); setLocked(true); };
  if (locked) return <main className="lock-screen"><div className="lock-card"><div className="lock-icon"><LockKeyhole size={30}/></div><h1>{pinSetup ? 'नया PIN बनाएँ' : 'Notes लॉक है'}</h1><p>{pinSetup ? '4 से 8 अंकों का PIN सेट करें' : 'अपने नोट्स खोलने के लिए PIN डालें'}</p><input className="pin-input" type="password" inputMode="numeric" maxLength={8} value={pin} onChange={e=>setPin(e.target.value)} placeholder="••••" /><button className="primary wide" onClick={submitPin}>{pinSetup ? 'PIN सेव करें' : 'अनलॉक करें'}</button></div></main>;
  return <main className="app">
    <header><div><div className="eyebrow">YOUR PRIVATE SPACE</div><h1>मेरे नोट्स <span>✦</span></h1><p className="sub">आपके विचार, हमेशा आपके पास।</p></div><button className="icon-btn" aria-label="Lock" onClick={hasPin ? () => setLocked(true) : setupLock}><LockKeyhole size={19}/></button></header>
    <div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="अपने नोट्स खोजें..." /></div>
    <section className="toolbar"><span>{notes.length} नोट्स</span><div><button className="soft-btn" onClick={exportBackup}><Download size={16}/> बैकअप</button><button className="soft-btn" onClick={()=>importRef.current?.click()}><Upload size={16}/> वापस लाएँ</button></div></section>
    <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e=>importBackup(e.target.files?.[0])}/>
    {visible.length ? <section className="notes-grid">{visible.map(n=><article className="note-card" key={n.id} onClick={()=>editNote(n)}><div className="note-top"><span className="note-date">{new Date(n.updated).toLocaleDateString('hi-IN')}</span><button className="tiny" onClick={async e=>{e.stopPropagation(); await saveNote({...n,pinned:!n.pinned}); refresh();}}>{n.pinned?<Pin size={15}/>:<PinOff size={15}/>}</button></div><h3>{n.title}</h3><p>{n.body || 'फोटो नोट'}</p>{n.photo && <img className="note-photo" src={n.photo} alt="नोट फोटो"/>}</article>)}</section> : <div className="empty"><div className="empty-icon"><FileText size={30}/></div><h2>{query ? 'कोई नोट नहीं मिला' : 'अभी कोई नोट नहीं है'}</h2><p>अपना पहला नोट लिखने के लिए + दबाएँ।</p></div>}
    <button className="fab" onClick={newNote}><Plus size={25}/></button>
    {editing && <div className="modal-backdrop"><section className="editor"><div className="editor-head"><span>{notes.some(n=>n.id===editing.id)?'नोट एडिट करें':'नया नोट'}</span><button className="tiny" onClick={()=>setEditing(null)}><X/></button></div><input className="title-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="शीर्षक"/><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="यहाँ अपना नोट लिखें..." rows={8}/>{photo && <div className="photo-preview"><img src={photo} alt="चुनी हुई फोटो"/><button className="remove-photo" onClick={()=>setPhoto(undefined)}><X size={16}/></button></div>}<div className="editor-tools"><button className="soft-btn" onClick={()=>fileRef.current?.click()}><ImagePlus size={17}/> फोटो</button><button className="soft-btn" onClick={startVoice}><Mic size={17}/>{listening?'सुन रहा है...':'बोलकर लिखें'}</button><input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>choosePhoto(e.target.files?.[0])}/></div><div className="editor-actions">{notes.some(n=>n.id===editing.id)&&<button className="delete-btn" onClick={async()=>{await deleteNote(editing.id); await refresh(); setEditing(null); notify('नोट डिलीट हो गया')}}><Trash2 size={17}/> डिलीट</button>}<button className="primary" onClick={save}><Check size={17}/> सेव करें</button></div></section></div>}
    {toast && <div className="toast">{toast}</div>}
    <footer>🔒 आपके नोट्स इसी डिवाइस में सेव होते हैं</footer>
  </main>;
}
