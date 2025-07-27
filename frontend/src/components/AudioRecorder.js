import { useRef, useState } from "react";
import Button from "./common/Button";
import { Plus, X } from "lucide-react";

export const AudioRecorderUploader = ({ onAudioUpload, onRemoveAudio, audioFiles = [], loading = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioFileInputRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];
      
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        try {
          const audioContext = new AudioContext();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const duration = audioBuffer.duration;
          
          if (duration > 60) {
            alert('Audio duration exceeds 1 minute. Please record a shorter audio.');
            return;
          }
          
          // Convert Blob to File for consistency with uploaded files
          const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
            type: 'audio/webm',
            lastModified: Date.now()
          });
          
          onAudioUpload(audioFile);
        } catch (err) {
          console.error('Error checking audio duration:', err);
          if (audioBlob.size > 1024 * 1024) {
            alert('Audio might be too long. Please record a shorter audio.');
          } else {
            const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
              type: 'audio/webm',
              lastModified: Date.now()
            });
            onAudioUpload(audioFile);
          }
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

    } catch (err) {
      alert('Error accessing microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleAudioFileUpload = async (files) => {
    for (const file of Array.from(files)) {
      if (file.type.startsWith("audio/")) {
        try {
          const audioContext = new AudioContext();
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          if (audioBuffer.duration > 60) {
            alert('Audio duration exceeds 1 minute. Please upload a shorter audio.');
            continue;
          }
          
          onAudioUpload(file);
        } catch (err) {
          console.error('Error checking audio duration:', err);
          if (file.size > 1024 * 1024) {
            alert('This audio file might be too long. Max 1 minute allowed.');
          } else {
            onAudioUpload(file);
          }
        }
      } else {
        alert('Unsupported file type. Please upload an audio file.');
      }
    }
  };

  const handleButtonClick = () => {
    if (audioFileInputRef.current) {
      audioFileInputRef.current.click();
    }
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isRecording ? "border-red-400 bg-red-50" : "border-gray-300"
        } ${loading ? "opacity-50" : "hover:border-gray-400"}`}
      >
        <div className="flex justify-center mb-4">
          {!isRecording ? (
            <Button
              type="button"
              variant="primary"
              onClick={startRecording}
              disabled={loading}
              leftIcon={<Plus />}
            >
              Start Recording
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={stopRecording}
              disabled={loading}
              leftIcon={<X />}
            >
              Stop Recording
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={loading || isRecording}
            leftIcon={<Plus />}
            className="ml-2"
          >
            Upload Audio
          </Button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Record or upload audio • Max 1 minute
        </p>

        <input
          ref={audioFileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={(e) => {
            if (e.target.files) {
              handleAudioFileUpload(e.target.files);
            }
          }}
          style={{ display: "none" }}
          disabled={loading || isRecording}
        />
      </div>

      {audioFiles.length > 0 && (
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {audioFiles.map((file, index) => (
            <div key={index} className="relative flex-shrink-0 w-32 group">
              <audio
                src={URL.createObjectURL(file)}
                controls
                className="w-full"
              />
              <button
                type="button"
                onClick={() => onRemoveAudio(file)}
                className="absolute p-1 text-white transition-opacity bg-red-500 rounded-full opacity-0 top-1 right-1 hover:bg-red-600 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};