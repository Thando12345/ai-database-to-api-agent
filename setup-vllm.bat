@echo off
echo Installing vLLM for local vision processing...
pip install vllm

echo Starting GLM-4.5V model server...
echo This will download the model on first run (may take time)
vllm serve "zai-org/GLM-4.5V" --host 0.0.0.0 --port 8000

echo vLLM server running on http://localhost:8000
pause