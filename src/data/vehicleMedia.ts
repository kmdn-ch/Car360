export interface VehiclePhoto {
  id: string;
  src: string;
  title: string;
  caption: string;
  alt: string;
  objectPosition?: string;
}

export const VEHICLE_PHOTOS: VehiclePhoto[] = [];
