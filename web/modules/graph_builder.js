// graph_builder.js
import { SUBFOLDER } from "./core.js";

function buildPromptText(state) {
  const modePrompt = (state.promptsByMode && state.mode && state.promptsByMode[state.mode] !== undefined)
    ? state.promptsByMode[state.mode] : (state.prompt || "");
  const parts = [modePrompt];
  (state.loras || []).forEach(l => {
    if (l.enabled !== false && l.name && l.name !== "none" && l.triggerWord) parts.push(l.triggerWord);
  });
  if (state.promptSuffix) parts.push(state.promptSuffix);
  return parts.filter(Boolean).join(", ");
}

function withLoraChain(modelLink, loras) {
  const graph = {};
  let out = modelLink;
  (loras || []).forEach((lora, i) => {
    if (!lora.name || lora.name === "none" || lora.enabled === false) return;
    const id = `ZIT:lora${i}`;
    graph[id] = { class_type:"LoraLoaderModelOnly", inputs:{ model:out, lora_name:lora.name, strength_model:lora.strength??1 } };
    out = [id, 0];
  });
  return { graph, modelOut: out };
}

function baseGraph(state) {
  const g = {};
  g["ZIT:unet"] = { class_type:"UNETLoader",  inputs:{ unet_name:state.model, weight_dtype:"default" } };
  g["ZIT:clip"] = { class_type:"CLIPLoader",  inputs:{ clip_name:state.textEncoder, type:"lumina2", device:"default" } };
  g["ZIT:vae"]  = { class_type:"VAELoader",   inputs:{ vae_name:state.vae } };
  const { graph: lg, modelOut } = withLoraChain(["ZIT:unet",0], state.loras||[]);
  Object.assign(g, lg);
  g["ZIT:modelSampling"] = { class_type:"ModelSamplingAuraFlow", inputs:{ model:modelOut, shift:state.shift??3 } };
  g["ZIT:positive"] = { class_type:"CLIPTextEncode", inputs:{ clip:["ZIT:clip",0], text:buildPromptText(state) } };
  g["ZIT:negative"] = { class_type:"CLIPTextEncode", inputs:{ clip:["ZIT:clip",0], text:state.negativePrompt||"" } };
  return g;
}

function saveNode(link, state) {
  if (state?.outputMode === "preview")
    return { class_type:"PreviewImage", inputs:{ images:link } };
  const folder = state?.saveSubfolder || SUBFOLDER;
  return { class_type:"SaveImage", inputs:{ images:link, filename_prefix:`${folder}/ZIT` } };
}

function ksampler(state, latent, denoise) {
  return { class_type:"KSampler", inputs:{
    model:["ZIT:modelSampling",0],
    positive:["ZIT:positive",0], negative:["ZIT:negative",0],
    latent_image:latent,
    seed:state.seed??0, steps:state.steps??8, cfg:state.cfg??1,
    sampler_name:state.sampler||"euler", scheduler:state.scheduler||"simple",
    denoise:denoise??1,
  }};
}

// ── T2I ──────────────────────────────────────────────────────────────────
export function buildT2IGraph(state) {
  const g = baseGraph(state);
  g["ZIT:latent"]    = { class_type:"EmptySD3LatentImage", inputs:{ width:state.width||1024, height:state.height||1536, batch_size:1 } };
  g["ZIT:sampler"]   = ksampler(state, ["ZIT:latent",0], 1);
  g["ZIT:vaeDecode"] = { class_type:"VAEDecode", inputs:{ samples:["ZIT:sampler",0], vae:["ZIT:vae",0] } };
  g["ZIT:save"]      = saveNode(["ZIT:vaeDecode",0], state);
  return g;
}

