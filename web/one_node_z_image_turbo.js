// one_node_z_image_turbo.js — Z-Image ONE (TJ)
import { app } from "../../scripts/app.js";
import { C, NODE_W, PREVIEW_SIZE, LEFT_W, PAD,
         el, clear, loadState, saveState, defaultState, randomSeed, LS_KEY } from "./modules/core.js";
import { panel, label, button, select, numberField, row, col,
         modeBar, iconBtn } from "./modules/ui_common.js";
import { queuePrompt, interrupt, copyOutputToInput, setLastImage,
         freeMemory, saveMeta } from "./modules/api.js";
import { mountT2II2ILeft }     from "./modules/ui_t2i_i2i.js";
import { mountInpaintLeft }    from "./modules/ui_inpaint.js";
import { mountReBGLeft }       from "./modules/ui_rebg.js";
import { mountControlNetLeft } from "./modules/ui_controlnet.js";
import { mountFaceRedrawLeft } from "./modules/ui_face_redraw.js";
import { createSettingsOverlay }  from "./modules/ui_app_settings.js";
import { createGalleryOverlay }   from "./modules/ui_gallery.js";
import { createTemplateOverlay }  from "./modules/ui_prompt_templates.js";

// ── Layout ────────────────────────────────────────────────────────────────
const TOPBAR_H   = 40;
const BOTTOM_PAD = 20;
const SEND_TO_H  = 32;
const PROMPT_TA_H= 96;
const PROMPT_LBL = 18;
const PROMPT_H   = PROMPT_LBL + 4 + PROMPT_TA_H;
const RIGHT_H    = PREVIEW_SIZE + PAD + SEND_TO_H + PAD + PROMPT_H;
const ROOT_H     = PAD + TOPBAR_H + PAD + RIGHT_H + BOTTOM_PAD;
const NODE_H     = ROOT_H + 30;

const MODES = [
  { key:"t2i",         label:"T2I",         enabled:true },
  { key:"i2i",         label:"I2I",         enabled:true },
  { key:"inpaint",     label:"INPAINT",     enabled:true },
  { key:"rebg",        label:"RE-BG",       enabled:true },
  { key:"controlnet",  label:"CONTROLNET",  enabled:true },
  { key:"face_redraw", label:"FACE REDRAW", enabled:true },
];

const SEND_TO = {
  t2i:        [{ mode:"i2i",        label:"→ I2I",     field:"i2iImage" },
               { mode:"inpaint",    label:"→ Inpaint", field:"inpaintImage" },
               { mode:"rebg",       label:"→ RE-BG",   field:"rebgImage" },
               { mode:"controlnet", label:"→ CN",       field:"controlnetImage" },
               { mode:"face_redraw",label:"→ Redraw",  field:"faceImage" }],
  i2i:        [{ mode:"inpaint",    label:"→ Inpaint", field:"inpaintImage" },
               { mode:"rebg",       label:"→ RE-BG",   field:"rebgImage" },
               { mode:"controlnet", label:"→ CN",       field:"controlnetImage" },
               { mode:"face_redraw",label:"→ Redraw",  field:"faceImage" }],
  inpaint:    [{ mode:"i2i",        label:"→ I2I",     field:"i2iImage" },
               { mode:"rebg",       label:"→ RE-BG",   field:"rebgImage" },
               { mode:"controlnet", label:"→ CN",       field:"controlnetImage" },
               { mode:"face_redraw",label:"→ Redraw",  field:"faceImage" }],
  rebg:       [{ mode:"i2i",        label:"→ I2I",     field:"i2iImage" },
               { mode:"inpaint",    label:"→ Inpaint", field:"inpaintImage" },
               { mode:"controlnet", label:"→ CN",       field:"controlnetImage" },
               { mode:"face_redraw",label:"→ Redraw",  field:"faceImage" }],
  controlnet: [{ mode:"i2i",        label:"→ I2I",     field:"i2iImage" },
               { mode:"inpaint",    label:"→ Inpaint", field:"inpaintImage" },
               { mode:"rebg",       label:"→ RE-BG",   field:"rebgImage" },
               { mode:"face_redraw",label:"→ Redraw",  field:"faceImage" }],
  face_redraw:[{ mode:"i2i",        label:"→ I2I",     field:"i2iImage" },
               { mode:"inpaint",    label:"→ Inpaint", field:"inpaintImage" },
               { mode:"rebg",       label:"→ RE-BG",   field:"rebgImage" },
               { mode:"controlnet", label:"→ CN",       field:"controlnetImage" }],
};

// ── Toast popup ────────────────────────────────────────────────────────────
function showPopup(msg, isError=true) {
  const t=el("div",{style:{
    position:"fixed",top:"60px",left:"50%",transform:"translateX(-50%)",zIndex:"99999",
    padding:"12px 22px",borderRadius:"8px",
    background:isError?"#3a0a0a":"#0a2a0a",
    border:`1px solid ${isError?C.err:"#4caf50"}`,
    color:isError?C.err:"#81c784",
    fontSize:"13px",fontFamily:"'Segoe UI',sans-serif",
    boxShadow:"0 4px 20px rgba(0,0,0,0.6)",maxWidth:"440px",textAlign:"center",
  },text:msg});
  document.body.appendChild(t);
  setTimeout(()=>{ if(t.parentNode) t.parentNode.removeChild(t); },3500);
}

