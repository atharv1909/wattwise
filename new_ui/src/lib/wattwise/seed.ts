// WattWise seed data — demonstration households, floorplans, appliance
// inventories wired to SimReady 3D artifacts, IoT devices, alerts, split
// groups and dataset-backed meter readings. Mirrors the spec's in-memory
// fallback store ("all endpoints work identically").
import type { Appliance, Archetype, Room, Device, Alert, SplitGroup } from "./types";

export interface Floorplan {
  archetype: Archetype;
  label: string;
  blurb: string;
  footprint: { w: number; d: number };
  rooms: Omit<Room, "id" | "household_id">[];
}

/** Room rect = {x,z} min-corner + {w,d} size in meters. Walls 2.7m. */
export const FLOORPLANS: Record<Archetype, Floorplan> = {
  "1BHK": {
    archetype: "1BHK",
    label: "1BHK Compact",
    blurb: "620 sq.ft • living-cum-bedroom, kitchenette, bath, balcony",
    footprint: { w: 7.5, d: 6.5 },
    rooms: [
      { name: "Living cum Bedroom", room_type: "Living Room", x: 0, z: 0, w: 4.4, d: 4.0 },
      { name: "Kitchenette", room_type: "Kitchen", x: 4.4, z: 0, w: 2.4, d: 2.6 },
      { name: "Bathroom", room_type: "Bathroom", x: 4.4, z: 2.6, w: 2.4, d: 1.4 },
      { name: "Balcony", room_type: "Balcony", x: 0, z: 4.0, w: 4.4, d: 1.4 },
    ],
  },
  "2BHK": {
    archetype: "2BHK",
    label: "2BHK Standard",
    blurb: "910 sq.ft • master bed with AC, second bedroom, living, kitchen",
    footprint: { w: 9.5, d: 7.5 },
    rooms: [
      { name: "Living & Dining", room_type: "Living Room", x: 0, z: 0, w: 5.0, d: 4.0 },
      { name: "Kitchen", room_type: "Kitchen", x: 5.0, z: 0, w: 3.0, d: 3.0 },
      { name: "Master Bedroom", room_type: "Bedroom", x: 0, z: 4.0, w: 4.5, d: 3.5 },
      { name: "Bedroom 2", room_type: "Bedroom", x: 4.5, z: 3.0, w: 3.5, d: 3.0 },
      { name: "Bathroom", room_type: "Bathroom", x: 5.0, z: 6.0, w: 3.0, d: 1.5 },
      { name: "Balcony", room_type: "Balcony", x: 8.0, z: 0, w: 1.5, d: 4.0 },
    ],
  },
  "3BHK": {
    archetype: "3BHK",
    label: "3BHK Residence",
    blurb: "1,240 sq.ft • three bedrooms, double living, utility balcony",
    footprint: { w: 12.0, d: 8.0 },
    rooms: [
      { name: "Living & Dining", room_type: "Living Room", x: 0, z: 0, w: 5.6, d: 4.4 },
      { name: "Kitchen", room_type: "Kitchen", x: 5.6, z: 0, w: 3.2, d: 3.2 },
      { name: "Master Bedroom", room_type: "Bedroom", x: 0, z: 4.4, w: 4.6, d: 3.6 },
      { name: "Kids Bedroom", room_type: "Bedroom", x: 4.6, z: 4.4, w: 3.4, d: 3.0 },
      { name: "Study / Guest Room", room_type: "Bedroom", x: 8.0, z: 3.2, w: 4.0, d: 3.2 },
      { name: "Bathroom 1", room_type: "Bathroom", x: 5.6, z: 3.2, w: 2.4, d: 1.2 },
      { name: "Bathroom 2", room_type: "Bathroom", x: 8.0, z: 6.4, w: 4.0, d: 1.6 },
      { name: "Utility Balcony", room_type: "Balcony", x: 8.8, z: 0, w: 3.2, d: 3.2 },
    ],
  },
  PG_Flat: {
    archetype: "PG_Flat",
    label: "Student PG Flat",
    blurb: "Shared flat • one AC room, two fan rooms, hall, kitchenette",
    footprint: { w: 9.0, d: 6.5 },
    rooms: [
      { name: "Hall (Common)", room_type: "Living Room", x: 0, z: 0, w: 4.2, d: 3.6 },
      { name: "Room A (AC)", room_type: "Bedroom", x: 4.2, z: 0, w: 3.2, d: 3.2 },
      { name: "Room B (Fan)", room_type: "Bedroom", x: 7.4, z: 0, w: 1.6, d: 3.2 },
      { name: "Room C (Fan)", room_type: "Bedroom", x: 0, z: 3.6, w: 3.4, d: 2.9 },
      { name: "Kitchenette", room_type: "Kitchen", x: 3.4, z: 3.6, w: 2.8, d: 2.4 },
      { name: "Common Bathroom", room_type: "Bathroom", x: 6.2, z: 3.6, w: 2.8, d: 1.4 },
    ],
  },
};

