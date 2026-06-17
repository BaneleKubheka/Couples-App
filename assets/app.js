const SUPABASE_URL = 'https://cmdylttzutpbaovxcfll.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LPi4xeUUk-InGxknaiqJkw_mn4BvnNc';
const MEDIA_BUCKET = 'couples-media';
const TURN_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' }
  // Add real TURN credentials here when you have them, for example:
  // { urls: 'turn:your-turn-domain:3478', username: 'user', credential: 'password' }
];

const APP = { sb:null, profile:null, selectedMood:'😊', profiles:[], partners:[], links:[], moods:[], notes:[], activities:[], albums:[], photos:[], recordings:[], messages:[], calls:[], realtimeChannels:[], localStream:null, remoteStream:null, peer:null, recorder:null, recordedChunks:[], currentCallId:null };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const now = () => new Date().toISOString();
const saveLS = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
const getLS = (k,d=null)=>{ try { const v=JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const toast = m => alert(m);

window.addEventListener('load', init);
async function init(){
  try { await clearOldAppCachesSafely(); } catch(e) { console.warn('Cache clear skipped:', e); }
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=full-20260617-3').catch(()=>{});
  setupInstallPrompt();
  bindUI();
  try {
    if(!window.supabase) throw new Error('Supabase library did not load. Check internet access or CDN blocking.');
    APP.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { realtime:{ params:{ eventsPerSecond:10 } } });
    await loadAll();
    subscribeRealtime();
  } catch(e) {
    console.error(e);
    setAuthStatus('Cloud connection failed: ' + e.message);
  }
  const saved = getLS('cc_active_profile');
  if(saved?.id && APP.sb) await loadProfile(saved.id, saved.passcodeHash);
  else show('authScreen');
}

async function clearOldAppCachesSafely(){
  if(!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.filter(k=>!k.includes('full-20260617-3')).map(k=>caches.delete(k)));
}
function show(id){ $$('.screen').forEach(x=>x.classList.remove('active')); $('#'+id)?.classList.add('active'); }
function bindUI(){
  $('#createProfileBtn').onclick=createProfile; $('#loginBtn').onclick=loginProfile; $('#recoverLocalBtn').onclick=()=>{const p=getLS('cc_active_profile'); if(p?.id) loadProfile(p.id,p.passcodeHash); else toast('No saved profile on this browser.');};
  $('#logoutBtn').onclick=()=>{localStorage.removeItem('cc_active_profile'); location.reload();};
  $$('.tab').forEach(b=>b.onclick=()=>{ $$('.tab,.tab-panel').forEach(x=>x.classList.remove('active')); b.classList.add('active'); $('#'+b.dataset.tab).classList.add('active'); renderAll(); });
  ['😍','😊','😐','🥺','😔','😡','🤒','✨'].forEach(m=>{const b=document.createElement('button'); b.className='mood'; b.textContent=m; b.onclick=()=>{$$('.mood').forEach(x=>x.classList.remove('active')); b.classList.add('active'); APP.selectedMood=m}; $('#moodButtons').appendChild(b);});
  $('#moodButtons .mood')?.classList.add('active');
  $('#saveMoodBtn').onclick=saveMood; $('#saveNoteBtn').onclick=saveNote; $('#saveProfileBtn').onclick=saveProfileEdits;
  $('#addPartnerBtn').onclick=addPartner; $('#linkPartnerBtn').onclick=linkPartner;
  $('#createAlbumBtn').onclick=createAlbum; $('#uploadPhotosBtn').onclick=uploadPhotos;
  $$('.quick-actions button').forEach(b=>b.onclick=()=>postActivity(b.dataset.prompt));
  $('#sendMessageBtn').onclick=sendEncryptedMessage; $('#enableNotificationsBtn').onclick=enableNotifications;
  $('#startCallBtn').onclick=startCall; $('#joinCallBtn').onclick=joinLatestCall; $('#recordCallBtn').onclick=toggleRecording; $('#hangupBtn').onclick=hangup;
  $('#exportBtn').onclick=exportBackup; $('#clearLocalBtn').onclick=()=>{ if(confirm('Clear only this browser? Cloud data remains in Supabase.')){ localStorage.clear(); location.reload(); } };
}
function setAuthStatus(message){ const el=$('#authStatus'); if(el) el.textContent=message||''; }
function friendlySupabaseError(e){ const msg=(e?.message||String(e)); if(msg.includes('relation')||msg.includes('schema cache')) return msg + ' — run the latest supabase-schema.sql in Supabase SQL Editor.'; if(msg.includes('row-level security')) return msg + ' — run the schema again to create the RLS policies.'; if(msg.includes('Failed to fetch')) return 'Could not reach Supabase. Check internet, Supabase URL/key, and browser blocking.'; return msg; }
async function sha256(text){ const data=new TextEncoder().encode(text); const hash=await crypto.subtle.digest('SHA-256',data); return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function dbInsert(table,row){ if(!APP.sb) throw new Error('Supabase is not connected.'); const {error}=await APP.sb.from(table).insert(row); if(error) throw error; }
async function dbUpsert(table,row){ if(!APP.sb) throw new Error('Supabase is not connected.'); const {error}=await APP.sb.from(table).upsert(row); if(error) throw error; }
async function loadTable(t){ if(!APP.sb){ APP[t]=[]; return; } const {data,error}=await APP.sb.from(t).select('*').order('created_at',{ascending:false}); if(error){ console.warn('Could not load '+t, error); APP[t]=APP[t]||[]; return; } APP[t]=data||[]; }
async function loadAll(){ for(const t of ['profiles','partners','links','moods','notes','activities','albums','photos','recordings','messages','calls']) await loadTable(t); }
function subscribeRealtime(){
  APP.realtimeChannels.forEach(c=>APP.sb.removeChannel(c)); APP.realtimeChannels=[];
  ['profiles','partners','links','moods','notes','activities','albums','photos','recordings','messages','calls','signals'].forEach(t=>{
    const ch=APP.sb.channel('public:'+t).on('postgres_changes',{event:'*',schema:'public',table:t},async payload=>{ await loadAll(); renderAll(); handleNotification(payload); }).subscribe(); APP.realtimeChannels.push(ch);
  });
}
async function createProfile(){
  const btn=$('#createProfileBtn');
  const name=$('#qName').value.trim(), pass=$('#qPasscode').value.trim();
  if(!name||!pass) return setAuthStatus('Enter a name and recovery passcode.');
  if(pass.length < 4) return setAuthStatus('Use a recovery passcode with at least 4 characters.');
  if(!APP.sb) return setAuthStatus('Cloud connection is not ready. Refresh once, then try again.');
  btn.disabled=true; btn.textContent='Creating cloud profile...'; setAuthStatus('Creating profile in Supabase...');
  try {
    const passcode_hash=await sha256(pass);
    const p={ id:uid(), name, basics:$('#qBasics').value.trim(), personality:$('#qPersonality').value.trim(), needs:$('#qNeeds').value.trim(), life:$('#qLife').value.trim(), passcode_hash, updated_at:now(), created_at:now() };
    const {error}=await APP.sb.from('profiles').insert(p);
    if(error) throw error;
    APP.profile=p;
    saveLS('cc_active_profile',{id:p.id,passcodeHash:passcode_hash});
    await loadAll();
    show('appScreen');
    renderAll();
    setAuthStatus('');
    toast('Profile created. Save your profile code and recovery passcode to sign in on another browser.');
  } catch(e) {
    console.error('Profile creation failed:', e);
    setAuthStatus('Profile creation failed: ' + friendlySupabaseError(e));
  } finally {
    btn.disabled=false; btn.textContent='Create cloud profile';
  }
}
async function loginProfile(){ const id=$('#loginProfileId').value.trim(), pass=$('#loginPasscode').value.trim(); if(!id||!pass)return setAuthStatus('Enter profile code and passcode.'); if(!APP.sb)return setAuthStatus('Cloud connection is not ready.'); setAuthStatus('Signing in...'); await loadProfile(id, await sha256(pass), true); }
async function loadProfile(id,passcodeHash=null,showErrors=false){
  await loadAll(); const p=APP.profiles.find(x=>x.id===id); if(!p){ if(showErrors) setAuthStatus('Profile not found. Check the profile code.'); return show('authScreen'); }
  if(p.passcode_hash && passcodeHash && p.passcode_hash!==passcodeHash){ if(showErrors) setAuthStatus('Incorrect recovery passcode.'); return show('authScreen'); }
  APP.profile=p; saveLS('cc_active_profile',{id:p.id,passcodeHash:passcodeHash||p.passcode_hash}); setAuthStatus(''); show('appScreen'); renderAll();
}
function linkedIds(){ return APP.links.filter(l=>l.profile_a===APP.profile?.id||l.profile_b===APP.profile?.id).map(l=>l.profile_a===APP.profile.id?l.profile_b:l.profile_a); }
function visibleProfileIds(){ return [APP.profile?.id,...linkedIds()].filter(Boolean); }
function nameOf(id){ return APP.profiles.find(p=>p.id===id)?.name || (id===APP.profile?.id?APP.profile.name:'Linked profile'); }
async function saveProfileEdits(){ Object.assign(APP.profile,{name:$('#editName').value,basics:$('#editBasics').value,personality:$('#editPersonality').value,needs:$('#editNeeds').value,life:$('#editLife').value,updated_at:now()}); await dbUpsert('profiles',APP.profile); await loadAll(); renderAll(); toast('Public profile saved.'); }
async function addPartner(){ const name=$('#partnerName').value.trim(); if(!name)return; await dbInsert('partners',{id:uid(),owner_id:APP.profile.id,name,notes:$('#partnerNotes').value,created_at:now()}); $('#partnerName').value=''; $('#partnerNotes').value=''; await loadAll(); renderAll(); }
async function linkPartner(){ const code=$('#partnerLinkCode').value.trim(); if(!code||code===APP.profile.id)return toast('Paste another profile code.'); if(!APP.profiles.find(p=>p.id===code)) return toast('Profile not found. Ask your partner to create a profile first.'); const exists=APP.links.some(l=>(l.profile_a===APP.profile.id&&l.profile_b===code)||(l.profile_a===code&&l.profile_b===APP.profile.id)); if(exists)return toast('Already linked.'); await dbInsert('links',{id:uid(),profile_a:APP.profile.id,profile_b:code,created_at:now()}); $('#partnerLinkCode').value=''; await loadAll(); renderAll(); }
async function saveMood(){ await dbInsert('moods',{id:uid(),profile_id:APP.profile.id,mood:APP.selectedMood,note:$('#moodNote').value,created_at:now()}); $('#moodNote').value=''; }
async function saveNote(){ const body=$('#publicNote').value.trim(); if(!body)return; await dbInsert('notes',{id:uid(),profile_id:APP.profile.id,body,created_at:now()}); $('#publicNote').value=''; }
async function postActivity(body){ await dbInsert('activities',{id:uid(),profile_id:APP.profile.id,body,created_at:now()}); }
async function createAlbum(){
  const name=$('#albumName').value.trim(); if(!name) return toast('Enter an album name.');
  $('#albumStatus').textContent='Creating album...';
  try{ await dbInsert('albums',{id:uid(),owner_id:APP.profile.id,name,visibility:$('#albumVisibility').value,created_at:now()}); $('#albumName').value=''; await loadAll(); renderAll(); $('#albumStatus').textContent='Album created.'; }
  catch(e){ console.error(e); $('#albumStatus').textContent='Album failed: '+e.message; toast('Album creation failed. Run the latest supabase-schema.sql first.'); }
}
async function fileToDataUrl(file){ return new Promise((res,rej)=>{const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file);}); }
async function uploadPhotos(){
  const album_id=$('#albumSelect').value; if(!album_id)return toast('Create or select an album first.'); const files=[...$('#photoInput').files]; if(!files.length)return toast('Choose photos first.');
  for(const f of files){ const path=`${APP.profile.id}/${album_id}/${Date.now()}-${f.name.replace(/[^a-z0-9_.-]/gi,'_')}`; let url=null, data_url=null;
    const up=await APP.sb.storage.from(MEDIA_BUCKET).upload(path,f,{upsert:false,contentType:f.type});
    if(!up.error){ url=APP.sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl; }
    else { console.warn('Storage upload failed, saving fallback base64:', up.error); data_url=await fileToDataUrl(f); }
    await dbInsert('photos',{id:uid(),album_id,owner_id:APP.profile.id,name:f.name,type:f.type,storage_path:url?path:null,url,data_url,created_at:now()});
  }
  $('#photoInput').value=''; await loadAll(); renderAll();
}
async function keyFromPhrase(phrase){ const keymat=await crypto.subtle.importKey('raw',new TextEncoder().encode(phrase),'PBKDF2',false,['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2',salt:new TextEncoder().encode('couples-connect-v1'),iterations:120000,hash:'SHA-256'},keymat,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); }
async function encryptText(text,phrase){ const iv=crypto.getRandomValues(new Uint8Array(12)); const key=await keyFromPhrase(phrase); const buf=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text)); return {cipher:btoa(String.fromCharCode(...new Uint8Array(buf))),iv:btoa(String.fromCharCode(...iv))}; }
async function decryptText(cipher,iv,phrase){ const key=await keyFromPhrase(phrase); const data=Uint8Array.from(atob(cipher),c=>c.charCodeAt(0)); const ivb=Uint8Array.from(atob(iv),c=>c.charCodeAt(0)); const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:ivb},key,data); return new TextDecoder().decode(clear); }
async function sendEncryptedMessage(){ const to=$('#messageTo').value, body=$('#messageBody').value.trim(), phrase=$('#messagePhrase').value; if(!to||!body||!phrase)return toast('Choose recipient, message and shared phrase.'); const enc=await encryptText(body,phrase); await dbInsert('messages',{id:uid(),from_id:APP.profile.id,to_id:to,cipher:enc.cipher,iv:enc.iv,created_at:now()}); $('#messageBody').value=''; await loadAll(); renderAll(); }
async function renderMessages(){ const phrase=$('#messagePhrase').value; const mine=APP.messages.filter(m=>m.from_id===APP.profile.id||m.to_id===APP.profile.id).slice(0,30); const parts=[]; for(const m of mine){ let body='Encrypted message. Enter shared phrase to decrypt.'; if(phrase){ try{ body=await decryptText(m.cipher,m.iv,phrase); }catch{} } parts.push(`<div class="feed-item"><strong>${escapeHtml(nameOf(m.from_id))} → ${escapeHtml(nameOf(m.to_id))}</strong><br>${escapeHtml(body)}<br><small>${new Date(m.created_at).toLocaleString()}</small></div>`); } $('#messagesFeed').innerHTML=parts.join('')||'<p class="muted">No messages yet.</p>'; }
function renderAll(){ if(!APP.profile)return; $('#activeProfileText').textContent=`Signed in as ${APP.profile.name}`; $('#myLinkCode').textContent=APP.profile.id; $('#profilePreview').textContent=JSON.stringify({profileCode:APP.profile.id, name:APP.profile.name},null,2); fillProfileEdit(); renderFeeds(); renderProfiles(); renderPartners(); renderAlbums(); renderSelectors(); renderMessages(); renderRecordingBanner(); }
function fillProfileEdit(){ $('#editName').value=APP.profile.name||''; $('#editBasics').value=APP.profile.basics||''; $('#editPersonality').value=APP.profile.personality||''; $('#editNeeds').value=APP.profile.needs||''; $('#editLife').value=APP.profile.life||''; }
function renderFeeds(){ const ids=visibleProfileIds(); $('#moodFeed').innerHTML=APP.moods.filter(x=>ids.includes(x.profile_id)).slice(0,12).map(x=>`<div class="feed-item"><strong>${x.mood} ${escapeHtml(nameOf(x.profile_id))}</strong><br>${escapeHtml(x.note||'Checked in')}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<p class="muted">No moods yet.</p>'; $('#notesFeed').innerHTML=APP.notes.filter(x=>ids.includes(x.profile_id)).slice(0,12).map(x=>`<div class="feed-item"><strong>${escapeHtml(nameOf(x.profile_id))}</strong><br>${escapeHtml(x.body)}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<p class="muted">No notes yet.</p>'; $('#activityFeed').innerHTML=APP.activities.filter(x=>ids.includes(x.profile_id)).slice(0,12).map(x=>`<div class="feed-item"><strong>${escapeHtml(nameOf(x.profile_id))}</strong>: ${escapeHtml(x.body)}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<p class="muted">No activity yet.</p>'; }
function renderProfiles(){ const ids=visibleProfileIds(); $('#publicProfiles').innerHTML=APP.profiles.filter(p=>ids.includes(p.id)).map(p=>`<div class="partner-card"><h3>${escapeHtml(p.name)}</h3><p><b>Basics:</b> ${escapeHtml(p.basics||'')}</p><p><b>Personality:</b> ${escapeHtml(p.personality||'')}</p><p><b>Needs:</b> ${escapeHtml(p.needs||'')}</p><p><b>Life:</b> ${escapeHtml(p.life||'')}</p></div>`).join(''); }
function renderPartners(){ const privateCards=APP.partners.filter(p=>p.owner_id===APP.profile.id).map(p=>`<div class="partner-card"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.notes||'')}</p><small>Private card</small></div>`).join(''); const linked=linkedIds().map(id=>`<div class="partner-card"><h3>${escapeHtml(nameOf(id))}</h3><p>Linked cloud profile</p><small>${id}</small></div>`).join(''); $('#partnerList').innerHTML=privateCards+linked || '<p class="muted">No partners yet.</p>'; }
function renderAlbums(){ const ids=visibleProfileIds(); const visible=APP.albums.filter(a=>a.owner_id===APP.profile.id || (a.visibility==='shared' && ids.includes(a.owner_id))); $('#albumSelect').innerHTML=visible.map(a=>`<option value="${a.id}">${escapeHtml(a.name)} (${a.visibility})</option>`).join(''); $('#albumGrid').innerHTML=visible.map(a=>{ const ps=APP.photos.filter(p=>p.album_id===a.id); return `<div class="album-card"><h3>${escapeHtml(a.name)}</h3><p class="muted">${a.visibility} • ${escapeHtml(nameOf(a.owner_id))}</p><div class="photo-grid">${ps.map(p=>`<a href="${p.url||p.data_url}" download="${escapeHtml(p.name)}"><img src="${p.url||p.data_url}" alt="${escapeHtml(p.name)}"></a>`).join('')}</div></div>`; }).join('') || '<p class="muted">No albums yet.</p>'; }
function renderSelectors(){ const opts=linkedIds().map(id=>`<option value="${id}">${escapeHtml(nameOf(id))}</option>`).join(''); $('#callPartnerSelect').innerHTML=opts; $('#messageTo').innerHTML=opts; $('#recordingsList').innerHTML=APP.recordings.filter(r=>r.owner_id===APP.profile.id).map(r=>`<div class="feed-item"><a href="${r.url||r.data_url}" download="${escapeHtml(r.name)}">${escapeHtml(r.name)}</a><br><small>${new Date(r.created_at).toLocaleString()}</small></div>`).join('')||'<p class="muted">No recordings yet.</p>'; }
async function getMedia(){ APP.localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true}); $('#localVideo').srcObject=APP.localStream; return APP.localStream; }
function newPeer(){ const pc=new RTCPeerConnection({iceServers:TURN_ICE_SERVERS}); pc.ontrack=e=>{APP.remoteStream=e.streams[0]; $('#remoteVideo').srcObject=APP.remoteStream;}; pc.onicecandidate=e=>{ if(e.candidate&&APP.currentCallId) dbInsert('signals',{id:uid(),call_id:APP.currentCallId,from_id:APP.profile.id,type:'ice',payload:e.candidate,created_at:now()}); }; return pc; }
async function startCall(){ const to=$('#callPartnerSelect').value; if(!to)return toast('Link a profile first.'); await getMedia(); APP.peer=newPeer(); APP.localStream.getTracks().forEach(t=>APP.peer.addTrack(t,APP.localStream)); APP.currentCallId=uid(); await dbInsert('calls',{id:APP.currentCallId,from_id:APP.profile.id,to_id:to,status:'ringing',recording:false,created_at:now()}); const offer=await APP.peer.createOffer(); await APP.peer.setLocalDescription(offer); await dbInsert('signals',{id:uid(),call_id:APP.currentCallId,from_id:APP.profile.id,type:'offer',payload:offer,created_at:now()}); listenSignals(); }
async function joinLatestCall(){ const {data}=await APP.sb.from('calls').select('*').or(`to_id.eq.${APP.profile.id},from_id.eq.${APP.profile.id}`).order('created_at',{ascending:false}).limit(1); const call=data?.[0]; if(!call)return toast('No call found.'); APP.currentCallId=call.id; await getMedia(); APP.peer=newPeer(); APP.localStream.getTracks().forEach(t=>APP.peer.addTrack(t,APP.localStream)); listenSignals(); const {data:sigs}=await APP.sb.from('signals').select('*').eq('call_id',call.id).order('created_at',{ascending:true}); for(const s of sigs||[]) await handleSignal(s); }
function listenSignals(){ const ch=APP.sb.channel('signals:'+APP.currentCallId).on('postgres_changes',{event:'INSERT',schema:'public',table:'signals',filter:`call_id=eq.${APP.currentCallId}`},e=>handleSignal(e.new)).subscribe(); APP.realtimeChannels.push(ch); }
async function handleSignal(s){ if(!APP.peer||s.from_id===APP.profile.id)return; if(s.type==='offer'){ await APP.peer.setRemoteDescription(new RTCSessionDescription(s.payload)); const ans=await APP.peer.createAnswer(); await APP.peer.setLocalDescription(ans); await dbInsert('signals',{id:uid(),call_id:APP.currentCallId,from_id:APP.profile.id,type:'answer',payload:ans,created_at:now()}); } if(s.type==='answer') await APP.peer.setRemoteDescription(new RTCSessionDescription(s.payload)); if(s.type==='ice') try{await APP.peer.addIceCandidate(new RTCIceCandidate(s.payload));}catch{} }
function mixedStream(){ const stream=new MediaStream(); if(APP.localStream) APP.localStream.getTracks().forEach(t=>stream.addTrack(t)); if(APP.remoteStream) APP.remoteStream.getTracks().forEach(t=>stream.addTrack(t)); return stream; }
async function toggleRecording(){ if(APP.recorder?.state==='recording'){ APP.recorder.stop(); $('#recordCallBtn').textContent='Start recording'; await setCallRecording(false); return; } if(!confirm('Start recording this call? Make sure everyone on the call consents before continuing.')) return; const stream=mixedStream(); if(!stream.getTracks().length)return toast('Start or join a call before recording.'); APP.recordedChunks=[]; APP.recorder=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm'}); APP.recorder.ondataavailable=e=>{if(e.data.size)APP.recordedChunks.push(e.data)}; APP.recorder.onstop=saveRecording; APP.recorder.start(1000); $('#recordCallBtn').textContent='Stop recording'; await setCallRecording(true); }
async function setCallRecording(v){ if(!APP.currentCallId)return; await APP.sb.from('calls').update({recording:v,status:v?'recording':'active'}).eq('id',APP.currentCallId); await loadAll(); renderRecordingBanner(); }
function renderRecordingBanner(){ const active=APP.calls.find(c=>c.id===APP.currentCallId)?.recording; $('#recordingBanner')?.classList.toggle('hidden',!active); }
async function saveRecording(){ const blob=new Blob(APP.recordedChunks,{type:'video/webm'}); const name=`call-recording-${Date.now()}.webm`; const path=`${APP.profile.id}/recordings/${name}`; let url=null,data_url=null; const up=await APP.sb.storage.from(MEDIA_BUCKET).upload(path,blob,{contentType:'video/webm'}); if(!up.error) url=APP.sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl; else data_url=await fileToDataUrl(blob); await dbInsert('recordings',{id:uid(),owner_id:APP.profile.id,call_id:APP.currentCallId,name,storage_path:url?path:null,url,data_url,created_at:now()}); await loadAll(); renderAll(); }
function hangup(){ APP.recorder?.state==='recording'&&APP.recorder.stop(); APP.peer?.close(); APP.localStream?.getTracks().forEach(t=>t.stop()); APP.peer=null; APP.localStream=null; APP.remoteStream=null; $('#localVideo').srcObject=null; $('#remoteVideo').srcObject=null; setCallRecording(false).catch(()=>{}); }
async function enableNotifications(){ if(!('Notification' in window)) return toast('Notifications are not supported on this browser.'); const p=await Notification.requestPermission(); toast(p==='granted'?'Notifications enabled.':'Notifications not enabled.'); }
function handleNotification(payload){ if(!APP.profile || Notification?.permission!=='granted') return; const n=payload.new; if(!n) return; const ids=visibleProfileIds(); if((n.profile_id&&ids.includes(n.profile_id)&&n.profile_id!==APP.profile.id)||(n.to_id===APP.profile.id)){ new Notification('Couples Connect update',{body:'New linked activity received.',icon:'/icon.png'}); } }
function setupInstallPrompt(){ let promptEvent=null; const standalone=matchMedia('(display-mode: standalone)').matches || navigator.standalone; if(standalone)return; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;$('#installBanner').classList.remove('hidden')}); $('#installBtn').onclick=async()=>{ if(promptEvent){promptEvent.prompt(); await promptEvent.userChoice; $('#installBanner').classList.add('hidden');} else toast('On iPhone/iPad: tap Share, then Add to Home Screen. On Android: use the browser menu, then Install/Add to Home screen.'); }; $('#dismissInstall').onclick=()=>$('#installBanner').classList.add('hidden'); setTimeout(()=>$('#installBanner').classList.remove('hidden'),800); }
function exportBackup(){ const data={profile:APP.profile,partners:APP.partners,links:APP.links,moods:APP.moods,notes:APP.notes,activities:APP.activities,albums:APP.albums,photos:APP.photos,recordings:APP.recordings,messages:APP.messages}; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download='couples-connect-backup.json'; a.click(); }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
