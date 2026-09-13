export type Language = 'en' | 'ar';

export type Theme = 'light' | 'dark';

export type Page = 'dashboard' | 'addVehicle' | 'viewVehicles' | 'viewVehicleDetails' | 'addDriver' | 'viewDrivers' | 'reportIncident' | 'vehicleHistory' | 'settings' | 'adminDashboard' | 'transferVehicle' | 'addMenpower' | 'menpowerOverview' | 'addProjectOfficers' | 'viewProjectOfficers' | 'adminTransferLog' | 'adminAllProjects' | 'adminAllIncidents' | 'adminAllVehicles' | 'viewCrewmen' | 'viewCampLabours' | 'viewSupervisors' | 'adminAllMenpower' | 'adminAllDrivers' | 'adminAllMenpowerReport' | 'dynamicJson' | 'manpowerSummary' | 'manpowerAssign' | 'allForemen' | 'allLabour' | 'adminAllForemen' | 'adminAllLabour';

export interface User {
  uid?: string;
  projectName: string;
  projectManagerName: string;
  projectId: string;
  operatorName: string;
  email: string;
  password: string; // In a real app, this would be a hash
  isAdmin?: boolean;
  securityAnswer?: string;
}

export interface Driver {
  id: string;
  driverName: string;
  nationality: string;
  driverIqama: string;
  driverIdNumber: string; // ID Number field - required
  driverMobile: string;
  assignedVehicle: string; // Vehicle ID
  vehicleId?: string; // Also support vehicleId for compatibility
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleStatus = 'Active' | 'active' | 'Accident' | 'Breakdown' | 'Under Maintenance' | string;

export interface Vehicle {
  id: string;
  doorNumber: string;
  plateNumber: string;
  chassisNumber: string;
  make: string;
  manufacturer: string;
  year: string;
  purchaseDate: string;
  tareWeight: string;
  serviceType: string;
  projectSite: string;
  status: VehicleStatus;
  inWorkshop?: boolean; // Track if vehicle is in workshop
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NavLink {
  href: string;
  icon: string;
  labelKey: Page | 'logout' | 'menpower' | 'vehicleFleet' | 'projectOfficersHeader' | 'adminReports' | 'dynamicJson';
  type?: 'link' | 'header';
  adminOnly?: boolean;
}

export type EventType = 'CREATED' | 'UPDATED' | 'DELETED' | 'ASSIGNED' | 'UNASSIGNED' | 'TRANSFERRED';

export interface HistoryEvent {
  timestamp: string;
  eventType: EventType;
  details: string;
}

export interface Incident {
    id: string;
    vehicleId: string;
    type: string;
    date: string;
    description: string;
    affectedPart?: string;
    driverId?: string;
    userId?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    notes?: string;
    status?: 'Open' | 'Resolved';
}

export type TransferStatus = 'Transferred' | 'Returned';

export interface Transfer {
    id: string;
    vehicleId: string;
    fromUserId: string;
    toUserId: string;
    timestamp: string;
    status: TransferStatus;
}

export interface Labour {
    id: string;
    name: string;
    iqama: string;
    empId: string;
    idNumber?: string;
    userId?: string;
}

export interface Foreman {
    id: string;
    name: string;
    iqama: string;
    empId: string;
    idNumber?: string;
    labours: Labour[];
}

export interface Supervisor {
    id: string;
    name: string;
    area: string;
    iqama: string;
    mobile: string;
    empId: string;
    idNumber?: string;
    foremen: Foreman[];
    userId?: string;
}

export interface ProjectMetadata {
    // These have been removed and are now derived from campLabours.length and crewmen.length
}

export type NotificationType = 'VEHICLE_SENT' | 'VEHICLE_RETURNED';

export interface AdminNotification {
  id: string;
  transferId: string;
  fromUserId: string; // user who sent the notification
  vehicleId: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export type ProjectOfficerRole = string;

export interface ProjectOfficer {
  id: string;
  role: ProjectOfficerRole;
  name: string;
  iqama: string;
  idNumber?: string;
  mobile: string;
  userId?: string;
}

export interface RepairHistory {
  id: string;
  vehicleId: string;
  repairedAt: string; // ISO string
  repairedBy: string;
  repairNotes?: string;
  originalIncident?: Incident;
  userId?: string;
  timestamp: string; // ISO string
}


export interface ProjectData {
  vehicles: Vehicle[];
  drivers: Driver[];
  incidents: Incident[];
  transfers: Transfer[];
  supervisors: Supervisor[];
  crewmen: Labour[];
  campLabours: Labour[];
  notifications: AdminNotification[];
  projectOfficers: ProjectOfficer[];
  repairHistory: RepairHistory[];
}