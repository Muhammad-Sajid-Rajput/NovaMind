// NovaMind — ErrorBoundary.jsx — Error System

import React from "react";
import { Icon } from '@iconify/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position:       'fixed',
          inset:          0,
          zIndex:         99999,
          background:     'radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%)',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '24px',
          fontFamily:     'var(--font-sans, "Outfit", sans-serif)',
        }}>
          {/* Decorative blurred background lights */}
          <div style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(124, 58, 237, 0.08)',
            filter: 'blur(80px)',
            top: '20%',
            left: '30%',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(248, 113, 113, 0.05)',
            filter: 'blur(80px)',
            bottom: '20%',
            right: '30%',
            pointerEvents: 'none',
          }} />

          {/* Main Card */}
          <div style={{
            background:     'rgba(18, 18, 24, 0.8)',
            backdropFilter: 'blur(12px)',
            border:         '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius:   '24px',
            padding:        '40px 32px',
            width:          '100%',
            maxWidth:       '420px',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            textAlign:      'center',
            boxShadow:      '0 20px 40px rgba(0, 0, 0, 0.5)',
            position:       'relative',
            zIndex:         2,
          }}>
            {/* Warning Icon Badge */}
            <div style={{
              width:        '64px',
              height:       '64px',
              borderRadius: '20px',
              background:   'rgba(248, 113, 113, 0.1)',
              border:       '1px solid rgba(248, 113, 113, 0.2)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow:    '0 8px 16px rgba(248, 113, 113, 0.05)',
            }}>
              <Icon 
                icon="material-symbols:warning-amber-rounded"
                style={{ color: '#f87171', fontSize: '32px' }}
              />
            </div>

            {/* Error Message Header */}
            <h1 style={{ 
              color: '#ffffff', 
              fontSize: '22px', 
              fontWeight: 700, 
              margin: '0 0 12px 0',
              letterSpacing: '-0.02em',
            }}>
              Something went wrong
            </h1>

            {/* Error Message Details */}
            <p style={{ 
              color: '#94a3b8', 
              fontSize: '14px', 
              lineHeight: '1.6',
              margin: '0 0 28px 0',
            }}>
              NovaMind encountered an unexpected error. Don't worry, your conversations and account data remain completely safe.
            </p>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
            }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background:    '#7c3aed',
                  color:         'white',
                  border:        'none',
                  borderRadius:  '14px',
                  padding:       '12px 24px',
                  fontSize:      '14px',
                  fontWeight:    600,
                  cursor:        'pointer',
                  transition:    'all 0.2s ease',
                  boxShadow:     '0 4px 12px rgba(124, 58, 237, 0.3)',
                }}
              >
                Reload NovaMind
              </button>
              
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/";
                }}
                style={{
                  background:    'transparent',
                  color:         '#94a3b8',
                  border:        '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius:  '14px',
                  padding:       '12px 24px',
                  fontSize:      '13px',
                  fontWeight:    500,
                  cursor:        'pointer',
                  transition:    'all 0.2s ease',
                }}
              >
                Reset App Cache
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