export interface SeedAppliance extends Omit<Appliance, "id" | "household_id" | "room_id"> {
  room: string;
}

type ApplianceSpec = Omit<SeedAppliance, "pos_x" | "pos_y" | "pos_z"> & Partial<Pick<Appliance, "pos_x" | "pos_y" | "pos_z">>;

/** Furniture/props placed for realism (no power draw, not part of the bill). */
export interface SeedProp {
  room: string;
  artifact3d: string;
  pos: [number, number, number];
  rotY?: number;
  scale?: number;
}

interface ArchetypeSeed {
  appliances: ApplianceSpec[];
  props: SeedProp[];
}

export const COMMON_PROPS: Record<Archetype, SeedProp[]> = {
  "1BHK": [
    { room: "Living cum Bedroom", artifact3d: "sofa", pos: [1.1, 0, 0.75], rotY: Math.PI },
    { room: "Living cum Bedroom", artifact3d: "blinds", pos: [2.2, 1.0, 3.97] },
    { room: "Bathroom", artifact3d: "toilet", pos: [6.3, 0, 3.55], rotY: Math.PI },
    { room: "Bathroom", artifact3d: "sink", pos: [5.0, 0, 2.85] },
    { room: "Kitchenette", artifact3d: "pan", pos: [5.2, 0.92, 0.5] },
    { room: "Living cum Bedroom", artifact3d: "vase", pos: [4.05, 0.45, 0.6] },
  ],
  "2BHK": [
    { room: "Living & Dining", artifact3d: "sofa", pos: [1.3, 0, 0.8], rotY: Math.PI },
    { room: "Living & Dining", artifact3d: "vase", pos: [4.6, 0.45, 0.5] },
    { room: "Living & Dining", artifact3d: "blinds", pos: [2.5, 1.0, 3.97] },
    { room: "Bathroom", artifact3d: "toilet", pos: [7.4, 0, 7.15], rotY: Math.PI },
    { room: "Bathroom", artifact3d: "sink", pos: [5.5, 0, 6.25] },
    { room: "Bathroom", artifact3d: "mirror", pos: [5.1, 1.35, 7.42], rotY: -Math.PI / 2 },
    { room: "Kitchen", artifact3d: "pan", pos: [5.6, 0.92, 0.55] },
    { room: "Kitchen", artifact3d: "mug", pos: [7.2, 0.92, 0.6] },
    { room: "Master Bedroom", artifact3d: "alarm_clock", pos: [0.5, 0.55, 4.6] },
  ],
  "3BHK": [
    { room: "Living & Dining", artifact3d: "sofa", pos: [1.4, 0, 0.85], rotY: Math.PI },
    { room: "Living & Dining", artifact3d: "sofa", pos: [4.6, 0, 3.3], rotY: -Math.PI / 2, scale: 0.92 },
    { room: "Living & Dining", artifact3d: "vase", pos: [5.2, 0.45, 0.6] },
    { room: "Living & Dining", artifact3d: "blinds", pos: [2.8, 1.0, 4.37] },
    { room: "Bathroom 1", artifact3d: "sink", pos: [6.0, 0, 3.4] },
    { room: "Bathroom 2", artifact3d: "toilet", pos: [11.4, 0, 7.4], rotY: Math.PI },
    { room: "Bathroom 2", artifact3d: "mirror", pos: [8.6, 1.35, 7.9] },
    { room: "Kitchen", artifact3d: "pan", pos: [6.0, 0.92, 0.5] },
    { room: "Kitchen", artifact3d: "mug", pos: [7.9, 0.92, 0.6] },
    { room: "Study / Guest Room", artifact3d: "vase", pos: [11.6, 0.45, 3.6] },
  ],
  PG_Flat: [
    { room: "Hall (Common)", artifact3d: "sofa", pos: [1.0, 0, 0.7], rotY: Math.PI, scale: 0.95 },
    { room: "Hall (Common)", artifact3d: "vase", pos: [3.8, 0.45, 0.4] },
    { room: "Common Bathroom", artifact3d: "toilet", pos: [8.6, 0, 4.6], rotY: Math.PI },
    { room: "Common Bathroom", artifact3d: "sink", pos: [6.6, 0, 3.85] },
    { room: "Kitchenette", artifact3d: "pan", pos: [4.0, 0.92, 3.85] },
    { room: "Room A (AC)", artifact3d: "vase", pos: [4.6, 0.45, 2.8] },
  ],
};

