export type Language = 'en' | 'ar';

export type Theme = 'light' | 'dark';

export type Page = 'dashboard' | 'addVehicle' | 'viewVehicles' | 'viewVehicleDetails' | 'addDriver' | 'viewDrivers' | 'reportIncident' | 'reports' | 'settings' | 'adminDashboard' | 'transferVehicle' | 'addSupervisor' | 'supervisorOverview' | 'addProjectOfficers' | 'viewProjectOfficers' | 'adminTransferLog' | 'adminAllProjects' | 'adminAllIncidents' | 'adminAllVehicles';

export interface User {
  uid?: string;
  projectName: string;
  projectManagerName: string;
  projectId: string;
  operatorName: string;
  email: string;
  password: string; // In a real app, this would be a hash
  isAdmin?: boolean;
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface Driver {
  id: string;
  driverName: string;
  nationality: string;
  driverIqama: string;
  driverMobile: string;
  assignedVehicle: string; // Vehicle ID
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleStatus = 'Active' | 'Accident' | 'Not Working';

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
  isDuplicate?: boolean;
  duplicateOf?: string; // ID of the original vehicle if this is a duplicate
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NavLink {
  href: string;
  icon: string;
  labelKey: Page | 'logout' | 'menPower' | 'vehicleFleet' | 'projectOfficersHeader' | 'adminReports';
  type?: 'link' | 'header';
  adminOnly?: boolean;
}

export interface Incident {
    id: string;
    vehicleId: string;
    type: 'Accident' | 'Not Working';
    date: string;
    description: string;
    userId?: string;
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

export interface Foreman {
    id: string;
    name: string;
    totalLabour: number;
}

export interface Supervisor {
    id: string;
    name: string;
    area: string;
    iqama: string;
    mobile: string;
    foremen: Foreman[];
    userId?: string;
}

export interface ProjectMetadata {
    campLabour: number;
    crewman: number;
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
  mobile: string;
  userId?: string;
}

export interface ProjectData extends ProjectMetadata {
  vehicles: Vehicle[];
  drivers: Driver[];
  incidents: Incident[];
  transfers: Transfer[];
  supervisors: Supervisor[];
  notifications: AdminNotification[];
  projectOfficers: ProjectOfficer[];
}