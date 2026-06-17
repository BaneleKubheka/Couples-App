console.log('Couples Connect app version: robust-render-signin-20260617-19');
const SUPABASE_URL = 'https://cmdylttzutpbaovxcfll.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LPi4xeUUk-InGxknaiqJkw_mn4BvnNc';
const MEDIA_BUCKET = 'couples-media';
const ADMIN_PROFILE_ID = '0a10a4c8-db73-4696-bf5d-58472c72304b';
const CACHE_VERSION = 'robust-render-signin-20260617-19';
const TURN_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' }
  // Add TURN when available:
  // { urls: 'turn:your-domain:3478', username: 'user', credential: 'password' }
];

const APP = {
  sb: null,
  profile: null,
  selectedMood: '😊',
  profiles: [], partners: [], links: [], link_requests: [], moods: [], notes: [], activities: [], albums: [], photos: [], recordings: [], messages: [], calls: [], location_shares: [],
  realtimeChannels: [],
  localStream: null, remoteStream: null, peer: null, recorder: null, recordedChunks: [], currentCallId: null,
  recordingCanvas: null, recordingAudioContext: null, recordingAnimation: null,
  liveLocationWatchId: null,
  galleryItems: [], galleryIndex: 0,
  notificationTimer: null
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function setHTML(sel, html){ const el = $(sel); if(el) el.innerHTML = html; else console.warn('Missing UI element for render:', sel); }
function setText(sel, text){ const el = $(sel); if(el) el.textContent = text; else console.warn('Missing UI element for text:', sel); }
function setValue(sel, value){ const el = $(sel); if(el) el.value = value ?? ''; else console.warn('Missing UI element for value:', sel); }
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const now = () => new Date().toISOString();
const saveLS = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
const getLS = (k,d=null)=>{ try { const v=JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const toast = m => alert(m);
const sleep = ms => new Promise(r=>setTimeout(r,ms));

window.addEventListener('load', init);

async function init(){
  try { await clearOldAppCachesSafely(); } catch(e) { console.warn('Cache clear skipped:', e); }
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=' + CACHE_VERSION).catch(()=>{});
  setupInstallPrompt();
  bindUI();
  try {
    if(!window.supabase) throw new Error('Supabase library did not load. Check internet access or CDN blocking.');
    APP.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { realtime:{ params:{ eventsPerSecond:10 } } });
    await loadAll();
    subscribeRealtime();
  } catch(e) {
    console.error(e);
    setAuthStatus('Cloud connection failed: ' + friendlySupabaseError(e));
  }
  const saved = getLS('cc_active_profile');
  if(saved?.id && APP.sb) await loadProfile(saved.id, saved.passcodeHash);
  else show('authScreen');
  setInterval(backgroundRefresh, 30000);
}

async function clearOldAppCachesSafely(){
  if(!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.filter(k=>!k.includes(CACHE_VERSION)).map(k=>caches.delete(k)));
}

function show(id){ $$('.screen').forEach(x=>x.classList.remove('active')); $('#'+id)?.classList.add('active'); }
function on(sel, event, handler){
  const el = typeof sel === 'string' ? $(sel) : sel;
  if(!el){ console.warn('Missing UI element for binding:', sel); return false; }
  if(event === 'click') el.onclick = handler;
  else el.addEventListener(event, handler);
  return true;
}

function bindUI(){
  on('#createProfileBtn','click',createProfile);
  on('#loginBtn','click',loginProfile);
  on('#recoverLocalBtn','click',()=>{const p=getLS('cc_active_profile'); if(p?.id) loadProfile(p.id,p.passcodeHash,true); else toast('No saved profile on this browser.');});
  on('#logoutBtn','click',()=>{ stopLiveLocation(); localStorage.removeItem('cc_active_profile'); location.reload(); });

  $$('.tab').forEach(b=>b.onclick=()=>{ $$('.tab,.tab-panel').forEach(x=>x.classList.remove('active')); b.classList.add('active'); $('#'+b.dataset.tab).classList.add('active'); renderAll(); });

  ['😍','😊','😐','🥺','😔','😡','🤒','✨'].forEach(m=>{const b=document.createElement('button'); b.className='mood'; b.textContent=m; b.onclick=()=>{$$('.mood').forEach(x=>x.classList.remove('active')); b.classList.add('active'); APP.selectedMood=m}; $('#moodButtons')?.appendChild(b);});
  $('#moodButtons .mood')?.classList.add('active');

  on('#saveMoodBtn','click',saveMood);
  on('#saveNoteBtn','click',saveNote);
  on('#saveProfileBtn','click',saveProfileEdits);
  on('#addPartnerBtn','click',addPartner);
  on('#linkPartnerBtn','click',linkPartner);
  on('#sendLinkRequestBtn','click',sendLinkRequest);
  on('#createAlbumBtn','click',createAlbum);
  on('#uploadMediaBtn','click',uploadMedia);
  $$('.quick-actions button').forEach(b=>b.onclick=()=>postActivity(b.dataset.prompt));
  on('#sendMessageBtn','click',sendEncryptedMessage);
  on('#enableNotificationsBtn','click',enableNotifications);
  on('#callHubPartnerSelect','change',renderCallHub);
  on('#whatsappCallBtn','click',openWhatsAppCall);
  on('#phoneCallBtn','click',openPhoneCall);
  on('#facetimeVideoBtn','click',openFaceTimeVideo);
  on('#facetimeAudioBtn','click',openFaceTimeAudio);
  on('#saveCallNoteBtn','click',saveCallNote);
  on('#shareLocationOnceBtn','click',shareLocationOnce);
  on('#startLiveLocationBtn','click',startLiveLocation);
  on('#stopLiveLocationBtn','click',stopLiveLocation);
  on('#refreshLocationsBtn','click',async()=>{await loadAll(); renderLocations();});
  on('#copyProfileCodeBtn','click',copyProfileCode);
  on('#exportBtn','click',exportBackup);
  on('#clearLocalBtn','click',()=>{ if(confirm('Clear only this browser? Cloud data remains in Supabase.')){ localStorage.clear(); location.reload(); } });

  document.addEventListener('keydown', e=>{
    if(!$('#galleryModal') || $('#galleryModal').classList.contains('hidden')) return;
    if(e.key==='Escape') closeGallery();
    if(e.key==='ArrowRight') galleryNext();
    if(e.key==='ArrowLeft') galleryPrev();
  });
}

function setAuthStatus(message){ const el=$('#authStatus'); if(el) el.textContent=message||''; }
function setMediaStatus(message){ const el=$('#mediaStatus'); if(el) el.textContent=message||''; }
function setLocationStatus(message){ const el=$('#locationStatus'); if(el) el.textContent=message||''; }
function friendlySupabaseError(e){ const msg=(e?.message||String(e)); if(msg.includes('relation')||msg.includes('schema cache')) return msg + ' — run the latest supabase-schema.sql in Supabase SQL Editor.'; if(msg.includes('row-level security')) return msg + ' — run the schema again to create the RLS policies.'; if(msg.includes('Bucket not found')) return 'Storage bucket not found — run supabase-schema.sql to create couples-media.'; if(msg.includes('Failed to fetch')) return 'Could not reach Supabase. Check internet, Supabase URL/key, and browser blocking.'; return msg; }
async function sha256(text){ const data=new TextEncoder().encode(text); const hash=await crypto.subtle.digest('SHA-256',data); return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join(''); }

async function dbInsert(table,row){ if(!APP.sb) throw new Error('Supabase is not connected.'); const {error}=await APP.sb.from(table).insert(row); if(error) throw error; }
async function dbUpsert(table,row){ if(!APP.sb) throw new Error('Supabase is not connected.'); const {error}=await APP.sb.from(table).upsert(row); if(error) throw error; }
async function dbDelete(table,id,ownerField=null){ if(!APP.sb) throw new Error('Supabase is not connected.'); let q=APP.sb.from(table).delete().eq('id',id); if(ownerField) q=q.eq(ownerField,APP.profile.id); const {error}=await q; if(error) throw error; }
async function dbUpdate(table,id,row,ownerField=null){ if(!APP.sb) throw new Error('Supabase is not connected.'); let q=APP.sb.from(table).update(row).eq('id',id); if(ownerField) q=q.eq(ownerField,APP.profile.id); const {error}=await q; if(error) throw error; }
async function loadTable(t){ if(!APP.sb){ APP[t]=[]; return; } const {data,error}=await APP.sb.from(t).select('*').order('created_at',{ascending:false}); if(error){ console.warn('Could not load '+t, error); APP[t]=APP[t]||[]; return; } APP[t]=data||[]; }
async function loadAll(){ for(const t of ['profiles','partners','links','link_requests','moods','notes','activities','albums','photos','recordings','messages','calls','location_shares']) await loadTable(t); }

function subscribeRealtime(){
  APP.realtimeChannels.forEach(c=>APP.sb.removeChannel(c)); APP.realtimeChannels=[];
  ['profiles','partners','links','link_requests','moods','notes','activities','albums','photos','recordings','messages','calls','signals','location_shares'].forEach(t=>{
    const ch=APP.sb.channel('public:'+t).on('postgres_changes',{event:'*',schema:'public',table:t},async payload=>{ await loadAll(); renderAll(); handleNotification(payload); }).subscribe();
    APP.realtimeChannels.push(ch);
  });
}

async function backgroundRefresh(){
  if(!APP.profile || document.hidden) return;
  try { await loadAll(); renderAll(); } catch(e) { console.warn('Background refresh failed:', e); }
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
    await loadAll(); show('appScreen'); renderAll(); setAuthStatus('');
    toast('Profile created. Save your profile code and recovery passcode to sign in on another browser.');
  } catch(e) { console.error('Profile creation failed:', e); setAuthStatus('Profile creation failed: ' + friendlySupabaseError(e)); }
  finally { btn.disabled=false; btn.textContent='Create cloud profile'; }
}
async function loginProfile(){
  const btn=$('#loginBtn');
  const id=$('#loginProfileId')?.value.trim();
  const pass=$('#loginPasscode')?.value.trim();
  if(!id||!pass) return setAuthStatus('Enter profile code and passcode.');
  if(!APP.sb) return setAuthStatus('Cloud connection is not ready. Refresh the page and check your internet connection.');
  try{
    if(btn){ btn.disabled=true; btn.textContent='Signing in...'; }
    setAuthStatus('Signing in...');
    await loadProfile(id, await sha256(pass), true);
  }catch(e){
    console.error('Sign in failed:', e);
    setAuthStatus('Sign in failed: '+friendlySupabaseError(e));
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='Sign in'; }
  }
}
async function loadProfile(id,passcodeHash=null,showErrors=false){
  let p=null;
  try{
    if(APP.sb){
      const {data,error}=await APP.sb.from('profiles').select('*').eq('id',id).maybeSingle();
      if(error) throw error;
      p=data;
      await loadAll();
    } else {
      await loadAll();
      p=APP.profiles.find(x=>x.id===id);
    }
    if(!p){ if(showErrors) setAuthStatus('Profile not found. Check the profile code.'); return show('authScreen'); }
    if(p.passcode_hash && passcodeHash && p.passcode_hash!==passcodeHash){ if(showErrors) setAuthStatus('Incorrect recovery passcode.'); return show('authScreen'); }
    APP.profile=p; saveLS('cc_active_profile',{id:p.id,passcodeHash:passcodeHash||p.passcode_hash}); setAuthStatus(''); show('appScreen'); renderAll();
  } catch(e){
    console.error('Profile load failed:', e);
    if(showErrors) setAuthStatus('Sign in failed: '+friendlySupabaseError(e));
    show('authScreen');
  }
}

