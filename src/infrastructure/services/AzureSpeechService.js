const sdk = require('microsoft-cognitiveservices-speech-sdk');

class AzureSpeechService {
  constructor(subscriptionKey, region) {
    this.speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
    this.speechConfig.speechRecognitionLanguage = "en-US";
  }

  async transcribe(audioBuffer) {
    return new Promise((resolve, reject) => {
      const audioConfig = sdk.AudioConfig.fromWavFileInput(audioBuffer);
      const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);

      recognizer.recognizeOnceAsync(result => {
        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
          resolve(result.text);
        } else {
          reject(new Error('Speech recognition failed'));
        }
        recognizer.close();
      });
    });
  }

  async synthesize(text) {
    return new Promise((resolve, reject) => {
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);
      
      synthesizer.speakTextAsync(text, result => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve(result.audioData);
        } else {
          reject(new Error('Speech synthesis failed'));
        }
        synthesizer.close();
      });
    });
  }
}

module.exports = AzureSpeechService;