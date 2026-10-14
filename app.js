const API="https://graffiti-voice-prototype.goodcod1024.chatgpt.site";
const BASE="/graffiti-voice-prototype/";
const TOKEN="graffiti-voice-token-v2", EXPIRY="graffiti-voice-expiry-v2";
const script=["유기체는 그저 로봇에 불과하며, 유전자보존과 다음 세대를 위해 이기적인 태도로 존재해야만 합니다.","전 정말 인간에 대한 저자의 통찰력에 너무 너무 깊은 감명을 받았습니다.","항상 1등 아니면 의미없다고 생각했었는데, 이 책을 읽고 제 생각이 옳다는 걸 알게 되었습니다.","저 역시 제 부모님으로부터 아주 훌륭한 유전자를 물려받았습니다.","빠른 두뇌회전, 뚜렷한 목표 의식, 절대 지지 않는 승부욕. 앞으로도 저는 제 유전자의 본능, 즉 1등을 하기 위해 사력을 다하는 이기적인 본능에 충실하기 위해 최선을 다 할 것입니다."];
const spots={dog:["지점 01","야 여기 개 짖는 소리 좀 안나게 해라"],steam:["지점 02","수증기. 강수증기. 오토바이. 안녕안녕"],foreigner:["지점 03","여기 외국인 되게 많다"],soul:["지점 04","서울 마이 소울, 다크소울..."]};
let view="welcome",agreed=false,clip=null,preview=null,recorder=null,stream=null,chunks=[],message="",audioUrl=null;
const $=s=>document.querySelector(s), app=$("#app");
const endpoint=p=>API+p;
function shell(content,img){return `<main class="shell"><header><span>VOICE / 48H</span><button id="reset">처음부터</button></header><section class="screen"><div class="stage-image"><img src="./${img}" alt=""></div>${content}</section><footer><span>입력 · 복제 · 출력</span><span>임시 기록</span></footer></main>`}
function render(){
 const requested=new URLSearchParams(location.search).get("spot");
 if(requested&&spots[requested]) view="spot";
 if(view==="welcome") app.innerHTML=`<main class="mockup-page"><img src="./experiment-page.png" alt="목소리 좀 빌릴게요. 입력, 복제, 출력 실험페이지"><button id="terms" class="hotspot consent-hotspot ${agreed?"agreed":""}">약관 동의</button><button id="begin" class="hotspot begin-hotspot">음성 입력하기</button><p id="guide" class="consent-guide hidden">먼저 왼쪽의 약관동의를 눌러주세요.</p><div id="modal" class="terms-backdrop hidden"><div class="terms-panel"><h2>음성 복제 실험 참여 동의</h2><p>길게 녹음한 음성 1개는 방문자의 목소리를 복제하고 QR 문장을 생성하기 위해 ElevenLabs 서버로 전송됩니다.</p><ul><li>처리 항목: 원본 녹음, 임시 복제 음성, 생성 음성</li><li>목적: 이 작품의 입력–복제–출력 실험</li><li>사용 기간: 등록 시점부터 48시간</li><li>삭제: 48시간 만료 또는 ‘처음부터’ 선택 시 삭제 요청</li><li>동의를 거부하면 음성 복제 체험에는 참여할 수 없습니다.</li></ul><button id="agree" class="primary">동의하고 참여하기</button><button id="close" class="secondary">동의하지 않기</button></div></div></main>`;
 else if(view==="record") app.innerHTML=shell(`<p class="eyebrow">한 번에 쭉 읽어주세요</p><div class="long-script">${script.map(x=>`<p>${x}</p>`).join("")}</div><div class="grow"></div><div class="recorder"><button id="record" class="record-button"></button><p id="status" class="record-status">${message||"버튼을 누르고 평소 목소리로 읽어주세요."}</p><div id="review"></div></div>`,"character-01.png");
 else if(view==="uploading") app.innerHTML=shell(`<p class="eyebrow">VOICE CLONING</p><h1>목소리를<br>복제하고<br>있습니다.</h1><div class="loader"></div><p class="muted">${message}</p>`,"character-02.png");
 else if(view==="ready") app.innerHTML=shell(`<p class="eyebrow">목소리 등록 완료</p><h1>잘 하셨습니다...<br>당신의 목소리를<br>빌렸습니다.</h1><p class="completion-copy">앞으로 48시간 동안, 당신이 읽지 않은 문장도 당신의 목소리로 말하게 됩니다.</p><p class="muted">같은 휴대전화와 브라우저로 현장의 QR을 열어주세요.</p><div class="spot-list">${Object.entries(spots).map(([id,s])=>`<a class="spot-link" href="${BASE}?spot=${id}"><span>${s[0]}</span><strong>${s[1]}</strong></a>`).join("")}</div>`,"character-03.png");
 else {const id=requested||"dog",s=spots[id],has=!!localStorage.getItem(TOKEN);app.innerHTML=shell(`<p class="eyebrow">현장 · ${s[0]}</p><div class="target-quote"><p>${s[1]}</p></div><p class="muted">${has?"당신이 읽지 않은 문장이 당신의 목소리를 기다리고 있습니다.":"이 기기에 등록된 목소리가 없습니다."}</p><div class="grow"></div>${has?`<button id="speak" class="primary">목소리 불러오기</button>`:`<a class="primary" href="${BASE}">음성 입력하러 가기</a>`}<div id="audio"></div><p id="status" class="record-status">${message}</p>`,"character-04.png")}
 bind();
}
function bind(){
 $("#terms")?.addEventListener("click",()=>$("#modal").classList.remove("hidden"));
 $("#close")?.addEventListener("click",()=>$("#modal").classList.add("hidden"));
 $("#agree")?.addEventListener("click",()=>{agreed=true;render()});
 $("#begin")?.addEventListener("click",()=>{if(!agreed)return $("#guide").classList.remove("hidden");view="record";render()});
 $("#reset")?.addEventListener("click",reset);
 $("#record")?.addEventListener("click",toggleRecord);
 $("#speak")?.addEventListener("click",generateSpeech);
}
async function toggleRecord(){
 if(recorder?.state==="recording"){recorder.stop();return}
 try{stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);recorder.onstop=()=>{clip=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});stream.getTracks().forEach(t=>t.stop());preview=URL.createObjectURL(clip);message="녹음 완료";render();$("#review").innerHTML=`<audio src="${preview}" controls></audio><button id="accept" class="primary">이 녹음으로 목소리 등록하기</button><button id="again" class="secondary">다시 녹음</button>`;$("#accept").onclick=upload;$("#again").onclick=()=>{clip=null;message="";render()}};recorder.start();$("#record").classList.add("recording");$("#status").textContent="녹음 중 · 다 읽으면 다시 누르세요."}catch{$("#status").textContent="브라우저 설정에서 마이크 접근을 허용해주세요."}
}
async function upload(){view="uploading";message="당신의 목소리를 만드는 중입니다. 잠시만 기다려주세요.";render();const data=new FormData();data.append("files",clip,"recording.webm");try{const r=await fetch(endpoint("/api/register"),{method:"POST",body:data});const j=await r.json();if(!r.ok)throw Error(j.error||"목소리를 만들지 못했습니다.");localStorage.setItem(TOKEN,j.token);localStorage.setItem(EXPIRY,String(j.expiresAt));view="ready";render()}catch(e){message=e.message||"연결에 실패했습니다.";view="record";render()}}
async function generateSpeech(){const token=localStorage.getItem(TOKEN),id=new URLSearchParams(location.search).get("spot");$("#status").textContent="당신의 목소리를 불러오는 중입니다…";const r=await fetch(endpoint("/api/speech"),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,spot:id})});if(!r.ok){const j=await r.json().catch(()=>({}));$("#status").textContent=j.error||"음성을 만들지 못했습니다.";return}const blob=await r.blob();audioUrl=URL.createObjectURL(blob);$("#audio").innerHTML=`<audio src="${audioUrl}" controls autoplay></audio>`;$("#status").textContent=""}
function reset(){const token=localStorage.getItem(TOKEN);if(token)fetch(endpoint("/api/delete"),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})}).catch(()=>{});localStorage.removeItem(TOKEN);localStorage.removeItem(EXPIRY);history.replaceState({},"",BASE);view="welcome";agreed=false;render()}
const expires=Number(localStorage.getItem(EXPIRY)||0);if(expires>Date.now())setTimeout(reset,expires-Date.now());else if(localStorage.getItem(TOKEN))reset();else render();
