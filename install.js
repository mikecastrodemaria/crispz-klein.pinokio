module.exports = {
  requires: {
    bundle: "ai"
  },
  run: [
    // Clone crispz-klein into the local app/ folder
    {
      method: "shell.run",
      params: {
        message: [
          "git clone https://github.com/mikecastrodemaria/crispz-klein app"
        ]
      }
    },
    // Install crispz-klein dependencies (core + extras) in a dedicated venv.
    // requirements.txt pins the diffusers commit that exposes the FLUX.2 pipelines
    // (Flux2KleinPipeline / Flux2KleinInpaintPipeline) and carries gguf + hf_xet.
    {
      method: "shell.run",
      params: {
        venv: "env",
        // UTF-8 env: packages built from source read UTF-8 files in their
        // setup; the legacy cp1252 codec on Windows fails the build.
        env: {
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8"
        },
        path: "app",
        message: [
          "uv pip install -r requirements.txt",
          "uv pip install -r requirements-extra.txt"
        ]
      }
    },
    // Face Swap tab dependencies (requirements-faceswap.txt).
    // insightface depends on the CPU 'onnxruntime', which shares its files with
    // 'onnxruntime-gpu': whichever is installed last wins. Installing both in one
    // resolution silently leaves the CPU build on top (no CUDAExecutionProvider),
    // so the runtime matching this machine is force-reinstalled last.
    // onnxruntime-gpu has no macOS/ROCm wheels -> plain onnxruntime elsewhere.
    {
      method: "shell.run",
      params: {
        venv: "env",
        env: {
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8"
        },
        path: "app",
        message: [
          "uv pip install \"insightface>=0.7\"",
          "uv pip install --force-reinstall --no-deps {{gpu === 'nvidia' ? 'onnxruntime-gpu' : 'onnxruntime'}}"
        ]
      }
    },
    // Install PyTorch (CUDA cu128 on NVIDIA / ROCm / MPS / CPU) cross-platform
    {
      method: "script.start",
      params: {
        uri: "torch.js",
        params: {
          venv: "env",
          path: "app"
        }
      }
    },
    // Verify the installed diffusers really exposes the FLUX.2 Klein pipelines.
    // Without them the app imports fine and only fails at the first render, which
    // is a confusing place to discover a dependency problem.
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        message: [
          "python -c \"from diffusers import Flux2KleinPipeline, Flux2KleinInpaintPipeline; print('FLUX.2 Klein pipelines OK')\""
        ]
      }
    },
    // Deduplicate the venv to save disk space
    {
      method: "fs.link",
      params: {
        venv: "app/env"
      }
    }
  ]
}
