# One Node · Z-Image Turbo

A ComfyUI custom node that wraps a full Z-Image Turbo workflow into a single self-contained UI widget. No graph to build, no spaghetti wires to connect, just one node with everything inside.

> *One Node to rule them all, One Node to find them,*
> *One Node to bring them all, and in ComfyUI bind them.*
>
> *— J.R.R. Tolkien, probably, if he used ComfyUI*

---

## What it does

The node has 6 modes, switchable with a single click:

**T2I** — standard text to image generation.

**I2I** — good for creating variations or gently nudging an image in a different direction.

**PAINT** — three tools in one:
- Sketch: draw freehand and generate from it.
- Inpaint: paint a mask over the area you want to change, write what should be there instead.
- Outpaint: expand the image in any direction by setting how much to extend on each side.

**CONTROLNET** — guide generation with a reference image using the official Z-Image-Turbo Fun ControlNet Union model (Depth / Canny / Pose / HED / MLSD).

**FACE REDRAW** — automatically detects the face in a photo, regenerates just that area using a person LoRA (guided by a depth map so the pose/angle stays consistent), and blends it back into the original with a feathered edge. This replaces the old "Faceswap" concept from the FLUX.2 [klein] version of this node — Z-Image Turbo has no dedicated faceswap LoRA, so this mode does the equivalent job a different way.

**GALLERY** — browse, favorite, and delete images from your save folder.

Generated images can also be sent out through the node's **IMAGE output slot** to other nodes, in addition to being shown inside the node itself.

---

## Installation

Clone this repo into your ComfyUI `custom_nodes` folder, then restart ComfyUI. The node appears as **One Node · Z-Image Turbo**.

### Required additional custom nodes

Different modes need different helper packages. Install whichever modes you plan to use (or all of them) via ComfyUI Manager, or by cloning into `custom_nodes`:

| Needed for | Package |
|---|---|
| PAINT (Inpaint / Outpaint), FACE REDRAW | [ComfyUI-Inpaint-CropAndStitch](https://github.com/lquesada/ComfyUI-Inpaint-CropAndStitch) by lquesada |
| CONTROLNET, FACE REDRAW | [ComfyUI's ControlNet Auxiliary Preprocessors](https://github.com/Fannovel16/comfyui_controlnet_aux) by Fannovel16 |
| FACE REDRAW | [ComfyUI-Impact-Pack](https://github.com/ltdrdata/ComfyUI-Impact-Pack) + [ComfyUI-Impact-Subpack](https://github.com/ltdrdata/ComfyUI-Impact-Subpack) by ltdrdata |

---

## Models

This node works with the official Z-Image Turbo release.

**Diffusion model** (place in `models/diffusion_models/`)
- [z_image_turbo_bf16.safetensors](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/diffusion_models/z_image_turbo_bf16.safetensors)

**Text encoder** (place in `models/text_encoders/`)
- [qwen_3_4b.safetensors](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors)

**VAE** (place in `models/vae/`)
- [ae.safetensors](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors)

**ControlNet Union model** (place in `models/model_patches/`, only needed for CONTROLNET / FACE REDRAW)
- [Z-Image-Turbo-Fun-Controlnet-Union.safetensors](https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union.safetensors)

**Face detector model** (place in `models/ultralytics/bbox/`, only needed for FACE REDRAW)
- [face_yolov8m.pt or face_yolov9c.pt](https://huggingface.co/Bingsu/adetailer/tree/main) — any Ultralytics face-detection `.pt` file works

**Person / Face LoRA** (place in `models/loras/`, used by FACE REDRAW)
- Any Z-Image Turbo–compatible LoRA trained on a specific person/face works here. There is no dedicated "faceswap" LoRA for Z-Image Turbo — train or source a regular character/person LoRA instead.

---

## Known limitations (please read before reporting an issue)

This is a fairly fast, staged rebuild of the original FLUX.2 [klein] version of this node for Z-Image Turbo. A few areas are more "best effort" than fully battle-tested:

- **CONTROLNET / FACE REDRAW wiring**: the exact input names of the `ZImageFunControlnet` node come from official-but-AI-generated ComfyUI docs, which noted they may contain small errors. The overall structure should be correct, but a field name or two might need a small fix once tested against your exact ComfyUI version.
- **Outpaint extend ratios**: the meaning of "how far 1.0 extends the canvas" depends on `ComfyUI-Inpaint-CropAndStitch`'s own internal behavior and hasn't been tuned against real output yet.
- **FACE REDRAW with multiple faces**: the current version regenerates *all* detected faces in the photo together, not one at a time.

If you hit any of these, they're usually a one-line fix in `web/modules/graph_builder.js` once you can see the actual error ComfyUI reports.

---

## License note on Z-Image Turbo

Please check the license terms on the [official Z-Image Turbo model page](https://huggingface.co/Comfy-Org/z_image_turbo) and the [Z-Image-Turbo-Fun-Controlnet-Union page](https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union) before commercial use.

This node itself is fully open source with no restrictions.

---

Built with the help of [Claude](https://claude.ai) by Anthropic.

---

## Changelog

### This release — Z-Image Turbo remake

Rebuilt from the ground up from the original **One Node · FLUX.2 [klein]** node to work with Z-Image Turbo:

- Removed EDIT mode (no equivalent reference-edit conditioning available for Z-Image Turbo yet).
- Replaced FACESWAP with **FACE REDRAW** (auto face-detect → crop → depth-guided LoRA regenerate → feather-blend back), since no dedicated faceswap LoRA exists for this model.
- Added a brand new **CONTROLNET** mode using the official Z-Image-Turbo Fun ControlNet Union model.
- Added **Save / Preview** toggle, configurable save folder, a real **IMAGE output slot**, and a working **Gallery** tab.
- The screen code was split into separate files under `web/modules/` instead of one large file, to keep things maintainable.