function linkedIds(){ return APP.links.filter(l=>l.profile_a===APP.profile?.id||l.profile_b===APP.profile?.id).map(l=>l.profile_a===APP.profile.id?l.profile_b:l.profile_a); }
function visibleProfileIds(){ return [APP.profile?.id,...linkedIds()].filter(Boolean); }
function nameOf(id){ return APP.profiles.find(p=>p.id===id)?.name || (id===APP.profile?.id?APP.profile.name:'Linked profile'); }
function isAdmin(){ return APP.profile?.id === ADMIN_PROFILE_ID; }
function pairMatches(a,b,x,y){ return (a===x && b===y) || (a===y && b===x); }
function hasActivePartner(){ return linkedIds().length > 0; }

async function copyProfileCode(){ await navigator.clipboard?.writeText(APP.profile.id); toast('Profile code copied.'); }
async function saveProfileEdits(){ Object.assign(APP.profile,{name:$('#editName').value,basics:$('#editBasics').value,personality:$('#editPersonality').value,needs:$('#editNeeds').value,life:$('#editLife').value,phone:$('#editPhone')?.value||'',whatsapp:$('#editWhatsApp')?.value||'',facetime:$('#editFacetime')?.value||'',updated_at:now()}); await dbUpsert('profiles',APP.profile); await loadAll(); renderAll(); toast('Public profile saved.'); }
async function addPartner(){ const name=$('#partnerName')?.value.trim(); if(!name)return; await dbInsert('partners',{id:uid(),owner_id:APP.profile.id,name,notes:$('#partnerNotes').value,created_at:now()}); $('#partnerName').value=''; $('#partnerNotes').value=''; await loadAll(); renderAll(); }
async function linkPartner(){
  if(!isAdmin()) return toast('Only the app owner/admin can use Partner Management. Use Settings > Request partner link instead.');
  const code=$('#partnerLinkCode')?.value.trim();
  if(!code||code===APP.profile.id) return toast('Paste another profile code.');
  if(!APP.profiles.find(p=>p.id===code)) return toast('Profile not found. Ask the user to create a profile first.');
  const exists=APP.links.some(l=>pairMatches(l.profile_a,l.profile_b,APP.profile.id,code));
  if(exists) return toast('Already linked.');
  await dbInsert('links',{id:uid(),profile_a:APP.profile.id,profile_b:code,created_at:now()});
  $('#partnerLinkCode').value=''; await loadAll(); renderAll(); toast('Profiles linked by admin.');
}


async function removeLinkedProfile(linkId){
  if(!isAdmin()) return toast('Only the app owner/admin can remove accepted profile links.');
  const link=APP.links.find(l=>l.id===linkId);
  if(!link) return toast('Link not found.');
  const other=link.profile_a===APP.profile.id?link.profile_b:link.profile_a;
  if(!confirm(`Remove accepted link with ${nameOf(other)}? This will stop shared access between these profiles.`)) return;
  try{ await dbDelete('links', link.id); await loadAll(); renderAll(); toast('Linked profile removed.'); }
  catch(e){ console.error(e); toast('Could not remove link: '+friendlySupabaseError(e)); }
}

async function sendLinkRequest(){
  const input=$('#requestPartnerCode'); const status=$('#linkRequestStatus');
  const code=(input?.value||'').trim();
  if(status) status.textContent='';
  if(!code || code===APP.profile.id){ if(status) status.textContent='Paste another profile code.'; return; }
  if(!APP.profiles.find(p=>p.id===code)){ if(status) status.textContent='Profile not found. Ask them to create a profile first.'; return; }
  if(!isAdmin() && hasActivePartner()){ if(status) status.textContent='This profile is already linked. Unlinking requires admin assistance.'; return; }
  if(APP.links.some(l=>pairMatches(l.profile_a,l.profile_b,APP.profile.id,code))){ if(status) status.textContent='You are already linked to this profile.'; return; }
  const existing=APP.link_requests.find(r=>pairMatches(r.requester_id,r.recipient_id,APP.profile.id,code) && r.status==='pending');
  if(existing){ if(status) status.textContent='A pending request already exists.'; return; }
  try{
    if(status) status.textContent='Sending request...';
    await dbInsert('link_requests',{id:uid(),requester_id:APP.profile.id,recipient_id:code,status:'pending',created_at:now(),updated_at:now()});
    if(input) input.value=''; await loadAll(); renderAll(); if(status) status.textContent='Link request sent. The other profile must accept it.';
  }catch(e){ console.error(e); if(status) status.textContent='Request failed: '+friendlySupabaseError(e); }
}

