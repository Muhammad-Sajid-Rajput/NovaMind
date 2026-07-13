// NovaMind — WelcomeScreen.jsx — Responsive
import ChatInput from './ChatInput.jsx';

function WelcomeScreen() {
  const chips = [
    {
      label: "Analyze PDF",
      prompt: "Help me analyze this PDF document...",
      tooltip: "Upload and analyze a PDF file"
    },
    {
      label: "Write",
      prompt: "Help me write content for...",
      tooltip: "Generate essays, articles, or emails"
    },
    {
      label: "Code",
      prompt: "Help me write code to...",
      tooltip: "Get programming and debugging assistance"
    }
  ];

  function handleChip(prompt) {
    window.dispatchEvent(
      new CustomEvent("insert-chat-template", { detail: { text: prompt } })
    );
  }

  return (
    <div className="absolute inset-0 z-10 overflow-hidden flex flex-col items-center justify-center px-6 text-center select-none pointer-events-none">
      <div className="relative z-10 w-full md:max-w-190 lg:max-w-200 xl:max-w-210 flex flex-col items-center justify-center pointer-events-auto">
        {/* Brand Banner */}
        <div className="flex flex-col items-center justify-center mb-6 select-none animate-in fade-in duration-300">
          <img
            src="/favicon.webp"
            alt="NovaMind Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain mb-4"
          />
          <span 
            className="font-display text-text-primary leading-none tracking-wide text-2xl sm:text-3xl md:text-4xl text-center"
            style={{ fontWeight: 700 }}
          >
            NovaMind
          </span>
          <span 
            className="font-sans text-text-secondary mt-1.5 uppercase tracking-wider text-[11px] sm:text-xs md:text-sm text-center"
            style={{ fontWeight: 500 }}
          >
            AI Assistant
          </span>
          <span 
            className="font-sans text-text-muted mt-1 uppercase tracking-widest text-[8px] sm:text-[9px] md:text-[10px] text-center"
            style={{ fontWeight: 400 }}
          >
            Powered by Gemini
          </span>
        </div>

        {/* Greeting */}
        <h1
          className="font-sans text-text-primary mb-3 leading-tight text-xl sm:text-2xl lg:text-3xl font-medium"
        >
          How can I help today?
        </h1>

        {/* Input box */}
        <div className="w-[95%] sm:w-full max-w-[600px] my-3 pointer-events-auto">
          <ChatInput />
        </div>

        {/* Suggestion chips */}
        <div className="flex flex-wrap sm:flex-nowrap justify-center gap-2.5 mt-6 max-w-150 sm:max-w-none w-full px-4 select-none">
          {chips.map((chip, index) => (
            <button
              key={chip.label}
              className="shrink-0 text-xs sm:text-sm font-semibold text-text-secondary hover:text-primary hover:border-primary/40 bg-surface/20 border rounded-full px-4.5 py-2.5 outline-none cursor-pointer transition-all duration-200 ease-out hover:scale-105 active:scale-95 animate-[msg-appear_0.4s_ease-out_both] opacity-0 flex items-center justify-center shadow-sm hover:shadow-md"
              style={{
                borderColor: "var(--color-border)",
                background: "rgba(255, 255, 255, 0.02)",
                animationDelay: `${index * 75}ms`
              }}
              onClick={() => handleChip(chip.prompt)}
              title={chip.tooltip}
              aria-label={`${chip.label} suggestion`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