// ── Compare view ──────────────────────────────────────────────────────────
function createCompareView(originalURL, resultURL) {
  const container=el("div",{style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",borderRadius:"8px"}});
  const resultImg=el("img",{src:resultURL,style:{position:"absolute",inset:"0",width:"100%",height:"100%",objectFit:"contain"}});
  const origWrap =el("div",{style:{position:"absolute",inset:"0 auto 0 0",width:"100%",overflow:"hidden"}});
  const origImg  =el("img",{src:originalURL,style:{position:"absolute",inset:"0",width:`${PREVIEW_SIZE}px`,height:"100%",objectFit:"contain"}});
  origWrap.appendChild(origImg);
  const divider=el("div",{style:{
    position:"absolute",top:"0",bottom:"0",left:"100%",
    width:"3px",background:"rgba(255,255,255,0.85)",cursor:"ew-resize",zIndex:"10",
  }});
  const handle=el("div",{style:{
    position:"absolute",top:"50%",left:"-10px",transform:"translateY(-50%)",
    width:"20px",height:"40px",borderRadius:"10px",
    background:C.lime,display:"flex",alignItems:"center",justifyContent:"center",
    color:"#fff",fontSize:"11px",userSelect:"none",
  },text:"⟺"});
  divider.appendChild(handle);
  let pos=0;
  function update(p){pos=Math.max(0,Math.min(100,p));origWrap.style.width=pos+"%";divider.style.left=pos+"%";}
  update(0);
  divider.addEventListener("pointerdown",e=>{
    divider.setPointerCapture(e.pointerId);
    const mv=e2=>{const r=container.getBoundingClientRect();update((e2.clientX-r.left)/r.width*100);};
    const up=()=>{divider.removeEventListener("pointermove",mv);divider.removeEventListener("pointerup",up);};
    divider.addEventListener("pointermove",mv); divider.addEventListener("pointerup",up);
  });
  container.appendChild(resultImg); container.appendChild(origWrap); container.appendChild(divider);
  return container;
}

app.registerExtension({
  name:"ZImageONE_TJ.v1",
  async beforeRegisterNodeDef(nodeType,nodeData){
    if(nodeData.name!=="ZImageTurboOneNode") return;

    nodeType.prototype.onNodeCreated=function(){
      this.color="#7612DA"; this.bgcolor=C.bg0; this.title_color="#ffffff";
      this.resizable=false; this.size=[NODE_W,NODE_H];
      this._buildUI();
    };
    nodeType.prototype.onConfigure=function(){ this.size=[NODE_W,NODE_H]; };
    nodeType.prototype.onResize=function(){ this.size=[NODE_W,NODE_H]; };
    nodeType.prototype.onDrawConnections=function(){};
    nodeType.prototype.getSlotMenuOptions=function(){return[];};

    nodeType.prototype._buildUI=function(){
      const self=this;
      const state=defaultState(loadState());
      const persist=()=>saveState(state);
      const appConfig={output_mode_visible:true,save_subfolder:""};
      const modeResults={};  // per-mode result storage (in-memory)

      let compareEnabled=true;   // compare toggle state (기본 ON)

      function publishOutput(im){
        setLastImage(self.id,im);
        const hasLink=self.outputs?.[0]?.links?.length>0;
        if(hasLink){try{app.queuePrompt(0);}catch(e){}}
      }

      if(!document.getElementById("zit-styles")){
        const s=document.createElement("style");
        s.id="zit-styles";
        s.textContent=`
          @keyframes zit-spin{to{transform:rotate(360deg)}}
          .zit-lp::-webkit-scrollbar{width:4px}
          .zit-lp::-webkit-scrollbar-track{background:transparent}
          .zit-lp::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        `;
        document.head.appendChild(s);
      }

      // ── Root ────────────────────────────────────────────────────────────
      const root=el("div",{style:{
        width:"100%",height:`${ROOT_H}px`,boxSizing:"border-box",
        position:"relative",overflow:"hidden",
        background:C.bg0,borderRadius:"8px",
        padding:`${PAD}px ${PAD}px ${BOTTOM_PAD}px ${PAD}px`,
        color:C.text,fontFamily:"'Segoe UI',sans-serif",
      }});

      const ctx={
        persist,appConfig,availableLoras:[],rootEl:root,
        publishOutput,showPopup,
        resizeNode(){self.size=[NODE_W,NODE_H];self.setSize?.([NODE_W,NODE_H]);self.graph?.dirty_canvas?.(true,true);},
      };

      // ── topBar ──────────────────────────────────────────────────────────
      const topBar=el("div",{style:{
        display:"flex",alignItems:"center",gap:"6px",
        height:`${TOPBAR_H}px`,marginBottom:`${PAD}px`,flexShrink:"0",
      }});
      const pillsWrap=el("div",{style:{flex:"1"}});
      let settingsOv,galleryOv,templateOv,promptExpandOv;

      // ── Reset button ─────────────────────────────────────────────────────
      const resetBtn=iconBtn("↺","노드 초기화 (저장 데이터 삭제 후 기본값 복원)",()=>{
        if(!confirm("노드를 초기화하면 저장된 모든 설정과 이미지 경로가 삭제됩니다.\n계속하시겠습니까?")) return;
        try{ localStorage.removeItem(LS_KEY); }catch(e){}
        const fresh=defaultState({});
        Object.keys(state).forEach(k=>{ delete state[k]; });
        Object.assign(state,fresh);
        compareEnabled=false;
        compareBtn.style.background=C.bg2;
        compareBtn.style.color=C.text;
        compareBtn.style.border=`1px solid ${C.border}`;
        compareBtn.title="Compare: OFF";
        // 프리뷰 초기화
        finalImg.src=""; finalImg.style.display="none";
        placeholder.style.display="flex";
        Object.keys(modeResults).forEach(k=>{ delete modeResults[k]; });
        renderPills(); renderMode();
        showPopup("노드가 초기화됐습니다.",false);
      });
      resetBtn.style.cssText+=`background:${C.bg2};border:1px solid ${C.border};border-radius:6px;padding:4px 8px;`;
      resetBtn.onmouseenter=()=>resetBtn.style.filter="brightness(1.4)";
      resetBtn.onmouseleave=()=>resetBtn.style.filter="none";

      // Compare toggle button
      const compareBtn=iconBtn("⇌","Compare: OFF",()=>{
        compareEnabled=!compareEnabled;
        compareBtn.title=compareEnabled?"Compare: ON":"Compare: OFF";
        const bg=compareEnabled?C.lime:C.bg2;
        compareBtn.style.background=bg;
        compareBtn.style.color=compareEnabled?"#ffffff":C.text;
        compareBtn.style.border=`1px solid ${compareEnabled?C.lime:C.border}`;
        // Override hover handlers to preserve ON state
        compareBtn.onmouseenter=()=>compareBtn.style.filter="brightness(1.15)";
        compareBtn.onmouseleave=()=>compareBtn.style.filter="none";
        // Re-show current mode result with new compare state
        restorePreview();
      });
      compareBtn.title="Compare: ON";
      compareBtn.style.cssText+=`background:${C.lime};color:#ffffff;border:1px solid ${C.lime};border-radius:6px;padding:4px 8px;`;
      compareBtn.onmouseenter=()=>compareBtn.style.filter="brightness(1.15)";
      compareBtn.onmouseleave=()=>compareBtn.style.filter="none";

      const unloadBtn=iconBtn("🗑","Unload RAM/VRAM",async()=>{
        unloadBtn.style.opacity="0.5";
        try{await freeMemory();showPopup("Models unloaded.",false);}
        catch(e){showPopup("Unload failed: "+(e.message||e));}
        setTimeout(()=>{unloadBtn.style.opacity="1";},2000);
      });
      let helpOv;
      const helpBtn=iconBtn("?","사용법 보기",()=>helpOv?.show());
      helpBtn.style.cssText+=`font-weight:700;font-size:13px;`;

      topBar.appendChild(pillsWrap);
      topBar.appendChild(resetBtn);
      topBar.appendChild(compareBtn);
      topBar.appendChild(unloadBtn);
      topBar.appendChild(iconBtn("⚙","Settings",()=>settingsOv?.show()));
      topBar.appendChild(iconBtn("🖼","Gallery", ()=>galleryOv?.show()));
      topBar.appendChild(helpBtn);
      root.appendChild(topBar);

      // ── mainRow ─────────────────────────────────────────────────────────
      const mainRow=el("div",{style:{
        display:"flex",gap:`${PAD}px`,height:`${RIGHT_H}px`,flexShrink:"0",
      }});

      const leftPanel=el("div",{style:{
        width:`${LEFT_W}px`,flexShrink:"0",height:`${RIGHT_H}px`,
        overflowY:"auto",overflowX:"hidden",
        display:"flex",flexDirection:"column",gap:"6px",
      }});
      leftPanel.className="zit-lp";

      const rightPanel=el("div",{style:{
        flex:"1",minWidth:"0",display:"flex",flexDirection:"column",
        gap:`${PAD}px`,height:`${RIGHT_H}px`,
      }});

      // Preview box
      const previewBox=el("div",{style:{
        width:`${PREVIEW_SIZE}px`,height:`${PREVIEW_SIZE}px`,flexShrink:"0",
        background:"#000",borderRadius:"8px",border:`1px solid ${C.border}`,
        position:"relative",display:"flex",alignItems:"center",justifyContent:"center",
        overflow:"hidden",alignSelf:"flex-start",
      }});
      const placeholder=el("div",{text:"Generate to see result",style:{color:C.muted,fontSize:"12px"}});
      const finalImg=el("img",{style:{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",display:"none"}});
      const loadingOv=el("div",{style:{
        position:"absolute",inset:"0",background:"rgba(0,0,0,0.78)",
        display:"none",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"12px",
      }});
      const spinner=el("div",{style:{
        width:"44px",height:"44px",
        border:`3px solid ${C.border}`,borderTop:`3px solid ${C.lime}`,
        borderRadius:"50%",animation:"zit-spin 0.8s linear infinite",
      }});
      loadingOv.appendChild(spinner);
      loadingOv.appendChild(el("div",{text:"Generating image…",style:{color:C.text,fontSize:"12px"}}));

      const clearBtn=el("button",{text:"✕",type:"button",title:"Clear result",style:{
        position:"absolute",top:"6px",right:"6px",zIndex:"5",
        background:"rgba(0,0,0,0.65)",color:"#fff",border:"none",
        borderRadius:"4px",width:"22px",height:"22px",cursor:"pointer",fontSize:"12px",padding:"0",
      }});
      clearBtn.addEventListener("click",()=>{ delete modeResults[state.mode]; resetPreview(); renderSendTo(); });

      function resetPreview(){
        previewBox.innerHTML="";
        previewBox.appendChild(placeholder);
        previewBox.appendChild(finalImg);
        previewBox.appendChild(loadingOv);
        previewBox.appendChild(clearBtn);
        placeholder.style.display="block"; finalImg.style.display="none"; loadingOv.style.display="none";
      }
      resetPreview();

      function restorePreview(){
        const mr=modeResults[state.mode];
        if(!mr){resetPreview();return;}
        previewBox.innerHTML="";
        previewBox.appendChild(loadingOv);
        previewBox.appendChild(clearBtn);
        if(compareEnabled && mr.originalURL){
          previewBox.appendChild(createCompareView(mr.originalURL,mr.url));
        }else{
          finalImg.src=mr.url; finalImg.style.display="block"; placeholder.style.display="none";
          previewBox.appendChild(placeholder); previewBox.appendChild(finalImg);
        }
        loadingOv.style.display="none";
      }

      ctx.showResult=(im,originalURL)=>{
        const resultURL=`/view?filename=${encodeURIComponent(im.filename)}&subfolder=${encodeURIComponent(im.subfolder||"")}&type=${im.type||"output"}&t=${Date.now()}`;
        modeResults[state.mode]={im,url:resultURL,originalURL:originalURL||null};
        restorePreview(); renderSendTo(); publishOutput(im);
      };

      // Send-to strip + Output toggle
      const sendToWrap=el("div",{style:{
        height:`${SEND_TO_H}px`,flexShrink:"0",
        display:"flex",alignItems:"center",gap:"8px",overflow:"hidden",
      }});
      const sendLeft =el("div",{style:{flex:"1",display:"flex",flexWrap:"wrap",alignItems:"center",gap:"4px"}});
      const sendRight=el("div",{style:{display:"flex",alignItems:"center",gap:"4px",flexShrink:"0"}});
      sendToWrap.appendChild(sendLeft); sendToWrap.appendChild(sendRight);

      function renderSendTo(){
        clear(sendLeft);
        const targets=SEND_TO[state.mode]||[];
        if(!targets.length) return;
        sendLeft.appendChild(el("div",{text:"Send to:",style:{color:C.muted,fontSize:"11px",flexShrink:"0"}}));
        targets.forEach(t=>{
          const btn=el("button",{text:t.label,type:"button",style:{
            cursor:"pointer",fontFamily:"inherit",fontSize:"11px",
            padding:"3px 8px",borderRadius:"12px",
            background:C.bg2,color:C.text,border:`1px solid ${C.border}`,
          }});
          btn.addEventListener("mouseenter",()=>btn.style.background=C.bg3);
          btn.addEventListener("mouseleave",()=>btn.style.background=C.bg2);
          btn.addEventListener("click",async()=>{
            const mr=modeResults[state.mode];
            if(!mr){showPopup("No image in this mode — generate first.");return;}
            btn.disabled=true; btn.textContent="Copying…";
            try{
              const n=await copyOutputToInput(mr.im.filename,mr.im.subfolder||"",mr.im.type||"output");
              state[t.field]=n; if(t.extra) t.extra(state); state.mode=t.mode; persist();
              renderPills(); renderMode();
            }catch(e){showPopup("Copy failed: "+(e.message||e));btn.disabled=false;btn.textContent=t.label;}
          });
          sendLeft.appendChild(btn);
        });
      }

      function renderToggle(){
        clear(sendRight);
        sendRight.appendChild(el("div",{text:"Output:",style:{color:C.muted,fontSize:"11px"}}));
        ["preview","save"].forEach(key=>{
          const active=state.outputMode===key;
          const text=key==="save"?"💾 Save":"👁 Preview";
          const btn=el("button",{text,type:"button",style:{
            cursor:"pointer",fontFamily:"inherit",fontSize:"11px",
            padding:"4px 10px",borderRadius:"20px",
            background:active?C.lime:C.bg2,color:"#ffffff",
            border:`1px solid ${active?C.lime:C.border}`,fontWeight:active?"700":"400",
          },onclick:()=>{state.outputMode=key;persist();renderToggle();}});
          sendRight.appendChild(btn);
        });
      }
      renderToggle();
      ctx.renderToggle=renderToggle; ctx._refreshToggle=renderToggle;

      // Prompt header — with expand (🔍) and template (📋) buttons
      const promptWrap=el("div",{style:{height:`${PROMPT_H}px`,flexShrink:"0",display:"flex",flexDirection:"column",gap:"4px"}});
      const charCount=el("span",{style:{color:C.muted,fontSize:"10px",marginLeft:"6px"}});
      const promptHdr=el("div",{style:{display:"flex",alignItems:"center",height:`${PROMPT_LBL}px`}});
      promptHdr.appendChild(el("div",{text:"PROMPT",style:{color:C.muted,fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.04em"}}));
      promptHdr.appendChild(charCount);

      const expandBtn=button("🔍",null,"default");
      expandBtn.title="Expand prompt editor";
      expandBtn.onclick=()=>promptExpandOv?.show();
      expandBtn.style.cssText+="padding:2px 6px;font-size:11px;margin-left:auto;";

      const tplBtn=button("📋",null,"default");
      tplBtn.title="Load Template"; tplBtn.onclick=()=>templateOv?.show();
      tplBtn.style.cssText+="padding:2px 6px;font-size:11px;";

      promptHdr.appendChild(expandBtn); promptHdr.appendChild(tplBtn);

      const promptTA=el("textarea",{
        placeholder:"Describe the image…",
        style:{
          flex:"1",width:"100%",boxSizing:"border-box",
          background:C.bg2,color:C.text,
          border:`1px solid ${C.border}`,borderRadius:"6px",
          padding:"7px",fontSize:"13px",fontFamily:"inherit",
          outline:"none",resize:"none",overflowY:"auto",
        },
      });

      function getModePrompt(mode){return state.promptsByMode?.[mode]||"";}
      function setModePrompt(mode,val){
        if(!state.promptsByMode) state.promptsByMode={};
        state.promptsByMode[mode]=val; state.prompt=val;
      }
      promptTA.value=getModePrompt(state.mode);
      function updateCount(){
        const n=getModePrompt(state.mode).trim().length;
        charCount.textContent=` (${n} chars${n<30?" ⚠":""})`;
        charCount.style.color=n<30?C.warn:C.muted;
      }
      updateCount();
      promptTA.addEventListener("input",()=>{setModePrompt(state.mode,promptTA.value);persist();updateCount();});
      promptTA.addEventListener("focus",()=>promptTA.style.borderColor=C.lime);
      promptTA.addEventListener("blur", ()=>promptTA.style.borderColor=C.border);
      promptWrap.appendChild(promptHdr); promptWrap.appendChild(promptTA);

      rightPanel.appendChild(previewBox);
      rightPanel.appendChild(sendToWrap);
      rightPanel.appendChild(promptWrap);
      mainRow.appendChild(leftPanel); mainRow.appendChild(rightPanel);
      root.appendChild(mainRow);

      // ── Seed + Generate ─────────────────────────────────────────────────
      const seedInput=numberField(state.seed,v=>{state.seed=v;persist();},1);
      const seedModeDD=select(
        [{value:"randomize",label:"Random"},{value:"fixed",label:"Fixed"},{value:"increment",label:"+1"},{value:"decrement",label:"-1"}],
        state.seedMode,v=>{state.seedMode=v;persist();}
      );
      const seedRow=el("div",{style:{display:"flex",flexDirection:"column",gap:"4px",marginTop:"auto",paddingTop:"6px"}});
      seedRow.appendChild(panel([row([col([label("Seed"),seedInput]),col([label("Mode"),seedModeDD])])]));

      const genBtn=button("▶ Generate",null,"primary");
      genBtn.style.cssText+="width:100%;padding:11px;font-size:13px;";
      const stopBtn=button("■ Stop",async()=>{
        await interrupt();
        // Force re-enable generate button regardless of async state
        genBtn.disabled=false; genBtn.textContent="▶ Generate";
        loadingOv.style.display="none";
        if(!modeResults[state.mode]){placeholder.style.display="block";finalImg.style.display="none";}
      });
      stopBtn.style.flexShrink="0";

      const genRow=el("div",{style:{display:"flex",flexDirection:"column",gap:"4px"}});
      genRow.appendChild(row([genBtn,stopBtn]));
      seedRow.appendChild(genRow);

      let modeHandle=null;

      // ── 연결된 prompt_override 슬롯 값 읽기 ────────────────────────────────
      // LiteGraph 그래프에서 직접 읽으므로 실행 없이 즉시 사용 가능.
      // Primitive / String 노드처럼 위젯 값이 메모리에 있는 노드에서 동작.
      function getPromptOverride() {
        try {
          const slotIdx = self.inputs?.findIndex(i => i.name === "prompt_override");
          if (slotIdx == null || slotIdx < 0) return "";
          const linkId = self.inputs[slotIdx]?.link;
          if (linkId == null) return "";
          const link = app.graph.links[linkId];
          if (!link) return "";
          const srcNode = app.graph.getNodeById(link.origin_id);
          if (!srcNode) return "";
          // 위젯 배열에서 output slot 인덱스에 해당하는 값 또는 첫 번째 위젯 값
          return srcNode.widgets?.[link.origin_slot]?.value
              ?? srcNode.widgets?.[0]?.value
              ?? "";
        } catch(e) { return ""; }
      }

      genBtn.onclick=async()=>{
        if(!modeHandle) return;
        // Model validation
        if(!state.model||state.model==="none"){ showPopup("⚙ Please select a Diffusion Model in Settings."); return; }
        if(!state.textEncoder||state.textEncoder==="none"){ showPopup("⚙ Please select a Text Encoder in Settings."); return; }
        if(!state.vae||state.vae==="none"){ showPopup("⚙ Please select a VAE in Settings."); return; }

        genBtn.disabled=true; genBtn.textContent="Generating…";
        previewBox.innerHTML="";
        previewBox.appendChild(placeholder); previewBox.appendChild(finalImg);
        previewBox.appendChild(loadingOv); previewBox.appendChild(clearBtn);
        placeholder.style.display="none"; finalImg.style.display="none"; loadingOv.style.display="flex";
        let originalURL=null;
        try{
          // prompt_override 슬롯에 연결된 값 읽기 (없으면 "")
          state.promptOverride = getPromptOverride();
          await modeHandle.beforeGenerate?.();
          if(compareEnabled && typeof modeHandle.getSourceURL==="function") originalURL=modeHandle.getSourceURL();
          if(state.seedMode==="randomize") state.seed=randomSeed();
          else if(state.seedMode==="increment") state.seed=(state.seed||0)+1;
          else if(state.seedMode==="decrement") state.seed=Math.max(0,(state.seed||0)-1);
          seedInput.value=state.seed; persist();
          const graph=modeHandle.getGraph();
          const result=await queuePrompt(graph,{onProgress:()=>{}});
          const imgs=result?.output?.images;
          if(!imgs?.length) throw new Error("No output images returned.");
          ctx.showResult(imgs[0],originalURL);
          saveMeta(imgs[0].filename,imgs[0].subfolder||"",state);
        }catch(e){
          showPopup("Generation error: "+(e.message||String(e)));
          loadingOv.style.display="none"; placeholder.style.display="block";
        }finally{
          state.promptOverride = "";   // 일회성 — 다음 generate에 영향 없도록 초기화
          genBtn.disabled=false; genBtn.textContent="▶ Generate";
        }
      };

      function renderMode(){
        clear(leftPanel);
        restorePreview(); renderSendTo();
        promptTA.value=getModePrompt(state.mode); updateCount();
        if(state.mode==="t2i"||state.mode==="i2i") modeHandle=mountT2II2ILeft(leftPanel,state,ctx);
        else if(state.mode==="inpaint")            modeHandle=mountInpaintLeft(leftPanel,state,ctx);
        else if(state.mode==="rebg")               modeHandle=mountReBGLeft(leftPanel,state,ctx);
        else if(state.mode==="controlnet")         modeHandle=mountControlNetLeft(leftPanel,state,ctx);
        else if(state.mode==="face_redraw")        modeHandle=mountFaceRedrawLeft(leftPanel,state,ctx);
        leftPanel.appendChild(seedRow);
      }

      function renderPills(){
        clear(pillsWrap);
        pillsWrap.appendChild(modeBar(MODES,state.mode,key=>{
          state.mode=key;persist();renderPills();renderMode();
        }));
      }

      renderPills(); renderMode(); renderSendTo();

      // ── Overlays ─────────────────────────────────────────────────────────
      settingsOv=createSettingsOverlay(state,ctx);

      // Gallery send-to handler
      function onGallerySendTo(mode,field,extra,newFilename){
        state[field]=newFilename;
        if(extra) extra(state);
        state.mode=mode; persist();
        renderPills(); renderMode();
      }

      galleryOv=createGalleryOverlay(state,ctx,(meta)=>{
        const skip=new Set(["inpaintMaskOverlay","inpaintMaskDataURL","modeResults"]);
        Object.keys(meta).forEach(k=>{if(!skip.has(k)) state[k]=meta[k];});
        persist(); renderPills(); renderMode(); renderToggle();
      }, onGallerySendTo);

      templateOv=createTemplateOverlay(state,ctx,(prompt)=>{
        setModePrompt(state.mode,prompt); promptTA.value=prompt; persist(); updateCount();
      });

      // Prompt expand overlay
      const promptExpandEl=el("div",{style:{
        position:"absolute",inset:"0",zIndex:"9996",
        background:"rgba(11,11,11,0.97)",borderRadius:"inherit",
        display:"none",flexDirection:"column",padding:"12px",gap:"8px",boxSizing:"border-box",
      }});
      const pxTopRow=el("div",{style:{display:"flex",alignItems:"center",gap:"8px",flexShrink:"0"}});
      pxTopRow.appendChild(el("div",{text:"📝 Prompt Editor",style:{color:"#fff",fontSize:"14px",fontWeight:"700",flex:"1"}}));
      const pxApply=button("✓ Apply",()=>{
        setModePrompt(state.mode,pxTA.value);
        promptTA.value=pxTA.value; persist(); updateCount();
        promptExpandEl.style.display="none";
      },"primary");
      const pxClose=button("✕",()=>{promptExpandEl.style.display="none";},"danger");
      pxTopRow.appendChild(pxApply); pxTopRow.appendChild(pxClose);
      const pxTA=el("textarea",{
        placeholder:"Write your prompt here…",
        style:{
          flex:"1",width:"100%",boxSizing:"border-box",
          background:C.bg2,color:C.text,
          border:`1px solid ${C.border}`,borderRadius:"6px",
          padding:"10px",fontSize:"14px",fontFamily:"inherit",
          outline:"none",resize:"none",
        },
      });
      promptExpandEl.appendChild(pxTopRow);
      promptExpandEl.appendChild(pxTA);
      promptExpandOv={
        el:promptExpandEl,
        show(){pxTA.value=getModePrompt(state.mode);promptExpandEl.style.display="flex";setTimeout(()=>pxTA.focus(),50);}
      };

      // ── Help overlay ─────────────────────────────────────────────────────
      const HELP_SECTIONS = [
        { title:"개요", body:
`Z-Image ONE (TJ)은 Z-Image Turbo (Flow-matching 모델) 전용 올인원 생성 노드입니다.
상단 모드 버튼으로 T2I / I2I / INPAINT / RE-BG / CONTROLNET / FACE REDRAW 를 전환하며,
오른쪽 프리뷰에서 결과를 확인하고 하단 Send to 버튼으로 다음 작업으로 바로 넘길 수 있습니다.` },

        { title:"⚙ 초기 설정 (Settings)", body:
`우상단 ⚙ 버튼 → Settings 오버레이에서 아래를 반드시 설정하세요.
• Diffusion Model  — UNet 모델 선택 (models/diffusion_models/)
• Text Encoder     — CLIP 텍스트 인코더 선택 (models/text_encoders/)
• VAE              — VAE 모델 선택 (models/vae/)
• Negative Prompt  — 전 모드에 공통 적용할 부정 프롬프트
• Prompt Suffix    — 전 모드 프롬프트 끝에 자동 추가할 키워드
• Save Subfolder   — 저장 폴더 이름 (기본: z-image-one-tj)
설정은 자동 저장되며 ComfyUI 재시작 후에도 유지됩니다.` },

        { title:"T2I — 텍스트→이미지", body:
`프롬프트로 이미지를 새로 생성합니다.
• Resolution Preset — 자주 쓰는 해상도 프리셋 또는 Custom으로 직접 입력
• Steps / CFG / Shift / Sampler / Scheduler — 샘플링 파라미터
• LoRA (최대 3개) — LoRA 파일 선택, 강도 조절, 트리거 워드 자동 감지
• Seed / Mode — Fixed(고정), Random(매번 랜덤), +1/-1(증감)
생성 후 Send to 버튼으로 → I2I / INPAINT / RE-BG / CONTROLNET / FACE REDRAW 로 전달 가능.` },

        { title:"I2I — 이미지→이미지", body:
`소스 이미지를 참고해 변형 생성합니다.
• Source Image 업로드 또는 다른 모드에서 Send to → I2I 로 전달
• Denoise — 낮을수록 원본 유지(0.3~0.6), 높을수록 자유 변형(0.8~1.0)
• Compare 버튼(⇌) — ON 시 결과와 원본을 슬라이더로 비교 가능` },

        { title:"INPAINT — 마스크 영역 재생성", body:
`이미지의 특정 영역만 프롬프트로 재생성합니다. DifferentialDiffusion 방식 사용.
• Source Image 업로드
• ✏ 마스크 수정하기 — 클릭 시 ComfyUI 기본 마스크 에디터 오픈.
  흰색(White) = 재생성할 영역 / 검은색(Black) = 유지할 영역
  저장 시 자동으로 마스크 이미지에 반영됩니다.
• 직접 업로드 — 외부 툴로 만든 마스크 PNG를 업로드하는 대안 방법
• Denoise — 0.7~0.9 권장. 낮을수록 원본 맥락 강하게 유지.
핵심: DifferentialDiffusion이 마스크 경계를 부드럽게 처리해 자연스러운 합성.` },

        { title:"RE-BG — 배경 재생성 + 확장", body:
`RMBG로 서브젝트를 분리 후 배경만 완전 재생성합니다. 경계선 없음.
기존 Outpaint의 경계선 문제를 해결한 방식입니다.
• BG Removal Model — birefnet 등 설치된 배경제거 모델 선택
• Source Image 업로드
• Expansion px — Up/Down/Left/Right 각 방향으로 캔버스 확장 픽셀 지정.
  모두 0이면 배경만 재생성(크기 유지), 값 입력 시 해당 방향으로 확장 후 재생성.
• Edge Feathering — 확장 경계 블렌딩 강도 (px)
• Background Denoise — 1.0=완전히 새 배경(권장), 낮추면 원본 색감 참조
동작 원리:
  1. RMBG → 서브젝트 마스크 추출
  2. 확장된 캔버스 전체를 새 배경으로 재생성 (denoise=1)
  3. 서브젝트를 새 배경 위에 합성 → 경계선 없는 완성 이미지` },

        { title:"CONTROLNET — 구조/자세 참조 생성", body:
`레퍼런스 이미지의 구조/자세/윤곽을 참고해 생성합니다.
• ControlNet Union Model — models/model_patches/ 의 모델 선택
• Reference Image 업로드
• Control Type — Depth(깊이), Canny(윤곽선), Pose(자세), HED, MLSD, None
• Strength — ControlNet 적용 강도 (0~1)
• Resolution — 전처리 해상도 (512~1024)
GetImageSize 노드로 레퍼런스 이미지 크기를 자동 감지해 latent 크기를 맞춥니다.` },

        { title:"FACE REDRAW — 얼굴 재생성", body:
`Impact Pack의 FaceDetailer를 사용해 얼굴 영역만 정밀 재생성합니다.
• Face Detector — UltralyticsDetectorProvider용 모델 선택 (ultralytics/bbox/*.pt)
• Source Portrait — 대상 인물 이미지 업로드
• Threshold — 얼굴 감지 민감도 (낮을수록 더 많이 감지)
• Dilation px — 감지 마스크 팽창 픽셀
• Denoise — 얼굴 재생성 강도 (0.4~0.6 권장, 너무 높으면 원본과 달라짐)
• Feather px — 마스크 경계 블렌딩
사전 요구: ComfyUI Impact Pack 설치, ultralytics/bbox/ 에 감지 모델 필요.` },

        { title:"공통 기능", body:
`⇌ Compare  — ON 시 보라색 강조. 생성 결과와 소스 이미지를 슬라이더로 비교.
             T2I 제외 전 모드에서 활성화 가능.
🗑 Unload   — 현재 로드된 모델을 VRAM/RAM에서 해제.
⚙ Settings — 모델 선택, 네거티브/접미사 프롬프트, 저장 설정.
🖼 Gallery  — 저장된 이미지 갤러리. 즐겨찾기, 메타데이터 재사용, 삭제,
             폴더 열기, 다른 모드로 Send to 기능 포함.
📋 Template — 저장된 프롬프트 템플릿 불러오기.
🔍 Expand   — 프롬프트를 전체 화면 에디터로 확장 편집.
Send to     — 생성 결과를 다른 모드의 소스 이미지로 바로 전달.
Output      — 👁 Preview(임시 저장) / 💾 Save(영구 저장) 전환.` },
      ];

      const helpEl=el("div",{style:{
        position:"absolute",inset:"0",zIndex:"9998",
        background:"rgba(11,11,11,0.98)",borderRadius:"inherit",
        display:"none",flexDirection:"column",
        padding:"14px",gap:"0",boxSizing:"border-box",
      }});
      const helpTop=el("div",{style:{display:"flex",alignItems:"center",gap:"8px",flexShrink:"0",marginBottom:"10px"}});
      helpTop.appendChild(el("div",{
        text:"? Z-Image ONE 사용 설명서",
        style:{color:"#ffffff",fontSize:"14px",fontWeight:"700",flex:"1"},
      }));
      const helpClose=button("✕",()=>{helpEl.style.display="none";},"danger");
      helpTop.appendChild(helpClose);
      helpEl.appendChild(helpTop);

      const helpBody=el("div",{style:{
        flex:"1",overflowY:"auto",display:"flex",flexDirection:"column",gap:"12px",
        paddingRight:"4px",
      }});
      helpBody.className="zit-lp";

      HELP_SECTIONS.forEach(sec=>{
        const block=el("div",{style:{
          background:C.bg1,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"10px 12px",
        }});
        block.appendChild(el("div",{
          text:sec.title,
          style:{color:C.lime,fontSize:"12px",fontWeight:"700",marginBottom:"6px",letterSpacing:"0.04em"},
        }));
        sec.body.split("\n").forEach(line=>{
          const isItem=line.startsWith("•")||line.startsWith(" ");
          block.appendChild(el("div",{
            text:line||" ",
            style:{
              color:isItem?C.text:C.text,
              fontSize:"11.5px",lineHeight:"1.65",
              paddingLeft:isItem?"8px":"0",
              color:line.startsWith("•")?"#c8c8c8":line.startsWith(" ")?"#a0a0a0":C.text,
            },
          }));
        });
        helpBody.appendChild(block);
      });

      helpEl.appendChild(helpBody);
      helpOv={el:helpEl, show(){helpEl.style.display="flex";}};

      root.appendChild(settingsOv.el);
      root.appendChild(galleryOv.el);
      root.appendChild(templateOv.el);
      root.appendChild(promptExpandEl);
      root.appendChild(helpEl);

      this.addDOMWidget("zit_ui","div",root,{
        getValue(){return null;}, setValue(){}, serialize:false,
        computeSize(){return [NODE_W,NODE_H];},
      });
      self.size=[NODE_W,NODE_H]; self.setSize?.([NODE_W,NODE_H]);
    };
  },
});
