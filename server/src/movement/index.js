'use strict';

/**
 * Reusable movement anti-cheat package.
 *
 * Self-contained — no dependency on the diggerz wire format, world, or
 * sockets. Copy this folder into another project (e.g. a PvP arena) and use
 * MovementValidator directly.
 */
module.exports = {
  MovementValidator: require('./MovementValidator'),
};
