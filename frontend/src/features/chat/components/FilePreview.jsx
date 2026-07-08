// NovaMind — FilePreview.jsx — File Upload Bug Fix
import { Icon } from '@iconify/react';

const FILE_ICONS = {
  pdf:  { icon: 'vscode-icons:file-type-pdf2',       color: '#ef4444' },
  docx: { icon: 'vscode-icons:file-type-word',       color: '#2563eb' },
  doc:  { icon: 'vscode-icons:file-type-word',       color: '#2563eb' },
  xlsx: { icon: 'vscode-icons:file-type-excel',      color: '#059669' },
  xls:  { icon: 'vscode-icons:file-type-excel',      color: '#059669' },
  pptx: { icon: 'vscode-icons:file-type-powerpoint', color: '#ea580c' },
  ppt:  { icon: 'vscode-icons:file-type-powerpoint', color: '#ea580c' },
  txt:  { icon: 'vscode-icons:file-type-text',       color: '#7c3aed' },
  csv:  { icon: 'vscode-icons:file-type-csv',        color: '#059669' },
};

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || { 
    icon:  'material-symbols:description-outline', 
    color: '#7c3aed' 
  };
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
};

const ProgressRing = ({ progress, size = 22, strokeWidth = 2 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        transform: 'rotate(-90deg)',
        transformOrigin: '50% 50%',
        animation: 'progress-spin 1.5s linear infinite',
      }}
    >
      {/* Background circle track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {/* Foreground progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="white"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.3s ease',
        }}
      />
    </svg>
  );
};

const XButton = ({ onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label="Remove file"
    style={{
      position:       'absolute',
      top:            '50%',
        right:          '8px',
      transform:      'translateY(-50%)',
        width:          '12px',
        height:         '12px',
      borderRadius:   '50%',
      background:     disabled ? '#32324a' : '#32324a',
      border:         '1px solid #111118',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      cursor:         disabled ? 'not-allowed' : 'pointer',
      zIndex:         10,
      padding:        0,
      transition:     'all 0.15s ease',
      opacity:        disabled ? 0.4 : 1,
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.background    = '#f87171';
        e.currentTarget.style.borderColor   = '#f87171';
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background    = '#32324a';
      e.currentTarget.style.borderColor   = '#111118';
    }}
  >
    <Icon
      icon="material-symbols:close-rounded"
      style={{ fontSize: '8px', color: 'white' }}
    />
  </button>
);

export default function FilePreview({
  file,
  previewUrl,
  uploadState,  // 'selected' | 'uploading' | 'done' | 'failed'
  onRemove,
  onRetry,
  progress = 0,
}) {
  if (!file) return null;

  const isImage     = file.type.startsWith('image/');
  const isUploading = uploadState === 'uploading';
  const isRetrying  = uploadState === 'retrying';
  const isFailed    = uploadState === 'failed';
  const isDone      = uploadState === 'done';
  const { icon, color } = getFileIcon(file.name);
  const fileSize = formatBytes(file.size);
  const ext = file.name.split('.').pop().toUpperCase();

  // Subtitle/Status message
  let statusText = 'Document';
  if (isImage) {
    statusText = 'Image';
  }
  if (isUploading) {
    statusText = `Uploading ${progress}%...`;
  } else if (isRetrying) {
    statusText = 'Retrying…';
  } else if (isFailed) {
    statusText = 'Failed — click to retry';
  } else if (isDone) {
    statusText = isImage ? `Image • ${fileSize}` : `${ext} • ${fileSize}`;
  }

  return (
    <div style={{ display: 'inline-flex' }}>
      <style>{`
        @keyframes progress-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Main Preview Card container */}
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '12px',
          padding:       '8px 32px 8px 12px',
          background:    isFailed
            ? 'rgba(248,113,113,0.06)'
            : isRetrying
            ? 'rgba(139,92,246,0.06)'
            : '#18181b',
          border:        `1px solid ${
            isFailed    ? 'rgba(248,113,113,0.3)'
            : isRetrying ? 'rgba(139,92,246,0.3)'
            : 'rgba(255,255,255,0.08)'
          }`,
          borderRadius:  '12px',
          maxWidth:      '260px',
          minWidth:      '200px',
          height:        '52px',
          boxSizing:     'border-box',
          cursor:        (isFailed || isRetrying) ? 'pointer' : 'default',
          position:      'relative',
        }}
        onClick={(isFailed || isRetrying) ? onRetry : undefined}
        title={isFailed ? 'Click to retry processing' : isRetrying ? 'Processing — please wait' : undefined}
      >
        {/* Left container block (Image preview or Colored file box) */}
        <div style={{
          width:        '36px',
          height:       '36px',
          borderRadius: '8px',
          overflow:     'hidden',
          background:   isImage ? 'transparent' : color, // Use extension solid color for documents
          position:     'relative',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          flexShrink:   0,
        }}>
          {isImage ? (
            <>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={file.name}
                  style={{
                    width:      '100%',
                    height:     '100%',
                    objectFit:  'cover',
                    display:    'block',
                    opacity:    isUploading ? 0.4 : 1,
                  }}
                />
              )}
              {isUploading && (
                <div style={{
                  position:       'absolute',
                  inset:          0,
                  background:     'rgba(0,0,0,0.5)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                }}>
                  <ProgressRing progress={progress} />
                </div>
              )}
            </>
          ) : (
            <>
              {isUploading ? (
                <ProgressRing progress={progress} />
              ) : isRetrying ? (
                // Pulsing orbit ring for retrying state
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(139,92,246,0.25)',
                  borderTop: '2px solid #8b5cf6',
                  borderRadius: '50%',
                  animation: 'progress-spin 0.9s linear infinite',
                }} />
              ) : isFailed ? (
                <Icon
                  icon="material-symbols:refresh-rounded"
                  style={{ color: 'white', fontSize: '20px' }}
                />
              ) : (
                <Icon
                  icon={icon}
                  style={{ fontSize: '20px', color: 'white' }}
                />
              )}
            </>
          )}
        </div>

        {/* File Text Information */}
        <div style={{
          flex:     1,
          minWidth: 0,
          paddingRight: '18px', // Space to prevent close button overlapping text
        }}>
          <div style={{
            fontSize:     '13px',
            fontWeight:   600,
            color:        isFailed ? '#f87171' : isRetrying ? '#a78bfa' : '#ffffff',
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            lineHeight:   1.3,
          }}>
            {file.name}
          </div>
          <div style={{
            fontSize:  '11px',
            color:     isFailed ? '#f87171' : isRetrying ? '#a78bfa' : '#9ca3af',
            marginTop: '1px',
            lineHeight: 1.2,
          }}>
            {statusText}
          </div>
        </div>

        {/* Standardized smaller Close Button (nested inside relative parent) */}
        <XButton onClick={onRemove} />
      </div>
    </div>
  );
}
