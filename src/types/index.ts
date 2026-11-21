export type ThemeMode = 'dark' | 'light';

export type TabId =
  | 'dashboard'
  | 'insurance'
  | 'maintenance'
  | 'leasing'
  | 'documents';

export interface VehicleIdentity {
  brandModel: string;
  color: string;
  engine: string;
  firstRegistrationDate: string; // YYYY-MM-DD
  plate: string;
  vin: string;
  matricule: string;
  listPrice: number;
  accessoriesPrice: number;
  startMileage: number;
  currentMileage: number;
  lastMileageDate: string; // YYYY-MM-DD
  oilSpec: string;
  oilMinMaxDiffLiters: number;
  tirePressureNote: string;
}

export interface MileageSnapshot {
  id: string;
  date: string; // YYYY-MM-DD
  km: number;
  note?: string;
}

export interface LeasingContract {
  contractNumber: string;
  lender: string;
  lenderAddress: string;
  lenderPhone: string;
  lenderEmail: string;
  lenderPortal: string;
  dealer: string;
  dealerAddress: string;
  dealerAdvisor: string;
  signatureDate: string; // YYYY-MM-DD
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationMonths: number;
  netVehiclePrice: number;
  downPayment: number;
  securityDeposit: number;
  monthlyPayment: number;
  nominalRatePct: number;
  effectiveRatePct: number;
  annualKmAllowance: number;
  excessKmFee: number;
  residualValue: number;
  earlyTerminationFeePct: number;
  earlyTerminationFeeMin: number;
  noticeDays: number;
  targetExitMonthMin: number;
  targetExitMonthMax: number;
  targetExitKmMax: number;
  targetNetShortfallMax: number;
  monthlySafetySavings: number;
  existingSafetySavings: number;
}

export interface SmileInsurance {
  insurer: string;
  provider: string;
  policyNumber: string;
  greenCardCode: string;
  category: string;
  excludedCountries: string[];
  cgaVersion: string;
  startDate: string;
  endDate: string;
  annualPremium: number;
  netPremium: number;
  legalTaxes: number;
  monthlyEquivalent: number;
  paymentMethod: string;
  paymentInterval: string;
  holderName: string;
  holderAddress: string;
  liabilityLimit: string;
  liabilityGrade: string;
  liabilityBonusProtected: boolean;
  liabilityDeductibleHabitual: number;
  liabilityDeductibleYoung: number;
  liabilityDeductibleOther: number;
  liabilityPremium: number;
  partialCascoCovered: boolean;
  partialCascoDeductible: number;
  glassCoverage: string;
  fullCascoCovered: boolean;
  fullCascoDeductible: number;
  fullCascoGrade: string;
  fullCascoBonusProtected: boolean;
  parkingDamage: string;
  indemnityType: string;
  personalBelongings: string;
  cascoPremium: number;
  grossNegligenceIncluded: boolean;
  grossNegligencePremium: number;
  exclusions: string[];
  phone: string;
  website: string;
  nbiPhoneCH: string;
  nbiPhoneAbroad: string;
}

export interface AlpheraCoverageItem {
  id: string;
  title: string;
  limitPerEvent: string;
  limitPerYear?: string;
  note: string;
}

export interface AlpheraProtection {
  insurer: string;
  underwriterAddress: string;
  claimsPhone: string;
  claimsEmail: string;
  statusLabel: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  cancellationNoticeDays: number;
  coverages: AlpheraCoverageItem[];
}

export interface TcsCoverage {
  roadsideStatus: 'yes' | 'to_confirm' | 'no';
  membershipNumber: string;
  membershipTier: string;
  etiOrderRef: string;
  etiCurrentPlan: string;
  etiCurrentUntil: string;
  etiNextPlan: string;
  etiNextStart: string;
  etiNextEnd: string;
  etiUpgradeCost: number;
  phoneRoadsideCH: string;
  phoneEtiAbroad: string;
  phoneAssista: string;
  phoneServiceCH: string;
  phoneServiceAlt: string;
  etiEmail: string;
}

