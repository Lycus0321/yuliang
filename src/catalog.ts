export type FilamentColor = {
  name: string;
  hex: string;
};

export type TarePreset = {
  id: string;
  name: string;
  grams: number;
  brand?: string;
  type?: string;
};

export const filamentCatalog: Record<string, string[]> = {
  'Bambu Lab': [
    'PLA Basic',
    'PETG Basic',
    'PLA Matte',
    'PLA Pure',
    'PLA-CF',
    'PETG-CF',
    'ABS',
    'ASA',
    'TPU 95A',
    'PC',
    'PA-CF',
    'Support for PLA',
  ],
  SUNLU: ['PETG', 'PLA+', 'PLA Matte', 'PLA+ 2.0', 'Silk PLA+', 'Wood PLA', 'Marble PLA'],
  eSUN: ['PLA+'],
  Polymaker: ['PolyLite PLA', 'PolyLite PETG', 'PolyTerra PLA', 'PolyLite ABS', 'PolyLite ASA'],
  Overture: ['PLA', 'Matte PLA'],
  Generic: ['PLA', 'PETG', 'ABS', 'ASA', 'PC', 'TPU', 'PA', 'PLA-CF', 'PETG-CF'],
};

export const brandOptions = [
  'Bambu Lab',
  'SUNLU',
  'eSUN',
  'Polymaker',
  'Overture',
  'Generic',
];

export const commonBrands = ['Bambu Lab', 'SUNLU'];

export const bambuColors: FilamentColor[] = [
  { name: '黑色', hex: '#000000' },
  { name: 'Bambu 绿', hex: '#00AE42' },
  { name: '橙色', hex: '#FF6A13' },
  { name: '蓝灰', hex: '#5B6579' },
  { name: '白色', hex: '#FFFFFF' },
  { name: '灰色', hex: '#8E9089' },
  { name: '红色', hex: '#D6001C' },
  { name: '黄色', hex: '#FCE300' },
  { name: '钴蓝', hex: '#0056B8' },
  { name: '浅灰', hex: '#D1D3D5' },
  { name: '粉色', hex: '#FABBCB' },
  { name: '棕色', hex: '#9D432C' },
  { name: '紫色', hex: '#8A75D1' },
  { name: '深灰', hex: '#545454' },
];

const color = (name: string, hex: string): FilamentColor => ({ name, hex });

export const colorsByType: Record<string, FilamentColor[]> = {
  'PLA Basic': [
    color('橙色', '#FF6A13'),
    color('南瓜橙', '#FF9016'),
    color('蓝灰', '#5B6579'),
    color('钴蓝', '#0056B8'),
    color('青绿', '#00B1B7'),
    color('青色', '#0086D6'),
    color('蓝色', '#0A2989'),
    color('灰色', '#8E9089'),
    color('银色', '#A6A9AA'),
    color('浅灰', '#D1D3D5'),
    color('黑色', '#000000'),
    color('白色', '#FFFFFF'),
  ],
  'PLA Matte': [
    color('柑橘橙', '#F99963'),
    color('天空蓝', '#56B7E6'),
    color('海军蓝', '#0078BF'),
    color('冰蓝', '#A3D8E1'),
    color('深蓝', '#042F56'),
    color('Nardo 灰', '#757575'),
    color('灰烬灰', '#9B9EA0'),
    color('苹果绿', '#C2E189'),
    color('草绿', '#61C680'),
    color('深绿', '#68724D'),
    color('黑色', '#000000'),
    color('白色', '#FFFFFF'),
  ],
  'PETG Basic': [
    color('黑色', '#000000'),
    color('白色', '#FFFFFF'),
    color('灰色', '#7F7E83'),
    color('黄色', '#FCE300'),
    color('红色', '#D6001C'),
    color('反射蓝', '#001489'),
    color('深棕', '#4F2C1D'),
    color('绿色', '#009639'),
    color('橙色', '#FF671F'),
    color('松绿', '#034638'),
  ],
  'PETG HF': [
    color('橙色', '#F75403'),
    color('蓝色', '#002E96'),
    color('湖蓝', '#1F79E5'),
    color('灰色', '#ADB1B2'),
    color('深灰', '#515151'),
    color('绿色', '#00AE42'),
    color('青柠绿', '#6EE53C'),
    color('森林绿', '#39541A'),
    color('黑色', '#000000'),
    color('花生棕', '#875718'),
  ],
  'PLA-CF': [
    color('皇家蓝', '#2842AD'),
    color('牛仔蓝', '#6E88BC'),
    color('熔岩灰', '#4D5054'),
    color('抹茶绿', '#5C9748'),
    color('黑色', '#000000'),
    color('鸢尾紫', '#69398E'),
    color('酒红', '#951E23'),
  ],
  'PETG-CF': [
    color('靛蓝', '#324585'),
    color('钛灰', '#565656'),
    color('孔雀绿', '#16B08E'),
    color('黑色', '#000000'),
    color('紫罗兰', '#583061'),
    color('砖红', '#9F332A'),
  ],
  ABS: [
    color('橙色', '#FF6A13'),
    color('蓝色', '#0A2CA5'),
    color('天蓝', '#489FDF'),
    color('海军蓝', '#0C2340'),
    color('薄荷绿', '#7AE1BF'),
    color('银色', '#87909A'),
    color('Bambu 绿', '#00AE42'),
    color('橄榄绿', '#789D4A'),
    color('黑色', '#000000'),
    color('薰衣草紫', '#7248BD'),
  ],
  ASA: [
    color('蓝色', '#2140B4'),
    color('灰色', '#8A949E'),
    color('绿色', '#00A6A0'),
    color('黑色', '#000000'),
    color('红色', '#E02928'),
    color('白色', '#FFFAF2'),
  ],
  'TPU 95A': [color('黑色', '#000000'), color('白色', '#FFFFFF')],
  PC: [
    color('透明黑', '#686865'),
    color('透明', '#000000'),
    color('黑色', '#000000'),
    color('白色', '#FFFFFF'),
  ],
};

export function colorsForFilament(brand: string, type: string) {
  if (brand === 'Bambu Lab') return colorsByType[type] || bambuColors;
  return bambuColors;
}

export const spoolTarePresets: TarePreset[] = [
  { id: 'generic-200', name: '通用空盘', grams: 200 },
];

export const extraWeightPresets: TarePreset[] = [
  { id: 'extra-none', name: '无', grams: 0 },
  { id: 'weight-20', name: '配重块', grams: 20 },
  { id: 'bracket-50', name: '金属支架', grams: 50 },
  { id: 'adapter-100', name: '转接座', grams: 100 },
];
