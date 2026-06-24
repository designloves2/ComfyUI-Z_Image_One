# Z-Image ONE (TJ)

<img width="864" height="690" alt="Screen Shot 2026-06-25 at 08 11 37 693 AM" src="https://github.com/user-attachments/assets/03d78431-7192-48aa-9339-7e181ccbdfdb" />

> **One Node to rule them all** — Z-Image Turbo(AuraFlow/Lumina2 계열 flow-matching 모델) 전용 올인원 UI 노드.  
> 워크플로우 배선 없이 노드 하나에서 T2I · I2I · Inpaint · RE-BG · ControlNet · Face Redraw를 전환하며 사용합니다.

---

## 목차

1. [기능 개요](#기능-개요)
2. [설치 방법](#설치-방법)
3. [필수 커스텀 노드](#필수-커스텀-노드)
4. [필수 모델 다운로드](#필수-모델-다운로드)
5. [모드별 상세 설명](#모드별-상세-설명)
6. [공통 기능](#공통-기능)
7. [라이선스](#라이선스)

---

## 기능 개요

| 모드 | 설명 |
|---|---|
| **T2I** | 텍스트 → 이미지 기본 생성 |
| **I2I** | 소스 이미지 기반 변형 생성 |
| **INPAINT** | 내장 마스크 에디터로 특정 영역만 재생성 |
| **RE-BG** | RMBG로 서브젝트 분리 → 배경 완전 재생성 (경계선 없음) |
| **CONTROLNET** | Depth / Canny / Pose / HED / MLSD 레퍼런스 이미지 가이드 생성 |
| **FACE REDRAW** | 얼굴 자동 감지 → 크롭 → LoRA 재생성 → 원본에 블렌드 |

---

## 설치 방법

### 1. 이 노드 설치

**ComfyUI Manager 사용 (권장)**

ComfyUI Manager → Install Custom Nodes → `ComfyUI-Z_Image_One` 검색 후 설치

**수동 설치**

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/your-repo/ComfyUI-Z_Image_One.git
```

ComfyUI를 재시작하면 노드 목록에 **Z Image ONE (TJ)** 로 나타납니다.

---

## 필수 커스텀 노드

아래 노드들을 **ComfyUI Manager** 또는 `custom_nodes/` 에 직접 클론하여 설치합니다.

### 전 모드 공통 필수

| 패키지 | 설치 방법 |
|---|---|
| **ComfyUI Manager** | ComfyUI Manager 자체 설치 필요 — [GitHub](https://github.com/ltdrdata/ComfyUI-Manager) |

### CONTROLNET · FACE REDRAW 모드 필수

| 패키지 | 용도 | GitHub |
|---|---|---|
| **comfyui_controlnet_aux** | Canny / Depth / Pose / HED / MLSD 전처리기 | [Fannovel16/comfyui_controlnet_aux](https://github.com/Fannovel16/comfyui_controlnet_aux) |

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git
```

### FACE REDRAW 모드 필수

| 패키지 | 용도 | GitHub |
|---|---|---|
| **ComfyUI-Impact-Pack** | FaceDetailer 노드 (얼굴 감지 → 재생성 → 스티치) | [ltdrdata/ComfyUI-Impact-Pack](https://github.com/ltdrdata/ComfyUI-Impact-Pack) |
| **ComfyUI-Impact-Subpack** | Impact Pack 의존 패키지 | [ltdrdata/ComfyUI-Impact-Subpack](https://github.com/ltdrdata/ComfyUI-Impact-Subpack) |

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ltdrdata/ComfyUI-Impact-Pack.git
git clone https://github.com/ltdrdata/ComfyUI-Impact-Subpack.git
```

### RE-BG 모드 필수

| 패키지 | 용도 | GitHub |
|---|---|---|
| **ComfyUI-BiRefNet-Universal** | `LoadBackgroundRemovalModel` / `RemoveBackground` 노드 | [ZHO-ZHO-ZHO/ComfyUI-BiRefNet-Universal](https://github.com/ZHO-ZHO-ZHO/ComfyUI-BiRefNet-Universal) |

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ZHO-ZHO-ZHO/ComfyUI-BiRefNet-Universal.git
```

> BiRefNet 대신 다른 배경제거 패키지(INSPYRENET 등)를 사용하는 경우, `LoadBackgroundRemovalModel` / `RemoveBackground` 노드 이름이 동일한 패키지면 대체 가능합니다.

---

## 필수 모델 다운로드

### ① 메인 모델 (전 모드 공통 필수)

#### Diffusion Model
> 경로: `ComfyUI/models/diffusion_models/`

| 파일명 | 링크 |
|---|---|
| `z_image_turbo_bf16.safetensors` | [HuggingFace ↗](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/diffusion_models/z_image_turbo_bf16.safetensors) |

#### Text Encoder
> 경로: `ComfyUI/models/text_encoders/`

| 파일명 | 링크 |
|---|---|
| `qwen_3_4b.safetensors` | [HuggingFace ↗](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors) |

#### VAE
> 경로: `ComfyUI/models/vae/`

| 파일명 | 링크 |
|---|---|
| `ae.safetensors` | [HuggingFace ↗](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors) |

---

### ② ControlNet 모델 (CONTROLNET · FACE REDRAW 모드)

> 경로: `ComfyUI/models/model_patches/`

| 파일명 | 링크 |
|---|---|
| `Z-Image-Turbo-Fun-Controlnet-Union.safetensors` | [HuggingFace ↗](https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union.safetensors) |

---

### ③ 얼굴 감지 모델 (FACE REDRAW 모드)

> 경로: `ComfyUI/models/ultralytics/bbox/`

아래 중 하나를 다운로드합니다.

| 파일명 | 링크 |
|---|---|
| `face_yolov8m.pt` | [HuggingFace ↗](https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt) |
| `face_yolov9c.pt` | [HuggingFace ↗](https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov9c.pt) |

> `face_yolov8m.pt` 권장 (속도·정확도 균형).

---

### ④ 배경 제거 모델 (RE-BG 모드)

> 경로: `ComfyUI/models/BiRefNet/`  
> (ComfyUI-BiRefNet-Universal 패키지의 기본 경로)

아래 중 용도에 맞게 선택하여 다운로드합니다.

| 모델명 | 용도 | 링크 |
|---|---|---|
| `BiRefNet-general` | 범용 (권장, 첫 번째 선택) | [HuggingFace ↗](https://huggingface.co/ZhengPeng7/BiRefNet/resolve/main/BiRefNet-general.pth) |
| `BiRefNet-portrait` | 인물 사진 특화 | [HuggingFace ↗](https://huggingface.co/ZhengPeng7/BiRefNet-portrait/resolve/main/BiRefNet-portrait.pth) |
| `BiRefNet-HR` | 고해상도 이미지 | [HuggingFace ↗](https://huggingface.co/ZhengPeng7/BiRefNet-HR/resolve/main/BiRefNet-HR.pth) |

> 모델을 설치하면 RE-BG 패널의 **BG Removal Model** 드롭다운에 자동으로 나타납니다.

---

### ⑤ LoRA (FACE REDRAW · 전 모드 선택사항)

> 경로: `ComfyUI/models/loras/`

Z-Image Turbo 호환 LoRA 파일(`.safetensors`)을 위 경로에 넣으면 각 모드의 LoRA 섹션에서 선택할 수 있습니다.  
FACE REDRAW 모드에서는 특정 인물/캐릭터 LoRA를 지정하면 얼굴 재생성 시 해당 특성이 반영됩니다.

---

## 모델 경로 요약

```
ComfyUI/
├── models/
│   ├── diffusion_models/
│   │   └── z_image_turbo_bf16.safetensors          ← 메인 모델
│   ├── text_encoders/
│   │   └── qwen_3_4b.safetensors                   ← 텍스트 인코더
│   ├── vae/
│   │   └── ae.safetensors                          ← VAE
│   ├── model_patches/
│   │   └── Z-Image-Turbo-Fun-Controlnet-Union.safetensors  ← ControlNet
│   ├── ultralytics/
│   │   └── bbox/
│   │       └── face_yolov8m.pt                     ← 얼굴 감지 (FACE REDRAW)
│   ├── BiRefNet/
│   │   ├── BiRefNet-general.pth                    ← 배경 제거 (RE-BG)
│   │   └── BiRefNet-portrait.pth
│   └── loras/
│       └── (Z-Image Turbo 호환 LoRA 파일들)
└── custom_nodes/
    ├── ComfyUI-Z_Image_One/                        ← 이 노드
    ├── comfyui_controlnet_aux/                     ← CONTROLNET·FACE REDRAW
    ├── ComfyUI-Impact-Pack/                        ← FACE REDRAW
    ├── ComfyUI-Impact-Subpack/                     ← FACE REDRAW
    └── ComfyUI-BiRefNet-Universal/                 ← RE-BG
```

---

## 모드별 상세 설명

### T2I — 텍스트 → 이미지

프롬프트만으로 이미지를 생성합니다.

- **Width / Height** — 출력 해상도 (기본 1024×1536)
- **Steps** — 샘플링 스텝 수 (기본 20)
- **Guidance (CFG)** — 프롬프트 반영 강도
- **Shift** — AuraFlow 전용 노이즈 스케줄 파라미터 (기본 3)
- **Seed** — 고정/랜덤/증가/감소 모드 선택
- **LoRA** — 최대 3개 체인 가능, 각각 강도 조절

---

### I2I — 이미지 → 이미지

소스 이미지를 참고해 변형 생성합니다.

- **Source Image** — 업로드 또는 Gallery에서 Send to → I2I
- **Denoise** — 0에 가까울수록 원본 유지, 1에 가까울수록 자유 변형 (권장: 0.5~0.8)
- **⇌ Compare** — ON 시 결과와 원본을 슬라이더로 나란히 비교

---

### INPAINT — 마스크 영역 재생성

내장 마스크 에디터로 특정 영역만 재생성합니다. `DifferentialDiffusion` + `SetLatentNoiseMask` 방식으로 원본 맥락을 유지하면서 마스크 영역만 자연스럽게 채웁니다.

**마스크 에디터 사용법**

1. Source Image 업로드
2. 캔버스에 브러시로 재생성할 영역을 칠함 (보라색 오버레이 = 재생성 대상)
3. **💾 마스크 저장** 클릭
4. Generate

**마스크 에디터 조작**

| 동작 | 기능 |
|---|---|
| 좌클릭 드래그 | 브러시 드로잉 |
| 스크롤 휠 | 커서 위치 기준 줌 인/아웃 |
| 중간 버튼 드래그 | 뷰 이동 (팬) |
| 우클릭 드래그 (줌 > 1× 시) | 뷰 이동 (팬) |
| **⤢ 크게 편집** | 뷰포트 크기 팝업에서 편집 (고해상도 이미지에 권장) |

- **Brush / Eraser** — 브러시 / 지우개 전환
- **✕ Clear** — 마스크 전체 초기화
- **Denoise** — 마스크 영역 재생성 강도 (권장: 0.7~0.9)

---

### RE-BG — 배경 재생성 + 확장

RMBG로 서브젝트를 분리하고 배경 전체를 새로 생성합니다. 기존 Outpaint의 경계선 문제가 없습니다.

**동작 원리**

1. BiRefNet → 서브젝트 마스크 추출 (흰=서브젝트)
2. Edge Offset / Edge Blur로 마스크 경계 미세 조정
3. 확장된 캔버스 전체를 KSampler(denoise=1.0)로 새 배경 생성
4. 원본 서브젝트를 새 배경 위에 합성 → 경계선 없는 결과

**주요 설정**

| 설정 | 설명 |
|---|---|
| **BG Removal Model** | 설치된 BiRefNet 모델 선택 |
| **Edge Offset** | 마스크 경계 확장(+) / 축소(-) px. 서브젝트 잘림 보정 |
| **Edge Blur** | 마스크 엣지 블러링으로 합성 경계 부드럽게 |
| **Expansion px** | 상/하/좌/우 확장 px (0이면 배경만 재생성) |
| **Expansion Edge Feathering** | 확장 영역 경계 블렌딩 (Expansion > 0 일 때 유효) |
| **Background Denoise** | 1.0 = 완전히 새 배경, 낮출수록 원본 배경 색감 유지 |

---

### CONTROLNET — 레퍼런스 이미지 가이드

레퍼런스 이미지의 구조를 참고해 생성합니다.

| 프리프로세서 | 용도 |
|---|---|
| **Depth** | 원근감·공간감 유지 |
| **Canny** | 엣지(윤곽선) 유지 |
| **Pose** | 인체 포즈 유지 (OpenPose) |
| **HED** | 부드러운 엣지 유지 |
| **MLSD** | 직선·건축 구조 유지 |

- **Strength** — ControlNet 강도 (0~2, 기본 1.0)
- **Resolution** — 전처리 해상도 (기본 1024)

---

### FACE REDRAW — 얼굴 재생성

얼굴을 자동 감지하여 재생성하고 원본에 블렌드합니다.

1. **FaceDetailer** (Impact Pack) → 얼굴 감지 (YOLOv8/v9)
2. DepthAnything → 깊이 맵 추출 (포즈/각도 유지)
3. ControlNet + LoRA → 얼굴 재생성
4. 원본 이미지에 페더 블렌드

- **Person LoRA** — 특정 인물/캐릭터 LoRA 지정 시 해당 얼굴로 재생성
- **Detector** — 사용할 YOLO 모델 선택
- **Denoise** — 재생성 강도

---

## 공통 기능

### 상단 바

| 버튼 | 기능 |
|---|---|
| **↺** | 노드 완전 초기화 (저장 데이터 삭제, 기본값으로 복원) |
| **⇌** | Compare ON/OFF — 결과와 원본을 슬라이더로 비교 (기본 ON) |
| **🗑** | RAM/VRAM 언로드 |
| **⚙** | 설정 (모델 선택, 네거티브 프롬프트, 저장 폴더) |
| **🖼** | 갤러리 (생성 이미지 브라우즈, 즐겨찾기, 삭제, 다른 모드로 전송) |
| **?** | 노드 내 전체 사용법 팝업 |

### Compare 슬라이더

- 기본 ON 상태
- 생성 완료 후 결과 이미지가 먼저 표시되고, 슬라이더를 오른쪽으로 드래그하면 원본이 드러남
- T2I 모드는 비교 원본이 없으므로 비활성

### 갤러리

- 생성 이미지 최근순 브라우즈
- ★ 즐겨찾기 / ✕ 삭제 / 🖥 전체화면 뷰어
- **Send to** — I2I · Inpaint · RE-BG · ControlNet · Face Redraw 로 이미지 전달

### LoRA

- 각 모드 하단 LoRA 섹션에서 최대 3개 체인 가능
- 각 LoRA별 strength 독립 설정

### 출력

- **Preview / Save** 토글 — Preview 시 저장 없이 미리보기만
- **Save Subfolder** — 저장 경로 하위 폴더 지정
- **IMAGE 출력 슬롯** — 다른 노드로 생성 이미지 전달 가능

---

## 라이선스

이 노드 코드는 제한 없이 자유롭게 사용 가능합니다.

사용하는 모델의 라이선스를 각 모델 페이지에서 반드시 확인하세요 (특히 상업적 사용 전):

- [Z-Image Turbo 모델 페이지](https://huggingface.co/Comfy-Org/z_image_turbo)
- [Z-Image-Turbo-Fun-Controlnet-Union](https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union)
- [BiRefNet](https://huggingface.co/ZhengPeng7/BiRefNet)

---

Built with [Claude](https://claude.ai) by Anthropic.