export const ARCH_SEED: Record<Archetype, ArchetypeSeed> = {
  "1BHK": {
    appliances: [
      { room: "Living cum Bedroom", custom_name: "Bedroom Split AC", rated_w: 1500, standby_w: 3.5, bee_star_rating: 3, daily_hours_guess: 6, model_kind: "thermostatic", category: "Air Conditioner", artifact3d: "split_ac", pos_x: 2.2, pos_y: 2.12, pos_z: 0.18, rot_y: 0 },
      { room: "Living cum Bedroom", custom_name: "Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 3, daily_hours_guess: 9, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 2.2, pos_y: 2.62, pos_z: 2.0 },
      { room: "Living cum Bedroom", custom_name: "LED Ceiling Light", rated_w: 36, standby_w: 0.4, bee_star_rating: 5, daily_hours_guess: 6, model_kind: "scheduled", category: "Lighting", artifact3d: "ceiling_light", pos_x: 2.2, pos_y: 2.68, pos_z: 1.2, is_on: true },
      { room: "Living cum Bedroom", custom_name: "LED TV 43\"", rated_w: 100, standby_w: 8, bee_star_rating: 4, daily_hours_guess: 5, model_kind: "scheduled", category: "Television", artifact3d: "tv", pos_x: 0.5, pos_y: 0.6, pos_z: 0.25, rot_y: 0 },
      { room: "Living cum Bedroom", custom_name: "Wi-Fi Router", rated_w: 10, standby_w: 10, bee_star_rating: 5, daily_hours_guess: 24, model_kind: "constant", category: "Networking", artifact3d: "router", pos_x: 3.9, pos_y: 1.02, pos_z: 0.35 },
      { room: "Kitchenette", custom_name: "Refrigerator 190L", rated_w: 150, standby_w: 2, bee_star_rating: 3, daily_hours_guess: 24, model_kind: "cyclic", category: "Refrigerator", artifact3d: "refrigerator", pos_x: 2.0, pos_y: 0, pos_z: 0.55, rot_y: 0 },
      { room: "Bathroom", custom_name: "Storage Geyser 15L", rated_w: 2000, standby_w: 2, bee_star_rating: 4, daily_hours_guess: 0.75, model_kind: "scheduled", category: "Water Heater", artifact3d: "geyser", pos_x: 0.3, pos_y: 1.6, pos_z: 0.15 },
      { room: "Balcony", custom_name: "Washing Machine", rated_w: 500, standby_w: 1.5, bee_star_rating: 5, daily_hours_guess: 0.6, model_kind: "scheduled", category: "Washing Machine", artifact3d: "washer", pos_x: 0.6, pos_y: 0, pos_z: 0.6 },
      { room: "Balcony", custom_name: "Balcony Light", rated_w: 15, standby_w: 0.2, bee_star_rating: 5, daily_hours_guess: 5, model_kind: "scheduled", category: "Lighting", artifact3d: "kitchen_light", pos_x: 2.2, pos_y: 2.68, pos_z: 0.7, is_on: false },
    ],
  },
  "2BHK": {
    appliances: [
      { room: "Master Bedroom", custom_name: "Master Bedroom Split AC", rated_w: 1500, standby_w: 3.5, bee_star_rating: 3, daily_hours_guess: 6.5, model_kind: "thermostatic", category: "Air Conditioner", artifact3d: "split_ac", pos_x: 2.25, pos_y: 2.12, pos_z: 0.18, rot_y: 0 },
      { room: "Master Bedroom", custom_name: "Master Bedroom Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 3, daily_hours_guess: 8, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 2.25, pos_y: 2.62, pos_z: 1.75 },
      { room: "Master Bedroom", custom_name: "Bedside Lamp", rated_w: 9, standby_w: 0.5, bee_star_rating: 5, daily_hours_guess: 3, model_kind: "scheduled", category: "Lighting", artifact3d: "bedside_lamp", pos_x: 0.5, pos_y: 0.55, pos_z: 0.55, is_on: true },
      { room: "Bedroom 2", custom_name: "Study Laptop + Charger", rated_w: 65, standby_w: 2.5, bee_star_rating: 5, daily_hours_guess: 5, model_kind: "scheduled", category: "Computer", artifact3d: "laptop", pos_x: 1.7, pos_y: 0.76, pos_z: 1.2, rot_y: Math.PI },
      { room: "Bedroom 2", custom_name: "Bedroom 2 Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 2, daily_hours_guess: 7, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 1.75, pos_y: 2.62, pos_z: 1.5 },
      { room: "Living & Dining", custom_name: "Living Room LED TV 55\"", rated_w: 120, standby_w: 10, bee_star_rating: 4, daily_hours_guess: 5.5, model_kind: "scheduled", category: "Television", artifact3d: "tv", pos_x: 0.6, pos_y: 0.6, pos_z: 0.3, rot_y: 0 },
      { room: "Living & Dining", custom_name: "Living Room Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 3, daily_hours_guess: 9, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 2.5, pos_y: 2.62, pos_z: 2.0 },
      { room: "Living & Dining", custom_name: "Living Room Ceiling Light", rated_w: 36, standby_w: 0.4, bee_star_rating: 5, daily_hours_guess: 6, model_kind: "scheduled", category: "Lighting", artifact3d: "ceiling_light", pos_x: 2.5, pos_y: 2.68, pos_z: 1.1, is_on: true },
      { room: "Living & Dining", custom_name: "Wi-Fi Router", rated_w: 10, standby_w: 10, bee_star_rating: 5, daily_hours_guess: 24, model_kind: "constant", category: "Networking", artifact3d: "router", pos_x: 4.55, pos_y: 1.02, pos_z: 0.4 },
      { room: "Kitchen", custom_name: "Refrigerator 260L Double Door", rated_w: 150, standby_w: 2, bee_star_rating: 3, daily_hours_guess: 24, model_kind: "cyclic", category: "Refrigerator", artifact3d: "refrigerator", pos_x: 0.45, pos_y: 0, pos_z: 0.55, rot_y: 0 },
      { room: "Kitchen", custom_name: "Microwave Oven 20L", rated_w: 1200, standby_w: 3, bee_star_rating: 4, daily_hours_guess: 0.5, model_kind: "scheduled", category: "Microwave", artifact3d: "microwave", pos_x: 1.5, pos_y: 0.92, pos_z: 0.45, rot_y: 0 },
      { room: "Kitchen", custom_name: "Gas Range + Electric Ignition", rated_w: 8, standby_w: 1, bee_star_rating: 5, daily_hours_guess: 2.5, model_kind: "scheduled", category: "Cooking", artifact3d: "gas_range", pos_x: 2.35, pos_y: 0, pos_z: 0.6, rot_y: 0 },
      { room: "Kitchen", custom_name: "Chimney Extractor", rated_w: 180, standby_w: 1, bee_star_rating: 3, daily_hours_guess: 2.5, model_kind: "scheduled", category: "Kitchen Extractor", artifact3d: "extractor", pos_x: 2.35, pos_y: 1.65, pos_z: 0.6, rot_y: 0 },
      { room: "Kitchen", custom_name: "Pop-up Toaster", rated_w: 750, standby_w: 1, bee_star_rating: 4, daily_hours_guess: 0.2, model_kind: "scheduled", category: "Cooking", artifact3d: "toaster", pos_x: 0.9, pos_y: 0.92, pos_z: 0.5, rot_y: 0 },
      { room: "Bathroom", custom_name: "Storage Geyser 25L", rated_w: 2000, standby_w: 2, bee_star_rating: 4, daily_hours_guess: 1, model_kind: "scheduled", category: "Water Heater", artifact3d: "geyser", pos_x: 0.35, pos_y: 1.6, pos_z: 0.35 },
      { room: "Balcony", custom_name: "Washing Machine 7kg Front Load", rated_w: 500, standby_w: 1.5, bee_star_rating: 5, daily_hours_guess: 0.7, model_kind: "scheduled", category: "Washing Machine", artifact3d: "washer", pos_x: 0.55, pos_y: 0, pos_z: 0.7, rot_y: Math.PI / 2 },
    ],
  },
  "3BHK": {
    appliances: [
      { room: "Master Bedroom", custom_name: "Master 5-Star Inverter AC", rated_w: 1500, standby_w: 3.5, bee_star_rating: 5, daily_hours_guess: 7, model_kind: "thermostatic", category: "Air Conditioner", artifact3d: "split_ac", pos_x: 2.3, pos_y: 2.12, pos_z: 0.18 },
      { room: "Master Bedroom", custom_name: "Master Bedroom BLDC Fan", rated_w: 28, standby_w: 0.8, bee_star_rating: 5, daily_hours_guess: 8, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 2.3, pos_y: 2.62, pos_z: 1.8 },
      { room: "Kids Bedroom", custom_name: "Kids Room Split AC", rated_w: 1200, standby_w: 3, bee_star_rating: 3, daily_hours_guess: 5.5, model_kind: "thermostatic", category: "Air Conditioner", artifact3d: "split_ac", pos_x: 1.7, pos_y: 2.12, pos_z: 0.18 },
      { room: "Kids Bedroom", custom_name: "Kids Room Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 3, daily_hours_guess: 7, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 1.7, pos_y: 2.62, pos_z: 1.5 },
      { room: "Study / Guest Room", custom_name: "Study Room Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 2, daily_hours_guess: 6, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 2.0, pos_y: 2.62, pos_z: 1.6 },
      { room: "Study / Guest Room", custom_name: "Study Laptop Workstation", rated_w: 65, standby_w: 2.5, bee_star_rating: 5, daily_hours_guess: 6, model_kind: "scheduled", category: "Computer", artifact3d: "laptop", pos_x: 2.0, pos_y: 0.76, pos_z: 0.5 },
      { room: "Living & Dining", custom_name: "Living Room LED TV 55\"", rated_w: 120, standby_w: 10, bee_star_rating: 4, daily_hours_guess: 5, model_kind: "scheduled", category: "Television", artifact3d: "tv", pos_x: 0.7, pos_y: 0.6, pos_z: 0.3, rot_y: 0 },
      { room: "Living & Dining", custom_name: "Living Room Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 3, daily_hours_guess: 8, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 2.8, pos_y: 2.62, pos_z: 2.2 },
      { room: "Living & Dining", custom_name: "Living Room Ceiling Light", rated_w: 36, standby_w: 0.4, bee_star_rating: 5, daily_hours_guess: 6, model_kind: "scheduled", category: "Lighting", artifact3d: "ceiling_light", pos_x: 2.8, pos_y: 2.68, pos_z: 1.2, is_on: true },
      { room: "Living & Dining", custom_name: "Air Purifier H13", rated_w: 45, standby_w: 2, bee_star_rating: 5, daily_hours_guess: 12, model_kind: "scheduled", category: "Air Purifier", artifact3d: "air_purifier", pos_x: 4.9, pos_y: 0, pos_z: 0.5 },
      { room: "Living & Dining", custom_name: "Wi-Fi Mesh Router", rated_w: 12, standby_w: 12, bee_star_rating: 5, daily_hours_guess: 24, model_kind: "constant", category: "Networking", artifact3d: "router", pos_x: 5.1, pos_y: 1.02, pos_z: 0.45 },
      { room: "Kitchen", custom_name: "Refrigerator 340L Side-by-Side", rated_w: 180, standby_w: 2.5, bee_star_rating: 4, daily_hours_guess: 24, model_kind: "cyclic", category: "Refrigerator", artifact3d: "refrigerator", pos_x: 0.45, pos_y: 0, pos_z: 0.55, rot_y: Math.PI },
      { room: "Kitchen", custom_name: "Microwave Convection 28L", rated_w: 1400, standby_w: 3, bee_star_rating: 4, daily_hours_guess: 0.6, model_kind: "scheduled", category: "Microwave", artifact3d: "microwave", pos_x: 1.4, pos_y: 0.92, pos_z: 0.45, rot_y: Math.PI },
      { room: "Kitchen", custom_name: "Chimney Extractor 90cm", rated_w: 200, standby_w: 1, bee_star_rating: 3, daily_hours_guess: 3, model_kind: "scheduled", category: "Kitchen Extractor", artifact3d: "extractor", pos_x: 2.3, pos_y: 1.65, pos_z: 0.6, rot_y: Math.PI },
      { room: "Bathroom 1", custom_name: "Instant Geyser 3L", rated_w: 3000, standby_w: 2, bee_star_rating: 5, daily_hours_guess: 0.5, model_kind: "scheduled", category: "Water Heater", artifact3d: "geyser", pos_x: 0.25, pos_y: 1.6, pos_z: 0.9 },
      { room: "Bathroom 2", custom_name: "Storage Geyser 25L", rated_w: 2000, standby_w: 2, bee_star_rating: 3, daily_hours_guess: 1, model_kind: "scheduled", category: "Water Heater", artifact3d: "geyser", pos_x: 0.5, pos_y: 1.6, pos_z: 0.2 },
      { room: "Utility Balcony", custom_name: "Washing Machine 8kg Front Load", rated_w: 500, standby_w: 1.5, bee_star_rating: 5, daily_hours_guess: 0.8, model_kind: "scheduled", category: "Washing Machine", artifact3d: "washer", pos_x: 0.5, pos_y: 0, pos_z: 0.6 },
      { room: "Utility Balcony", custom_name: "Dishwasher 12 Place", rated_w: 1100, standby_w: 2, bee_star_rating: 5, daily_hours_guess: 0.5, model_kind: "scheduled", category: "Dishwasher", artifact3d: "washer", pos_x: 2.6, pos_y: 0, pos_z: 0.6, rot_y: Math.PI / 2 },
    ],
  },
  PG_Flat: {
    appliances: [
      { room: "Room A (AC)", custom_name: "Room A Split AC (shared)", rated_w: 1500, standby_w: 3.5, bee_star_rating: 3, daily_hours_guess: 8, model_kind: "thermostatic", category: "Air Conditioner", artifact3d: "split_ac", pos_x: 1.6, pos_y: 2.12, pos_z: 0.18, rot_y: 0 },
      { room: "Room A (AC)", custom_name: "Room A Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 2, daily_hours_guess: 5, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 1.6, pos_y: 2.62, pos_z: 1.6 },
      { room: "Room B (Fan)", custom_name: "Room B Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 2, daily_hours_guess: 9, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 0.8, pos_y: 2.62, pos_z: 1.6 },
      { room: "Room C (Fan)", custom_name: "Room C Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 3, daily_hours_guess: 9, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 1.7, pos_y: 2.62, pos_z: 1.4 },
      { room: "Room B (Fan)", custom_name: "Tenant Laptop (Amit)", rated_w: 65, standby_w: 2.5, bee_star_rating: 5, daily_hours_guess: 6, model_kind: "scheduled", category: "Computer", artifact3d: "laptop", pos_x: 0.6, pos_y: 0.55, pos_z: 0.9, rot_y: -Math.PI / 2 },
      { room: "Room C (Fan)", custom_name: "Tenant Laptop (Kiran)", rated_w: 65, standby_w: 2.5, bee_star_rating: 5, daily_hours_guess: 4, model_kind: "scheduled", category: "Computer", artifact3d: "laptop", pos_x: 0.6, pos_y: 0.55, pos_z: 0.4, rot_y: Math.PI / 2 },
      { room: "Hall (Common)", custom_name: "Hall LED TV", rated_w: 100, standby_w: 8, bee_star_rating: 4, daily_hours_guess: 6, model_kind: "scheduled", category: "Television", artifact3d: "tv", pos_x: 0.5, pos_y: 0.6, pos_z: 0.3, rot_y: 0 },
      { room: "Hall (Common)", custom_name: "Hall Ceiling Fan", rated_w: 75, standby_w: 1.2, bee_star_rating: 3, daily_hours_guess: 10, model_kind: "scheduled", category: "Ceiling Fan", artifact3d: "ceiling_fan", pos_x: 2.1, pos_y: 2.62, pos_z: 1.8 },
      { room: "Hall (Common)", custom_name: "Water Cooler 20L", rated_w: 500, standby_w: 2, bee_star_rating: 4, daily_hours_guess: 5, model_kind: "cyclic", category: "Water Cooler", artifact3d: "water_cooler", pos_x: 3.7, pos_y: 0, pos_z: 0.4 },
      { room: "Hall (Common)", custom_name: "Wi-Fi Router ( landlord )", rated_w: 10, standby_w: 10, bee_star_rating: 5, daily_hours_guess: 24, model_kind: "constant", category: "Networking", artifact3d: "router", pos_x: 3.9, pos_y: 1.02, pos_z: 2.9 },
      { room: "Kitchenette", custom_name: "PG Refrigerator 190L", rated_w: 150, standby_w: 2, bee_star_rating: 2, daily_hours_guess: 24, model_kind: "cyclic", category: "Refrigerator", artifact3d: "refrigerator", pos_x: 0.45, pos_y: 0, pos_z: 0.25, rot_y: Math.PI },
      { room: "Kitchenette", custom_name: "Induction Cooktop", rated_w: 1600, standby_w: 1.5, bee_star_rating: 4, daily_hours_guess: 1.5, model_kind: "scheduled", category: "Cooking", artifact3d: "gas_range", pos_x: 2.0, pos_y: 0, pos_z: 0.25, rot_y: Math.PI },
      { room: "Common Bathroom", custom_name: "Storage Geyser 15L", rated_w: 2000, standby_w: 2, bee_star_rating: 3, daily_hours_guess: 1.5, model_kind: "scheduled", category: "Water Heater", artifact3d: "geyser", pos_x: 0.35, pos_y: 1.6, pos_z: 1.15 },
    ],
  },
};

export interface SeedHousehold {
  id: number;
  user_id: number;
  name: string;
  state: string;
  discom: string;
  connection_type: string;
  category: string;
  sanctioned_load_kw: number;
  billing_day: number;
  archetype: Archetype;
  consumer_number?: string;
  last_bill_units?: number;
  last_bill_amount?: number;
}

export const SEED_HOUSEHOLDS: SeedHousehold[] = [
  { id: 1, user_id: 1, name: "Sharma Residence (2BHK, Nagpur)", state: "Maharashtra", discom: "MSEDCL", connection_type: "Single Phase", category: "Residential LT-I", sanctioned_load_kw: 3.0, billing_day: 1, archetype: "2BHK", consumer_number: "028540192842", last_bill_units: 342, last_bill_amount: 4206 },
  { id: 2, user_id: 1, name: "Joshi Studio (1BHK, Pune)", state: "Maharashtra", discom: "MSEDCL", connection_type: "Single Phase", category: "Residential LT-I", sanctioned_load_kw: 2.0, billing_day: 5, archetype: "1BHK", consumer_number: "028540155210", last_bill_units: 148, last_bill_amount: 1582 },
  { id: 3, user_id: 1, name: "Deshmukh House (3BHK, Mumbai)", state: "Maharashtra", discom: "Adani Electricity", connection_type: "Single Phase", category: "Residential LT-I", sanctioned_load_kw: 5.0, billing_day: 10, archetype: "3BHK", consumer_number: "778812004301", last_bill_units: 512, last_bill_amount: 6380 },
  { id: 4, user_id: 1, name: "Flat 302 PG (Nagpur)", state: "Maharashtra", discom: "MSEDCL", connection_type: "Single Phase", category: "Residential LT-I", sanctioned_load_kw: 3.0, billing_day: 15, archetype: "PG_Flat", consumer_number: "028540099117", last_bill_units: 388, last_bill_amount: 4720 },
];

let nextRoomId = 1;
export function buildRooms(): Room[] {
  const out: Room[] = [];
  for (const h of SEED_HOUSEHOLDS) {
    const plan = FLOORPLANS[h.archetype];
    for (const r of plan.rooms) {
      out.push({ id: nextRoomId++, household_id: h.id, ...r });
    }
  }
  return out;
}

let nextApplianceId = 1;
export function buildAppliances(): Appliance[] {
  const out: Appliance[] = [];
  for (const h of SEED_HOUSEHOLDS) {
    const plan = FLOORPLANS[h.archetype];
    const roomsByName = new Map(plan.rooms.map((r) => [r.name, r]));
    for (const a of ARCH_SEED[h.archetype].appliances) {
      const room = roomsByName.get(a.room);
      const absX = (room?.x ?? 0) + (a.pos_x ?? 0.5);
      const absZ = (room?.z ?? 0) + (a.pos_z ?? 0.5);
      out.push({
        id: nextApplianceId++,
        household_id: h.id,
        room_id: (roomOrder(h.id, a.room) ?? 0),
        custom_name: a.custom_name,
        rated_w: a.rated_w,
        standby_w: a.standby_w,
        bee_star_rating: a.bee_star_rating,
        daily_hours_guess: a.daily_hours_guess,
        model_kind: a.model_kind,
        category: a.category,
        pos_x: round2(absX),
        pos_y: a.pos_y ?? 0,
        pos_z: round2(absZ),
        rot_y: a.rot_y ?? 0,
        is_on: a.is_on ?? true,
        fan_speed: a.category === "Ceiling Fan" ? 3 : undefined,
        artifact3d: a.artifact3d,
      });
    }
  }
  return out;
}

// room id lookup — rooms are seeded in household order via buildRooms()
const roomIdByHouseholdAndName = new Map<string, number>();
export function indexRooms(rooms: Room[]) {
  roomIdByHouseholdAndName.clear();
  for (const r of rooms) roomIdByHouseholdAndName.set(`${r.household_id}:${r.name}`, r.id);
}
function roomOrder(householdId: number, roomName: string): number | undefined {
  return roomIdByHouseholdAndName.get(`${householdId}:${roomName}`);
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export const SEED_DEVICES: Omit<Device, "last_seen">[] = [
  { id: 1, household_id: 1, name: "Plug-AC-Master", kind: "smart_plug", appliance_id: 1, linked_appliance_name: "Master Bedroom Split AC", is_active: true, token: "ww_live_9f2ce1a4b77d" },
  { id: 2, household_id: 1, name: "Plug-Fridge", kind: "smart_plug", appliance_id: 10, linked_appliance_name: "Refrigerator 260L Double Door", is_active: true, token: "ww_live_3ab90df2e104" },
  { id: 3, household_id: 1, name: "CT-Main-Incomer", kind: "ct_clamp", appliance_id: null, linked_appliance_name: null, is_active: true, token: "ww_live_77c011e5aa20" },
  { id: 4, household_id: 1, name: "ESP32-Geyser-Meter", kind: "esp32_meter", appliance_id: 15, linked_appliance_name: "Storage Geyser 25L", is_active: false, token: "ww_live_05d4b8c93e71" },
];

export const SEED_ALERTS: Omit<Alert, "created_at">[] = [
  { id: 1, household_id: 1, alert_type: "slab_breach_warning", severity: "warning", title: "Approaching Slab 3 (300 kWh)", message: "You have consumed 268 kWh this cycle. Crossing 300 kWh raises your unit rate from ₹9.64 to ₹13.61 (1.41x jump). Cutting AC runtime by 2h/day keeps you inside Slab 2.", is_read: false },
  { id: 2, household_id: 1, alert_type: "bill_mismatch", severity: "danger", title: "Paper bill overcharge detected", message: "Your July bill of ₹3,550 for 210 units exceeds the MERC recomputed amount of ₹2,287 by ₹1,263.00. A dispute slip is ready for the consumer grievance portal.", is_read: false },
  { id: 3, household_id: 1, alert_type: "night_standby_spike", severity: "primary", title: "Night-time standby spike (02:00–05:00)", message: "Baseline draw between 02:00 and 05:00 measured 128W — above the 100W healthy limit. Suspects: set-top box, geyser pilot, old refrigerator thermostat.", is_read: true },
  { id: 4, household_id: 1, alert_type: "efficiency_tip", severity: "success", title: "BEE tip: AC at 26°C saves ~6%/°C", message: "Raising your AC setpoint from 24°C to 26°C cuts compressor energy ~12% without comfort loss during Nagpur evenings.", is_read: false },
  { id: 5, household_id: 4, alert_type: "slab_breach_warning", severity: "warning", title: "PG flat nearing Slab 3", message: "Flat 302 has consumed 289 kWh. Room A's AC accounts for 61% of projected month-end units.", is_read: false },
];

export const SEED_SPLIT_GROUPS: SplitGroup[] = [
  {
    id: 1,
    household_id: 4,
    name: "Flat 302 Roommates",
    total_bill_amount: 4720,
    total_units: 388,
    billing_month: "2026-10",
    method: "by_room",
    members: [
      { id: 1, name: "Rahul Sharma", room_name: "Room A (AC)", share_percentage: 54.69, calculated_amount: 2581.37, measured_units: 212, status: "paid" },
      { id: 2, name: "Amit Patel", room_name: "Room B (Fan)", share_percentage: 23.44, calculated_amount: 1106.36, measured_units: 91, status: "pending" },
      { id: 3, name: "Kiran Joshi", room_name: "Room C (Fan)", share_percentage: 21.87, calculated_amount: 1032.27, measured_units: 85, status: "pending" },
    ],
  },
  {
    id: 2,
    household_id: 1,
    name: "Sharma Family",
    total_bill_amount: 4206,
    total_units: 342,
    billing_month: "2026-10",
    method: "equal",
    members: [
      { id: 1, name: "Aditya Sharma", room_name: "Master Bedroom", share_percentage: 50, calculated_amount: 2103, measured_units: 0, status: "paid" },
      { id: 2, name: "Meera Sharma", room_name: "Bedroom 2", share_percentage: 50, calculated_amount: 2103, measured_units: 0, status: "pending" },
    ],
  },
];

// ---- deterministic synthetic daily series for the four data sources ----

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DATA_SOURCES: Record<string, { label: string; observations: number; base: number; noise: number; weekendBump: number; anomaly?: boolean }> = {
  demo: { label: "Seeded Household Profile (Nagpur 2BHK)", observations: 30, base: 9.2, noise: 1.4, weekendBump: 1.1 },
  real: { label: "Real Measured Household Power Dataset (UCI Benchmark)", observations: 2075259, base: 6.8, noise: 2.1, weekendBump: 0.94 },
  sgcc_normal: { label: "Kaggle SGCC Normal Consumer Sample", observations: 23741, base: 11.6, noise: 2.6, weekendBump: 1.05 },
  sgcc_theft: { label: "Kaggle SGCC Theft / Anomaly Consumer Sample", observations: 2122, base: 13.2, noise: 5.5, weekendBump: 0.9, anomaly: true },
};

export function synthReadings(source: string, daysElapsed: number): { date: string; units: number; weekend: boolean }[] {
  const cfg = DATA_SOURCES[source] ?? DATA_SOURCES.demo;
  const rnd = mulberry32(source.length * 7919 + daysElapsed);
  const out: { date: string; units: number; weekend: boolean }[] = [];
  const start = new Date("2026-10-18T00:00:00Z");
  for (let i = 0; i < daysElapsed; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    let units = cfg.base * (weekend ? cfg.weekendBump : 1) * (0.82 + rnd() * 0.36);
    if (cfg.anomaly && rnd() < 0.18) units *= rnd() < 0.5 ? 0.28 : 1.9; // theft signature: sudden drops / spikes
    out.push({ date: d.toISOString().slice(0, 10), units: Math.round(units * 100) / 100, weekend });
  }
  return out;
}
