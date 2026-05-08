import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    timeTravel?: {
      setOpacity: (value: number) => void;
      setAlwaysOnTop: (value: boolean) => void;
      setClickThrough: (value: boolean) => void;
      closeWindow: () => void;
      minimizeWindow: () => void;
      onClickThroughOff?: (callback: () => void) => void;
      transcribeAudio?: (audioBuffer: ArrayBuffer) => Promise<string>;
    };
  }
}

function App() {
  const webviewRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [url, setUrl] = useState("https://chatgpt.com");
  const [opacity, setOpacity] = useState(0.88);
  const [alwaysTop, setAlwaysTop] = useState(true);
  const [clickThrough, setClickThrough] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    window.timeTravel?.onClickThroughOff?.(() => {
      setClickThrough(false);
    });
  }, []);

  const openUrl = () => {
    let finalUrl = url.trim();

    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    webviewRef.current?.loadURL(finalUrl);
  };

  const changeOpacity = (value: number) => {
    setOpacity(value);
    window.timeTravel?.setOpacity(value);
  };

  const toggleAlwaysTop = () => {
    const next = !alwaysTop;
    setAlwaysTop(next);
    window.timeTravel?.setAlwaysOnTop(next);
  };

  const toggleClickThrough = () => {
    const next = !clickThrough;
    setClickThrough(next);
    window.timeTravel?.setClickThrough(next);
  };

  const insertIntoChatGPT = async (text: string) => {
    const safeText = JSON.stringify(text);

    const result = await webviewRef.current?.executeJavaScript(`
      (() => {
        const text = ${safeText};

        const editor =
          document.querySelector('#prompt-textarea') ||
          document.querySelector('[contenteditable="true"]') ||
          document.querySelector('textarea');

        if (!editor) {
          return "NO_CHATGPT_INPUT_FOUND";
        }

        editor.focus();

        if (editor.tagName === "TEXTAREA") {
          editor.value = text;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          editor.innerHTML = "";
          document.execCommand("insertText", false, text);
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        }

        setTimeout(() => {
          const sendButton =
            document.querySelector('[data-testid="send-button"]') ||
            document.querySelector('button[aria-label*="Send"]');

          if (sendButton) {
            sendButton.click();
          }
        }, 300);

        return "INSERTED_AND_SENT";
      })();
    `);

    setStatus(result || "Sent");
  };

  const startRecording = async () => {
    try {
      setStatus("Requesting mic...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      streamRef.current = stream;

      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm"
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setStatus("Transcribing...");

          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm"
          });

          const audioBuffer = await audioBlob.arrayBuffer();

          const text = await window.timeTravel?.transcribeAudio?.(audioBuffer);

          if (!text || !text.trim()) {
            setStatus("No speech captured");
            return;
          }

          setStatus("Sending to ChatGPT...");
          await insertIntoChatGPT(text.trim());
        } catch (error: any) {
          console.error(error);
          setStatus("Transcription failed");
          alert(error.message || "Transcription failed");
        } finally {
          streamRef.current?.getTracks().forEach((track) => track.stop());

          streamRef.current = null;

          setIsRecording(false);
        }
      };

      mediaRecorder.start();

      setIsRecording(true);
      setStatus("Recording...");
    } catch (error) {
      console.error(error);

      setStatus("Mic permission denied");

      alert(
        "Please allow microphone permission for this app in Mac System Settings."
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      setStatus("Stopping...");
      mediaRecorderRef.current.stop();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">TimeTravel AI Browser</div>

        <input
          className="address"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && openUrl()}
        />

        <button onClick={openUrl}>Go</button>

        <label className="sliderWrap">
          Opacity
          <input
            type="range"
            min="0.35"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => changeOpacity(Number(e.target.value))}
          />
        </label>

        <button onClick={toggleAlwaysTop}>
          {alwaysTop ? "Top ON" : "Top OFF"}
        </button>

        <button onClick={toggleClickThrough}>
          {clickThrough ? "Click THROUGH" : "Click NORMAL"}
        </button>

        <button onClick={() => window.timeTravel?.minimizeWindow()}>
          _
        </button>

        <button
          className="danger"
          onClick={() => window.timeTravel?.closeWindow()}
        >
          X
        </button>
      </div>

      <div className="voiceBar">
        <button
          className={isRecording ? "micButton listening" : "micButton"}
          onClick={handleMicClick}
        >
          {isRecording ? "■" : "🎙"}
        </button>

        <div className="voiceStatus">{status}</div>
      </div>

      <webview
        ref={webviewRef}
        className="browser"
        src="https://chatgpt.com"
        allowpopups="true"
        partition="persist:timetravel"
      />
    </div>
  );
}

export default App;