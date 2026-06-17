const APP = {
  sb: null,
  profile: null,
  profiles: [], partners: [], links: [], moods: [], notes: [], activities: [], albums: [], photos: [], recordings: [],
  selectedMood: '😊', localStream: null, remoteStream: null, peer: null, recorder: null, recordedChunks: [], currentCallId: null, realtimeChannels: []
};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const saveLS = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
const getLS = (k,d=null)=>{try{return JSON.parse(localStorage.getItem(k)) ?? d}catch{return d}};
const toast = msg => alert(msg);

window.addEventListener('load', init);
async function init(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  setupInstallPrompt();
  bindUI();

  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;

  if(url && key) {
    await connectSupabase(url, key);
  } else {
    toast('Supabase URL/key are missing in index.html. Local-only mode will be used.');
  }

  const profile = getLS('cc_active_profile');
  if(APP.sb && profile) {
    await loadProfile(profile.id);
  } else if(profile) {
    APP.profile = profile;
    show('appScreen');
    renderAll();
  } else {
    show('profileScreen');
  }
}
function show(id){ $$('.screen').forEach(x=>x.classList.remove('active')); $('#'+id).classList.add('active'); }
function bindUI(){
  $('#createProfileBtn').onclick=createProfile;
  $('#logoutBtn').onclick=()=>{localStorage.removeItem('cc_active_profile'); location.reload();};
  $$('.tab').forEach(b=>b.onclick=()=>{ $$('.tab,.tab-panel').forEach(x=>x.classList.remove('active')); b.classList.add('active'); $('#'+b.dataset.tab).classList.add('active'); renderAll(); });
  ['😍','😊','😐','🥺','😔','😡','🤒','✨'].forEach(m=>{const b=document.createElement('button'); b.className='mood'; b.textContent=m; b.onclick=()=>{$$('.mood').forEach(x=>x.classList.remove('active')); b.classList.add('active'); APP.selectedMood=m}; $('#moodButtons').appendChild(b);});
  $('#moodButtons .mood')?.classList.add('active');
  $('#saveMoodBtn').onclick=saveMood; $('#saveNoteBtn').onclick=saveNote; $('#addPartnerBtn').onclick=addPartner; $('#linkPartnerBtn').onclick=linkPartner;
  $('#createAlbumBtn').onclick=createAlbum; $('#uploadPhotosBtn').onclick=uploadPhotos;
  $$('.quick-actions button').forEach(b=>b.onclick=()=>postActivity(b.dataset.prompt));
  $('#startCallBtn').onclick=startCall; $('#joinCallBtn').onclick=joinLatestCall; $('#recordCallBtn').onclick=toggleRecording; $('#hangupBtn').onclick=hangup;
  $('#exportBtn').onclick=exportBackup; $('#clearLocalBtn').onclick=()=>{if(confirm('Clear local app data on this browser?')){localStorage.clear();location.reload();}};
}
async function connectSupabase(url,key){
  try{ APP.sb = window.supabase.createClient(url,key,{realtime:{params:{eventsPerSecond:10}}}); await loadAll(); subscribeRealtime(); return true; }
  catch(e){ console.error(e); toast('Could not connect to Supabase. Local-only mode still works.'); return false; }
}
async function dbInsert(table,row){ if(APP.sb){ const {error}=await APP.sb.from(table).insert(row); if(error) throw error; } else { const a=getLS('cc_'+table,[]); a.push(row); saveLS('cc_'+table,a); await loadAll(); } }
async function dbUpsert(table,row){ if(APP.sb){ const {error}=await APP.sb.from(table).upsert(row); if(error) throw error; } else { const a=getLS('cc_'+table,[]); const i=a.findIndex(x=>x.id===row.id); i>=0?a[i]=row:a.push(row); saveLS('cc_'+table,a); await loadAll(); } }
async function loadAll(){
  const tables=['profiles','partners','links','moods','notes','activities','albums','photos','recordings'];
  if(APP.sb){ for(const t of tables){ const {data,error}=await APP.sb.from(t).select('*').order('created_at',{ascending:false}); if(!error) APP[t]=data||[]; } }
  else tables.forEach(t=>APP[t]=getLS('cc_'+t,[]));
}
function subscribeRealtime(){
  APP.realtimeChannels.forEach(c=>APP.sb.removeChannel(c)); APP.realtimeChannels=[];
  ['profiles','partners','links','moods','notes','activities','albums','photos','recordings','calls','signals'].forEach(t=>{
    const ch=APP.sb.channel('public:'+t).on('postgres_changes',{event:'*',schema:'public',table:t},async()=>{await loadAll(); renderAll();}).subscribe(); APP.realtimeChannels.push(ch);
  });
}
async function createProfile(){
  const name=$('#qName').value.trim(); if(!name)return toast('Enter a name or nickname.');
  const p={id:uid(), name, basics:$('#qBasics').value, personality:$('#qPersonality').value, needs:$('#qNeeds').value, life:$('#qLife').value, created_at:now()};
  await dbInsert('profiles',p); APP.profile=p; saveLS('cc_active_profile',p); show('appScreen'); renderAll();
}
async function loadProfile(id){ await loadAll(); APP.profile=APP.profiles.find(p=>p.id===id)||getLS('cc_active_profile'); if(APP.profile){ saveLS('cc_active_profile',APP.profile); show('appScreen'); renderAll(); } else show('profileScreen'); }
function linkedIds(){ return APP.links.filter(l=>l.profile_a===APP.profile?.id||l.profile_b===APP.profile?.id).map(l=>l.profile_a===APP.profile.id?l.profile_b:l.profile_a); }
function visibleProfileIds(){ return [APP.profile?.id,...linkedIds()].filter(Boolean); }
async function addPartner(){ const name=$('#partnerName').value.trim(); if(!name)return; await dbInsert('partners',{id:uid(), owner_id:APP.profile.id,name,notes:$('#partnerNotes').value,created_at:now()}); $('#partnerName').value='';$('#partnerNotes').value=''; renderAll(); }
async function linkPartner(){ const code=$('#partnerLinkCode').value.trim(); if(!code||code===APP.profile.id)return toast('Paste another profile link code.'); const exists=APP.profiles.find(p=>p.id===code); if(!exists && APP.sb)return toast('That profile was not found.'); await dbInsert('links',{id:uid(),profile_a:APP.profile.id,profile_b:code,created_at:now()}); $('#partnerLinkCode').value=''; await loadAll(); renderAll(); }
async function saveMood(){ await dbInsert('moods',{id:uid(),profile_id:APP.profile.id,mood:APP.selectedMood,note:$('#moodNote').value,created_at:now()}); $('#moodNote').value=''; }
async function saveNote(){ const body=$('#publicNote').value.trim(); if(!body)return; await dbInsert('notes',{id:uid(),profile_id:APP.profile.id,body,created_at:now()}); $('#publicNote').value=''; }
async function postActivity(body){ await dbInsert('activities',{id:uid(),profile_id:APP.profile.id,body,created_at:now()}); }
async function createAlbum(){ const name=$('#albumName').value.trim(); if(!name)return; await dbInsert('albums',{id:uid(),owner_id:APP.profile.id,name,visibility:$('#albumVisibility').value,created_at:now()}); $('#albumName').value=''; renderAll(); }
async function fileToDataUrl(file){ return new Promise((res,rej)=>{const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file);}); }
async function uploadPhotos(){ const album_id=$('#albumSelect').value; if(!album_id)return toast('Create or select an album first.'); const files=[...$('#photoInput').files]; for(const f of files){ const data_url=await fileToDataUrl(f); await dbInsert('photos',{id:uid(),album_id,owner_id:APP.profile.id,name:f.name,type:f.type,data_url,created_at:now()}); } $('#photoInput').value=''; renderAll(); }
function renderAll(){ if(!APP.profile)return; $('#activeProfileText').textContent=`Signed in as ${APP.profile.name}`; $('#myLinkCode').textContent=APP.profile.id; $('#profilePreview').textContent=JSON.stringify(APP.profile,null,2); renderFeeds(); renderPartners(); renderAlbums(); renderCallSelectors(); }
function nameOf(id){ return APP.profiles.find(p=>p.id===id)?.name || (id===APP.profile?.id?APP.profile.name:'Linked profile'); }
function renderFeeds(){ const ids=visibleProfileIds(); $('#moodFeed').innerHTML=APP.moods.filter(x=>ids.includes(x.profile_id)).slice(0,12).map(x=>`<div class="feed-item"><strong>${x.mood} ${nameOf(x.profile_id)}</strong><br>${escapeHtml(x.note||'Checked in')}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<p class="muted">No moods yet.</p>'; $('#notesFeed').innerHTML=APP.notes.filter(x=>ids.includes(x.profile_id)).slice(0,12).map(x=>`<div class="feed-item"><strong>${nameOf(x.profile_id)}</strong><br>${escapeHtml(x.body)}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<p class="muted">No notes yet.</p>'; $('#activityFeed').innerHTML=APP.activities.filter(x=>ids.includes(x.profile_id)).slice(0,12).map(x=>`<div class="feed-item"><strong>${nameOf(x.profile_id)}</strong>: ${escapeHtml(x.body)}<br><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<p class="muted">No activity yet.</p>'; }
function renderPartners(){ const privateCards=APP.partners.filter(p=>p.owner_id===APP.profile.id).map(p=>`<div class="partner-card"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.notes||'')}</p><small>Private card</small></div>`).join(''); const linked=linkedIds().map(id=>`<div class="partner-card"><h3>${escapeHtml(nameOf(id))}</h3><p>Linked profile</p><small>${id}</small></div>`).join(''); $('#partnerList').innerHTML=privateCards+linked || '<p class="muted">No partners added or linked yet.</p>'; }
function renderAlbums(){ const ids=visibleProfileIds(); const visible=APP.albums.filter(a=>a.owner_id===APP.profile.id || (a.visibility==='shared' && ids.includes(a.owner_id))); $('#albumSelect').innerHTML=visible.map(a=>`<option value="${a.id}">${escapeHtml(a.name)} (${a.visibility})</option>`).join(''); $('#albumGrid').innerHTML=visible.map(a=>{ const ps=APP.photos.filter(p=>p.album_id===a.id); return `<div class="album-card"><h3>${escapeHtml(a.name)}</h3><p class="muted">${a.visibility} • ${nameOf(a.owner_id)}</p><div class="photo-grid">${ps.map(p=>`<a href="${p.data_url}" download="${escapeHtml(p.name)}"><img src="${p.data_url}" alt="${escapeHtml(p.name)}"></a>`).join('')}</div></div>`; }).join('') || '<p class="muted">No albums yet.</p>'; }
function renderCallSelectors(){ const opts=linkedIds().map(id=>`<option value="${id}">${escapeHtml(nameOf(id))}</option>`).join(''); $('#callPartnerSelect').innerHTML=opts; $('#recordingsList').innerHTML=APP.recordings.filter(r=>r.owner_id===APP.profile.id).map(r=>`<div class="feed-item"><a href="${r.data_url}" download="${r.name}">${escapeHtml(r.name)}</a><br><small>${new Date(r.created_at).toLocaleString()}</small></div>`).join('')||'<p class="muted">No recordings saved on this profile yet.</p>'; }
async function getMedia(){ APP.localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true}); $('#localVideo').srcObject=APP.localStream; return APP.localStream; }
function newPeer(){ const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]}); pc.ontrack=e=>{APP.remoteStream=e.streams[0]; $('#remoteVideo').srcObject=APP.remoteStream;}; pc.onicecandidate=e=>{ if(e.candidate&&APP.sb&&APP.currentCallId) dbInsert('signals',{id:uid(),call_id:APP.currentCallId,from_id:APP.profile.id,type:'ice',payload:e.candidate,created_at:now()}); }; return pc; }
async function startCall(){ if(!APP.sb)return toast('Real calls need Supabase sync configured.'); const to=$('#callPartnerSelect').value; if(!to)return toast('Link a partner first.'); await getMedia(); APP.peer=newPeer(); APP.localStream.getTracks().forEach(t=>APP.peer.addTrack(t,APP.localStream)); APP.currentCallId=uid(); await dbInsert('calls',{id:APP.currentCallId,from_id:APP.profile.id,to_id:to,status:'ringing',created_at:now()}); const offer=await APP.peer.createOffer(); await APP.peer.setLocalDescription(offer); await dbInsert('signals',{id:uid(),call_id:APP.currentCallId,from_id:APP.profile.id,type:'offer',payload:offer,created_at:now()}); listenSignals(); }
async function joinLatestCall(){ if(!APP.sb)return toast('Real calls need Supabase sync configured.'); await loadAll(); const call=(await APP.sb.from('calls').select('*').or(`to_id.eq.${APP.profile.id},from_id.eq.${APP.profile.id}`).order('created_at',{ascending:false}).limit(1)).data?.[0]; if(!call)return toast('No call found.'); APP.currentCallId=call.id; await getMedia(); APP.peer=newPeer(); APP.localStream.getTracks().forEach(t=>APP.peer.addTrack(t,APP.localStream)); listenSignals(); const {data:sigs}=await APP.sb.from('signals').select('*').eq('call_id',call.id).order('created_at',{ascending:true}); for(const s of sigs||[]) await handleSignal(s); }
function listenSignals(){ if(!APP.sb||!APP.currentCallId)return; const ch=APP.sb.channel('signals:'+APP.currentCallId).on('postgres_changes',{event:'INSERT',schema:'public',table:'signals',filter:`call_id=eq.${APP.currentCallId}`},e=>handleSignal(e.new)).subscribe(); APP.realtimeChannels.push(ch); }
async function handleSignal(s){ if(!APP.peer||s.from_id===APP.profile.id)return; if(s.type==='offer'){ await APP.peer.setRemoteDescription(new RTCSessionDescription(s.payload)); const ans=await APP.peer.createAnswer(); await APP.peer.setLocalDescription(ans); await dbInsert('signals',{id:uid(),call_id:APP.currentCallId,from_id:APP.profile.id,type:'answer',payload:ans,created_at:now()}); } if(s.type==='answer'){ await APP.peer.setRemoteDescription(new RTCSessionDescription(s.payload)); } if(s.type==='ice'){ try{await APP.peer.addIceCandidate(new RTCIceCandidate(s.payload));}catch{} } }
function mixedStream(){ const stream=new MediaStream(); if(APP.localStream) APP.localStream.getTracks().forEach(t=>stream.addTrack(t)); if(APP.remoteStream) APP.remoteStream.getTracks().forEach(t=>stream.addTrack(t)); return stream; }
async function toggleRecording(){ if(APP.recorder?.state==='recording'){ APP.recorder.stop(); $('#recordCallBtn').textContent='Start recording'; return; } const stream=mixedStream(); if(!stream.getTracks().length)return toast('Start or join a call before recording.'); APP.recordedChunks=[]; APP.recorder=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm'}); APP.recorder.ondataavailable=e=>{if(e.data.size)APP.recordedChunks.push(e.data)}; APP.recorder.onstop=async()=>{ const blob=new Blob(APP.recordedChunks,{type:'video/webm'}); const data_url=await fileToDataUrl(blob); await dbInsert('recordings',{id:uid(),owner_id:APP.profile.id,name:`call-recording-${Date.now()}.webm`,data_url,created_at:now()}); renderAll(); }; APP.recorder.start(1000); $('#recordCallBtn').textContent='Stop recording'; }
function hangup(){ APP.recorder?.state==='recording'&&APP.recorder.stop(); APP.peer?.close(); APP.localStream?.getTracks().forEach(t=>t.stop()); APP.peer=null; APP.localStream=null; APP.remoteStream=null; $('#localVideo').srcObject=null; $('#remoteVideo').srcObject=null; }
function setupInstallPrompt(){ let promptEvent=null; const isStandalone=matchMedia('(display-mode: standalone)').matches || navigator.standalone; if(isStandalone) return; window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); promptEvent=e; $('#installBanner').classList.remove('hidden'); }); $('#installBtn').onclick=async()=>{ if(promptEvent){ promptEvent.prompt(); await promptEvent.userChoice; $('#installBanner').classList.add('hidden'); } else toast('On iPhone/iPad: tap Share, then Add to Home Screen. On Android: use the browser menu, then Install app/Add to Home screen.'); }; $('#dismissInstall').onclick=()=>$('#installBanner').classList.add('hidden'); setTimeout(()=>$('#installBanner').classList.remove('hidden'),700); }
function exportBackup(){ const data={profile:APP.profile,partners:APP.partners,links:APP.links,moods:APP.moods,notes:APP.notes,activities:APP.activities,albums:APP.albums,photos:APP.photos,recordings:APP.recordings}; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download='couples-connect-backup.json'; a.click(); }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
