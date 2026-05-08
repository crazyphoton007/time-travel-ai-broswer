// import { useEffect, useRef, useState } from "react";

// declare global {
//   interface Window {
//     timeTravel?: {
//       setOpacity: (value: number) => void;
//       setAlwaysOnTop: (value: boolean) => void;
//       setClickThrough: (value: boolean) => void;
//       closeWindow: () => void;
//       minimizeWindow: () => void;
//       onClickThroughOff?: (callback: () => void) => void;
//     };
//   }
// }

// function App() {
//   const webviewRef = useRef<any>(null);

//   const [url, setUrl] = useState("https://chatgpt.com");
//   const [opacity, setOpacity] = useState(0.88);
//   const [alwaysTop, setAlwaysTop] = useState(true);
//   const [clickThrough, setClickThrough] = useState(false);

//   useEffect(() => {
//     window.timeTravel?.onClickThroughOff?.(() => {
//       setClickThrough(false);
//     });
//   }, []);

//   const openUrl = () => {
//     let finalUrl = url.trim();

//     if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
//       finalUrl = "https://" + finalUrl;
//     }

//     webviewRef.current?.loadURL(finalUrl);
//   };

//   const changeOpacity = (value: number) => {
//     setOpacity(value);
//     window.timeTravel?.setOpacity(value);
//   };

//   const toggleAlwaysTop = () => {
//     const next = !alwaysTop;
//     setAlwaysTop(next);
//     window.timeTravel?.setAlwaysOnTop(next);
//   };

//   const toggleClickThrough = () => {
//     const next = !clickThrough;
//     setClickThrough(next);
//     window.timeTravel?.setClickThrough(next);
//   };

//   return (
//     <div className="app">
//       <div className="topbar">
//         <div className="brand">TimeTravel AI Browser</div>

//         <input
//           className="address"
//           value={url}
//           onChange={(e) => setUrl(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && openUrl()}
//         />

//         <button onClick={openUrl}>Go</button>

//         <label className="sliderWrap">
//           Opacity
//           <input
//             type="range"
//             min="0.35"
//             max="1"
//             step="0.01"
//             value={opacity}
//             onChange={(e) => changeOpacity(Number(e.target.value))}
//           />
//         </label>

//         <button onClick={toggleAlwaysTop}>
//           {alwaysTop ? "Top ON" : "Top OFF"}
//         </button>

//         <button onClick={toggleClickThrough}>
//           {clickThrough ? "Click THROUGH" : "Click NORMAL"}
//         </button>

//         <button onClick={() => window.timeTravel?.minimizeWindow()}>_</button>

//         <button className="danger" onClick={() => window.timeTravel?.closeWindow()}>
//           X
//         </button>
//       </div>

//       <webview
//         ref={webviewRef}
//         className="browser"
//         src="https://chatgpt.com"
//         allowpopups="true"
//         partition="persist:timetravel"
//       />
//     </div>
//   );
// }

// export default App;

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
    };
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

function App() {
  const webviewRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  const [url, setUrl] = useState("https://chatgpt.com");
  const [opacity, setOpacity] = useState(0.88);
  const [alwaysTop, setAlwaysTop] = useState(true);
  const [clickThrough, setClickThrough] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [autoSend, setAutoSend] = useState(false);

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

  const insertIntoChatGPT = async (text: string, shouldSend: boolean) => {
    const safeText = JSON.stringify(text);

    await webviewRef.current?.executeJavaScript(`
      (() => {
        const text = ${safeText};

        const editor =
          document.querySelector('[contenteditable="true"]') ||
          document.querySelector('textarea');

        if (!editor) {
          return "NO_EDITOR_FOUND";
        }

        editor.focus();

        if (editor.tagName === "TEXTAREA") {
          editor.value = text;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          editor.innerHTML = "";
          editor.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: text
          }));
          document.execCommand("insertText", false, text);
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        }

        if (${shouldSend}) {
          setTimeout(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const sendButton = buttons.find((button) => {
              const label = (
                button.getAttribute("aria-label") ||
                button.textContent ||
                ""
              ).toLowerCase();

              return label.includes("send") || label.includes("submit");
            });

            if (sendButton) {
              sendButton.click();
            }
          }, 300);
        }

        return "OK";
      })();
    `);
  };

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser yet.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceText("");
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      const combinedText = finalText || interimText;
      setVoiceText(combinedText);

      if (finalText.trim()) {
        insertIntoChatGPT(finalText.trim(), autoSend);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const sendTypedVoiceText = () => {
    if (!voiceText.trim()) return;
    insertIntoChatGPT(voiceText.trim(), autoSend);
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

        <button onClick={() => window.timeTravel?.minimizeWindow()}>_</button>

        <button className="danger" onClick={() => window.timeTravel?.closeWindow()}>
          X
        </button>
      </div>

      <div className="voiceBar">
        <button
          className={isListening ? "micButton listening" : "micButton"}
          onClick={isListening ? stopVoice : startVoice}
        >
          {isListening ? "Stop" : "Mic"}
        </button>

        <input
          className="voiceInput"
          value={voiceText}
          onChange={(e) => setVoiceText(e.target.value)}
          placeholder="Speak or type here..."
        />

        <label className="autoSend">
          <input
            type="checkbox"
            checked={autoSend}
            onChange={(e) => setAutoSend(e.target.checked)}
          />
          Auto send
        </label>

        <button onClick={sendTypedVoiceText}>Insert</button>
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