async function acceptLinkRequest(requestId){
  const req=APP.link_requests.find(r=>r.id===requestId && r.recipient_id===APP.profile.id && r.status==='pending');
  if(!req) return toast('Request not found.');
  if(!isAdmin() && hasActivePartner()) return toast('This profile is already linked. Unlinking requires admin assistance.');
  try{
    await dbUpdate('link_requests', req.id, {status:'accepted', updated_at:now(), accepted_at:now()});
    const exists=APP.links.some(l=>pairMatches(l.profile_a,l.profile_b,req.requester_id,req.recipient_id));
    if(!exists) await dbInsert('links',{id:uid(),profile_a:req.requester_id,profile_b:req.recipient_id,created_at:now()});
    await loadAll(); renderAll(); toast('Link request accepted. Shared content is now visible to both profiles.');
  }catch(e){ console.error(e); toast('Accept failed: '+friendlySupabaseError(e)); }
}
async function rejectLinkRequest(requestId){
  const req=APP.link_requests.find(r=>r.id===requestId && (r.recipient_id===APP.profile.id || r.requester_id===APP.profile.id) && r.status==='pending');
  if(!req) return toast('Request not found.');
  try{ await dbUpdate('link_requests', req.id, {status:'rejected', updated_at:now()}); await loadAll(); renderAll(); }
  catch(e){ console.error(e); toast('Reject failed: '+friendlySupabaseError(e)); }
}
function renderLinkRequests(){
  const panel=$('#linkRequestsPanel'); if(!panel || !APP.profile) return;
  const incoming=APP.link_requests.filter(r=>r.recipient_id===APP.profile.id && r.status==='pending');
  const outgoing=APP.link_requests.filter(r=>r.requester_id===APP.profile.id && r.status==='pending');
  const linked=linkedIds();
  const incomingHtml=incoming.map(r=>`<div class="feed-item"><strong>${escapeHtml(nameOf(r.requester_id))}</strong> wants to link with you.<br><small>${new Date(r.created_at).toLocaleString()}</small><br><button type="button" onclick="acceptLinkRequest('${r.id}')">Accept</button><button type="button" class="danger" onclick="rejectLinkRequest('${r.id}')">Reject</button></div>`).join('');
  const outgoingHtml=outgoing.map(r=>`<div class="feed-item">Request sent to <strong>${escapeHtml(nameOf(r.recipient_id))}</strong>.<br><small>${new Date(r.created_at).toLocaleString()}</small><br><button type="button" class="danger" onclick="rejectLinkRequest('${r.id}')">Cancel request</button></div>`).join('');
  const linkedHtml=linked.map(id=>`<div class="feed-item"><strong>Linked with ${escapeHtml(nameOf(id))}</strong><br><small>${id}</small></div>`).join('');
  panel.innerHTML = `${linkedHtml || '<p class="muted">No accepted partner link yet.</p>'}${incomingHtml?'<h3>Incoming requests</h3>'+incomingHtml:''}${outgoingHtml?'<h3>Outgoing requests</h3>'+outgoingHtml:''}`;
}
async function saveMood(){ await dbInsert('moods',{id:uid(),profile_id:APP.profile.id,mood:APP.selectedMood,note:$('#moodNote').value,created_at:now()}); $('#moodNote').value=''; await loadAll(); renderAll(); }
async function saveNote(){ const body=$('#publicNote').value.trim(); if(!body)return; await dbInsert('notes',{id:uid(),profile_id:APP.profile.id,body,created_at:now()}); $('#publicNote').value=''; await loadAll(); renderAll(); }
async function postActivity(body){ await dbInsert('activities',{id:uid(),profile_id:APP.profile.id,body,created_at:now()}); await loadAll(); renderAll(); }
async function createAlbum(){
  const name=$('#albumName').value.trim(); if(!name)return $('#albumStatus').textContent='Enter an album name.';
  $('#createAlbumBtn').disabled=true; $('#albumStatus').textContent='Creating album...';
  try{ await dbInsert('albums',{id:uid(),owner_id:APP.profile.id,name,visibility:$('#albumVisibility').value,created_at:now()}); $('#albumName').value=''; await loadAll(); renderAll(); $('#albumStatus').textContent='Album created.'; }
  catch(e){ console.error(e); $('#albumStatus').textContent='Album creation failed: '+friendlySupabaseError(e); }
  finally{ $('#createAlbumBtn').disabled=false; }
}

function safeFileName(name){ return String(name||'media').replace(/[^a-z0-9_.-]/gi,'_').slice(-120); }
const SUPABASE_FILE_LIMIT = 500 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 1920;
const IMAGE_TARGET_TYPE = 'image/jpeg';

