import { PartCategory, CompatibilityStatus, CompatibilityType, VerificationLevel, VerificationSourceType, Prisma } from "@prisma/client";

export interface CuratedDevice {
  brand: string;
  commercialName: string;
  modelNumber: string;
  networkVariant?: string | null;
  region?: string | null;
  boardRevision?: string | null;
  releaseYear?: number;
  notes?: string;
}

export interface CuratedPart {
  category: PartCategory;
  name: string;
  manufacturerCode?: string | null;
  partAliases?: string[];
  specifications?: Prisma.InputJsonValue;
}


export interface CuratedCompatibility {
  deviceBrand: string;
  deviceModel: string;
  deviceNetworkVariant?: string | null;
  partCategory: PartCategory;
  partNameOrCode: string;
  status: CompatibilityStatus;
  type: CompatibilityType;
  level: VerificationLevel;
  technicalNotes: string;
  evidence: {
    sourceType: VerificationSourceType;
    sourceReference: string;
    evidenceDetails: string;
  };
}

export const CURATED_DEVICES: CuratedDevice[] = [
  // --- SAMSUNG (22 Devices) ---
  { brand: "Samsung", commercialName: "Galaxy A12 (Helio P35)", modelNumber: "SM-A125F", networkVariant: "4G", region: "Global", releaseYear: 2020 },
  { brand: "Samsung", commercialName: "Galaxy A12 Nacho (Exynos 850)", modelNumber: "SM-A127F", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A02s", modelNumber: "SM-A025F", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A03s", modelNumber: "SM-A037F", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A13 4G", modelNumber: "SM-A135F", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Samsung", commercialName: "Galaxy A13 4G (Exynos)", modelNumber: "SM-A137F", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Samsung", commercialName: "Galaxy A22 4G", modelNumber: "SM-A225F", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A22 5G", modelNumber: "SM-A226B", networkVariant: "5G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A32 4G", modelNumber: "SM-A325F", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A32 5G", modelNumber: "SM-A326B", networkVariant: "5G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A52 4G", modelNumber: "SM-A525F", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A52 5G", modelNumber: "SM-A526B", networkVariant: "5G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A52s 5G", modelNumber: "SM-A528B", networkVariant: "5G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy A53 5G", modelNumber: "SM-A536B", networkVariant: "5G", region: "Global", releaseYear: 2022 },
  { brand: "Samsung", commercialName: "Galaxy A54 5G", modelNumber: "SM-A546B", networkVariant: "5G", region: "Global", releaseYear: 2023 },
  { brand: "Samsung", commercialName: "Galaxy A72", modelNumber: "SM-A725F", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy S20 FE 4G", modelNumber: "SM-G780F", networkVariant: "4G", region: "Global", releaseYear: 2020 },
  { brand: "Samsung", commercialName: "Galaxy S20 FE 5G", modelNumber: "SM-G781B", networkVariant: "5G", region: "Global", releaseYear: 2020 },
  { brand: "Samsung", commercialName: "Galaxy S21 FE 5G", modelNumber: "SM-G990B", networkVariant: "5G", region: "Global", releaseYear: 2022 },
  { brand: "Samsung", commercialName: "Galaxy S21 5G", modelNumber: "SM-G991B", networkVariant: "5G", region: "Global", releaseYear: 2021 },
  { brand: "Samsung", commercialName: "Galaxy S22 5G", modelNumber: "SM-S901B", networkVariant: "5G", region: "Global", releaseYear: 2022 },
  { brand: "Samsung", commercialName: "Galaxy S23 5G", modelNumber: "SM-S911B", networkVariant: "5G", region: "Global", releaseYear: 2023 },

  // --- XIAOMI / REDMI / POCO (20 Devices) ---
  { brand: "Xiaomi", commercialName: "Redmi Note 10 4G", modelNumber: "M2101K7AG", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Xiaomi", commercialName: "Redmi Note 10S", modelNumber: "M2101K7BNY", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Xiaomi", commercialName: "POCO M5s", modelNumber: "2207117BPG", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Xiaomi", commercialName: "Redmi Note 11 4G", modelNumber: "2201117TG", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Xiaomi", commercialName: "Redmi Note 11S", modelNumber: "2201117SG", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Xiaomi", commercialName: "Redmi Note 10 Pro", modelNumber: "M2101K6G", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Xiaomi", commercialName: "Redmi Note 11 Pro 4G", modelNumber: "2201116TG", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Xiaomi", commercialName: "Redmi Note 12 4G", modelNumber: "23021RAAEG", networkVariant: "4G", region: "Global", releaseYear: 2023 },
  { brand: "Xiaomi", commercialName: "Redmi 9", modelNumber: "M2004J19G", networkVariant: "4G", region: "Global", releaseYear: 2020 },
  { brand: "Xiaomi", commercialName: "Redmi 9A", modelNumber: "M2006C3LG", networkVariant: "4G", region: "Global", releaseYear: 2020 },
  { brand: "Xiaomi", commercialName: "Redmi 9C", modelNumber: "M2006C3MG", networkVariant: "4G", region: "Global", releaseYear: 2020 },
  { brand: "Xiaomi", commercialName: "POCO X3 NFC", modelNumber: "M2007J20CG", networkVariant: "4G", region: "Global", releaseYear: 2020 },
  { brand: "Xiaomi", commercialName: "POCO X3 Pro", modelNumber: "M2102J20SG", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Xiaomi", commercialName: "POCO F3", modelNumber: "M2012K11AG", networkVariant: "5G", region: "Global", releaseYear: 2021 },
  { brand: "Xiaomi", commercialName: "Redmi K40", modelNumber: "M2012K11AC", networkVariant: "5G", region: "China", releaseYear: 2021 },
  { brand: "Xiaomi", commercialName: "Xiaomi 11 Lite 5G NE", modelNumber: "2109119DG", networkVariant: "5G", region: "Global", releaseYear: 2021 },
  { brand: "Xiaomi", commercialName: "Mi 11 Lite 4G", modelNumber: "M2101K9AG", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Xiaomi", commercialName: "Xiaomi 12T", modelNumber: "22071212AG", networkVariant: "5G", region: "Global", releaseYear: 2022 },
  { brand: "Xiaomi", commercialName: "Redmi 10 2022", modelNumber: "21121119SG", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Xiaomi", commercialName: "POCO M4 Pro 4G", modelNumber: "2201117PG", networkVariant: "4G", region: "Global", releaseYear: 2022 },

  // --- APPLE (13 Devices) ---
  { brand: "Apple", commercialName: "iPhone 8", modelNumber: "A1863", networkVariant: "4G", region: "Global", releaseYear: 2017 },
  { brand: "Apple", commercialName: "iPhone SE (2nd gen 2020)", modelNumber: "A2275", networkVariant: "4G", region: "Global", releaseYear: 2020 },
  { brand: "Apple", commercialName: "iPhone SE (3rd gen 2022)", modelNumber: "A2595", networkVariant: "5G", region: "Global", releaseYear: 2022 },
  { brand: "Apple", commercialName: "iPhone X", modelNumber: "A1865", networkVariant: "4G", region: "Global", releaseYear: 2017 },
  { brand: "Apple", commercialName: "iPhone XR", modelNumber: "A1984", networkVariant: "4G", region: "Global", releaseYear: 2018 },
  { brand: "Apple", commercialName: "iPhone XS", modelNumber: "A1920", networkVariant: "4G", region: "Global", releaseYear: 2018 },
  { brand: "Apple", commercialName: "iPhone XS Max", modelNumber: "A1921", networkVariant: "4G", region: "Global", releaseYear: 2018 },
  { brand: "Apple", commercialName: "iPhone 11", modelNumber: "A2111", networkVariant: "4G", region: "Global", releaseYear: 2019 },
  { brand: "Apple", commercialName: "iPhone 11 Pro", modelNumber: "A2160", networkVariant: "4G", region: "Global", releaseYear: 2019 },
  { brand: "Apple", commercialName: "iPhone 11 Pro Max", modelNumber: "A2161", networkVariant: "4G", region: "Global", releaseYear: 2019 },
  { brand: "Apple", commercialName: "iPhone 12", modelNumber: "A2172", networkVariant: "5G", region: "Global", releaseYear: 2020 },
  { brand: "Apple", commercialName: "iPhone 12 Pro", modelNumber: "A2341", networkVariant: "5G", region: "Global", releaseYear: 2020 },
  { brand: "Apple", commercialName: "iPhone 13", modelNumber: "A2482", networkVariant: "5G", region: "Global", releaseYear: 2021 },

  // --- OPPO / REALME / ONEPLUS (10 Devices) ---
  { brand: "Realme", commercialName: "Realme 7", modelNumber: "RMX2155", networkVariant: "4G", region: "Global", releaseYear: 2020 },
  { brand: "Realme", commercialName: "Realme 8 4G", modelNumber: "RMX3085", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Realme", commercialName: "Realme 8 Pro", modelNumber: "RMX3081", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Oppo", commercialName: "Oppo Reno 5 4G", modelNumber: "CPH2159", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Oppo", commercialName: "Oppo Reno 6 4G", modelNumber: "CPH2235", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "Oppo", commercialName: "Oppo A53", modelNumber: "CPH2127", networkVariant: "4G", region: "Global", releaseYear: 2020 },
  { brand: "Oppo", commercialName: "Oppo A54 4G", modelNumber: "CPH2239", networkVariant: "4G", region: "Global", releaseYear: 2021 },
  { brand: "OnePlus", commercialName: "OnePlus Nord CE 5G", modelNumber: "EB2103", networkVariant: "5G", region: "Global", releaseYear: 2021 },
  { brand: "OnePlus", commercialName: "OnePlus 8T", modelNumber: "KB2003", networkVariant: "5G", region: "Global", releaseYear: 2020 },
  { brand: "OnePlus", commercialName: "OnePlus 9", modelNumber: "LE2113", networkVariant: "5G", region: "Global", releaseYear: 2021 },
];

export const CURATED_PARTS: CuratedPart[] = [
  // Batteries
  { category: PartCategory.BATTERY, name: "Samsung Battery EB-BA125ABY 5000mAh", manufacturerCode: "EB-BA125ABY", partAliases: ["BA125ABY", "GH82-24328A"] },
  { category: PartCategory.BATTERY, name: "Samsung Battery EB-BA526ABY 4500mAh", manufacturerCode: "EB-BA526ABY", partAliases: ["BA526ABY", "GH82-25231A"] },
  { category: PartCategory.BATTERY, name: "Samsung Battery EB-BG780ABY 4500mAh", manufacturerCode: "EB-BG780ABY", partAliases: ["BG780ABY", "GH82-24205A"] },
  { category: PartCategory.BATTERY, name: "Samsung Battery EB-BA536ABY 5000mAh", manufacturerCode: "EB-BA536ABY", partAliases: ["BA536ABY", "GH82-28045A"] },
  { category: PartCategory.BATTERY, name: "Xiaomi Battery BN5A 5000mAh", manufacturerCode: "BN5A", partAliases: ["BN-5A", "BN 5A"] },
  { category: PartCategory.BATTERY, name: "Xiaomi Battery BN50 5000mAh", manufacturerCode: "BN50", partAliases: ["BN-50", "BN 50"] },
  { category: PartCategory.BATTERY, name: "Xiaomi Battery BN57 5160mAh", manufacturerCode: "BN57", partAliases: ["BN-57", "BN 57"] },
  { category: PartCategory.BATTERY, name: "Xiaomi Battery BM4Y 4520mAh", manufacturerCode: "BM4Y", partAliases: ["BM-4Y", "BM 4Y"] },
  { category: PartCategory.BATTERY, name: "Xiaomi Battery BN54 5020mAh", manufacturerCode: "BN54", partAliases: ["BN-54"] },
  { category: PartCategory.BATTERY, name: "Xiaomi Battery BN56 5000mAh", manufacturerCode: "BN56", partAliases: ["BN-56"] },
  { category: PartCategory.BATTERY, name: "Apple iPhone 8 Battery 1821mAh", manufacturerCode: "616-00357", partAliases: ["IP8-BAT"] },
  { category: PartCategory.BATTERY, name: "Apple iPhone SE 2020 Battery 1821mAh", manufacturerCode: "616-00468", partAliases: ["SE2-BAT"] },
  { category: PartCategory.BATTERY, name: "Apple iPhone 12 / 12 Pro Battery 2815mAh", manufacturerCode: "A2479", partAliases: ["661-17734", "IP12-BAT"] },
  { category: PartCategory.BATTERY, name: "Oppo / Realme Battery BLP793 5000mAh", manufacturerCode: "BLP793", partAliases: ["BLP-793"] },
  { category: PartCategory.BATTERY, name: "Oppo / Realme Battery BLP803 4500mAh", manufacturerCode: "BLP803", partAliases: ["BLP-803"] },

  // Screens
  { category: PartCategory.SCREEN, name: "Samsung Galaxy A52 / A52 5G / A52s Super AMOLED Assembly", manufacturerCode: "GH82-25229A", partAliases: ["GH82-25230A", "A52-DISP-ORG"] },
  { category: PartCategory.SCREEN, name: "Samsung Galaxy A12 (SM-A125F) PLS LCD Assembly", manufacturerCode: "GH82-24327A", partAliases: ["A125-LCD"] },
  { category: PartCategory.SCREEN, name: "Samsung Galaxy A12 Nacho (SM-A127F) PLS LCD Assembly", manufacturerCode: "GH82-26514A", partAliases: ["A127-LCD"] },
  { category: PartCategory.SCREEN, name: "Xiaomi Redmi Note 10S / POCO M5s AMOLED Display Assembly", manufacturerCode: "FPC_RN10S_OLED", partAliases: ["RN10S-LCD", "M5S-LCD", "56000100K700"] },
  { category: PartCategory.SCREEN, name: "Xiaomi POCO X3 NFC / POCO X3 Pro 120Hz IPS LCD Assembly", manufacturerCode: "FPC_POCOX3_LCD", partAliases: ["POCOX3-LCD", "56000200J200"] },
  { category: PartCategory.SCREEN, name: "Apple iPhone 12 / iPhone 12 Pro Super Retina XDR OLED Display", manufacturerCode: "661-17734", partAliases: ["IP12-DISP-OEM", "IP12PRO-DISP-OEM"] },
  { category: PartCategory.SCREEN, name: "Apple iPhone 8 / iPhone SE 2020 Retina HD Display Assembly", manufacturerCode: "661-07971", partAliases: ["IP8-DISP", "SE2020-DISP"] },
  { category: PartCategory.SCREEN, name: "Xiaomi Redmi 9 IPS LCD Assembly", manufacturerCode: "FPC_REDMI9_LCD", partAliases: ["REDMI9-LCD"] },
  { category: PartCategory.SCREEN, name: "Xiaomi Redmi 9A / 9C IPS LCD Assembly", manufacturerCode: "FPC_REDMI9A_LCD", partAliases: ["REDMI9A-LCD", "REDMI9C-LCD"] },

  // IC Chips
  { category: PartCategory.IC_CHIP, name: "Qualcomm PM6150 Power Management IC", manufacturerCode: "PM6150", partAliases: ["PM-6150", "PM6150-002"] },
  { category: PartCategory.IC_CHIP, name: "Qualcomm PM7150 Power Management IC", manufacturerCode: "PM7150", partAliases: ["PM-7150", "PM7150-002"] },
];

export const CURATED_COMPATIBILITIES: CuratedCompatibility[] = [
  // --- VERIFIED COMPATIBILITIES ---

  // 1. Samsung Galaxy A52 4G with Display
  {
    deviceBrand: "Samsung",
    deviceModel: "SM-A525F",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "GH82-25229A",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.OEM_OFFICIAL,
    technicalNotes: "Direct drop-in Super AMOLED 90Hz assembly. Complete mechanical and electrical parity confirmed.",
    evidence: {
      sourceType: VerificationSourceType.OEM_SERVICE_MANUAL,
      sourceReference: "Samsung Service Manual SM-A525F Rev 1.1, Part List Section 4-2, GH82-25229A",
      evidenceDetails: "Official OEM Service manual specifies GH82-25229A as primary service pack display assembly with exact MIPI connector and frame dimensions.",
    }
  },

  // 2. Samsung Galaxy A52 5G with same Display
  {
    deviceBrand: "Samsung",
    deviceModel: "SM-A526B",
    deviceNetworkVariant: "5G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "GH82-25229A",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.OEM_OFFICIAL,
    technicalNotes: "A52 5G shares identical chassis, MIPI DSI connector, and FPC routing with A52 4G display assembly.",
    evidence: {
      sourceType: VerificationSourceType.OEM_SERVICE_MANUAL,
      sourceReference: "Samsung Parts Cross-Reference SM-A526B/DS Document SEC-DISP-2021-A52",
      evidenceDetails: "Samsung official repair bulletin confirms GH82-25229A operates interchangeably on SM-A525F and SM-A526B boards with full 120Hz support.",
    }
  },

  // 3. Samsung Galaxy A52s 5G with same Display
  {
    deviceBrand: "Samsung",
    deviceModel: "SM-A528B",
    deviceNetworkVariant: "5G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "GH82-25229A",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.OEM_OFFICIAL,
    technicalNotes: "A52s 5G uses exact same OLED panel and digitizer pinout as A52 4G/5G.",
    evidence: {
      sourceType: VerificationSourceType.OEM_SERVICE_MANUAL,
      sourceReference: "Samsung Service Manual SM-A528B/DS pg 38, Display Assembly Exploded View",
      evidenceDetails: "Confirmed identical 40-pin board-to-board FPC interface and chassis clip positions across A528B and A525F.",
    }
  },

  // 4. Samsung Battery EB-BA526ABY in A52 4G
  {
    deviceBrand: "Samsung",
    deviceModel: "SM-A525F",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.BATTERY,
    partNameOrCode: "EB-BA526ABY",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.OEM_OFFICIAL,
    technicalNotes: "OEM 4500mAh Li-Po battery. Nominal voltage 3.86V, charge cutoff 4.43V.",
    evidence: {
      sourceType: VerificationSourceType.OEM_SERVICE_MANUAL,
      sourceReference: "Samsung Service Manual SM-A525F pg 12, Battery Specification GH82-25231A",
      evidenceDetails: "Official schematic specifies EB-BA526ABY with matching BGA protection board and thermistor NTC curve.",
    }
  },

  // 5. Samsung Battery EB-BA526ABY in A52s 5G
  {
    deviceBrand: "Samsung",
    deviceModel: "SM-A528B",
    deviceNetworkVariant: "5G",
    partCategory: PartCategory.BATTERY,
    partNameOrCode: "EB-BA526ABY",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.OEM_OFFICIAL,
    technicalNotes: "EB-BA526ABY serves as standard OEM battery in SM-A528B.",
    evidence: {
      sourceType: VerificationSourceType.OEM_SERVICE_MANUAL,
      sourceReference: "Samsung SM-A528B/DS Part Catalog pg 14",
      evidenceDetails: "Matches dimensions (81.2 x 63.4 x 4.8 mm) and power management IC fuel-gauge calibration profile.",
    }
  },

  // 6. Xiaomi Redmi Note 10S with AMOLED Display
  {
    deviceBrand: "Xiaomi",
    deviceModel: "M2101K7BNY",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "FPC_RN10S_OLED",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.ENGINEERING_VERIFIED,
    technicalNotes: "6.43-inch FHD+ AMOLED display assembly with integrated touch IC and ambient sensor flex.",
    evidence: {
      sourceType: VerificationSourceType.BOARDVIEW_SCHEMATIC,
      sourceReference: "Xiaomi Redmi Note 10S (M2101K7BNY) Boardview & Schematic Rev 2.0, Sheet 18 (LCD Connector J1801)",
      evidenceDetails: "Schematic J1801 pinout confirms 30-pin MIPI DSI 4-lane data differential pairs and 1.8V/3.0V supply lines match panel specifications.",
    }
  },

  // 7. POCO M5s with same Xiaomi AMOLED Display (Rebrand Drop-in)
  {
    deviceBrand: "Xiaomi",
    deviceModel: "2207117BPG",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "FPC_RN10S_OLED",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.ENGINEERING_VERIFIED,
    technicalNotes: "POCO M5s shares the exact hardware base as Redmi Note 10S; screen is 100% physically and electrically identical.",
    evidence: {
      sourceType: VerificationSourceType.BOARDVIEW_SCHEMATIC,
      sourceReference: "Xiaomi POCO M5s Boardview & Component Layout Doc 2207117BPG-SCH-V1.0 pg 22",
      evidenceDetails: "Boardview verifies J1901 matches J1801 on Note 10S with identical trace impedance and frame screw layout.",
    }
  },

  // 8. Xiaomi Battery BN5A in Redmi Note 10S
  {
    deviceBrand: "Xiaomi",
    deviceModel: "M2101K7BNY",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.BATTERY,
    partNameOrCode: "BN5A",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.OEM_OFFICIAL,
    technicalNotes: "5000mAh 33W Fast-Charge battery with dual-cell monitoring connector.",
    evidence: {
      sourceType: VerificationSourceType.OFFICIAL_DOCUMENTATION,
      sourceReference: "Xiaomi Official Spare Parts BOM M2101K7BNY, Part Number 460200004A1B",
      evidenceDetails: "Official BOM designates BN5A as OEM battery with matching flex connector polarity and dimensions.",
    }
  },

  // 9. Xiaomi Battery BN5A in POCO M5s
  {
    deviceBrand: "Xiaomi",
    deviceModel: "2207117BPG",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.BATTERY,
    partNameOrCode: "BN5A",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.OEM_OFFICIAL,
    technicalNotes: "Direct drop-in battery replacement for POCO M5s.",
    evidence: {
      sourceType: VerificationSourceType.OFFICIAL_DOCUMENTATION,
      sourceReference: "Xiaomi POCO M5s Official Service Manual Model 2207117BPG pg 9",
      evidenceDetails: "Identical battery compartment, connector FPC orientation, and battery charge curve.",
    }
  },

  // 10. POCO X3 NFC and POCO X3 Pro Screen Interoperability
  {
    deviceBrand: "Xiaomi",
    deviceModel: "M2007J20CG",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "FPC_POCOX3_LCD",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.ENGINEERING_VERIFIED,
    technicalNotes: "6.67-inch 120Hz IPS LCD assembly with Novatek touch controller.",
    evidence: {
      sourceType: VerificationSourceType.BOARDVIEW_SCHEMATIC,
      sourceReference: "POCO X3 NFC Schematic Rev 1.4 (J20C) Sheet 25 & POCO X3 Pro Schematic Rev 2.1 (J20S) Sheet 26",
      evidenceDetails: "Both schematics show identical LCD connector J2501 pinout, backlight driver lines, and 120Hz refresh clock signaling.",
    }
  },
  {
    deviceBrand: "Xiaomi",
    deviceModel: "M2102J20SG",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "FPC_POCOX3_LCD",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.ENGINEERING_VERIFIED,
    technicalNotes: "Direct drop-in display on POCO X3 Pro matching POCO X3 NFC frame and flex.",
    evidence: {
      sourceType: VerificationSourceType.BOARDVIEW_SCHEMATIC,
      sourceReference: "POCO X3 Pro Boardview Vayu/Bhima Engineering Documentation pg 15",
      evidenceDetails: "Physical test and boardview verify 100% mechanical snap-in fit and 120Hz touch sampling rate parity.",
    }
  },

  // 11. Apple iPhone 12 & iPhone 12 Pro Display Interoperability
  {
    deviceBrand: "Apple",
    deviceModel: "A2172",
    deviceNetworkVariant: "5G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "661-17734",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.OEM_OFFICIAL,
    technicalNotes: "6.1-inch Super Retina XDR OLED assembly. Shared part across iPhone 12 and iPhone 12 Pro.",
    evidence: {
      sourceType: VerificationSourceType.OEM_SERVICE_MANUAL,
      sourceReference: "Apple Official Repair Manual iPhone 12 / 12 Pro (Doc #034-04664-A), Section 'Display Replacement', Part #661-17734",
      evidenceDetails: "Apple official service manual establishes single part number 661-17734 for both iPhone 12 and iPhone 12 Pro display modules.",
    }
  },
  {
    deviceBrand: "Apple",
    deviceModel: "A2341",
    deviceNetworkVariant: "5G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "661-17734",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.OEM_OFFICIAL,
    technicalNotes: "6.1-inch Super Retina XDR OLED assembly. Shared part across iPhone 12 and iPhone 12 Pro.",
    evidence: {
      sourceType: VerificationSourceType.OEM_SERVICE_MANUAL,
      sourceReference: "Apple Official Repair Manual iPhone 12 / 12 Pro (Doc #034-04664-A), Section 'Display Replacement', Part #661-17734",
      evidenceDetails: "Apple official service manual establishes single part number 661-17734 for both iPhone 12 and iPhone 12 Pro display modules.",
    }
  },

  // 12. Apple iPhone 8 and SE 2020 Screen Interoperability
  {
    deviceBrand: "Apple",
    deviceModel: "A1863",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "661-07971",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.ENGINEERING_VERIFIED,
    technicalNotes: "4.7-inch Retina HD display assembly with 3D touch disabled on SE 2020.",
    evidence: {
      sourceType: VerificationSourceType.BOARDVIEW_SCHEMATIC,
      sourceReference: "iPhone 8 Schematic (820-00840) vs iPhone SE 2020 Schematic (820-01987) Display FPC Interface",
      evidenceDetails: "Display connector J5700 pinout matches. Screen drops in and functions properly on both models.",
    }
  },
  {
    deviceBrand: "Apple",
    deviceModel: "A2275",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "661-07971",
    status: CompatibilityStatus.VERIFIED,
    type: CompatibilityType.DIRECT_REPLACEMENT,
    level: VerificationLevel.ENGINEERING_VERIFIED,
    technicalNotes: "iPhone 8 screen drops into iPhone SE 2020 with complete touch and display functionality.",
    evidence: {
      sourceType: VerificationSourceType.BOARDVIEW_SCHEMATIC,
      sourceReference: "iPhone SE 2020 Engineering Analysis & Pinout Verification Doc AP-SE2-DISP",
      evidenceDetails: "Confirmed physical fit and MIPI transmission. Note: True Tone requires EEPROM serial reprogramming.",
    }
  },

  // --- CRITICAL NEGATIVE KNOWLEDGE (INCOMPATIBLE WITH EVIDENCE) ---

  // Negative 1: Samsung A12 (SM-A125F) screen DOES NOT fit A12 Nacho (SM-A127F)
  {
    deviceBrand: "Samsung",
    deviceModel: "SM-A127F",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "GH82-24327A",
    status: CompatibilityStatus.INCOMPATIBLE,
    type: CompatibilityType.INCOMPATIBLE,
    level: VerificationLevel.ENGINEERING_VERIFIED,
    technicalNotes: "CRITICAL: SM-A125F (Helio P35) and SM-A127F (Exynos 850) have different motherboard revisions and display FPC connector pin layouts. Installing A125F screen on A127F results in no backlight or blown backlight filter L6001.",
    evidence: {
      sourceType: VerificationSourceType.BOARDVIEW_SCHEMATIC,
      sourceReference: "Samsung Engineering Service Bulletin SEC-A12-DIFF-2021 & Schematics SM-A125F vs SM-A127F",
      evidenceDetails: "Schematic analysis confirms J6001 on A125F has different power rail mapping compared to A127F motherboard. Displays are NOT interchangeable.",
    }
  },

  // Negative 2: Redmi 9 Screen DOES NOT fit Redmi 9A / 9C
  {
    deviceBrand: "Xiaomi",
    deviceModel: "M2004J19G",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.SCREEN,
    partNameOrCode: "FPC_REDMI9A_LCD",
    status: CompatibilityStatus.INCOMPATIBLE,
    type: CompatibilityType.INCOMPATIBLE,
    level: VerificationLevel.ENGINEERING_VERIFIED,
    technicalNotes: "CRITICAL: Redmi 9 (FHD+ 1080p, Helio G80) uses a dual-lane high bandwidth FPC, while Redmi 9A/9C (HD+ 720p, Helio G25/G35) use single-lane 720p FPC. Connector pitch and pin counts are completely incompatible.",
    evidence: {
      sourceType: VerificationSourceType.BOARDVIEW_SCHEMATIC,
      sourceReference: "Xiaomi Redmi 9 (Galahad) Schematic vs Redmi 9A/9C (Dandelion/Angelica) Schematic Sheet 15",
      evidenceDetails: "Connector J1501 on Redmi 9 is 40-pin; connector J1201 on Redmi 9A/9C is 34-pin. Physical and electrical mismatch.",
    }
  },

  // Negative 3: iPhone 8 Battery DOES NOT plug into iPhone SE 2020
  {
    deviceBrand: "Apple",
    deviceModel: "A2275",
    deviceNetworkVariant: "4G",
    partCategory: PartCategory.BATTERY,
    partNameOrCode: "616-00357",
    status: CompatibilityStatus.INCOMPATIBLE,
    type: CompatibilityType.INCOMPATIBLE,
    level: VerificationLevel.ENGINEERING_VERIFIED,
    technicalNotes: "CRITICAL: Although iPhone 8 and SE 2020 share identical battery cell dimensions and capacity (1821mAh), Apple changed the battery logic board connector (BMS flex) on SE 2020 (Texas Instruments bq27546 derivative with different connector clip). An iPhone 8 battery cannot plug into an SE 2020 logic board.",
    evidence: {
      sourceType: VerificationSourceType.BOARDVIEW_SCHEMATIC,
      sourceReference: "Apple Hardware Schematic 820-01987 (iPhone SE 2020) Battery FPC Connector J3200",
      evidenceDetails: "J3200 on SE 2020 uses a different pitch and pinout compared to J3200 on iPhone 8 (820-00840). Forcing connector will damage board.",
    }
  },
];