export type MaintenanceCategory =
  | 'Huile'
  | 'Service'
  | 'Freins'
  | 'Pneus'
  | 'MFK / Expertise'
  | 'Réparation'
  | 'Autre';

export interface MaintenanceEntry {
  id: string;
  date: string; // YYYY-MM-DD
  km: number;
  category: MaintenanceCategory;
  title: string;
  details: string;
  cost: number;
  performedBy: string;
  statusNote?: string;
}

export interface CbsScheduleItem {
  id: string;
  title: string;
  category: MaintenanceCategory;
  dueKm?: number;
  dueDate?: string; // YYYY-MM-DD
  intervalNote?: string;
  toConfirm?: boolean;
  notes?: string;
  completed?: boolean;
}

export type TireSeason = 'summer' | 'winter' | 'allseason';

export interface WheelSet {
  id: string;
  name: string;
  season: TireSeason;
  rimDesc: string;
  sizeFront: string;
  sizeRear: string;
  tireBrand: string;
  tireModel: string;
  dot: string;
  treadDepthMm?: number;
  storageLocation: string;
  notes: string;
}

export interface TireChangeChecklist {
  torque: boolean;
  pressure: boolean;
  rdcReset: boolean;
  tread: boolean;
  storage: boolean;
}

export interface TireChange {
  id: string;
  dateTime: string; // YYYY-MM-DDTHH:mm
  km: number;
  fromSetId: string | null;
  toSetId: string;
  doneBy: 'self' | 'garage';
  cost: number;
  checklist: TireChangeChecklist;
  notes: string;
  retorqueDone: boolean;
}

export interface PlannedTireChange {
  dateTime: string; // YYYY-MM-DDTHH:mm
  toSetId: string;
  doneBy: 'self' | 'garage';
  note: string;
}

export interface TireState {
  mountedSetId: string;
  sets: WheelSet[];
  history: TireChange[];
  planned: PlannedTireChange | null;
  wheelBoltTorqueNm: number;
  pressureNote: string;
}

export interface WarrantyItem {
  id: string;
  title: string;
  provider: string;
  coverage: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  maxKm?: number;
  syncedWithAlphera?: boolean;
  toConfirm?: boolean;
  notes?: string;
}

export interface AppState {
  schemaVersion: number;
  theme: ThemeMode;
  vehicle: VehicleIdentity;
  mileageHistory: MileageSnapshot[];
  leasing: LeasingContract;
  smile: SmileInsurance;
  alpheraProtection: AlpheraProtection;
  tcs: TcsCoverage;
  maintenanceLog: MaintenanceEntry[];
  cbsSchedule: CbsScheduleItem[];
  tires: TireState;
  warranties: WarrantyItem[];
}

export interface TerminationTableRow {
  m: number;
  B: number;
  C: number;
  D: number;
  E: number;
}

export interface BuiltinDocument {
  id: string;
  title: string;
  category: 'Assurance' | 'Leasing' | 'TCS' | 'Véhicule';
  file: string;
  sizeKB: number;
  subtitle?: string;
}

export interface VaultDocumentMeta {
  id: string;
  name: string;
  category: 'Assurance' | 'Leasing' | 'TCS' | 'Entretien' | 'Autre';
  mimeType: string;
  size: number;
  addedAt: string;
}

export interface AppAlert {
  id: string;
  severity: 'urgent' | 'warning' | 'confirm' | 'info';
  domain: 'tires' | 'insurance' | 'mileage' | 'maintenance' | 'warranty';
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionType?:
    | 'open-tire-change'
    | 'open-tire-plan'
    | 'mark-retorque'
    | 'go-insurance'
    | 'go-maintenance'
    | 'go-leasing'
    | 'go-documents';
  icsEvent?: {
    title: string;
    description: string;
    startLocal: string; // YYYY-MM-DDTHH:mm or YYYY-MM-DD
    filename: string;
  };
}