async function ensureStorageBucket(){
  const probe = await APP.sb.storage.from(MEDIA_BUCKET).list(APP.profile.id, {limit:1});
  if(probe.error && /not found|bucket/i.test(probe.error.message || '')) throw new Error('Supabase Storage bucket not found. Run supabase-schema.sql.');
}
function fileExtFromMime(type, fallback){
  if(type==='image/jpeg') return 'jpg';
  if(type==='image/webp') return 'webp';
  if(type==='image/png') return 'png';
  if(type==='video/webm') return 'webm';
  if(type==='video/mp4') return 'mp4';
  return fallback || 'bin';
}
function fileNameWithExt(name, type){
  const ext=fileExtFromMime(type, (name.split('.').pop()||'bin').toLowerCase());
  const base=safeFileName(name).replace(/\.[a-z0-9]{1,8}$/i,'') || 'media';
  return `${base}.${ext}`;
}
async function imageFileToBitmap(file){
  if('createImageBitmap' in window) return createImageBitmap(file, {imageOrientation:'from-image'}).catch(()=>null);
  return null;
}
async function loadImageElement(file){
  const url=URL.createObjectURL(file);
  try{
    const img=new Image(); img.decoding='async'; img.src=url; await img.decode(); return img;
  } finally { setTimeout(()=>URL.revokeObjectURL(url), 1000); }
}
async function canvasToBlob(canvas, type, quality){
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image compression failed.')), type, quality));
}
async function compressImage(file){
  // Always normalise images through canvas. This removes huge phone-camera payloads while keeping visual quality high.
  let source=await imageFileToBitmap(file); let width, height;
  if(source){ width=source.width; height=source.height; }
  else { source=await loadImageElement(file); width=source.naturalWidth; height=source.naturalHeight; }
  const scale=Math.min(1, IMAGE_MAX_DIMENSION / Math.max(width,height));
  const outW=Math.max(1, Math.round(width*scale));
  const outH=Math.max(1, Math.round(height*scale));
  const canvas=document.createElement('canvas'); canvas.width=outW; canvas.height=outH;
  const ctx=canvas.getContext('2d', {alpha:false}); ctx.drawImage(source,0,0,outW,outH);
  if(source.close) source.close();
  let quality=0.86, blob=await canvasToBlob(canvas, IMAGE_TARGET_TYPE, quality);
  while(blob.size>SUPABASE_FILE_LIMIT && quality>0.35){ quality-=0.08; blob=await canvasToBlob(canvas, IMAGE_TARGET_TYPE, quality); }
  const outputName=fileNameWithExt(file.name, IMAGE_TARGET_TYPE);
  return {file:new File([blob], outputName, {type:IMAGE_TARGET_TYPE, lastModified:Date.now()}), originalSize:file.size, compressed:true, note:`image compressed ${formatBytes(file.size)} → ${formatBytes(blob.size)}`};
}
async function transcodeLargeVideo(file){
  // Browser-only video compression is best-effort. It plays the local file through a canvas and records it at lower resolution.
  if(!window.MediaRecorder) throw new Error(`${file.name} is larger than 500MB and this browser cannot compress video. Please trim/compress it before uploading.`);
  const url=URL.createObjectURL(file);
  const video=document.createElement('video'); video.src=url; video.muted=false; video.playsInline=true; video.preload='auto'; video.crossOrigin='anonymous';
  await new Promise((res,rej)=>{ video.onloadedmetadata=res; video.onerror=()=>rej(new Error('Could not read video for compression.')); });
  const duration=Number.isFinite(video.duration) ? video.duration : 0;
  if(!duration || duration>900) throw new Error(`${file.name} is too large/long for browser compression. Please trim or compress it under 500MB first.`);
  const maxW=1280, maxH=720;
  const scale=Math.min(1, maxW/video.videoWidth, maxH/video.videoHeight);
  const canvas=document.createElement('canvas'); canvas.width=Math.max(2,Math.round(video.videoWidth*scale)); canvas.height=Math.max(2,Math.round(video.videoHeight*scale));
  const ctx=canvas.getContext('2d');
  const fps=24;
  const canvasStream=canvas.captureStream ? canvas.captureStream(fps) : null;
  if(!canvasStream) throw new Error('This browser cannot compress video via canvas.captureStream.');
  // Try to keep the original audio by capturing the element stream where the browser allows it.
  const captured = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
  if(captured) captured.getAudioTracks().forEach(t=>canvasStream.addTrack(t));
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t)) || '';
  const chunks=[]; const recorder=new MediaRecorder(canvasStream, mime ? {mimeType:mime, videoBitsPerSecond:1800000, audioBitsPerSecond:96000} : undefined);
  recorder.ondataavailable=e=>{ if(e.data.size) chunks.push(e.data); };
  const done=new Promise(resolve=>recorder.onstop=resolve);
  function draw(){ if(video.paused || video.ended) return; ctx.drawImage(video,0,0,canvas.width,canvas.height); requestAnimationFrame(draw); }
  setMediaStatus(`Compressing large video: ${file.name}. Keep this tab open until it finishes.`);
  recorder.start(1000); await video.play(); draw();
  await new Promise(resolve=>video.onended=resolve);
  recorder.stop(); await done; URL.revokeObjectURL(url);
  const blob=new Blob(chunks,{type:recorder.mimeType || 'video/webm'});
  if(blob.size>SUPABASE_FILE_LIMIT) throw new Error(`${file.name} is still ${formatBytes(blob.size)} after browser compression. Please trim/compress it below 500MB before uploading.`);
  const outputName=fileNameWithExt(file.name, blob.type || 'video/webm');
  return {file:new File([blob], outputName, {type:blob.type || 'video/webm', lastModified:Date.now()}), originalSize:file.size, compressed:true, note:`video compressed ${formatBytes(file.size)} → ${formatBytes(blob.size)}`};
}
async function prepareMediaFile(file){
  const isVideo=file.type.startsWith('video/'); const isImage=file.type.startsWith('image/');
  if(!isVideo && !isImage) throw new Error(`${file.name} is not a supported photo/video.`);
  if(isImage) return await compressImage(file);
  if(file.size <= SUPABASE_FILE_LIMIT) return {file, originalSize:file.size, compressed:false, note:'video kept original'};
  return await transcodeLargeVideo(file);
}
async function uploadOneFile(file, album_id, index, total){
  const prepared=await prepareMediaFile(file);
  const uploadFile=prepared.file;
  if(uploadFile.size > SUPABASE_FILE_LIMIT) throw new Error(`${file.name} is ${formatBytes(uploadFile.size)} after compression and exceeds Supabase's 500MB limit.`);
  const isVideo=uploadFile.type.startsWith('video/');
  const kind=isVideo?'video':'image';
  const path=`${APP.profile.id}/${album_id}/${kind}s/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeFileName(uploadFile.name)}`;
  setMediaStatus(`Uploading ${index}/${total}: ${uploadFile.name} (${formatBytes(uploadFile.size)})`);
  const up=await APP.sb.storage.from(MEDIA_BUCKET).upload(path,uploadFile,{upsert:false,contentType:uploadFile.type || (isVideo?'video/webm':'image/jpeg')});
  if(up.error) throw up.error;
  const url=APP.sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  const row={id:uid(),album_id,owner_id:APP.profile.id,name:uploadFile.name,type:uploadFile.type,media_kind:kind,storage_path:path,url,size_bytes:uploadFile.size,original_size_bytes:prepared.originalSize,compressed:prepared.compressed,compression_note:prepared.note,created_at:now(),updated_at:now()};
  const {error}=await APP.sb.from('photos').insert(row);
  if(error){ await APP.sb.storage.from(MEDIA_BUCKET).remove([path]).catch(()=>{}); throw error; }
  return row;
}
async function uploadMedia(){
  const album_id=$('#albumSelect').value;
  if(!album_id) return toast('Create or select one of your own albums first.');
  const input=$('#mediaInput'); const files=[...input.files];
  if(!files.length) return toast('Choose photos or videos first.');
  $('#uploadMediaBtn').disabled=true; setMediaStatus(`Preparing ${files.length} upload(s). Images will be compressed automatically; videos over 500MB will be compressed where the browser supports it.`);
  let ok=0, failed=0; const errors=[];
  try{
    const batchSize=2;
    for(let i=0;i<files.length;i+=batchSize){
      const batch=files.slice(i,i+batchSize);
      const results=await Promise.allSettled(batch.map((f,j)=>uploadOneFile(f, album_id, i+j+1, files.length)));
      for(const r of results){
        if(r.status==='fulfilled') ok++;
        else { failed++; const msg=friendlySupabaseError(r.reason); errors.push(msg); console.error('Upload failed:', r.reason); }
      }
      await loadAll(); renderAlbums();
      setMediaStatus(`Progress: ${ok} saved, ${failed} failed out of ${files.length}.`);
    }
    input.value='';
    const firstError=errors[0] ? ` First error: ${errors[0]}` : '';
    setMediaStatus(`Upload complete. ${ok} saved${failed?`, ${failed} failed.${firstError}`:''}`);
  }catch(e){ console.error(e); setMediaStatus('Upload failed: '+friendlySupabaseError(e)); }
  finally{ $('#uploadMediaBtn').disabled=false; await loadAll(); renderAll(); }
}

async function keyFromPhrase(phrase){ const keymat=await crypto.subtle.importKey('raw',new TextEncoder().encode(phrase),'PBKDF2',false,['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2',salt:new TextEncoder().encode('couples-connect-v1'),iterations:120000,hash:'SHA-256'},keymat,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); }
async function encryptText(text,phrase){ const iv=crypto.getRandomValues(new Uint8Array(12)); const key=await keyFromPhrase(phrase); const buf=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text)); return {cipher:btoa(String.fromCharCode(...new Uint8Array(buf))),iv:btoa(String.fromCharCode(...iv))}; }
async function decryptText(cipher,iv,phrase){ const key=await keyFromPhrase(phrase); const data=Uint8Array.from(atob(cipher),c=>c.charCodeAt(0)); const ivb=Uint8Array.from(atob(iv),c=>c.charCodeAt(0)); const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:ivb},key,data); return new TextDecoder().decode(clear); }
async function sendEncryptedMessage(){ const to=$('#messageTo').value, body=$('#messageBody').value.trim(), phrase=$('#messagePhrase').value; if(!to||!body||!phrase)return toast('Choose recipient, message and shared phrase.'); const enc=await encryptText(body,phrase); await dbInsert('messages',{id:uid(),from_id:APP.profile.id,to_id:to,cipher:enc.cipher,iv:enc.iv,created_at:now()}); $('#messageBody').value=''; await loadAll(); renderAll(); }
async function renderMessages(){
  const feed = $('#messagesFeed'); if(!feed) return;
  const phrase = $('#messagePhrase')?.value || '';
  const mine = APP.messages.filter(m=>m.from_id===APP.profile.id||m.to_id===APP.profile.id).slice(0,30);
  const parts=[];
  for(const m of mine){
    let body='Encrypted message. Enter shared phrase to decrypt.';
    if(phrase){ try{ body=await decryptText(m.cipher,m.iv,phrase); }catch{} }
    parts.push(`<div class="feed-item"><strong>${escapeHtml(nameOf(m.from_id))} → ${escapeHtml(nameOf(m.to_id))}</strong><br>${escapeHtml(body)}<br><small>${new Date(m.created_at).toLocaleString()}</small></div>`);
  }
  feed.innerHTML = parts.join('') || '<p class="muted">No messages yet.</p>';
}

