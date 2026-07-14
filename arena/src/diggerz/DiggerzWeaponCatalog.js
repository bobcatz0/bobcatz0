/**
 * DiggerzWeaponCatalog — CONFIRMED weapon/tool items extracted from the real
 * Diggerz client (item-definition switch) + recovered atlas. Nothing invented.
 *
 * CONFIRMED per entry: id (item id / switch case), name (client `_1`), spriteKey
 * (atlas), rect ([x,y,w,h] in tiles.png). `category` is INFERRED from the sprite
 * role (guns vs blades vs tools) + the client's gun_pose/hit animation split — it
 * is a strong guess, not a server-confirmed field.
 *
 * UNKNOWN (server-authoritative, not in the client): damage, range, cooldown,
 * projectile speed/physics. Those are null here and proposed only in the design doc.
 *
 * NOTE: item type a4===2 in the client means 'held/equipped item' (it also covers
 * hats/shoes/hair), so weapons are the SUBSET listed here, identified by sprite.
 * See docs/DIGGERZ_WEAPON_CATALOG.md.
 */

export const CATEGORY = { MELEE: 'melee', RANGED: 'ranged', THROWN: 'thrown', TOOL: 'tool' };

// Confirmed fields only. serverValues are UNKNOWN (design doc proposes standalone ones).
export const DIGGERZ_WEAPONS = [
  { id: 45, name: "Red Boxing Gloves", spriteKey: "BOXINGGLOVE_PNG", rect: [1997, 4, 29, 28], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 46, name: "Black Boxing Gloves", spriteKey: "BOXINGGLOVE_PNG", rect: [1997, 4, 29, 28], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 47, name: "White Boxing Gloves", spriteKey: "BOXINGGLOVE_PNG", rect: [1997, 4, 29, 28], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 55, name: "Fake Sword", spriteKey: "SWORD_PNG", rect: [1442, 720, 70, 38], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 79, name: "Blue Ray Gun", spriteKey: "RAILGUN_PNG", rect: [437, 1207, 29, 50], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 80, name: "Red Ray Gun", spriteKey: "RAILGUN_PNG", rect: [437, 1207, 29, 50], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 81, name: "Beta Gun", spriteKey: "GOLDRAYGUN_PNG", rect: [1501, 352, 31, 48], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 83, name: "Green Ray Gun", spriteKey: "RAILGUN_PNG", rect: [437, 1207, 29, 50], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 93, name: "Grenade Launcher", spriteKey: "GRENADELAUNCHER_PNG", rect: [1533, 352, 29, 60], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 139, name: "Bazooka", spriteKey: "BAZOOKA_PNG", rect: [146, 604, 29, 60], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 228, name: "Extinguisher", spriteKey: "EXTINGUISHER_PNG", rect: [2019, 197, 28, 45], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 229, name: "Flashlight", spriteKey: "FLASHLIGHT_PNG", rect: [1367, 352, 42, 30], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 235, name: "Light Gun", spriteKey: "LIGHTGUN_PNG", rect: [436, 740, 35, 52], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 239, name: "Excalibur", spriteKey: "EXCALIBUR_PNG", rect: [1911, 644, 87, 40], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 240, name: "Pickaxe", spriteKey: "PICKAXE_PNG", rect: [1622, 820, 73, 57], category: CATEGORY.TOOL, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 241, name: "Rock", spriteKey: "ROCK_PNG", rect: [630, 385, 30, 24], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 243, name: "Crowbar", spriteKey: "CROWBAR_PNG", rect: [1354, 696, 76, 32], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 244, name: "Pipewrench", spriteKey: "PIPEWRENCH_PNG", rect: [917, 720, 74, 35], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 245, name: "Meat Cleaver", spriteKey: "CLEAVER_PNG", rect: [792, 697, 82, 40], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 246, name: "Shovel", spriteKey: "SHOVEL_PNG", rect: [967, 1235, 96, 39], category: CATEGORY.TOOL, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 248, name: "Shotgun", spriteKey: "SHOTGUN_PNG", rect: [468, 1206, 28, 63], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 276, name: "Musket", spriteKey: "MUSKET_PNG", rect: [784, 936, 38, 84], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 326, name: "Mortar", spriteKey: "BAZOOKA_PNG", rect: [146, 604, 29, 60], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 327, name: "Triple Mortar", spriteKey: "TRIPLE_PNG", rect: [1020, 1573, 59, 60], category: CATEGORY.THROWN, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 329, name: "Blade", spriteKey: "B112_0_PNG", rect: [1828, 62, 66, 66], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 370, name: "Homing Mortar", spriteKey: "BAZOOKA_PNG", rect: [146, 604, 29, 60], category: CATEGORY.RANGED, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 371, name: "Depth Charge", spriteKey: "DEPTHCHARGE_PNG", rect: [146, 1895, 52, 59], category: CATEGORY.THROWN, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 379, name: "(unnamed)", spriteKey: "LIGHTSABRE_PNG", rect: [699, 264, 32, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 381, name: "(unnamed)", spriteKey: "LIGHTSABRE_PNG", rect: [699, 264, 32, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 382, name: "(unnamed)", spriteKey: "LIGHTSABRE_PNG", rect: [699, 264, 32, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 383, name: "(unnamed)", spriteKey: "LIGHTSABRE_PNG", rect: [699, 264, 32, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 384, name: "(unnamed)", spriteKey: "LIGHTSABRE_PNG", rect: [699, 264, 32, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 386, name: "(unnamed)", spriteKey: "LIGHTSABRE_PNG", rect: [699, 264, 32, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 387, name: "(unnamed)", spriteKey: "DUALLIGHTSABRE_PNG", rect: [1021, 39, 40, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 389, name: "(unnamed)", spriteKey: "DUALLIGHTSABRE_PNG", rect: [1021, 39, 40, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 390, name: "(unnamed)", spriteKey: "DUALLIGHTSABRE_PNG", rect: [1021, 39, 40, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 392, name: "(unnamed)", spriteKey: "DUALLIGHTSABRE_PNG", rect: [1021, 39, 40, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
  { id: 394, name: "(unnamed)", spriteKey: "DUALLIGHTSABRE_PNG", rect: [1021, 39, 40, 17], category: CATEGORY.MELEE, categoryConfirmed: false, serverValues: { damage: null, range: null, cooldown: null, projectile: null } },
];

export const byId = (id) => DIGGERZ_WEAPONS.find((w) => w.id === id) || null;
export const byCategory = (c) => DIGGERZ_WEAPONS.filter((w) => w.category === c);

// The first weapons chosen for the standalone PvP prototype (real Diggerz items).
export const FIRST_WEAPONS = { sword: 55, railgun: 79, shotgun: 248 };