// ── I2I ──────────────────────────────────────────────────────────────────
export function buildI2IGraph(state) {
  if (!state.i2iImage) throw new Error("No source image uploaded.");
  const g = baseGraph(state);
  g["ZIT:load"]      = { class_type:"LoadImage", inputs:{ image:state.i2iImage } };
  g["ZIT:vaeEnc"]    = { class_type:"VAEEncode",  inputs:{ pixels:["ZIT:load",0], vae:["ZIT:vae",0] } };
  g["ZIT:sampler"]   = ksampler(state, ["ZIT:vaeEnc",0], state.i2iDenoise??0.75);
  g["ZIT:vaeDecode"] = { class_type:"VAEDecode", inputs:{ samples:["ZIT:sampler",0], vae:["ZIT:vae",0] } };
  g["ZIT:save"]      = saveNode(["ZIT:vaeDecode",0], state);
  return g;
}

// ── INPAINT — generate fresh into masked area, composite onto original ────
// Z-Image Turbo (flow-matching) is stable only with denoise=1 from empty latent.
// We generate a full new image from the prompt, then paste only the masked area
// back onto the original using ImageCompositeMasked.
export function buildInpaintGraph(state) {
  if (!state.inpaintImage) throw new Error("Upload a source image.");
  if (!state.inpaintMaskImage) throw new Error("Paint a mask first.");
  const g = baseGraph(state);

  const eW = state.inpaintEditW || 1024;
  const eH = state.inpaintEditH || 1024;

  g["ZIT:load"]      = { class_type:"LoadImage",   inputs:{ image:state.inpaintImage } };
  g["ZIT:loadMask"]  = { class_type:"LoadImage",   inputs:{ image:state.inpaintMaskImage } };

  // Scale source image to match mask editor dimensions
  g["ZIT:scaleImg"]  = { class_type:"ImageScale",  inputs:{ image:["ZIT:load",0],     upscale_method:"bilinear",      width:eW, height:eH, crop:"disabled" } };
  g["ZIT:scaleMask"] = { class_type:"ImageScale",  inputs:{ image:["ZIT:loadMask",0], upscale_method:"nearest-exact", width:eW, height:eH, crop:"disabled" } };
  g["ZIT:toMask"]    = { class_type:"ImageToMask", inputs:{ image:["ZIT:scaleMask",0], channel:"red" } };

  // Generate completely new image from scratch (flow model requires denoise=1 for stability)
  g["ZIT:latent"]    = { class_type:"EmptySD3LatentImage", inputs:{ width:eW, height:eH, batch_size:1 } };
  g["ZIT:sampler"]   = ksampler(state, ["ZIT:latent",0], 1);
  g["ZIT:vaeDecode"] = { class_type:"VAEDecode",   inputs:{ samples:["ZIT:sampler",0], vae:["ZIT:vae",0] } };

  // Composite: paste newly generated pixels into masked area of original
  // mask=1 (white) → show source (new), mask=0 (black) → show destination (original)
  g["ZIT:composite"] = {
    class_type:"ImageCompositeMasked",
    inputs:{ destination:["ZIT:scaleImg",0], source:["ZIT:vaeDecode",0], x:0, y:0, resize_source:false, mask:["ZIT:toMask",0] },
  };
  g["ZIT:save"] = saveNode(["ZIT:composite",0], state);
  return g;
}

