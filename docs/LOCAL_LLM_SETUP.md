# SimXSphere — Local LLM Science Companion Setup Guide

SimXSphere features a built-in **Local AI Science Companion** that explains active simulations in real-time across **Chemistry**, **Probability**, and **Physics / Projectile Motion**.

---

## 🔒 100% Private, On-Device Architecture

- **Zero Cloud / Third-Party APIs**: All reasoning runs strictly on your own hardware via local models (defaulting to [Ollama](https://ollama.com)).
- **Zero Telemetry**: No prompts, simulation states, or student questions ever leave your computer.
- **Authoritative Engine Protection**: The LLM is purely an educational explanatory layer. It never computes or overrides authoritative numerical results from SimXSphere's simulation engines.
- **Offline Independence**: SimXSphere remains 100% functional even if the local model is uninstalled or offline.

---

## Quick Setup (3 Minutes)

### Step 1: Install Ollama
Download and install the free, open-source local LLM runner for your OS:
- **Windows / Mac / Linux**: Download from [ollama.com/download](https://ollama.com/download)

### Step 2: Download a Model
Open your terminal (PowerShell, Command Prompt, or Bash) and run one of our recommended lightweight models:

#### Recommended: Meta Llama 3.2 (Fast & High Quality)
```bash
ollama run llama3.2
```
*Note: For machines with lower RAM or older CPUs, you can run the ultra-lightweight 1B variant:*
```bash
ollama run llama3.2:1b
```

#### Alternative Lightweight Models
- **Microsoft Phi-3**: `ollama run phi3`
- **Mistral 7B**: `ollama run mistral`
- **Google Gemma 2**: `ollama run gemma2:2b`

### Step 3: Open SimXSphere
1. Launch SimXSphere in your browser (e.g. `http://localhost:5173/`).
2. Look at the **top right corner** for the small floating Science Companion bubble (`🤖`).
3. Click the bubble to open the companion popover.
4. The status indicator will turn **🟢 ● llama3.2**, signaling that your local companion is ready to chat and explain!

---

## How to Use the Science Companion

### 1. One-Click Explanations
Click any of the educational action chips:
- **📖 Explain State**: Explains what is happening right now in plain English.
- **🔬 Why did this happen?**: Explains the underlying physical or chemical law (e.g. conservation of energy, law of large numbers).
- **⚖️ Explain the Math**: Shows governing equations with the actual simulation values plugged in.
- **🔄 Explain Changes**: Compares the previous simulation parameters with your current ones to explain cause and effect.
- **❓ What if...?**: Explores hypothetical parameter changes.

### 2. Freeform Questions
Type any question into the companion's question bar (e.g., *"Why does 45° give the farthest landing distance?"* or *"What is the limiting reactant in this beaker?"*).

### 3. Audio Voice Narration
Click the **🔊 Listen** button in any response card to hear your companion read the explanation aloud using your browser's Web Speech API. Notice how the top-right bubble moves and soundwaves bounce while speaking!

---

## Configuration & Settings

Click the **⚙️ (Settings)** icon inside the Companion header to customize:
- **Ollama Base URL**: Default is `http://localhost:11434`.
- **Model Name**: Change between any models you have pulled (e.g. `llama3.2`, `phi3`, `mistral`).
- Settings are saved automatically in your browser's local storage.

---

## Troubleshooting

### Issue: "⚠️ Ollama Offline"
- **Cause**: The Ollama background process is not running.
- **Fix**: Launch the Ollama app from your Start Menu / Applications, or run `ollama serve` in your terminal. Click **🔄 Retry Connection** in the companion panel.

### Issue: "Model 'llama3.2' not found"
- **Cause**: Ollama is running, but the specified model hasn't been downloaded yet.
- **Fix**: Open your terminal and run `ollama pull llama3.2`.

### Issue: Explanations are taking a long time (Slow Latency)
- **Cause**: The model may be too large for your CPU/GPU hardware.
- **Fix**: Switch to a smaller parameter model such as `llama3.2:1b` or `gemma2:2b`.

---

## Model Fallibility & Educational Purpose
- The Science Companion is an educational assistant designed to explain concepts and foster curiosity.
- The simulation engines remain the sole source of truth for all mathematical calculations.
- Always refer to established textbooks and verified scientific literature for formal laboratory coursework.
