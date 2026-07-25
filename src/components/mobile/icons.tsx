// Inline SVG icons for the mobile experience. The product bans emoji in the UI
// (tests/canonical.test.ts), and the mobile prototype leaned on them (sun,
// lightbulb, camera, etc.), so every glyph is a real icon here. One <Svg>
// wrapper keeps them DRY; stroke icons pass `stroke`, fill icons don't.
import React from 'react';

function Svg({ children, size = 20, stroke = false }: { children: React.ReactNode; size?: number; stroke?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={stroke ? 'none' : 'currentColor'}
      stroke={stroke ? 'currentColor' : undefined}
      strokeWidth={stroke ? 1.8 : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number };

export const MenuIcon = ({ size }: IconProps) => (
  <Svg size={size} stroke><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></Svg>
);
export const ChevronStartIcon = ({ size }: IconProps) => (
  // logical "back" chevron — points toward the inline-start (right in RTL)
  <Svg size={size} stroke><path d="M9 6l6 6-6 6" /></Svg>
);
export const PlusIcon = ({ size }: IconProps) => (
  <Svg size={size} stroke><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
);
export const CloseIcon = ({ size }: IconProps) => (
  <Svg size={size} stroke><path d="M6 6l12 12" /><path d="M18 6L6 18" /></Svg>
);
export const SunIcon = ({ size }: IconProps) => (
  <Svg size={size} stroke><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4 12H2" /><path d="M22 12h-2" /><path d="M5.6 5.6 4.2 4.2" /><path d="M19.8 19.8l-1.4-1.4" /><path d="M18.4 5.6l1.4-1.4" /><path d="M4.2 19.8l1.4-1.4" /></Svg>
);
/** Patient file / folder — desktop calEvent "מעבר לתיק המטופל". */
export const PatientFileIcon = ({ size }: IconProps) => (
  <Svg size={size} stroke><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" /></Svg>
);
/** Upload recording — desktop calEvent "העלאת הקלטה". */
export const UploadIcon = ({ size }: IconProps) => (
  <Svg size={size} stroke><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 20h16" /></Svg>
);
/** Prep report document — desktop calEvent "דוח הכנה". */
export const ReportIcon = ({ size }: IconProps) => (
  <Svg size={size} stroke><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><path d="M8 13h8" /><path d="M8 17h5" /></Svg>
);
/** Edit scheduled meeting — desktop calEvent "עריכת הפגישה". */
export const EditIcon = ({ size }: IconProps) => (
  <Svg size={size} stroke><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></Svg>
);
/** Delete meeting — desktop calEvent "מחיקת הפגישה". */
export const TrashIcon = ({ size }: IconProps) => (
  <Svg size={size} stroke><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" /></Svg>
);
