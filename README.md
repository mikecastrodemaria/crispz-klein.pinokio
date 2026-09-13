# crispz-klein.pinokio

1-click [Pinokio](https://pinokio.computer) launcher for
**[crispz-klein](https://github.com/mikecastrodemaria/crispz-klein)** — a
**FLUX.2 Klein 4B** creation + editing studio (Fooocus-style, 100% local).

## What it does

Installs and launches crispz-klein in one click:

- **Install** — clones `mikecastrodemaria/crispz-klein` into `app/`, creates a
  venv, installs the project requirements (`requirements.txt` +
  `requirements-extra.txt`), the Face Swap deps, and PyTorch (CUDA cu128 on
  NVIDIA / ROCm / MPS / CPU). Ends with a check that the installed diffusers
  really exposes `Flux2KleinPipeline` and `Flux2KleinInpaintPipeline`.
- **Start** — runs `python app.py` and opens the Gradio Web UI.
- **Update** — force-updates the launcher and the app to their `origin/main`,
  refreshes deps, reasserts the right torch build, re-runs the pipeline check.
- **Reset** — removes `app/` (and its venv) to reinstall from scratch.

## Features (crispz-klein)

txt2img · **multi-reference editing in the same pipeline** (up to 4 refs — no
second model, no extra VRAM) · inpaint / outpaint / reframe · ESRGAN + refine
upscale · single-file/Civitai checkpoints + LoRA switching · **text-encoder swap**
· 277 styles · **Describe in 9 styles** / Improve prompt & Vision Mix (Ollama) ·
Remove BG · Face Swap · CLI + the crispz family CLI protocol v1 (`czp`). See the
app repo for full docs.

Measured on an RTX 5090, 1024×1024, 4 steps: **14.9 GB of VRAM for the whole
surface** (one model serves txt2img, edit, inpaint and img2img), txt2img in
**2.0 s**, an edit with one reference in **2.8 s**.

## Two things to know before using it

- **Negative prompts and the guidance slider do nothing.** FLUX.2 Klein is
  step-wise distilled: diffusers ignores `guidance_scale`, and the Flux2Klein
  pipelines expose no `negative_prompt`. Renders at guidance 1.0 / 4.0 / 8.0 are
  bit-identical. Both controls survive for API compatibility only; the CLI
  protocol announces `supports.negative: false`.
- **The edit-LoRA catalogue is empty.** The Qwen-Image-Edit presets of the
  upstream fork cannot load on FLUX.2, so they are not advertised.

## Requirements

- [Pinokio](https://pinokio.computer) installed.
- An NVIDIA GPU is recommended (RTX 5090 / Blackwell → cu128). CPU/AMD/Apple are
  also handled by the torch installer, but generation will be slow without CUDA.
- **~16 GB of VRAM** for the default full-VRAM mode. Below that, set
  `default_cpu_offload` to `model` in the app's `config.txt`.
- First generation downloads `black-forest-labs/FLUX.2-klein-4B` from Hugging
  Face (~15 GB: transformer 7.2 GB + Qwen3 text encoder 7.5 GB + VAE), cached
  afterwards. The repo is public and **Apache 2.0** — no gated access, no token.

## Optional: Face Swap & Ollama

- **Face Swap**: the Python deps (`insightface` + the ONNX runtime matching your
  GPU) are installed by Install/Update automatically. The **inswapper model is
  NOT downloaded** (its weights are not redistributable): drop
  `inswapper_128.onnx` into `app/faceswap/`, or set `faceswap_model_path` /
  `faceswap_model_url` in the app's `config.txt`. Until then the tab reports
  `inswapper model not found`.
- **Describe / Improve / Vision Mix** need a local [Ollama](https://ollama.com)
  with a vision model. Ollama is detected when the page loads and the vision model
  you pick is remembered; if Ollama is off or fails, Describe falls back to the
  caption model instead of stopping on an error.
- **Describe styles** (Advanced → Prompt AI): *Prompt (prose)*, the default, was
  measured by regenerating each description with klein at the same seed — it names
  the medium first, quotes a sign once and gives the era. Also *Prompt (tags)*,
  *Photo (technical)*, *Art & style*, *Composition & layout*, *Character sheet*,
  *Text & typography*, *Dataset paragraph* (training captions, after
  [Captionz](https://github.com/mikecastrodemaria/Captionz)) and *Short caption*.
  **Length** goes from 60 to 300 words, and the exact instruction sent is shown.
- **Caption model** (Inpaint / Outpaint Auto-describe and the Describe fallback):
  local BLIP, or one of your Ollama vision models (`ollama:<name>`). Pick a small
  one (3-8 GB): it runs right before the image model. BLIP takes over if Ollama fails.
- Ollama calls send `ollama_num_ctx` 8192 and cap answers at `ollama_num_predict`
  700 tokens (both in `config.txt`): a Modelfile default context can double the
  VRAM, and a model stuck in a loop no longer runs without end.

## Optional: text encoder

**Models → Checkpoints → Text encoder** swaps the Qwen3 text encoder for another of
the same shape — for instance an abliterated Qwen3-4B on the 4B base. Encoders
already downloaded to the Hugging Face cache are listed when they fit the current
base; the ones of another size are named under the list with the reason. The app
README explains which encoders fit and how to download them.

## Using the app programmatically

The app exposes the crispz family **CLI protocol v1** (JSON in, JSON out) through
`czp.bat` / `czp.sh` in `app/`. It routes to the running instance when there is
one and loads the pipeline locally otherwise.

### Shell

```bash
# what this build can do
app/czp.bat caps

# generate one image
app/czp.bat gen --spec spec.json
```

`spec.json`:

```json
{
  "protocol": 1,
  "op": "gen",
  "prompt": "a comic book panel, a lighthouse in a storm, ink lines, flat colors",
  "width": 1024,
  "height": 1024,
  "steps": 4,
  "seed": 42,
  "out_dir": "out/"
}
```

Ops: `caps` · `gen` · `edit` (image + instruction, `refs` for character
consistency) · `inpaint` (white area of a mask) · `upscale` (`factor` 1 = pure
img2img variation). A spec carrying `negative` or `guidance` still succeeds — it
comes back with a `warnings` entry saying the field had no effect.

### Python

```python
import json, subprocess

spec = {"protocol": 1, "op": "gen", "prompt": "a lighthouse in a storm",
        "width": 1024, "height": 1024, "steps": 4, "seed": 42, "out_dir": "out/"}
with open("spec.json", "w") as f:
    json.dump(spec, f)

out = subprocess.run(["app/czp.bat", "gen", "--spec", "spec.json"],
                     capture_output=True, text=True)
print(json.loads(out.stdout.strip().splitlines()[-1])["images"])
```

### JavaScript

```javascript
const { execFileSync } = require("child_process")
const fs = require("fs")

fs.writeFileSync("spec.json", JSON.stringify({
  protocol: 1, op: "gen", prompt: "a lighthouse in a storm",
  width: 1024, height: 1024, steps: 4, seed: 42, out_dir: "out/"
}))

const out = execFileSync("app/czp.bat", ["gen", "--spec", "spec.json"], { encoding: "utf8" })
console.log(JSON.parse(out.trim().split("\n").pop()).images)
```

### curl (Gradio endpoint, app running)

The Web UI is a Gradio app, so the same generation is reachable over HTTP once
`Start` is running:

```bash
curl -s -X POST http://127.0.0.1:7860/gradio_api/call/cli_gen \
  -H "Content-Type: application/json" \
  -d '{"data": ["{\"protocol\":1,\"op\":\"gen\",\"prompt\":\"a lighthouse in a storm\",\"steps\":4,\"seed\":42}"]}'
```

The reply carries an event id; `GET` the same path with `/<event_id>` appended to
read the JSON result.

## Notes

- **One port for the whole family.** crispz apps all serve on 7860 by design
  ("no per-tool port"): the reply's `tool` field identifies who answered, not the
  port. Only run one crispz app at a time, or a `czp` call may reach a sibling.
- **Updates**: use Pinokio's **Update** (launcher + app + dependencies + torch).
  The app's own `boot_check.bat` also offers GitHub updates, but that prompt is
  meant for standalone installs.
- `app/`, `env/` and `logs/` are gitignored (created at install time).
- The app's `config.txt` is not in the repo. Without it the app reads
  `config-sample.txt`, which already ships the right klein defaults (4 steps,
  guidance 1.0, offload `none`). Copy it to `config.txt` to customize.