function renderAll(){
  if(!APP.profile) return;
  try{ setText('#activeProfileText', `Signed in as ${APP.profile.name || 'Profile'}`); }catch(e){ console.warn(e); }
  try{ setText('#profilePreview', JSON.stringify({profileCode:APP.profile.id, name:APP.profile.name}, null, 2)); }catch(e){ console.warn(e); }
  const renderers=[fillProfileEdit, renderFeeds, renderProfiles, renderAlbums, renderSelectors, renderMessages, renderRecordingBanner, renderLocations, renderSettingsLinking, renderLinkRequests, renderCallHub, renderCallNotes, applyAdminVisibility];
  for(const fn of renderers){ try{ fn(); }catch(e){ console.warn('Render step failed:', fn.name, e); } }
}
function fillProfileEdit(){
  setValue('#editName', APP.profile.name || '');
  setValue('#editBasics', APP.profile.basics || '');
  setValue('#editPersonality', APP.profile.personality || '');
  setValue('#editNeeds', APP.profile.needs || '');
  setValue('#editLife', APP.profile.life || '');
  setValue('#editPhone', APP.profile.phone || '');
  setValue('#editWhatsApp', APP.profile.whatsapp || '');
  setValue('#editFacetime', APP.profile.facetime || '');
}
function renderFeeds(){
  const ids=visibleProfileIds();
  setHTML('#moodFeed', APP.moods.filter(x=>ids.includes(x.profile_id)).slice(0,12).map(x=>`<div class="feed-item"><strong>${x.mood} ${escapeHtml(nameOf(x.profile_id))}</strong><br>${escapeHtml(x.note||'Checked in')}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('') || '<p class="muted">No moods yet.</p>');
  setHTML('#notesFeed', APP.notes.filter(x=>ids.includes(x.profile_id)).slice(0,12).map(x=>`<div class="feed-item"><strong>${escapeHtml(nameOf(x.profile_id))}</strong><br>${escapeHtml(x.body)}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('') || '<p class="muted">No notes yet.</p>');
  setHTML('#activityFeed', APP.activities.filter(x=>ids.includes(x.profile_id)).slice(0,12).map(x=>`<div class="feed-item"><strong>${escapeHtml(nameOf(x.profile_id))}</strong>: ${escapeHtml(x.body)}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('') || '<p class="muted">No activity yet.</p>');
}
function renderProfiles(){
  const ids=visibleProfileIds();
  setHTML('#publicProfiles', APP.profiles.filter(p=>ids.includes(p.id)).map(p=>`<div class="partner-card"><h3>${escapeHtml(p.name)}</h3><p><b>Basics:</b> ${escapeHtml(p.basics||'')}</p><p><b>Personality:</b> ${escapeHtml(p.personality||'')}</p><p><b>Needs:</b> ${escapeHtml(p.needs||'')}</p><p><b>Life:</b> ${escapeHtml(p.life||'')}</p><p><b>Phone:</b> ${escapeHtml(p.phone||'Not supplied')}</p><p><b>WhatsApp:</b> ${escapeHtml(p.whatsapp||p.phone||'Not supplied')}</p><p><b>FaceTime:</b> ${escapeHtml(p.facetime||p.phone||'Not supplied')}</p></div>`).join('') || '<p class="muted">No linked public profile yet.</p>');
}
function renderSettingsLinking(){
  const codeEl=$('#myLinkCode'); if(codeEl) codeEl.textContent=APP.profile.id;
  const requestMyCode=$('#requestMyCode'); if(requestMyCode) requestMyCode.textContent=APP.profile.id;
  const linked=APP.links.filter(l=>l.profile_a===APP.profile?.id||l.profile_b===APP.profile?.id).map(l=>{
    const id=l.profile_a===APP.profile.id?l.profile_b:l.profile_a;
    const adminBtn=isAdmin()?`<br><button type="button" class="danger small" onclick="removeLinkedProfile('${l.id}')">Remove linked profile</button>`:'';
    return `<div class="partner-card"><h3>${escapeHtml(nameOf(id))}</h3><small>${id}</small>${adminBtn}</div>`;
  }).join('');
  const list=$('#linkedProfilesList'); if(list) list.innerHTML=linked || '<p class="muted">No linked profiles yet.</p>';
  renderPartnerManagement();
}
function renderPartnerManagement(){
  const list=$('#partnerList'); if(!list) return;
  if(!isAdmin()){ list.innerHTML=''; return; }
  const cards=APP.links.filter(l=>l.profile_a===APP.profile?.id||l.profile_b===APP.profile?.id).map(l=>{
    const id=l.profile_a===APP.profile.id?l.profile_b:l.profile_a;
    const p=APP.profiles.find(x=>x.id===id)||{};
    return `<div class="partner-card"><h3>${escapeHtml(p.name||'Linked profile')}</h3><p><b>Profile code:</b><br><small>${id}</small></p><p>${escapeHtml(p.basics||'')}</p><button type="button" class="danger small" onclick="removeLinkedProfile('${l.id}')">Remove link</button></div>`;
  }).join('');
  list.innerHTML=cards || '<p class="muted">No linked profiles yet.</p>';
}
function applyAdminVisibility(){
  const admin=isAdmin();
  const tab=$('[data-tab="partners"]');
  const panel=$('#partners');
  if(tab) tab.classList.toggle('hidden', !admin);
  if(panel) panel.classList.toggle('admin-hidden', !admin);
  if(!admin && panel?.classList.contains('active')){
    $$('.tab,.tab-panel').forEach(x=>x.classList.remove('active'));
    $('[data-tab="dashboard"]')?.classList.add('active');
    $('#dashboard')?.classList.add('active');
  }
}

function visibleAlbums(){ const ids=visibleProfileIds(); return APP.albums.filter(a=>a.owner_id===APP.profile.id || (a.visibility==='shared' && ids.includes(a.owner_id))); }
function renderAlbums(){
  const visible=visibleAlbums();
  const ownAlbums=APP.albums.filter(a=>a.owner_id===APP.profile.id);
  setHTML('#albumSelect', ownAlbums.map(a=>`<option value="${a.id}">${escapeHtml(a.name)} (${a.visibility})</option>`).join(''));
  const albumGridHtml = visible.map(a=>{
    const ps=APP.photos.filter(p=>p.album_id===a.id);
    const cover=ps[0];
    const canEdit=a.owner_id===APP.profile.id;
    const albumActions=canEdit ? `<div class="album-actions"><button class="ghost small" onclick="renameAlbum('${a.id}')">Rename</button><button class="danger small" onclick="deleteAlbum('${a.id}')">Delete album</button></div>` : '';
    const coverHtml=cover ? galleryPreview(cover, ps, ownAlbums) : `<div class="empty-album">No media yet</div>`;
    const tiles=ps.slice(1).map((p)=>galleryThumb(p, ps, ownAlbums)).join('');
    return `<div class="album-card gallery-album"><div class="album-head"><div><h3>${escapeHtml(a.name)}</h3><p class="muted">${a.visibility} • ${escapeHtml(nameOf(a.owner_id))} • ${ps.length} item(s)</p></div>${albumActions}</div>${coverHtml}<div class="media-grid compact">${tiles}</div></div>`;
  }).join('') || '<p class="muted">No albums yet.</p>';
  setHTML('#albumGrid', albumGridHtml);
}
function galleryPreview(p, list, ownAlbums){
  const globalIndex=APP.photos.findIndex(x=>x.id===p.id);
  const src=p.url||p.data_url||'';
  const kind=kindOf(p);
  if(kind==='video') return `<button class="gallery-cover" onclick="openGallery('${p.id}')"><video src="${src}" muted playsinline preload="metadata"></video><span>▶ Open gallery</span></button>`;
  return `<button class="gallery-cover" onclick="openGallery('${p.id}')"><img loading="lazy" src="${src}" alt="${escapeHtml(p.name||'media')}"><span>Open gallery</span></button>`;
}
function galleryThumb(p, list, ownAlbums){
  const src=p.url||p.data_url||'';
  const kind=kindOf(p);
  const icon=kind==='video'?'▶':'';
  if(kind==='video') return `<button class="media-thumb" onclick="openGallery('${p.id}')"><video src="${src}" muted playsinline preload="metadata"></video><span>${icon}</span></button>`;
  return `<button class="media-thumb" onclick="openGallery('${p.id}')"><img loading="lazy" src="${src}" alt="${escapeHtml(p.name||'media')}"><span>${icon}</span></button>`;
}
function kindOf(p){ return p.media_kind || ((p.type||'').startsWith('video/')?'video':'image'); }
function openGallery(mediaId){
  APP.galleryItems=visibleAlbums().flatMap(a=>APP.photos.filter(p=>p.album_id===a.id));
  APP.galleryIndex=Math.max(0,APP.galleryItems.findIndex(p=>p.id===mediaId));
  renderGalleryModal();
  $('#galleryModal').classList.remove('hidden');
}
function closeGallery(){ $('#galleryModal')?.classList.add('hidden'); const body=$('#galleryBody'); if(body) body.innerHTML=''; }
function galleryNext(){ if(!APP.galleryItems.length)return; APP.galleryIndex=(APP.galleryIndex+1)%APP.galleryItems.length; renderGalleryModal(); }
function galleryPrev(){ if(!APP.galleryItems.length)return; APP.galleryIndex=(APP.galleryIndex-1+APP.galleryItems.length)%APP.galleryItems.length; renderGalleryModal(); }
function renderGalleryModal(){
  const p=APP.galleryItems[APP.galleryIndex]; if(!p)return;
  const src=p.url||p.data_url||''; const kind=kindOf(p); const ownAlbums=APP.albums.filter(a=>a.owner_id===APP.profile.id); const canEdit=p.owner_id===APP.profile.id;
  const albumOptions=ownAlbums.map(a=>`<option value="${a.id}" ${a.id===p.album_id?'selected':''}>${escapeHtml(a.name)}</option>`).join('');
  $('#galleryTitle').textContent=p.name||'Media';
  $('#galleryCounter').textContent=`${APP.galleryIndex+1} / ${APP.galleryItems.length}`;
  setHTML('#galleryBody', kind==='video' ? `<video class="gallery-media" src="${src}" controls autoplay playsinline></video>` : `<img class="gallery-media" src="${src}" alt="${escapeHtml(p.name||'media')}">`);
  setHTML('#galleryMeta', `<p>${escapeHtml(p.name||'media')}<br><small>${escapeHtml(p.type||kind)} ${p.size_bytes?`• ${formatBytes(p.size_bytes)}`:''}${p.original_size_bytes?` • original ${formatBytes(p.original_size_bytes)}`:''}${p.compressed?' • compressed':''}</small>${p.compression_note?`<br><small>${escapeHtml(p.compression_note)}</small>`:''}</p>
    <div class="gallery-actions"><a class="buttonlike" href="${src}" download="${escapeHtml(p.name||'media')}">Download</a>
    ${canEdit?`<select id="galleryMoveSelect">${albumOptions}</select><button class="secondary" onclick="moveMediaFromGallery('${p.id}')">Move</button><button class="danger" onclick="deleteMediaFromGallery('${p.id}')">Delete</button>`:''}</div>`);
}
async function moveMediaFromGallery(id){ await moveMedia(id, $('#galleryMoveSelect')?.value); APP.galleryItems=APP.galleryItems.filter(Boolean); renderGalleryModal(); }
async function deleteMediaFromGallery(id){ await deleteMedia(id); APP.galleryItems=APP.galleryItems.filter(x=>x.id!==id); if(!APP.galleryItems.length) return closeGallery(); APP.galleryIndex=Math.min(APP.galleryIndex,APP.galleryItems.length-1); renderGalleryModal(); }
async function renameAlbum(albumId){ const album=APP.albums.find(a=>a.id===albumId && a.owner_id===APP.profile.id); if(!album) return toast('You can only rename your own albums.'); const name=prompt('New album name:', album.name); if(!name || !name.trim()) return; await dbUpdate('albums', album.id, {name:name.trim()}, 'owner_id'); await loadAll(); renderAll(); }
async function deleteAlbum(albumId){
  const album=APP.albums.find(a=>a.id===albumId && a.owner_id===APP.profile.id); if(!album) return toast('You can only delete your own albums.');
  const media=APP.photos.filter(p=>p.album_id===album.id); if(!confirm(`Delete album "${album.name}" and ${media.length} media item(s)? This cannot be undone.`)) return;
  try{ const paths=media.map(p=>p.storage_path).filter(Boolean); if(paths.length) await APP.sb.storage.from(MEDIA_BUCKET).remove(paths); await dbDelete('albums', album.id, 'owner_id'); await loadAll(); renderAll(); toast('Album deleted.'); }
  catch(e){ console.error(e); toast('Album delete failed: '+friendlySupabaseError(e)); }
}
async function deleteMedia(mediaId){
  const media=APP.photos.find(p=>p.id===mediaId && p.owner_id===APP.profile.id); if(!media) return toast('You can only delete your own media.');
  if(!confirm(`Delete ${media.name || 'this media item'}?`)) return;
  try{ if(media.storage_path) await APP.sb.storage.from(MEDIA_BUCKET).remove([media.storage_path]); await dbDelete('photos', media.id, 'owner_id'); await loadAll(); renderAll(); }
  catch(e){ console.error(e); toast('Media delete failed: '+friendlySupabaseError(e)); }
}
async function moveMedia(mediaId, forcedAlbumId=null){
  const media=APP.photos.find(p=>p.id===mediaId && p.owner_id===APP.profile.id); if(!media) return toast('You can only move your own media.');
  const newAlbumId=forcedAlbumId || $(`#move-${mediaId}`)?.value; if(!newAlbumId || newAlbumId===media.album_id) return;
  const target=APP.albums.find(a=>a.id===newAlbumId && a.owner_id===APP.profile.id); if(!target) return toast('Choose one of your own albums.');
  try{
    let update={album_id:newAlbumId};
    if(media.storage_path){
      const kind=kindOf(media); const fileName=media.storage_path.split('/').pop() || `${Date.now()}-${safeFileName(media.name||'media')}`;
      const newPath=`${APP.profile.id}/${newAlbumId}/${kind}s/${fileName}`;
      const mv=await APP.sb.storage.from(MEDIA_BUCKET).move(media.storage_path,newPath); if(mv.error) throw mv.error;
      update.storage_path=newPath; update.url=APP.sb.storage.from(MEDIA_BUCKET).getPublicUrl(newPath).data.publicUrl;
    }
    await dbUpdate('photos', media.id, update, 'owner_id'); await loadAll(); renderAll();
  }catch(e){ console.error(e); toast('Move failed: '+friendlySupabaseError(e)); }
}

function renderSelectors(){
  const opts=linkedIds().map(id=>`<option value="${id}">${escapeHtml(nameOf(id))}</option>`).join('');
  const msgTo=$('#messageTo'); if(msgTo) msgTo.innerHTML=opts;
  const hub=$('#callHubPartnerSelect'); if(hub) hub.innerHTML=opts || '<option value="">No linked profile</option>';
}
function selectedCallProfile(){ const id=$('#callHubPartnerSelect')?.value || linkedIds()[0]; return APP.profiles.find(p=>p.id===id) || null; }
function normalisePhone(v=''){ const s=String(v||'').trim(); if(!s) return ''; if(s.startsWith('+')) return '+'+s.slice(1).replace(/\D/g,''); return s.replace(/\D/g,''); }
function callTarget(){ const p=selectedCallProfile(); if(!p) return {}; const phone=normalisePhone(p.phone||''); const whatsapp=normalisePhone(p.whatsapp||p.phone||''); const facetime=String(p.facetime||p.phone||'').trim(); return {p, phone, whatsapp, facetime}; }
function renderCallHub(){
  const summary=$('#callContactSummary'); if(!summary) return;
  const {p,phone,whatsapp,facetime}=callTarget();
  if(!p){ summary.innerHTML='No accepted linked profile found. Send and accept a link request first.'; return; }
  summary.innerHTML=`<strong>${escapeHtml(p.name||'Linked profile')}</strong><br>Phone: ${escapeHtml(phone||'Not supplied')}<br>WhatsApp: ${escapeHtml(whatsapp||'Not supplied')}<br>FaceTime: ${escapeHtml(facetime||'Not supplied')}`;
}
function openExternal(url, missing){ if(!url) return toast(missing); window.location.href=url; }
function openWhatsAppCall(){ const {whatsapp}=callTarget(); openExternal(whatsapp ? `https://wa.me/${whatsapp.replace('+','')}` : '', 'No WhatsApp number saved for this linked profile.'); }
function openPhoneCall(){ const {phone}=callTarget(); openExternal(phone ? `tel:${phone}` : '', 'No phone number saved for this linked profile.'); }
function openFaceTimeVideo(){ const {facetime}=callTarget(); openExternal(facetime ? `facetime:${encodeURIComponent(facetime)}` : '', 'No FaceTime contact saved for this linked profile.'); }
function openFaceTimeAudio(){ const {facetime}=callTarget(); openExternal(facetime ? `facetime-audio:${encodeURIComponent(facetime)}` : '', 'No FaceTime contact saved for this linked profile.'); }
async function saveCallNote(){ const body=$('#callNoteBody')?.value.trim(); if(!body) return toast('Write a call note first.'); await dbInsert('activities',{id:uid(),profile_id:APP.profile.id,body:'Call note: '+body,created_at:now()}); $('#callNoteBody').value=''; await loadAll(); renderAll(); }
function renderCallNotes(){ const feed=$('#callNotesFeed'); if(!feed) return; const ids=visibleProfileIds(); feed.innerHTML=APP.activities.filter(x=>ids.includes(x.profile_id) && String(x.body||'').startsWith('Call note:')).slice(0,10).map(x=>`<div class="feed-item"><strong>${escapeHtml(nameOf(x.profile_id))}</strong><br>${escapeHtml(String(x.body).replace(/^Call note:\s*/,''))}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('') || '<p class="muted">No call notes yet.</p>'; }

async function getMedia(){ APP.localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true}); $('#localVideo').srcObject=APP.localStream; return APP.localStream; }
function newPeer(){ const pc=new RTCPeerConnection({iceServers:TURN_ICE_SERVERS}); pc.ontrack=e=>{APP.remoteStream=e.streams[0]; $('#remoteVideo').srcObject=APP.remoteStream;}; pc.onicecandidate=e=>{ if(e.candidate&&APP.currentCallId) dbInsert('signals',{id:uid(),call_id:APP.currentCallId,from_id:APP.profile.id,type:'ice',payload:e.candidate,created_at:now()}); }; return pc; }
async function startCall(){ const to=$('#callPartnerSelect').value; if(!to)return toast('Link a profile first.'); await getMedia(); APP.peer=newPeer(); APP.localStream.getTracks().forEach(t=>APP.peer.addTrack(t,APP.localStream)); APP.currentCallId=uid(); await dbInsert('calls',{id:APP.currentCallId,from_id:APP.profile.id,to_id:to,status:'ringing',recording:false,created_at:now()}); const offer=await APP.peer.createOffer(); await APP.peer.setLocalDescription(offer); await dbInsert('signals',{id:uid(),call_id:APP.currentCallId,from_id:APP.profile.id,type:'offer',payload:offer,created_at:now()}); listenSignals(); }
async function joinLatestCall(){ const {data}=await APP.sb.from('calls').select('*').or(`to_id.eq.${APP.profile.id},from_id.eq.${APP.profile.id}`).order('created_at',{ascending:false}).limit(1); const call=data?.[0]; if(!call)return toast('No call found.'); APP.currentCallId=call.id; await getMedia(); APP.peer=newPeer(); APP.localStream.getTracks().forEach(t=>APP.peer.addTrack(t,APP.localStream)); listenSignals(); const {data:sigs}=await APP.sb.from('signals').select('*').eq('call_id',call.id).order('created_at',{ascending:true}); for(const s of sigs||[]) await handleSignal(s); }
function listenSignals(){ const ch=APP.sb.channel('signals:'+APP.currentCallId).on('postgres_changes',{event:'INSERT',schema:'public',table:'signals',filter:`call_id=eq.${APP.currentCallId}`},e=>handleSignal(e.new)).subscribe(); APP.realtimeChannels.push(ch); }
async function handleSignal(s){ if(!APP.peer||s.from_id===APP.profile.id)return; if(s.type==='offer'){ await APP.peer.setRemoteDescription(new RTCSessionDescription(s.payload)); const ans=await APP.peer.createAnswer(); await APP.peer.setLocalDescription(ans); await dbInsert('signals',{id:uid(),call_id:APP.currentCallId,from_id:APP.profile.id,type:'answer',payload:ans,created_at:now()}); } if(s.type==='answer') await APP.peer.setRemoteDescription(new RTCSessionDescription(s.payload)); if(s.type==='ice') try{await APP.peer.addIceCandidate(new RTCIceCandidate(s.payload));}catch{} }
function mixedStream(){
  const localVideo=$('#localVideo'); const remoteVideo=$('#remoteVideo'); const canvas=document.createElement('canvas'); canvas.width=1280; canvas.height=720; const ctx=canvas.getContext('2d'); let active=true;
  function draw(){ if(!active) return; ctx.fillStyle='#111'; ctx.fillRect(0,0,canvas.width,canvas.height); try{ if(remoteVideo?.srcObject) ctx.drawImage(remoteVideo,0,0,canvas.width,canvas.height); }catch{} try{ if(localVideo?.srcObject) ctx.drawImage(localVideo,canvas.width-340,canvas.height-250,320,240); }catch{} APP.recordingAnimation=requestAnimationFrame(draw); }
  draw(); const out=canvas.captureStream ? canvas.captureStream(30) : new MediaStream();
  try{ const AudioCtx=window.AudioContext || window.webkitAudioContext; const ac=new AudioCtx(); const dest=ac.createMediaStreamDestination(); [APP.localStream, APP.remoteStream].filter(Boolean).forEach(s=>{ if(s.getAudioTracks().length){ const src=ac.createMediaStreamSource(new MediaStream(s.getAudioTracks())); src.connect(dest); } }); dest.stream.getAudioTracks().forEach(t=>out.addTrack(t)); APP.recordingAudioContext=ac; }
  catch(e){ console.warn('Audio mix failed; falling back to raw audio tracks.', e); [APP.localStream, APP.remoteStream].filter(Boolean).forEach(s=>s.getAudioTracks().forEach(t=>out.addTrack(t))); }
  APP.recordingCanvas={canvas, stop:()=>{active=false; if(APP.recordingAnimation) cancelAnimationFrame(APP.recordingAnimation);}}; return out;
}
function bestRecordingMime(){ const types=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4']; return types.find(t=>window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || ''; }
async function toggleRecording(){
  if(APP.recorder?.state==='recording'){ APP.recorder.stop(); $('#recordCallBtn').textContent='Start recording'; await setCallRecording(false); return; }
  if(!window.MediaRecorder) return toast('Call recording is not supported by this browser. Try Android Chrome or desktop Chrome/Edge.');
  if(!confirm('Start recording this call? Make sure everyone on the call consents before continuing.')) return;
  const stream=mixedStream(); if(!stream.getTracks().length)return toast('Start or join a call before recording.'); APP.recordedChunks=[];
  const mimeType=bestRecordingMime(); APP.recorder=new MediaRecorder(stream, mimeType ? {mimeType} : undefined); APP.recorder.ondataavailable=e=>{if(e.data.size)APP.recordedChunks.push(e.data)}; APP.recorder.onstop=saveRecording; APP.recorder.start(1000); $('#recordCallBtn').textContent='Stop recording'; await setCallRecording(true);
}
async function setCallRecording(v){ if(!APP.currentCallId)return; await APP.sb.from('calls').update({recording:v,status:v?'recording':'active'}).eq('id',APP.currentCallId); await loadAll(); renderRecordingBanner(); }
function renderRecordingBanner(){ const active=APP.calls.find(c=>c.id===APP.currentCallId)?.recording; $('#recordingBanner')?.classList.toggle('hidden',!active); }
async function saveRecording(){
  try{ APP.recordingCanvas?.stop?.(); await APP.recordingAudioContext?.close?.(); }catch{} const type=APP.recordedChunks[0]?.type || 'video/webm'; const ext=type.includes('mp4')?'mp4':'webm'; const blob=new Blob(APP.recordedChunks,{type}); const name=`call-recording-${Date.now()}.${ext}`; const path=`${APP.profile.id}/recordings/${name}`;
  let url=null, storage_path=null; try{ const up=await APP.sb.storage.from(MEDIA_BUCKET).upload(path,blob,{contentType:type,upsert:false}); if(up.error) throw up.error; storage_path=path; url=APP.sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl; }catch(e){ console.warn('Recording storage upload failed:', e); toast('Recording could not be uploaded to Supabase Storage: '+friendlySupabaseError(e)); }
  if(url) await dbInsert('recordings',{id:uid(),owner_id:APP.profile.id,call_id:APP.currentCallId,name,storage_path,url,created_at:now()}); await loadAll(); renderAll();
}
function hangup(){ APP.recorder?.state==='recording'&&APP.recorder.stop(); try{APP.recordingCanvas?.stop?.(); APP.recordingAudioContext?.close?.();}catch{} APP.peer?.close(); APP.localStream?.getTracks().forEach(t=>t.stop()); APP.peer=null; APP.localStream=null; APP.remoteStream=null; $('#localVideo').srcObject=null; $('#remoteVideo').srcObject=null; setCallRecording(false).catch(()=>{}); }

async function getCurrentPosition(){
  if(!navigator.geolocation) throw new Error('Geolocation is not supported on this browser.');
  return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:10000}));
}
async function saveLocation(position, mode){
  const c=position.coords;
  const row={id:uid(),profile_id:APP.profile.id,latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,share_mode:mode,is_live:mode==='live',created_at:now(),updated_at:now()};
  await dbInsert('location_shares',row);
  await loadAll(); renderLocations();
}
async function shareLocationOnce(){
  setLocationStatus('Requesting location permission...');
  try{ const pos=await getCurrentPosition(); await saveLocation(pos,'snapshot'); setLocationStatus('Current location shared once.'); }
  catch(e){ console.error(e); setLocationStatus('Location share failed: '+(e.message||e)); }
}
async function startLiveLocation(){
  if(!navigator.geolocation) return setLocationStatus('Geolocation is not supported on this browser.');
  if(APP.liveLocationWatchId!==null) return setLocationStatus('Live location sharing is already running.');
  setLocationStatus('Live location sharing started. Keep the app open for continuous updates.');
  APP.liveLocationWatchId=navigator.geolocation.watchPosition(async pos=>{
    try{ await saveLocation(pos,'live'); setLocationStatus('Live location updated at '+new Date().toLocaleTimeString()); }
    catch(e){ setLocationStatus('Live location update failed: '+friendlySupabaseError(e)); }
  }, err=>setLocationStatus('Live location error: '+err.message), {enableHighAccuracy:true,maximumAge:10000,timeout:20000});
}
function stopLiveLocation(){
  if(APP.liveLocationWatchId!==null && navigator.geolocation) navigator.geolocation.clearWatch(APP.liveLocationWatchId);
  APP.liveLocationWatchId=null; setLocationStatus('Live location sharing stopped.');
}
function renderLocations(){
  const ids=visibleProfileIds();
  const feed=$('#locationFeed'); if(!feed) return;
  const latest=[];
  for(const id of ids){
    const rows=APP.location_shares
      .filter(x=>x.profile_id===id)
      .sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));
    if(rows[0]) latest.push(rows[0]);
  }
  latest.sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));
  feed.innerHTML=latest.map(l=>{
    const maps=`https://www.google.com/maps?q=${l.latitude},${l.longitude}`;
    const stamp=l.updated_at||l.created_at;
    return `<div class="feed-item"><strong>${escapeHtml(nameOf(l.profile_id))}</strong> <span class="pill">latest ${escapeHtml(l.share_mode||'snapshot')}</span><br>${Number(l.latitude).toFixed(6)}, ${Number(l.longitude).toFixed(6)} ${l.accuracy?`±${Math.round(l.accuracy)}m`:''}<br><a href="${maps}" target="_blank" rel="noopener">Open in Google Maps</a><br><small>Latest update: ${new Date(stamp).toLocaleString()}</small></div>`;
  }).join('') || '<p class="muted">No shared location yet.</p>';
}

async function enableNotifications(){ if(!('Notification' in window)) return toast('Notifications are not supported on this browser.'); const p=await Notification.requestPermission(); toast(p==='granted'?'Notifications enabled while app is open.':'Notifications not enabled.'); }
function handleNotification(payload){ if(!APP.profile || !('Notification' in window) || Notification.permission!=='granted') return; const n=payload.new; if(!n) return; const ids=visibleProfileIds(); const own=[n.profile_id,n.owner_id,n.from_id].includes(APP.profile.id); const relevant=(n.profile_id&&ids.includes(n.profile_id))||(n.owner_id&&ids.includes(n.owner_id))||(n.to_id===APP.profile.id); if(relevant && !own){ new Notification('Couples Connect update',{body:'New linked activity received.',icon:'/icon.png'}); } }
function setupInstallPrompt(){ let promptEvent=null; const standalone=matchMedia('(display-mode: standalone)').matches || navigator.standalone; if(standalone)return; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;$('#installBanner').classList.remove('hidden')}); $('#installBtn').onclick=async()=>{ if(promptEvent){promptEvent.prompt(); await promptEvent.userChoice; $('#installBanner').classList.add('hidden');} else toast('On iPhone/iPad: tap Share, then Add to Home Screen. On Android: use the browser menu, then Install/Add to Home screen.'); }; $('#dismissInstall').onclick=()=>$('#installBanner').classList.add('hidden'); setTimeout(()=>$('#installBanner').classList.remove('hidden'),800); }
function exportBackup(){ const data={profile:APP.profile,partners:APP.partners,links:APP.links,link_requests:APP.link_requests,moods:APP.moods,notes:APP.notes,activities:APP.activities,albums:APP.albums,photos:APP.photos,recordings:APP.recordings,messages:APP.messages,location_shares:APP.location_shares}; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download='couples-connect-backup.json'; a.click(); }
function formatBytes(bytes){ if(!bytes) return ''; const units=['B','KB','MB','GB']; let n=bytes,i=0; while(n>=1024&&i<units.length-1){n/=1024;i++;} return `${n.toFixed(n>=10||i===0?0:1)} ${units[i]}`; }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }


Object.assign(window,{createProfile,loginProfile,loadProfile,createAlbum,uploadMedia,shareLocationOnce,startLiveLocation,stopLiveLocation,openGallery,closeGallery,galleryNext,galleryPrev,sendLinkRequest,acceptLinkRequest,rejectLinkRequest,removeLinkedProfile});
