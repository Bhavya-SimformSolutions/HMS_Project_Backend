export interface WorkingDayInput {
  day: string;
  start_time: string;
  close_time: string;
}

export interface DoctorCreateInput {
  email: string;
  password: string;
  name: string;
  specialization: string;
  department: string;
  license_number: string;
  phone: string;
  address: string;
  type: 'FULL' | 'PART';
  working_days: WorkingDayInput[];
  user_id?: string;
}