// ── OUTPAINT — pad canvas, fill expanded area via full generation ─────────
export function buildOutpaintGraph(state) {
  if (!state.outpaintImage) throw new Error("Upload a source image.");
  const t = (state.outpaintUp||0)+(state.outpaintDown||0)+(state.outpaintLeft||0)+(state.outpaintRight||0);
  if (t <= 0) throw new Error("Set at least one expansion value > 0 px.");
  const g = baseGraph(state);
  g["ZIT:load"] = { class_type:"LoadImage",           inputs:{ image:state.outpaintImage } };
  g["ZIT:pad"]  = { class_type:"ImagePadForOutpaint", inputs:{
    image:["ZIT:load",0],
    left:Math.max(0,state.outpaintLeft||0), top:Math.max(0,state.outpaintUp||0),
    right:Math.max(0,state.outpaintRight||0), bottom:Math.max(0,state.outpaintDown||0),
    feathering:state.outpaintFeather??32,
  }};
  g["ZIT:vaeEnc"]    = { class_type:"VAEEncode",          inputs:{ pixels:["ZIT:pad",0], vae:["ZIT:vae",0] } };
  g["ZIT:noiseMask"] = { class_type:"SetLatentNoiseMask", inputs:{ samples:["ZIT:vaeEnc",0], mask:["ZIT:pad",1] } };
  g["ZIT:sampler"]   = ksampler(state, ["ZIT:noiseMask",0], 1);
  g["ZIT:vaeDecode"] = { class_type:"VAEDecode",          inputs:{ samples:["ZIT:sampler",0], vae:["ZIT:vae",0] } };
  g["ZIT:save"]      = saveNode(["ZIT:vaeDecode",0], state);
  return g;
}

// ── CONTROLNET ────────────────────────────────────────────────────────────
const PREPROCESSOR_MAP = { canny:"CannyEdgePreprocessor", depth:"DepthAnythingPreprocessor", pose:"DWPreprocessor", hed:"HEDPreprocessor", mlsd:"M-LSDPreprocessor" };

export function buildControlNetGraph(state) {
  if (!state.controlnetImage) throw new Error("Upload a reference image.");
  if (!state.controlnetModel)  throw new Error("Select a ControlNet Union model.");
  const g = {};
  g["ZIT:unet"] = { class_type:"UNETLoader", inputs:{ unet_name:state.model, weight_dtype:"default" } };
  g["ZIT:clip"] = { class_type:"CLIPLoader", inputs:{ clip_name:state.textEncoder, type:"lumina2", device:"default" } };
  g["ZIT:vae"]  = { class_type:"VAELoader",  inputs:{ vae_name:state.vae } };
  const { graph: lg, modelOut } = withLoraChain(["ZIT:unet",0], state.loras||[]);
  Object.assign(g, lg);
  g["ZIT:positive"] = { class_type:"CLIPTextEncode", inputs:{ clip:["ZIT:clip",0], text:buildPromptText(state) } };
  g["ZIT:negative"] = { class_type:"CLIPTextEncode", inputs:{ clip:["ZIT:clip",0], text:state.negativePrompt||"" } };
  g["ZIT:loadImg"]  = { class_type:"LoadImage", inputs:{ image:state.controlnetImage } };
  let ctrlLink = ["ZIT:loadImg",0];
  const prep = PREPROCESSOR_MAP[state.controlnetType??"depth"];
  if (prep) {
    g["ZIT:pre"] = { class_type:"AIO_Preprocessor", inputs:{ image:ctrlLink, preprocessor:prep, resolution:state.controlnetResolution??1024 } };
    ctrlLink = ["ZIT:pre",0];
  }
  g["ZIT:patch"]     = { class_type:"ModelPatchLoader",       inputs:{ name:state.controlnetModel } };
  g["ZIT:cnApply"]   = { class_type:"ZImageFunControlnet",    inputs:{ model:modelOut, model_patch:["ZIT:patch",0], vae:["ZIT:vae",0], strength:state.controlnetStrength??1, image:ctrlLink } };
  g["ZIT:modelSamp"] = { class_type:"ModelSamplingAuraFlow",  inputs:{ model:["ZIT:cnApply",0], shift:state.shift??3 } };
  g["ZIT:getSize"]   = { class_type:"GetImageSize",           inputs:{ image:ctrlLink } };
  g["ZIT:latent"]    = { class_type:"EmptySD3LatentImage",    inputs:{ width:["ZIT:getSize",0], height:["ZIT:getSize",1], batch_size:1 } };
  g["ZIT:sampler"]   = { class_type:"KSampler", inputs:{
    model:["ZIT:modelSamp",0], positive:["ZIT:positive",0], negative:["ZIT:negative",0],
    latent_image:["ZIT:latent",0], seed:state.seed??0, steps:state.steps??8, cfg:state.cfg??1,
    sampler_name:state.sampler||"euler", scheduler:state.scheduler||"simple", denoise:state.controlnetDenoise??1,
  }};
  g["ZIT:vaeDecode"] = { class_type:"VAEDecode", inputs:{ samples:["ZIT:sampler",0], vae:["ZIT:vae",0] } };
  g["ZIT:save"]      = saveNode(["ZIT:vaeDecode",0], state);
  return g;
}

