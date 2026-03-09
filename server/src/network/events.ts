// ── Client → Server ───────────────────────────────────────────────────────────
/** Join the matchmaking lobby. payload: { name, skin } */
export const C_JOIN_LOBBY   = 'c_join_lobby';
/** Leave lobby / disconnect cleanup is handled automatically. */
export const C_LEAVE_LOBBY  = 'c_leave_lobby';
/** Movement + aim input, sent every frame. payload: PlayerInputPayload */
export const C_PLAYER_INPUT = 'c_player_input';
/** Fire a projectile. payload: { aimX, aimY } */
export const C_SHOOT        = 'c_shoot';
/** Dig a tile. payload: { col, row } */
export const C_DIG          = 'c_dig';
/** Place a tile. payload: { col, row, tileType } */
export const C_BUILD        = 'c_build';
/** Chat message. payload: { message } */
export const C_CHAT         = 'c_chat';

// ── Server → Client ───────────────────────────────────────────────────────────
/** Current lobby state (player list + countdown). payload: LobbyStatePayload */
export const S_LOBBY_STATE    = 's_lobby_state';
/** Game is starting. payload: { graceTime } */
export const S_GAME_START     = 's_game_start';
/** Full snapshot sent on join. payload: GameSnapshotPayload */
export const S_GAME_STATE     = 's_game_state';
/** Per-tick delta. payload: TickUpdatePayload */
export const S_TICK_UPDATE    = 's_tick_update';
/** A new player joined. payload: PlayerSerial */
export const S_PLAYER_JOINED  = 's_player_joined';
/** A player left. payload: { id } */
export const S_PLAYER_LEFT    = 's_player_left';
/** A player was eliminated. payload: { id, killerId, killerName } */
export const S_PLAYER_DIED    = 's_player_died';
/** Zone changed. payload: ZoneState */
export const S_ZONE_UPDATE    = 's_zone_update';
/** Game ended. payload: GameOverPayload */
export const S_GAME_OVER      = 's_game_over';
/** Chat broadcast. payload: { playerId, playerName, message } */
export const S_CHAT           = 's_chat';
/** Error message. payload: { message } */
export const S_ERROR          = 's_error';
