import { Platform } from 'react-native';

export const colors = {
  background: '#F5F5F7',
  surface: '#FFFFFF',
  ink: '#1D1D1F',
  muted: 'rgba(29, 29, 31, 0.60)',
  line: 'rgba(29, 29, 31, 0.09)',
  primary: '#236B55',
  primaryPressed: '#1A5744',
  mint: '#E7F2ED',
  mintStrong: '#C7E1D7',
  orange: '#C95F3D',
  orangeSoft: '#F8E8E1',
  danger: '#B94137',
  dangerSoft: '#F9E4E1',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(20, 24, 22, 0.28)',
};

export const radii = {
  small: 6,
  medium: 8,
  control: 10,
  input: 12,
  pill: 999,
};

export const shadow = Platform.select({
  web: {
    boxShadow: '0 12px 34px rgba(26, 43, 35, 0.10)',
  },
  default: {
    shadowColor: '#1A2B23',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
});

export const type = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
};

export function rgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(clean)) return `rgba(104, 114, 108, ${alpha})`;
  const value = Number.parseInt(clean, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
