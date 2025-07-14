// Centralized configuration for route access which maps routes to roles allowed to access them

type RouteAccessProps = {
    [key: string]: string[];
  };
  
  export const routeAccess: RouteAccessProps = {
    "/admin": ["ADMIN"],
    "/doctor": ["DOCTOR"],
    "/patient": ["PATIENT", "ADMIN", "DOCTOR", "NURSE"],
    "/admin/dashboard": ["ADMIN"],
    "/patient/register": ["PATIENT"],
    "/patient/appointments": ["PATIENT"],
    "/patient/appointments/:id": ["PATIENT"],
    "/patient/appointments/:id/status": ["PATIENT"],
    "/patient/appointments/doctors": ["PATIENT"],
    "/doctor/dashboard": ["DOCTOR"],
  };