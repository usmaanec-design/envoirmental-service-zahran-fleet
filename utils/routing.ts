import type { Page, Language } from '../types';

export const ROUTE_PATH_MAP: Record<Page, string> = {
  dashboard: '/dashboard',
  viewVehicles: '/vehicles',
  addVehicle: '/add-vehicle',
  viewVehicleDetails: '/vehicle-details',
  viewDrivers: '/drivers',
  addDriver: '/add-driver',
  viewSupervisors: '/supervisors',
  allForemen: '/foremen',
  allLabour: '/labour',
  viewCampLabours: '/camp-labour',
  viewCrewmen: '/crewmen',
  viewProjectOfficers: '/project-officers',
  menpowerOverview: '/manpower',
  manpowerAssign: '/manpower-assign',
  addMenpower: '/add-manpower',
  reportIncident: '/incidents',
  vehicleHistory: '/reports',
  transferVehicle: '/transfer-vehicle',
  settings: '/settings',
  adminDashboard: '/admin',
  adminAllProjects: '/admin/projects',
  adminAllVehicles: '/admin/vehicles',
  adminAllDrivers: '/admin/drivers',
  adminAllIncidents: '/admin/incidents',
  adminTransferLog: '/admin/transfers',
  adminAllMenpower: '/admin/manpower',
  adminAllForemen: '/admin/foremen',
  adminAllLabour: '/admin/labour',
  adminAllMenpowerReport: '/admin/manpower-reports',
  dynamicJson: '/dynamic-json',
};

export const PATH_TO_PAGE_MAP: Record<string, Page> = Object.entries(ROUTE_PATH_MAP).reduce(
  (acc, [page, path]) => {
    acc[path] = page as Page;
    acc[path.toLowerCase()] = page as Page;
    return acc;
  },
  {} as Record<string, Page>
);

export const PAGE_TITLES: Record<Page, { en: string; ar: string }> = {
  dashboard: { en: 'Operations Dashboard', ar: 'لوحة التحكم للعمليات' },
  viewVehicles: { en: 'Vehicles Fleet', ar: 'أسطول المركبات' },
  addVehicle: { en: 'Add Vehicle', ar: 'إضافة مركبة' },
  viewVehicleDetails: { en: 'Vehicle Details', ar: 'تفاصيل المركبة' },
  viewDrivers: { en: 'Drivers Directory', ar: 'دليل السائقين' },
  addDriver: { en: 'Add Driver', ar: 'إضافة سائق' },
  viewSupervisors: { en: 'Supervisors Directory', ar: 'دليل المشرفين' },
  allForemen: { en: 'Foremen Directory', ar: 'دليل المراقبين' },
  allLabour: { en: 'Labour Workforce', ar: 'العمالة' },
  viewCampLabours: { en: 'Camp Labour', ar: 'عمالة السكن' },
  viewCrewmen: { en: 'Crewmen Directory', ar: 'دليل الطاقم' },
  viewProjectOfficers: { en: 'Project Officers', ar: 'مسؤولو المشروع' },
  menpowerOverview: { en: 'Manpower Overview', ar: 'نظرة عامة على القوى العاملة' },
  manpowerAssign: { en: 'Manpower Assignment', ar: 'توزيع القوى العاملة' },
  addMenpower: { en: 'Add Manpower', ar: 'إضافة قوى عاملة' },
  reportIncident: { en: 'Report Incident', ar: 'الإبلاغ عن حادث' },
  vehicleHistory: { en: 'Fleet Reports & History', ar: 'تقارير وسجل الأسطول' },
  transferVehicle: { en: 'Vehicle Transfer', ar: 'نقل المركبات' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
  adminDashboard: { en: 'Admin Dashboard', ar: 'لوحة تحكم المشرف العام' },
  adminAllProjects: { en: 'All Projects', ar: 'جميع المشاريع' },
  adminAllVehicles: { en: 'All Vehicles Overview', ar: 'نظرة عامة على جميع المركبات' },
  adminAllDrivers: { en: 'All Drivers Overview', ar: 'نظرة عامة على جميع السائقين' },
  adminAllIncidents: { en: 'All Incidents Overview', ar: 'نظرة عامة على جميع الحوادث' },
  adminTransferLog: { en: 'Transfer Log', ar: 'سجل نقل المركبات' },
  adminAllMenpower: { en: 'All Manpower', ar: 'جميع القوى العاملة' },
  adminAllForemen: { en: 'All Foremen', ar: 'جميع المراقبين' },
  adminAllLabour: { en: 'All Labour', ar: 'جميع العمال' },
  adminAllMenpowerReport: { en: 'Manpower Report', ar: 'تقرير القوى العاملة' },
  dynamicJson: { en: 'Dynamic Config', ar: 'الإعدادات الديناميكية' },
};

export const getInitialPageFromUrl = (): Page => {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return 'dashboard';
  }
  return PATH_TO_PAGE_MAP[pathname] || 'dashboard';
};

export const syncUrlWithPage = (page: Page, lang: Language) => {
  const targetPath = ROUTE_PATH_MAP[page] || '/dashboard';
  if (window.location.pathname !== targetPath) {
    window.history.pushState({ page }, '', targetPath);
  }
  const titleInfo = PAGE_TITLES[page] || { en: 'Fleet Operations', ar: 'إدارة العمليات والأسطول' };
  const pageTitle = lang === 'ar' ? titleInfo.ar : titleInfo.en;
  document.title = `${pageTitle} | Zahran Environmental Services`;
};
