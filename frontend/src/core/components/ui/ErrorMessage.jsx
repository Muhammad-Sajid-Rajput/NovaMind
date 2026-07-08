// NovaMind — ErrorMessage.jsx — Error System (Toast Notification Redesign)
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

const VARIANTS = {
  error: {
    bg:     'rgba(248, 113, 113, 0.1)',
    border: 'rgba(248, 113, 113, 0.25)',
    color:  '#f87171',
    icon:   'material-symbols:error-outline-rounded',
  },
  warning: {
    bg:     'rgba(250, 204, 21, 0.1)',
    border: 'rgba(250, 204, 21, 0.25)',
    color:  '#facc15',
    icon:   'material-symbols:warning-outline-rounded',
  },
  info: {
    bg:     'rgba(124, 58, 237, 0.1)',
    border: 'rgba(124, 58, 237, 0.25)',
    color:  '#a78bfa',
    icon:   'material-symbols:info-outline-rounded',
  },
  success: {
    bg:     'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.25)',
    color:  '#10b981',
    icon:   'material-symbols:check-circle-outline-rounded',
  },
};

export default function ErrorMessage({
  message,
  variant    = 'error',
  onDismiss  = null,
  fullWidth  = false,
  className  = '',
}) {
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!message) return;

    // Reset exit states when a new message is loaded
    setIsExiting(false);
    setIsDismissed(false);

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [message]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsDismissed(true);
      if (onDismiss) {
        onDismiss();
      }
    }, 350); // Match animation duration (350ms)
  };

  if (!message || isDismissed || !mounted) return null;

  const v = VARIANTS[variant] || VARIANTS.error;

  const toastContent = (
    <>
      <style>{`
        @keyframes toastSlideInRight {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastSlideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(120%);
            opacity: 0;
          }
        }
        .toast-slide-in {
          animation: toastSlideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .toast-slide-out {
          animation: toastSlideOutRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div
        className={`error-message-container toast-notification ${isExiting ? 'toast-slide-out' : 'toast-slide-in'} ${className}`}
        style={{
          position:      'fixed',
          top:           '24px',
          right:         '24px',
          zIndex:        999999,
          width:         'calc(100% - 48px)',
          maxWidth:      '360px',
          background:    'rgba(18, 18, 24, 0.95)',
          backdropFilter: 'blur(10px)',
          border:        `1px solid ${v.border}`,
          borderRadius:  '16px',
          padding:       '14px 18px',
          display:       'flex',
          alignItems:    'center',
          gap:           '12px',
          boxShadow:     '0 12px 30px rgba(0, 0, 0, 0.3)',
          transition:    'all 0.3s ease',
        }}
        role="alert"
        aria-live="polite"
      >
        {/* Left Color Accent Strip */}
        <div style={{
          position:   'absolute',
          left:       0,
          top:        '12px',
          bottom:     '12px',
          width:      '4px',
          background: v.color,
          borderRadius: '0 4px 4px 0',
        }} />

        <Icon
          icon={v.icon}
          style={{
            color:      v.color,
            fontSize:   '20px',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontSize:   '13px',
            lineHeight: '1.5',
            color:      '#e2e8f0',
            flex:       1,
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-sans, sans-serif)',
            fontWeight: 500,
          }}
        >
          {message}
        </span>
        <button
          onClick={handleDismiss}
          style={{
            background:  'transparent',
            border:      'none',
            cursor:      'pointer',
            color:       '#94a3b8',
            padding:     '4px',
            marginLeft:  '4px',
            flexShrink:  0,
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition:  'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#f87171';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }}
          aria-label="Dismiss message"
        >
          <Icon icon="material-symbols:close-rounded" 
                style={{ fontSize: '16px' }} />
        </button>
      </div>
    </>
  );

  return createPortal(toastContent, document.body);
}