// ── FACE REDRAW — uses FaceDetailer from Impact Pack ─────────────────────
// FaceDetailer handles detection → crop → diffusion → stitch internally.
export function buildFaceRedrawGraph(state) {
  if (!state.faceImage)          throw new Error("Upload a portrait image.");
  if (!state.faceDetectorModel || state.faceDetectorModel === "none") throw new Error("Select a face detector model.");

  const g = {};
  g["ZIT:unet"] = { class_type:"UNETLoader", inputs:{ unet_name:state.model, weight_dtype:"default" } };
  g["ZIT:clip"] = { class_type:"CLIPLoader", inputs:{ clip_name:state.textEncoder, type:"lumina2", device:"default" } };
  g["ZIT:vae"]  = { class_type:"VAELoader",  inputs:{ vae_name:state.vae } };
  const { graph: lg, modelOut } = withLoraChain(["ZIT:unet",0], state.loras||[]);
  Object.assign(g, lg);
  g["ZIT:modelSamp"] = { class_type:"ModelSamplingAuraFlow", inputs:{ model:modelOut, shift:state.shift??3 } };
  g["ZIT:positive"]  = { class_type:"CLIPTextEncode", inputs:{ clip:["ZIT:clip",0], text:buildPromptText(state) } };
  g["ZIT:negative"]  = { class_type:"CLIPTextEncode", inputs:{ clip:["ZIT:clip",0], text:state.negativePrompt||"" } };

  g["ZIT:loadImg"]   = { class_type:"LoadImage",                    inputs:{ image:state.faceImage } };
  g["ZIT:bboxProv"]  = { class_type:"UltralyticsDetectorProvider",  inputs:{ model_name:state.faceDetectorModel } };

  // FaceDetailer: auto-detect → crop → regenerate → stitch
  g["ZIT:faceDetail"] = {
    class_type:"FaceDetailer",
    inputs:{
      image:["ZIT:loadImg",0],
      model:["ZIT:modelSamp",0],
      clip:["ZIT:clip",0],
      vae:["ZIT:vae",0],
      positive:["ZIT:positive",0],
      negative:["ZIT:negative",0],
      bbox_detector:["ZIT:bboxProv",0],
      guide_size:512,
      guide_size_for:true,
      max_size:1024,
      seed:state.seed??0,
      steps:state.steps??8,
      cfg:state.cfg??1,
      sampler_name:state.sampler||"euler",
      scheduler:state.scheduler||"simple",
      denoise:state.faceDenoise??0.5,
      feather:state.faceFeather??5,
      noise_mask:true,
      force_inpaint:true,
      bbox_threshold:state.faceThreshold??0.5,
      bbox_dilation:state.faceDilation??4,
      bbox_crop_factor:3.0,
      sam_detection_hint:"center-1",
      sam_dilation:0,
      sam_threshold:0.93,
      sam_bbox_expansion:0,
      sam_mask_hint_threshold:0.7,
      sam_mask_hint_use_negative:"False",
      drop_size:10,
      refiner_ratio:0.2,
      inpaint_model:false,
      noise_mask_feather:20,
    },
  };
  g["ZIT:save"] = saveNode(["ZIT:faceDetail",0], state);
  return g;
}
